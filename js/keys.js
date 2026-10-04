/* Stick-It keyboard bindings: pure rules (no DOM), so they can be tested under Node.
 *
 * A binding is a string such as "N", "Mod+D", "Mod+Shift+K", "Alt+[". "Mod" means Ctrl on Windows/Linux and Cmd on a Mac, so one stored
 * binding works on every machine. Keys are written as KeyboardEvent.key (letters upper-case).
 *
 *   Stick.keys.fromEvent(e, isMac)        -> "Mod+Shift+K" | null (a lone modifier, or a key that can never be bound)
 *   Stick.keys.format(binding, isMac)     -> ["Ctrl", "Shift", "K"]  (for key caps)
 *   Stick.keys.check(binding, ctx)        -> {ok:true} | {ok:false, kind:"invalid"|"reserved"|"editing"|"duplicate", message, holder?}
 *   Stick.keys.resolve(defaults, custom)  -> the active map {actionId: binding}
 */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var K = Stick.keys = {};

  var MODIFIER_KEYS = { Control: 1, Shift: 1, Alt: 1, Meta: 1, AltGraph: 1, OS: 1 };
  // keys that keep their job everywhere (closing, moving, deleting, typing a space): never rebindable
  var FIXED_KEYS = { Escape: "Esc closes whatever is open on top", Tab: "Tab moves between controls", Enter: "Enter confirms", Backspace: "Backspace deletes", Delete: "Delete deletes", " ": "Space is for typing and for pressing buttons", ArrowUp: "Arrow keys move the selection", ArrowDown: "Arrow keys move the selection", ArrowLeft: "Arrow keys move the selection", ArrowRight: "Arrow keys move the selection", Home: "Home and End move around text", End: "Home and End move around text", PageUp: "Page keys scroll", PageDown: "Page keys scroll", ContextMenu: "The menu key opens the menu of the selected object" };

  function norm(key) { return key && key.length === 1 ? key.toUpperCase() : key; }

  K.fromEvent = function (e, isMac) {
    var key = e.key;
    if (!key || MODIFIER_KEYS[key]) return null;
    var mod = isMac ? !!e.metaKey : !!e.ctrlKey, parts = [];
    if (mod) parts.push("Mod");
    // on the "other" platform the opposite modifier is not Mod: it stays as itself (Ctrl on a Mac, Win/Meta on Windows)
    if (isMac ? e.ctrlKey : e.metaKey) parts.push(isMac ? "Ctrl" : "Meta");
    if (e.altKey) parts.push("Alt");
    var k = norm(key);
    // On a non-Latin keyboard layout (Hebrew, Arabic, Cyrillic...) the key typed is not "N" or "K", but the key in that place is.
    // Browsers decide their own shortcuts by that place, so a shortcut follows the place too.
    if (key.length === 1 && !/[\x00-\x7f]/.test(key) && /^Key[A-Z]$/.test(e.code || "")) k = e.code.charAt(3);
    // Shift is part of a character ("?" is already Shift+/), so it is only kept for letters, digits, symbols with Mod/Alt, and named keys
    var isChar = key.length === 1;
    if (e.shiftKey && (!isChar || /[A-Za-z0-9]/.test(key) || mod || e.altKey)) parts.push("Shift");
    parts.push(k);
    return parts.join("+");
  };

  K.parse = function (binding) {
    var parts = String(binding || "").split("+"), key = parts.pop(), r = { mod: false, shift: false, alt: false, ctrl: false, meta: false, key: key };
    if (key === "" && parts.length) { key = "+"; r.key = "+"; parts.pop(); }                       // the "+" key itself: "Mod++"
    parts.forEach(function (p) { if (p === "Mod") r.mod = true; else if (p === "Shift") r.shift = true; else if (p === "Alt") r.alt = true; else if (p === "Ctrl") r.ctrl = true; else if (p === "Meta") r.meta = true; });
    return r;
  };

  K.format = function (binding, isMac) {
    var p = K.parse(binding), out = [];
    if (p.ctrl) out.push(isMac ? "Control" : "Ctrl");
    if (p.meta) out.push(isMac ? "Cmd" : "Win");
    if (p.alt) out.push(isMac ? "Option" : "Alt");
    if (p.mod) out.push(isMac ? "Cmd" : "Ctrl");
    if (p.shift) out.push("Shift");
    out.push(p.key === "ArrowLeft" ? "←" : p.key === "ArrowRight" ? "→" : p.key === "ArrowUp" ? "↑" : p.key === "ArrowDown" ? "↓" : p.key === " " ? "Space" : p.key);
    return out;
  };
  K.sentence = function (binding, isMac) { return K.format(binding, isMac).join(" + "); };

  // Combinations the browser or the operating system handles before the page ever sees them, or that would be dangerous to take over.
  var BROWSER = ["Mod+T", "Mod+W", "Mod+N", "Mod+Shift+N", "Mod+Shift+T", "Mod+Shift+W", "Mod+Q", "Mod+R", "Mod+Shift+R", "Mod+L", "Mod+P", "Mod+S", "Mod+O", "Mod+F", "Mod+G", "Mod+J", "Mod+U", "Mod+H",
    "Mod+Shift+Delete", "Mod+Shift+I", "Mod+Shift+J", "Mod+Shift+C", "Mod+Shift+B", "Mod+Shift+O", "Mod+Shift+A", "F1", "F3", "F5", "F6", "F7", "F10", "F11", "F12", "Alt+F4", "Alt+Left", "Alt+Right", "Alt+Home", "Alt+D", "Mod+Tab", "Mod+Shift+Tab", "Mod+PageUp", "Mod+PageDown", "Mod+Minus", "Mod+=", "Mod+0", "Mod++", "Mod+-", "Mod+D", "Mod+E", "Mod+M", "Mod+,"];
  // Mod+D, Mod+E, Mod+M, Mod+, are only reserved on some browsers/OSs: listed separately so the message can say "may"
  var MAYBE = { "Mod+D": 1, "Mod+E": 1, "Mod+M": 1, "Mod+,": 1 };
  var EDITING = { "Mod+C": "Copy", "Mod+X": "Cut", "Mod+V": "Paste", "Mod+A": "Select all", "Mod+Z": "Undo", "Mod+Y": "Redo", "Mod+Shift+Z": "Redo", "Mod+Shift+V": "Paste without formatting" };
  var SYSTEM = { "Alt+Tab": 1, "Alt+Shift+Tab": 1, "Alt+Escape": 1, "Mod+Space": 1, "Mod+Alt+Escape": 1, "Mod+Shift+Escape": 1, "Mod+Alt+Delete": 1 };

  // ctx: {isMac, actions: [{id,label}], current: {id: binding}, forId: the action being changed, fixed: {binding: label}}
  K.check = function (binding, ctx) {
    ctx = ctx || {};
    if (!binding) return { ok: false, kind: "invalid", message: "Press a key, or a key together with Ctrl, Shift or Alt." };
    var p = K.parse(binding), isMac = !!ctx.isMac;
    if (!p.key || MODIFIER_KEYS[p.key]) return { ok: false, kind: "invalid", message: "A shortcut needs a key, not only Ctrl, Shift or Alt." };
    if (FIXED_KEYS[p.key] && !p.mod && !p.alt) return { ok: false, kind: "reserved", message: FIXED_KEYS[p.key] + ", so it can't be used here." };
    if (!isMac && p.meta || (isMac && p.ctrl && !p.mod && /^( |Tab|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/.test(p.key))) return { ok: false, kind: "reserved", message: (isMac ? "Control" : "Windows-key") + " combinations like this belong to the system." };
    var canonical = binding;
    if (SYSTEM[canonical]) return { ok: false, kind: "reserved", message: K.sentence(binding, isMac) + " is used by the operating system." };
    if (BROWSER.indexOf(canonical) !== -1) {
      return { ok: false, kind: "reserved", message: K.sentence(binding, isMac) + (MAYBE[canonical] ? " is used by some browsers (and may never reach Stick-It)." : " is used by your browser and can't be taken over.") };
    }
    if (/^Mod\+[1-9]$/.test(canonical)) return { ok: false, kind: "reserved", message: K.sentence(binding, isMac) + " switches browser tabs." };
    if (EDITING[canonical]) return { ok: false, kind: "editing", message: K.sentence(binding, isMac) + " is " + EDITING[canonical] + " when you're typing, so it can't mean something else." };
    if (ctx.fixed && ctx.fixed[canonical]) return { ok: false, kind: "editing", message: K.sentence(binding, isMac) + " is already " + ctx.fixed[canonical] + " (it can't be changed)." };
    var cur = ctx.current || {};
    for (var id in cur) {
      if (id !== ctx.forId && cur[id] === canonical) {
        var label = (ctx.actions || []).filter(function (a) { return a.id === id; })[0];
        return { ok: false, kind: "duplicate", holder: id, message: K.sentence(binding, isMac) + " is already used for " + (label ? label.label : id) + "." };
      }
    }
    return { ok: true };
  };

  // the map that is actually in force: every action's default, replaced by what the person chose (an empty string = unbound)
  K.resolve = function (defaults, custom) {
    var out = {}, c = custom || {};
    Object.keys(defaults).forEach(function (id) { out[id] = Object.prototype.hasOwnProperty.call(c, id) ? c[id] : defaults[id]; });
    return out;
  };
  // drop anything stored for actions that no longer exist or that is no longer allowed (settings come from a file or an older version)
  K.sanitize = function (custom, defaults, isMac, fixed) {
    var out = {}, seen = {};
    Object.keys(custom || {}).forEach(function (id) {
      if (!Object.prototype.hasOwnProperty.call(defaults, id)) return;
      var b = custom[id];
      if (b === "") { out[id] = ""; return; }
      if (typeof b !== "string" || b.length > 40) return;
      var r = K.check(b, { isMac: isMac, forId: id, current: {}, fixed: fixed });
      if (!r.ok || seen[b]) return;
      seen[b] = 1; out[id] = b;
    });
    return out;
  };
  // the binding for an event, if it is one of the active bindings
  K.find = function (map, binding) {
    for (var id in map) if (map[id] && map[id] === binding) return id;
    return null;
  };
})(typeof window !== "undefined" ? window : globalThis);
