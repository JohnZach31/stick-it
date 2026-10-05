/* Layering: which object sits on top of which. Pure rules (no DOM), testable under Node.
 *
 *   Stick.layers.plan(items, selectedIds, op) -> { changes: {id: newZ}, order: [ids bottom..top] }
 *
 * items: [{id, z}] = the objects that take part (the caller leaves out zones, which always sit at the back, and papers that are hidden inside a collapsed pile).
 * op: "front" | "back" | "forward" | "backward".
 * Only z changes: never a position, never a pile membership, never a zone. As few objects as possible get a new z (so a sync sends little).
 */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var L = Stick.layers = {};
  L.OPS = ["front", "back", "forward", "backward"];

  function sorted(items) {
    return items.map(function (o, i) { return { id: o.id, z: Number(o.z) || 0, i: i }; }).sort(function (a, b) { return (a.z - b.z) || (a.i - b.i); });
  }
  function distinct(list) { for (var i = 1; i < list.length; i++) if (list[i].z <= list[i - 1].z) return false; return true; }
  function renumber(list, changes, orig) { list.forEach(function (o, i) { o.z = i + 1; if (orig[o.id] !== o.z) changes[o.id] = o.z; }); }

  L.plan = function (items, selectedIds, op) {
    var sel = {}; (selectedIds || []).forEach(function (id) { sel[id] = true; });
    var list = sorted(items), orig = {}; list.forEach(function (o) { orig[o.id] = o.z; });
    var changes = {};
    if (!list.some(function (o) { return sel[o.id]; }) || L.OPS.indexOf(op) === -1) return { changes: {}, order: list.map(function (o) { return o.id; }) };
    // equal z values make "one step" meaningless: settle them first (rare: only objects that were never layered)
    if (!distinct(list)) renumber(list, changes, orig);
    var mine = list.filter(function (o) { return sel[o.id]; }), rest = list.filter(function (o) { return !sel[o.id]; });
    if (op === "front") {
      if (!rest.length || mine[0].z > rest[rest.length - 1].z) { /* already on top */ }
      var top = list[list.length - 1].z, onTop = mine.every(function (o, i) { return o.z > (rest.length ? rest[rest.length - 1].z : 0); });
      if (!onTop) mine.forEach(function (o, i) { var nz = top + 1 + i; o.z = nz; changes[o.id] = nz; });
    } else if (op === "back") {
      var low = rest.length ? rest[0].z : mine[mine.length - 1].z + 1, atBack = mine.every(function (o) { return o.z < low; });
      if (!atBack) {
        if (low - mine.length >= 1) mine.forEach(function (o, i) { var nz = low - mine.length + i; o.z = nz; changes[o.id] = nz; });
        else {                                  // no room under the lowest: lay everything out again with the selection first
          var all = mine.concat(rest); all.forEach(function (o, i) { o.z = i + 1; if (orig[o.id] !== o.z) changes[o.id] = o.z; else delete changes[o.id]; });
        }
      }
    } else if (op === "forward") {
      for (var i = list.length - 2; i >= 0; i--) {              // from the top down, each selected object trades places with the object above it
        if (sel[list[i].id] && !sel[list[i + 1].id]) { var a = list[i], b = list[i + 1], t = a.z; a.z = b.z; b.z = t; var tmp = list[i]; list[i] = list[i + 1]; list[i + 1] = tmp; changes[a.id] = a.z; changes[b.id] = b.z; }
      }
    } else if (op === "backward") {
      for (var j = 1; j < list.length; j++) {
        if (sel[list[j].id] && !sel[list[j - 1].id]) { var c = list[j], d = list[j - 1], t2 = c.z; c.z = d.z; d.z = t2; var tmp2 = list[j]; list[j] = list[j - 1]; list[j - 1] = tmp2; changes[c.id] = c.z; changes[d.id] = d.z; }
      }
    }
    // an object whose z ended where it began is not a change
    Object.keys(changes).forEach(function (id) { if (changes[id] === orig[id]) delete changes[id]; });
    var order = list.slice().sort(function (p, q) { return p.z - q.z; }).map(function (o) { return o.id; });
    return { changes: changes, order: order };
  };
})(typeof window !== "undefined" ? window : globalThis);
