# Age screen

## Design chosen, and why
**A neutral screen asking for a birth month and year, before the sign-in provider is contacted.** Alternatives considered:

| Option | Data | Problem |
|---|---|---|
| "I am 13+" checkbox | 1 bit | Not neutral: it tells the person the answer that gets them in. Rejected by the brief. |
| Full date of birth | day + month + year | More data than needed; sensitive. |
| Birth year only | year | Cannot tell a 12-year-old from a 13-year-old in the birthday year; would force wrong decisions either way. |
| **Birth month + year** (chosen) | month + year, **used once in the browser and never stored or sent** | Enough precision for a "13 on or before this month" test, minimal data. |

The cut-off is not shown on the screen (so the screen does not teach the answer). Eligibility = more than 13 years **after the end of the birth month** (so nobody is admitted a few days early; someone turning 13 this month is asked again next month). The minimum age is a constant (`AGE_MIN_YEARS`) that the owner must confirm with legal advice. **[OWNER INPUT REQUIRED]**

## Behaviour
- **Before OAuth.** Pressing *Continue with Google/GitHub* opens the age screen first. The provider is not contacted until it is passed.
- **Under the minimum.** No account is created. Neutral message: "Stick-It isn't available to you right now." It does not say why, does not suggest another date, and the screen is not shown again for 24 hours on that device (stored as a timestamp only: `stickit.age.blocked`). This only stops "press Back and retype"; it is deliberately not fingerprinting or tracking, and a determined person can get around it. That is a known limit of any age screen.
- **Eligible.** The only things kept: a device flag (`stickit.age.ok`, a timestamp, valid 1 hour so the post-sign-in step can finish) and, on the account, `profiles.age_attested_at` (a timestamp).
- **After sign-in, every account must have `age_attested_at`.** If it is empty (the person arrived by a route that skipped the screen, or the account predates the screen) the app asks **before loading anything else**. If that screen shows they are under the minimum, the app calls the delete-account function, which deletes the account that the provider just created, and signs out.
- **Server-side enforcement.** Even if someone calls the OAuth endpoints directly, an account without `age_attested_at` **cannot** create a board, upload a file, create a share link, join a board, or save a bio/username (database triggers raise `AGE_NOT_CONFIRMED`). An account in that state holds only what the sign-in provider supplied (e-mail, name, picture URL), and is removed as soon as the app sees it.
- **Not stored anywhere:** the birth month/year, an age, or a flag saying *why* someone was blocked.

## What this is not
It is **one control, not compliance.** A children's-privacy law (COPPA in the U.S., the UK Age-Appropriate Design Code, GDPR Art. 8, and others) imposes more than an age screen. For a general-audience service the screen reduces the chance of knowingly collecting children's data; it does not remove the need for the privacy policy, retention rules, a process for removing a child's data if one is found, and legal review. No parental-consent flow was built. The service must not be marketed to children. **[LEGAL REVIEW]**

## Edge cases not covered
- Someone who lies. (Neutral screens cannot prevent that.)
- Existing accounts: they are asked once at next sign-in (the owner's own accounts included).
- Guests: no account is created, so no screen is shown; guest data never leaves the device.
