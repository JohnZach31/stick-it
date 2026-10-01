# Children, teens and parental consent

This replaces the earlier 13+ rule. **Stick-It does not block under-13s.** It limits what they can do.

## Model

| Band | How decided | Cloud account | Defaults |
|---|---|---|---|
| adult (18+) | "How old are you?" (month and year, used once and discarded) | yes | normal |
| teen (13-17) | same | yes | no marketing, links show no profile details, no public profile |
| child (under 13) | same | **no, until verified parental consent exists**; guest/local only | everything cloud-side blocked |

Stored: `age_band`, `age_attested_at`, `parental_consent_status` (`not_required | pending | approved | declined | revoked`), `terms_version`, `privacy_version`. **No date of birth is stored.**

The age step comes **before** provider selection or OAuth, with neutral wording.

## Honest limits
- The age step is **self-declaration**. It stops honest children and nudges others; it is not verification.
- **Parental consent is not implemented.** `parentConsentEnabled` is `false`. The database has the status field, the `parental_consents` table and a service-role-only `parental_consent_set()` function so a verified process can be added later, but no user-facing approval exists and no fake consent is created.
- If a child's account exists anyway (age step bypassed, or created through another route), the server gate (`PARENT_CONSENT_REQUIRED`) blocks cloud content, the app signs the child out with an explanation, and the account is **kept** with `pending` consent. It is **not** deleted automatically.
- Accounts that never completed the age step and own nothing are cleaned by `abandoned_accounts()` after 7 days, once the owner schedules the job (`supabase/ops/schedule-gc.sql`).

## What a real consent mechanism needs (owner and counsel)
1. A parent/guardian identity route (for example a verified e-mail plus a payment-card or ID check, or a vetted provider) acceptable under Israeli law. **UNVERIFIED: which methods are acceptable.**
2. A parent-facing notice describing the data and rights.
3. A way for the parent to review, withdraw and delete.
4. Record the evidence in `parental_consents`, then call `parental_consent_set()` with the service role only.
5. Only then set `parentConsentEnabled` to `true`.

## Teens
Whether a 13-17-year-old may open a free account on their own under Israeli law is **UNVERIFIED**. The conservative defaults reduce exposure. Counsel should decide whether guardian consent is also required for teens.
