# Age step (replaces the earlier 13+ block)

The earlier design refused anyone under 13. That is **superseded**: Stick-It now sorts people into bands and limits what each band can do. See `children-and-parental-consent.md` for the legal position and `docs/dev/age-flow-testing.md` for testing.

## Flow
1. Before any provider button or OAuth redirect, a neutral "How old are you?" step asks for **birth month and year** (no "I am 13+" checkbox, no cut-off shown).
2. The month and year are used once in the browser to compute a band and then discarded. A flag `{band, time}` is kept locally; it never contains a birth date.
3. Result: adult (18+), teen (13-17), child (under 13). Exact-month boundaries are tested.
4. Adult and teen continue to Google/GitHub sign-in. After sign-in the band is saved with `set_age_band()`; a band can be set once.
5. Child: guest/local use only; a short, kind explanation, the parent notice, and no account is requested. No fake consent.

## Server enforcement
- A profile without a band cannot create boards, notes or media (`AGE_NOT_CONFIRMED`).
- A child with consent status other than `approved` is blocked (`PARENT_CONSENT_REQUIRED`).
- Marketing opt-in is rejected for anyone who is not an adult (`MARKETING_NOT_ALLOWED`).
- Bypass: if someone gets an account without the age step, the gates above restrict cloud use; nothing is deleted automatically. Accounts that never complete the step and own nothing are cleaned up by `abandoned_accounts()` once the owner schedules the job.

## Limits
Self-declaration cannot be verified; it is one control among several, not a guarantee. No IP, query string or password is used anywhere, and the dev reset helpers exist only on local hosts.
