# Database definitions document (draft)

The PPA expects a "database definitions document" (מסמך הגדרות מאגר) describing a database; it is required for notification/registration and is good practice for the Data Security Regulations. **This is a draft for the owner and counsel. It does not assert that registration is required.** See `israel-compliance-audit.md`.

| Item | Value |
|---|---|
| Controller / holder | Jonathan Zachevsky, individual, Israel. Contact: [OWNER INPUT REQUIRED: privacy e-mail]. No public postal address configured. |
| Database holder (processor) | Supabase (Postgres, Auth, Storage, Edge Functions). Region: [OWNER INPUT REQUIRED] |
| Purpose | Provide the Stick-It note-board service: accounts, sync, sharing, abuse/copyright handling, age-based protections |
| Categories of data | Account identifiers (e-mail, name, provider id, avatar URL); profile; preferences; age band and consent status; boards/notes/media; sharing and membership; share-link hashes; reports; consent versions |
| Data **not** collected | Date of birth, phone, postal address, payment data, contacts, precise location |
| Data subjects | Adults, teens (13-17); children only as guests (nothing stored by Stick-It) or as pending/restricted accounts if the age step was bypassed |
| Sensitive data | Not requested. Free-text notes and media could contain sensitive data entered by users; Stick-It does not inspect content |
| Recipients | Supabase, GitHub (hosting), Google/GitHub sign-in providers, link holders chosen by users, collaborators |
| Transfers abroad | Yes, via providers: see `israel-cross-border-data.md` |
| Access | Owner (service role, dashboard). No other staff. Users only to their own rows through row-level security |
| Security | RLS on every table; SECURITY DEFINER functions with fixed search_path; service-role-only RPCs; private storage with short-lived links; share tokens stored hashed; no secrets in browser code; tests incl. mutation checks |
| Retention | See the retention table in the audit |
| Estimated size | [OWNER INPUT REQUIRED: current number of accounts] |
