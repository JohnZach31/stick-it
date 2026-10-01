# Marketing e-mail (Israel) - draft

Section 30A of the Communications (Telecommunications and Broadcasting) Law 5742-1982 (the "spam law") generally requires **prior express consent** to send advertising by e-mail, SMS, fax or automated call, with a limited existing-customer exception. Messages must be clearly marked as advertising (in Hebrew practice, the word "פרסומת" at the start of the subject), identify the sender, give a working address for opting out, and honour opt-outs. Statutory damages can apply without proof of harm. **UNVERIFIED: counsel must confirm the exact wording and current amounts.**

## What Stick-It does
- Marketing e-mail is a **separate opt-in switch, off by default**, adults only (database triggers reject minors; teens and children never receive it).
- The consent time is recorded (`marketing_opt_in_at`).
- One-click unsubscribe page and signed-token endpoint (`supabase/functions/unsubscribe`).
- The audience function excludes unconfirmed, minor and pending-consent accounts.
- **Sending is disabled** until a sender identity and a deliberately chosen **public** postal address are configured. The guard fails closed: with no public address configured nothing may be sent, and the owner's residential address must never be used.
- No marketing is sent today.

## Before sending anything
1. Choose a public postal address (PO box or business address) or confirm with counsel that none is required for Israeli recipients.
2. Add the "פרסומת" marking to the subject for Hebrew-speaking recipients, and identify the sender.
3. Set the `LEGAL_*` secrets listed in `OWNER-ACTION-REQUIRED.md`.
4. Send a test to yourself and check the unsubscribe link.
