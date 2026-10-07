// Invite links opened while signed out (v0.8.3.10)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const app = read('js/app.js');
ok(/function promptInviteSignIn\(\)/.test(app) && /You\\u2019re invited to a board/.test(app) && /Sign in to join/.test(app), 'a signed-out visitor who opens an invite link is told they are invited and offered to sign in');
ok(/if\(CLOUD \|\| !CLOUD_OK \|\| viewerMode \|\| !pendingInvite\(\)\) return/.test(app), 'it only appears for a signed-out visitor with a pending invitation, never on a shared view or when sign-in is unavailable');
ok(/setTimeout\(promptInviteSignIn, 900\)/.test(app), 'it runs at start-up');
ok(/localStorage\.setItem\(INVITE_KEY, JSON\.stringify\(\{t: t, at: Date\.now\(\)\}\)\)/.test(app) && /Date\.now\(\) - o\.at < 3600000/.test(app), 'the invitation is also kept for an hour, so it survives the trip through Google sign-in');
ok(/var t = pendingInvite\(\);\s*if\(!t\) return false;\s*clearPendingInvite\(\)/.test(app), 'accepting reads the saved invitation and clears it once it is used');
ok(/\^\[a-f0-9\]\{64\}\$/.test(app.slice(app.indexOf('function pendingInvite'), app.indexOf('function pendingInvite') + 500)), 'only a well-formed invitation token is ever kept');
ok(/placeholder="Add e-mails \(optional\)"/.test(app), 'the invite e-mail box placeholder fits');
console.log('v0.8.3.10 invites: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
