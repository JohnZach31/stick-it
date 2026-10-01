# UX, marketing-claim and default audit

Method: read every user-facing string in `index.html`, `404.html`, `README.md`, the account/sharing flows and the sign-in dialogs.

## Dark patterns
| Check | Result |
|---|---|
| Hidden cancellation | No subscription exists. Account deletion is in Account settings → Danger zone (always visible), needs a typed DELETE, and says exactly what happens. Not hidden, not nagging |
| Hard-to-reject choices | No consent banner exists (no optional tracking). Dialogs have equal-weight Cancel / primary buttons |
| Pre-selected Premium / misleading "free" | No Premium UI. The Plan row says "Premium is coming later. Nothing to buy yet." |
| Coupled consent | Signup text only acknowledges Terms/Privacy. Marketing e-mail is a **separate, off-by-default** switch in Account settings |
| Share defaults making data public | Boards are private. A link exists only after the person presses Share and creates one; the dialog says in bold **"Anyone with the link can view this…"** (snapshots) and "Anyone with this link can see this whole board, now and as it changes" (live). The sharer's name/photo/bio default to **off** (photo, bio) and are only what they chose |
| Hard-to-find unsubscribe | Not applicable (no marketing mail yet). When built: link in every message + Account settings switch + one-click endpoint |
| Fake urgency / countdowns | None, and the billing contract forbids them |
| "Confirm-shaming", disguised ads | None |
| Guest → account nudges | The sign-in dialog is optional with an equal "Continue as guest" |
| Import offer on sign-in | "Not now" is remembered; nothing is imported without a click |

## Hidden fees / pricing
Nothing is sold. `js/billing.js` makes any future subscribe button impossible without price, currency, period, auto-renewal, trial terms and the cancel path next to it (see `payments-compliance-checklist.md`). There is no Subscribe button today.

## Reviews, testimonials, counts
None present (searched). No star ratings, "users" counts, customer quotes or logos. The only invented-looking text is the onboarding sample notes, which are plainly demo notes ("Double-click anywhere…").

## Claims
| Text | Verdict |
|---|---|
| "Never your password, Gmail, Calendar, or Drive" / "Only your name, email & photo" | Replaced by narrower wording: Stick-It **asks the provider only for** name, e-mail and profile photo, never sees the password, and asks for no access to mail, calendar or files |
| "Premium features (coming soon) won't be available" / "Sets you up for premium features and multi-user boards, coming soon." | **Removed**: promised features that do not exist. Replaced with "features that need an account" |
| "Nothing leaves this browser" (guest/non-cloud sign-in copy) | True for guests (verified: no requests beyond the own origin) |
| "Your boards, photos and recordings follow you to every device" | True for signed-in accounts |
| README: "Stick-It only ever sees your name, email, and photo" | Reworded as above |
| "100 % secure", "private", "never loses data", "GDPR compliant", "military-grade", "best", AI/performance claims | **None present** |

## Defaults
Private board by default; no public link until created; share identity default is the account's choice (new accounts: shared as the account name with photo and bio **hidden**; guests: "Anon-1234"); marketing e-mail off; no analytics; no public profile or discovery (the username is not shown anywhere publicly); provider avatar is shown to the person themself, not published.
**Note:** "shared as my name" is the default for a new account. If the owner prefers anonymous-by-default, change `DEFAULT_SETTINGS.shareDefaultIdentity` in `js/account.js` and the column default. [OWNER decision]
