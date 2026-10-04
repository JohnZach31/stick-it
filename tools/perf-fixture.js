/* Local performance fixture (dev only). Load it into a page served from localhost:
 *     const s = document.createElement('script'); s.src = '/tools/perf-fixture.js'; document.head.appendChild(s);
 *     await window.__perfFixture.build();      // writes ~70 objects to this browser's board, then reload the page
 *     await window.__perfFixture.measure();    // after the reload: numbers about DOM size, animations, decoded pictures, drag cost
 * It only touches this browser's own localStorage. Used for the before/after numbers in docs/patch-notes/0.8.0-audit.md. */
(function () {
  function photoData(i, w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d');
    var grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, 'hsl(' + (i * 47 % 360) + ',55%,62%)'); grd.addColorStop(1, 'hsl(' + ((i * 47 + 90) % 360) + ',60%,38%)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    var seed = i * 9973 + 7; function r() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    for (var k = 0; k < 160; k++) { g.fillStyle = 'hsla(' + Math.floor(r() * 360) + ',60%,' + Math.floor(25 + r() * 55) + '%,' + (0.25 + r() * 0.5) + ')'; g.beginPath(); g.arc(r() * w, r() * h, 6 + r() * 60, 0, 6.3); g.fill(); }
    return c.toDataURL('image/jpeg', 0.85);
  }
  var F = window.__perfFixture = {};
  F.key = function () { return Object.keys(localStorage).filter(function (k) { return /^stickyboard\.notes\./.test(k); })[0]; };
  F.build = function (copies) {
    copies = Math.max(1, copies || 1);
    var out = [], z = 1, id = 0, x, y, W = 1500;
    function nid(p) { return p + (++id); }
    var colors = ['hsl(52,96%,76%)', 'hsl(344,82%,86%)', 'hsl(146,50%,80%)', 'hsl(203,78%,85%)', 'hsl(24,92%,83%)', 'hsl(262,62%,87%)'];
    for (var i = 0; i < 26; i++) {
      var list = i % 5 === 0 ? '<ul class="checklist"><li data-checked="true">Milk</li><li data-checked="false">Bread</li><li data-checked="false">Soup</li></ul>' : 'Note number ' + i + ' with some words in it to look like real writing.';
      out.push({ id: nid('n'), x: 40 + (i % 9) * 250, y: 40 + Math.floor(i / 9) * 190, w: 220, html: list, bg: colors[i % 6], font: 'Caveat', rot: (i % 7) - 3, z: ++z, categoryIndex: 0, phys: {} });
    }
    for (i = 0; i < 4; i++) out.push({ id: nid('s'), x: 80 + i * 330, y: 620, w: 320, html: 'Soup number ' + i, bg: colors[0], font: 'Caveat', rot: i - 1, z: ++z, categoryIndex: 0, cosmetic: 'soup', phys: {} });
    for (i = 0; i < 12; i++) out.push({ id: nid('p'), type: 'photo', x: 60 + (i % 6) * 240, y: 900 + Math.floor(i / 6) * 260, w: 220, imgRatio: 0.75, rot: (i % 5) - 2, z: ++z, image: photoData(i, 1000, 750), photoStyle: 'polaroid', caption: i % 3 ? '' : 'Photo ' + i, font: 'Caveat', createdAt: 1, phys: {} });
    for (i = 0; i < 4; i++) out.push({ id: nid('r'), type: 'receipt', x: 100 + i * 260, y: 1440, w: 230, title: 'Corner shop', date: '2 Oct 2026', body: 'Bread 2.50\nMilk 1.20\nSoup 3.10', amount: '6.80', variant: 'torn', rot: i - 2, z: ++z, phys: {} });
    for (i = 0; i < 3; i++) out.push({ id: nid('t'), type: 'ticket', x: 120 + i * 360, y: 1700, w: 330, title: 'Concert', dateTime: 'Fri 8pm', place: 'Hall', details: 'Row 4', variant: 'classic', orient: 'landscape', rot: i - 1, z: ++z, phys: {} });
    for (i = 0; i < 2; i++) out.push({ id: nid('c'), type: 'postcard', x: 140 + i * 420, y: 1940, w: 320, location: 'Haifa', message: 'Wish you were here', recipient: 'Dana', variant: 'classic', imgRatio: 0.667, image: photoData(30 + i, 900, 600), rot: i, z: ++z, phys: {} });
    for (i = 0; i < 2; i++) out.push({ id: nid('f'), type: 'photo_strip', x: 1300 + i * 200, y: 100, w: 140, variant: 'vertical', caption: 'Strip', frames: [{ image: photoData(40 + i, 800, 600), ratio: 0.75 }, { image: photoData(50 + i, 800, 600), ratio: 0.75 }], rot: i, z: ++z, phys: {} });
    out.push({ id: nid('a'), type: 'audio', x: 700, y: 1440, w: 236, mediaId: 'none-a', duration: 5, mime: 'audio/wav', caption: 'Memo', font: 'Caveat', createdAt: 1, z: ++z, rot: 0, phys: {} });
    out.push({ id: nid('v'), type: 'video', x: 1000, y: 1440, w: 220, mediaId: 'none-v', duration: 4, mime: 'video/webm', imgRatio: 0.5625, caption: 'Clip', font: 'Caveat', createdAt: 1, z: ++z, rot: 0, phys: {} });
    var all = out.slice();
    for (var c = 1; c < copies; c++) out.forEach(function (o) { if (o.image || o.frames) return; var k = JSON.parse(JSON.stringify(o)); k.id = o.id + '_' + c; k.x = o.x + c * 2600; if (k.frames) k.frames = k.frames; all.push(k); });
    localStorage.setItem(F.key(), JSON.stringify(all));
    return all.length + ' objects written; reload the page';
  };
  F.measure = async function () {
    await new Promise(function (r) { setTimeout(r, 1500); });
    var res = { objects: document.querySelectorAll('.note, .photoObj, .boardObj').length, domNodes: document.getElementsByTagName('*').length };
    res.runningAnimations = document.getAnimations().filter(function (a) { return a.playState === 'running'; }).length;
    res.heapMB = performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null;
    var imgs = Array.prototype.filter.call(document.querySelectorAll('#board img, .board img'), function (im) { return im.naturalWidth > 0; }), dec = 0, need = 0, dpr = window.devicePixelRatio || 1;
    imgs.forEach(function (im) { dec += im.naturalWidth * im.naturalHeight * 4; var r = im.getBoundingClientRect(); need += Math.min(im.naturalWidth, Math.ceil(r.width * dpr)) * Math.min(im.naturalHeight, Math.ceil(r.height * dpr)) * 4; });
    res.pictures = imgs.length; res.decodedPictureMB = +(dec / 1048576).toFixed(1); res.neededPictureMB = +(need / 1048576).toFixed(1);
    // cost of dragging one note across the board (synchronous handlers + forced layout), and how many times the minimap strip was rebuilt
    var tr = document.getElementById('minimapTrack'), mut = 0, mo = new MutationObserver(function (m) { mut += m.length; }); mo.observe(tr, { childList: true });
    var note = document.querySelector('.note .tab') || document.querySelector('.note'), t0 = performance.now(), r0 = note.getBoundingClientRect(), x = r0.left + r0.width / 2, y = r0.top + 4;
    function ev(t, dx) { return new PointerEvent(t, { clientX: x + dx, clientY: y, pointerId: 9, pointerType: 'mouse', button: 0, bubbles: true, cancelable: true }); }
    note.dispatchEvent(ev('pointerdown', 0));
    for (var i = 1; i <= 120; i++) { window.dispatchEvent(ev('pointermove', i * 3)); }
    window.dispatchEvent(ev('pointerup', 360)); document.body.offsetHeight;
    res.dragMs = +(performance.now() - t0).toFixed(1); await new Promise(function (r) { setTimeout(r, 200); }); res.minimapMutations = mut; mo.disconnect();
    return res;
  };
})();
