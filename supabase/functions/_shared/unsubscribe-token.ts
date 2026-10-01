// Signed unsubscribe tokens: "<user id>.<hmac>". The signature (HMAC-SHA256 over the user id with a server-only
// secret) makes the link unguessable and tamper-proof; it grants exactly one power: switching marketing e-mail
// OFF for that one person. It cannot read or change anything else, and the endpoint never returns account details.
// No Deno or Supabase imports: this runs under plain Node in the tests.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAC_RE = /^[0-9a-f]{64}$/;

async function mac(secret: string, userId: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("unsubscribe|v1|" + userId)));
  return [...sig].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function makeUnsubscribeToken(secret: string, userId: string): Promise<string> {
  if (!secret || secret.length < 16) throw new Error("UNSUBSCRIBE_SECRET is missing or too short");
  if (!UUID_RE.test(userId)) throw new Error("bad user id");
  return `${userId}.${await mac(secret, userId)}`;
}

/** Returns the user id when the token is genuine, otherwise null. */
export async function verifyUnsubscribeToken(secret: string, token: string): Promise<string | null> {
  if (!secret || typeof token !== "string" || token.length > 120) return null;
  const [id, sig, extra] = token.toLowerCase().split(".");
  if (extra !== undefined || !id || !sig || !UUID_RE.test(id) || !MAC_RE.test(sig)) return null;
  return equal(sig, await mac(secret, id)) ? id : null;
}
