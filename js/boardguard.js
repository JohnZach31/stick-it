/* Board-size safeguards (pure rules, no DOM) so they can be tested under Node.
 *
 *  - A burst limiter for the actions that multiply objects (duplicate, paste): a short burst runs at once, a sustained burst is SLOWED, never
 *    dropped, and each action stays whole (a batch is either run entirely or queued entirely, never split).
 *  - Soft size levels based on the number of ACTIVE board objects (what is on the board, not what is soft-deleted or in the Done pile).
 *  - A projected-size check for bulk operations: before something adds many objects at once, say how many and how big the board will become.
 *
 * Nothing here is a hard cap and none of it is tied to a plan: it protects performance, it is not a feature to sell.
 */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var G = Stick.guard = {};

  G.LEVELS = { large: 500, heavy: 750, huge: 1000 };
  G.BULK_MIN = 25;                       // an operation adding at least this many objects at once counts as "bulk"

  // 0 = comfortable, 1 = large, 2 = heavy, 3 = huge
  G.level = function (count) {
    count = Number(count) || 0;
    return count >= G.LEVELS.huge ? 3 : count >= G.LEVELS.heavy ? 2 : count >= G.LEVELS.large ? 1 : 0;
  };
  G.levelMessage = function (level, count) {
    if (level === 1) return "This is a large board (" + count + " objects). It may feel slower. Moving some notes to another board can help.";
    if (level === 2) return "This board is getting very heavy (" + count + " objects). Expect slowdowns; consider moving some notes to another board.";
    if (level >= 3) return "This board has " + count + " objects, which is more than Stick-It handles comfortably. Please tidy or split it.";
    return "";
  };
  // Does an operation that adds `adding` objects to a board of `current` need a confirmation first?
  G.needsConfirm = function (current, adding) {
    current = Number(current) || 0; adding = Number(adding) || 0;
    return adding >= G.BULK_MIN && current + adding >= G.LEVELS.huge;
  };
  G.confirmText = function (current, adding) {
    return "This will add " + adding + " objects, taking the board from " + current + " to " + (current + adding) + ". Boards this large can be slow and use a lot of memory.";
  };

  // The burst limiter. reserve(now) returns {at, delay}: when this action should run. A short burst (up to `burst` actions inside `windowMs`)
  // runs immediately; after that every action is spaced `spacingMs` after the previous one. Order is always kept; nothing is ever refused.
  G.createLimiter = function (opts) {
    opts = opts || {};
    var burst = opts.burst || 15, windowMs = opts.windowMs || 5000, spacingMs = opts.spacingMs || 600, runs = [];
    return {
      reserve: function (now) {
        now = now == null ? Date.now() : now;
        runs = runs.filter(function (t) { return t > now - windowMs; });
        var at = now;
        if (runs.length >= burst) at = Math.max(now, runs[runs.length - 1] + spacingMs);
        runs.push(at);
        return { at: at, delay: at - now, queued: at > now };
      },
      pending: function (now) { now = now == null ? Date.now() : now; return runs.filter(function (t) { return t > now; }).length; },
      reset: function () { runs = []; },
      config: { burst: burst, windowMs: windowMs, spacingMs: spacingMs }
    };
  };
})(typeof window !== "undefined" ? window : globalThis);
