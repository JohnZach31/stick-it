/* Collaboration, kept deliberately small:
 *   - who is on this board (small initials in the header) and which object someone is working on right now
 *   - a soft "someone is editing this note" lock that can never get stuck (it expires on its own)
 *   - comments that are attached to OBJECTS only, and a three-state review (none / changes requested / ready for review)
 * No live cursors, no notification centre, no priorities, no assignees.
 *
 * Presence runs on a PRIVATE Supabase Realtime channel "board:<id>" (the database only lets that board's members on it, see
 * migration 20261001140000_collab.sql). The pure rules below (merge, staleness, locks) are unit-tested under Node.
 * Classic script; attaches window.Stick.collab. */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var C = Stick.collab = {};

  // ================================================================== pure rules
  var STALE_MS = 40000, BEAT_MS = 15000;
  C.STALE_MS = STALE_MS; C.BEAT_MS = BEAT_MS;
  var core = C.core = {};

  core.hue = function (id) { var h = 0, s = String(id || "x"); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % 360; };
  core.initial = function (name) { var t = String(name || "").trim(), g = t ? Array.from(t)[0] : "?"; return g.toUpperCase(); };
  core.cleanState = function (st) {                     // what we accept from the network: short plain strings only
    st = st && typeof st === "object" ? st : {};
    function s(v, n) { return typeof v === "string" ? v.replace(/[\u0000-\u001f‪-‮⁦-⁩]/g, "").slice(0, n) : ""; }
    return { uid: s(st.uid, 64), name: s(st.name, 40), editing: st.editing ? s(st.editing, 64) : null, active: st.active ? s(st.active, 64) : null, beat: Number(st.beat) || 0 };
  };
  // merge a fresh list of {key, state} into the known peers; "seenAt" moves only when a peer's heartbeat/state really changed,
  // measured on OUR clock (clock differences between devices never matter)
  core.merge = function (known, incoming, now) {
    var next = {};
    incoming.forEach(function (p) {
      var st = core.cleanState(p.state), old = known[p.key];
      var changed = !old || old.state.beat !== st.beat || old.state.editing !== st.editing || old.state.active !== st.active || old.state.name !== st.name;
      next[p.key] = { key: p.key, state: st, seenAt: changed ? now : old.seenAt };
    });
    return next;
  };
  core.fresh = function (peer, now) { return now - peer.seenAt <= STALE_MS; };
  // others on the board, one per person (several tabs of one person count once), stale peers dropped
  core.people = function (peers, now, selfKey, selfUid) {
    var byUid = {};
    Object.keys(peers).forEach(function (k) {
      var p = peers[k];
      if (k === selfKey || !core.fresh(p, now)) return;
      var u = p.state.uid || k;
      if (selfUid && u === selfUid) return;
      var cur = byUid[u];
      if (!cur || (p.state.editing && !cur.editing)) byUid[u] = { uid: u, name: p.state.name || "Someone", editing: p.state.editing, active: p.state.active, hue: core.hue(u), initial: core.initial(p.state.name) };
      else if (!cur.active && p.state.active) cur.active = p.state.active;
    });
    return Object.keys(byUid).sort().map(function (u) { return byUid[u]; });
  };
  // who (if anyone else) is editing this object right now. A stale entry never blocks anyone.
  core.lockOwner = function (peers, objectId, now, selfKey) {
    var best = null;
    Object.keys(peers).forEach(function (k) {
      var p = peers[k];
      if (k === selfKey || !core.fresh(p, now)) return;
      if (p.state.editing === objectId && (!best || p.seenAt > best.seenAt)) best = p;
    });
    return best ? { uid: best.state.uid || best.key, name: best.state.name || "Someone" } : null;
  };

  // ================================================================== transports
  function supabaseTransport(boardId, selfKey, onSync) {
    var ch = null, client = null, ready = false, pending = null, dead = false;
    function gather() {
      var st = ch.presenceState(), list = [];
      Object.keys(st).forEach(function (k) { var arr = st[k]; if (arr && arr.length) list.push({ key: k, state: arr[arr.length - 1] }); });
      onSync(list);
    }
    Stick.cloud.load().then(function (c) {
      if (dead) return;
      client = c;
      ch = c.channel("board:" + boardId, { config: { private: true, presence: { key: selfKey } } });
      ch.on("presence", { event: "sync" }, gather);
      ch.subscribe(function (status) {
        if (status === "SUBSCRIBED") { ready = true; if (pending) { ch.track(pending); } }
      });
    }, function () {});
    return {
      track: function (st) { pending = st; if (ready && ch) { try { ch.track(st); } catch (e) {} } },
      leave: function () { dead = true; try { if (ch) { ch.untrack(); if (client) client.removeChannel(ch); } } catch (e) {} }
    };
  }
  // dev/test only: several tabs of one browser stand in for several people (same origin, no server)
  function broadcastTransport(boardId, selfKey, onSync) {
    var bc = new root.BroadcastChannel("stickit-presence:" + boardId), seen = {}, mine = null, timer = null;
    function emit() { var list = []; Object.keys(seen).forEach(function (k) { if (Date.now() - seen[k].at < 6000) list.push({ key: k, state: seen[k].state }); }); onSync(list); }
    bc.onmessage = function (e) {
      var m = e.data || {};
      if (m.type === "state" && m.key !== selfKey) { seen[m.key] = { state: m.state, at: Date.now() }; emit(); }
      else if (m.type === "bye") { delete seen[m.key]; emit(); }
      else if (m.type === "hello" && mine) bc.postMessage({ type: "state", key: selfKey, state: mine });
    };
    timer = setInterval(function () { if (mine) bc.postMessage({ type: "state", key: selfKey, state: mine }); emit(); }, 2000);
    bc.postMessage({ type: "hello", key: selfKey });
    return {
      track: function (st) { mine = st; bc.postMessage({ type: "state", key: selfKey, state: st }); },
      leave: function () { clearInterval(timer); try { bc.postMessage({ type: "bye", key: selfKey }); bc.close(); } catch (e) {} }
    };
  }

  // ================================================================== the running service
  var S = null;       // current session
  function db() { return Stick.cloud.load(); }

  C.start = function (opts) {
    // opts: {boardId, me:{uid,name}, role, host:{notes(), refresh(), toast(fn), canComment}, transport}
    C.stop();
    var selfKey = (opts.me.uid || "dev") + ":" + Math.random().toString(36).slice(2, 8);
    S = { opts: opts, selfKey: selfKey, peers: {}, beat: 0, editing: null, active: null, summary: { comments: {}, reviews: {} }, timers: [], listeners: [] };
    var onSync = function (list) { S.peers = core.merge(S.peers, list, Date.now()); render(); };
    try { S.tp = (opts.transport === "broadcast" && root.BroadcastChannel) ? broadcastTransport(opts.boardId, selfKey, onSync) : (opts.transport === "none" ? null : supabaseTransport(opts.boardId, selfKey, onSync)); } catch (e) { S.tp = null; }
    function send() { if (!S || !S.tp) return; S.beat++; S.tp.track({ uid: opts.me.uid, name: opts.me.name, editing: S.editing, active: S.active, beat: S.beat }); }
    S.send = send; send();
    S.timers.push(setInterval(function () { send(); render(); }, BEAT_MS));
    S.timers.push(setInterval(function () { render(); }, 5000));                     // so a silent peer's lock really does expire on screen
    if (opts.comments !== false) {
      C.refreshSummary();
      S.timers.push(setInterval(function () { if (root.document.visibilityState !== "hidden") C.refreshSummary(); }, 30000));
    }
    root.addEventListener("pagehide", C.stop);
    return true;
  };
  C.stop = function () {
    if (!S) return;
    var host = S.opts.host; lastSig = "";
    S.timers.forEach(clearInterval);
    if (S.tp) S.tp.leave();
    S = null; drawPeople();
    if (host && host.refresh) host.refresh();
  };
  C.active = function () { return !!S; };
  C.canComment = function () { return !!S && S.opts.canComment !== false && S.opts.comments !== false; };
  C.setEditing = function (id) { if (!S || S.editing === id) return; S.editing = id || null; S.send(); };
  C.setActive = function (id) { if (!S || S.active === id) return; S.active = id || null; S.send(); };
  C.blockedBy = function (id) { if (!S) return null; var o = core.lockOwner(S.peers, String(id), Date.now(), S.selfKey); return o ? o.name : null; };
  C.people = function () { return S ? core.people(S.peers, Date.now(), S.selfKey, S.opts.me.uid) : []; };
  C.summaryFor = function (id) {
    if (!S) return { count: 0, review: null };
    return { count: S.summary.comments[id] || 0, review: S.summary.reviews[id] || null };
  };

  // ---- data (comments and review go through the normal, RLS-protected API)
  C.refreshSummary = function () {
    if (!S) return Promise.resolve();
    var sess = S, id = S.opts.boardId;
    return db().then(function (c) { return c.rpc("board_collab_summary", { p_board: id }); }).then(function (r) {
      if (S !== sess || r.error || !r.data) return;
      var cm = {}, rv = {};
      (r.data.comments || []).forEach(function (x) { cm[x.object_id] = x.count; });
      (r.data.reviews || []).forEach(function (x) { rv[x.object_id] = { state: x.state, reason: x.reason || "" }; });
      S.summary = { comments: cm, reviews: rv };
      render();
    }, function () {});
  };
  C.listComments = function (objectId) {
    return db().then(function (c) {
      return c.from("comments").select("id,author_id,body,created_at").eq("object_id", objectId).is("deleted_at", null).order("created_at", { ascending: true }).limit(200)
        .then(function (r) {
          if (r.error) throw Stick.errors.parse(r.error);
          var rows = r.data || [], ids = rows.map(function (x) { return x.author_id; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; });
          if (!ids.length) return rows;
          return c.from("profiles").select("id,display_name").in("id", ids).then(function (p) {
            var names = {}; (p.data || []).forEach(function (x) { names[x.id] = x.display_name; });
            rows.forEach(function (x) { x.author = names[x.author_id] || "Someone"; });
            return rows;
          });
        });
    });
  };
  C.addComment = function (objectId, body) {
    var text = String(body || "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f‪-‮⁦-⁩]/g, "").trim().slice(0, 1000);
    if (!text) return Promise.reject(new Error("EMPTY"));
    var uid = S && S.opts.me.uid, board = S && S.opts.boardId;
    return db().then(function (c) { return c.from("comments").insert({ board_id: board, object_id: objectId, author_id: uid, body: text }).select("id").single(); })
      .then(function (r) {
        if (r.error) throw Stick.errors.parse(r.error);
        if (S && r.data) {                                   // show the new state at once; the refresh below only confirms it
          if (r.data.state === "none") delete S.summary.reviews[objectId];
          else S.summary.reviews[objectId] = { state: r.data.state, reason: r.data.reason || "" };
        }
        C.refreshSummary(); return r.data;
      });
  };
  C.deleteComment = function (id) {
    return db().then(function (c) { return c.from("comments").update({ deleted_at: new Date().toISOString() }).eq("id", id); })
      .then(function (r) { if (r.error) throw Stick.errors.parse(r.error); C.refreshSummary(); });
  };
  C.setReview = function (objectId, state, reason) {
    return db().then(function (c) { return c.rpc("set_review_state", { p_object: objectId, p_state: state, p_reason: reason || null }); })
      .then(function (r) {
        if (r.error) throw Stick.errors.parse(r.error);
        if (S && r.data) {                                   // show the new state at once; the refresh below only confirms it
          if (r.data.state === "none") delete S.summary.reviews[objectId];
          else S.summary.reviews[objectId] = { state: r.data.state, reason: r.data.reason || "" };
        }
        C.refreshSummary(); return r.data;
      });
  };

  // ================================================================== drawing
  function el(tag, cls, text) { var e = root.document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var lastSig = "";
  function render() {
    drawPeople();
    if (!S || !S.opts.host || !S.opts.host.refresh) return;
    var sig = JSON.stringify([C.people().map(function (p) { return [p.uid, p.editing, p.active]; }), S.summary]);
    if (sig === lastSig) return;                        // nothing visible changed: leave the board's elements alone
    lastSig = sig; S.opts.host.refresh();
  }
  var barEl = null;
  function drawPeople() {
    var bar = root.document.getElementById("presenceBar");
    if (!bar) return;
    barEl = bar;
    var people = C.people(); bar.innerHTML = "";
    bar.hidden = !people.length;
    people.slice(0, 5).forEach(function (p) {
      var a = el("span", "presAv", p.initial); a.style.setProperty("--h", p.hue);
      a.title = p.name + (p.editing ? " is editing" : " is here"); a.setAttribute("role", "img"); a.setAttribute("aria-label", p.name + (p.editing ? " is editing a note" : " is on this board"));
      bar.appendChild(a);
    });
    if (people.length > 5) { var more = el("span", "presAv presMore", "+" + (people.length - 5)); more.setAttribute("aria-label", (people.length - 5) + " more people here"); bar.appendChild(more); }
  }

  // called for every object element the app draws (or redraws)
  C.decorate = function (n, node) {
    if (!S || !node || !n || !n.id) return;
    var old = node.querySelectorAll(":scope > .cmtTab, :scope > .peerBadge");
    Array.prototype.forEach.call(old, function (x) { x.remove(); });
    node.classList.remove("peerActive", "peerEditing");
    var now = Date.now();
    // someone else is working on it
    Object.keys(S.peers).forEach(function (k) {
      var p = S.peers[k];
      if (k === S.selfKey || !core.fresh(p, now)) return;
      if (p.state.uid && p.state.uid === S.opts.me.uid) return;
      var hit = p.state.editing === n.id ? "editing" : p.state.active === n.id ? "active" : null;
      if (!hit || node.querySelector(":scope > .peerBadge")) return;
      node.classList.add(hit === "editing" ? "peerEditing" : "peerActive");
      var b = el("span", "peerBadge", core.initial(p.state.name)); b.style.setProperty("--h", core.hue(p.state.uid || k));
      b.title = (p.state.name || "Someone") + (hit === "editing" ? " is editing this" : " is moving this"); b.setAttribute("aria-label", b.title);
      node.appendChild(b);
    });
    // comments and review
    if (S.opts.comments === false) return;
    var sm = C.summaryFor(n.id), canAdd = S.opts.canComment !== false;
    if (sm.count || sm.review || (canAdd && !S.opts.readOnlyView)) {
      var tab = el("button", "cmtTab" + (sm.review ? " rv-" + sm.review.state : "") + (sm.count || sm.review ? " has" : ""));
      tab.type = "button";
      var label = sm.count ? sm.count + (sm.count === 1 ? " comment" : " comments") : "Comment";
      var rvText = sm.review ? (sm.review.state === "changes_requested" ? ", changes requested" : ", ready for review") : "";
      tab.setAttribute("aria-label", label + " on this object" + rvText);
      tab.title = label + rvText;
      var glyph = el("span", "cmtGlyph", sm.review ? (sm.review.state === "changes_requested" ? "!" : "✓") : (sm.count ? String(sm.count) : "+"));
      glyph.setAttribute("aria-hidden", "true"); tab.appendChild(glyph);
      tab.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
      tab.addEventListener("mousedown", function (e) { e.preventDefault(); });
      tab.addEventListener("click", function (e) { e.stopPropagation(); C.openSlip(n, tab); });
      node.appendChild(tab);
    }
  };

  // ---- the paper slip: comment thread + review for one object
  C.openSlip = function (n, anchor) {
    if (!S) return;
    var host = S.opts.host, role = S.opts.role, isOwner = role === "owner", canEdit = role === "owner" || role === "editor";
    var slip = host.openPopover(anchor);
    if (!slip) return;
    slip.classList.add("cmtSlip");
    slip.setAttribute("role", "dialog"); slip.setAttribute("aria-label", "Comments on this object");
    var title = el("div", "cmtHead", "Comments"); slip.appendChild(title);
    var rvBox = el("div", "cmtReview"); slip.appendChild(rvBox);
    var list = el("div", "cmtList"); list.setAttribute("aria-live", "polite"); slip.appendChild(list);
    var form = el("div", "cmtForm");
    var input = el("textarea", "cmtInput"); input.rows = 2; input.maxLength = 1000; input.placeholder = "Add a comment"; input.setAttribute("aria-label", "Add a comment");
    var add = el("button", "pillBtn primary cmtAdd", "Add"); add.type = "button";
    var msg = el("p", "cmtMsg"); msg.setAttribute("role", "status");
    if (canEdit) { form.appendChild(input); form.appendChild(add); slip.appendChild(form); } else slip.appendChild(el("p", "cmtMsg", "You can read comments on this board but not add them."));
    slip.appendChild(msg);

    function paintReview() {
      var rv = C.summaryFor(n.id).review; rvBox.innerHTML = "";
      if (rv) {
        var line = el("p", "cmtRvLine", rv.state === "changes_requested" ? "Changes requested" + (rv.reason ? ": " + rv.reason : "") : "Ready for review");
        rvBox.appendChild(line);
      }
      var acts = el("div", "cmtRvActs");
      function act(label, state, withReason) {
        var b = el("button", "pillBtn cmtSmall", label); b.type = "button";
        b.addEventListener("click", function () {
          var reason = "";
          if (withReason) { reason = root.prompt ? (root.prompt("Why? (optional)", "") || "") : ""; }
          b.disabled = true;
          C.setReview(n.id, state, reason).then(function () { paintReview(); host.refresh(); }, function (e) { b.disabled = false; msg.textContent = Stick.errors.friendly(Stick.errors.parse(e)); });
        });
        acts.appendChild(b);
      }
      if (isOwner && (!rv || rv.state === "ready_for_review")) act("Request changes", "changes_requested", true);
      if (canEdit && rv && rv.state === "changes_requested") act("Mark ready for review", "ready_for_review", false);
      if (isOwner && rv) act("Resolve", "none", false);
      if (acts.childNodes.length) rvBox.appendChild(acts);
    }
    function paintList() {
      C.listComments(n.id).then(function (rows) {
        list.innerHTML = "";
        if (!rows.length) list.appendChild(el("p", "cmtEmpty", "No comments yet."));
        rows.forEach(function (r) {
          var item = el("div", "cmtItem"), who = el("b", "", r.author || "Someone"), when = el("span", "cmtWhen", fmtWhen(r.created_at)), body = el("p", "cmtBody", r.body);
          item.appendChild(who); item.appendChild(when); item.appendChild(body);
          if (r.author_id === S.opts.me.uid || isOwner) {
            var del = el("button", "cmtDel", "Delete"); del.type = "button"; del.setAttribute("aria-label", "Delete this comment");
            del.addEventListener("click", function () { C.deleteComment(r.id).then(paintList, function (e) { msg.textContent = Stick.errors.friendly(Stick.errors.parse(e)); }); });
            item.appendChild(del);
          }
          list.appendChild(item);
        });
        list.scrollTop = list.scrollHeight;
      }, function (e) { list.textContent = ""; msg.textContent = Stick.errors.friendly(Stick.errors.parse(e)); });
    }
    function post() {
      var v = input.value.trim(); if (!v) return;
      add.disabled = true; msg.textContent = "";
      C.addComment(n.id, v).then(function () { input.value = ""; add.disabled = false; paintList(); host.refresh(); },
        function (e) { add.disabled = false; msg.textContent = Stick.errors.friendly(Stick.errors.parse(e)); });
    }
    add.addEventListener("click", post);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); post(); } e.stopPropagation(); });
    paintReview(); paintList();
    setTimeout(function () { try { (canEdit ? input : slip).focus({ preventScroll: true }); } catch (e) {} }, 30);
  };
  function fmtWhen(iso) { try { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); } catch (e) { return ""; } }
})(typeof window !== "undefined" ? window : globalThis);
