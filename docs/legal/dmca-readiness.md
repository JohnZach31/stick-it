# DMCA readiness

**Status: prepared, NOT registered.** Nothing has been submitted to any government office. No registration is claimed anywhere in the product or the docs.

## Why this may matter
Stick-It stores and lets people share content uploaded by users (pictures, text, audio, video) and publishes it through public links. A U.S.-facing service that hosts user content can get protection ("safe harbor") from copyright liability for what users upload under 17 U.S.C. § 512, but only if it meets conditions. One is **designating an agent to receive copyright notices**, registered with the U.S. Copyright Office and listed publicly on the site. Others include acting promptly on valid notices and having a **repeat-infringer policy**. Whether and how this applies to you is a question for counsel. Registration is a business/legal action that only the owner can take.

## What the owner must decide (cannot be guessed)
1. The legal name of the **service provider** (person or company that operates Stick-It) and its real **physical street address**.
2. Any **alternate names** the service is known by (app names, URLs: e.g. "Stick-It", the site address).
3. Who the **designated agent** is: a person or a role/organization (can be a third-party service).
4. The agent's **mailing address, telephone and e-mail**. A dedicated mailbox is wise.
5. Who will read the notices and how quickly. (A registered agent nobody reads defeats the purpose.)

## Owner walkthrough (current process; check the Copyright Office site for today's details and fee)
1. Decide the service provider's legal name and address (item 1 above).
2. Decide who acts as the designated agent.
3. Gather: provider legal name; provider street address; alternate names/URLs; agent name/organization, mailing address, telephone, e-mail.
4. Create (or log in to) your account in the U.S. Copyright Office **DMCA Designated Agent Directory** (dmca.copyright.gov).
5. Submit the electronic designation.
6. Pay the current filing fee.
7. Publish the **same** agent information on Stick-It: fill `dmcaAgent`, `operatorName`, `postalAddress` and `copyrightEmail` in `js/legal-config.js`, then set `dmcaRegistered: true`. The page is `legal/copyright.html`.
8. Keep the website and the Copyright Office record identical and current.
9. **Renew** the designation before it expires (it must be renewed periodically; the Directory shows the date).

Do not automate or submit any of this on the owner's behalf.

## Takedown workflow Stick-It supports today
- **Report link** on every public share page (`report-share` function) writes a row to `share_reports`.
- **Copyright intake** (`report-copyright` function + table `copyright_reports`): rights holders can submit a structured notice. **It is switched OFF** until the owner sets `COPYRIGHT_INTAKE_ENABLED=true` and `copyrightFormEnabled: true`; do that only once the agent is registered and somebody reads the reports.
- **Taking something down:** in the Supabase dashboard SQL editor run (the link's secret part is the 64 characters after `#s=` in the reported address; only its hash is stored, so hash it to find the share):
  `update public.shares set is_active = false, disabled_at = now(), disabled_reason = 'copyright' where token_hash = encode(sha256(convert_to('<the 64 characters>', 'utf8')), 'hex');`
  or set `shares.moderation_status = 'blocked'` to make the resolver return "not found". Disabling a share does not delete the owner's data.
- **Counter-notice, restoration, repeat infringers:** a human process described on the page; the owner and counsel must define it. There is no automation, and no case-management system by design.

## Tables / fields (`copyright_reports`)
id, created_at, reporter_name, reporter_email, reporter_address (optional), work_description, infringing_url, good_faith (required true), accuracy_perjury (required true), signature, status (`new`, `reviewing`, `actioned`, `rejected`, `counter_notice`), internal_notes, share_id. Only the service role can read or write it.

## Open items
Repeat-infringer policy; counter-notice template; who monitors the mailbox; legal review.
