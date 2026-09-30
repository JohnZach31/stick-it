// Proves the RLS tests have teeth: re-introduces classic security bugs, one at a time, into a
// temporary copy of the migrations and checks that the test suite FAILS for each of them.
//   node mutation-check.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const migDir = path.join(here, '..', 'migrations');

const mutations = [
  ['boards visible to everyone',            '20260930120100_rls.sql',       'using (public.can_read_board(id));\ncreate policy boards_update_owner', 'using (true);\ncreate policy boards_update_owner'],
  ['anon keeps its default table grants',   '20260930120100_rls.sql',       "execute format('revoke all on public.%I from anon, authenticated', t);", "null;"],
  ['plan column writable by users',         '20260930120100_rls.sql',       'grant update (display_name, avatar_url) on public.profiles to authenticated;', 'grant update on public.profiles to authenticated;'],
  ['editors/viewers can update any object', '20260930120100_rls.sql',       'using (public.can_edit_board(board_id)) with check (public.can_edit_board(board_id));\n\n-- ---- assets', 'using (true) with check (true);\n\n-- ---- assets'],
  ['foreign assets can be attached',        '20260930120000_core_schema.sql', 'and (a.owner_id = (select auth.uid()) or a.board_id = o.board_id))', 'and true)'],
  ['anyone can read any asset',             '20260930120000_core_schema.sql', 'select exists (\n    select 1 from public.assets a\n     where a.id = p_asset', 'select true or exists (\n    select 1 from public.assets a\n     where a.id = p_asset'],
  ['uploads to any path allowed',           '20260930120300_storage.sql',    "with check (bucket_id = 'media'\n              and exists", "with check (bucket_id = 'media' or exists"],
  ['resolve_share callable by clients',     '20260930120200_functions.sql',  '  public.accept_invite(text)\n  to authenticated;', '  public.accept_invite(text), public.resolve_share(text)\n  to authenticated;'],
  ['board limit off by one',                '20260930120200_functions.sql',  'if have >= lim then', 'if have > lim then'],
  ['viewers may publish shares',            '20260930120200_functions.sql',  "if v_role is null or v_role not in ('owner', 'editor') then", "if v_role is null then"],
];

let missed = 0;
for (const [name, file, from, to] of mutations) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stickit-mut-'));
  for (const f of fs.readdirSync(migDir)) fs.copyFileSync(path.join(migDir, f), path.join(tmp, f));
  const target = path.join(tmp, file);
  const src = fs.readFileSync(target, 'utf8').split('\r\n').join('\n');   // tolerate CRLF checkouts
  if (!src.includes(from)) { console.log(`?? cannot apply mutation "${name}" (pattern not found)`); missed++; continue; }
  fs.writeFileSync(target, src.replace(from, to));
  const r = spawnSync('node', [path.join(here, 'run-tests.mjs')], { env: { ...process.env, MIG_DIR: tmp }, encoding: 'utf8' });
  const caught = r.status !== 0;
  const which = (r.stdout.match(/FAIL\s+(.+)/) || [])[1] || (r.stderr || r.stdout).split('\n').find(l => l.includes('failed')) || '';
  console.log(`${caught ? 'caught ' : 'MISSED '} ${name}${caught ? `   <- ${which.slice(0, 90)}` : ''}`);
  if (!caught) missed++;
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(missed ? `\n${missed} mutation(s) not caught` : '\nall mutations caught');
process.exit(missed ? 1 : 0);
