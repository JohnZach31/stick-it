# Privacy Policy (DRAFT)

> **Draft for review.** This text describes what Stick-It actually does today. It has not been reviewed by a lawyer and several items need the owner's input (marked `[OWNER INPUT REQUIRED: ...]`). It is not final until those are filled in and it has been reviewed.

Last updated: [OWNER INPUT REQUIRED: date when finalised]

## 1. Who runs Stick-It

Stick-It is operated by [OWNER INPUT REQUIRED: legal name of the person or company], [OWNER INPUT REQUIRED: postal address].
Privacy contact: [OWNER INPUT REQUIRED: privacy e-mail address].

## 2. The short version

- **As a guest** you can use Stick-It without an account. Your boards stay in your browser on your device. We do not receive them.
- **If you create an account**, we store your account details and the boards, notes, pictures, voice memos and videos you put in it, so they follow you between devices.
- **Share links** show what you choose to share to anyone who has the link.
- We do **not** run advertising, analytics or session recording, and we do not sell personal data.
- Stick-It is not available to children under the age we ask about on the age screen (see section 10).

## 3. What we collect, and why

| What | Examples | Why |
|---|---|---|
| **Account sign-in details** (if you sign in with Google or GitHub) | Your e-mail address, name or username, profile picture address, and the provider's identifier for you | To create and secure your account |
| **Age check** | Only the fact, and the time, that you passed the age screen. The month and year you enter are not sent to us and not stored | To keep Stick-It to eligible people |
| **Profile** | Display name, optional username, optional short bio, profile picture (the one from your sign-in provider or one you upload), a fallback colour/emoji | To show who you are in the app and on links you share |
| **Preferences** | How you want to appear on shared links, preferred handwriting font, default note colour, and whether you want product-update e-mails (**off unless you turn it on**; we record when you changed it) | To apply your choices |
| **Your content** | Boards, notes (text, formatting, positions), pictures, voice memos, videos, board covers | To provide the service: store, sync and display it |
| **Collaboration data** | Which boards you belong to and your role; invitations you create | To let people share boards. (Comments and reminders are not available yet.) |
| **Share links** | A copy of what you shared, the name/picture/bio you chose to show, whether the link is active. The link's secret address is stored only as a one-way hash | To make links work and let you turn them off |
| **Reports** | Content or copyright reports you send us | To handle abuse and copyright complaints |
| **Technical and security data** | Standard request data (IP address, device/browser type, time) is processed by our hosting and database providers; our own functions record no content | To deliver and protect the service |

We do not ask for your phone number, postal address, payment details, contacts, location, or date of birth.

## 4. Information stored on your device

Stick-It saves your guest boards, settings, and (when signed in) your session and a cached copy of your boards in your browser (local storage and IndexedDB). It sets **no cookies**. This storage is needed for the app to work. You can clear it in your browser settings; signing out removes the signed-in copy. See the list in our technical documentation. [OWNER INPUT REQUIRED: confirm whether to publish the table from `docs/legal/01-cookies-and-storage.md`.]

## 5. How we use information

To provide, secure and maintain Stick-It; to sync your boards; to show your name/picture/bio on links **only if you chose that**; to answer reports and legal requests; to improve reliability (without reading your content). We do not use your content to train AI models and do not sell it. [OWNER INPUT REQUIRED: confirm this statement reflects intent.]

Legal bases for processing (where the law asks for them): [OWNER INPUT REQUIRED: to be set with legal advice, e.g. performance of the service, legitimate interests in security, consent for optional e-mail].

## 6. Who we share it with

- **Service providers (processors)** that run Stick-It for us: **Supabase** (database, sign-in, file storage and server functions) and **GitHub** (website hosting via GitHub Pages). [OWNER INPUT REQUIRED: region where the Supabase project is hosted and any data-processing agreement in place.]
- **Sign-in providers.** If you use Google or GitHub to sign in, they learn that you use Stick-It. If your profile picture comes from them, your browser loads it from their servers.
- **Anyone with a link you create.** A share link shows what you shared (and your name, picture and bio only if you chose that) to **anyone who has the link**, without an account. Please treat it like handing over a paper note.
- **Other members of boards you share.** They can see the content of that board and your display name.
- **Authorities,** where we are legally required to, or to protect people's safety or rights. [OWNER INPUT REQUIRED: legal process policy.]

We do not sell personal data and do not share it for advertising.

## 7. International processing

Our providers may process data in countries other than yours. [OWNER INPUT REQUIRED: where the Supabase project and GitHub Pages serve from, and the transfer mechanism if you are in or serve the EU/UK.]

## 8. How long we keep it

| Data | Kept |
|---|---|
| Account, profile, preferences, boards, files | Until you delete them or your account |
| Notes you delete | Marked deleted so Undo works, then permanently removed by a clean-up job after 30 days. [OWNER INPUT REQUIRED: the clean-up job still has to be scheduled. Until it runs, deleted notes remain in the database.] |
| Files no longer used by anything | Removed by the same clean-up job after a 14-day grace period |
| Share links | Until you turn them off or delete your account |
| Age-screen flag on your device | 1 hour (passed) or 24 hours (failed), then ignored |
| Reports | [OWNER INPUT REQUIRED: how long reports are kept] |
| Provider logs and backups | Controlled by Supabase / GitHub. [OWNER INPUT REQUIRED: retention periods for the chosen plan] |

## 9. Deleting your account and your data

**In the app:** Account settings → Delete account (you must type DELETE). This removes your profile and settings, the boards you own with everything on them, your uploaded files and profile picture, your share links (they stop working immediately, including frozen snapshots), your invitations and your memberships, then your sign-in account. Files are removed from storage immediately, with a clean-up job as a safety net.

What is **not** removed: notes you added to someone else's board stay on that board (they belong to the board, but no longer show your name); reports you sent us; data held in provider logs or backups until it expires; your Google or GitHub account and the permission you gave Stick-It (you can revoke that with them). We do not claim instant erasure of backups.

**Copy of your data:** Account settings → Data & privacy → Export my boards. It includes your account and profile information, preferences, boards and their items, pictures, and your share-link list. It does **not** yet include voice-memo and video files, or the secret address of each link. For anything else write to [OWNER INPUT REQUIRED: privacy e-mail].

## 10. Children

Stick-It is a general-audience service and is not directed to children. Before sign-in we ask for a birth month and year to check eligibility; we do not store it. If it shows someone is under the age Stick-It supports, we do not create an account, and if an account was created through another route it is deleted. [OWNER INPUT REQUIRED: the minimum age and the countries you serve, decided with legal advice. The age screen alone does not make a service compliant with children's privacy laws.]

## 11. Cookies and tracking

No advertising, analytics, social-media or session-recording tools. No cookies. Browser storage is used only to make the app work (section 4).

## 12. Security

Boards and files are stored in a private database and private file storage behind per-user access rules; media is delivered with short-lived links. Share links work for anyone who has them. No system is perfectly secure and we cannot guarantee it. Use the access controls (turn off links you no longer need). To report a security problem write to [OWNER INPUT REQUIRED: security contact].

## 13. Your rights

Depending on where you live you may have rights to access, correct, delete, export, restrict or object to processing, or to complain to a regulator. [OWNER INPUT REQUIRED: the rights and process you will honour, and the regulator details, after legal review.]

## 14. Changes

We will post changes here and update the date. For material changes we will tell account holders in the app. [OWNER INPUT REQUIRED: confirm notice method.]

## 15. Contact

[OWNER INPUT REQUIRED: operator legal name, postal address, privacy e-mail]
