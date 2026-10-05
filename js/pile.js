/* Piles and vertical stacks: the pure rules (no DOM), so they can be tested under Node.
 *
 * A PILE is a small object that REFERENCES other objects. It never contains them:
 *   { type:"pile", id, x, y, w, rot, z, members:[id, ...], ox, oy, edges }
 *     members  ids, TOP FIRST (members[0] is the paper you see on top)
 *     ox, oy   where the pile was when it was made; if the pile is dragged and then unpiled, the members come back shifted by the same amount
 *     edges    a small number that seeds the tilt of the decorative paper edges (looks only)
 * Every member keeps its own row, content, comments, media, Done state and timestamps. While it is in a pile it carries `pileId` and is simply not
 * drawn; it stays in the board's object list, so sync, search, export and undo all still see it. Not being drawn never means being deleted.
 *
 * A member is HIDDEN only while its pile exists in the board, lists it, and has at least two live members. Anything else (a pile that is missing,
 * does not list it, or has shrunk to one) leaves the object visible, so a half-arrived sync or a damaged reference can never hide a note.
 *
 * Phase 1: no nested piles, notes / checklists / simple typed papers only (receipt, ticket), a pile cannot be duplicated or marked Done.
 */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var P = Stick.pile = {};

  P.MAX_MEMBERS = 500;
  P.MIN_MEMBERS = 2;
  P.WIDTH = [150, 260, 200];             // min, max, default (the footprint stays this size however many members there are)
  P.STACK_STEP = 28;                     // how far each paper in a vertical stack sits below the one before it
  P.ELIGIBLE_TYPES = ["receipt", "ticket"];          // besides ordinary notes (which have no type)

  var ID_RE = /^[\w-]{1,64}$/;
  function num(v, lo, hi, d) { v = Number(v); return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; }

  // can this object go into a pile or a stack? (notes, checklists, simple papers; not photos, media, zones, lists, piles, soup bowls, pinned or Done things)
  P.eligible = function (o) {
    if (!o || o.type === "pile") return false;
    if (o.pinned === true || Number(o.doneAt) > 0) return false;
    if (o.cosmetic) return false;
    if (!o.type) return true;
    return P.ELIGIBLE_TYPES.indexOf(o.type) !== -1;
  };

  // the clean model of a pile coming from storage, the server or a share. Always has unique, valid member ids.
  P.normalize = function (item) {
    item = item || {};
    if (item.type !== "pile") return null;
    var seen = {}, members = [];
    (Array.isArray(item.members) ? item.members : []).forEach(function (id) {
      id = String(id == null ? "" : id);
      if (ID_RE.test(id) && !seen[id] && members.length < P.MAX_MEMBERS) { seen[id] = 1; members.push(id); }
    });
    var out = { type: "pile", members: members };
    out.w = Math.round(num(item.w, P.WIDTH[0], P.WIDTH[1], P.WIDTH[2]));
    out.ox = num(item.ox, -1e7, 1e7, num(item.x, -1e7, 1e7, 0));
    out.oy = num(item.oy, -1e7, 1e7, num(item.y, -1e7, 1e7, 0));
    out.edges = Math.round(num(item.edges, 0, 1e6, 1));
    return out;
  };

  // ---- reading the board: which members are hidden, how many are really there
  // `find(id)` returns the object with that id or null.
  P.live = function (pile, find) { return (pile && pile.members || []).filter(function (id) { return !!find(id); }); };
  P.isHidden = function (member, find) {
    if (!member || !member.pileId) return false;
    var pile = find(member.pileId);
    if (!pile || pile.type !== "pile" || (pile.members || []).indexOf(member.id) === -1) return false;
    return P.live(pile, find).length >= P.MIN_MEMBERS;
  };
  // objects drawn as ordinary things: the pile itself counts as nothing, its members count one each (the pile never hides how big a board really is)
  P.logicalCount = function (notes) { return notes.filter(function (n) { return n.type !== "pile"; }).length; };
  P.counts = function (notes, find) {
    var logical = 0, hidden = 0, piles = 0;
    notes.forEach(function (n) { if (n.type === "pile") piles++; else { logical++; if (P.isHidden(n, find)) hidden++; } });
    return { logical: logical, piles: piles, collapsedMembers: hidden, rendered: logical - hidden + piles };
  };

  // ---- order changes (all return NEW arrays)
  P.order = function (items) {                 // top first: the highest z (the paper on top of the heap) leads
    return items.slice().sort(function (a, b) { return (b.z || 0) - (a.z || 0); });
  };
  P.removeMember = function (members, id) { return members.filter(function (m) { return m !== id; }); };
  P.sendTopToBack = function (members) { return members.length < 2 ? members.slice() : members.slice(1).concat([members[0]]); };
  P.shuffle = function (members, rnd) {
    var a = members.slice(); rnd = rnd || Math.random;
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };

  // ---- the vertical stack: items laid out in reading order, each one `step` below the one before, later ones on top, a hair of sway so it reads as paper
  // items: [{id, x, y}] -> [{id, x, y, order}] (order 0 is the back of the stack)
  P.stackLayout = function (items, step) {
    step = step || P.STACK_STEP;
    var list = items.slice().sort(function (a, b) { return (a.y - b.y) || (a.x - b.x); });
    if (!list.length) return [];
    var x0 = list[0].x, y0 = Math.min.apply(null, list.map(function (i) { return i.y; }));
    return list.map(function (it, i) { return { id: it.id, x: Math.round(x0 + ((i % 3) - 1) * 2 + 2), y: Math.round(y0 + i * step), order: i }; });
  };

  // ---- coming apart: where each member returns to (where it was, shifted by however far the pile has been dragged since)
  P.unpileShift = function (pile) { return { dx: (pile.x || 0) - (pile.ox || 0), dy: (pile.y || 0) - (pile.oy || 0) }; };

  P.label = function (pile, n) { return "Pile of " + (n != null ? n : (pile && pile.members ? pile.members.length : 0)); };
})(typeof window !== "undefined" ? window : globalThis);
