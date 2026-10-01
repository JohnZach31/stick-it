// The ONLY way marketing e-mail should be built. It refuses to produce a message unless the message carries
//   * a working one-click unsubscribe link (signed, no login) and the matching List-Unsubscribe headers,
//   * the sender's real postal address (configuration, never hard-coded), and a sender name,
//   * a non-deceptive subject.
// If any of that is missing it THROWS, so a mis-configured deployment cannot send a non-compliant message.
// (Stick-It sends no marketing e-mail today; this is the gate any future sender must go through.)
// Transactional mail (security notices, invites, receipts) is not marketing and does not use this.
import { makeUnsubscribeToken } from "./unsubscribe-token.ts";

export interface MarketingEnv {
  LEGAL_POSTAL_ADDRESS?: string;   // the sender's real physical postal address: [OWNER INPUT REQUIRED]
  LEGAL_SENDER_NAME?: string;      // the name the mail is sent as
  UNSUBSCRIBE_SECRET?: string;     // server-only secret that signs unsubscribe links (supabase secrets set)
  UNSUBSCRIBE_PAGE_URL?: string;   // the public page people land on, e.g. https://<site>/unsubscribe.html
  UNSUBSCRIBE_API_URL?: string;    // the unsubscribe Edge Function URL (used for the one-click header)
}

export class MarketingConfigError extends Error {
  missing: string[];
  constructor(missing: string[]) { super("Marketing e-mail is not configured: " + missing.join(", ")); this.missing = missing; }
}

const PLACEHOLDER = /\[OWNER|TODO|CHANGE ?ME|example\.(com|org)|lorem/i;

export function marketingConfigProblems(env: MarketingEnv): string[] {
  const p: string[] = [];
  const addr = (env.LEGAL_POSTAL_ADDRESS ?? "").trim();
  if (addr.length < 10 || PLACEHOLDER.test(addr)) p.push("LEGAL_POSTAL_ADDRESS");
  const name = (env.LEGAL_SENDER_NAME ?? "").trim();
  if (name.length < 2 || PLACEHOLDER.test(name)) p.push("LEGAL_SENDER_NAME");
  if ((env.UNSUBSCRIBE_SECRET ?? "").length < 16) p.push("UNSUBSCRIBE_SECRET");
  if (!/^https:\/\//.test(env.UNSUBSCRIBE_PAGE_URL ?? "")) p.push("UNSUBSCRIBE_PAGE_URL");
  if (!/^https:\/\//.test(env.UNSUBSCRIBE_API_URL ?? "")) p.push("UNSUBSCRIBE_API_URL");
  return p;
}

export interface MarketingMessage { userId: string; to: string; subject: string; text: string; html?: string }
export interface BuiltEmail { to: string; from: string; subject: string; text: string; html: string; headers: Record<string, string> }

function esc(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

export async function buildMarketingEmail(env: MarketingEnv, m: MarketingMessage): Promise<BuiltEmail> {
  const missing = marketingConfigProblems(env);
  if (missing.length) throw new MarketingConfigError(missing);
  const subject = (m.subject ?? "").trim();
  if (!subject || /^\s*(re|fwd?)\s*:/i.test(subject)) throw new Error("Subject is empty or looks like a reply/forward (deceptive)");
  if (!m.text || !m.text.trim()) throw new Error("Message body is empty");
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(m.to)) throw new Error("Recipient address is not valid");

  const token = await makeUnsubscribeToken(env.UNSUBSCRIBE_SECRET!, m.userId);
  const pageUrl = `${env.UNSUBSCRIBE_PAGE_URL}?t=${token}`;
  const apiUrl = `${env.UNSUBSCRIBE_API_URL}?t=${token}`;
  const sender = env.LEGAL_SENDER_NAME!.trim();
  const address = env.LEGAL_POSTAL_ADDRESS!.trim();

  const footerText = `\n\n--\nYou are receiving this because you chose to get product updates from ${sender}.\nUnsubscribe: ${pageUrl}\n${sender}, ${address.replace(/\s*\n\s*/g, ", ")}`;
  const footerHtml = `<hr><p style="font-size:12px;color:#555">You are receiving this because you chose to get product updates from ${esc(sender)}.<br>` +
    `<a href="${esc(pageUrl)}">Unsubscribe</a><br>${esc(sender)}, ${esc(address).replace(/\s*\n\s*/g, ", ")}</p>`;
  return {
    to: m.to,
    from: sender,
    subject,
    text: m.text + footerText,
    html: (m.html ?? `<p>${esc(m.text).replace(/\n/g, "<br>")}</p>`) + footerHtml,
    headers: {
      "List-Unsubscribe": `<${apiUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
