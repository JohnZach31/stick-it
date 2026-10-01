# Cross-border data (Israel) - draft

The Privacy Protection Regulations (Transfer of Data to Databases Abroad) 5761-2001 restrict sending personal data abroad unless the destination offers protection no lower than Israeli law, or an exception applies (for example the data subject consented, or a contractual undertaking to apply Israeli standards). Transfers to the EEA are generally treated as adequate. **UNVERIFIED: counsel must confirm the current text and how it applies to a processor like Supabase.**

| Provider | Role | Data | Where | Status |
|---|---|---|---|---|
| Supabase | database, auth, storage, functions | all account and content data | **[OWNER INPUT REQUIRED: project region]** (check Dashboard, Project Settings) | Review Supabase's data-processing terms; record the region |
| GitHub Pages | static hosting | request metadata (IP) only; no account data | global CDN | no personal data stored by Stick-It there |
| Google / GitHub sign-in | identity provider | e-mail, name, avatar URL, provider id | provider-controlled | user-initiated |
| Fonts | self-hosted | none | n/a | no third-party font requests |

## Owner actions
1. Record the Supabase region in the Privacy Policy (section 10) and the database definitions document.
2. If the region is outside the EEA, ask counsel whether a transfer undertaking or other basis is needed.
3. Keep the sub-processor list in `00-data-and-third-party-inventory.md` current.
