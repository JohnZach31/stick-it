/* Emoji reactions on objects: pure rules (no DOM), testable under Node.
 * An object carries  reactions: { "<emoji>": ["<user id>", ...] }  (only the allowed emoji; each person once per emoji).
 * A person toggles their own reaction; they can never add or remove someone else's. */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var R = Stick.reactions = {};
  R.SET = ["👍", "❤️", "😂", "👀", "✅", "💡"];   // thumbs up, heart, laugh, eyes, check, bulb
  R.MAX_PER = 50;                                    // people per emoji kept on one object
  var UID = /^[\w.@:-]{1,64}$/;
  R.normalize = function (raw) {
    var out = {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
    R.SET.forEach(function (e) {
      var list = raw[e]; if (!Array.isArray(list)) return;
      var seen = {}, keep = [];
      list.forEach(function (u) { u = String(u); if (UID.test(u) && !seen[u] && keep.length < R.MAX_PER) { seen[u] = 1; keep.push(u); } });
      if (keep.length) out[e] = keep;
    });
    return out;
  };
  // the new reactions after `uid` toggles `emoji` (a new object; the input is never changed). Unknown emoji and empty ids change nothing.
  R.toggle = function (reactions, emoji, uid) {
    var cur = R.normalize(reactions);
    if (R.SET.indexOf(emoji) === -1 || !UID.test(String(uid || ""))) return cur;
    var list = (cur[emoji] || []).slice(), i = list.indexOf(uid);
    if (i === -1) { if (list.length < R.MAX_PER) list.push(uid); } else list.splice(i, 1);
    if (list.length) cur[emoji] = list; else delete cur[emoji];
    return cur;
  };
  // [{emoji, count, mine}] in the order of the allowed set
  R.summary = function (reactions, uid) {
    var cur = R.normalize(reactions);
    return R.SET.filter(function (e) { return cur[e]; }).map(function (e) { return { emoji: e, count: cur[e].length, mine: cur[e].indexOf(uid) !== -1 }; });
  };
  R.total = function (reactions) { return R.summary(reactions, "").reduce(function (t, s) { return t + s.count; }, 0); };
  R.isEmpty = function (reactions) { return R.total(reactions) === 0; };
})(typeof window !== "undefined" ? window : globalThis);
