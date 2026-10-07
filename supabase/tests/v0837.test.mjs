// Invite links opened while signed out (v0.8.3.10)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const app = read('js/app.js');
ok(/function promptInviteSignIn\(\)/.test(app) && /You.re invited to a board/.test(app) && /Join without an account/.test(app), 'a signed-out visitor who opens an invite link is told they are invited and offered to sign in');
ok(/if\(CLOUD \|\| !CLOUD_OK \|\| viewerMode \|\| !pendingInvite\(\)\) return/.test(app), 'it only appears for a signed-out visitor with a pending invitation, never on a shared view or when sign-in is unavailable');
ok(/setTimeout\(promptInviteSignIn, 900\)/.test(app), 'it runs at start-up');
ok(/localStorage\.setItem\(INVITE_KEY, JSON\.stringify\(\{t: t, at: Date\.now\(\)\}\)\)/.test(app) && /Date\.now\(\) - o\.at < 3600000/.test(app), 'the invitation is also kept for an hour, so it survives the trip through Google sign-in');
ok(/var t = pendingInvite\(\);\s*if\(!t\) return false;\s*clearPendingInvite\(\)/.test(app), 'accepting reads the saved invitation and clears it once it is used');
ok(/\^\[a-f0-9\]\{64\}\$/.test(app.slice(app.indexOf('function pendingInvite'), app.indexOf('function pendingInvite') + 500)), 'only a well-formed invitation token is ever kept');
ok(/placeholder="Add e-mails \(optional\)"/.test(app), 'the invite e-mail box placeholder fits');
// ---- join without an account (v0.8.3.11)
{
  const cc = read('js/cloud-client.js');
  ok(/signInAnonymously: function/.test(cc) && /c\.auth\.signInAnonymously\(\)/.test(cc) && /isAnonymous: function/.test(cc), 'the client can make an anonymous session and tell whether the current one is anonymous');
  ok(/Join without an account/.test(app) && /async function joinAsGuest/.test(app) && /value: "anon"/.test(app) && /value: "signin"/.test(app), 'the invitation dialog offers Join without an account next to Sign in');
  ok(/Joining without an account isn.t switched on yet/.test(app), 'if the project has anonymous sign-in off, the person is told and offered normal sign-in');
  ok(/Leave without an account\?/.test(app) && /isAnonymous\(\)\)\{/.test(app), 'leaving an anonymous session explains that a new invitation is needed');
  ok(/ensureAgeAttested\(profile\)/.test(app), 'the age check still runs before any cloud feature, for guests as for accounts');
  ok(/tied to a specific e-mail address/.test(app), 'an e-mail-bound invitation gives a clear message to an anonymous visitor');
  ok(/Allow anonymous sign-ins/.test(read('docs/dev/GUEST-JOIN.md')), 'the Supabase switch is documented');
}
// ---- an anonymous guest never tries to create a board (v0.8.3.13)
{
  const sc = app.slice(app.indexOf('async function startCloud'));
  const iA = sc.indexOf('needsCloudBootstrap && Stick.auth.isAnonymous'), iF = sc.indexOf('await firstCloudLoad(session.user, profile)');
  ok(iA > 0 && iF > iA, 'for an anonymous session, joining the invited board is tried BEFORE the first-load step that creates "My Board"');
  ok(/if\(await maybeAcceptInvite\(\)\) return;\s*\/\/ nothing to join/.test(sc), 'a successful join restarts into the joined board');
  ok(/stickit\.bootToast/.test(app) && /Stick\.auth\.signOut\("local"\)/.test(sc.slice(iA, iA + 900)), 'with nothing to join, an anonymous session is dropped and the person is told, back in plain guest mode');
}
// ---- the age check cannot be skipped for a guest (v0.8.3.14)
{
  ok(/anonNow/.test(app) && /ensureAgeAttested\(profile \|\| \{age_band: null\}\)/.test(app), 'an anonymous guest always goes through the age screen, even if their profile could not be read');
  ok(/lastInviteError/.test(app) && /console\.warn\("\[invite\] could not accept:"/.test(app), 'a refused invitation reports the real reason');
}
// ---- joining saves the boards list before restarting (v0.8.3.15)
ok(/await cloudSync\.refreshBoards\(\);[^\n]*\n\s*await cloudSync\.fillBoardCache\(boardId\)/.test(app), 'after a successful join the boards list is saved first, so the restart does not mistake the guest for a first-time load');
console.log('v0.8.3.10 invites: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
