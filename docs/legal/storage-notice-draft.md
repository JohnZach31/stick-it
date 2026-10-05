# Storage notice (DRAFT)

> **Draft for review.** [LEGAL REVIEW RECOMMENDED]

Stick-It currently does not set its own browser cookies. Instead, it uses browser storage such as local storage and IndexedDB for guest boards, preferences, cached board data and session-related information. These technologies serve similar persistence purposes but are technically different from cookies. They are used because the app needs them to work:

| What | Why |
|---|---|
| Your guest boards and notes | So your work is still there next time |
| Settings (theme, fonts, preferences) | To remember your choices |
| Cutouts you make as a guest (small transparent pictures kept in the browser IndexedDB) and a note that you have seen the cutout tips | So your cutouts are still there next time |
| The result of the age step (adult or teen, with a timestamp, never a birth date). A short-lived copy is used for about an hour while you sign in; a longer-lived copy is trusted for up to 90 days on a browser where you have signed in (after that it is ignored; the old entry stays until it is replaced or you clear your browser data) | So you are not asked again each time you sign in |
| A pending board invitation, kept in the tab's session storage only until you finish signing in | So an invitation survives the sign-in step |
| When signed in: your sign-in session and a cached copy of your boards | To sign you in and show boards quickly or offline |

Stick-It does not currently use advertising or session-recording tools. Product analytics may be introduced to understand how the service is used, such as counts of accounts, boards, object types, feature use, errors and performance. Analytics would not collect content such as note text, comment text, search queries, private board text or private photos, videos and audio. If analytics go live, this notice and the Privacy Policy are updated at the same time. Embedded video providers, payment processing or analytics may use cookies or similar technologies in the future, and this notice would be updated if that changes.

The storage listed above is strictly needed to provide what you asked for. Clearing your browser data removes it, and signing out removes the signed-in copy. Guest boards are not sent to us; clearing browser data deletes them for good unless you exported them.

See the [Privacy Policy](privacy.html).
