// Unit tests for the pure collaboration rules in js/collab.js: peer merge, staleness, one-per-person lists, and the note lock.
//   node collab.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = vm.createContext({ console, Math, Object, Array, String, Number, Date, JSON, setInterval, clearInterval });
vm.runInContext('var window = globalThis; Stick = {};', ctx);
vm.runInContext(fs.readFileSync(path.join(here, '..', '..', 'js', 'collab.js'), 'utf8'), ctx);
const C = ctx.Stick.collab, core = C.core;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const T0 = 1_000_000;

// ---- what is accepted from the network
{
  const s = core.cleanState({ uid: 'u1', name: 'Al‮ex<script>'.padEnd(90, 'x'), editing: 'n1', active: 5, beat: '7', extra: 'drop me' });
  ok(s.name.length <= 40 && !s.name.includes('‮') && s.extra === undefined && s.beat === 7 && s.editing === 'n1', 'peer state is cleaned: short plain strings, no bidi overrides, unknown fields dropped');
  ok(core.cleanState(null).editing === null && core.cleanState('x').name === '', 'garbage state becomes an empty, harmless one');
  ok(core.initial('  ana') === 'A' && core.initial('') === '?' && core.initial('דני') === 'ד', 'initials work for any script and for empty names');
  ok(core.hue('a') === core.hue('a') && core.hue('a') !== core.hue('b') && core.hue('zzz') < 360, 'a person keeps one colour');
}
// ---- merge: staleness is measured on OUR clock and moves only when the peer really did something
{
  let known = core.merge({}, [{ key: 'k1', state: { uid: 'u1', name: 'Ana', editing: 'n1', beat: 1 } }], T0);
  ok(known.k1.seenAt === T0, 'a new peer is seen now');
  known = core.merge(known, [{ key: 'k1', state: { uid: 'u1', name: 'Ana', editing: 'n1', beat: 1 } }], T0 + 30000);
  ok(known.k1.seenAt === T0, 'a repeated, unchanged state does not refresh "seen" (a frozen browser must not look alive)');
  known = core.merge(known, [{ key: 'k1', state: { uid: 'u1', name: 'Ana', editing: 'n1', beat: 2 } }], T0 + 30000);
  ok(known.k1.seenAt === T0 + 30000, 'a new heartbeat refreshes it');
  ok(core.fresh(known.k1, T0 + 30000 + C.STALE_MS) && !core.fresh(known.k1, T0 + 30000 + C.STALE_MS + 1), 'freshness ends exactly after the stale window');
  known = core.merge(known, [], T0 + 31000);
  ok(Object.keys(known).length === 0, 'a peer that left is gone');
}
// ---- the lock
{
  const peers = core.merge({}, [{ key: 'a:1', state: { uid: 'ana', name: 'Ana', editing: 'noteX', beat: 1 } }, { key: 'b:1', state: { uid: 'ben', name: 'Ben', editing: null, active: 'noteY', beat: 1 } }, { key: 'me:1', state: { uid: 'me', name: 'Me', editing: 'noteZ', beat: 1 } }], T0);
  const lock = (id, now = T0 + 1000) => core.lockOwner(peers, id, now, 'me:1');
  ok(lock('noteX') && lock('noteX').name === 'Ana', 'someone else editing a note blocks a second editor, and we know who');
  ok(lock('noteY') === null, 'merely moving or selecting a note is not a lock');
  ok(lock('noteZ') === null, 'my own editing never blocks me');
  ok(lock('noteX', T0 + C.STALE_MS + 1) === null, 'a lock whose holder went silent expires by itself (crash, closed laptop, lost connection)');
  ok(lock('nope') === null, 'an unknown note is not locked');
}
// ---- people list: one per person, fresh only, never me
{
  const peers = core.merge({}, [
    { key: 'a:1', state: { uid: 'ana', name: 'Ana', beat: 1 } }, { key: 'a:2', state: { uid: 'ana', name: 'Ana', editing: 'n9', beat: 1 } },
    { key: 'b:1', state: { uid: 'ben', name: 'Ben', beat: 1 } }, { key: 'me:2', state: { uid: 'me', name: 'Me', beat: 1 } }], T0);
  const list = core.people(peers, T0 + 500, 'me:1', 'me');
  ok(list.length === 2 && list.map((p) => p.uid).join() === 'ana,ben', 'several tabs of one person show once, and I do not list myself (even from another tab)');
  ok(list[0].editing === 'n9', 'the person entry keeps the tab that is editing');
  ok(core.people(peers, T0 + C.STALE_MS + 5, 'me:1', 'me').length === 0, 'everyone silent: nobody is shown as present');
}
// ---- the service is inert without a session
ok(C.active() === false && C.blockedBy('x') === null && C.people().length === 0 && C.summaryFor('x').count === 0, 'with no board joined there is no lock, no people and no counts');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
