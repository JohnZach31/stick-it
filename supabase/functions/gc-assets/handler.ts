// Garbage collector for media. Called on a schedule (see docs) with a shared secret.
// Order matters: claim -> forget rows (which queues their files) -> delete files.
// Anything that fails is retried on the next run because unfinished files stay in storage_tombstones.
export interface GcDeps {
  secret: string;
  purgeObjects(): Promise<number>;
  claimAssets(): Promise<{ id: string; storage_path: string }[]>;
  tombstones(limit: number): Promise<string[]>;
  removeFiles(paths: string[]): Promise<void>;
  clearTombstones(paths: string[]): Promise<void>;
  finishAssets(ids: string[]): Promise<number>;
}

export function makeGcHandler(deps: GcDeps) {
  return async function handle(req: Request): Promise<Response> {
    const given = req.headers.get("x-cron-secret") ?? "";
    // constant-time-ish comparison; an empty configured secret never matches
    const same = deps.secret.length > 0 && given.length === deps.secret.length &&
      [...given].reduce((d, c, i) => d | (c.charCodeAt(0) ^ deps.secret.charCodeAt(i)), 0) === 0;
    if (!same) return new Response(JSON.stringify({ ok: false }), { status: 401 });

    const out = { objectsPurged: 0, assetsClaimed: 0, filesRemoved: 0, rowsRemoved: 0 };
    out.objectsPurged = await deps.purgeObjects();
    const claimed = await deps.claimAssets();
    out.assetsClaimed = claimed.length;
    if (claimed.length) out.rowsRemoved = await deps.finishAssets(claimed.map((c) => c.id));
    const paths = await deps.tombstones(200);
    for (let i = 0; i < paths.length; i += 50) {
      const batch = paths.slice(i, i + 50);
      await deps.removeFiles(batch);
      await deps.clearTombstones(batch);
      out.filesRemoved += batch.length;
    }
    return new Response(JSON.stringify({ ok: true, ...out }), { status: 200, headers: { "content-type": "application/json" } });
  };
}
