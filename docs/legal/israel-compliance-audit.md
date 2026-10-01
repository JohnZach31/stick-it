# Israel compliance audit (working document)

**Status: engineering research, not legal advice. Nothing here says Stick-It "complies with Israeli law".** Items marked **UNVERIFIED** could not be confirmed from an authoritative source in this session and need Israeli counsel. Researched 2026-10-01.

## Sources used

| Source | Used for |
|---|---|
| Privacy Protection Authority (PPA) guide to the Protection of Privacy Law as amended by Amendment 13, May 2025 (Hebrew PDF, saved locally for extraction) | effective date, registration/notification, DPO, duty to inform, damages, enforcement |
| DataGuidance "Israel - Privacy Overview" (APM & Co, Oct/Nov 2025) | registration thresholds, DPO threshold, breach rules, regulations list |
| Knesset research material on minors and legal capacity (saved locally) | minors, guardian consent |
| Statutes by name (Protection of Privacy Law 5741-1981 as amended; Data Security Regulations 5777-2017; Transfer of Data Abroad Regulations 5761-2001; Communications (Telecommunications and Broadcasting) Law 5742-1982 s.30A; Legal Capacity and Guardianship Law 5722-1962; Equal Rights for Persons with Disabilities Law 5758-1998 and Service Accessibility Regulations 5773-2013; SI 5568) | existence of the rule; exact text must be confirmed by counsel |

gov.il and kolzchut pages returned HTTP 403 to automated fetches, so statute text was not read directly from them.

## Findings

| Topic | What the sources say | Stick-It position | Confidence |
|---|---|---|---|
| **Amendment 13 effective** | Took effect **14 August 2025** | Treat the amended law as current | High |
| **Database registration** | Registration duty narrowed: required for public bodies and for databases whose business is disclosing/selling personal data (data brokers/direct mailing). Non-registered databases with *particularly sensitive* data on more than **100,000** people must **notify** the PPA within 30 days | Stick-It does not sell or disclose data and holds ordinary account/content data on few people. **Registration is probably not required** and the 100,000 notification threshold is not met. | **UNVERIFIED**: confirm with counsel; user content could in theory contain sensitive data |
| **DPO (privacy protection officer)** | Required for certain bodies, e.g. data-broker-type databases covering more than **10,000** people, public bodies, and bodies whose core activity involves large-scale systematic monitoring or large-scale sensitive data | Not obviously triggered | **UNVERIFIED** |
| **Duty to inform (s.11)** | Anyone asking a person for personal information must state whether the person is legally required to provide it, the purpose, and to whom and why it is disclosed. Amendment 13 widened this | Implemented as a "notice at collection" in the sign-in flow and sections 4-7 of the Privacy Policy | Medium (wording to be checked) |
| **Data Security Regulations 2017** | Databases classified by level (basic, medium, high). Duties include written security procedures, access controls, logs, vendor management, and **immediate notice to the PPA of a "severe security incident"** | Stick-It should be treated at **basic or medium** level pending counsel. Exact level depends on sensitivity and number of authorised people. Breach plan written: `docs/security/israel-data-breach-plan.md` | **UNVERIFIED** (level) |
| **Minors** | People under 18 have limited legal capacity; contracts need guardian involvement. The law has no single "digital age of consent" like the EU/US 13 | Conservative model (see `children-and-parental-consent.md`); no marketing to under-18s | Medium. **UNVERIFIED** whether teen self-consent is sufficient for a free service |
| **Cross-border transfer** | 2001 Transfer Regulations restrict transfers to databases abroad unless equivalent protection (with exceptions such as consent and contractual undertakings) | Supabase/GitHub processing abroad: see `israel-cross-border-data.md` | **UNVERIFIED** |
| **Direct marketing e-mail** | Communications Law s.30A: advertising messages need prior express consent (opt-in) with limited exceptions, a clear "advertisement" marking, sender identity and a simple opt-out | Marketing off by default, adults only, one-click unsubscribe, disabled until sender/postal address configured. See `israel-marketing-email.md` | **UNVERIFIED** details |
| **Copyright notices** | Israel has no DMCA-style notice-and-takedown safe harbour in statute; copyright law is the Copyright Law 2007 | Own good-faith process; no DMCA registration claimed | **UNVERIFIED** |
| **Accessibility** | Equal Rights for Persons with Disabilities Law and Service Accessibility Regulations; SI 5568 (WCAG 2.0 AA based; the standard has been aligned to newer WCAG in recent years) | WCAG 2.2 AA is the technical target. No conformance claim. See `israel-accessibility.md` | **UNVERIFIED** (which obligations apply to a non-commercial individual) |
| **Compensation** | Amendment 13 allows statutory damages without proof of harm and administrative fines | Raises the cost of getting notices/security wrong. Not a reason to over-claim | Medium |

## Registration, DPO, security-level conclusions (stated honestly)

- **Registration:** probably not required; owner must confirm. Do **not** state publicly that Stick-It is exempt.
- **Privacy protection officer:** probably not required at the current scale; revisit if the user base or the data sensitivity grows. Do not claim one exists.
- **Security level:** operate at least as "basic" and design toward "medium" (written procedures, access control, logging, vendor review, incident plan). The owner should record the classification decision.

## Retention table (engineering position)

| Data | Retention | Mechanism | Status |
|---|---|---|---|
| Account, profile, boards, files | until user deletes or deletes account | in-app deletion (`delete-account`) | works |
| Deleted notes | soft-deleted for Undo, then purged after 30 days | `gc-assets` job | scheduled daily 03:17 UTC (pg_cron), verified end to end 2026-10-01 |
| Unused media | purged after a 14-day grace period | same job | scheduled |
| Abandoned sign-ups (no age result, empty, 7+ days) | removed | same job via `abandoned_accounts()` | scheduled |
| Share links | until turned off / account deletion | app | works |
| Copyright/abuse reports | **owner to decide** | manual | open |
| Parental-consent records | until consent withdrawn or account deleted | `parental_consents` table | no live approval mechanism yet |
| Provider logs and backups | by Supabase/GitHub plan | n/a | owner to record |

The periods (30, 14 and 7 days) are stated publicly because the job is scheduled and was verified end to end.

## Open questions for counsel

1. Is database registration or notification required? 2. Is a privacy officer required? 3. Security level classification. 4. May a 13-17-year-old open a free cloud account without guardian consent? 5. Transfer basis for Supabase (region) and GitHub Pages. 6. Which Hebrew/English version governs. 7. Does the individual operator owe a formal accessibility statement/coordinator? 8. Is the proposed Israeli governing law and Tel Aviv-Jaffa venue appropriate for consumers?
