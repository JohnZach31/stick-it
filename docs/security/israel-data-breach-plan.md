# Data breach response plan (Israel) - draft

Internal document. Engineering plan, not legal advice. The Data Security Regulations 5777-2017 require prompt notice to the Privacy Protection Authority of a "severe security incident" and a record of incidents; the sources say there is no explicit duty to notify individuals unless the PPA requires it, but Stick-It's policy is to tell affected people. **UNVERIFIED details: confirm with counsel.**

## 1. Detect
Sources: Supabase dashboard alerts, unusual auth/storage activity, user reports, provider notices (Supabase, GitHub, Google). Check the logs weekly. The owner is the only responder: set a mailbox that is read daily. [OWNER INPUT REQUIRED: security contact]

## 2. Contain (first hour)
- Rotate the **service-role key**, `GC_SECRET`, `UNSUBSCRIBE_SECRET` and OAuth client secrets in the Supabase/Google/GitHub dashboards (never in git).
- Revoke sessions (Auth: sign out all users) if tokens may be exposed.
- Disable share links if the leak is via links (`update share_links set active=false`).
- Preserve logs; do not delete evidence.

## 3. Assess
What data, how many people, minors involved, was it readable (hashes, tokens), is it ongoing. Record in an incident log: time found, time contained, scope, cause, fix.

## 4. Notify
| Who | When | Content |
|---|---|---|
| **Privacy Protection Authority** | immediately for a severe incident (counsel decides if it is "severe") | what happened, data and number of people, measures taken |
| **Affected users** | as soon as the facts are known; always if credentials or private content were exposed, and for teens/children's accounts also tell a parent/guardian where known | plain description, what to do, contact |
| **Providers** | Supabase support, GitHub, Google as relevant | per their processes |

## 5. Recover and learn
Fix root cause, add a regression test, update `docs/legal/00-data-and-third-party-inventory.md`, review the retention and access list, record lessons.

## 6. Not yet in place
No on-call, no external monitoring, no tested restore. Record these as accepted risks until built.
