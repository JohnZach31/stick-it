(function(){
  "use strict";

  // ---------- one rule for Esc: close the topmost temporary layer ----------
  // Everything that floats over the board (a dialog, a menu, a popover, the board list, the tour, Focus Mode...) registers itself as a
  // layer when it opens. One listener, added before any other, answers Escape: it closes only the most recently opened layer that is
  // still open and stops there. With no layer open, Esc keeps its older jobs (stop editing, clear the selection).
  var OV = (function(){
    var stack = [];
    function prune(){ stack = stack.filter(function(e){ return e.isOpen(); }); }
    function layer(id, close, isOpen){
      var entry = {id: id, close: close, isOpen: isOpen || function(){ return true; }};
      return {
        open: function(){ stack = stack.filter(function(e){ return e !== entry; }); stack.push(entry); },
        close: function(){ stack = stack.filter(function(e){ return e !== entry; }); }
      };
    }
    function top(){ prune(); return stack.length ? stack[stack.length - 1] : null; }
    document.addEventListener("keydown", function(e){
      if(e.key !== "Escape" || e.isComposing) return;
      var t = e.target;
      if(t && t.matches && t.matches("[data-esc-clear]") && t.value) return;           // a search box clears its text first
      var layerOnTop = top();
      if(!layerOnTop) return;
      e.preventDefault(); e.stopImmediatePropagation();
      try{ layerOnTop.close(); }catch(err){}
      prune();
    }, true);
    return {layer: layer, top: top, ids: function(){ prune(); return stack.map(function(e){ return e.id; }); }};
  })();

  // ---------- logo: a little sticky note, red while loading, green once ready ----------
  function buildLogoSvg(fill, dark){
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
      '<g transform="rotate(-6 12 12)">' +
        '<path d="M4 3h12l4 4v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="' + fill + '"/>' +
        '<path d="M16 3v4h4z" fill="' + dark + '"/>' +
        '<line x1="6" y1="11" x2="15" y2="11" stroke="' + dark + '" stroke-width="1.3" stroke-linecap="round" opacity="0.55"/>' +
        '<line x1="6" y1="15" x2="12" y2="15" stroke="' + dark + '" stroke-width="1.3" stroke-linecap="round" opacity="0.55"/>' +
      '</g>' +
    '</svg>';
  }
  var LOGO_COLORS = {
    loading: { fill:"#d9634a", dark:"#a94a35" },
    ready:   { fill:"#5f9e5f", dark:"#3f7a40" }
  };
  function setLogo(state){
    var c = LOGO_COLORS[state] || LOGO_COLORS.ready;
    var svg = buildLogoSvg(c.fill, c.dark);
    var faviconLink = document.getElementById("faviconLink");
    if(faviconLink) faviconLink.href = "data:image/svg+xml," + encodeURIComponent(svg);
    var mark = document.getElementById("logoMark");
    if(mark) mark.innerHTML = svg;
  }
  setLogo("loading");
  if(window.Stick && Stick.legalReader) Stick.legalReader.init({layer: OV.layer, logo: function(){ return buildLogoSvg(LOGO_COLORS.ready.fill, LOGO_COLORS.ready.dark); }});

  // Fonts are script-aware. `script` is the writing system a font is designed for;
  // Hebrew fonts also carry their own matching Latin glyphs. `mood` picks the
  // fallback for other scripts so mixed-language notes still look like one hand.
  // `pool:false` fonts stay renderable for old notes but aren't picked or cycled.
  var FONTS = [
    {name:"Caveat", script:"latin", mood:"pen", also:["cyrillic"]},
    {name:"Kalam", script:"latin", mood:"pen"},
    {name:"Shadows Into Light", script:"latin", mood:"pen"},
    {name:"Indie Flower", script:"latin", mood:"round"},
    {name:"Patrick Hand", script:"latin", mood:"neat"},
    {name:"Gochi Hand", script:"latin", mood:"marker"},
    {name:"Architects Daughter", script:"latin", mood:"neat"},
    {name:"Permanent Marker", script:"latin", mood:"marker"},
    {name:"Reenie Beanie", script:"latin", mood:"pen"},
    {name:"Homemade Apple", script:"latin", mood:"script"},
    {name:"Covered By Your Grace", script:"latin", mood:"pen"},
    {name:"Schoolbell", script:"latin", mood:"round"},
    {name:"Crafty Girls", script:"latin", mood:"round"},
    {name:"Neucha", script:"latin", mood:"neat", also:["cyrillic"]},
    {name:"Dancing Script", script:"latin", mood:"script"},
    {name:"Handlee", script:"latin", mood:"neat"},
    {name:"Caveat Brush", script:"latin", mood:"marker"},
    {name:"Sriracha", script:"latin", mood:"round"},
    {name:"Zeyada", script:"latin", mood:"script"},
    {name:"Rock Salt", script:"latin", mood:"marker"},
    {name:"Gloria Hallelujah", script:"latin", mood:"round"},
    {name:"Just Another Hand", script:"latin", mood:"marker"},
    {name:"Sue Ellen Francisco", script:"latin", mood:"pen"},
    {name:"Walter Turncoat", script:"latin", mood:"round"},
    {name:"Rancho", script:"latin", mood:"round"},
    {name:"Nothing You Could Do", script:"latin", mood:"script"},
    {name:"Shadows Into Light Two", script:"latin", mood:"pen"},
    {name:"Swanky and Moo Moo", script:"latin", mood:"round"},
    {name:"Mansalva", script:"latin", mood:"pen"},
    {name:"Delicious Handrawn", script:"latin", mood:"neat"},
    {name:"Short Stack", script:"latin", mood:"round"},
    {name:"Loved by the King", script:"latin", mood:"script"},
    {name:"Give You Glory", script:"latin", mood:"pen"},
    {name:"Waiting for the Sunrise", script:"latin", mood:"pen"},
    {name:"Over the Rainbow", script:"latin", mood:"script"},
    {name:"Kristi", script:"latin", mood:"script"},
    {name:"Solitreo", script:"hebrew", mood:"script"},
    {name:"Amatic SC", script:"hebrew", mood:"pen", also:["cyrillic"]},
    {name:"Playpen Sans Hebrew", script:"hebrew", mood:"round"},
    {name:"Karantina", script:"hebrew", mood:"marker"},
    {name:"Varela Round", script:"hebrew", mood:"neat"},
    {name:"Fredoka", script:"hebrew", mood:"round"},
    {name:"Suez One", script:"hebrew", mood:"marker"},
    {name:"Secular One", script:"hebrew", mood:"marker"},
    {name:"Rubik", script:"hebrew", mood:"neat", also:["cyrillic"]},
    {name:"Gveret Levin", script:"hebrew", mood:"script"},
    {name:"Rubik Scribble", script:"hebrew", mood:"marker", also:["cyrillic"]},
    {name:"Alef", script:"hebrew", mood:"neat", rand:false},
    {name:"Miriam Libre", script:"hebrew", mood:"neat", rand:false},
    {name:"Frank Ruhl Libre", script:"hebrew", mood:"script", rand:false},
    {name:"Bellefair", script:"hebrew", mood:"script", rand:false},
    {name:"David Libre", script:"hebrew", mood:"neat", rand:false},
    {name:"Heebo", script:"hebrew", mood:"neat", pool:false},
    {name:"Marck Script", script:"cyrillic", mood:"script"},
    {name:"Bad Script", script:"cyrillic", mood:"pen"},
    {name:"Pangolin", script:"cyrillic", mood:"round"},
    {name:"Comforter", script:"cyrillic", mood:"script"},
    {name:"Underdog", script:"cyrillic", mood:"marker"},
    {name:"Ruslan Display", script:"cyrillic", mood:"marker"},
    {name:"Aref Ruqaa", script:"arabic", mood:"script"},
    {name:"Katibeh", script:"arabic", mood:"pen"},
    {name:"Marhey", script:"arabic", mood:"round"},
    {name:"Rakkas", script:"arabic", mood:"marker"},
    {name:"Lalezar", script:"arabic", mood:"marker"},
    {name:"Reem Kufi", script:"arabic", mood:"neat"},
    {name:"Mada", script:"arabic", mood:"neat"},
    {name:"Lateef", script:"arabic", mood:"script"},
    {name:"Harmattan", script:"arabic", mood:"neat"},
    {name:"Ma Shan Zheng", script:"zh", mood:"neat"},
    {name:"Zhi Mang Xing", script:"zh", mood:"script"},
    {name:"Long Cang", script:"zh", mood:"pen"},
    {name:"Liu Jian Mao Cao", script:"zh", mood:"marker"},
    {name:"Klee One", script:"ja", mood:"neat"},
    {name:"Yomogi", script:"ja", mood:"pen"},
    {name:"Hachi Maru Pop", script:"ja", mood:"round"},
    {name:"Zen Kurenaido", script:"ja", mood:"script"},
    {name:"Nanum Pen Script", script:"ko", mood:"pen"},
    {name:"Gaegu", script:"ko", mood:"round"},
    {name:"Gamja Flower", script:"ko", mood:"neat"},
    {name:"Hi Melody", script:"ko", mood:"script"},
    {name:"Poor Story", script:"ko", mood:"marker"}
  ];
  var FONT_BY_NAME = {};
  FONTS.forEach(function(f){ FONT_BY_NAME[f.name] = f; });
  // mood -> fallback font per script, used to build harmonious stacks
  var MOOD_FALLBACK = {
    pen:    {latin:"Caveat",           hebrew:"Amatic SC",           cyrillic:"Bad Script",  arabic:"Katibeh",    zh:"Long Cang",        ja:"Yomogi",         ko:"Nanum Pen Script"},
    round:  {latin:"Indie Flower",     hebrew:"Playpen Sans Hebrew", cyrillic:"Pangolin",    arabic:"Marhey",     zh:"Ma Shan Zheng",    ja:"Hachi Maru Pop", ko:"Gaegu"},
    neat:   {latin:"Patrick Hand",     hebrew:"Varela Round",        cyrillic:"Neucha",      arabic:"Mada",       zh:"Ma Shan Zheng",    ja:"Klee One",       ko:"Gamja Flower"},
    marker: {latin:"Permanent Marker", hebrew:"Karantina",           cyrillic:"Underdog",    arabic:"Lalezar",    zh:"Liu Jian Mao Cao", ja:"Hachi Maru Pop", ko:"Poor Story"},
    script: {latin:"Dancing Script",   hebrew:"Solitreo",            cyrillic:"Marck Script",arabic:"Aref Ruqaa", zh:"Zhi Mang Xing",    ja:"Zen Kurenaido",  ko:"Hi Melody"}
  };
  var SCRIPT_NAMES = {latin:"Latin", hebrew:"Hebrew", cyrillic:"Cyrillic", arabic:"Arabic", zh:"Chinese", ja:"Japanese", ko:"Korean"};
  var SCRIPT_ORDER = ["latin","hebrew","cyrillic","arabic","zh","ja","ko"];

  // Curated paper colours for the picker. Random new-note colours stay as they were.
  var PAPER_COLORS = [
    {name:"Classic yellow", bg:"hsl(52,96%,76%)"},
    {name:"Pink", bg:"hsl(344,82%,86%)"},
    {name:"Mint", bg:"hsl(146,50%,80%)"},
    {name:"Light blue", bg:"hsl(203,78%,85%)"},
    {name:"Peach", bg:"hsl(24,92%,83%)"},
    {name:"Lavender", bg:"hsl(262,62%,87%)"},
    {name:"Lime", bg:"hsl(78,60%,79%)"},
    {name:"Paper white", bg:"hsl(45,45%,95%)"}
  ];
  // pins (dark board): mostly classic red, a few restrained alternatives
  var PIN_COLORS = ["#cf3f36","#cf3f36","#cf3f36","#b8332c","#3f74c4","#d9a93a","#3f9467","#e8e4dc"];

  var ICONS = {
    soup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8z"></path><path d="M9 7c0-1.2 1-1.2 1-2.4M13 7c0-1.2 1-1.2 1-2.4"></path></svg>',
    receipt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-2-1.4L14 21l-2-1.4L10 21l-2-1.4L6 21z"></path><path d="M9 8h6M9 12h6M9 16h3"></path></svg>',
    ticket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a2 2 0 0 0 0 8v2h18v-2a2 2 0 0 1 0-8V6H3z"></path><path d="M14 6v12" stroke-dasharray="2 2"></path></svg>',
    postcard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="1.5"></rect><path d="M14 9h4M14 12h4M6 15l3-3 3 3"></path></svg>',
    strip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="1.5"></rect><path d="M9 6h6M9 11h6M9 16h6"></path></svg>',
    scissors: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.6"></circle><circle cx="6" cy="18" r="2.6"></circle><path d="M8.2 7.6 20 17M8.2 16.4 20 7"></path></svg>',
    ul: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="4" cy="6" r="1.3" fill="currentColor" stroke="none"></circle><line x1="9" y1="6" x2="20" y2="6"></line><circle cx="4" cy="12" r="1.3" fill="currentColor" stroke="none"></circle><line x1="9" y1="12" x2="20" y2="12"></line><circle cx="4" cy="18" r="1.3" fill="currentColor" stroke="none"></circle><line x1="9" y1="18" x2="20" y2="18"></line></svg>',
    task: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"></path></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"></rect><line x1="16" y1="3" x2="16" y2="7"></line><line x1="8" y1="3" x2="8" y2="7"></line><line x1="3" y1="10" x2="21" y2="10"></line><line x1="12" y1="14" x2="12" y2="18"></line><line x1="10" y1="16" x2="14" y2="16"></line></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 9 18 20 6"></polyline></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.6" y1="10.6" x2="15.4" y2="6.4"></line><line x1="8.6" y1="13.4" x2="15.4" y2="17.6"></line></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"></line><line x1="19" y1="5" x2="5" y2="19"></line></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="8.5" cy="9.5" r="1.5"></circle><path d="M21 16l-5.5-5.5L5 21"></path></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="5" cy="12" r="2.2"></circle><circle cx="12" cy="12" r="2.2"></circle><circle cx="19" cy="12" r="2.2"></circle></svg>',
    highlighter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11 6 20l-3 1 1-3 9-9"></path><path d="M9 11l4 4"></path><path d="M13 3l8 8-4 4-8-8z"></path></svg>',
    wheel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"></circle></svg>',
    bold: '<span class="fB">B</span>',
    italic: '<span class="fI">I</span>',
    underline: '<span class="fU">U</span>',
    titleLine: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16"></path><rect x="4" y="12" width="4" height="4" rx="1"></rect><path d="M11 14h9"></path><rect x="4" y="18" width="4" height="3" rx="1" opacity="0.4"></rect></svg>',
    ol: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="10" y1="6" x2="20" y2="6"></line><line x1="10" y1="12" x2="20" y2="12"></line><line x1="10" y1="18" x2="20" y2="18"></line><path d="M4 4.5h1.5V9M3.6 9h3" stroke-width="1.6"></path><path d="M3.6 14.2c.4-.6 1-.9 1.6-.8.7.1 1.1.7.9 1.3-.3.8-1.6 1.6-2.5 2.6h2.8" stroke-width="1.6"></path></svg>',
    checklist: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 4.6c1.9-.2 3.9-.3 5.9-.1.1 1.9.2 3.8 0 5.8-2 .2-3.9.2-5.9 0-.2-1.9-.2-3.8 0-5.7z" stroke-width="1.6"></path><path d="M4.8 7.2l1.3 1.4 2.9-3.4"></path><path d="M3.5 14.6c1.9-.2 3.9-.3 5.9-.1.1 1.9.2 3.8 0 5.8-2 .2-3.9.2-5.9 0-.2-1.9-.2-3.8 0-5.7z" stroke-width="1.6"></path><line x1="13" y1="7.5" x2="21" y2="7.5"></line><line x1="13" y1="17.5" x2="21" y2="17.5"></line></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"></path><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"></path></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="13" height="13" rx="2"></rect><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"></path></svg>',
    move: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="13" height="16" rx="2"></rect><path d="M12 12h9M18 9l3 3-3 3"></path></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"></path></svg>',
    shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"></path></svg>',
    cycle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7"></path><path d="M20 4v7h-7"></path></svg>',
    chevR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"></path></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"></path></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"></path><path d="M10 20a2 2 0 0 0 4 0"></path></svg>',
    tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12.5 9.5 18 20 6.5"></polyline></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0M12 18v3"></path></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"></path><circle cx="12" cy="13.5" r="3.5"></circle></svg>',
    film: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"></path></svg>',
    sticky: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v10l-6 6H4z"></path><path d="M14 20v-6h6"></path></svg>',
    doneTick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.6 12.9c1.5 1.1 3 2.9 4.3 5 2.8-5.7 6.3-9.3 10.6-12.1"></path></svg>',
    fit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="1.5"></rect><path d="M8 14l4-4 4 4"></path></svg>',
    rip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v7H4z"></path><path d="M4 15l2.5 1.5L9 14.5l2.5 2L14 14.5l2.5 2L19 14.5l1 1"></path></svg>',
    zone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" stroke-dasharray="3 2.5"></rect><path d="M3 9h18"></path></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6l-1 6 3 3H7l3-3z"></path><path d="M12 12v8"></path></svg>',
    expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"></path></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1"></rect><rect x="13.5" y="5" width="4" height="14" rx="1"></rect></svg>',
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>'
  };

  var MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var DOW_NAMES = ["S","M","T","W","T","F","S"];

  function pad2(x){ return String(x).padStart(2,"0"); }
  function isoToday(){ var d = new Date(); return d.getFullYear() + "-" + pad2(d.getMonth()+1) + "-" + pad2(d.getDate()); }
  function formatDueLabel(iso){
    if(!iso) return "Set date";
    var parts = iso.split("-");
    var y = +parts[0], m = +parts[1], d = +parts[2];
    return MONTH_NAMES[m-1].slice(0,3) + " " + d;
  }

  // Create your own at https://console.cloud.google.com/apis/credentials
  // (OAuth client ID -> Web application -> add this site's URL under
  // "Authorized JavaScript origins"). Sign-in shows a friendly notice
  // until this is filled in.
  var GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

  // Signed-in users get their own key namespace, so a guest board and an account's cached boards never mix.
  // Guests keep the original keys untouched. (Stick.mode is decided synchronously from the stored session.)
  var CLOUD = !!(window.Stick && window.Stick.mode && window.Stick.mode.cloud);
  var NS = CLOUD ? window.Stick.mode.ns : "";
  var CLOUD_OK = !!(window.Stick && window.Stick.cloud && window.Stick.cloud.configured);   // a backend is configured
  var cloudSync = null;              // set once the cloud layer starts
  var BOARDS_KEY = "stickyboard." + NS + "boards.v1";
  var ACTIVE_BOARD_KEY = "stickyboard." + NS + "activeBoard.v1";
  var LEGACY_NOTES_KEY = "stickyboard.notes.v2";
  var SETTINGS_KEY = "stickyboard.settings.v1";
  var NOTE_W = 250, NOTE_H = 196;

  var board = document.getElementById("board");
  var boardInner = document.getElementById("boardInner");
  var hint = document.getElementById("hint");
  var toastEl = document.getElementById("toast");
  var gearBtn = document.getElementById("gearBtn");
  var panel = document.getElementById("settingsModal");
  var brandBtn = document.getElementById("brandBtn");
  var boardNameLabel = document.getElementById("boardNameLabel");
  var boardPanel = document.getElementById("boardPanel");
  var accountBtn = document.getElementById("accountBtn");
  var boardList = document.getElementById("boardList");
  var newBoardName = document.getElementById("newBoardName");
  var addBoardBtn = document.getElementById("addBoardBtn");
  var lockToggle = document.getElementById("lockToggle");
  var darkToggle = document.getElementById("darkToggle");
  var fontSelect = document.getElementById("fontSelect");
  var displayNameInput = document.getElementById("displayNameInput");
  var clearBtn = document.getElementById("clearBtn");
  var countEl = document.getElementById("count");
  var exportBtn = document.getElementById("exportBtn");
  var importBtn = document.getElementById("importBtn");
  var cleanupToggle = document.getElementById("cleanupToggle");
  var selBar = document.getElementById("selBar");
  var helpBtn = document.getElementById("helpBtn");
  var kbdBtn = document.getElementById("kbdBtn");
  var searchInput = document.getElementById("searchInput");
  var shareBtn = document.getElementById("shareBtn");
  var sharePanel = document.getElementById("sharePanel");
  var shareResult = document.getElementById("shareResult");
  var snapshotBtn = document.getElementById("snapshotBtn");
  var publishBtn = document.getElementById("publishBtn");
  var shareBanner = document.getElementById("shareBanner");
  var shareBannerText = document.getElementById("shareBannerText");
  var copyToMineBtn = document.getElementById("copyToMineBtn");
  var minimap = document.getElementById("minimap");
  var minimapTrack = document.getElementById("minimapTrack");
  var imageUploadInput = document.getElementById("imageUploadInput");
  var pendingImageNote = null;

  function safeGet(key){
    try{ var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
    catch(e){ return null; }
  }
  function safeSet(key, val){
    try{ localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch(e){ return false; /* storage unavailable or full; board still works this session */ }
  }

  function downloadBlob(filename, blob){
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
  }

  function encodeState(obj){
    try{ return btoa(encodeURIComponent(JSON.stringify(obj))); }
    catch(e){ return null; }
  }
  function decodeState(str){
    try{ return JSON.parse(decodeURIComponent(atob(str))); }
    catch(e){ return null; }
  }

  // ---------- legal pages (kept out of the board UI: sign-in, Settings, Account settings and public views only) ----------
  var LEGAL_LINKS = [["Privacy", "legal/privacy.html"], ["Terms", "legal/terms.html"], ["Young people & parents", "legal/young-people.html"], ["Storage", "legal/storage.html"], ["Accessibility", "legal/accessibility.html"], ["Copyright / DMCA", "legal/copyright.html"], ["עברית", "legal/he/privacy.html"]];
  // One compact "Legal" entry instead of a row of seven links across the bottom of the canvas. It opens the in-app reader; the href stays a real
  // standalone page so it also works without scripts and for anyone who opens it in a new tab.
  function legalLinksEl(cls){
    var d = document.createElement("div");
    d.className = cls || "legalLinks";
    var a = document.createElement("a"); a.className = "legalChip"; a.href = "legal/privacy.html"; a.textContent = "Legal"; a.title = "Privacy, Terms and other legal documents";
    a.addEventListener("click", function(e){ if(window.Stick && Stick.legalReader && Stick.legalContent){ e.preventDefault(); Stick.legalReader.open("privacy"); } });
    d.appendChild(a);
    return d;
  }
  // The sign-in dialog carries one short line with two links. What is collected and why is in the Privacy Policy (sections 3-7).
  var LEGAL_ACK_HTML = 'By continuing, you agree to the <a href="legal/terms.html" target="_blank" rel="noopener">Terms</a> and acknowledge the <a href="legal/privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.';

  // ---------- age screen ----------
  // "How old are you?" comes BEFORE any sign-in provider is shown. The birth month and year are used once, in this browser,
  // to pick a band (adult 18+, teen 13-17, child under 13) and are then discarded: they are never stored or sent. What is
  // remembered: the band for one hour on this device (so the provider round-trip can finish) and, on the account, the band,
  // a timestamp and the policy versions. Under 13 is NOT refused: a child can use Stick-It as a guest (everything stays on
  // the device); cloud features wait for a parent or guardian (the server enforces this). This is one control, not legal
  // compliance on its own (docs/legal/children-and-parental-consent.md).
  var AGE_OK_KEY = "stickit.age.ok", AGE_ADULT_YEARS = 18, AGE_TEEN_YEARS = 13;
  // strictly more than N years after the end of the birth month, so nobody is placed in a band a few days early
  function ageBandFor(year, month){
    var n = new Date(), months = (n.getFullYear() * 12 + n.getMonth() + 1) - (year * 12 + month);
    if(months > AGE_ADULT_YEARS * 12) return "adult";
    if(months > AGE_TEEN_YEARS * 12) return "teen";
    return "child";
  }
  function ageFlag(){                       // the band chosen in the last hour on this device (adult/teen only), else null
    var f = safeGet(AGE_OK_KEY);
    return (f && typeof f === "object" && (f.band === "adult" || f.band === "teen") && Date.now() - f.t < 3600 * 1000) ? f.band : null;
  }
  // Long-lived hint (90 days, band only) that a signed-in account on this browser already has its band, so returning people are not
  // asked again before sign-in. It never lets anyone skip the SERVER check: a new account without a band is still asked after sign-in.
  var AGE_KNOWN_KEY = "stickit.age.known";
  function ageKnown(){
    var f = safeGet(AGE_KNOWN_KEY);
    return (f && typeof f === "object" && (f.band === "adult" || f.band === "teen") && Date.now() - f.t < 90 * 86400000) ? f.band : null;
  }
  function ageKnownSet(band){ if(band === "adult" || band === "teen") safeSet(AGE_KNOWN_KEY, {band: band, t: Date.now()}); }
  function ageRemember(band){
    if(band === "adult" || band === "teen") safeSet(AGE_OK_KEY, {band: band, t: Date.now()});
    else { try{ localStorage.removeItem(AGE_OK_KEY); }catch(e){} }
  }
  // the form itself: opts = {onBand(band), extra: [{label, fn}]}
  function buildAgeForm(opts){
    var form = document.createElement("form");
    form.noValidate = true;
    var lead = document.createElement("p"); lead.className = "acctSub"; lead.style.cssText = "margin:0;text-align:left;";
    lead.textContent = "Enter your birth month and year so we can set up the right account options. Your birth date isn\u2019t stored.";
    form.appendChild(lead);
    var row = makeDiv("ageRow");
    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    var mLab = document.createElement("label"); mLab.textContent = "Month";
    var mSel = document.createElement("select"); mSel.id = "ageMonth";
    var mo = document.createElement("option"); mo.value = ""; mo.textContent = "Month"; mSel.appendChild(mo);
    months.forEach(function(n, i){ var o = document.createElement("option"); o.value = String(i + 1); o.textContent = n; mSel.appendChild(o); });
    mLab.appendChild(mSel);
    var yLab = document.createElement("label"); yLab.textContent = "Year";
    var ySel = document.createElement("select"); ySel.id = "ageYear";
    var yo = document.createElement("option"); yo.value = ""; yo.textContent = "Year"; ySel.appendChild(yo);
    var thisYear = new Date().getFullYear();
    for(var y = thisYear; y >= thisYear - 110; y--){ var o2 = document.createElement("option"); o2.value = String(y); o2.textContent = String(y); ySel.appendChild(o2); }
    yLab.appendChild(ySel);
    row.appendChild(mLab); row.appendChild(yLab);
    form.appendChild(row);
    var err = document.createElement("p"); err.className = "asErr"; err.setAttribute("role", "alert"); err.style.minHeight = "1em";
    form.appendChild(err);
    var acts = makeDiv("modalActions"); acts.style.marginTop = "6px";
    (opts.extra || []).forEach(function(x){
      var b = document.createElement("button"); b.type = "button"; b.className = "pillBtn"; b.textContent = x.label; b.addEventListener("click", x.fn); acts.appendChild(b);
    });
    var go = document.createElement("button"); go.type = "submit"; go.className = "pillBtn primary"; go.id = "ageGo"; go.textContent = "Continue";
    acts.appendChild(go);
    form.appendChild(acts);
    form.addEventListener("submit", function(e){
      e.preventDefault();
      var yr = parseInt(ySel.value, 10), mn = parseInt(mSel.value, 10);
      if(!yr || !mn){ err.textContent = "Please choose a month and a year."; return; }
      if(yr * 12 + mn > new Date().getFullYear() * 12 + new Date().getMonth() + 1){ err.textContent = "That date is in the future."; return; }
      var band = ageBandFor(yr, mn);       // the numbers stop mattering here: only the band leaves this function
      ySel.value = ""; mSel.value = "";
      opts.onBand(band);
    });
    return form;
  }
  // under 13: not a refusal, a different path
  function renderChildStep(card, back){
    card.className = "acctCard";
    card.innerHTML = '<button class="acctClose" id="acctCloseBtn" aria-label="Close">' + ICONS.close + '</button>' +
      '<h3>One more step</h3>' +
      '<p class="acctSub" style="text-align:left;">A parent or guardian needs to approve this account before cloud features can be used.</p>' +
      '<p class="acctSub" style="text-align:left;">Parent approval isn\u2019t open yet, so for now you can use Stick-It as a guest: your boards stay on this device and nothing is sent to us.</p>' +
      '<div class="modalActions" style="margin-top:8px;"><button type="button" class="pillBtn" id="askParentBtn">Ask a parent or guardian</button><button type="button" class="pillBtn primary" id="childGuestBtn">Continue as guest</button></div>';
    card.querySelector("#acctCloseBtn").addEventListener("click", closeAccountModal);
    card.querySelector("#askParentBtn").addEventListener("click", openParentNotice);
    card.querySelector("#childGuestBtn").addEventListener("click", function(){
      settings.guestConfirmed = true; saveSettings(); closeAccountModal(); toast("You\u2019re using Stick-It as a guest.");
    });
  }
  function openParentNotice(){
    var c = document.createElement("div"); c.className = "acctSub"; c.style.textAlign = "left";
    c.innerHTML = '<p style="margin:0 0 8px;">Someone in your care would like to use Stick-It\u2019s cloud features (saving boards to an account and syncing them between devices). Because they are under 13, a parent or guardian has to approve first.</p>' +
      '<p style="margin:0 0 8px;"><b>Approval is not open yet.</b> We haven\u2019t launched a way to verify it, and we won\u2019t accept a tick-box or an e-mail from the child as approval. Until then they can use Stick-It as a guest, with everything staying on their device.</p>' +
      '<p style="margin:0;"><a href="legal/young-people.html" target="_blank" rel="noopener">What we collect, and what parents can expect</a></p>';
    openModal({title: "For a parent or guardian", content: c, width: 400, actions: [{label: "OK", kind: "primary", value: true}]});
  }
  // the screen as a dialog: for an account that reached the app without a recorded band
  function openAgeGateModal(opts){
    var done = false;
    var m = openModal({title: "How old are you?", content: document.createElement("div"), width: 380, actions: [{label: "Sign out", value: "signout"}],
      onClose: function(v){ if(!done && opts.onSignOut) opts.onSignOut(); }});
    var holder = m.card.querySelector("div:not(.modalActions)");
    var content = m.card.children[2]; content.innerHTML = "";
    content.appendChild(buildAgeForm({onBand: function(band){ done = true; m.close(true); opts.onBand(band); }}));
    return m;
  }
  function ageOkNotice(msg){ toast(msg); }
  // After a provider brings someone back, or when a cached account is opened. Returns true when the app may carry on.
  //  - no band recorded: use the one just chosen on this device (<1 h), otherwise ask now, before anything else loads
  //  - child without parent approval: nothing is deleted; the account stays but cloud use stops, and the person is signed out here
  async function ensureAgeAttested(profile){
    if(profile && !("age_band" in profile)) return true;            // a project without the age-band migration: nothing to check yet
    async function childStop(){
      cloudSigningOut = true;
      var uid = Stick.mode.uid;
      try{ await Stick.auth.signOut("local"); }catch(e){}
      if(uid) wipeCloudCache(uid);
      try{ await Stick.assets.cacheClear(); }catch(e){}
      settings.account = null; settings.accountPrefs = null; saveSettings();
      hideCloudOverlay();
      var m = document.createElement("div"); m.className = "acctSub"; m.style.textAlign = "left";
      m.textContent = "A parent or guardian needs to approve this account before cloud features can be used. You\u2019ve been signed out on this device, and you can keep using Stick-It as a guest.";
      openModal({title: "One more step", content: m, width: 380,
        actions: [{label: "Ask a parent or guardian", value: "ask", onClick: function(close){ close(false); openParentNotice(); return false; }}, {label: "Continue as guest", kind: "primary", value: true}],
        onClose: function(){ location.hash = ""; location.reload(); }});
      return false;
    }
    async function record(band){
      try{ await Stick.account.setAgeBand(band); }
      catch(e){
        if(/set_age_band|PGRST202|could not find the function/i.test(Stick.errors.parse(e).message)) return true;
        throw e;
      }
      ageRemember(null);                                        // the one-hour hand-over flag has done its job
      ageKnownSet(band);
      if(band === "child") return childStop();
      return true;
    }
    if(profile && profile.age_band){
      if(profile.age_band === "child" && profile.parental_consent_status !== "approved") return childStop();
      return true;
    }
    var flag = ageFlag();
    if(flag) return record(flag);
    hideCloudOverlay();
    return new Promise(function(resolve){
      openAgeGateModal({
        onBand: function(band){ ageRemember(band); record(band).then(resolve, function(){ resolve(false); }); },
        onSignOut: function(){ cloudSignOut("local"); resolve(false); }});
    });
  }

  function getAnonName(){
    var anon = safeGet("stickyboard.anonId");
    if(!anon){
      anon = "Anon-" + Math.floor(1000 + Math.random()*9000);
      safeSet("stickyboard.anonId", anon);
    }
    return anon;
  }
  function getDisplayName(){
    if(settings.account && settings.account.name) return settings.account.name;
    if(settings.displayName) return settings.displayName;
    return getAnonName();
  }
  // paper colour for a brand-new note: the account's favourite if set, otherwise a surprise as before
  function newNoteBg(){
    var want = CLOUD && settings.accountPrefs && settings.accountPrefs.defaultNoteColor;
    if(want){
      for(var i = 0; i < PAPER_COLORS.length; i++) if(PAPER_COLORS[i].name === want) return PAPER_COLORS[i].bg;
    }
    return randomColor();
  }
  // How this person appears on a link they create: the account's sharing defaults (guests: as before).
  function shareIdentity(){
    var pr = CLOUD && settings.account && settings.accountPrefs;
    if(!pr) return {name:getDisplayName(), avatar:false, bio:false};
    var named = pr.shareDefaultIdentity !== "anonymous";
    return {name: named ? getDisplayName() : getAnonName(), avatar: named && !!pr.shareShowAvatar, bio: named && !!pr.shareShowBio};
  }

  // ---------- the bottom-centre pills push each other up instead of overlapping ----------
  // The selection bar, the "saving" slip, the toast and the hint all float at the bottom centre. They are laid out as one stack from the minimap
  // upwards, in that order, so every one of them stays readable and clickable, whatever combination is showing.
  var floaterRaf = 0;
  function stackFloaters(){
    floaterRaf = 0;
    var mm = document.getElementById("minimap"), base = 14;
    if(mm && getComputedStyle(mm).display !== "none"){ var r = mm.getBoundingClientRect(); if(r.height) base = Math.max(14, Math.round(window.innerHeight - r.top) + 8); }
    var cur = base;
    [document.getElementById("selBar"), document.querySelector(".footSlip"), toastEl, hint].forEach(function(el){
      if(!el) return;
      var on = el === toastEl ? el.classList.contains("show") : el === hint ? !el.classList.contains("hidden") : !el.hidden;
      if(!on || !el.offsetHeight && el !== toastEl) { return; }
      el.style.bottom = "calc(" + cur + "px + env(safe-area-inset-bottom, 0px))";
      cur += (el.offsetHeight || 36) + 8;
    });
  }
  function scheduleStackFloaters(){ if(!floaterRaf) floaterRaf = setTimeout(stackFloaters, 0); }          // (a timer, not rAF: it must also run in a hidden tab)
  (function(){
    if(!window.MutationObserver) return;
    var mo = new MutationObserver(scheduleStackFloaters);
    [document.getElementById("selBar"), toastEl, hint].forEach(function(el){ if(el) mo.observe(el, {attributes: true, childList: true, attributeFilter: ["class", "hidden"]}); });
    window.addEventListener("resize", scheduleStackFloaters);
    window.__floaterObserver = mo;
  })();
  var toastTimer;
  function toast(msg, actionLabel, actionFn){
    toastEl.innerHTML = "";
    var span = document.createElement("span");
    span.textContent = msg;
    toastEl.appendChild(span);
    if(actionLabel && actionFn){
      var abtn = document.createElement("button");
      abtn.className = "toastAction";
      abtn.textContent = actionLabel;
      abtn.addEventListener("click", function(){ actionFn(); toastEl.classList.remove("show"); });
      toastEl.appendChild(abtn);
    }
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove("show"); }, actionLabel ? 6000 : 3800);
  }

  function escapeHtml(s){
    return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }
  function escapeAttr(s){ return escapeHtml(s).replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
  var IS_MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || "");
  var MOD = IS_MAC ? "\u2318" : "Ctrl";

  function rand(min, max){ return Math.random()*(max-min)+min; }

  function randomColor(){
    var hue = Math.floor(rand(0,360));
    var sat = Math.floor(rand(55,72));
    var light = Math.floor(rand(78,87));
    return "hsl(" + hue + "," + sat + "%," + light + "%)";
  }

  function mirrorTheme(){ try{ if(window.StickA11y && settings) StickA11y.set({theme: settings.theme === "dark" ? "dark" : "light"}); }catch(e){} }
  var settings = safeGet(SETTINGS_KEY) || { lockFont:false, fontName:FONTS[0].name, displayName:"", account:null, guestConfirmed:false, theme:"light" };
  if(settings.displayName === undefined) settings.displayName = "";
  if(settings.account === undefined) settings.account = null;
  if(window.StickA11y){ var a11y = StickA11y.get(); settings.reduceMotion = a11y.motion === "reduce"; settings.highContrast = !!a11y.contrast; }
  if(settings.soundOn === undefined) settings.soundOn = true;
  if(settings.soundVolume === undefined) settings.soundVolume = 60;
  if(settings.guestConfirmed === undefined) settings.guestConfirmed = false;
  if(settings.theme === undefined) settings.theme = "light";
  if(settings.cleanupEmpty === undefined) settings.cleanupEmpty = true;
  // With a real backend, the old browser-only "signed in" display state means nothing: only a real session counts.
  if(CLOUD_OK && !CLOUD && settings.account) settings.account = null;
  document.body.classList.toggle("dark", settings.theme === "dark"); mirrorTheme();

  // ---------- fonts: script-aware picking and harmonious fallback stacks ----------
  function fontInfo(name){ return FONT_BY_NAME[name] || FONT_BY_NAME[FONTS[0].name]; }
  function fontStack(name){
    var f = fontInfo(name);
    var fb = MOOD_FALLBACK[f.mood] || MOOD_FALLBACK.pen;
    var names = [f.name];
    SCRIPT_ORDER.forEach(function(sc){
      if(sc === f.script) return;
      var alt = fb[sc];
      if(alt && names.indexOf(alt) === -1) names.push(alt);
    });
    return names.map(function(x){ return "'" + x + "'"; }).join(", ") + ", cursive";
  }
  // CAPTION-SAFE fonts: small labels and captions never use a loose or ornamental hand (Reenie Beanie, Rock Salt, Kristi ... are lovely
  // at note size and unreadable at 13 px). Each script has a short list of clear, handwriting-flavoured or print-like faces; the first
  // is the default. Note fonts are untouched: only tiny physical labels use this set.
  var CAPTION_SAFE = {
    latin:    ["Patrick Hand", "Handlee", "Architects Daughter", "Kalam", "Delicious Handrawn", "Indie Flower"],
    hebrew:   ["Varela Round", "Alef", "Heebo", "Rubik", "Miriam Libre", "Playpen Sans Hebrew"],
    cyrillic: ["Neucha", "Pangolin", "Rubik", "Caveat"],
    arabic:   ["Mada", "Harmattan", "Reem Kufi"],
    zh: ["Ma Shan Zheng"], ja: ["Klee One"], ko: ["Gamja Flower"]
  };
  function captionList(text){ return CAPTION_SAFE[detectScript(String(text || ""))] || CAPTION_SAFE.latin; }
  // the face to use for a caption: the person's pick if it can draw this text, else the script's default (never the note's own font)
  function captionFontFor(pref, text){ var list = captionList(text); return pref && list.indexOf(pref) !== -1 ? pref : list[0]; }
  function captionStack(pref, text){
    var first = captionFontFor(pref, text), names = [first];
    SCRIPT_ORDER.forEach(function(sc){ var d = CAPTION_SAFE[sc][0]; if(names.indexOf(d) === -1) names.push(d); });
    return names.map(function(x){ return "'" + x + "'"; }).join(", ") + ", sans-serif";
  }
  function nextCaptionFont(item){
    var list = captionList(item.caption || ""), cur = captionFontFor(item.captionFont, item.caption || "");
    return list[(list.indexOf(cur) + 1) % list.length];
  }
  // fonts that can draw a script: its own, plus ones from other lists that also ship its letters (e.g. Caveat has Cyrillic)
  function fontPool(script){
    script = script || "latin";
    return FONTS.filter(function(f){ return f.pool !== false && (f.script === script || (f.also || []).indexOf(script) !== -1); });
  }
  // the fonts filed under a script (for pickers, so a font is listed once)
  function fontsOfScript(script){ return FONTS.filter(function(f){ return f.pool !== false && f.script === script; }); }
  // Latin is covered by every font (Hebrew, Cyrillic, Arabic and CJK fonts ship Latin glyphs too).
  function fontCovers(name, script){ var f = fontInfo(name); return script === "latin" || f.script === script || (f.also || []).indexOf(script) !== -1; }
  function detectScript(text){
    var c = {hebrew:0, cyrillic:0, arabic:0, zh:0, ja:0, ko:0};
    for(var i=0; i<text.length; i++){
      var code = text.charCodeAt(i);
      if(code >= 0x0590 && code <= 0x05FF) c.hebrew++;
      else if(code >= 0x0400 && code <= 0x052F) c.cyrillic++;
      else if((code >= 0x0600 && code <= 0x06FF) || (code >= 0x0750 && code <= 0x077F) || (code >= 0xFB50 && code <= 0xFDFF) || (code >= 0xFE70 && code <= 0xFEFF)) c.arabic++;
      else if(code >= 0x3040 && code <= 0x30FF) c.ja++;
      else if((code >= 0xAC00 && code <= 0xD7AF) || (code >= 0x1100 && code <= 0x11FF) || (code >= 0x3130 && code <= 0x318F)) c.ko++;
      else if((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF)) c.zh++;
    }
    if(c.ja > 0 && c.ja + c.zh >= 2) return "ja"; // any kana means Japanese, kanji included
    var best = "latin", bestN = 1;
    ["hebrew","cyrillic","arabic","zh","ko"].forEach(function(k){ if(c[k] > bestN){ best = k; bestN = c[k]; } });
    return best;
  }
  function preferredScript(){
    var lang = ((navigator.languages && navigator.languages[0]) || navigator.language || "").toLowerCase();
    if(/^(he|iw)/.test(lang)) return "hebrew";
    if(/^zh/.test(lang)) return "zh";
    if(/^ja/.test(lang)) return "ja";
    if(/^ko/.test(lang)) return "ko";
    if(/^(ru|uk|bg|sr|be|kk|mk|mn)/.test(lang)) return "cyrillic";
    if(/^(ar|fa|ur|ps|ckb)/.test(lang)) return "arabic";
    return "latin";
  }
  function pickFont(script, mood){
    script = script || preferredScript();
    if(settings.lockFont && FONT_BY_NAME[settings.fontName] && fontCovers(settings.fontName, script)) return settings.fontName;
    var pf = CLOUD && settings.accountPrefs && settings.accountPrefs.preferredFont;      // a preference, never an override: text it can't draw falls back
    if(pf && FONT_BY_NAME[pf] && fontCovers(pf, script)) return pf;
    var pool = fontPool(script);
    var handy = pool.filter(function(f){ return f.rand !== false; });     // print-style fonts are pick-only: never a random handwriting
    if(handy.length) pool = handy;
    if(mood){
      var same = pool.filter(function(f){ return f.mood === mood; });
      if(same.length) pool = same;
    }
    return pool[Math.floor(rand(0, pool.length))].name;
  }

  // ---------- paper physics: small persisted variations per note ----------
  function hashStr(str){
    var h = 2166136261;
    for(var i=0; i<str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function seededRng(seed){
    var a = seed >>> 0;
    return function(){
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makePhys(rng){
    rng = rng || Math.random;
    function r(a, b){ return a + rng()*(b-a); }
    var wrinkle = rng();
    return {
      tape: Math.floor(rng()*6),
      tr: +r(-4, 4).toFixed(1), tx: Math.round(r(-12, 12)), tw: Math.round(r(48, 66)), to: +r(0.45, 0.62).toFixed(2),
      pin: rng() < 0.6, pc: Math.floor(rng()*PIN_COLORS.length),
      wr: wrinkle < 0.45 ? 0 : 1 + Math.floor(rng()*3),
      wa: Math.round(r(100, 160)), wp: Math.round(r(30, 72)), wt: +r(-4, 4).toFixed(1), wx: Math.round(r(15, 85)),
      hole: rng() < 0.12 ? {x: Math.round(r(12, 34)), r: rng() < 0.5} : null
    };
  }
  function clampNum(v, lo, hi, dflt){
    v = Number(v);
    if(!isFinite(v)) return dflt;
    return Math.min(hi, Math.max(lo, v));
  }
  function sanitizePhys(p){
    if(!p || typeof p !== "object") return null;
    return {
      tape: Math.round(clampNum(p.tape, 0, 5, 0)),
      tr: clampNum(p.tr, -6, 6, -2), tx: clampNum(p.tx, -20, 20, 0), tw: clampNum(p.tw, 40, 80, 56), to: clampNum(p.to, 0.3, 0.8, 0.55),
      pin: !!p.pin, pc: Math.round(clampNum(p.pc, 0, PIN_COLORS.length - 1, 0)),
      wr: Math.round(clampNum(p.wr, 0, 3, 0)), wa: clampNum(p.wa, 0, 360, 120), wp: clampNum(p.wp, 0, 100, 50),
      wt: clampNum(p.wt, -10, 10, 0), wx: clampNum(p.wx, 0, 100, 50),
      hole: p.hole && typeof p.hole === "object" ? {x: clampNum(p.hole.x, 8, 40, 18), r: !!p.hole.r} : null
    };
  }
  // photos: a seed for the scissor edge, where the card backing sits, the label's tilt
  function makePhotoPhys(rng){
    rng = rng || Math.random;
    function r(a, b){ return a + rng()*(b-a); }
    return {cut: Math.floor(rng()*1e6), bx: Math.round(r(-6, 6)), by: Math.round(r(2, 7)), br: +r(-3, 3).toFixed(1), lr: +r(-4, 3).toFixed(1)};
  }
  function sanitizePhotoPhys(p){
    if(!p || typeof p !== "object") return null;
    return {cut: Math.round(clampNum(p.cut, 0, 1e6, 1)), bx: clampNum(p.bx, -12, 12, 3), by: clampNum(p.by, -12, 12, 4), br: clampNum(p.br, -8, 8, 1), lr: clampNum(p.lr, -8, 8, -2)};
  }
  // Notes from before this existed get stable values derived from their id.
  function ensurePhys(n){
    if(isAV(n) || isPaper(n)){ if(!n.phys || typeof n.phys !== "object") n.phys = {}; return n.phys; }
    if(isPhoto(n)){
      if(!n.phys || typeof n.phys !== "object" || n.phys.cut == null) n.phys = makePhotoPhys(seededRng(hashStr(String(n.id || n.image.length))));
      return n.phys;
    }
    if(!n.phys || typeof n.phys !== "object") n.phys = makePhys(seededRng(hashStr(String(n.id || (n.bg + ":" + n.rot)))));
    return n.phys;
  }
  function parseHsl(c){
    var m = /hsl\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%/i.exec(c || "");
    return m ? {h:+m[1], s:+m[2], l:+m[3]} : null;
  }
  var LOOK_CLASSES = ["tape-1","tape-2","tape-3","tape-4","tape-5","att-pin","wr-1","wr-2","wr-3","has-hole","hole-r","on-yellow"];
  function applyNoteLook(el, n){
    var p = ensurePhys(n);
    var st = el.style;
    st.setProperty("--note-bg", n.bg);
    st.setProperty("--rot", n.rot + "deg");
    st.setProperty("--tape-rot", p.tr + "deg");
    st.setProperty("--tape-x", p.tx + "px");
    st.setProperty("--tape-w", p.tw + "px");
    st.setProperty("--tape-op", p.to);
    st.setProperty("--wr-a", p.wa + "deg");
    st.setProperty("--wr-p", p.wp + "%");
    st.setProperty("--wr-t", p.wt + "deg");
    st.setProperty("--wr-x", p.wx + "%");
    st.setProperty("--pin", PIN_COLORS[p.pc] || PIN_COLORS[0]);
    LOOK_CLASSES.forEach(function(c){ el.classList.remove(c); });
    if(p.tape) el.classList.add("tape-" + p.tape);
    if(p.pin) el.classList.add("att-pin");
    if(p.wr) el.classList.add("wr-" + p.wr);
    if(p.hole){
      el.classList.add("has-hole");
      st.setProperty("--hole-x", p.hole.x + "px");
      if(p.hole.r || n.isTask) el.classList.add("hole-r"); // the task badge lives top-left
    }
    var hsl = parseHsl(n.bg);
    if(hsl && hsl.h >= 38 && hsl.h <= 75 && hsl.s >= 35) el.classList.add("on-yellow");
    st.minHeight = n.h > 0 && !n.cosmetic ? n.h + "px" : "";
    var oldShadow = el.querySelector(":scope > .ripShadow"); if(oldShadow) oldShadow.remove();
    if(RIP_STYLES.indexOf(n.rip) !== -1 && !n.cosmetic){
      el.classList.add("ripped"); st.setProperty("--rip-clip", ripPolygon(n));
      var rs = document.createElement("div"); rs.className = "ripShadow"; rs.setAttribute("aria-hidden", "true");
      var rf = document.createElement("div"); rf.className = "ripFill"; rs.appendChild(rf); el.insertBefore(rs, el.firstChild);
    } else { el.classList.remove("ripped"); st.removeProperty("--rip-clip"); }
  }

  // ---------- trimming the paper: Fit paper to content, Rip off empty paper, and a quiet corner handle to resize ----------
  // A note keeps its own height only when someone asks (n.h is a minimum, never a fixed box, so nothing can ever be clipped). n.rip
  // remembers that the empty paper was torn away and how the new edge looks. The text is never scaled.
  var PAPER_MIN_H = 96, PAPER_MIN_W = 168, PAPER_MAX_W = 520, RIP_STYLES = ["torn", "cut", "notebook"];
  function ripStyleFor(n){ var r = seededRng(hashStr(String(n.id) + "ripstyle"))(); return r < 0.6 ? "torn" : r < 0.8 ? "cut" : "notebook"; }
  // the clip shape of a ripped scrap: a ragged bottom edge, a slanted cut, or a notebook edge torn off its binding
  function ripPolygon(n){
    var W = Math.max(120, n.w || NOTE_W), rng = seededRng(hashStr(String(n.id) + "ripedge")), pts = [], i, N;
    if(n.rip === "cut"){
      return "polygon(0 0, 100% 0, 100% calc(100% - 2px), 0 calc(100% - " + (6 + Math.round(rng() * 8)) + "px))";
    }
    if(n.rip === "notebook"){
      pts.push("6px 0");
      for(i = 1; i < 40; i++){ pts.push((i % 2 ? 0 : 6) + "px " + (i * 13) + "px"); }
      // the left edge is only ragged near the top; the polygon below closes it with a straight left side for the rest of the note
      return "polygon(100% 0, 100% 100%, 6px 100%, " + pts.slice(0, 40).reverse().filter(function(p){ return parseInt(p.split(" ")[1], 10) <= 520; }).join(", ") + ")";
    }
    N = Math.max(8, Math.round(W / 9));
    pts.push("0 0", "100% 0", "100% calc(100% - " + (1 + Math.round(rng() * 5)) + "px)");
    for(i = N - 1; i >= 0; i--){ pts.push((i / N * 100).toFixed(2) + "% calc(100% - " + (1 + rng() * 8).toFixed(1) + "px)"); }
    return "polygon(" + pts.join(", ") + ")";
  }
  // the width of the widest line of writing (so a note with a few short lines can be narrowed)
  function widestLine(n){
    if(!n.textEl) return 0;
    try{
      var r = document.createRange(); r.selectNodeContents(n.textEl);
      var max = 0; Array.prototype.forEach.call(r.getClientRects(), function(rc){ if(rc.width > max) max = rc.width; });
      return max / (boardZoom || 1);
    }catch(e){ return 0; }
  }
  // fit: width and height around the content. rip: only the height (the empty part falls away, the width stays).
  // Where the writing really ends: the bottom of the last piece of visible content (text, a picture, the task row), measured from what is
  // drawn. Trailing blank lines, empty Shift+Enter breaks, filler <br>s and empty blocks do not count. Blank lines INSIDE the writing
  // do, because something meaningful comes after them.
  function meaningfulBottom(n){
    var el = n && n.el; if(!el) return 0;
    var z = boardZoom || 1, prevT = el.style.transform, prevTr = el.style.transition, bottom = 0;
    el.style.transition = "none"; el.style.transform = "none";                      // measure the paper un-tilted
    var top = el.getBoundingClientRect().top;
    function see(rc){ if(rc && rc.height > 0){ var b = (rc.bottom - top) / z; if(b > bottom) bottom = b; } }
    var text = n.textEl;
    if(text){
      var walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT, null), tn;
      while((tn = walker.nextNode())){
        if(!/[^\s\u200b\u200c\u200d\u2060\ufeff\u00a0]/.test(tn.nodeValue)) continue;      // only spaces and invisible characters
        var r = document.createRange(); r.selectNodeContents(tn);
        var rects = r.getClientRects(); for(var i = 0; i < rects.length; i++) see(rects[i]);
      }
      Array.prototype.forEach.call(text.querySelectorAll("img, hr"), function(x){ see(x.getBoundingClientRect()); });
    }
    Array.prototype.forEach.call(el.children, function(c){ if(c.classList && (c.classList.contains("noteImgWrap") || c.classList.contains("taskRow"))) see(c.getBoundingClientRect()); });
    el.style.transform = prevT; el.style.transition = prevTr;
    return bottom;
  }
  var PAPER_BOTTOM = 18;                                          // padding under the last line, so the words are never crowded
  // after someone stops typing, a note with plenty of empty paper gets a quiet offer (once per note per visit; never automatic)
  function maybeSuggestTrim(n){
    if(readOnly || !n || n.type || n.cosmetic || n.h || n._trimAsked || focusState || !n.el || !n.el.isConnected) return;
    var mb = meaningfulBottom(n); if(!mb) return;
    if(n.el.offsetHeight - (mb + PAPER_BOTTOM) < 110) return;
    n._trimAsked = true;
    toast("Trim empty paper?", "Trim", function(){ var cur = findNote(n.id); if(cur) trimPaper(cur, "rip"); });
  }
  // blank lines at the very end of the writing (Enter or Shift+Enter pressed and never used, empty blocks, filler breaks) are not
  // content: fitting or ripping the paper removes them, so the paper can really end where the words end
  function isBlankNode(node){
    if(node.nodeType === 3) return !/[^\s\u200b\u200c\u200d\u2060\ufeff\u00a0]/.test(node.nodeValue);
    if(node.nodeType !== 1) return true;
    if(node.tagName === "BR") return true;
    if(/^(IMG|HR|INPUT)$/.test(node.tagName)) return false;
    for(var i = 0; i < node.childNodes.length; i++){ if(!isBlankNode(node.childNodes[i])) return false; }
    return true;
  }
  function trimEndBlanks(container){
    var again = true;
    while(again){
      again = false; var last = container.lastChild; if(!last) break;
      if(isBlankNode(last)){ container.removeChild(last); again = true; continue; }
      if(last.nodeType === 1 && /^(DIV|P|UL|OL|LI|BLOCKQUOTE)$/.test(last.tagName)){ trimEndBlanks(last); if(isBlankNode(last)){ container.removeChild(last); again = true; } }
    }
  }
  function trimTrailingBlank(html){ var d = document.createElement("div"); d.innerHTML = html; trimEndBlanks(d); return d.innerHTML; }
  // one undo step that restores whole snapshots (the words may have changed, which the field-by-field history does not track)
  function recordSnapshots(label, ids, before){
    var after = captureState(ids);
    function put(map){
      ids.forEach(function(id){
        var n = findNote(id), snap = map[id]; if(!n || !snap) return;
        SERIAL_FIELDS.forEach(function(k){ if(k in snap) n[k] = snap[k]; else delete n[k]; });
        rerenderNote(n);
      });
      return true;
    }
    pushHistory({label: label, custom: true, t: Date.now(), undo: function(){ return put(before); }, redo: function(){ return put(after); }});
  }
  function trimPaper(n, mode){
    if(readOnly || !n || n.type || !n.el) return;
    if(n.cosmetic === "soup"){ toast("A soup bowl keeps its own shape."); return; }
    endEditing(); closeFloatingPopovers();
    if(n.textEl) n.html = n.textEl.innerHTML;
    var el = n.el, before = captureState([n.id]), oldH = el.offsetHeight, oldW = n.w || NOTE_W, newW = oldW, prevW = el.style.width;
    var tidy = trimTrailingBlank(n.html || ""), changedWords = tidy !== (n.html || "");
    if(changedWords && n.textEl){ n.textEl.innerHTML = tidy; }
    if(mode === "fit" && !n.image && !n.isTask){
      var lw = widestLine(n); if(lw > 0) newW = Math.max(PAPER_MIN_W, Math.min(oldW, Math.ceil(lw) + 36));
    }
    el.style.width = newW + "px";
    var mb = meaningfulBottom(n);
    if(!mb){ el.style.width = prevW; if(changedWords && n.textEl) n.textEl.innerHTML = before[n.id].html; toast("Write something first, then trim the paper."); return; }
    var newH = Math.max(PAPER_MIN_H, Math.ceil(mb + PAPER_BOTTOM));
    el.style.width = prevW;
    if(oldH - newH < 18 && oldW - newW < 12 && !changedWords){ if(n.textEl && changedWords) n.textEl.innerHTML = before[n.id].html; toast(mode === "rip" ? "There\u2019s no empty paper to tear off." : "This note already fits its words."); return; }
    var ripChip = null;
    if(mode === "rip"){
      n.rip = n.rip || ripStyleFor(n);
      if(!reducedMotion() && oldH - newH > 24){
        ripChip = makeDiv("ripChip");
        ripChip.style.left = n.x + "px"; ripChip.style.top = (n.y + newH) + "px"; ripChip.style.width = oldW + "px"; ripChip.style.height = (oldH - newH) + "px";
        ripChip.style.background = "var(--note-bg)"; ripChip.style.setProperty("--note-bg", n.bg); ripChip.style.setProperty("--rot", (n.rot || 0) + "deg");
        ripChip.style.zIndex = String((n.z || 1) + 1); boardInner.appendChild(ripChip);
      }
    }
    n.w = newW; n.h = newH; n.html = tidy;
    saveNotes(); rerenderNote(n); ensureWidth(); updateMinimap();
    recordSnapshots(mode === "rip" ? "Rip off empty paper" : "Fit paper to content", [n.id], before);
    if(ripChip){
      requestAnimationFrame(function(){ requestAnimationFrame(function(){ ripChip.classList.add("go"); }); });
      setTimeout(function(){ ripChip.remove(); }, 900);
    }
  }
  function restorePaper(n){
    if(readOnly || !n || !n.el) return;
    var before = captureState([n.id]);
    delete n.h; delete n.rip; n.w = NOTE_W;
    saveNotes(); rerenderNote(n); ensureWidth(); updateMinimap();
    recordSnapshots("Restore full paper", [n.id], before);
  }
  function startNoteResize(e, n, axis){
    e.preventDefault(); e.stopPropagation();
    try{ if(e.target && e.target.setPointerCapture && e.pointerId !== undefined) e.target.setPointerCapture(e.pointerId); }catch(err){}
    var el = n.el, before = captureState([n.id]), sx = e.clientX, sy = e.clientY, w0 = n.w || NOTE_W, h0 = el.offsetHeight, w = w0, h = h0;
    document.body.style.cursor = axis === "y" ? "ns-resize" : axis === "x" ? "ew-resize" : "nwse-resize"; el.classList.add("resizing");
    function move(ev){
      if(axis !== "y") w = Math.round(Math.min(PAPER_MAX_W, Math.max(PAPER_MIN_W, w0 + (ev.clientX - sx) / boardZoom)));
      if(axis !== "x") h = Math.round(Math.min(900, Math.max(PAPER_MIN_H, h0 + (ev.clientY - sy) / boardZoom)));
      el.style.width = w + "px"; el.style.minHeight = h + "px";
    }
    function up(){
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      document.body.style.cursor = ""; el.classList.remove("resizing");
      if(w === w0 && Math.abs(h - h0) < 2){ el.style.width = w0 + "px"; el.style.minHeight = n.h ? n.h + "px" : ""; return; }
      n.w = w; n.h = Math.max(PAPER_MIN_H, Math.round(Math.max(h, 0)));
      saveNotes(); rerenderNote(n); recoverVertical([n]); ensureWidth(); updateMinimap(); recordChange("Resize note", before);
    }
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
  }

  // ---------- sanitising anything that arrives from outside (links, imports, pastes) ----------
  var ALLOWED_TAGS = {DIV:1,P:1,BR:1,B:1,STRONG:1,I:1,EM:1,U:1,H1:1,H2:1,H3:1,UL:1,OL:1,LI:1,A:1,MARK:1,SPAN:1};
  var DROP_TAGS = /^(SCRIPT|STYLE|IFRAME|FRAME|OBJECT|EMBED|TEMPLATE|SVG|MATH|NOSCRIPT|FORM|INPUT|TEXTAREA|BUTTON|SELECT|LINK|META|IMG|PICTURE|VIDEO|AUDIO|CANVAS|HEAD|TITLE)$/;
  // The old highlighter wrote inline background colours. Browsers also write `background-color: rgba(0, 0, 0, 0)` on everything they
  // copy; that is "no background", not a highlight.
  function hasRealBackground(style){
    var m = /background(?:-color)?\s*:\s*([^;]+)/i.exec(style || "");
    if(!m) return false;
    var v = m[1].trim().toLowerCase();
    if(/^(transparent|initial|inherit|unset|none|currentcolor)$/.test(v)) return false;
    var rgba = /^rgba?\(\s*[\d.]+\s*[, ]\s*[\d.]+\s*[, ]\s*[\d.]+\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/.exec(v);
    if(rgba && rgba[1] !== undefined && parseFloat(rgba[1]) === 0) return false;
    return true;
  }
  // What comes off the clipboard from a browser or another app: keep the words and simple formatting (bold, italic, links, lists), drop
  // everything else. Browsers wrap a copied line in styled spans and end it with a hidden line break; neither belongs in the note, or
  // the pasted text arrives highlighted and one line too low.
  function cleanPastedHtml(html){
    html = String(html || "").replace(/<!--[\s\S]*?-->/g, "").replace(/<br[^>]*Apple-interchange-newline[^>]*>/gi, "");
    var doc = new DOMParser().parseFromString("<div>" + html + "</div>", "text/html"), root = doc.body.firstChild;
    if(!root) return "";
    Array.prototype.slice.call(root.querySelectorAll("[style]")).forEach(function(el){
      var st = el.getAttribute("style") || "";
      if(el.tagName === "SPAN"){
        var bold = /font-weight:\s*(bold|[6-9]00)/i.test(st), ital = /font-style:\s*italic/i.test(st);
        if(bold || ital){
          var wrap = doc.createElement(bold ? "b" : "i");
          while(el.firstChild) wrap.appendChild(el.firstChild);
          if(bold && ital){ var it = doc.createElement("i"); while(wrap.firstChild) it.appendChild(wrap.firstChild); wrap.appendChild(it); }
          el.appendChild(wrap);
        }
      }
      el.removeAttribute("style");
    });
    var out = sanitizeHtml(root.innerHTML);
    out = out.replace(/^(?:\s|<br\s*\/?>)+/i, "").replace(/(?:\s|<br\s*\/?>|&nbsp;)+$/i, "");
    var one = /^<(div|p)>([\s\S]*)<\/\1>$/i.exec(out);                                     // a single wrapper block would start a new line
    if(one && !/<(div|p|ul|ol|li|h[1-3])[\s>]/i.test(one[2])) out = one[2];
    return out;
  }
  function safeHref(href){
    href = String(href || "").trim();
    return /^(https?:|mailto:|tel:)/i.test(href) ? href : null;
  }
  function sanitizeHtml(html){
    var doc = new DOMParser().parseFromString("<div>" + String(html || "") + "</div>", "text/html");
    var root = doc.body.firstChild;
    if(!root) return "";
    (function clean(node){
      Array.prototype.slice.call(node.childNodes).forEach(function(ch){
        if(ch.nodeType === 3) return;
        if(ch.nodeType !== 1){ ch.remove(); return; }
        var tag = ch.tagName;
        if(DROP_TAGS.test(tag)){ ch.remove(); return; }
        clean(ch);
        if(!ALLOWED_TAGS[tag]){
          while(ch.firstChild) ch.parentNode.insertBefore(ch.firstChild, ch);
          ch.remove();
          return;
        }
        if(tag === "SPAN" && hasRealBackground(ch.getAttribute("style") || "")){
          // the old highlighter wrote inline background colours; turn them into marker strokes
          var mk = doc.createElement("mark");
          mk.className = "hl";
          while(ch.firstChild) mk.appendChild(ch.firstChild);
          ch.parentNode.replaceChild(mk, ch);
          return;
        }
        var keep = {};
        if(tag === "A"){
          var h = safeHref(ch.getAttribute("href"));
          if(!h){ while(ch.firstChild) ch.parentNode.insertBefore(ch.firstChild, ch); ch.remove(); return; }
          keep.href = h;
        }
        if(tag === "UL" && ch.classList.contains("checklist")) keep["class"] = "checklist";
        if(tag === "LI"){ var dc = ch.getAttribute("data-checked"); if(dc === "true" || dc === "false") keep["data-checked"] = dc; if(ch.getAttribute("data-title") === "true") keep["data-title"] = "true"; }
        if(tag === "MARK") keep["class"] = "hl";
        Array.prototype.slice.call(ch.attributes).forEach(function(at){ ch.removeAttribute(at.name); });
        Object.keys(keep).forEach(function(k){ ch.setAttribute(k, keep[k]); });
      });
    })(root);
    // unwrap attribute-less spans; they carry nothing
    Array.prototype.slice.call(root.querySelectorAll("span")).forEach(function(sp){
      while(sp.firstChild) sp.parentNode.insertBefore(sp.firstChild, sp);
      sp.remove();
    });
    return root.innerHTML;
  }
  function htmlToText(html){
    var d = new DOMParser().parseFromString("<div>" + String(html || "") + "</div>", "text/html");
    return d.body.textContent || "";
  }
  function safeImage(src){
    return (typeof src === "string" && /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(src)) ? src : null;
  }
  function safeColor(c){
    if(typeof c !== "string") return null;
    c = c.trim();
    return /^(hsl\(\s*\d+(\.\d+)?\s*,\s*\d+(\.\d+)?%\s*,\s*\d+(\.\d+)?%\s*\)|#[0-9a-f]{3,8}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))$/i.test(c) ? c : null;
  }
  var idSeq = 0;
  function uuid4(){
    if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16); crypto.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function(x){ return ("0" + x.toString(16)).slice(-2); }).join("");
    return h.slice(0,8) + "-" + h.slice(8,12) + "-" + h.slice(12,16) + "-" + h.slice(16,20) + "-" + h.slice(20);
  }
  // Signed-in boards need UUIDs (they are database keys); guest boards keep the short local ids.
  function newId(){
    if(CLOUD) return uuid4();
    idSeq += 1; return "n" + Date.now().toString(36) + idSeq + Math.floor(rand(0, 999));
  }
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function uuidOrNull(v){ return typeof v === "string" && UUID_RE.test(v) ? v.toLowerCase() : null; }
  // Normalise a note that came from a link, a file, or the clipboard.
  var PHOTO_STYLES = ["polaroid", "cutout", "mounted"];
  var PHOTO_STYLE_NAMES = {polaroid:"Polaroid", cutout:"Cut-out", mounted:"Mounted cut-out"};
  var PHOTO_MIN_W = 80, PHOTO_MAX_W = 900;
  var CUT_BORDERS = ["none", "thin", "medium"];                              // white scissor border round a cutout (default: thin)
  var BACKINGS = ["cardboard", "kraft", "paper", "notebook", "graph"];      // mounted-cutout materials (all free)
  function isPhoto(n){ return !!n && n.type === "photo"; }
  // Voice memos and videos: the board keeps metadata (and a small poster frame);
  // the media file itself lives in this device's IndexedDB under `mediaId`.
  function isAV(n){ return !!n && (n.type === "audio" || n.type === "video"); }
  function isObj(n){ return isPhoto(n) || isAV(n) || isPaper(n); }
  // opts.allowAssets: the item comes from this account's own board (duplicate / paste), so its asset ids may be kept.
  // Anything from a file or a link is untrusted and never gets to reference stored media.
  function normalizeIncoming(item, opts){
    item = item || {};
    if(item.type === "pile") return null;
    if(item.pileId !== undefined){ item = Object.assign({}, item); delete item.pileId; }
    if(item.type === "embed"){
      var emb = window.Stick && Stick.embed && Stick.embed.normalize(item); if(!emb) return null;
      var eo2 = {id: newId(), type: "embed", x: clampNum(item.x, 0, 1e6, 0), y: clampNum(item.y, 0, 5000, 0), w: emb.w, rot: 0, z: 0, url: emb.url, provider: emb.provider, vid: emb.vid, phys: {}};
      if(emb.start) eo2.start = emb.start;
      return eo2;
    }
    opts = opts || {};
    function cloudRefs(o){
      if(!opts.allowAssets) return o;
      var a = uuidOrNull(item.assetId), b = uuidOrNull(item.attachedAssetId);
      if(a) o.assetId = a;
      if(b) o.attachedAssetId = b;
      if(a || b) o.mediaState = item.mediaState === "failed" || item.mediaState === "uploading" ? item.mediaState : "ready";
      if(item.type === "photo"){
        var ca = uuidOrNull(item.cutoutAssetId);
        if(ca) o.cutoutAssetId = ca;
        if(/^[\w-]{1,64}$/.test(String(item.cutoutKey || ""))) o.cutoutKey = String(item.cutoutKey);
        if(ca || o.cutoutKey){ o.cutoutRatio = clampNum(item.cutoutRatio, 0.05, 20, 1); }
        if(BACKINGS.indexOf(item.backing) !== -1) o.backing = item.backing;
        if(CUT_BORDERS.indexOf(item.cutBorder) !== -1) o.cutBorder = item.cutBorder;
      }
      if(FONT_BY_NAME[item.captionFont]) o.captionFont = item.captionFont;
      return o;
    }
    if(item.type === "zone"){
      return {id: newId(), type: "zone", x: clampNum(item.x, 0, 1e6, 0), y: clampNum(item.y, 0, 5000, 0), w: Math.round(clampNum(item.w, ZONE_MIN_W, ZONE_MAX_W, 360)), h: Math.round(clampNum(item.h, ZONE_MIN_H, ZONE_MAX_H, 240)),
        title: String(item.title || "").replace(/[\u0000-\u001f\u202a-\u202e\u2066-\u2069]/g, "").replace(/\s+/g, " ").trim().slice(0, 40), variant: ZONE_MATERIALS.some(function(m){ return m[0] === item.variant; }) ? item.variant : "paper",
        bg: safeColor(item.bg) || ZONE_TINTS[0], carry: item.carry === true ? true : undefined, rot: 0, z: 0, phys: {}, createdAt: clampNum(item.createdAt, 0, 1e14, Date.now())};
    }
    if(window.Stick && Stick.objects && Stick.objects.isKind(item.type)){
      var pc = Stick.objects.normalize(item, paperHelpers());
      if(!pc) return null;
      if(!opts.allowAssets){                                   // from a file or a link: never a reference to stored media
        delete pc.assetId;
        if(pc.frames) pc.frames = pc.frames.filter(function(f){ return !!f.image; }).map(function(f){ delete f.assetId; return f; });
        if(pc.type === "photo_strip" && pc.frames.length < Stick.objects.STRIP_MIN) return null;
      }
      pc.id = newId(); pc.x = clampNum(item.x, 0, 1e6, 0); pc.y = clampNum(item.y, 0, 5000, 0);
      pc.rot = clampNum(item.rot, -12, 12, 0); pc.z = 1; pc.phys = {};
      pc.createdAt = clampNum(item.createdAt, 0, 1e14, Date.now());
      if(opts.allowAssets && uuidOrNull(item.assetId) && pc.type === "postcard") pc.mediaState = item.mediaState === "failed" || item.mediaState === "uploading" ? item.mediaState : "ready";
      return pc;
    }
    if(item.type === "audio" || item.type === "video"){
      var mid = /^[\w-]{1,64}$/.test(String(item.mediaId || "")) ? String(item.mediaId) : null;
      if(!mid && !(opts.allowAssets && uuidOrNull(item.assetId))) return null;
      return cloudRefs({
        id: newId(), type: item.type,
        x: clampNum(item.x, 0, 1e6, 0), y: clampNum(item.y, 0, 5000, 0),
        w: Math.round(item.type === "audio" ? clampNum(item.w, AUDIO_MIN_W, AUDIO_MAX_W, AUDIO_W) : clampNum(item.w, VIDEO_MIN_W, VIDEO_MAX_W, 200)),
        imgRatio: clampNum(item.imgRatio, 0.2, 5, 0.5625),
        rot: clampNum(item.rot, -12, 12, 0), z: 1,
        mediaId: mid || undefined, duration: clampNum(item.duration, 0, 86400, 0),
        mime: String(item.mime || "").slice(0, 60), poster: safeImage(item.poster),
        caption: String(item.caption || "").replace(/\s+/g, " ").trim().slice(0, 120),
        font: FONT_BY_NAME[item.font] ? item.font : pickFont(),
        createdAt: clampNum(item.createdAt, 0, 1e14, Date.now()), phys: {}
      });
    }
    if(item.type === "photo"){
      var src = safeImage(item.image);
      if(!src && !(opts.allowAssets && uuidOrNull(item.assetId))) return null;
      return cloudRefs({
        id: newId(), type: "photo",
        x: clampNum(item.x, 0, 1e6, 0), y: clampNum(item.y, 0, 5000, 0),
        w: Math.round(clampNum(item.w, PHOTO_MIN_W, PHOTO_MAX_W, 220)),
        imgRatio: clampNum(item.imgRatio, 0.05, 20, 0.75),
        rot: clampNum(item.rot, -12, 12, 0), z: 1,
        image: src, cutout: safeImage(item.cutout),
        photoStyle: PHOTO_STYLES.indexOf(item.photoStyle) !== -1 ? item.photoStyle : "polaroid",
        caption: String(item.caption || "").replace(/\s+/g, " ").trim().slice(0, 120),
        font: FONT_BY_NAME[item.font] ? item.font : pickFont(),
        createdAt: clampNum(item.createdAt, 0, 1e14, Date.now()),
        phys: sanitizePhotoPhys(item.phys)
      });
    }
    return cloudRefs({
      id: newId(),
      x: clampNum(item.x, 0, 1e6, 0), y: clampNum(item.y, 0, 5000, 0), w: clampNum(item.w, 160, 420, NOTE_W),
      html: sanitizeHtml(item.html != null ? item.html : escapeHtml(item.text || "")),
      bg: safeColor(item.bg) || randomColor(),
      font: FONT_BY_NAME[item.font] ? item.font : pickFont(),
      fontManual: !!item.fontManual,
      rot: clampNum(item.rot, -12, 12, 0),
      z: 1, categoryIndex: 0,
      isTask: !!item.isTask, done: !!item.done,
      cosmetic: item.cosmetic === "soup" ? "soup" : undefined,
      h: Number(item.h) >= 60 && Number(item.h) <= 2000 ? Math.round(Number(item.h)) : undefined,
      rip: RIP_STYLES.indexOf(item.rip) !== -1 ? item.rip : undefined,
      doneAt: Number(item.doneAt) > 0 && Number(item.doneAt) < 1e14 ? Number(item.doneAt) : undefined,
      doneBy: Number(item.doneAt) > 0 && item.doneBy ? String(item.doneBy).replace(/[\u0000-\u001f\u202a-\u202e\u2066-\u2069]/g, "").trim().slice(0, 60) : undefined,
      due: /^\d{4}-\d{2}-\d{2}$/.test(item.due || "") ? item.due : "",
      dueTime: /^\d{2}:\d{2}$/.test(item.dueTime || "") ? item.dueTime : "09:00",
      image: safeImage(item.image),
      imgW: item.imgW == null ? null : Math.round(clampNum(item.imgW, 40, 420, 200)),
      imgRatio: item.imgRatio == null ? null : clampNum(item.imgRatio, 0.05, 20, 1),
      phys: sanitizePhys(item.phys)
    });
  }
  // Board items are sticky notes unless `type` says otherwise (old boards have no type).
  // For a photo, `w` is the printed photo's width and `image` its source; the
  // original is never modified (`cutout` is reserved for an isolated-subject version).
  // (declared here, above everything that runs while the page loads: the cached board is sanitised during boot, long before the zone code below)
  var ZONE_MATERIALS = [["paper", "Paper"], ["kraft", "Kraft"], ["cardboard", "Cardboard"], ["grid", "Grid paper"], ["felt", "Felt"]];
  var ZONE_TINTS = ["#fff3a8", "#ffd6d6", "#d6ecff", "#d8f3dc", "#ead6ff", "#ffe3c2", "#e4e4e4"];
  var ZONE_MIN_W = 160, ZONE_MAX_W = 1000, ZONE_MIN_H = 110, ZONE_MAX_H = 1600;
  var SERIAL_FIELDS = ["id","type","x","y","w","html","bg","font","fontManual","rot","z","categoryIndex","isTask","done","due","dueTime","image","imgW","imgRatio","listHintOff","photoStyle","caption","captionFont","cutBorder","doneAt","doneBy","h","rip","pinned","carry","fields","cur","createdFromPreset","items","cutoutKey","cutoutAssetId","cutoutRatio","backing","cosmetic","title","date","body","amount","variant","dateTime","place","details","orient","location","message","recipient","frames","createdAt","mediaId","duration","mime","poster","assetId","attachedAssetId","mediaState","legacyId","phys","pileId","members","ox","oy","edges","url","provider","vid","start"];
  function serializeNote(n){
    var o = {};
    SERIAL_FIELDS.forEach(function(k){ if(n[k] !== undefined) o[k] = n[k]; });
    return o;
  }
  // What goes into storage / the sync layer. Runtime-only URLs (blob:, https: signed URLs) are never persisted,
  // and once a picture lives in the cloud (assetId) the device does not keep a second copy in localStorage.
  function persistForm(n){
    var o = serializeNote(n);
    if(o.image && !/^data:/.test(o.image)) delete o.image;
    if(o.cutout && !/^data:/.test(o.cutout)) delete o.cutout;
    if(CLOUD && (o.assetId || o.attachedAssetId) && o.image) delete o.image;
    if(Array.isArray(o.frames)) o.frames = o.frames.map(function(f){
      var c = Object.assign({}, f);
      if(c.image && !/^data:/.test(c.image)) delete c.image;
      if(CLOUD && c.assetId && c.image) delete c.image;
      return c;
    });
    return o;
  }
  // Objects that arrive from the server (or the cache filled from it) came from other devices and other people:
  // sanitise the risky fields, but change nothing else, so an object that was already fine keeps the exact same
  // content (and therefore the same sync hash) and is not re-sent.
  function cloudSanitize(o){
    if(!o || typeof o !== "object") return null;
    var c = Object.assign({}, o);
    c.id = String(c.id);
    if(!/^[\w-]{1,64}$/.test(c.id)) return null;
    c.x = clampNum(c.x, 0, 1e6, 0); c.y = clampNum(c.y, 0, 5000, 0);
    if(c.w != null) c.w = clampNum(c.w, 40, 1000, NOTE_W);
    c.rot = clampNum(c.rot, -15, 15, 0);
    c.z = Math.round(clampNum(c.z, 0, 1e9, 1));
    if(c.font !== undefined && !FONT_BY_NAME[c.font]) c.font = pickFont();
    if(c.bg !== undefined && !safeColor(c.bg)) c.bg = randomColor();
    if(c.pileId !== undefined && !/^[\w-]{1,64}$/.test(String(c.pileId))) delete c.pileId;
    if(c.type === "embed"){                                      // an embedded video link: re-derived from the stored address every time, never trusted
      var en = window.Stick && Stick.embed && Stick.embed.normalize(c); if(!en) return null;
      var eo = {id: c.id, type: "embed", x: c.x, y: c.y, w: en.w, rot: c.rot, z: c.z, url: en.url, provider: en.provider, vid: en.vid, phys: c.phys && typeof c.phys === "object" ? c.phys : {}};
      if(en.start) eo.start = en.start;
      if(c.pinned === true) eo.pinned = true;
      if(c.createdAt !== undefined) eo.createdAt = clampNum(c.createdAt, 0, 1e14, Date.now());
      return eo;
    }
    if(c.type === "pile"){                                       // a pile only references its members; it carries no content of its own
      var pn = window.Stick && Stick.pile && Stick.pile.normalize(c); if(!pn) return null;
      var po = {id: c.id, type: "pile", x: c.x, y: c.y, w: pn.w, rot: c.rot, z: c.z, members: pn.members, ox: pn.ox, oy: pn.oy, edges: pn.edges, phys: c.phys && typeof c.phys === "object" ? c.phys : {}};
      if(c.pinned === true) po.pinned = true;
      if(c.createdAt !== undefined) po.createdAt = clampNum(c.createdAt, 0, 1e14, Date.now());
      return po;
    }
    if(window.Stick && Stick.objects && Stick.objects.isKind(c.type)){
      var sp = Stick.objects.sanitize(c, paperHelpers());
      if(!sp) return null;
      if(c.pinned === true) sp.pinned = true;
      if(c.pileId !== undefined) sp.pileId = String(c.pileId);
      if(c.type === "shopping"){ var dn = Number(c.doneAt); if(dn > 0 && dn < 1e14){ sp.doneAt = dn; if(c.doneBy !== undefined) sp.doneBy = String(c.doneBy).replace(/[\u0000-\u001f\u202a-\u202e\u2066-\u2069]/g, "").trim().slice(0, 60); } }
      sp.id = c.id; sp.x = c.x; sp.y = c.y; sp.z = c.z; sp.rot = c.rot; sp.phys = c.phys && typeof c.phys === "object" ? c.phys : {};
      if(c.w != null) sp.w = Math.round(clampNum(c.w, Stick.objects.WIDTH[c.type][0], Stick.objects.WIDTH[c.type][1], Stick.objects.defaultW(c)));
      if(c.mediaState !== undefined && ["uploading", "ready", "failed", "missing"].indexOf(c.mediaState) !== -1) sp.mediaState = c.mediaState;
      return sp;
    }
    if(c.type === "zone"){
      c.w = Math.round(clampNum(c.w, ZONE_MIN_W, ZONE_MAX_W, 360)); c.h = Math.round(clampNum(c.h, ZONE_MIN_H, ZONE_MAX_H, 240)); c.z = 0; c.rot = 0;
      c.title = String(c.title || "").replace(/[\u0000-\u001f\u202a-\u202e\u2066-\u2069]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
      if(!ZONE_MATERIALS.some(function(m){ return m[0] === c.variant; })) c.variant = "paper";
      c.bg = safeColor(c.bg) || ZONE_TINTS[0];
      if(c.carry !== true) delete c.carry;
      if(c.pinned !== undefined && c.pinned !== true) delete c.pinned;
      delete c.html;
      return c;
    }
    if(c.type === "audio" || c.type === "video" || c.type === "photo"){
      if(c.caption !== undefined) c.caption = String(c.caption).replace(/\s+/g, " ").trim().slice(0, 120);
      if(c.mediaId !== undefined && !/^[\w-]{1,64}$/.test(String(c.mediaId))) delete c.mediaId;
      if(c.poster !== undefined && !safeImage(c.poster)) delete c.poster;
      if(c.photoStyle !== undefined && PHOTO_STYLES.indexOf(c.photoStyle) === -1) c.photoStyle = "polaroid";
    } else {
      var clean = sanitizeHtml(c.html || "");
      if(clean !== (c.html || "")) c.html = clean;
    }
    ["assetId", "attachedAssetId", "cutoutAssetId"].forEach(function(k){ if(c[k] !== undefined && !uuidOrNull(c[k])) delete c[k]; });
    if(c.cutoutKey !== undefined && !/^[\w-]{1,64}$/.test(String(c.cutoutKey))) delete c.cutoutKey;
    if(c.cutoutRatio !== undefined) c.cutoutRatio = clampNum(c.cutoutRatio, 0.05, 20, 1);
    if(c.backing !== undefined && BACKINGS.indexOf(c.backing) === -1) delete c.backing;
    if(c.cutBorder !== undefined && CUT_BORDERS.indexOf(c.cutBorder) === -1) delete c.cutBorder;
    if(c.h !== undefined){ c.h = Number(c.h); if(!(c.h >= 60 && c.h <= 2000)) delete c.h; else c.h = Math.round(c.h); }
    if(c.rip !== undefined && RIP_STYLES.indexOf(c.rip) === -1) delete c.rip;
    if(c.pinned !== undefined && c.pinned !== true) delete c.pinned;
    if(c.doneAt !== undefined){ c.doneAt = Number(c.doneAt); if(!(c.doneAt > 0 && c.doneAt < 1e14)) delete c.doneAt; }
    if(c.doneBy !== undefined) c.doneBy = String(c.doneBy).replace(/[\u0000-\u001f\u202a-\u202e\u2066-\u2069]/g, "").trim().slice(0, 60);
    if(c.captionFont !== undefined && !FONT_BY_NAME[c.captionFont]) delete c.captionFont;
    if(c.cosmetic !== undefined && c.cosmetic !== "soup") delete c.cosmetic;
    if(c.mediaState !== undefined && ["uploading", "ready", "failed", "missing"].indexOf(c.mediaState) === -1) delete c.mediaState;
    delete c.image; delete c.cutout;                     // media only ever arrives through assets
    return c;
  }

  // ---------- compact link encoding (deflate + base64url), with the old format still readable ----------
  function b64urlFromBytes(bytes){
    var bin = "";
    for(var i=0; i<bytes.length; i+=0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i+0x8000));
    return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  }
  function bytesFromB64url(str){
    str = str.replace(/-/g,"+").replace(/_/g,"/");
    while(str.length % 4) str += "=";
    var bin = atob(str), out = new Uint8Array(bin.length);
    for(var i=0; i<bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  async function encodeStateCompact(obj){
    var json = JSON.stringify(obj);
    if(window.CompressionStream){
      try{
        var stream = new Blob([json]).stream().pipeThrough(new CompressionStream("deflate-raw"));
        var buf = new Uint8Array(await new Response(stream).arrayBuffer());
        return "z." + b64urlFromBytes(buf);
      }catch(e){}
    }
    return encodeState(obj);
  }
  async function decodeStateAny(str){
    str = String(str || "");
    if(str.indexOf("z.") === 0){
      try{
        var stream = new Blob([bytesFromB64url(str.slice(2))]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        return JSON.parse(await new Response(stream).text());
      }catch(e){ return null; }
    }
    return decodeState(str);
  }

  // ---------- public sharing ----------
  // Every public link is built here. Today a link is self-contained: the notes ride
  // in the URL fragment, which browsers never send to a server. For the backend pass,
  // createLink() becomes an upload that stores the payload, runs abuse/moderation
  // checks in review(), and returns a short id; callers don't change. Nothing is
  // moderated yet, so the UI never claims it is. Links have no expiry or revocation.
  var PublicShare = {
    PREFIX: {note:"sn", group:"sg", board:"sb"},
    toPublicNote: function(n){
      if(isPhoto(n)) return {
        type:"photo", x:n.x, y:n.y, w:n.w, imgRatio:n.imgRatio, rot:n.rot, image:n.image,
        photoStyle:n.photoStyle, caption:n.caption || "", font:n.font, phys:ensurePhys(n)
      };
      if(isPaper(n)){
        var pn = Object.assign({}, n); delete pn.el; delete pn.textEl; delete pn.captionEl; delete pn.id; delete pn.assetId; delete pn.mediaState;
        if(pn.frames) pn.frames = pn.frames.map(function(f){ return {image: f.image, ratio: f.ratio, cap: f.cap}; });
        pn.phys = {};
        return pn;
      }
      if(isAV(n)) return {   // (previews only: legacy links never carry recordings or videos)
        type:n.type, x:n.x, y:n.y, w:n.w, imgRatio:n.imgRatio, rot:n.rot, caption:n.caption || "", font:n.font,
        duration:n.duration, poster:n.poster, mediaId:n.mediaId, assetId:n.assetId, phys:{}
      };
      return {
        x:n.x, y:n.y, w:n.w || NOTE_W, html:n.html || "", bg:n.bg, font:n.font, rot:n.rot,
        isTask:!!n.isTask, done:!!n.done, due:n.due || "", dueTime:n.dueTime || "", cosmetic:n.cosmetic === "soup" ? "soup" : undefined,
        image:n.image || null, imgW:n.imgW || null, imgRatio:n.imgRatio || null, phys:ensurePhys(n)
      };
    },
    // Photos travel inside the link, so shrink them (same ratio, fewer pixels) first.
    prepare: async function(items){
      await Promise.all(items.map(async function(it){
        if(it.image) it.image = await shrinkDataUrl(it.image, it.type === "photo" ? 640 : 360, it.type === "photo" ? 0.78 : 0.72);
        if(Array.isArray(it.frames)) await Promise.all(it.frames.map(async function(f){ if(f.image) f.image = await shrinkDataUrl(f.image, 300, 0.72); }));
      }));
      return items;
    },
    review: function(kind, payload){ return {ok:true, payload:payload}; },
    createLink: async function(kind, payload){
      var verdict = this.review(kind, payload);
      if(!verdict.ok) throw new Error(verdict.reason || "not allowed");
      var encoded = await encodeStateCompact(verdict.payload);
      if(!encoded) throw new Error("encode failed");
      return location.href.split("#")[0] + "#" + this.PREFIX[kind] + "=" + encoded;
    }
  };

  // A page opened from a share link (#s=<token> or the legacy #sb=) only SHOWS what was shared. It must never write to anyone's account, even
  // when the person looking is signed in (the owner opening their own link, or anyone else with an account of their own).
  var SHARE_LINK_PAGE = /^#(sb|s)=/.test(location.hash);
  var readOnly = SHARE_LINK_PAGE;                    // legacy board link (#sb=) or a new server link (#s=<token>)
  var viewerMode = false;                            // signed in, but only allowed to look at this board
  var needsCloudBootstrap = false, needsBoardFill = false;
  // Desktop: double-click makes a note (single clicks stay free for selecting).
  // Touch screens keep one-tap notes until mobile capture gets its own design.
  var COARSE = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  var CREATE_HINT = COARSE ? "Tap anywhere to add something" : "Right-click anywhere to add something";
  var singleNoteMode = /^#s[ng]=/.test(location.hash); // a public note or group of notes
  if(readOnly) document.body.classList.add("read-only");

  function notesKeyFor(boardId){ return "stickyboard." + NS + "notes." + boardId; }

  var boards = [];
  var activeBoardId = null;
  if(!singleNoteMode){
    boards = safeGet(BOARDS_KEY);
    activeBoardId = safeGet(ACTIVE_BOARD_KEY);
    if((!boards || !boards.length) && CLOUD){
      // first time this account is opened on this device: the cloud layer fills the cache, then reloads
      boards = []; activeBoardId = null; needsCloudBootstrap = true;
    } else if(!boards || !boards.length){
      var legacy = safeGet(LEGACY_NOTES_KEY);
      var defaultId = "b" + Date.now().toString(36);
      boards = [{id:defaultId, name:"My Board"}];
      activeBoardId = defaultId;
      safeSet(BOARDS_KEY, boards);
      safeSet(ACTIVE_BOARD_KEY, activeBoardId);
      if(legacy) safeSet(notesKeyFor(defaultId), legacy);
    }
    if(!needsCloudBootstrap && (!activeBoardId || !boards.some(function(b){ return b.id === activeBoardId; }))){
      activeBoardId = boards[0].id;
      safeSet(ACTIVE_BOARD_KEY, activeBoardId);
    }
    if(CLOUD && activeBoardId){
      var activeMeta = boards.filter(function(b){ return b.id === activeBoardId; })[0];
      if(activeMeta && (activeMeta.access === "viewer" || activeMeta.locked)){
        viewerMode = true; readOnly = true;
        document.body.classList.add("read-only");
      }
    }
  }
  var NOTES_KEY = activeBoardId ? notesKeyFor(activeBoardId) : null;

  // Objects that this device could not read (a malformed cache entry, a row it does not understand). They are left exactly as they are on the
  // server: the sync layer is told to treat them as present, so being unreadable here can never get them deleted.
  var quarantined = {};
  function sanitizeSafely(raw){
    var c = null;
    try{ c = cloudSanitize(raw); }catch(err){ try{ console.warn("Stick-It: one object could not be read and was left alone:", raw && raw.id, err); }catch(e2){} }
    if(!c && raw && raw.id !== undefined) quarantined[String(raw.id)] = true;
    else if(c) delete quarantined[String(c.id)];
    return c;
  }
  var bootRenderMs = 0;                       // how long drawing the whole board took at page load (dev diagnostics)
  var notes = [];
  var donePile = [];                                 // finished notes (see the Done pile section); stored with the notes, not drawn on the board
  var firstRun = false;
  if((!readOnly || viewerMode) && !singleNoteMode){
    var stored = NOTES_KEY ? safeGet(NOTES_KEY) : null;
    firstRun = !stored;
    if(CLOUD && !stored && !needsCloudBootstrap) needsBoardFill = true;
    notes = stored || (CLOUD ? [] : [
      {id:"seed-1", x:60, y:40, html:(COARSE ? "Tap anywhere on the board to add a note, a photo, a voice memo or a video." : "Double-click anywhere on the board to stick a new note here."), bg:randomColor(), font:pickFont(), rot:rand(-6,4), z:1, categoryIndex:0},
      {id:"seed-2", x:320, y:170, html:"Drag the little tab at the top to move me around.", bg:randomColor(), font:pickFont(), rot:rand(-4,6), z:2, categoryIndex:0},
      {id:"seed-3", x:70, y:280, html:"Tap \u2022\u2022\u2022 on a note for headings, checklists, a highlighter, colours and more.", bg:randomColor(), font:pickFont(), rot:rand(-5,5), z:3, categoryIndex:0}
    ]);
    if(CLOUD){
      notes = notes.map(sanitizeSafely).filter(Boolean);        // cached from the server: never trust it blindly (and never lose what cannot be read)
    } else {
      notes.forEach(function(n){
        if(n.html === undefined) n.html = escapeHtml(n.text || "");
        if(n.categoryIndex === undefined) n.categoryIndex = 0;
      });
    }
  }

  (function(){ var live = [], done = []; notes.forEach(function(o){ (Number(o.doneAt) > 0 ? done : live).push(o); }); notes = live; donePile = done; })();
  var zCounter = notes.reduce(function(m,n){ return Math.max(m, n.z||0); }, 10);
  if(typeof applyLook === "function") applyLook();

  // While someone types, the note is kept on this device at once but the account is told only after they pause (or every 10 s at most),
  // so the sync pill does not flash "Saving" on every pause between words. Anything else that saves tells the account straight away.
  var typingNotifyT = null, typingFirst = 0;
  function flushTypingNotify(){
    clearTimeout(typingNotifyT); typingNotifyT = null;
    if(!typingFirst) return;
    typingFirst = 0; if(cloudSync) cloudSync.notesChanged();
  }
  function saveNotesTyping(){
    if(readOnly || singleNoteMode || !NOTES_KEY) return;
    saveNotesCache();
    if(!typingFirst) typingFirst = Date.now();
    clearTimeout(typingNotifyT);
    typingNotifyT = setTimeout(flushTypingNotify, Math.max(0, Math.min(2000, 10000 - (Date.now() - typingFirst))));
  }
  document.addEventListener("visibilitychange", function(){ if(document.visibilityState === "hidden") flushTypingNotify(); });
  window.addEventListener("pagehide", flushTypingNotify);
  function saveNotes(){
    if(readOnly || singleNoteMode || !NOTES_KEY) return;
    clearTimeout(typingNotifyT); typingNotifyT = null; typingFirst = 0;
    safeSet(NOTES_KEY, notes.concat(donePile).map(persistForm));
    if(typeof scheduleThumb === "function") scheduleThumb();
    if(cloudSync) cloudSync.notesChanged();
  }
  // write the cache without telling the sync layer (used when the change came from the server)
  function saveNotesCache(){
    if(SHARE_LINK_PAGE) return;                       // the shared copies on screen are never written over this account's own cached board
    if(NOTES_KEY) safeSet(NOTES_KEY, notes.concat(donePile).map(persistForm));
    if(typeof scheduleThumb === "function") scheduleThumb();
  }
  function saveSettings(){ safeSet(SETTINGS_KEY, settings); }

  function boardHeight(){ return boardInner.clientHeight || (window.innerHeight - 56); }
  // Vertical space is bounded on purpose: everything must stay reachable.
  function itemHeight(n){ return (n.el && n.el.offsetHeight) || NOTE_H; }
  function itemMaxY(n){ return Math.max(0, boardHeight() - itemHeight(n) - 8); }
  function syncNoteMaxHeight(){
    if(!boardInner.clientHeight) return; // hidden/collapsed: keep the last real measurement
    document.documentElement.style.setProperty("--note-max-h", Math.max(240, boardInner.clientHeight - 16) + "px");
    if(typeof notes !== "undefined") notes.forEach(function(n){ if(n.textEl) updateScrollCue(n.textEl); });
  }
  // pull anything that ended up below the usable area back into view (no undo step: it's a repair)
  function recoverVertical(list){
    if(!boardInner.clientHeight) return; // never "recover" against a collapsed board
    var changed = false;
    (list || notes).forEach(function(n){
      if(!n.el) return;
      var my = itemMaxY(n);
      if(n.y > my){ n.y = my; n.el.style.top = n.y + "px"; changed = true; }
    });
    if(changed){ saveNotes(); updateMinimap(); }
  }
  // scrolling only switches on when the writing really overflows (not for sub-pixel rounding)
  function updateScrollCue(t){
    if(!t) return;
    var over = t.scrollHeight - t.clientHeight > 2;
    var note = t.closest(".note");
    if(note) note.classList.toggle("capped", over);
    if(!over) t.scrollTop = 0;
    t.classList.toggle("moreBelow", over && t.scrollHeight - t.clientHeight - t.scrollTop > 4);
  }

  function ensureWidth(){
    var maxX = notes.reduce(function(m,n){ return Math.max(m, n.x + (n.w||NOTE_W)); }, 0);
    var needed = Math.max(window.innerWidth * 2.2, maxX + window.innerWidth);
    boardInner.style.width = needed + "px";
    return needed;
  }

  var ZOOM_KEY = activeBoardId ? ("stickyboard." + NS + "zoom." + activeBoardId) : null;
  var boardZoom = (ZOOM_KEY && safeGet(ZOOM_KEY)) || 1;
  var kbShift = 0;
  function updateBoardTransform(){
    boardInner.style.transformOrigin = "0 0";
    boardInner.style.transform = "translateY(" + (-kbShift) + "px) scale(" + boardZoom + ")";
  }
  function applyZoom(){
    updateBoardTransform();
    // zoomed in, the scaled board is taller than the window: let it scroll so nothing is out of reach
    board.style.overflowY = boardZoom > 1 ? "auto" : "hidden";
    if(boardZoom <= 1) board.scrollTop = 0;
    if(ZOOM_KEY) safeSet(ZOOM_KEY, boardZoom); if(typeof scheduleViewCheckpoint === "function") scheduleViewCheckpoint();
    updateMinimap();
  }

  // ---------- mobile: keep the focused note above the on-screen keyboard ----------
  function adjustForKeyboard(el){
    if(!window.visualViewport) return;
    var vh = window.visualViewport.height;
    var keyboardLikelyOpen = (window.innerHeight - vh) > 100;
    if(!keyboardLikelyOpen) return;
    var rect = el.closest(".note").getBoundingClientRect();
    var overflow = rect.bottom - vh + 16;
    if(overflow > 0){
      var maxShift = Math.max(0, boardHeight()*boardZoom - vh + 56);
      kbShift = Math.min(kbShift + overflow, maxShift);
      updateBoardTransform();
    }
  }
  function resetKeyboardShift(){
    if(kbShift !== 0){ kbShift = 0; updateBoardTransform(); }
  }
  if(window.visualViewport && !readOnly && !singleNoteMode){
    window.visualViewport.addEventListener("resize", function(){
      var focused = document.activeElement;
      if(focused && focused.classList && focused.classList.contains("text") && focused.isContentEditable){
        requestAnimationFrame(function(){ adjustForKeyboard(focused); });
      } else {
        resetKeyboardShift();
      }
    });
  }

  // Soft warnings by the number of ACTIVE board objects (not the Done pile, not anything soft-deleted). Never blocks creating a note.
  var boardLevelSeen = 0;
  function checkBoardSize(){
    var G = window.Stick && Stick.guard; if(!G || readOnly) return;
    var logical = logicalCount(), lvl = G.level(logical);         // a pile counts as its members: it never hides how big the board really is
    if(lvl > boardLevelSeen){ boardLevelSeen = lvl; toast(G.levelMessage(lvl, logical)); }
    else if(lvl < boardLevelSeen) boardLevelSeen = lvl;
  }
  function updateCount(){
    if(typeof updateDonePile === "function") updateDonePile(false);
    if(typeof checkBoardSize === "function") checkBoardSize();
    countEl.textContent = logicalCount() + (logicalCount() === 1 ? " note" : " notes") + " on this board. You can undo it right after.";
  }

  function getPlainText(el){ return (el.textContent || "").trim(); }

  var openPopover = null, openPopoverTrigger = null;
  function closeFloatingPopovers(){
    if(openPopover) openPopover.remove();
    openPopover = null;
    openPopoverTrigger = null;
    popLayer.close();
  }
  function openFloatingPopover(triggerBtn, className){
    var rect = triggerBtn.getBoundingClientRect();
    if(openPopoverTrigger === triggerBtn){ closeFloatingPopovers(); return null; }
    return openFloatingPopoverAt(rect, className, triggerBtn);
  }
  // the layers that are not built by one function of their own
  var popLayer = OV.layer("popover", function(){ closeFloatingPopovers(); }, function(){ return !!openPopover; });
  var boardLayer = OV.layer("board-picker", function(){ boardPanel.hidden = true; }, function(){ return !boardPanel.hidden; });
  var shareLayer = OV.layer("share-panel", function(){ sharePanel.hidden = true; }, function(){ return !sharePanel.hidden; });
  var captureLayer = OV.layer("add-menu", function(){ closeCaptureMenu(); }, function(){ return !!captureMenuEl; });
  var tourLayer = OV.layer("tutorial", function(){ endTour(); }, function(){ return !!tourRoot; });
  var focusLayer = OV.layer("focus-mode", function(){ exitFocus(); }, function(){ return !!focusState; });
  var recLayer = OV.layer("recording", function(){ if(recording) recording.cancel(); }, function(){ return !!recording; });
  var menuLayer = OV.layer("menu", function(){ closeMenu(true); }, function(){ return !!openMenuState; });
  var POP_WIDTHS = {cmtPop:300, notePop:230, calPop:250, dateCal:216, kbdPop:270, noteMenu:216, linkPop:260, datePop:250};
  function openFloatingPopoverAt(r, className, triggerBtn){
    closeFloatingPopovers();
    var pop = document.createElement("div");
    pop.className = "floatPop " + className;
    document.body.appendChild(pop);
    var popW = POP_WIDTHS[className] || 140;
    var left = Math.min(Math.max(12, r.left + r.width/2 - popW/2), window.innerWidth - popW - 12);
    pop.style.left = left + "px";
    var spaceAbove = r.top;
    var spaceBelow = window.innerHeight - r.bottom;
    if(spaceAbove >= 300 || spaceAbove >= spaceBelow){
      pop.style.bottom = (window.innerHeight - r.top + 8) + "px";
      pop.style.maxHeight = Math.max(120, spaceAbove - 16) + "px";
    } else {
      pop.style.top = (r.bottom + 8) + "px";
      pop.style.maxHeight = Math.max(120, spaceBelow - 16) + "px";
    }
    openPopover = pop;
    openPopoverTrigger = triggerBtn || null;
    popLayer.open();
    return pop;
  }
  document.addEventListener("click", function(e){
    if(openPopover && !openPopover.contains(e.target) && e.target !== openPopoverTrigger && !(openPopoverTrigger && openPopoverTrigger.contains(e.target))){
      closeFloatingPopovers();
    }
  });

  function openDatePicker(triggerBtn, currentIso, onPick){
    var pop = openFloatingPopover(triggerBtn, "dateCal");
    if(!pop) return;
    var base = currentIso ? currentIso.split("-").map(Number) : null;
    var viewY = base ? base[0] : new Date().getFullYear();
    var viewM = base ? base[1]-1 : new Date().getMonth();

    function render(){
      pop.innerHTML = "";
      var head = document.createElement("div");
      head.className = "dateCalHead";
      var prev = document.createElement("button");
      prev.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';
      prev.addEventListener("mousedown", function(e){ e.preventDefault(); });
      prev.addEventListener("click", function(e){ e.stopPropagation(); viewM--; if(viewM<0){ viewM=11; viewY--; } render(); });
      var label = document.createElement("span");
      label.textContent = MONTH_NAMES[viewM] + " " + viewY;
      var next = document.createElement("button");
      next.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
      next.addEventListener("mousedown", function(e){ e.preventDefault(); });
      next.addEventListener("click", function(e){ e.stopPropagation(); viewM++; if(viewM>11){ viewM=0; viewY++; } render(); });
      head.appendChild(prev); head.appendChild(label); head.appendChild(next);
      pop.appendChild(head);

      var grid = document.createElement("div");
      grid.className = "dateCalGrid";
      DOW_NAMES.forEach(function(d){
        var el = document.createElement("div");
        el.className = "dow";
        el.textContent = d;
        grid.appendChild(el);
      });
      var firstDow = new Date(viewY, viewM, 1).getDay();
      var daysInMonth = new Date(viewY, viewM+1, 0).getDate();
      var daysInPrevMonth = new Date(viewY, viewM, 0).getDate();
      var today = isoToday();
      var cells = [];
      for(var i=firstDow-1; i>=0; i--) cells.push({d:daysInPrevMonth-i, other:true});
      for(var d=1; d<=daysInMonth; d++) cells.push({d:d, other:false});
      while(cells.length % 7 !== 0) cells.push({d:cells.length - (firstDow+daysInMonth) + 1, other:true});
      cells.forEach(function(c){
        var btn = document.createElement("button");
        btn.textContent = c.d;
        var iso = viewY + "-" + pad2(viewM+1) + "-" + pad2(c.d);
        if(c.other) btn.classList.add("otherMonth");
        if(!c.other && iso === today) btn.classList.add("today");
        if(!c.other && iso === currentIso) btn.classList.add("selected");
        btn.addEventListener("mousedown", function(e){ e.preventDefault(); });
        btn.addEventListener("click", function(e){
          e.stopPropagation();
          if(c.other) return;
          onPick(iso);
          closeFloatingPopovers();
        });
        grid.appendChild(btn);
      });
      pop.appendChild(grid);

      var foot = document.createElement("div");
      foot.className = "dateCalFoot";
      var todayBtn = document.createElement("button");
      todayBtn.textContent = "Today";
      todayBtn.addEventListener("mousedown", function(e){ e.preventDefault(); });
      todayBtn.addEventListener("click", function(e){ e.stopPropagation(); onPick(today); closeFloatingPopovers(); });
      var clearBtn2 = document.createElement("button");
      clearBtn2.textContent = "Clear";
      clearBtn2.addEventListener("mousedown", function(e){ e.preventDefault(); });
      clearBtn2.addEventListener("click", function(e){ e.stopPropagation(); onPick(""); closeFloatingPopovers(); });
      foot.appendChild(todayBtn); foot.appendChild(clearBtn2);
      pop.appendChild(foot);
    }
    render();
  }

  function dismissHint(){
    if(!hint.classList.contains("hidden")) hint.classList.add("hidden");
  }

  // ---------- calendar (.ics download, no account needed) ----------
  function icsEscape(s){
    return String(s||"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n");
  }
  function icsDate(d){
    var p = function(x){ return String(x).padStart(2,"0"); };
    return d.getUTCFullYear() + p(d.getUTCMonth()+1) + p(d.getUTCDate()) + "T" + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + "Z";
  }
  function ymd(d){ return d.getFullYear() + pad2(d.getMonth()+1) + pad2(d.getDate()); }
  function isoDate(d){ return d.getFullYear() + "-" + pad2(d.getMonth()+1) + "-" + pad2(d.getDate()); }
  // opts.allDay: date-only event. opts.alarm: an iCalendar TRIGGER (e.g. "-PT15M") so the calendar app reminds you.
  function buildIcs(summary, startDate, endDate, description, attendees, opts){
    opts = opts || {};
    var lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Stick-It//EN", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:" + Date.now() + "-" + Math.floor(rand(0,999999)) + "@stick-it",
      "DTSTAMP:" + icsDate(new Date())
    ];
    if(opts.allDay){
      var next = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 1);
      lines.push("DTSTART;VALUE=DATE:" + ymd(startDate), "DTEND;VALUE=DATE:" + ymd(next));
    } else {
      lines.push("DTSTART:" + icsDate(startDate), "DTEND:" + icsDate(endDate));
    }
    lines.push("SUMMARY:" + icsEscape(summary), "DESCRIPTION:" + icsEscape(description || ""));
    (attendees || []).forEach(function(email){ lines.push("ATTENDEE:mailto:" + email); });
    if(opts.alarm){
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsEscape(summary), "TRIGGER:" + opts.alarm, "END:VALARM");
    }
    lines.push("END:VEVENT", "END:VCALENDAR");
    return lines.join("\r\n");
  }
  function localTimeZone(){
    try{ return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; }catch(e){ return ""; }
  }
  // Google Calendar's "create event" page, prefilled. Nothing is saved until the user confirms there.
  function googleCalendarUrl(title, start, end, allDay, details){
    function stamp(d){ return ymd(d) + "T" + pad2(d.getHours()) + pad2(d.getMinutes()) + "00"; }
    var dates = allDay
      ? ymd(start) + "/" + ymd(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1))
      : stamp(start) + "/" + stamp(end);
    var tz = localTimeZone();
    return "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" + encodeURIComponent(title) + "&dates=" + dates +
      (!allDay && tz ? "&ctz=" + encodeURIComponent(tz) : "") +
      "&details=" + encodeURIComponent(details || "");
  }

  function openCalendarPopover(n, triggerBtn){
    var pop = openFloatingPopover(triggerBtn, "calPop");
    if(!pop) return;
    var plain = getPlainText(n.el.querySelector(".text")) || "Sticky note reminder";
    var defaultTitle = plain.split("\n")[0].slice(0,120);

    pop.innerHTML =
      '<div><label>Event title</label><input type="text" id="calTitle"></div>' +
      '<div><label>Attendees (optional, comma-separated emails)</label><input type="text" id="calAttendees" placeholder="jane@example.com, sam@example.com"></div>' +
      '<button class="btn primary" id="calSubmit" style="margin:2px 0 0;">Download calendar invite (.ics)</button>' +
      '<p class="muted" style="margin:0;font-size:0.72rem;">Opens in Google Calendar, Outlook, or Apple Calendar, whichever you import it into.</p>';

    var titleInput = pop.querySelector("#calTitle");
    var attendeesInput = pop.querySelector("#calAttendees");
    var submitBtn = pop.querySelector("#calSubmit");
    titleInput.value = defaultTitle;
    [titleInput, attendeesInput].forEach(function(el2){
      el2.addEventListener("mousedown", function(e){ e.stopPropagation(); });
      el2.addEventListener("click", function(e){ e.stopPropagation(); });
    });
    submitBtn.addEventListener("mousedown", function(e){ e.preventDefault(); });

    submitBtn.addEventListener("click", function(e){
      e.stopPropagation();
      var timeStr = n.dueTime || "09:00";
      var startDate = new Date(n.due + "T" + timeStr + ":00");
      var endDate = new Date(startDate.getTime() + 60*60*1000);
      var attendees = attendeesInput.value.split(",").map(function(s){ return s.trim(); }).filter(Boolean);
      var summary = titleInput.value.trim() || defaultTitle;
      var ics = buildIcs(summary, startDate, endDate, plain, attendees, {alarm:"-PT15M"});
      downloadBlob("stickit-event.ics", new Blob([ics], {type:"text/calendar;charset=utf-8"}));
      closeFloatingPopovers();
      toast("Downloaded \u201c" + summary + "\u201d as a calendar invite.");
    });
  }

  // ---------- smart dates: "Dentist Tuesday 17:30", "Buy milk tomorrow", "מחר ב-17:30" ----------
  // Pure text -> matches. Nothing here touches the DOM, so the same detector can later
  // drive server-side reminders.
  var SmartDates = (function(){
    var WD_FULL = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    var WD_ABBR = {sun:0, mon:1, tue:2, tues:2, wed:3, thu:4, thur:4, thurs:4, fri:5, sat:6};
    var MONTHS = {jan:0,january:0,feb:1,february:1,mar:2,march:2,apr:3,april:3,may:4,jun:5,june:5,jul:6,july:6,aug:7,august:7,sep:8,sept:8,september:8,oct:9,october:9,nov:10,november:10,dec:11,december:11};
    var HE_WD = {"ראשון":0,"שני":1,"שלישי":2,"רביעי":3,"חמישי":4,"שישי":5};
    var MONTH_RE = "(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)";
    var WD_RE = "(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tues|tue|wed|thurs|thur|thu|fri|sat)";
    var monthFirst = /^en-us/i.test(navigator.language || "");

    function day0(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
    function addDays(d, k){ return new Date(d.getFullYear(), d.getMonth(), d.getDate() + k); }
    function mkDate(yearStr, month, day, today){
      var y = yearStr ? +yearStr : today.getFullYear();
      if(yearStr && yearStr.length === 2) y += 2000;
      var d = new Date(y, month, day);
      if(d.getMonth() !== month || d.getDate() !== day) return null;
      if(!yearStr && d < today) d = new Date(y + 1, month, day);
      return d;
    }

    function findDates(text, now){
      var out = [], today = day0(now), m, re;
      function push(index, length, date, meta){ if(date) out.push({index:index, length:length, date:date, meta:meta || {}}); }

      re = /\b(day after tomorrow|tomorrow|tmrw|today|tonight)\b/gi;
      while((m = re.exec(text))){
        var w = m[1].toLowerCase();
        push(m.index, m[0].length, w === "day after tomorrow" ? addDays(today, 2) : (w === "today" || w === "tonight") ? today : addDays(today, 1));
      }
      // weekdays; abbreviations only when capitalised, so "sat on the sofa" stays plain text
      re = new RegExp("\\b(?:(next|this)\\s+)?" + WD_RE + "\\b", "gi");
      while((m = re.exec(text))){
        var word = m[2], lower = word.toLowerCase();
        var dow = WD_FULL.indexOf(lower);
        if(dow === -1){
          if(word.charAt(0) === word.charAt(0).toLowerCase()) continue;
          dow = WD_ABBR[lower];
        }
        var delta = (dow - today.getDay() + 7) % 7;
        push(m.index, m[0].length, addDays(today, delta === 0 ? 7 : delta), {sameDay: delta === 0});
      }
      re = new RegExp("\\b" + MONTH_RE + "\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b", "gi");
      while((m = re.exec(text))){
        if(m[1].toLowerCase() === "may" && !/\d/.test(m[2])) continue;
        push(m.index, m[0].length, mkDate(m[3], MONTHS[m[1].toLowerCase()], +m[2], today));
      }
      re = new RegExp("\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?" + MONTH_RE + "\\.?(?:,?\\s+(\\d{4}))?\\b", "gi");
      while((m = re.exec(text))) push(m.index, m[0].length, mkDate(m[3], MONTHS[m[2].toLowerCase()], +m[1], today));
      re = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g;
      while((m = re.exec(text))) push(m.index, m[0].length, mkDate(m[1], +m[2] - 1, +m[3], today));
      // 6/10 or 6/10/2026; without a year it only counts next to a time ("1/2 cup" is not a date)
      re = /(^|[^\d\/])(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?(?![\d\/])/g;
      while((m = re.exec(text))){
        var a = +m[2], b = +m[3];
        var mo = monthFirst ? a : b, da = monthFirst ? b : a;
        push(m.index + m[1].length, m[0].length - m[1].length, mkDate(m[4], mo - 1, da, today), {weak: !m[4]});
      }
      re = /\bin\s+(\d{1,2})\s+(days?|weeks?)\b/gi;
      while((m = re.exec(text))) push(m.index, m[0].length, addDays(today, +m[1] * (/^w/i.test(m[2]) ? 7 : 1)));
      // Hebrew: היום, הערב, מחר, מחרתיים, יום שלישי, שבת (optionally with a ב/ו/ל prefix)
      re = /(^|[^\u0590-\u05FF])([בול]?)(מחרתיים|מחר|היום|הערב|יום\s+(ראשון|שני|שלישי|רביעי|חמישי|שישי)|שבת)(?![\u0590-\u05FF])/g;
      while((m = re.exec(text))){
        var idx = m.index + m[1].length + m[2].length;
        var hw = m[3], hd;
        if(hw === "מחרתיים") hd = addDays(today, 2);
        else if(hw === "מחר") hd = addDays(today, 1);
        else if(hw === "היום" || hw === "הערב") hd = today;
        else {
          var hdow = hw === "שבת" ? 6 : HE_WD[m[4]];
          var hdelta = (hdow - today.getDay() + 7) % 7;
          hd = addDays(today, hdelta === 0 ? 7 : hdelta);
          push(idx, hw.length, hd, {sameDay: hdelta === 0});
          continue;
        }
        push(idx, hw.length, hd);
      }
      return out;
    }

    function findTimes(text){
      var out = [], m, re;
      re = /\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s?(am|pm|a\.m\.|p\.m\.)(?![a-z])/gi;
      while((m = re.exec(text))){
        var pm = /^p/i.test(m[3]);
        out.push({index:m.index, length:m[0].length, h:(+m[1] % 12) + (pm ? 12 : 0), min:+(m[2] || 0)});
      }
      re = /(^|[^\d:.])([01]?\d|2[0-3]):([0-5]\d)(?![\d:])/g;
      while((m = re.exec(text))){
        var start = m.index + m[1].length, len = m[0].length - m[1].length;
        if(out.some(function(t){ return start < t.index + t.length && t.index < start + len; })) continue;
        out.push({index:start, length:len, h:+m[2], min:+m[3]});
      }
      re = /\b(noon|midday|midnight)\b/gi;
      while((m = re.exec(text))) out.push({index:m.index, length:m[0].length, h:/night/i.test(m[1]) ? 0 : 12, min:0});
      return out.sort(function(a, b){ return a.index - b.index; });
    }

    function overlaps(a, b){ return a.index < b.index + b.length && b.index < a.index + a.length; }

    function detect(text, now){
      now = now || new Date();
      var dates = findDates(text, now).sort(function(a, b){ return a.index - b.index || b.length - a.length; });
      var kept = [];
      dates.forEach(function(d){ if(!kept.some(function(k){ return overlaps(k, d); })) kept.push(d); });
      var times = findTimes(text);
      var used = {}, results = [];
      var GAP = /^[\s,]*(?:at|@|around|by|from|בשעה|ב[-\u05BE]?)?[\s-]*$/i;
      kept.forEach(function(d){
        var best = null;
        times.forEach(function(t, ti){
          if(used[ti] || best) return;
          var gap = null;
          if(t.index >= d.index + d.length) gap = text.slice(d.index + d.length, t.index);
          else if(t.index + t.length <= d.index) gap = text.slice(t.index + t.length, d.index);
          if(gap !== null && gap.length <= 9 && GAP.test(gap)) best = {t:t, ti:ti};
        });
        if(d.meta.weak && !best) return;
        var start = d.index, end = d.index + d.length, date = new Date(d.date), allDay = true;
        if(best){
          used[best.ti] = true;
          start = Math.min(start, best.t.index);
          end = Math.max(end, best.t.index + best.t.length);
          date.setHours(best.t.h, best.t.min, 0, 0);
          allDay = false;
          if(d.meta.sameDay){
            // "Tuesday 17:30" written on a Tuesday morning means today
            var todayAt = day0(now); todayAt.setHours(best.t.h, best.t.min, 0, 0);
            if(todayAt > now) date = todayAt;
          }
        }
        results.push({index:start, length:end - start, date:date, allDay:allDay});
      });
      times.forEach(function(t, ti){
        if(used[ti] || results.some(function(r){ return overlaps(r, t); })) return;
        var date = day0(now); date.setHours(t.h, t.min, 0, 0);
        if(date < now){ date = addDays(day0(now), 1); date.setHours(t.h, t.min, 0, 0); }
        results.push({index:t.index, length:t.length, date:date, allDay:false});
      });
      return results.sort(function(a, b){ return a.index - b.index; });
    }
    return {detect:detect};
  })();

  // ---------- text index: maps plain-text offsets back to DOM ranges ----------
  var BLOCK_TAGS = /^(DIV|P|LI|H1|H2|H3|UL|OL|BR)$/;
  function textIndex(root){
    var parts = [], nodes = [], len = 0;
    function brk(){ if(len && parts[parts.length-1] !== "\n"){ parts.push("\n"); len += 1; } }
    (function walk(node){
      for(var c = node.firstChild; c; c = c.nextSibling){
        if(c.nodeType === 3){ nodes.push({node:c, start:len}); parts.push(c.nodeValue); len += c.nodeValue.length; }
        else if(c.nodeType === 1){
          var block = BLOCK_TAGS.test(c.tagName);
          if(block) brk();
          walk(c);
          if(block && c.tagName !== "BR") brk();
        }
      }
    })(root);
    return {text:parts.join(""), nodes:nodes};
  }
  function rangeFor(index, start, end){
    var s = null, e = null;
    for(var i=0; i<index.nodes.length; i++){
      var it = index.nodes[i], L = it.node.nodeValue.length;
      if(!s && start >= it.start && start < it.start + L) s = {node:it.node, off:start - it.start};
      if(end > it.start && end <= it.start + L){ e = {node:it.node, off:end - it.start}; break; }
    }
    if(!s || !e) return null;
    var r = document.createRange();
    try{ r.setStart(s.node, s.off); r.setEnd(e.node, e.off); }catch(err){ return null; }
    return r;
  }

  // ---------- decorations (search matches, detected dates) via the CSS Highlight API ----------
  // Highlights never modify the note's HTML, so they can't leak into saved content or undo.
  var decor = {search:new Map(), date:new Map()};
  var canHighlight = !!(window.CSS && CSS.highlights && window.Highlight);
  function syncHighlight(kind){
    if(!canHighlight) return;
    var ranges = [];
    decor[kind].forEach(function(list){ list.forEach(function(it){ ranges.push(it.range || it); }); });
    CSS.highlights.set("stickit-" + kind, new Highlight(...ranges));
  }
  function refreshDates(n){
    if(!n.textEl) return;
    var idx = textIndex(n.textEl);
    var found = SmartDates.detect(idx.text, new Date());
    var list = [];
    found.forEach(function(m){
      var r = rangeFor(idx, m.index, m.index + m.length);
      if(r) list.push({range:r, match:m});
    });
    if(list.length) decor.date.set(n.id, list); else decor.date.delete(n.id);
    syncHighlight("date");
  }
  function clearDecorations(id){
    decor.search.delete(id); decor.date.delete(id);
    syncHighlight("search"); syncHighlight("date");
  }
  function dateAtPoint(n, x, y){
    var list = decor.date.get(n.id);
    if(!list) return null;
    for(var i=0; i<list.length; i++){
      var rects = list[i].range.getClientRects();
      for(var j=0; j<rects.length; j++){
        var rc = rects[j];
        if(x >= rc.left - 2 && x <= rc.right + 2 && y >= rc.top - 2 && y <= rc.bottom + 2) return list[i];
      }
    }
    return null;
  }
  function eventTitleFor(n, m){
    var text = textIndex(n.textEl).text;
    var lineStart = text.lastIndexOf("\n", m.index - 1) + 1;
    var lineEnd = text.indexOf("\n", m.index); if(lineEnd === -1) lineEnd = text.length;
    var line = text.slice(lineStart, lineEnd);
    var cuts = SmartDates.detect(line, new Date());
    var stripped = line;
    for(var i = cuts.length - 1; i >= 0; i--) stripped = stripped.slice(0, cuts[i].index) + " " + stripped.slice(cuts[i].index + cuts[i].length);
    stripped = stripped.replace(/\s+(at|on|by|and|ב|בשעה|ו)\s*$/i, "").replace(/\s+(at|on|by|and)(\s+(at|on|by|and))+\b/gi, " $1").replace(/\s{2,}/g, " ").trim();
    return (stripped || line.trim() || "Reminder").slice(0, 120);
  }
  function openDatePopover(n, item, x, y){
    var m = item.match;
    var pop = openFloatingPopoverAt({left:x - 1, right:x + 1, top:y - 12, bottom:y + 12, width:2, height:24}, "datePop", null);
    if(!pop) return;
    var when;
    try{
      when = new Intl.DateTimeFormat(undefined, m.allDay
        ? {weekday:"short", month:"short", day:"numeric"}
        : {weekday:"short", month:"short", day:"numeric", hour:"numeric", minute:"2-digit"}).format(m.date);
    }catch(e){ when = m.date.toString(); }
    var title = eventTitleFor(n, m);
    var details = getPlainText(n.textEl);
    var end = new Date(m.date.getTime() + 60*60*1000);
    pop.innerHTML =
      '<div class="when"></div><div class="tz"></div>' +
      '<button class="pillBtn primary" data-act="gcal">' + ICONS.cal + '<span>Add to Google Calendar</span></button>' +
      '<button class="pillBtn" data-act="ics">' + ICONS.bell + '<span>Add reminder (.ics file)</span></button>' +
      (readOnly ? '' : '<button class="pillBtn" data-act="due">' + ICONS.task + '<span>Mark this note due then</span></button>') +
      '<p class="muted" style="margin:4px 0 0;font-size:0.68rem;">Nothing is added until you confirm it in your calendar.</p>';
    pop.querySelector(".when").textContent = when;
    pop.querySelector(".tz").textContent = "\u201c" + title + "\u201d" + (localTimeZone() ? " \u00b7 " + localTimeZone().replace(/_/g, " ") : "");
    pop.addEventListener("mousedown", function(e){ e.preventDefault(); });
    pop.addEventListener("click", function(e){
      var b = e.target.closest("[data-act]");
      if(!b) return;
      e.stopPropagation();
      var act = b.getAttribute("data-act");
      if(act === "gcal"){
        window.open(googleCalendarUrl(title, m.date, end, m.allDay, details), "_blank", "noopener");
      } else if(act === "ics"){
        var ics = buildIcs(title, m.date, end, details, [], {allDay:m.allDay, alarm: m.allDay ? "PT9H" : "-PT15M"});
        downloadBlob("stickit-reminder.ics", new Blob([ics], {type:"text/calendar;charset=utf-8"}));
        toast("Open the downloaded file to add the reminder to your calendar.");
      } else if(act === "due"){
        var before = captureState([n.id]);
        n.isTask = true;
        n.due = isoDate(m.date);
        if(!m.allDay) n.dueTime = pad2(m.date.getHours()) + ":" + pad2(m.date.getMinutes());
        saveNotes();
        rerenderNote(n);
        recordChange("Set due date", before);
      }
      closeFloatingPopovers();
    });
  }

  // ---------- undo / redo for board actions ----------
  // Actions store field-level diffs of just the notes they touched. Text edits keep
  // the browser's own undo, so `html` is deliberately not tracked here: undoing a
  // move never throws away words typed after the move.
  var undoStack = [], redoStack = [], HISTORY_MAX = 30;
  var TRACK_FIELDS = ["x","y","w","bg","font","fontManual","rot","phys","categoryIndex","isTask","done","due","dueTime","image","imgW","imgRatio","photoStyle","caption","captionFont","cutBorder","doneAt","doneBy","h","rip","pinned","carry","fields","cur","createdFromPreset","items","cutoutKey","cutoutAssetId","cutoutRatio","backing","cosmetic","title","date","body","amount","variant","dateTime","place","details","orient","location","message","recipient","frames","pileId","members","ox","oy","edges","url","provider","vid","start"];
  function findNote(id){ for(var i=0; i<notes.length; i++){ if(notes[i].id === id) return notes[i]; } return null; }
  function snapNote(n){ var o = serializeNote(n); if(o.phys) o.phys = Object.assign({}, o.phys); return o; }
  function captureState(ids){
    var m = {};
    ids.forEach(function(id){ var n = findNote(id); m[id] = n ? snapNote(n) : null; });
    return m;
  }
  function sameVal(a, b){
    if(a === b) return true;
    if(a && b && typeof a === "object") return JSON.stringify(a) === JSON.stringify(b);
    return false;
  }
  function pushHistory(action){
    undoStack.push(action);
    if(undoStack.length > HISTORY_MAX) undoStack.shift();
    redoStack = [];
    return action;
  }
  function recordChange(label, before, opts){
    opts = opts || {};
    var ids = Object.keys(before);
    (opts.newIds || []).forEach(function(id){ if(ids.indexOf(id) === -1) ids.push(id); });
    var after = captureState(ids);
    var changes = [];
    ids.forEach(function(id){
      var b = before[id] || null, a = after[id] || null;
      if(!b && !a) return;
      if(b && a){
        var fb = {}, fa = {}, any = false;
        TRACK_FIELDS.forEach(function(k){ if(!sameVal(b[k], a[k])){ fb[k] = b[k]; fa[k] = a[k]; any = true; } });
        if(any) changes.push({id:id, kind:"fields", before:fb, after:fa});
      } else {
        changes.push({id:id, kind:"exist", before:b, after:a});
      }
    });
    if(!changes.length) return null;
    var top = undoStack[undoStack.length - 1];
    if(opts.coalesce && top && top.key === opts.coalesce && Date.now() - top.t < 1200 && !redoStack.length){
      // successive nudges/resizes collapse into one step
      changes.forEach(function(c){
        var prev = top.changes.filter(function(x){ return x.id === c.id && x.kind === "fields"; })[0];
        if(prev && c.kind === "fields"){
          Object.keys(c.after).forEach(function(k){ if(!(k in prev.before)) prev.before[k] = c.before[k]; prev.after[k] = c.after[k]; });
        } else top.changes.push(c);
      });
      top.t = Date.now();
      return top;
    }
    return pushHistory({label:label, changes:changes, key:opts.coalesce || null, t:Date.now()});
  }
  function applySide(changes, side){
    var other = side === "before" ? "after" : "before";
    var changed = false;
    changes.forEach(function(c){
      var n = findNote(c.id);
      if(c.kind === "fields"){
        if(!n) return;
        Object.keys(c[side]).forEach(function(k){ c[other][k] = n[k]; n[k] = c[side][k]; });
        changed = true;
        rerenderNote(n);
      } else {
        var target = c[side];
        if(n) c[other] = snapNote(n); // remember what was there, including later text edits
        if(!target){
          if(n){
            removeNoteEl(n, true);
            notes.splice(notes.indexOf(n), 1);
            selected.delete(n.id);
            clearDecorations(n.id);
            changed = true;
          }
        } else if(n){
          SERIAL_FIELDS.forEach(function(k){ if(k in target) n[k] = target[k]; });
          if(!("pileId" in target)) delete n.pileId;
          if(n.members) n.members = n.members.slice();
          rerenderNote(n); changed = true;
        } else {
          var copy = Object.assign({}, target);
          if(copy.phys) copy.phys = Object.assign({}, copy.phys);
          notes.push(copy);
          renderNote(copy, true, {focus:false});
          changed = true;
        }
      }
    });
    return changed;
  }
  function afterHistoryApply(){
    syncPileVisibility();
    ensureWidth(); saveNotes(); updateCount(); updateMinimap(); applySelection();
  }
  function lowerFirst(str){ return str.charAt(0).toLowerCase() + str.slice(1); }
  function undo(){
    while(undoStack.length){
      var a = undoStack.pop();
      var ok = a.custom ? a.undo() : applySide(a.changes, "before");
      redoStack.push(a);
      if(ok){ afterHistoryApply(); toast("Undid: " + lowerFirst(a.label)); return true; }
    }
    toast("Nothing to undo.");
    return false;
  }
  function redo(){
    while(redoStack.length){
      var a = redoStack.pop();
      var ok = a.custom ? a.redo() : applySide(a.changes, "after");
      undoStack.push(a);
      if(ok){ afterHistoryApply(); toast("Redid: " + lowerFirst(a.label)); return true; }
    }
    return false;
  }
  function undoIfTop(action){
    if(action && undoStack[undoStack.length - 1] === action) undo();
    else toast("Press " + MOD + "+Z to undo.");
  }

  // ---------- selection ----------
  var selected = new Set();
  function selectedNotes(){ return notes.filter(function(n){ return selected.has(n.id); }); }
  function applySelection(){
    notes.forEach(function(n){ if(n.el) n.el.classList.toggle("selected", selected.has(n.id)); });
    document.body.classList.toggle("multi-sel", selected.size > 1);
    document.body.classList.toggle("hasSel", selected.size > 0);          // the selected object owns attention: neighbours go quiet (CSS)
    renderSelBar();
    if(typeof syncRotHandle === "function") syncRotHandle();
  }
  function setSelection(ids){
    var prev = Array.from(selected);
    selected = new Set(ids.filter(function(id){ return !!findNote(id) && !hiddenIds[id]; }));
    applySelection();
    if(window.Stick && Stick.collab) Stick.collab.setActive(selected.size === 1 ? Array.from(selected)[0] : null);
    prev.forEach(function(id){ if(!selected.has(id)){ var p = findNote(id); if(p) scheduleCleanup(p); } });
  }
  function toggleSelected(id){
    var ids = Array.from(selected);
    var i = ids.indexOf(id);
    if(i === -1) ids.push(id); else ids.splice(i, 1);
    setSelection(ids);
  }
  function clearSelection(){ if(selected.size) setSelection([]); }

  // ---------- note content helpers ----------
  // the words someone can see on an item (a note's writing, a photo's caption)
  function itemText(n){
    if(isPaper(n)) return Stick.objects.text(n);
    if(isObj(n)) return n.caption || "";
    return n.textEl ? getPlainText(n.textEl) : htmlToText(n.html || "").trim();
  }
  function itemWord(list){
    function kind(n){ return n.type === "pile" ? "pile" : n.type === "audio" ? "recording" : n.type === "video" ? "video" : isPhoto(n) ? "photo" : isPaper(n) ? Stick.objects.LABELS[n.type] : "note"; }
    var kinds = list.map(kind);
    if(list.length === 1) return kinds[0];
    return kinds.every(function(k){ return k === kinds[0]; }) ? kinds[0] + "s" : "items";
  }
  function noteHasContent(n){
    if(n && (n.type === "zone" || n.type === "pile" || n.type === "embed")) return true;               // a zone is the user’s own layout, a pile holds other notes: never "empty"
    if(isPaper(n)) return Stick.objects.hasContent(n);
    if(isObj(n) || n.image) return true;
    if(n.isTask && n.due) return true;
    var html = n.textEl ? n.textEl.innerHTML : (n.html || "");
    if(/<ul[^>]*checklist/i.test(html)) return true;
    var t = n.textEl ? n.textEl.textContent : htmlToText(html);
    return !!t.replace(/[\s\u200b\u00a0]/g, "");
  }
  function focusNoScroll(el){ try{ el.focus({preventScroll:true}); }catch(e){ el.focus(); } }
  function selectionIn(textEl){
    var sel = window.getSelection();
    if(!sel || !sel.rangeCount) return null;
    var r = sel.getRangeAt(0);
    return textEl.contains(r.commonAncestorContainer) ? r : null;
  }
  function placeCaretAt(node, offset){
    var r = document.createRange();
    r.setStart(node, offset); r.collapse(true);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  // Toolbar actions need a caret inside the note; without one, work at the end of the text.
  function ensureCaret(textEl){
    if(document.activeElement !== textEl) focusNoScroll(textEl);
    if(!selectionIn(textEl)){
      var r = document.createRange();
      r.selectNodeContents(textEl); r.collapse(false);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    }
  }
  function closestIn(node, selector, root){
    var el = node && (node.nodeType === 1 ? node : node.parentElement);
    el = el && el.closest(selector);
    return el && el !== root && root.contains(el) ? el : null;
  }
  // dragging or building a selection means you've stopped typing, so board shortcuts apply again
  function endEditing(){
    var ae = document.activeElement;
    if(ae && ae.isContentEditable) ae.blur();
  }
  function notifyInput(textEl){ textEl.dispatchEvent(new Event("input", {bubbles:true})); }
  // removing attributes never moves nodes, so the caret stays put
  function stripInlineStyles(root){
    Array.prototype.forEach.call(root.querySelectorAll("[style],[class]:not(mark):not(ul),font"), function(el){
      el.removeAttribute("style");
      if(el.tagName !== "MARK" && el.tagName !== "UL") el.removeAttribute("class");
      if(el.tagName === "FONT"){ el.removeAttribute("face"); el.removeAttribute("color"); el.removeAttribute("size"); }
    });
  }
  function execIn(textEl, cmd, value){
    ensureCaret(textEl);
    try{ document.execCommand(cmd, false, value || null); }catch(e){}
    notifyInput(textEl);
  }
  function toggleHeading(textEl, level){
    ensureCaret(textEl);
    var cur = "";
    try{ cur = String(document.queryCommandValue("formatBlock") || "").toLowerCase(); }catch(e){}
    execIn(textEl, "formatBlock", cur === "h" + level ? "<div>" : "<h" + level + ">");
  }

  // Ctrl/Cmd+U underlines inside a note. This listener runs first (capture phase, on the window) so the browser never gets to open its
  // view-source page while someone is writing, whichever element has focus and whatever the keyboard layout.
  window.addEventListener("keydown", function(e){
    if(!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || !(e.code === "KeyU" || (e.key && e.key.toLowerCase() === "u"))) return;
    var ae = document.activeElement, editing = ae && ae.isContentEditable && ae.classList && ae.classList.contains("text");
    if(editing){ e.preventDefault(); e.stopPropagation(); if(!readOnly) execIn(ae, "underline"); return; }
    if(!readOnly && !singleNoteMode && (selected.size || isTyping())) e.preventDefault();       // a selected note or a field: never view-source
  }, true);

  // ---------- selection tip: a small Stick-It toolbar over the words you highlight ----------
  // Appears above selected text inside the note you are editing (Bold, Italic, Underline, Highlight, Link, Title line). The browser's own
  // selection menu stays out of the way on desktop; this one carries the same actions the note's ... menu has.
  var selTip = null, selTipRaf = 0, selTipText = null;
  var selTipLayer = OV.layer("selection-tip", function(){ hideSelTip(); }, function(){ return !!selTip; });
  function hideSelTip(){ if(selTip){ selTip.remove(); selTip = null; selTipText = null; selTipLayer.close(); } }
  function selTipTarget(){
    if(readOnly || singleNoteMode || focusState) return null;
    var sel = window.getSelection(); if(!sel || sel.isCollapsed || !sel.rangeCount || !String(sel).trim()) return null;
    var ae = document.activeElement; if(!ae || !ae.isContentEditable || !ae.classList.contains("text")) return null;
    var r = sel.getRangeAt(0); if(!ae.contains(r.commonAncestorContainer)) return null;
    var rect = r.getBoundingClientRect(); if(!rect.width && !rect.height) return null;
    return {text: ae, rect: rect};
  }
  function showSelTip(t){
    var fresh = !selTip || selTipText !== t.text;
    if(fresh){
      hideSelTip();
      var bar = makeDiv("floatPop selTip"), grid = makeDiv("fmtGrid");
      bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", "Format the selected words");
      function add(html, label, run, key){
        var b = document.createElement("button"); b.type = "button"; b.innerHTML = html; b.title = label; b.setAttribute("aria-label", label); if(key) b.dataset.k = key;
        b.addEventListener("mousedown", function(e){ e.preventDefault(); });
        b.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
        b.addEventListener("click", function(e){ e.stopPropagation(); run(b); setTimeout(paintSelTip, 0); });
        grid.appendChild(b); return b;
      }
      var tx = t.text;
      [1, 2].forEach(function(lv){ add("H" + lv, "Heading " + lv, function(){ toggleHeading(tx, lv); }, "h" + lv); });
      add(ICONS.bold, "Bold (" + MOD + "+B)", function(){ execIn(tx, "bold"); }, "bold");
      add(ICONS.italic, "Italic (" + MOD + "+I)", function(){ execIn(tx, "italic"); }, "italic");
      add(ICONS.underline, "Underline (" + MOD + "+U)", function(){ execIn(tx, "underline"); }, "underline");
      add(ICONS.highlighter, "Highlight selected text", function(){ toggleHighlight(tx); }, "mark");
      add(ICONS.checklist, "Checklist", function(){ setListKind(tx, "check"); }, "check");
      add(ICONS.link, "Link", function(b){ openLinkPopover(tx, b); }, "link");
      bar.appendChild(grid);
      document.body.appendChild(bar); selTip = bar; selTipText = t.text; selTipLayer.open();
    }
    paintSelTip(t);
  }
  function paintSelTip(t){
    if(!selTip) return;
    t = t || selTipTarget(); if(!t){ hideSelTip(); return; }
    var bar = selTip, bw = bar.offsetWidth, bh = bar.offsetHeight, vw = window.innerWidth;
    var left = Math.min(Math.max(8, t.rect.left + t.rect.width / 2 - bw / 2), vw - bw - 8);
    var top = t.rect.top - bh - 10;
    if(top < 8) top = t.rect.bottom + 10;
    bar.style.left = left + "px"; bar.style.top = top + "px";
    var st = {};
    try{ st.bold = document.queryCommandState("bold"); st.italic = document.queryCommandState("italic"); st.underline = document.queryCommandState("underline"); }catch(e){}
    var r = selectionIn(t.text);
    if(r){ var nd = r.startContainer; st.h1 = !!closestIn(nd, "h1", t.text); st.h2 = !!closestIn(nd, "h2", t.text); st.mark = !!closestIn(nd, "mark", t.text); st.link = !!closestIn(nd, "a", t.text); st.check = listKind(currentList(t.text)) === "check"; }
    Array.prototype.forEach.call(bar.querySelectorAll("button"), function(b){ var on = !!st[b.dataset.k]; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
  }
  document.addEventListener("selectionchange", function(){
    cancelAnimationFrame(selTipRaf);
    selTipRaf = requestAnimationFrame(function(){ var t = selTipTarget(); if(t) showSelTip(t); else hideSelTip(); });
  });
  window.addEventListener("scroll", function(){ if(selTip) paintSelTip(); }, true);
  window.addEventListener("resize", function(){ if(selTip) paintSelTip(); });

  // ---------- lists and checklists ----------
  function saveCaret(){
    var sel = window.getSelection();
    if(!sel.rangeCount) return null;
    var r = sel.getRangeAt(0);
    return {sc:r.startContainer, so:r.startOffset, ec:r.endContainer, eo:r.endOffset};
  }
  function restoreCaret(c){
    if(!c) return;
    try{
      var r = document.createRange();
      r.setStart(c.sc, c.so); r.setEnd(c.ec, c.eo);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    }catch(e){}
  }
  function currentList(textEl){
    var r = selectionIn(textEl);
    if(!r) return null;
    var li = closestIn(r.startContainer, "li", textEl);
    return li ? li.parentElement : null;
  }
  function listKind(list){
    if(!list) return null;
    if(list.tagName === "OL") return "ol";
    return list.classList.contains("checklist") ? "check" : "ul";
  }
  function retagList(list, kind){
    var tag = kind === "ol" ? "OL" : "UL";
    var target = list;
    if(list.tagName !== tag){
      target = document.createElement(tag);
      while(list.firstChild) target.appendChild(list.firstChild);
      list.parentNode.replaceChild(target, list);
    }
    if(kind === "check") target.className = "checklist"; else target.removeAttribute("class");
    Array.prototype.forEach.call(target.children, function(li, i){
      if(kind === "check"){
        // a first line that ends with a colon ("Flight checklist:") is a title, not something to tick
        if(i === 0 && li.getAttribute("data-title") !== "true" && /[:\uff1a]\s*$/.test(li.textContent) && target.children.length > 1) li.setAttribute("data-title", "true");
        if(li.getAttribute("data-title") === "true") li.removeAttribute("data-checked");
        else if(li.getAttribute("data-checked") !== "true") li.setAttribute("data-checked", "false");
      }
      else { li.removeAttribute("data-checked"); li.removeAttribute("data-title"); }
    });
    return target;
  }
  function setListKind(textEl, kind){
    ensureCaret(textEl);
    var list = currentList(textEl);
    var cur = listKind(list);
    var caret = saveCaret();
    var nativeCmd = kind === "ol" ? "insertOrderedList" : "insertUnorderedList";
    if(list && cur === kind){
      // same button again turns the list back into plain lines
      if(kind === "check"){ retagList(list, "ul"); restoreCaret(caret); }
      try{ document.execCommand(nativeCmd); }catch(e){}
    } else if(list){
      retagList(list, kind); restoreCaret(caret);
    } else {
      try{ document.execCommand(nativeCmd); }catch(e){}
      if(kind === "check"){
        var made = currentList(textEl);
        if(made){ var c2 = saveCaret(); retagList(made, "check"); restoreCaret(c2); }
      }
    }
    notifyInput(textEl);
  }
  // A checklist line can be a title: no box, bold, never ticked. Toggle it for the line the cursor is on.
  function toggleChecklistTitle(textEl){
    ensureCaret(textEl);
    var r = selectionIn(textEl), li = r && closestIn(r.startContainer, "li", textEl);
    if(!li || !li.parentElement.classList.contains("checklist")){ toast("Put the cursor on a checklist line first."); return; }
    if(li.getAttribute("data-title") === "true"){ li.removeAttribute("data-title"); li.setAttribute("data-checked", "false"); }
    else { li.setAttribute("data-title", "true"); li.removeAttribute("data-checked"); }
    notifyInput(textEl);
  }
  // Enter inside a checklist adds another item; Enter on an empty item leaves the list.
  // Returns true when the key belongs to a list (plain lists use the browser's behaviour).
  function handleListEnter(textEl, e){
    var r = selectionIn(textEl);
    if(!r) return false;
    var li = closestIn(r.startContainer, "li", textEl);
    if(!li) return false;
    var list = li.parentElement;
    if(!list.classList.contains("checklist")) return true;
    e.preventDefault();
    if(!r.collapsed) r.deleteContents();
    var empty = !li.textContent.replace(/[\u200b\s]/g, "");
    if(empty){
      var rest = document.createElement("ul");
      rest.className = "checklist";
      while(li.nextSibling) rest.appendChild(li.nextSibling);
      var line = document.createElement("div");
      line.appendChild(document.createElement("br"));
      list.parentNode.insertBefore(line, list.nextSibling);
      if(rest.children.length) line.parentNode.insertBefore(rest, line.nextSibling);
      li.remove();
      if(!list.children.length) list.remove();
      placeCaretAt(line, 0);
    } else {
      var tail = document.createRange();
      tail.setStart(r.startContainer, r.startOffset);
      tail.setEnd(li, li.childNodes.length);
      var frag = tail.extractContents();
      var next = document.createElement("li");
      next.setAttribute("data-checked", "false");
      next.appendChild(frag);
      if(!next.textContent) { next.innerHTML = ""; next.appendChild(document.createElement("br")); }
      if(!li.textContent) { li.innerHTML = ""; li.appendChild(document.createElement("br")); }
      li.parentNode.insertBefore(next, li.nextSibling);
      placeCaretAt(next, 0);
    }
    notifyInput(textEl);
    return true;
  }
  function checkboxHit(li, clientX){
    var rect = li.getBoundingClientRect();
    var scale = li.offsetWidth ? rect.width / li.offsetWidth : 1;
    var zone = (parseFloat(getComputedStyle(li).fontSize) || 18) * 1.4 * scale;
    return getComputedStyle(li).direction === "rtl" ? (rect.right - clientX) <= zone : (clientX - rect.left) <= zone;
  }

  // ---------- highlighter: select text, tap to mark; select marked text, tap to unmark ----------
  function splitRangeEdges(range){
    var sc = range.startContainer, so = range.startOffset, ec = range.endContainer, eo = range.endOffset;
    if(ec.nodeType === 3 && eo > 0 && eo < ec.length) ec.splitText(eo);
    if(sc.nodeType === 3 && so > 0 && so < sc.length){
      var tail = sc.splitText(so);
      if(ec === sc){ ec = tail; eo = eo - so; }
      sc = tail; so = 0;
    }
    var r = document.createRange();
    r.setStart(sc, so); r.setEnd(ec, eo);
    return r;
  }
  function textNodesInRange(range, root){
    var out = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var t;
    while((t = walker.nextNode())){
      if(!t.nodeValue.length || !range.intersectsNode(t)) continue;
      if(t === range.startContainer && range.startOffset >= t.length) continue;
      if(t === range.endContainer && range.endOffset === 0) continue;
      if(!t.nodeValue.trim() && /^(UL|OL)$/.test(t.parentNode.nodeName)) continue;
      out.push(t);
    }
    return out;
  }
  function wrapInMark(t){
    var m = document.createElement("mark");
    m.className = "hl";
    t.parentNode.insertBefore(m, t);
    m.appendChild(t);
  }
  function mergeMarks(root){
    Array.prototype.slice.call(root.querySelectorAll("mark.hl")).forEach(function(m){
      if(!m.parentNode) return;
      if(!m.textContent){ m.remove(); return; }
      var next = m.nextSibling;
      while(next && next.nodeType === 1 && next.matches("mark.hl")){
        while(next.firstChild) m.appendChild(next.firstChild);
        var gone = next; next = m.nextSibling; gone.remove();
      }
    });
  }
  function toggleHighlight(textEl){
    var r0 = selectionIn(textEl);
    if(!r0 || r0.collapsed){ toast("Select some text first, then tap the highlighter."); return; }
    var r = splitRangeEdges(r0);
    var nodes = textNodesInRange(r, textEl);
    if(!nodes.length) return;
    function markOf(t){ return closestIn(t, "mark.hl", textEl); }
    var allMarked = nodes.every(function(t){ return !t.nodeValue.trim() || markOf(t); });
    if(allMarked){
      var inSel = new Set(nodes), marks = [];
      nodes.forEach(function(t){ var mk = markOf(t); if(mk && marks.indexOf(mk) === -1) marks.push(mk); });
      marks.forEach(function(mk){
        var inner = [], w = document.createTreeWalker(mk, NodeFilter.SHOW_TEXT, null), x;
        while((x = w.nextNode())) inner.push(x);
        while(mk.firstChild) mk.parentNode.insertBefore(mk.firstChild, mk);
        mk.remove();
        // parts of the old stroke outside the selection stay highlighted
        inner.forEach(function(t){ if(!inSel.has(t) && t.nodeValue.length) wrapInMark(t); });
      });
    } else {
      nodes.forEach(function(t){ if(!markOf(t)) wrapInMark(t); });
    }
    mergeMarks(textEl);
    try{
      var last = nodes[nodes.length - 1];
      var nr = document.createRange();
      nr.setStart(nodes[0], 0); nr.setEnd(last, last.length);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(nr);
    }catch(e){}
    notifyInput(textEl);
  }

  // ---------- links ----------
  function normalizeUrl(u){
    u = String(u || "").trim();
    if(!u) return null;
    if(/^www\./i.test(u)) u = "https://" + u;
    else if(!/^[a-z][a-z0-9+.\-]*:/i.test(u)){
      if(/^[^\s\/]+\.[a-z]{2,}(\/\S*)?$/i.test(u)) u = "https://" + u;
      else return null;
    }
    return safeHref(u);
  }
  var URL_RE = /\b((?:https?:\/\/|www\.)[^\s<>"']*[^\s<>"'.,;:!?)\]}])/gi;
  function linkifyText(text){
    var out = "", last = 0;
    String(text).replace(URL_RE, function(m, url, idx){
      out += escapeHtml(text.slice(last, idx));
      var href = normalizeUrl(url);
      out += href ? '<a href="' + escapeAttr(href) + '">' + escapeHtml(url) + '</a>' : escapeHtml(url);
      last = idx + m.length;
      return m;
    });
    out += escapeHtml(text.slice(last));
    return out.replace(/\r?\n/g, "<br>");
  }
  function openLink(href){
    var h = safeHref(href);
    if(h) window.open(h, "_blank", "noopener");
  }
  function openLinkPopover(textEl, anchorEl){
    var range = selectionIn(textEl);
    var saved = range ? range.cloneRange() : null;
    var existing = saved ? closestIn(saved.startContainer, "a", textEl) : null;
    var pop = openFloatingPopover(anchorEl, "linkPop");
    if(!pop) return;
    pop.innerHTML = '<input type="text" inputmode="url" placeholder="Paste or type a link" aria-label="Link address" spellcheck="false"><div class="rowBtns"></div>';
    var input = pop.querySelector("input");
    var btns = pop.querySelector(".rowBtns");
    var selectedText = saved ? saved.toString() : "";
    input.value = existing ? existing.getAttribute("href") : (normalizeUrl(selectedText) ? selectedText.trim() : "");
    function restore(){
      focusNoScroll(textEl);
      if(saved){ var s = window.getSelection(); s.removeAllRanges(); s.addRange(saved); }
      else ensureCaret(textEl);
    }
    function apply(){
      var href = normalizeUrl(input.value);
      if(!href){ input.style.borderColor = "var(--danger)"; input.focus(); return; }
      restore();
      if(existing) existing.setAttribute("href", href);
      else if(saved && !saved.collapsed) document.execCommand("createLink", false, href);
      else document.execCommand("insertHTML", false, '<a href="' + escapeAttr(href) + '">' + escapeHtml(input.value.trim()) + '</a>&nbsp;');
      notifyInput(textEl);
      closeFloatingPopovers();
    }
    if(existing){
      var rm = document.createElement("button");
      rm.className = "pillBtn danger"; rm.textContent = "Remove";
      rm.addEventListener("click", function(e){
        e.stopPropagation();
        var r = document.createRange(); r.selectNodeContents(existing);
        focusNoScroll(textEl);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        document.execCommand("unlink");
        notifyInput(textEl);
        closeFloatingPopovers();
      });
      btns.appendChild(rm);
    }
    var ok = document.createElement("button");
    ok.className = "pillBtn primary"; ok.textContent = existing ? "Update" : "Add link";
    ok.addEventListener("click", function(e){ e.stopPropagation(); apply(); });
    btns.appendChild(ok);
    input.addEventListener("keydown", function(e){
      e.stopPropagation();
      if(e.key === "Enter"){ e.preventDefault(); apply(); }
      if(e.key === "Escape"){ closeFloatingPopovers(); restore(); }
    });
    setTimeout(function(){ input.focus(); input.select(); }, 0);
  }

  // hover preview: favicon, domain, address, and how to open it
  var linkCardEl = null, linkCardFor = null, linkShowTimer = null, linkHideTimer = null;
  function hideLinkCard(){
    clearTimeout(linkShowTimer); clearTimeout(linkHideTimer);
    if(linkCardEl) linkCardEl.remove();
    linkCardEl = null; linkCardFor = null;
  }
  function showLinkCard(a){
    var href = safeHref(a.getAttribute("href"));
    if(!href || !document.body.contains(a)) return;
    hideLinkCard();
    var u = null;
    try{ u = new URL(href); }catch(e){}
    var card = document.createElement("div");
    card.className = "linkCard";
    var fav = document.createElement("div"); fav.className = "fav";
    if(u && /^https?:$/.test(u.protocol)){
      var img = document.createElement("img");
      img.alt = ""; img.referrerPolicy = "no-referrer";
      img.src = u.origin + "/favicon.ico";
      img.onerror = function(){ fav.innerHTML = ICONS.globe; };
      fav.appendChild(img);
    } else fav.innerHTML = ICONS.globe;
    var meta = document.createElement("div"); meta.className = "meta";
    var dom = document.createElement("div"); dom.className = "dom";
    dom.textContent = u ? (u.hostname.replace(/^www\./, "") || href) : href;
    var url = document.createElement("div"); url.className = "url"; url.textContent = href;
    var how = document.createElement("div"); how.className = "how";
    var editable = a.closest(".text") && a.closest(".text").isContentEditable;
    how.textContent = editable ? (MOD + "+click to open") : "Click to open";
    meta.appendChild(dom); meta.appendChild(url); meta.appendChild(how);
    card.appendChild(fav); card.appendChild(meta);
    // the actions that fit THIS link: every link can be opened or copied; a supported video link can also be played on the board
    var acts = makeDiv("lcActs");
    function lcAct(label, fn, cls){ var b = document.createElement("button"); b.type = "button"; b.className = "lcBtn" + (cls ? " " + cls : ""); b.textContent = label; b.addEventListener("mousedown", function(e){ e.preventDefault(); }); b.addEventListener("click", function(e){ e.stopPropagation(); fn(); }); acts.appendChild(b); return b; }
    var vInfo = window.Stick && Stick.embed && !readOnly && a.closest(".note") ? Stick.embed.parse(href) : null;
    if(vInfo) lcAct("Play in Stick-It", function(){ hideLinkCard(); convertLinkToVideo(a, vInfo); }, "lcVideo");
    lcAct("Open", function(){ openLink(href); hideLinkCard(); });
    lcAct("Copy link", function(){ copyText(href).then(function(ok){ toast(ok ? "Link copied." : "Couldn\u2019t copy automatically."); }); hideLinkCard(); });
    card.appendChild(acts);
    card.addEventListener("mouseenter", function(){ clearTimeout(linkHideTimer); });
    card.addEventListener("mouseleave", function(){ linkHideTimer = setTimeout(hideLinkCard, 200); });
    card.addEventListener("click", function(){ openLink(href); hideLinkCard(); });
    document.body.appendChild(card);
    var r = a.getBoundingClientRect();
    var w = card.offsetWidth, h = card.offsetHeight;
    var left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
    var top = r.bottom + 8;
    if(top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
    card.style.left = left + "px"; card.style.top = top + "px";
    linkCardEl = card; linkCardFor = a;
  }
  // touch: there is no hover, so a tap on a link in a note shows the same actions (and a tap anywhere else puts them away)
  var lastPointerKind = "mouse";
  document.addEventListener("pointerdown", function(e){
    lastPointerKind = e.pointerType || "mouse";
    if(linkCardEl && !(e.target.closest && (e.target.closest(".linkCard") || e.target.closest(".text a[href]")))) hideLinkCard();
  }, true);
  document.addEventListener("click", function(e){
    var a = e.target.closest && e.target.closest(".text a[href]");
    if(a && (lastPointerKind === "touch" || lastPointerKind === "pen")){ e.preventDefault(); e.stopPropagation(); showLinkCard(a); }
  }, true);
  // a link that is already in a note becomes a video: a note that is only that link is replaced; otherwise the video is added beside the note
  // and the note keeps its words and its link. One undo step either way.
  function convertLinkToVideo(a, info){
    var noteEl = a.closest(".note"), n = noteEl && findNote(noteEl.dataset.id);
    if(!n || readOnly) return;
    endEditing();
    var only = Stick.embed.parse(htmlToText(n.textEl ? n.textEl.innerHTML : (n.html || "")).trim());
    if(only && only.id === info.id && only.provider === info.provider && !n.image){ linkToEmbed(n, info); return; }
    createEmbedAt(info, n.x + (n.el ? n.el.offsetWidth : 230) + 24, n.y);
    toast("Added the video beside the note. The link is still in the note.");
  }
  document.addEventListener("mouseover", function(e){
    var a = e.target.closest && e.target.closest(".text a[href]");
    if(a){
      clearTimeout(linkHideTimer);
      if(a === linkCardFor) return;
      clearTimeout(linkShowTimer);
      linkShowTimer = setTimeout(function(){ showLinkCard(a); }, 380);
    } else if(!(e.target.closest && e.target.closest(".linkCard"))){
      clearTimeout(linkShowTimer);
      if(linkCardEl){ clearTimeout(linkHideTimer); linkHideTimer = setTimeout(hideLinkCard, 200); }
    }
  });
  window.addEventListener("keydown", function(e){
    if(e.key === "Control" || e.key === "Meta") document.body.classList.add("mod-held");
    else if(linkCardEl) hideLinkCard();
  });
  window.addEventListener("keyup", function(e){ if(e.key === "Control" || e.key === "Meta") document.body.classList.remove("mod-held"); });
  window.addEventListener("blur", function(){ document.body.classList.remove("mod-held"); });

  // ---------- images inside notes ----------
  // Width is what the user chose (imgW) or a default that keeps the photo about
  // 150px tall; height is always derived from the natural ratio.
  var IMG_DEFAULT_H = 150, IMG_MIN_W = 48;
  function defaultImgW(n){ return n.imgRatio ? Math.round(IMG_DEFAULT_H / n.imgRatio) : null; }
  function sizeImage(img, n){
    var w = n.imgW || defaultImgW(n);
    img.style.width = w ? w + "px" : "100%";
    img.style.height = "auto";
  }
  function buildImageWrap(n, onRatio){
    var wrap = makeDiv("noteImgWrap");
    var img = document.createElement("img");
    img.alt = "Picture attached to this note (no description added)";     // user content: never invent a description
    img.draggable = false;
    img.addEventListener("load", function(){
      if(!img.naturalWidth) return;
      var r = +(img.naturalHeight / img.naturalWidth).toFixed(4);
      if(!n.imgRatio || Math.abs(n.imgRatio - r) > 0.01){
        n.imgRatio = r; // older notes learn their ratio the first time the photo loads
        sizeImage(img, n);
        if(onRatio) onRatio();
      }
    });
    sizeImage(img, n);
    if(n.image) img.src = n.image; else img.classList.add("pending");
    wrap.appendChild(img);
    // photos sit on the same side the writing starts from
    if(detectScript(htmlToText(n.html || "")) === "hebrew") wrap.classList.add("rtl");
    return {wrap:wrap, img:img};
  }
  function shrinkDataUrl(src, maxDim, quality){
    return new Promise(function(resolve){
      var im = new Image();
      im.onload = function(){
        var sc = Math.min(1, maxDim / Math.max(im.naturalWidth, im.naturalHeight));
        if(sc >= 1 && src.length < 60000){ resolve(src); return; }
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(im.naturalWidth * sc));
        c.height = Math.max(1, Math.round(im.naturalHeight * sc));
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      im.onerror = function(){ resolve(src); };
      im.src = src;
    });
  }
  var selectedImageNote = null;
  function selectImage(n){
    if(selectedImageNote && selectedImageNote !== n && selectedImageNote.el){
      var old = selectedImageNote.el.querySelector(".noteImgWrap");
      if(old) old.classList.remove("imgSel");
    }
    selectedImageNote = n;
    var w = n && n.el && n.el.querySelector(".noteImgWrap");
    if(w) w.classList.add("imgSel");
  }
  function clearImageSelection(){
    if(selectedImageNote && selectedImageNote.el){
      var w = selectedImageNote.el.querySelector(".noteImgWrap");
      if(w) w.classList.remove("imgSel");
    }
    selectedImageNote = null;
  }
  document.addEventListener("pointerdown", function(e){
    if(!selectedImageNote) return;
    var w = selectedImageNote.el && selectedImageNote.el.querySelector(".noteImgWrap");
    if(w && w.contains(e.target)) return;
    if(e.target.closest && e.target.closest(".floatPop")) return;
    clearImageSelection();
  }, true);
  function removeImage(n){
    var before = captureState([n.id]);
    n.image = null; n.imgW = null; n.imgRatio = null;
    if(selectedImageNote === n) selectedImageNote = null;
    saveNotes();
    rerenderNote(n);
    return recordChange("Remove image", before);
  }
  function resetImageSize(n){
    if(!n.imgW) return;
    var before = captureState([n.id]);
    n.imgW = null;
    saveNotes();
    rerenderNote(n);
    recordChange("Reset image size", before);
  }
  // drag the corner handle: width follows the pointer, height follows the ratio
  function startImageResize(e, n, img){
    e.preventDefault(); e.stopPropagation();
    var before = captureState([n.id]);
    var startX = e.clientX, startY = e.clientY;
    var startW = img.offsetWidth;
    var ratio = n.imgRatio || (img.offsetHeight / Math.max(1, img.offsetWidth)) || 1;
    var maxW = Math.max(IMG_MIN_W, n.el.clientWidth - 28);
    var w = startW;
    document.body.style.cursor = "nwse-resize";
    function move(ev){
      var dx = (ev.clientX - startX) / boardZoom, dy = (ev.clientY - startY) / boardZoom;
      var delta = Math.abs(dx) >= Math.abs(dy / ratio) ? dx : dy / ratio;
      w = Math.round(Math.min(maxW, Math.max(IMG_MIN_W, startW + delta)));
      img.style.width = w + "px";
    }
    function up(){
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.body.style.cursor = "";
      if(w === startW) return;
      n.imgW = w;
      saveNotes();
      updateMinimap();
      recordChange("Resize image", before);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  // ---------- "looks like a list" -> checklist suggestion ----------
  // Local heuristic only. Suggests, never converts on its own.
  var PROSE_START = /^(i|we|you|he|she|they|it|my|our|this|that|there|then|so|but)\b/i;
  function isShortItem(t, maxLen, maxWords){
    return t.length <= maxLen && t.split(/\s+/).length <= maxWords && !/[.!?]\s/.test(t) && !/[!?]$/.test(t);
  }
  // Short, item-like lines: few words, mostly no sentence punctuation, small average length.
  function looksLikeItems(list){
    if(list.length < 3) return false;
    var lens = list.map(function(l){ return l.length; });
    var words = list.map(function(l){ return l.split(/\s+/).length; });
    var avg = lens.reduce(function(a, b){ return a + b; }, 0) / list.length;
    if(Math.max.apply(null, lens) > 50 || avg > 28 || Math.max.apply(null, words) > 7) return false;
    var sentences = list.filter(function(l){ return /[.!?]$/.test(l) || /[.!?]\s/.test(l); }).length;
    if(sentences > list.length * 0.2) return false;
    var prose = list.filter(function(l){ return PROSE_START.test(l) && l.split(/\s+/).length > 2; }).length;
    return prose <= list.length * 0.25;
  }
  function listCandidate(n){
    if(!n.textEl || readOnly || n.type === "photo") return null;
    if(n.textEl.querySelector("ul.checklist")) return null;
    var raw = textIndex(n.textEl).text.split("\n").map(function(l){ return l.trim(); });
    while(raw.length && !raw[0]) raw.shift();
    while(raw.length && !raw[raw.length - 1]) raw.pop();
    var lines = raw.filter(Boolean);
    if(!lines.length) return null;
    var title = null, items = null;
    function strip(l){ return l.replace(/^([-*\u2022]|\d+[.)])\s*/, ""); }
    function tidy(l){ return l.replace(/[.;,]$/, ""); }
    if(lines.length >= 3){
      var first = lines[0], rest = lines.slice(1).map(strip);
      var titleLike = first.length <= 60 && !/[.!?]$/.test(first) && (
        /:$/.test(first) ||                                  // "Groceries:"
        (raw.length > 1 && raw[1] === "") ||                 // title, blank line, items
        first.split(/\s+/).length > Math.max.apply(null, rest.map(function(l){ return l.split(/\s+/).length; })) // longer than every item
      );
      if(titleLike && rest.length >= 3 && looksLikeItems(rest)){ title = first; items = rest.map(tidy); }
      else {
        var all = lines.map(strip);
        if(looksLikeItems(all)) items = all.map(tidy);
      }
    } else {
      var line = lines[lines.length - 1];
      if(lines.length === 2){
        if(lines[0].length > 40) return null;
        title = lines[0];
      }
      var m = /^([^:,;]{1,30}):\s*(.+)$/.exec(line);
      if(m && !title){ title = m[1] + ":"; line = m[2]; }
      if(line.length <= 220){
        var sep = line.indexOf(";") !== -1 ? ";" : ",";
        var parts = line.replace(/\.$/, "").split(sep).map(function(x){ return x.trim().replace(/^(and|or|&)\s+/i, ""); }).filter(Boolean);
        if(parts.length >= 3 && parts.every(function(x){ return isShortItem(x, 30, 4) && !/[.!?]/.test(x); }) &&
           !parts.some(function(x){ return PROSE_START.test(x); })) items = parts;
      }
    }
    if(!items) return null;
    return {title:title, items:items};
  }
  function updateListHint(n){
    if(!n.el) return;
    var old = n.el.querySelector(".listHint");
    var cand = listCandidate(n);
    var show = cand && (!n.listHintOff || cand.items.length >= n.listHintOff + 2);
    if(!show){ if(old) old.remove(); return; }
    if(old) return;
    var hintEl = makeDiv("listHint");
    hintEl.innerHTML = '<span>Looks like a list. Make it a checklist?</span><button class="go">Make checklist</button><button class="no" aria-label="Dismiss">\u2715</button>';
    hintEl.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
    hintEl.addEventListener("mousedown", function(e){ e.preventDefault(); });
    hintEl.querySelector(".go").addEventListener("click", function(e){
      e.stopPropagation();
      var c = listCandidate(n);
      if(c) convertToChecklist(n, c);
    });
    hintEl.querySelector(".no").addEventListener("click", function(e){
      e.stopPropagation();
      var c = listCandidate(n);
      n.listHintOff = c ? c.items.length : 1; // stay quiet unless the list grows noticeably
      saveNotes();
      hintEl.remove();
    });
    n.el.appendChild(hintEl);
    // near the bottom of the board the suggestion sits above the note so it stays visible
    if(n.y + itemHeight(n) + 60 > boardHeight()) hintEl.classList.add("above");
  }
  function setNoteHtml(id, html){
    var n = findNote(id);
    if(!n) return false;
    n.html = html;
    if(n.textEl){ n.textEl.innerHTML = html; refreshDates(n); updateListHint(n); }
    saveNotes();
    return true;
  }
  function convertToChecklist(n, cand){
    var beforeHtml = n.textEl ? n.textEl.innerHTML : n.html;
    var afterHtml = (cand.title ? "<div>" + linkifyText(cand.title) + "</div>" : "") +
      '<ul class="checklist">' + cand.items.map(function(it){ return '<li data-checked="false">' + linkifyText(it) + "</li>"; }).join("") + "</ul>";
    endEditing();
    setNoteHtml(n.id, afterHtml);
    var id = n.id;
    var action = pushHistory({label:"Make checklist", custom:true, t:Date.now(),
      undo:function(){ return setNoteHtml(id, beforeHtml); },
      redo:function(){ return setNoteHtml(id, afterHtml); }});
    setSelection([n.id]);
    toast("Made a checklist.", "Undo", function(){ undoIfTop(action); });
  }

  // ---------- standalone photos ----------
  function defaultPhotoW(n){ return (n.imgRatio || 0.75) > 1.05 ? 190 : 240; }
  // A hand-cut edge: points walk around the rectangle, nudged inward a little.
  function cutPolygon(seed, jitter){
    var rng = seededRng(seed), pts = [];
    function j(){ return (rng() * jitter).toFixed(2); }
    var steps = 7;
    for(var i = 0; i < steps; i++) pts.push((i / steps * 100).toFixed(2) + "% " + j() + "%");
    for(i = 0; i < steps; i++) pts.push((100 - j()) + "% " + (i / steps * 100).toFixed(2) + "%");
    for(i = 0; i < steps; i++) pts.push((100 - i / steps * 100).toFixed(2) + "% " + (100 - j()) + "%");
    for(i = 0; i < steps; i++) pts.push(j() + "% " + (100 - i / steps * 100).toFixed(2) + "%");
    return "polygon(" + pts.join(", ") + ")";
  }
  // ---- real cutouts -------------------------------------------------------------------------------------------------
  // The original photo (item.image) is never modified. A cutout is a second, transparent PNG:
  //   guests: a Blob in this device's IndexedDB under item.cutoutKey     cloud: an asset, item.cutoutAssetId (source = the photo's asset)
  // `finished` pictures (white scissor contour, or the cutout glued on card) are drawn from it at runtime and cached per session.
  var CutoutRT = (function(){
    var urls = {}, loading = {}, comps = {};
    function keyOf(n){ return n.cutoutKey ? n.cutoutKey : (n.cutoutAssetId ? "a:" + n.cutoutAssetId : null); }
    function hasCutout(n){ return !!(n && n.type === "photo" && (n.cutoutKey || n.cutoutAssetId || (typeof n.cutout === "string" && /^(https?|blob):/.test(n.cutout)))); }
    function raw(n){
      var k = keyOf(n);
      if(k && urls[k]) return urls[k];
      if(typeof n.cutout === "string" && /^(https?|blob):/.test(n.cutout)) return n.cutout;     // a shared view: signed URL from the resolver
      if(k) load(n, k);
      return null;
    }
    function load(n, k){
      if(loading[k] || readOnlyView()) return;
      loading[k] = true;
      var p = n.cutoutKey ? MediaStore.url(n.cutoutKey) : Promise.resolve(null);
      p.then(function(u){
        if(u) return u;
        if(n.cutoutAssetId && CLOUD && window.Stick && Stick.assets) return Stick.assets.blobUrl(n.cutoutAssetId);
        return null;
      }).then(function(u){
        delete loading[k];
        if(!u) return;
        urls[k] = u;
        var live = findNote(n.id);
        if(live && live.el) rerenderNote(live);
      }, function(){ delete loading[k]; });
    }
    function readOnlyView(){ return false; }
    function remember(key, blob){ var u = MediaStore.remember(key, blob); urls[key] = u; return u; }
    // finished picture for a style, or null while it is being drawn (the caller then shows the plain cutout)
    function finished(n, style){
      var src = raw(n);
      if(!src || !window.Stick || !Stick.sticker) return null;
      var mode = style === "mounted" ? "mounted" : "sticker", backing = mode === "mounted" ? (n.backing || "cardboard") : "", border = cutBorderOf(n);
      var ck = src + "|" + mode + "|" + backing + "|" + border, hit = comps[ck];
      if(hit && hit.url) return hit;
      if(hit === "fail") return null;
      if(!hit){
        comps[ck] = "pending";
        Stick.sticker.compose(src, {mode: mode, material: backing, border: border, seed: hashStr(String(n.id) + (n.cutoutKey || n.cutoutAssetId || ""))}).then(function(r){
          comps[ck] = r;
          var live = findNote(n.id);
          if(live && live.el) rerenderNote(live);
          else notes.forEach(function(x){ if(x.el && x.type === "photo" && raw(x) === src) rerenderNote(x); });         // shared views use their own ids
        }, function(){ comps[ck] = "fail"; });
      }
      return null;
    }
    return {hasCutout: hasCutout, raw: raw, remember: remember, finished: finished, keyOf: keyOf};
  })();
  function hasRealCutout(n){ return CutoutRT.hasCutout(n); }
  // helpers the Cutout Maker (js/cutout-maker.js) needs from the app
  window.Stick = window.Stick || {};
  Stick.ui = {
    layer: function(id, close, isOpen){ return OV.layer(id, close, isOpen); }, ICONS: ICONS, miniLoader: function(){ return miniLoaderHtml(); }, toast: function(m){ toast(m); }, modal: function(o){ return openModal(o); }, confirm: function(o){ return confirmDialog(o); }, trapTab: function(e, b, c){ trapTab(e, b, c); },
    loader: {show: function(t){ cloudOverlay(t); }, hide: function(){ hideCloudOverlay(); }, done: function(t, after){ stickLoaderDone(t, after); }, fail: function(t, retry){ stickLoaderFail(t, retry); }}
  };
  async function copyCutoutBlob(fromKey, toKey){
    try{
      var b = await MediaStore.blob(fromKey);
      if(!b) return;
      await MediaStore.put(toKey, b);
      CutoutRT.remember(toKey, b);
      notes.forEach(function(n){ if(n.cutoutKey === toKey && n.el) rerenderNote(n); });          // the copy was drawn before its picture existed: draw it again
    }catch(e){}
  }
  function buildPhotoEl(item){
    var style = PHOTO_STYLES.indexOf(item.photoStyle) !== -1 ? item.photoStyle : "polaroid";
    var p = ensurePhys(item);
    var el = makeDiv("photoObj ps-" + style);
    el.style.setProperty("--pw", (item.w || defaultPhotoW(item)) + "px");
    el.style.setProperty("--rot", (item.rot || 0) + "deg");
    el.style.setProperty("--bx", p.bx + "px");
    el.style.setProperty("--by", p.by + "px");
    el.style.setProperty("--br", p.br + "deg");
    el.style.setProperty("--lr", p.lr + "deg");
    var rawCut = style !== "polaroid" && hasRealCutout(item) ? CutoutRT.raw(item) : null;
    var finishedPic = rawCut ? CutoutRT.finished(item, style) : null;
    if(style === "mounted" && !finishedPic && !rawCut) el.appendChild(makeDiv("pBack"));
    var body = makeDiv("pBody"), frame = makeDiv("pFrame");
    var isolated = !!rawCut;
    if(isolated) frame.classList.add("isolated");
    else if(style !== "polaroid") frame.style.clipPath = cutPolygon(p.cut, 1.2);
    if(finishedPic){ frame.classList.add("finished"); el.classList.add("finished"); }
    var img = document.createElement("img");
    img.alt = item.caption || "Picture (no description added)";
    img.draggable = false;
    img.style.aspectRatio = "1 / " + (finishedPic ? finishedPic.ratio : isolated ? (item.cutoutRatio || item.imgRatio || 0.75) : (item.imgRatio || 0.75));
    var shownSrc = finishedPic ? finishedPic.url : isolated ? rawCut : item.image;
    if(shownSrc){ if(shownSrc === item.image && !isolated && !finishedPic) PreviewCache.use(img, shownSrc, item.w || defaultPhotoW(item)); else img.src = shownSrc; } else frame.classList.add("pending");
    frame.appendChild(img);
    var cap = makeDiv("pCaption" + (item.caption ? "" : " empty"));
    cap.dir = "auto";
    cap.textContent = item.caption || "";
    cap.style.fontFamily = captionStack(item.captionFont, item.caption);
    if(style === "polaroid") frame.appendChild(cap);
    body.appendChild(frame);
    el.appendChild(body);
    if(style !== "polaroid") el.appendChild(cap);
    return {el:el, img:img, cap:cap};
  }
  function buildStaticPhoto(item){
    var b = buildPhotoEl(item);
    b.el.classList.add("static");
    return b.el;
  }
  function photoFrameSize(n){
    if(n.el && n.el.offsetWidth) return {w:n.el.offsetWidth, h:n.el.offsetHeight};
    var w = n.w || 220, ih = w * (n.imgRatio || 0.75);
    if(n.photoStyle === "polaroid" || !n.photoStyle) return {w:w * 1.11, h:ih + w * 0.315};
    var pad = w * 0.06 + 4, extra = n.photoStyle === "mounted" ? w * 0.17 : 0;
    return {w:w + pad + extra, h:ih + pad + extra + (n.caption ? 30 : 0)};
  }
  function renderPhoto(n, isNew, opts){
    opts = opts || {};
    var b = buildPhotoEl(n);
    var el = b.el;
    if(isNew) el.classList.add("new");
    el.dataset.id = n.id;
    el.style.left = n.x + "px";
    el.style.top = n.y + "px";
    el.style.zIndex = n.z;
    if(selected.has(n.id)) el.classList.add("selected");
    n.el = el;
    n.textEl = null;
    n.captionEl = b.cap;
    if(!readOnly){
      function ctl(cls, html, title, onDown){
        var c = document.createElement("button");
        c.className = "pCtl " + cls; c.innerHTML = html; c.title = title; c.setAttribute("aria-label", title);
        c.addEventListener("pointerdown", function(e){ e.stopPropagation(); if(onDown) onDown(e, c); });
        c.addEventListener("mousedown", function(e){ e.preventDefault(); });
        el.appendChild(c);
        return c;
      }
      var more = ctl("pMore", ICONS.more, "Photo options");
      more.addEventListener("click", function(e){ e.stopPropagation(); openPhotoMenu(n, more); });
      var sty = ctl("pStyle", ICONS.image, "Change style (" + PHOTO_STYLE_NAMES[n.photoStyle || "polaroid"] + ")");
      sty.addEventListener("click", function(e){ e.stopPropagation(); cyclePhotoStyle(n); });
      ctl("pHandle", "", "Drag to resize", function(e){ startPhotoResize(e, n); });

      el.addEventListener("pointerdown", function(e){
        if(e.pointerType === "mouse" && e.button !== 0) return;
        if(b.cap.isContentEditable && b.cap.contains(e.target)) return; // editing the caption
        e.preventDefault();
        endEditing();
        if(searchInput.value.trim()) setTimeout(clearSearch, 0);
        if(e.ctrlKey || e.metaKey){ toggleSelected(n.id); return; }
        var group = selected.has(n.id) && selected.size > 1;
        if(!group) setSelection([n.id]);
        bringToFront(n, el);
        startDrag(e, n, group ? selectedNotes() : [n]);
      });
      // double-click selects/raises a photo (focus mode is for notes); on the caption it edits it
      el.addEventListener("dblclick", function(e){
        e.preventDefault(); e.stopPropagation();
        if(b.cap.contains(e.target) || (n.photoStyle === "polaroid" && e.target.closest(".pFrame"))) editCaption(n);
      });
      el.addEventListener("dragover", function(e){ e.preventDefault(); e.stopPropagation(); }, true);
      el.addEventListener("drop", function(e){
        e.preventDefault(); e.stopPropagation();
        var f = firstImageFile(e.dataTransfer);
        if(f) dropPhotoFiles([f], n.x + 40, n.y + 40);
      }, true);
      if(isNew) el.addEventListener("animationend", function(){ el.classList.remove("new"); }, {once:true});
    }
    boardInner.appendChild(el);
    return el;
  }
  // finishes the caption being edited when the pointer goes anywhere else
  var finishCaption = null;
  document.addEventListener("pointerdown", function(e){
    if(!finishCaption) return;
    var ed = document.querySelector(".pCaption.editing");
    if(ed && ed.contains(e.target)) return;
    finishCaption();
  }, true);
  function editCaption(n){
    var cap = n.captionEl;
    if(!cap || readOnly) return;
    setSelection([n.id]);
    var before = captureState([n.id]);
    var finished = false;
    function key(e){
      if(e.key === "Enter"){ e.preventDefault(); done(); cap.blur(); }
      if(e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); cap.textContent = n.caption || ""; done(); cap.blur(); }
    }
    function paste(e){
      e.preventDefault();
      var t = (e.clipboardData && e.clipboardData.getData("text/plain")) || "";
      document.execCommand("insertText", false, t.replace(/\s+/g, " "));
    }
    function done(){
      if(finished) return;
      finished = true;
      if(finishCaption === done) finishCaption = null;
      cap.removeEventListener("keydown", key);
      cap.removeEventListener("blur", done);
      cap.removeEventListener("paste", paste);
      cap.contentEditable = "false";
      cap.classList.remove("editing");
      var v = cap.textContent.replace(/\s+/g, " ").trim().slice(0, 120);
      cap.textContent = v;
      cap.classList.toggle("empty", !v);
      if(v === (n.caption || "")) return;
      n.caption = v;
      var alt = n.el && n.el.querySelector(".pFrame img");
      if(alt) alt.alt = v || "Picture (no description added)";
      saveNotes();
      recordChange(v ? (before[n.id].caption ? "Edit caption" : "Add caption") : "Remove caption", before);
    }
    cap.addEventListener("keydown", key);
    cap.addEventListener("blur", done);
    cap.addEventListener("paste", paste);
    if(finishCaption) finishCaption();
    finishCaption = done;
    cap.contentEditable = "true";
    cap.classList.add("editing");
    cap.classList.remove("empty");
    focusNoScroll(cap);
    var r = document.createRange(); r.selectNodeContents(cap); r.collapse(false);
    var s2 = window.getSelection(); s2.removeAllRanges(); s2.addRange(r);
  }
  function setPhotoStyle(n, style){
    if(style === n.photoStyle) return;
    if(style !== "polaroid" && !hasRealCutout(n)){ startCutout(n, style); return; }      // no cutout yet: make one first (cancel = nothing changes)
    var before = captureState([n.id]);
    n.photoStyle = style;
    saveNotes();
    rerenderNote(n);
    recordChange("Change photo style", before);
  }
  function cutBorderOf(n){ return CUT_BORDERS.indexOf(n.cutBorder) !== -1 ? n.cutBorder : "thin"; }
  function setCutBorder(n, b){
    if(CUT_BORDERS.indexOf(b) === -1 || cutBorderOf(n) === b) return;
    var before = captureState([n.id]);
    n.cutBorder = b;
    saveNotes(); rerenderNote(n);
    recordChange("Change border", before);
  }
  function setBacking(n, backing){
    if(BACKINGS.indexOf(backing) === -1 || n.backing === backing) return;
    var before = captureState([n.id]);
    n.backing = backing;
    if(n.photoStyle !== "mounted") n.photoStyle = "mounted";
    saveNotes(); rerenderNote(n);
    recordChange("Change backing", before);
  }
  var cutoutBusy = false;
  // photo -> Cutout Maker -> applied to the photo as one undoable step
  function startCutout(n, style){
    if(readOnly || cutoutBusy) return;
    if(!n.image){ toast("This photo is still loading. Try again in a moment."); return; }
    if(!(window.Stick && Stick.cutout && Stick.cutout.available() && Stick.cutoutMaker)){ toast("Cutouts aren't available in this browser."); return; }
    cutoutBusy = true;
    endEditing(); closeFloatingPopovers();
    Stick.cutoutMaker.open({source: n.image}).then(function(res){
      cutoutBusy = false;
      var live = findNote(n.id);
      if(!res || !live) return;
      if(res.useOriginal){ toast("Kept your original photo."); return; }
      applyCutout(live, res, style && style !== "polaroid" ? style : "cutout");
    }, function(){ cutoutBusy = false; toast("Couldn't make a clean cutout. Your original photo is unchanged."); });
  }
  function applyCutout(n, res, style){
    var before = captureState([n.id]);
    var key = "co-" + newId();
    MediaStore.put(key, res.blob).catch(function(){ toast("Couldn't keep the cutout on this device, so it lasts only until you close the page."); });
    CutoutRT.remember(key, res.blob);
    n.cutoutKey = key; n.cutoutRatio = +res.ratio.toFixed(4); delete n.cutoutAssetId; delete n.cutout;
    if(CUT_BORDERS.indexOf(res.border) !== -1) n.cutBorder = res.border;
    n.photoStyle = style;
    saveNotes(); rerenderNote(n);
    recordChange("Cut out photo", before);
    if(cloudSync) cloudSync.notesChanged();
  }
  function removeCutout(n){
    var before = captureState([n.id]);
    delete n.cutoutKey; delete n.cutoutAssetId; delete n.cutoutRatio; delete n.cutout;
    n.photoStyle = "polaroid";
    saveNotes(); rerenderNote(n);
    recordChange("Remove cutout", before);
  }
  function cyclePhotoStyle(n){
    var i = PHOTO_STYLES.indexOf(n.photoStyle || "polaroid");
    setPhotoStyle(n, PHOTO_STYLES[(i + 1) % PHOTO_STYLES.length]);
  }
  function startPhotoResize(e, n){
    e.preventDefault(); e.stopPropagation();
    var el = n.el;
    var before = captureState([n.id]);
    var startX = e.clientX, startY = e.clientY, startW = n.w;
    var frameScale = el.offsetWidth / Math.max(1, n.w);
    var frameRatio = el.offsetHeight / Math.max(1, el.offsetWidth);
    var w = startW;
    document.body.style.cursor = "nwse-resize";
    function move(ev){
      var dx = (ev.clientX - startX) / boardZoom, dy = (ev.clientY - startY) / boardZoom;
      var delta = Math.abs(dx) >= Math.abs(dy / frameRatio) ? dx : dy / frameRatio;
      w = Math.round(Math.min(PHOTO_MAX_W, Math.max(PHOTO_MIN_W, startW + delta / frameScale)));
      el.style.setProperty("--pw", w + "px");
    }
    function up(){
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.body.style.cursor = "";
      if(w === startW) return;
      n.w = w;
      recoverVertical([n]);
      ensureWidth(); saveNotes(); updateMinimap();
      recordChange("Resize photo", before);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }
  function openPhotoMenu(n, anchor){
    var pop = openFloatingPopover(anchor, "noteMenu");
    if(!pop) return;
    var head = makeDiv("menuHint");
    head.textContent = "Style";
    pop.appendChild(head);
    PHOTO_STYLES.forEach(function(st){
      pop.appendChild(menuItem(st === (n.photoStyle || "polaroid") ? ICONS.tick : '<svg viewBox="0 0 24 24"></svg>', PHOTO_STYLE_NAMES[st], function(){
        closeFloatingPopovers(); setPhotoStyle(n, st);
      }));
    });
    pop.appendChild(makeDiv("menuSep"));
    pop.appendChild(menuItem(ICONS.postcard, "Make postcard", function(){ closeFloatingPopovers(); makePostcardFromPhoto(n); }));
    pop.appendChild(menuItem(ICONS.strip, "Make photo strip", function(){ closeFloatingPopovers(); makeStripFromPhotos([n.id]); }));
    pop.appendChild(menuItem(ICONS.scissors, hasRealCutout(n) ? "Redo cutout\u2026" : "Make cutout\u2026", function(){ closeFloatingPopovers(); startCutout(n, n.photoStyle); }));
    if(hasRealCutout(n)) pop.appendChild(menuItem(ICONS.close, "Remove cutout", function(){ closeFloatingPopovers(); removeCutout(n); }));
    if(hasRealCutout(n)){
      var bdh = makeDiv("menuHint"); bdh.textContent = "Border"; pop.appendChild(bdh);
      CUT_BORDERS.forEach(function(bd){
        pop.appendChild(menuItem(bd === cutBorderOf(n) ? ICONS.tick : '<svg viewBox="0 0 24 24"></svg>', bd === "none" ? "No border" : bd === "thin" ? "Thin border" : "Medium border", function(){ closeFloatingPopovers(); setCutBorder(n, bd); }));
      });
    }
    if(hasRealCutout(n) && n.photoStyle === "mounted"){
      var bh = makeDiv("menuHint"); bh.textContent = "Backing"; pop.appendChild(bh);
      BACKINGS.forEach(function(bk){
        pop.appendChild(menuItem(bk === (n.backing || "cardboard") ? ICONS.tick : '<svg viewBox="0 0 24 24"></svg>', Stick.sticker.materialName(bk), function(){ closeFloatingPopovers(); setBacking(n, bk); }));
      });
    }
    pop.appendChild(makeDiv("menuSep"));
    pop.appendChild(menuItem(ICONS.pencil, n.caption ? "Edit caption" : "Add caption", function(){ closeFloatingPopovers(); editCaption(n); }));
    if(n.caption) pop.appendChild(menuItem(ICONS.pencil, "Caption font: " + captionFontFor(n.captionFont, n.caption), function(){
      closeFloatingPopovers();
      var before = captureState([n.id]);
      n.captionFont = nextCaptionFont(n);
      saveNotes(); rerenderNote(n);
      recordChange("Change caption font", before);
    }));
    if(n.caption) pop.appendChild(menuItem(ICONS.close, "Remove caption", function(){
      closeFloatingPopovers();
      var before = captureState([n.id]);
      n.caption = "";
      saveNotes(); rerenderNote(n);
      recordChange("Remove caption", before);
    }));
    if(n.w !== defaultPhotoW(n)) pop.appendChild(menuItem(ICONS.image, "Reset size", function(){
      closeFloatingPopovers();
      var before = captureState([n.id]);
      n.w = defaultPhotoW(n);
      saveNotes(); rerenderNote(n);
      recordChange("Reset photo size", before);
    }));
    pinAndArrange(pop, n);
    pop.appendChild(menuItem(ICONS.copy, "Duplicate", function(){ closeFloatingPopovers(); duplicateNotes([n.id]); }, {kbd: MOD + "+D"}));
    var moveItem = menuItem(ICONS.move, "Move to board", function(){
      var open = moveItem.nextSibling && moveItem.nextSibling.classList && moveItem.nextSibling.classList.contains("boardPick");
      if(open){ moveItem.nextSibling.remove(); return; }
      moveItem.parentNode.insertBefore(boardPicker(document.createDocumentFragment(), [n.id]), moveItem.nextSibling);
    }, {kbd:"\u203A"});
    pop.appendChild(moveItem);
    pop.appendChild(menuItem(ICONS.share, "Share photo…", function(){ closeFloatingPopovers(); openShareModal([n]); }));
    pop.appendChild(menuItem(ICONS.trash, "Delete", function(){ closeFloatingPopovers(); deleteNotes([n.id]); }, {cls:"danger"}));
  }
  function firstImageFile(dt){
    return dt && dt.files ? Array.prototype.filter.call(dt.files, function(f){ return f.type.indexOf("image/") === 0; })[0] || null : null;
  }
  // Reads an image into a board-friendly JPEG (kept sharp enough for large prints).
  function loadPhotoFile(file){
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function(){
        var img = new Image();
        img.onerror = reject;
        img.onload = function(){
          var sc = Math.min(1, 1000 / Math.max(img.width, img.height));
          var w = Math.max(1, Math.round(img.width * sc)), h = Math.max(1, Math.round(img.height * sc));
          var c = document.createElement("canvas");
          c.width = w; c.height = h;
          var g = c.getContext("2d");
          g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); // transparent PNGs print on white
          g.drawImage(img, 0, 0, w, h);
          resolve({src:c.toDataURL("image/jpeg", 0.85), ratio:+(h / w).toFixed(4)});
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  // x, y: where the photo's centre should land (board coordinates)
  function dropPhotoFiles(files, x, y, opts){
    opts = opts || {};
    Promise.all(files.map(loadPhotoFile)).then(function(loaded){
      var made = loaded.map(function(l, i){
        var n = {id:newId(), type:"photo", x:0, y:0, w:0, imgRatio:l.ratio, rot:rand(-5, 5), image:l.src, cutout:null,
                 photoStyle:"polaroid", caption:"", font:pickFont(), createdAt:Date.now(), phys:makePhotoPhys()};
        n.w = defaultPhotoW(n);
        var size = photoFrameSize(n);
        n.x = Math.max(0, x - size.w/2 + i * 26);
        n.y = Math.max(0, Math.min(boardHeight() - size.h - 8, y - size.h/2 + i * 26));
        return n;
      });
      var act = insertNotes(made, made.length > 1 ? "Add " + made.length + " photos" : "Add photo");
      recoverVertical(made);
      dismissHint();
      if(opts.afterAdd) opts.afterAdd(made);
    }).catch(function(){ toast("That image couldn't be read."); });
  }

  // ---------- local media store (IndexedDB) for voice memos and videos ----------
  // localStorage can't hold audio/video, so files go to IndexedDB on this device.
  // They don't sync, aren't in exported JSON or shared links, and a missing file
  // shows as "not on this device". Remote media storage is a backend task.
  var MediaStore = (function(){
    var dbp = null, urls = new Map();
    function db(){
      if(!dbp) dbp = new Promise(function(resolve, reject){
        if(!window.indexedDB){ reject(new Error("IndexedDB unavailable")); return; }
        var req = indexedDB.open("stickit-media", 1);
        req.onupgradeneeded = function(){ req.result.createObjectStore("media"); };
        req.onsuccess = function(){ resolve(req.result); };
        req.onerror = function(){ reject(req.error); };
      });
      return dbp;
    }
    function run(mode, fn){
      return db().then(function(d){
        return new Promise(function(resolve, reject){
          var t = d.transaction("media", mode), r = fn(t.objectStore("media"));
          t.oncomplete = function(){ resolve(r && r.result); };
          t.onerror = t.onabort = function(){ reject(t.error); };
        });
      });
    }
    return {
      put: function(id, blob){ return run("readwrite", function(st){ return st.put(blob, id); }); },
      remember: function(id, blob){ var u = URL.createObjectURL(blob); urls.set(id, u); return u; },
      // let go of the object URL (and so of the blob it keeps alive) when its note leaves the board; it is made again if the note comes back
      release: function(id){ var u = urls.get(id); if(u){ try{ URL.revokeObjectURL(u); }catch(e){} urls.delete(id); } },
      blob: function(id){ return run("readonly", function(st){ return st.get(id); }).then(function(b){ return b || null; }); },
      url: function(id){
        if(urls.has(id)) return Promise.resolve(urls.get(id));
        return run("readonly", function(st){ return st.get(id); }).then(function(b){
          if(!b) return null;
          var u = URL.createObjectURL(b); urls.set(id, u); return u;
        }).catch(function(){ return null; });
      }
    };
  })();
  // Board previews: a picture on the board is drawn a few hundred pixels wide, but the stored original can be 1000 px or more, and a
  // browser keeps every visible picture decoded at its full size (about 3 MB for a 1000 x 750 photo). So the board shows a small preview
  // (made once, kept as a blob) and swaps it in as soon as it is ready; the original stays untouched for the lightbox-size views, export,
  // sharing and cutouts. Previews only ever shrink: a picture already close to its drawn size is used as it is.
  var PreviewCache = (function(){
    var map = new Map(), order = [], MAX = 160;
    function keyOf(src, target){ return (src.length > 160 ? src.length + ":" + src.slice(-40) : src) + "@" + target; }
    function targetFor(cssW){
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      return Math.max(160, Math.ceil(cssW * dpr * 1.6 / 32) * 32);                 // sharp up to the board's largest zoom (1.6)
    }
    function make(src, target){
      return new Promise(function(resolve){
        var im = new Image();
        im.onload = function(){
          if(!im.naturalWidth || im.naturalWidth <= target * 1.25){ resolve(null); return; }       // already about the right size
          var s = target / im.naturalWidth, c = document.createElement("canvas"); c.width = target; c.height = Math.max(1, Math.round(im.naturalHeight * s));
          var g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(im, 0, 0, c.width, c.height);
          c.toBlob(function(b){ resolve(b ? URL.createObjectURL(b) : null); }, "image/jpeg", 0.86);
        };
        im.onerror = function(){ resolve(null); };
        im.src = src;
      });
    }
    // set `img`'s source: a ready preview at once, otherwise the original now and the preview when it is ready
    function use(img, src, cssW){
      if(!src){ return; }
      if(!/^(data:image\/|blob:)/.test(src)){ img.src = src; return; }
      var target = targetFor(cssW || 220), k = keyOf(src, target), hit = map.get(k);
      if(hit && hit.url){ img.src = hit.url; return; }
      if(hit && hit.url === null && hit.done){ img.src = src; return; }
      img.src = src;
      if(!hit){
        hit = {url: undefined, done: false, waiters: []}; map.set(k, hit); order.push(k);
        if(order.length > MAX){ var old = order.shift(), o = map.get(old); if(o && o.url) URL.revokeObjectURL(o.url); map.delete(old); }
        make(src, target).then(function(u){ hit.url = u; hit.done = true; hit.waiters.forEach(function(f){ f(u); }); hit.waiters = []; });
      }
      hit.waiters.push(function(u){ if(u && img.parentNode && img.getAttribute("src") === src) img.src = u; });
    }
    return {use: use};
  })();
  var MAX_STORED_VIDEO = 60 * 1024 * 1024;
  function fmtDur(sec){
    sec = Math.max(0, Math.round(sec || 0));
    return Math.floor(sec / 60) + ":" + pad2(sec % 60);
  }
  function fmtClock(sec){ sec = Math.max(0, Math.floor(sec || 0)); return pad2(Math.floor(sec / 60)) + ":" + pad2(sec % 60); }
  var AUDIO_W = 236, AUDIO_MIN_W = 190, AUDIO_MAX_W = 440, VIDEO_MIN_W = 120, VIDEO_MAX_W = 480;
  function objSize(n){
    if(n && n.type === "pile") return {w: n.w || 200, h: (n.el && n.el.offsetHeight) || 150};
    if(n && n.type === "embed") return {w: n.w || 340, h: (n.el && n.el.offsetHeight) || Math.round((n.w || 340) * 0.5625) + 78};
    if(isPhoto(n)) return photoFrameSize(n);
    if(isPaper(n)) return paperSize(n);
    if(n.el && n.el.offsetWidth) return {w:n.el.offsetWidth, h:n.el.offsetHeight};
    if(n.type === "audio") return {w:n.w || AUDIO_W, h:66};
    var w = n.w || 200;
    return {w:w + 16, h:w * (n.imgRatio || 0.5625) + 30 + (n.caption ? 32 : 0)};
  }
  function waveSvg(seed){
    var rng = seededRng(hashStr(String(seed))), bars = "";
    for(var i = 0; i < 34; i++){
      var h = 2 + Math.round(rng() * 12 * (0.45 + 0.55 * Math.sin((i / 33) * Math.PI)));
      bars += '<rect x="' + (i * 6) + '" y="' + (8 - h / 2) + '" width="3" height="' + h + '" rx="1.5"></rect>';
    }
    return '<svg class="mWave" viewBox="0 0 204 16" preserveAspectRatio="none" fill="currentColor">' + bars + "</svg>";
  }
  function buildAVEl(item){
    var el, cap = makeDiv("pCaption" + (item.caption ? "" : " empty"));
    cap.dir = "auto";
    cap.textContent = item.caption || "";
    cap.style.fontFamily = captionStack(item.captionFont, item.caption);
    var play = document.createElement("button");
    play.innerHTML = ICONS.play;
    play.setAttribute("aria-label", "Play");
    if(item.type === "audio"){
      el = makeDiv("boardObj memoObj");
      el.style.setProperty("--pw", (item.w || AUDIO_W) + "px");
      el.appendChild(makeDiv("mTape"));
      play.className = "mPlay";
      el.appendChild(play);
      var body = makeDiv("mBody"), mhead = makeDiv("mHead");
      mhead.appendChild(cap);
      var waveBox = makeDiv("mWaveBox"), wave = document.createElement("div");
      wave.innerHTML = waveSvg(item.mediaId || item.id) + waveSvg(item.mediaId || item.id).replace('class="mWave"', 'class="mWave mWaveOn"');
      while(wave.firstChild) waveBox.appendChild(wave.firstChild);
      var tm = makeDiv("mTime"); tm.textContent = fmtClock(item.duration);
      mhead.appendChild(tm);
      body.appendChild(mhead); body.appendChild(waveBox);
      el.appendChild(body);
    } else {
      el = makeDiv("boardObj filmObj");
      el.style.setProperty("--pw", (item.w || 200) + "px");
      var strip = makeDiv("fStrip"), frame = makeDiv("fFrame");
      frame.style.setProperty("--ar", "1 / " + (item.imgRatio || 0.5625));
      if(item.poster){ var im = document.createElement("img"); im.alt = ""; im.draggable = false; im.src = item.poster; frame.appendChild(im); }
      play.className = "fPlay";
      frame.appendChild(play);
      var ft = makeDiv("fTime"); ft.textContent = item.duration ? fmtClock(item.duration) : ""; frame.appendChild(ft);
      frame.appendChild(makeDiv("fProg"));
      var open = document.createElement("button"); open.type = "button"; open.className = "fOpen"; open.title = "Open large"; open.setAttribute("aria-label", "Open large"); open.innerHTML = ICONS.expand || "\u2922";
      frame.appendChild(open);
      strip.appendChild(frame);
      el.appendChild(strip);
      el.appendChild(cap);
    }
    el.style.setProperty("--rot", (item.rot || 0) + "deg");
    return {el:el, cap:cap, play:play, open:el.querySelector(".fOpen"), waveBox:el.querySelector(".mWaveBox")};
  }
  // One thing plays at a time (a recording or an inline video). Progress is painted from the media element's own timeupdate events
  // (about four a second), only for the one that is playing; nothing else runs.
  var playing = null; // {n, media}
  function paintMedia(n, cur, isPlaying){
    var el = n.el; if(!el) return;
    var dur = (playing && playing.n.id === n.id && isFinite(playing.media.duration) && playing.media.duration > 0) ? playing.media.duration : (n.duration || 0);
    var pct = dur ? Math.max(0, Math.min(100, cur / dur * 100)) : 0, sec = Math.floor(cur), started = cur > 0.05 || isPlaying;
    el.style.setProperty("--prog", pct.toFixed(1) + "%");
    el.classList.toggle("playing", !!isPlaying);
    var btn = el.querySelector(".mPlay, .fPlay");
    if(btn){ var want = isPlaying ? "pause" : "play"; if(btn._st !== want){ btn._st = want; btn.innerHTML = isPlaying ? ICONS.pause : ICONS.play; btn.setAttribute("aria-label", isPlaying ? "Pause" : "Play"); } }
    if(el._sec !== sec || el._started !== started){
      el._sec = sec; el._started = started;
      var t = el.querySelector(".mTime, .fTime");
      if(t) t.textContent = started ? fmtClock(cur) + " / " + fmtClock(dur) : (dur ? fmtClock(dur) : "");
    }
  }
  function stopMediaFor(n){
    if(playing && playing.n.id === n.id){ try{ playing.media.pause(); }catch(e){} var m = playing; playing = null; paintMedia(m.n, 0, false); }
  }
  function pauseAllMedia(){ if(playing) try{ playing.media.pause(); }catch(e){} }
  document.addEventListener("visibilitychange", function(){ if(document.hidden) pauseAllMedia(); });
  // Where can this recording/video be played from? This device's cache first, then a shared link's signed URL,
  // then (signed in) the copy in the account, which is what makes it playable on another device.
  function mediaUrlFor(n){
    return MediaStore.url(n.mediaId || "").then(function(u){
      if(u) return u;
      if(n.mediaUrl) return n.mediaUrl;
      if(n.assetId && CLOUD && window.Stick) return Stick.assets.signedUrl(n.assetId);
      return null;
    });
  }
  function mediaAvailable(n){
    if(n.mediaUrl || (n.assetId && CLOUD)) return Promise.resolve(true);
    return MediaStore.url(n.mediaId || "").then(function(u){ return !!u; });
  }
  function markMissing(n){
    if(!n.el) return;
    n.el.classList.add("missing");
    var note = n.el.querySelector(".mNote");
    if(!note){ note = makeDiv("mNote"); (n.el.querySelector(".mBody") || n.el).appendChild(note); }
    note.textContent = n.mediaState === "uploading" ? "Still uploading\u2026"
      : n.mediaState === "failed" ? "Upload failed. Tap play to retry."
      : n.assetId ? "Couldn't load"
      : n.mediaState === "missing" ? "Wasn't available when this was moved"
      : "Not on this device";
  }
  function ensureVideoEl(n, url){
    var frame = n.el && n.el.querySelector(".fFrame"); if(!frame) return null;
    var v = frame.querySelector("video");
    if(!v){
      v = document.createElement("video"); v.className = "fVideo"; v.playsInline = true; v.preload = "metadata"; v.controls = false; v.setAttribute("aria-label", n.caption || "Video");
      if(n.poster) v.poster = n.poster;
      frame.insertBefore(v, frame.firstChild);
    }
    if(v.getAttribute("src") !== url) v.src = url;
    return v;
  }
  function playAV(n, btn){
    if(playing && playing.n.id === n.id && playing.media){                           // same one: toggle
      if(playing.media.paused) playing.media.play().catch(function(){}); else playing.media.pause();
      return;
    }
    busyStart("media", "Loading media\u2026", {delay: 500});
    mediaUrlFor(n).then(function(u){
      busyEnd("media");
      if(!u){
        markMissing(n);
        toast(n.mediaState === "uploading" ? "This is still uploading from another device."
          : "This " + (n.type === "audio" ? "recording" : "video") + " isn't available here.");
        if(n.mediaState === "failed" && cloudSync) cloudSync.retryAll();
        return;
      }
      if(playing) stopMediaFor(playing.n);
      var media = n.type === "video" ? ensureVideoEl(n, u) : new Audio(u);
      if(!media){ toast("Couldn't play this here."); return; }
      var me = {n:n, media:media}; playing = me;
      media.addEventListener("timeupdate", function(){ if(playing === me) paintMedia(n, media.currentTime, !media.paused); });
      media.addEventListener("play", function(){ if(playing === me) paintMedia(n, media.currentTime, true); });
      media.addEventListener("pause", function(){ if(playing === me && !media.ended) paintMedia(n, media.currentTime, false); });
      media.addEventListener("ended", function(){ if(playing === me){ playing = null; try{ media.currentTime = 0; }catch(e){} } paintMedia(n, 0, false); });
      media.addEventListener("error", function(){ if(playing === me){ playing = null; paintMedia(n, 0, false); } toast("Couldn't play this " + (n.type === "audio" ? "recording" : "video") + " here."); });
      media.play().catch(function(){ if(playing === me){ playing = null; paintMedia(n, 0, false); } toast("Couldn't play this " + (n.type === "audio" ? "recording" : "video") + " here."); });
    });
  }
  function openVideoModal(n, url){
    pauseAllMedia();
    var content = makeDiv("videoModal");
    var v = document.createElement("video");
    v.src = url; v.controls = true; v.playsInline = true; v.autoplay = true;
    content.appendChild(v);
    openModal({title:n.caption || "Video", content:content, width:560, onClose:function(){ v.pause(); }});
  }
  function openVideoLarge(n){ mediaUrlFor(n).then(function(u){ if(u) openVideoModal(n, u); else { markMissing(n); toast("This video isn't available here."); } }); }
  // resize a recording (width only) or a video (width, aspect kept): same handle and rules as photos and paper objects
  function startAVResize(e, n){
    e.preventDefault(); e.stopPropagation();
    var el = n.el, before = captureState([n.id]), startX = e.clientX, audio = n.type === "audio";
    var startW = n.w || (audio ? AUDIO_W : 200), min = audio ? AUDIO_MIN_W : VIDEO_MIN_W, max = audio ? AUDIO_MAX_W : VIDEO_MAX_W, w = startW;
    document.body.style.cursor = "nwse-resize";
    function move(ev){ w = Math.round(Math.min(max, Math.max(min, startW + (ev.clientX - startX) / boardZoom))); el.style.setProperty("--pw", w + "px"); }
    function up(){
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      document.body.style.cursor = "";
      if(w === startW) return;
      n.w = w; recoverVertical([n]); ensureWidth(); saveNotes(); updateMinimap(); recordChange("Resize " + (audio ? "recording" : "video"), before);
    }
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
  }
  function renderAV(n, isNew){
    var b = buildAVEl(n), el = b.el;
    if(isNew) el.classList.add("new");
    el.dataset.id = n.id;
    el.style.left = n.x + "px";
    el.style.top = n.y + "px";
    el.style.zIndex = n.z;
    if(selected.has(n.id)) el.classList.add("selected");
    n.el = el; n.textEl = null; n.captionEl = b.cap;
    b.play.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
    b.play.addEventListener("click", function(e){ e.stopPropagation(); playAV(n, b.play); });
    if(b.open){
      b.open.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
      b.open.addEventListener("click", function(e){ e.stopPropagation(); openVideoLarge(n); });
    }
    if(b.waveBox){                                              // click the waveform to jump to that point (while it is playing or paused mid-way)
      b.waveBox.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
      b.waveBox.addEventListener("click", function(e){
        e.stopPropagation();
        if(!(playing && playing.n.id === n.id) || !isFinite(playing.media.duration)) return;
        var r = b.waveBox.getBoundingClientRect(), f = Math.max(0, Math.min(1, (e.clientX - r.left) / Math.max(1, r.width)));
        playing.media.currentTime = f * playing.media.duration; paintMedia(n, playing.media.currentTime, !playing.media.paused);
      });
    }
    var frameEl = el.querySelector(".fFrame");
    if(frameEl){                                                // a click on a playing video's picture pauses / resumes it (a drag does not)
      var pd = null;
      frameEl.addEventListener("pointerdown", function(e){ pd = {x: e.clientX, y: e.clientY}; });
      frameEl.addEventListener("click", function(e){
        if(e.target.closest && e.target.closest(".fPlay, .fOpen")) return;
        if(!pd || Math.hypot(e.clientX - pd.x, e.clientY - pd.y) > 5) return;
        if(playing && playing.n.id === n.id) playAV(n, b.play);
      });
    }
    if(!readOnly){
      var more = document.createElement("button");
      more.className = "pCtl pMore"; more.innerHTML = ICONS.more; more.title = "Options"; more.setAttribute("aria-label", "Options");
      more.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
      more.addEventListener("click", function(e){ e.stopPropagation(); openAVMenu(n, more); });
      el.appendChild(more);
      var handle = document.createElement("button");
      handle.className = "pCtl pHandle"; handle.type = "button"; handle.title = "Drag to resize"; handle.setAttribute("aria-label", "Resize " + (n.type === "audio" ? "recording" : "video"));
      handle.addEventListener("pointerdown", function(e){ startAVResize(e, n); });
      handle.addEventListener("mousedown", function(e){ e.preventDefault(); });
      el.appendChild(handle);
      el.addEventListener("pointerdown", function(e){
        if(e.pointerType === "mouse" && e.button !== 0) return;
        if(b.cap.isContentEditable && b.cap.contains(e.target)) return;
        e.preventDefault();
        endEditing(); closeCaptureMenu();
        if(searchInput.value.trim()) setTimeout(clearSearch, 0);
        if(e.ctrlKey || e.metaKey){ toggleSelected(n.id); return; }
        var group = selected.has(n.id) && selected.size > 1;
        if(!group) setSelection([n.id]);
        bringToFront(n, el);
        startDrag(e, n, group ? selectedNotes() : [n]);
      });
      el.addEventListener("dblclick", function(e){
        e.preventDefault(); e.stopPropagation();
        if(b.cap.contains(e.target)) editCaption(n);
      });
      if(isNew) el.addEventListener("animationend", function(){ el.classList.remove("new"); }, {once:true});
    }
    boardInner.appendChild(el);
    mediaAvailable(n).then(function(ok){ if(!ok) markMissing(n); else if(n.mediaState === "uploading" && !n.assetId && !readOnly){ /* ours, still on its way up */ } });
    return el;
  }
  function openAVMenu(n, anchor){
    var pop = openFloatingPopover(anchor, "noteMenu");
    if(!pop) return;
    if(n.type === "video") pop.appendChild(menuItem(ICONS.film, "Open large", function(){ closeFloatingPopovers(); openVideoLarge(n); }));
    pop.appendChild(menuItem(ICONS.pencil, n.caption ? "Rename" : "Add a label", function(){ closeFloatingPopovers(); editCaption(n); }));
    pop.appendChild(pinMenuItem(n));
    pop.appendChild(menuItem(ICONS.copy, "Duplicate", function(){ closeFloatingPopovers(); duplicateNotes([n.id]); }, {kbd: MOD + "+D"}));
    var moveItem = menuItem(ICONS.move, "Move to board", function(){
      var open = moveItem.nextSibling && moveItem.nextSibling.classList && moveItem.nextSibling.classList.contains("boardPick");
      if(open){ moveItem.nextSibling.remove(); return; }
      moveItem.parentNode.insertBefore(boardPicker(document.createDocumentFragment(), [n.id]), moveItem.nextSibling);
    }, {kbd:"\u203A"});
    pop.appendChild(moveItem);
    pop.appendChild(menuItem(ICONS.trash, "Delete", function(){ closeFloatingPopovers(); deleteNotes([n.id]); }, {cls:"danger"}));
    var hint = makeDiv("menuHint");
    hint.textContent = "Stored on this device only for now.";
    pop.appendChild(hint);
  }
  function drawThumbAV(g, n, it, sc, ox, oy, dark){
    var w = it.w * sc, h = it.h * sc;
    g.save();
    g.translate(ox + (n.x + it.w/2) * sc, oy + (n.y + it.h/2) * sc);
    g.rotate((n.rot || 0) * Math.PI / 180);
    g.shadowColor = dark ? "rgba(0,0,0,0.6)" : "rgba(60,45,10,0.3)"; g.shadowBlur = 3; g.shadowOffsetY = 1.2;
    g.fillStyle = n.type === "audio" ? "#f5eedb" : "#1f1c1a";
    g.fillRect(-w/2, -h/2, w, h);
    g.shadowColor = "transparent";
    if(n.type === "audio"){
      g.strokeStyle = "#3a3528"; g.lineWidth = Math.max(0.5, 2 * sc);
      g.beginPath(); g.arc(-w/2 + 29 * sc, 0, 17 * sc, 0, 7); g.stroke();
      g.fillStyle = "rgba(58,53,40,0.5)"; g.fillRect(-w/2 + 56 * sc, 2 * sc, w - 100 * sc, 6 * sc);
    } else if(n.poster){
      var im = thumbImage(n.poster);
      if(im.complete && im.naturalWidth) g.drawImage(im, -w/2 + 8 * sc, -h/2 + 15 * sc, w - 16 * sc, (n.w || 200) * (n.imgRatio || 0.5625) * sc);
    }
    g.restore();
  }

  // ---------- physical scraps: receipt, ticket, postcard, photo strip ----------
  // Pure rules (fields, cleaning, sizes) live in js/objects.js. Here they get drawn, edited, moved and shared like every other
  // board object. Every field is plain text, always written with textContent. Decorative numbers are never scannable codes.
  var OBJECT_MENUS = {};                                         // object types register their own context/options menu here
  var PAPER_MONO = "'Cutive Mono','Courier Prime','Courier New',monospace";
  var PAPER_TYPE = "'Special Elite','Courier Prime','Courier New',monospace";
  function isPaper(n){ return !!n && !!window.Stick && Stick.objects && Stick.objects.isKind(n.type); }
  function paperHelpers(){ return {safeImage: safeImage, safeHref: safeHref, locale: (typeof navigator !== "undefined" && navigator.language) || undefined, tz: (function(){ try{ return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; }catch(e){ return ""; } })(), fontOk: function(f){ return !!FONT_BY_NAME[f]; }}; }
  function todayShort(){ try{ return new Date().toLocaleDateString(undefined, {day:"numeric", month:"short", year:"numeric"}); }catch(e){ return isoDate(new Date()); } }
  function paperLabel(n){ return Stick.objects.label(n); }
  function paperSize(n){
    if(n.el && n.el.offsetWidth) return {w:n.el.offsetWidth, h:n.el.offsetHeight};
    return Stick.objects.sizeEstimate(n);
  }
  function paperWidthRange(n){ var r = Stick.objects.WIDTH[n.type]; return {min:r[0], max:r[1]}; }

  // which text fields each kind lets you edit in place
  var PAPER_FIELDS = {
    receipt: {title:{max:60, ph:"Add a title"}, date:{max:24, ph:"Add a date"}, body:{max:600, multi:true, ph:"Add details"}, amount:{max:16, ph:"Add an amount"}},
    ticket: {title:{max:60, ph:"Add a title"}, dateTime:{max:40, ph:"Add date and time"}, place:{max:60, ph:"Add a place"}, details:{max:160, multi:true, ph:"Add details"}},
    postcard: {location:{max:40, ph:"Where?"}, message:{max:300, multi:true, ph:"Write a message"}, recipient:{max:40, ph:"To:"}},
    photo_strip: {caption:{max:80, ph:"Add a caption"}}
  };
  function paperField(cls, field, n, extra){
    var d = makeDiv(cls + " poF"); d.dataset.f = field; d.dataset.ph = PAPER_FIELDS[n.type][field].ph;
    d.textContent = n[field] || ""; if(extra) d.dir = "auto";
    return d;
  }
  function stripFrameSrc(f){ return f && f.image ? f.image : ""; }

  // ---- building the element
  function buildPaperEl(item){
    var t = item.type, v = item.variant || Stick.objects.VARIANTS[t][0];
    var el = makeDiv("boardObj paperObj po-" + t.replace("_", "-") + " v-" + v + (t === "ticket" ? " o-" + (item.orient || "landscape") : ""));
    el.style.setProperty("--pw", (item.w || Stick.objects.defaultW(item)) + "px");
    el.style.setProperty("--rot", (item.rot || 0) + "deg");
    el.setAttribute("role", "group"); el.setAttribute("aria-label", paperLabel(item)); el.tabIndex = 0;
    var sheet = makeDiv("poSheet"), api = {el: el, sheet: sheet};
    el.appendChild(sheet);
    if(t === "receipt"){
      sheet.appendChild(paperField("poTitle", "title", item, true));
      sheet.appendChild(paperField("poMeta", "date", item, true));
      sheet.appendChild(makeDiv("poRule"));
      var body = paperField("poBody", "body", item, true); sheet.appendChild(body);
      var amt = makeDiv("poTotal poF"); amt.dataset.f = "amount"; amt.dataset.ph = PAPER_FIELDS.receipt.amount.ph;
      amt.innerHTML = '<span class="poTotalLab" aria-hidden="true">TOTAL</span><b class="poTotalVal"></b>'; amt.querySelector("b").textContent = item.amount || "";
      amt.classList.toggle("empty", !item.amount); sheet.appendChild(amt);
      var bar = makeDiv("poBar"); bar.setAttribute("aria-hidden", "true"); bar.textContent = Stick.objects.serial(item.id, 12).replace(/(\d{4})(?=\d)/g, "$1 "); sheet.appendChild(bar);
    } else if(t === "ticket"){
      var main = makeDiv("poMain"), stub = makeDiv("poStub");
      main.appendChild(paperField("poTitle", "title", item, true));
      main.appendChild(paperField("poMeta", "dateTime", item, true));
      main.appendChild(paperField("poPlace", "place", item, true));
      main.appendChild(paperField("poDetails", "details", item, true));
      stub.setAttribute("aria-hidden", "true");
      var sn = makeDiv("poSerial"); sn.textContent = Stick.objects.serial(item.id, 8); stub.appendChild(sn);
      sheet.appendChild(main); sheet.appendChild(stub);
    } else if(t === "postcard"){
      var card = makeDiv("poCard"), front = makeDiv("poFace poFront"), back = makeDiv("poFace poBack");
      var pic = makeDiv("poPic"); pic.style.aspectRatio = "1 / " + (item.imgRatio || 0.667);
      if(item.image){ var im = document.createElement("img"); PreviewCache.use(im, item.image, item.w || 320); im.alt = item.location ? "Postcard picture: " + item.location : "Postcard picture"; im.draggable = false; pic.appendChild(im); }
      else { var add = document.createElement("button"); add.type = "button"; add.className = "poAddPic"; add.textContent = "Add a photo"; pic.appendChild(add); api.addPic = add; }
      front.appendChild(pic); front.appendChild(paperField("poLocation", "location", item, true));
      var left = makeDiv("poMsgCol"); left.appendChild(paperField("poMessage", "message", item, true));
      var right = makeDiv("poAddrCol"); var stamp = makeDiv("poStamp"); stamp.setAttribute("aria-hidden", "true"); right.appendChild(stamp);
      var pm = makeDiv("poPostmark"); pm.setAttribute("aria-hidden", "true"); right.appendChild(pm);
      right.appendChild(paperField("poRecipient", "recipient", item, true));
      for(var li = 0; li < 3; li++){ var ln = makeDiv("poAddrLine"); ln.setAttribute("aria-hidden", "true"); right.appendChild(ln); }
      back.appendChild(left); back.appendChild(makeDiv("poDivide")); back.appendChild(right);
      card.appendChild(front); card.appendChild(back); sheet.appendChild(card);
      back.setAttribute("aria-hidden", "true");
    } else if(t === "photo_strip"){
      var frames = makeDiv("poFrames");
      (item.frames || []).forEach(function(f, i){
        var fr = makeDiv("poFrame"); fr.style.aspectRatio = "1 / " + (f.ratio || 0.75);
        var src = stripFrameSrc(f);
        if(src){ var im2 = document.createElement("img"); PreviewCache.use(im2, src, item.w || 140); im2.alt = f.cap || "Strip picture " + (i + 1) + " of " + item.frames.length; im2.draggable = false; fr.appendChild(im2); }
        else fr.classList.add("pending");
        frames.appendChild(fr);
      });
      sheet.appendChild(frames);
      sheet.appendChild(paperField("poCaption", "caption", item, true));
    }
    return api;
  }
  function buildStaticPaper(item){
    if(item.type === "shopping") return buildStaticShopping(item);
    var b = buildPaperEl(item); b.el.classList.add("static"); b.el.removeAttribute("tabindex");
    if(item.type === "postcard"){                              // shared or exported views: tap to turn it over
      b.el.addEventListener("click", function(){ var back = !b.el.classList.contains("flipped"); b.el.classList.toggle("flipped", back); });
    }
    return b.el;
  }

  // ---- placing it on the board, with the same drag / select / group behaviour as every other object
  function renderPaper(n, isNew){
    if(n.type === "shopping") return renderShopping(n, isNew);
    var b = buildPaperEl(n), el = b.el;
    if(isNew) el.classList.add("new");
    el.dataset.id = n.id; el.style.left = n.x + "px"; el.style.top = n.y + "px"; el.style.zIndex = n.z;
    if(selected.has(n.id)) el.classList.add("selected");
    n.el = el; n.textEl = null; n.captionEl = null;
    if(!readOnly){
      function ctl(cls, html, title, onDown){
        var c = document.createElement("button");
        c.className = "pCtl " + cls; c.innerHTML = html; c.title = title; c.setAttribute("aria-label", title); c.type = "button";
        c.addEventListener("pointerdown", function(e){ e.stopPropagation(); if(onDown) onDown(e, c); });
        c.addEventListener("mousedown", function(e){ e.preventDefault(); });
        el.appendChild(c); return c;
      }
      var more = ctl("pMore", ICONS.more, "Options for this " + Stick.objects.LABELS[n.type]);
      more.addEventListener("click", function(e){ e.stopPropagation(); openObjectMenu(n, more); });
      ctl("pHandle", "", "Drag to resize", function(e){ startPaperResize(e, n); });
      if(n.type === "postcard"){
        var flip = ctl("pFlip", "⇄", "Flip the postcard", null);
        flip.addEventListener("click", function(e){ e.stopPropagation(); flipPostcard(n); });
      }
      el.addEventListener("pointerdown", function(e){
        if(e.pointerType === "mouse" && e.button !== 0) return;
        if(e.target.closest && e.target.closest(".poF.editing")) return;                // typing in a field
        if(e.target.closest && e.target.closest(".poAddPic")) return;
        e.preventDefault();
        endEditing(); closeCaptureMenu();
        if(searchInput.value.trim()) setTimeout(clearSearch, 0);
        if(e.ctrlKey || e.metaKey){ toggleSelected(n.id); return; }
        var group = selected.has(n.id) && selected.size > 1;
        var fEl = e.target.closest && e.target.closest(".poF"), wasOnly = selected.size === 1 && selected.has(n.id), sx = e.clientX, sy = e.clientY;
        if(!group) setSelection([n.id]);
        bringToFront(n, el);
        startDrag(e, n, group ? selectedNotes() : [n]);
        if(fEl && wasOnly){                                  // already selected: a plain click on its text edits it (the text cursor promises that)
          window.addEventListener("pointerup", function once(ev){
            window.removeEventListener("pointerup", once);
            if(Math.hypot(ev.clientX - sx, ev.clientY - sy) > 4) return;
            setTimeout(function(){ if(fEl.isConnected && !activePaperEdit) editPaperField(n, fEl); }, 0);
          });
        }
      });
      el.addEventListener("dblclick", function(e){
        e.preventDefault(); e.stopPropagation();
        var f = e.target.closest && e.target.closest(".poF");
        if(n.type === "photo_strip" && !f){ openStripEditor(n); return; }
        if(f) editPaperField(n, f); else { var first = el.querySelector(".poF"); if(first) editPaperField(n, first); }
      });
      el.addEventListener("keydown", function(e){
        if(e.target !== el) return;
        if(e.key === "Enter"){ e.preventDefault(); if(n.type === "photo_strip") openStripEditor(n); else { var f1 = el.querySelector(".poF"); if(f1) editPaperField(n, f1); } }
        else if(e.key === " "){ e.preventDefault(); setSelection([n.id]); }
        else if(e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")){ e.preventDefault(); var r = el.getBoundingClientRect(); openObjectContextMenu(n, r.left + 24, r.top + 24); }
        else if(e.key === "Delete" || e.key === "Backspace"){ e.preventDefault(); deleteNotes([n.id]); }
      });
      el.addEventListener("focus", function(){ if(!selected.has(n.id)) setSelection([n.id]); });
      if(b.addPic) b.addPic.addEventListener("click", function(e){ e.stopPropagation(); pickPostcardPhoto(n); });
      if(isNew) el.addEventListener("animationend", function(){ el.classList.remove("new"); }, {once:true});
    }
    boardInner.appendChild(el);
    return el;
  }

  // ---- editing a text field in place (plain text only; Enter finishes a one-line field; Esc cancels)
  var activePaperEdit = null;
  function editPaperField(n, fieldEl){
    if(readOnly) return;
    var f = fieldEl.dataset.f, spec = PAPER_FIELDS[n.type][f];
    if(!spec) return;
    var holder = window.Stick && Stick.collab && Stick.collab.blockedBy(n.id);
    if(holder){ toast(holder + " is editing this " + Stick.objects.LABELS[n.type] + "."); return; }
    if(activePaperEdit) activePaperEdit();
    setSelection([n.id]);
    if(window.Stick && Stick.collab) Stick.collab.setEditing(n.id);
    var host = fieldEl.classList.contains("poTotal") ? fieldEl.querySelector("b") : fieldEl, before = captureState([n.id]), start = n[f] || "", done = false;
    host.contentEditable = "true"; fieldEl.classList.add("editing"); host.focus();
    var rg = document.createRange(); rg.selectNodeContents(host); rg.collapse(false); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rg);
    function value(){ return spec.multi ? Stick.objects.clean.lines(host.innerText, spec.max, 14) : Stick.objects.clean.one(host.textContent, spec.max); }
    function key(e){
      if(e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); host.textContent = start; finish(false); }
      else if(e.key === "Enter"){ e.preventDefault(); if(spec.multi && !e.ctrlKey && !e.metaKey){ document.execCommand("insertLineBreak"); } else finish(true); }
    }
    function paste(e){ e.preventDefault(); var t = (e.clipboardData && e.clipboardData.getData("text/plain")) || ""; document.execCommand("insertText", false, spec.multi ? t : t.replace(/\s+/g, " ")); }
    function finish(commit){
      if(done) return; done = true; activePaperEdit = null;
      if(window.Stick && Stick.collab) Stick.collab.setEditing(null);
      host.removeEventListener("keydown", key); host.removeEventListener("blur", onBlur); host.removeEventListener("paste", paste);
      host.contentEditable = "false"; fieldEl.classList.remove("editing");
      var v = commit ? value() : start;
      host.textContent = v;
      if(fieldEl.classList.contains("poTotal")) fieldEl.classList.toggle("empty", !v);
      if(v === start) return;
      n[f] = v; if(n.el) n.el.setAttribute("aria-label", paperLabel(n));
      saveNotes(); recordChange("Edit " + Stick.objects.LABELS[n.type], before);
    }
    function onBlur(){ finish(true); }
    host.addEventListener("keydown", key); host.addEventListener("blur", onBlur); host.addEventListener("paste", paste);
    activePaperEdit = function(){ finish(true); };
  }
  document.addEventListener("pointerdown", function(e){
    if(activePaperEdit && !(e.target.closest && e.target.closest(".poF.editing"))) activePaperEdit();
  }, true);

  function startPaperResize(e, n){
    e.preventDefault(); e.stopPropagation();
    var el = n.el, before = captureState([n.id]), startX = e.clientX, startW = n.w || Stick.objects.defaultW(n), rg = paperWidthRange(n), w = startW;
    document.body.style.cursor = "nwse-resize";
    function move(ev){ w = Math.round(Math.min(rg.max, Math.max(rg.min, startW + (ev.clientX - startX) / boardZoom))); el.style.setProperty("--pw", w + "px"); }
    function up(){
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      document.body.style.cursor = "";
      if(w === startW) return;
      n.w = w; recoverVertical([n]); ensureWidth(); saveNotes(); updateMinimap(); recordChange("Resize " + Stick.objects.LABELS[n.type], before);
    }
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
  }

  // ---- variants, orientation, flipping
  function setPaperProp(n, prop, val, label){
    if(n[prop] === val) return;
    var before = captureState([n.id]);
    n[prop] = val;
    if(prop === "orient"){ n.w = val === "portrait" ? 200 : 330; }
    saveNotes(); rerenderNote(n); recordChange(label, before);
  }
  function flipPostcard(n){
    if(!n.el) return;
    var back = !n.el.classList.contains("flipped");
    n.el.classList.toggle("flipped", back);
    var f = n.el.querySelector(".poFront"), b2 = n.el.querySelector(".poBack");
    if(f) f.setAttribute("aria-hidden", String(back)); if(b2) b2.setAttribute("aria-hidden", String(!back));
  }
  function pickPostcardPhoto(n){
    var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
    inp.onchange = function(){
      var f = inp.files && inp.files[0]; if(!f) return;
      if(f.type.indexOf("image/") !== 0){ toast("That doesn't look like a photo."); return; }
      loadPhotoFile(f).then(function(l){
        var before = captureState([n.id]);
        n.image = l.src; n.imgRatio = clampNum(l.ratio, 0.4, 2.5, 0.667); delete n.assetId; delete n.mediaState;
        saveNotes(); rerenderNote(n); recordChange("Add postcard photo", before);
        if(cloudSync) cloudSync.notesChanged();
      }, function(){ toast("That image couldn't be read."); });
    };
    inp.click();
  }

  // ---- the menu for every paper object
  function openObjectMenu(n, anchor){
    if(n.type && OBJECT_MENUS[n.type]) OBJECT_MENUS[n.type](n, anchor);
  }
  function paperMenu(n, anchor){
    var pop = openFloatingPopover(anchor, "noteMenu");
    if(!pop) return;
    var kind = Stick.objects.LABELS[n.type], first = n.el && n.el.querySelector(".poF");
    if(first) pop.appendChild(menuItem(ICONS.pencil, "Edit text", function(){ closeFloatingPopovers(); editPaperField(n, first); }));
    var fields = PAPER_FIELDS[n.type];
    Object.keys(fields).forEach(function(f){
      if(f === "title" || f === "caption" || f === "location" || f === "message") return;
      if(n[f]) return;
      var fe = n.el && n.el.querySelector('.poF[data-f="' + f + '"]'); if(!fe) return;
      pop.appendChild(menuItem(ICONS.pencil, fields[f].ph, function(){ closeFloatingPopovers(); editPaperField(n, fe); }));
    });
    var vh = makeDiv("menuHint"); vh.textContent = "Style"; pop.appendChild(vh);
    Stick.objects.VARIANTS[n.type].forEach(function(v){
      pop.appendChild(menuItem(v === (n.variant || Stick.objects.VARIANTS[n.type][0]) ? ICONS.tick : '<svg viewBox="0 0 24 24"></svg>', Stick.objects.VARIANT_NAMES[v], function(){ closeFloatingPopovers(); setPaperProp(n, "variant", v, "Change " + kind + " style"); }));
    });
    if(n.type === "ticket") pop.appendChild(menuItem(ICONS.move, n.orient === "portrait" ? "Make it landscape" : "Make it portrait", function(){ closeFloatingPopovers(); setPaperProp(n, "orient", n.orient === "portrait" ? "landscape" : "portrait", "Turn ticket"); }));
    if(n.type === "postcard"){
      pop.appendChild(menuItem(ICONS.image, n.image || n.assetId ? "Change photo" : "Add a photo", function(){ closeFloatingPopovers(); pickPostcardPhoto(n); }));
      pop.appendChild(menuItem(ICONS.move, "Flip", function(){ closeFloatingPopovers(); flipPostcard(n); }));
    }
    if(n.type === "photo_strip") pop.appendChild(menuItem(ICONS.image, "Edit strip…", function(){ closeFloatingPopovers(); openStripEditor(n); }));
    pop.appendChild(makeDiv("menuSep"));
    pinAndArrange(pop, n);
    pop.appendChild(menuItem(ICONS.copy, "Duplicate", function(){ closeFloatingPopovers(); duplicateNotes([n.id]); }, {kbd: MOD + "+D"}));
    var moveItem = menuItem(ICONS.move, "Move to board", function(){
      var open = moveItem.nextSibling && moveItem.nextSibling.classList && moveItem.nextSibling.classList.contains("boardPick");
      if(open){ moveItem.nextSibling.remove(); return; }
      moveItem.parentNode.insertBefore(boardPicker(document.createDocumentFragment(), [n.id]), moveItem.nextSibling);
    }, {kbd:"›"});
    pop.appendChild(moveItem);
    pop.appendChild(menuItem(ICONS.share, "Share " + kind + "…", function(){ closeFloatingPopovers(); openShareModal([n]); }));
    pop.appendChild(menuItem(ICONS.trash, "Delete", function(){ closeFloatingPopovers(); deleteNotes([n.id]); }, {cls:"danger"}));
  }
  Stick.objects.KINDS.forEach(function(k){ OBJECT_MENUS[k] = paperMenu; });

  // ---------- Shopping List ----------
  // One node for anything you mean to buy. The base is [ ] Item; quantity, note, price, link and tag are optional, switched on per list in the
  // note's ... menu, and an item only shows a detail it actually has. A paper receipt strip holds the words; a small fixed-size cart holds
  // the paper. Ticking an item moves it into "In the cart"; that is NOT the same as marking the whole list Done (separate, in the menu).
  // Rules, limits and maths live in js/shopping.js. Items are never edited in place in a way that history could see: every change makes a
  // new items array, so Undo restores exactly what was there.
  function isShopping(n){ return !!n && n.type === "shopping"; }
  // the cart: small, drawn by hand (uneven wires, a tilted handle, wheels hung from the frame). It is an accent on the paper, never a footer.
  var SHOP_CART = '<svg viewBox="0 0 100 78" aria-hidden="true" focusable="false">' +
    '<path class="cFill" d="M25 17C42 15.2 64 16.6 90 14.6L80.5 50.4C65 52.2 47 50.4 33.6 52.6Z"/>' +
    '<path class="cLine" d="M5.5 9.5C11 8.4 16.5 9.6 21.5 11.4L29.2 19.5"/>' +
    '<path class="cLine" d="M25 17C42 15.2 64 16.6 90 14.6L80.5 50.4C65 52.2 47 50.4 33.6 52.6Z"/>' +
    '<path class="cWire" d="M37 18.5L40.4 51"/><path class="cWire" d="M49.2 17.4L50.6 51.6"/><path class="cWire" d="M62 17.2L61.2 51"/><path class="cWire" d="M75.4 16.2L71.6 50.8"/>' +
    '<path class="cWire" d="M28.8 28.6C50 26.8 70 29.6 85 27.2"/><path class="cWire" d="M31.4 40.4C50 38.8 66.6 41.4 81.6 39"/>' +
    '<path class="cLine" d="M39.5 52.4L35.8 62.6"/><path class="cLine" d="M75.8 50.4L77.6 62.4"/><path class="cLine" d="M35.8 62.6C46 64 66 63.4 77.6 62.4"/>' +
    '<circle class="cWheel" cx="35" cy="69" r="5.6"/><circle class="cWheel" cx="78" cy="69" r="5.6"/><circle class="cHub" cx="35" cy="69" r="1.3"/><circle class="cHub" cx="78" cy="69" r="1.3"/></svg>';
  var SHOP_BOX = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="shBoxLine" d="M5.2 4.6c4.6-.5 9.6-.4 13.6.1.5 4.3.5 9.4.1 14.2-4.3.5-9.1.5-13.9.1-.4-4.8-.4-9.5.2-14.4z" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path class="shTick" d="M6.5 12.6c1.6 1.4 2.8 2.9 4 4.7 2.2-4.4 4.8-8 8.1-11.3" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SHOP_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4h2.6l2.3 11h10l2-8H6.3"/><circle cx="9.5" cy="19.2" r="1.4"/><circle cx="16.8" cy="19.2" r="1.4"/></svg>';
  ICONS.cart = SHOP_ICON;
  function shopMinor(n){ return Stick.shopping.minorDigits(n.cur); }
  function shopMoney(n, minor){ return Stick.shopping.formatPrice(minor, n.cur, shopLocale()); }
  function shopLocale(){ try{ return navigator.language || undefined; }catch(e){ return undefined; } }
  function shopTz(){ try{ return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; }catch(e){ return ""; } }
  // the look is being chosen: "a" (cart tucked at the corner), "b" (the receipt emerges from a centred cart), "c" (cart clipped on top, torn paper).
  // A list may carry a temporary _variant (never saved); in development Stick.dev.shopVariant("b") sets the default for every list.
  function shopVariant(n){
    var v = n && n._variant;
    if(!v && window.Stick && Stick.dev){ try{ v = localStorage.getItem("stickit.dev.shopVariant"); }catch(e){} }
    return /^[abc]$/.test(v || "") ? v : "a";
  }
  function shopHas(n, f){ return (n.fields || []).indexOf(f) !== -1; }
  function shopEditable(){ return !readOnly; }

  // one change to the list: a new items array in, history and saving handled here
  function shopChange(n, label, make, opts){
    opts = opts || {};
    if(!shopEditable() || !n) return false;
    var before = captureState([n.id]), cur = (n.items || []).map(function(it){ return Object.assign({}, it); }), next = make(cur);
    if(!next) return false;
    n.items = next;
    if(opts.quiet){ saveNotesTyping(); }
    else { saveNotes(); repaintShopping(n, opts); updateMinimap(); recordChange(label, before); }
    return true;
  }
  function shopSet(n, label, patch){
    if(!shopEditable()) return;
    var before = captureState([n.id]);
    Object.keys(patch).forEach(function(k){ n[k] = patch[k]; });
    saveNotes(); repaintShopping(n); updateMinimap(); recordChange(label, before);
  }

  // ---- building the element
  function shopRow(n, it, st){
    var S = Stick.shopping, li = document.createElement("li"), inCart = it.c === 1;
    li.className = "shRow" + (inCart ? " in" : ""); li.dataset.id = it.id; li.dataset.itemId = it.id;
    var box = document.createElement("button"); box.type = "button"; box.className = "shBox"; box.innerHTML = SHOP_BOX;
    box.setAttribute("role", "checkbox"); box.setAttribute("aria-checked", inCart ? "true" : "false"); box.setAttribute("aria-label", (inCart ? "In the cart: " : "To buy: ") + (it.t || "item"));
    if(st.readOnly) box.disabled = true;
    else box.addEventListener("click", function(e){ e.stopPropagation(); shopTick(n, it.id, !inCart); });
    li.appendChild(box);
    var body = makeDiv("shBody"), line = makeDiv("shLine"), txt = document.createElement("span");
    txt.className = "shText"; txt.textContent = it.t; txt.dir = "auto"; txt.setAttribute("role", "textbox"); txt.setAttribute("aria-label", "Item"); txt.setAttribute("data-ph", "Item");
    if(!st.readOnly){ txt.contentEditable = "true"; txt.spellcheck = true; wireShopText(n, it, txt); }
    line.appendChild(txt);
    var fieldsOn = ["qty", "note", "price", "link", "tag"].some(function(f){ return shopHas(n, f); });
    if(!st.readOnly){
      if(fieldsOn){
        var more = document.createElement("button"); more.type = "button"; more.className = "shMore"; more.textContent = "\u25be"; more.title = "Details"; more.setAttribute("aria-label", "Details for " + (it.t || "this item")); more.setAttribute("aria-expanded", String(st.openId === it.id));
        more.addEventListener("click", function(e){ e.stopPropagation(); n._openItem = n._openItem === it.id ? null : it.id; repaintShopping(n, {focusDetail: n._openItem}); });
        line.appendChild(more);
      }
      var del = document.createElement("button"); del.type = "button"; del.className = "shDel"; del.innerHTML = "\u00d7"; del.title = "Remove"; del.setAttribute("aria-label", "Remove " + (it.t || "this item"));
      del.addEventListener("click", function(e){ e.stopPropagation(); shopChange(n, "Remove item", function(items){ return Stick.shopping.remove(items, it.id); }); });
      line.appendChild(del);
    }
    body.appendChild(line);
    // the details this item really has, as tiny receipt annotations under its name; nothing for a detail it lacks or a field that is off
    var meta = makeDiv("shMeta"), open = st.openId === it.id;
    if(shopHas(n, "qty") && it.q){ var q = document.createElement("span"); q.className = "shQty"; q.textContent = "\u00d7" + it.q; meta.appendChild(q); }
    if(shopHas(n, "price") && it.p != null){ var p = document.createElement("span"); p.className = "shPrice"; p.textContent = shopMoney(n, it.p); meta.appendChild(p); }
    if(shopHas(n, "tag") && it.g){ var g = document.createElement("span"); g.className = "shTag"; g.textContent = it.g; meta.appendChild(g); }
    if(shopHas(n, "link") && it.l){
      var lk = document.createElement(open ? "span" : "a"); lk.className = "shLink"; lk.title = open ? "Link" : "Open the link"; lk.textContent = "link \u2197";
      if(!open){ lk.href = it.l; lk.target = "_blank"; lk.rel = "noopener noreferrer"; lk.setAttribute("aria-label", "Open the link for " + (it.t || "this item")); lk.addEventListener("pointerdown", function(e){ e.stopPropagation(); }); lk.addEventListener("click", function(e){ e.stopPropagation(); }); }
      meta.appendChild(lk);
    }
    if(meta.firstChild && !open) body.appendChild(meta);
    if(shopHas(n, "note") && it.n && !open){ var nt = makeDiv("shNote"); nt.textContent = it.n; nt.dir = "auto"; body.appendChild(nt); }
    if(open && !st.readOnly) body.appendChild(shopDetailInputs(n, it));
    li.appendChild(body);
    return li;
  }
  function shopDetailInputs(n, it){
    var S = Stick.shopping, wrap = makeDiv("shEdit");
    var PRE = {qty: "\u00d7", note: "note", tag: "#", link: "link \u2197"};
    function curSymbol(){ var c = S.CURRENCIES.filter(function(x){ return x[0] === n.cur; })[0]; return c ? c[1] : n.cur; }
    function input(f, label, value, attrs){
      var l = document.createElement("label"); l.className = "shF f-" + f; var s = document.createElement("span"); s.className = "shPre"; s.textContent = f === "price" ? curSymbol() : PRE[f]; l.appendChild(s);
      var inp = document.createElement("input"); inp.type = "text"; inp.value = value || ""; inp.dataset.f = f; inp.autocomplete = "off"; inp.setAttribute("dir", "auto"); inp.setAttribute("aria-label", label);
      Object.keys(attrs || {}).forEach(function(k){ inp.setAttribute(k, attrs[k]); });
      l.appendChild(inp); wrap.appendChild(l); return inp;
    }
    function commit(f, key, inp, parse){
      var v = inp.value, val = parse(v);
      if(val === false){ inp.classList.add("bad"); setTimeout(function(){ inp.classList.remove("bad"); }, 600); inp.value = shopFieldValue(n, it, f); return; }
      var cur = (n.items || []).filter(function(x){ return x.id === it.id; })[0]; if(!cur || shopFieldValue(n, cur, f) === shopFieldValue(n, Object.assign({}, cur, shopPatch(key, val)), f)) return;
      shopChange(n, "Edit item", function(items){ return S.update(items, it.id, shopPatch(key, val)); }, {keepOpen: true, focusDetail: n._openItem});
    }
    function text(f, key, label, max, attrs){
      var inp = input(f, label, it[key], Object.assign({maxlength: max}, attrs));
      inp.addEventListener("keydown", function(e){ if(e.key === "Enter"){ e.preventDefault(); inp.blur(); } else if(e.key === "Escape"){ e.stopPropagation(); inp.value = it[key] || ""; inp.blur(); n._openItem = null; repaintShopping(n); } e.stopPropagation(); });
      inp.addEventListener("change", function(){ commit(f, key, inp, function(v){ v = v.replace(/\s+/g, " ").trim(); return v || null; }); });
    }
    if(shopHas(n, "qty")) text("qty", "q", "Quantity", S.LIMITS.qty, {placeholder: "2 or 500 g"});
    if(shopHas(n, "price")){
      var d = shopMinor(n), inp = input("price", "Price (" + n.cur + ")", it.p == null ? "" : (it.p / Math.pow(10, d)).toFixed(d), {inputmode: "decimal", placeholder: d ? "0." + "0".repeat(d) : "0"});
      inp.addEventListener("keydown", function(e){ if(e.key === "Enter"){ e.preventDefault(); inp.blur(); } else if(e.key === "Escape"){ e.stopPropagation(); inp.blur(); } e.stopPropagation(); });
      inp.addEventListener("change", function(){ commit("price", "p", inp, function(v){ if(!v.trim()) return null; var m = S.parsePrice(v, n.cur); return m == null ? false : m; }); });
    }
    if(shopHas(n, "note")) text("note", "n", "Note", S.LIMITS.note, {});
    if(shopHas(n, "link")){
      var li = input("link", "Link", it.l, {inputmode: "url", maxlength: S.LIMITS.link, placeholder: "https://"});
      li.addEventListener("keydown", function(e){ if(e.key === "Enter"){ e.preventDefault(); li.blur(); } else if(e.key === "Escape"){ e.stopPropagation(); li.blur(); } e.stopPropagation(); });
      li.addEventListener("change", function(){ commit("link", "l", li, function(v){ v = v.trim(); if(!v) return null; if(!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = "https://" + v; var ok = safeHref(v); return ok || false; }); });
    }
    if(shopHas(n, "tag")) text("tag", "g", "Tag", S.LIMITS.tag, {});
    return wrap;
  }
  function shopFieldValue(n, it, f){ return f === "qty" ? (it.q || "") : f === "note" ? (it.n || "") : f === "tag" ? (it.g || "") : f === "link" ? (it.l || "") : (it.p == null ? "" : String(it.p)); }
  function shopPatch(key, val){ var p = {}; p[key] = val == null ? undefined : val; if(val == null) p[key] = undefined; return p; }

  // typing in an item's words: kept as you type (device now, account after a pause); one history step per visit
  function wireShopText(n, it, span){
    var before = null, startText = it.t;
    function holder(){ return window.Stick && Stick.collab && Stick.collab.blockedBy(n.id); }
    span.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
    span.addEventListener("focus", function(){
      var h = holder(); if(h){ toast(h + " is editing this list."); span.blur(); return; }
      endEditing(); before = captureState([n.id]); startText = it.t;
      if(window.Stick && Stick.collab) Stick.collab.setEditing(n.id);
      if(!selected.has(n.id)) setSelection([n.id]);
    });
    span.addEventListener("input", function(){
      var t = span.textContent.replace(/[\r\n]+/g, " ").slice(0, Stick.shopping.LIMITS.text);
      if(span.textContent !== t) span.textContent = t;
      shopChange(n, "Edit item", function(items){ return Stick.shopping.update(items, it.id, {t: t.replace(/\s+/g, " ").trim()}); }, {quiet: true});
      var cur = (n.items || []).filter(function(x){ return x.id === it.id; })[0]; if(cur) it = cur;
    });
    span.addEventListener("paste", function(e){ e.preventDefault(); var tx = (e.clipboardData && e.clipboardData.getData("text/plain")) || ""; document.execCommand("insertText", false, tx.replace(/\s+/g, " ")); });
    span.addEventListener("keydown", function(e){
      if(e.isComposing) return;
      if(e.key === "Enter"){ e.preventDefault(); e.stopPropagation(); span.blur(); var add = n.el && n.el.querySelector(".shAddIn"); if(add) add.focus(); return; }
      if(e.key === "Escape"){ e.stopPropagation(); e.preventDefault(); span.blur(); return; }
      if(e.key === "Backspace" && !span.textContent){
        e.preventDefault(); e.stopPropagation();
        var idx = (n.items || []).map(function(x){ return x.id; }).indexOf(it.id), prev = n.items[idx - 1];
        shopChange(n, "Remove item", function(items){ return Stick.shopping.remove(items, it.id); }, {focusId: prev ? prev.id : null, focusEnd: true});
        return;
      }
      if(e.key === "ArrowUp" || e.key === "ArrowDown"){
        var rows = Array.prototype.slice.call(n.el.querySelectorAll(".shRow .shText")), i = rows.indexOf(span), nx = rows[i + (e.key === "ArrowDown" ? 1 : -1)];
        if(nx){ e.preventDefault(); nx.focus(); }
        else if(e.key === "ArrowDown"){ var a2 = n.el.querySelector(".shAddIn"); if(a2){ e.preventDefault(); a2.focus(); } }
        e.stopPropagation(); return;
      }
      e.stopPropagation();
    });
    span.addEventListener("blur", function(){
      if(window.Stick && Stick.collab) Stick.collab.setEditing(null);
      if(!before) return;
      var b = before; before = null;
      var cur = (n.items || []).filter(function(x){ return x.id === it.id; })[0];
      if(cur && !cur.t && !cur.q && !cur.n && cur.p == null && !cur.l && !cur.g){          // left empty: it was never a real item
        n.items = Stick.shopping.remove(n.items, it.id); saveNotes(); repaintShopping(n); updateMinimap(); recordChange("Edit item", b); return;
      }
      if(cur && cur.t !== startText){ saveNotes(); updateMinimap(); recordChange("Edit item", b); }
    });
  }

  function shopTick(n, id, inCart){
    var row = n.el && n.el.querySelector('.shRow[data-id="' + id + '"]'), from = row ? row.getBoundingClientRect() : null;
    shopChange(n, inCart ? "Put in the cart" : "Take out of the cart", function(items){ return Stick.shopping.setCart(items, id, inCart, Date.now()); }, {slideId: id, slideFrom: from});
  }
  function shopAdd(n, text, keepFocus){
    var t = String(text || "").replace(/\s+/g, " ").trim();
    if(!t) return false;
    if((n.items || []).length >= Stick.shopping.MAX_ITEMS){ toast("A list holds up to " + Stick.shopping.MAX_ITEMS + " items."); return false; }
    return shopChange(n, "Add item", function(items){ return Stick.shopping.add(items, t, Date.now()); }, {focusAdd: keepFocus !== false});
  }
  function shopClearBought(n){
    var k = Stick.shopping.boughtCount(n.items);
    if(!k) return;
    function go(){ shopChange(n, k > 1 ? "Clear " + k + " bought items" : "Clear bought item", function(items){ return Stick.shopping.clearBought(items); }); toast(k > 1 ? "Cleared " + k + " bought items." : "Cleared the bought item.", "Undo", function(){ undo(); }); }
    if(k === 1){ go(); return; }
    confirmDialog({title: "Clear " + k + " bought items?", body: "They’ll be removed from this list. You can undo it.", confirm: "Clear"}).then(function(ok){ if(ok) go(); });
  }

  // fill (or refill) the paper from the list's data. The element stays, so focus, selection and scroll position survive.
  function repaintShopping(n, opts){
    opts = opts || {};
    var el = n.el; if(!el || !el.querySelector(".shPaper")) return;
    var S = Stick.shopping, ro = readOnly || !!el.classList.contains("static"), openId = opts.keepOpen || opts.focusDetail || n._openItem ? n._openItem : null;
    var list = el.querySelector(".shList"), scroll = list ? list.scrollTop : 0, old = {};
    Array.prototype.forEach.call(el.querySelectorAll(".shRow"), function(r){ old[r.dataset.id] = r.getBoundingClientRect(); });
    if(opts.slideFrom && opts.slideId) old[opts.slideId] = opts.slideFrom;
    var st = {readOnly: ro, openId: openId};
    var items = n.items || [], toBuy = S.toBuyItems(items), cart = S.cartItems(items), counts = S.counts(items);
    el.setAttribute("aria-label", Stick.objects.label(n));
    el.classList.toggle("allPicked", counts.allPicked); el.classList.toggle("emptyList", !counts.all);
    var title = el.querySelector(".shTitle"); if(title && document.activeElement !== title) title.textContent = n.title || "";
    var sum = el.querySelector(".shSummary"); if(sum) sum.textContent = S.summary(items);
    list.innerHTML = "";
    var ul1 = document.createElement("ul"); ul1.className = "shItems shToBuy"; ul1.setAttribute("aria-label", "To buy");
    toBuy.forEach(function(it){ ul1.appendChild(shopRow(n, it, st)); });
    list.appendChild(ul1);
    if(!ro){
      var addRow = makeDiv("shAddRow"), plus = document.createElement("span"); plus.className = "shPlus"; plus.setAttribute("aria-hidden", "true"); plus.textContent = "+";
      var add = document.createElement("input"); add.type = "text"; add.className = "shAddIn"; add.maxLength = S.LIMITS.text; add.autocomplete = "off"; add.setAttribute("dir", "auto");
      add.placeholder = counts.all ? "Add an item" : "Add the first item"; add.setAttribute("aria-label", counts.all ? "Add an item" : "Add the first item");
      add.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
      add.addEventListener("keydown", function(e){
        if(e.isComposing) return;
        if(e.key === "Enter"){ e.preventDefault(); if(add.value.trim()){ var v = add.value; add.value = ""; shopAdd(n, v, true); } }
        else if(e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); add.value = ""; add.blur(); }
        else if(e.key === "ArrowUp"){ var rows = n.el.querySelectorAll(".shToBuy .shRow .shText"); if(rows.length){ e.preventDefault(); rows[rows.length - 1].focus(); } }
        e.stopPropagation();
      });
      add.addEventListener("blur", function(){ if(add.value.trim()){ var v = add.value; add.value = ""; shopAdd(n, v, false); } });
      addRow.appendChild(plus); addRow.appendChild(add); list.appendChild(addRow);
    }
    if(cart.length){
      var head = makeDiv("shDivider"), lab = document.createElement("span"); lab.textContent = "In the cart"; head.appendChild(lab);
      if(!ro){
        var clr = document.createElement("button"); clr.type = "button"; clr.className = "shClear"; clr.textContent = "Clear bought items";
        clr.addEventListener("click", function(e){ e.stopPropagation(); shopClearBought(n); }); head.appendChild(clr);
      }
      head.setAttribute("role", "heading"); head.setAttribute("aria-level", "3");
      list.appendChild(head);
      var ul2 = document.createElement("ul"); ul2.className = "shItems shInCart"; ul2.setAttribute("aria-label", "In the cart");
      cart.forEach(function(it){ ul2.appendChild(shopRow(n, it, st)); });
      list.appendChild(ul2);
    }
    list.scrollTop = scroll;
    var tot = el.querySelector(".shTotal"), tt = S.totals(items);
    if(tot){
      if(shopHas(n, "price") && tt.priced){ tot.hidden = false; tot.textContent = "Total " + shopMoney(n, tt.all) + (tt.cart ? " · in cart " + shopMoney(n, tt.cart) : ""); }
      else { tot.hidden = true; tot.textContent = ""; }
    }
    var stamp = el.querySelector(".shStamp"); if(stamp) stamp.hidden = !counts.allPicked;
    // a small slide for whatever just moved (not with reduced motion)
    if(!reducedMotion() && opts.slideId){
      var row = el.querySelector('.shRow[data-id="' + opts.slideId + '"]'), from = old[opts.slideId];
      if(row && from && row.animate){ var to = row.getBoundingClientRect(), dy = from.top - to.top; if(Math.abs(dy) > 1) row.animate([{transform: "translateY(" + dy + "px)", opacity: 0.6}, {transform: "none", opacity: 1}], {duration: 360, easing: "cubic-bezier(.3,.8,.3,1)"}); }
    }
    if(opts.focusAdd){ var a3 = el.querySelector(".shAddIn"); if(a3) a3.focus(); }
    if(opts.focusId){ var t3 = el.querySelector('.shRow[data-id="' + opts.focusId + '"] .shText'); if(t3){ t3.focus(); if(opts.focusEnd){ var rg = document.createRange(); rg.selectNodeContents(t3); rg.collapse(false); var sl = window.getSelection(); sl.removeAllRanges(); sl.addRange(rg); } } }
    else if(opts.focusDetail){ var d3 = el.querySelector('.shRow[data-id="' + opts.focusDetail + '"] .shEdit input'); if(d3 && !opts.keepOpen) d3.focus(); }
    var nm = el.querySelector(".shTitle"); if(nm) nm.setAttribute("data-ph", "Shopping list");
  }

  function buildShoppingEl(n, st){
    st = st || {};
    var el = makeDiv("boardObj paperObj shopObj v-" + shopVariant(n) + (st.static ? " static" : ""));
    el.style.setProperty("--pw", (n.w || Stick.shopping.WIDTH[2]) + "px"); el.style.setProperty("--rot", (n.rot || 0) + "deg");
    el.setAttribute("role", "group"); el.setAttribute("aria-label", Stick.objects.label(n)); if(!st.static) el.tabIndex = 0;
    var paper = makeDiv("shPaper"), head = makeDiv("shHead"), title = makeDiv("shTitle"), sum = makeDiv("shSummary");
    title.dir = "auto"; title.setAttribute("role", "textbox"); title.setAttribute("aria-label", "List title");
    sum.setAttribute("role", "status"); sum.setAttribute("aria-live", "polite");
    head.appendChild(title); head.appendChild(sum); paper.appendChild(head);
    var list = makeDiv("shList"); paper.appendChild(list);
    var tot = makeDiv("shTotal"); tot.hidden = true; paper.appendChild(tot);
    var stamp = makeDiv("shStamp"); stamp.textContent = "All picked ✓"; stamp.hidden = true; stamp.setAttribute("aria-hidden", "true"); paper.appendChild(stamp);
    el.appendChild(paper);
    var cart = makeDiv("shCart"); cart.innerHTML = SHOP_CART; cart.setAttribute("aria-hidden", "true"); el.appendChild(cart);
    return {el: el, title: title};
  }

  function renderShopping(n, isNew){
    var b = buildShoppingEl(n), el = b.el;
    if(isNew) el.classList.add("new");
    el.dataset.id = n.id; el.style.left = n.x + "px"; el.style.top = n.y + "px"; el.style.zIndex = n.z;
    if(selected.has(n.id)) el.classList.add("selected");
    n.el = el; n.textEl = null; n.captionEl = null;
    boardInner.appendChild(el);
    repaintShopping(n);
    if(!readOnly){
      function ctl(cls, html, title, onDown){
        var c = document.createElement("button");
        c.className = "pCtl " + cls; c.innerHTML = html; c.title = title; c.setAttribute("aria-label", title); c.type = "button";
        c.addEventListener("pointerdown", function(e){ e.stopPropagation(); if(onDown) onDown(e, c); });
        c.addEventListener("mousedown", function(e){ e.preventDefault(); });
        el.appendChild(c); return c;
      }
      var more = ctl("pMore", ICONS.more, "Options for this shopping list");
      more.addEventListener("click", function(e){ e.stopPropagation(); openObjectMenu(n, more); });
      ctl("pHandle", "", "Drag to resize", function(e){ startPaperResize(e, n); });
      var title = b.title; title.contentEditable = "true"; title.spellcheck = true; title.setAttribute("data-ph", "Shopping list");
      title.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
      var tBefore = null;
      title.addEventListener("focus", function(){ endEditing(); tBefore = captureState([n.id]); if(!selected.has(n.id)) setSelection([n.id]); });
      title.addEventListener("input", function(){ var t = title.textContent.replace(/[\r\n]+/g, " ").slice(0, Stick.shopping.LIMITS.title); if(title.textContent !== t) title.textContent = t; n.title = t.replace(/\s+/g, " ").trim(); saveNotesTyping(); });
      title.addEventListener("paste", function(e){ e.preventDefault(); var tx = (e.clipboardData && e.clipboardData.getData("text/plain")) || ""; document.execCommand("insertText", false, tx.replace(/\s+/g, " ")); });
      title.addEventListener("keydown", function(e){ if(e.key === "Enter" || e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); title.blur(); } else e.stopPropagation(); });
      title.addEventListener("blur", function(){ if(tBefore){ var bb = tBefore; tBefore = null; n.title = Stick.shopping.normalize({type: "shopping", title: n.title}, {}).title; saveNotes(); recordChange("Name list", bb); } });
      el.addEventListener("pointerdown", function(e){
        if(e.pointerType === "mouse" && e.button !== 0) return;
        if(e.target.closest && e.target.closest("button, input, a, .shText, .shTitle, .shEdit")) return;
        e.preventDefault(); endEditing(); closeCaptureMenu();
        if(searchInput.value.trim()) setTimeout(clearSearch, 0);
        if(e.ctrlKey || e.metaKey){ toggleSelected(n.id); return; }
        var group = selected.has(n.id) && selected.size > 1;
        if(!group) setSelection([n.id]);
        bringToFront(n, el);
        startDrag(e, n, group ? selectedNotes() : [n]);
      });
      el.addEventListener("keydown", function(e){
        if(e.target !== el) return;
        if(e.key === "Enter"){ e.preventDefault(); var a = el.querySelector(".shAddIn"); if(a) a.focus(); }
        else if(e.key === " "){ e.preventDefault(); setSelection([n.id]); }
        else if(e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")){ e.preventDefault(); var r = el.getBoundingClientRect(); openObjectContextMenu(n, r.left + 24, r.top + 24); }
        else if(e.key === "Delete" || e.key === "Backspace"){ e.preventDefault(); deleteNotes([n.id]); }
      });
      el.addEventListener("focus", function(){ if(!selected.has(n.id)) setSelection([n.id]); });
      if(isNew) el.addEventListener("animationend", function(){ el.classList.remove("new"); }, {once: true});
    }
    return el;
  }
  function buildStaticShopping(item){ var b = buildShoppingEl(item, {static: true}); b.el.style.position = "relative"; var tmp = {el: b.el, items: item.items, fields: item.fields, cur: item.cur, title: item.title, type: "shopping"}; repaintShopping(tmp); return b.el; }

  // ---- the ... menu: Details, currency, done, and the usual
  function shoppingMenu(n, anchor){
    var pop = openFloatingPopover(anchor, "noteMenu");
    if(!pop) return;
    var S = Stick.shopping;
    pop.appendChild(menuItem(ICONS.pencil, "Rename list", function(){ closeFloatingPopovers(); var t = n.el && n.el.querySelector(".shTitle"); if(t){ t.focus(); var rg = document.createRange(); rg.selectNodeContents(t); var sl = window.getSelection(); sl.removeAllRanges(); sl.addRange(rg); } }));
    var dh = makeDiv("menuHint"); dh.textContent = "Details"; pop.appendChild(dh);
    S.FIELDS.forEach(function(f){
      var on = shopHas(n, f);
      pop.appendChild(menuItem(on ? ICONS.tick : '<svg viewBox="0 0 24 24"></svg>', S.FIELD_LABEL[f], function(){
        closeFloatingPopovers();
        var next = (n.fields || []).filter(function(x){ return x !== f; }); if(!on) next = S.FIELDS.filter(function(x){ return next.indexOf(x) !== -1 || x === f; });
        if(on) n._openItem = null;
        shopSet(n, (on ? "Hide " : "Show ") + S.FIELD_LABEL[f].toLowerCase(), {fields: next});
      }, {cls: on ? "on" : "", title: on ? "Switch this detail off for the whole list (values are kept)" : "Let items in this list have this detail"}));
    });
    if(shopHas(n, "price")){
      var curItem = menuItem(ICONS.move, "Currency: " + n.cur, function(){
        var open = curItem.nextSibling && curItem.nextSibling.classList && curItem.nextSibling.classList.contains("shCurPick");
        if(open){ curItem.nextSibling.remove(); return; }
        var box = makeDiv("shCurPick");
        S.CURRENCIES.forEach(function(c){
          var b = document.createElement("button"); b.type = "button"; b.className = "menuItem" + (c[0] === n.cur ? " on" : ""); b.textContent = c[1] + " " + c[0] + " · " + c[2];
          b.addEventListener("click", function(){ closeFloatingPopovers(); if(c[0] !== n.cur) shopSet(n, "Change currency", {cur: c[0]}); });
          box.appendChild(b);
        });
        curItem.parentNode.insertBefore(box, curItem.nextSibling);
      }, {kbd: "›", title: "Only this list changes; nothing is converted"});
      pop.appendChild(curItem);
    }
    var bought = S.boughtCount(n.items);
    pop.appendChild(makeDiv("menuSep"));
    if(bought) pop.appendChild(menuItem(ICONS.trash, "Clear " + bought + " bought item" + (bought === 1 ? "" : "s"), function(){ closeFloatingPopovers(); shopClearBought(n); }));
    pop.appendChild(menuItem(ICONS.tick, "Mark list done", function(){ closeFloatingPopovers(); markDone(n); }, {title: "The whole shopping errand is finished. Ticks inside the list are kept."}));
    pop.appendChild(makeDiv("menuSep"));
    pinAndArrange(pop, n);
    pop.appendChild(menuItem(ICONS.copy, "Duplicate", function(){ closeFloatingPopovers(); duplicateNotes([n.id]); }, {kbd: MOD + "+D"}));
    var moveItem = menuItem(ICONS.move, "Move to board", function(){
      var open = moveItem.nextSibling && moveItem.nextSibling.classList && moveItem.nextSibling.classList.contains("boardPick");
      if(open){ moveItem.nextSibling.remove(); return; }
      moveItem.parentNode.insertBefore(boardPicker(document.createDocumentFragment(), [n.id]), moveItem.nextSibling);
    }, {kbd: "›"});
    pop.appendChild(moveItem);
    pop.appendChild(menuItem(ICONS.share, "Share list…", function(){ closeFloatingPopovers(); openShareModal([n]); }));
    pop.appendChild(menuItem(ICONS.trash, "Delete", function(){ closeFloatingPopovers(); deleteNotes([n.id]); }, {cls: "danger"}));
  }
  OBJECT_MENUS.shopping = shoppingMenu;
  if(window.Stick && Stick.dev){        // local development only
    // numbers for stress-testing big boards: Stick.dev.perf(), Stick.dev.perfRender(), Stick.dev.stress(500), Stick.dev.stressClear()
    Stick.dev.perf = function(){
      var q = function(sel){ return document.querySelectorAll(sel).length; };
      var pc = Stick.pile.counts(notes, findNote);
      return {active: pc.logical, piles: pc.piles, collapsedMembers: pc.collapsedMembers, renderedObjects: pc.rendered, donePile: donePile.length, domNodes: document.getElementsByTagName("*").length, boardDomNodes: boardInner.getElementsByTagName("*").length,
        mountedMedia: {img: q("img"), video: q("video"), audio: q("audio"), canvas: q("canvas")}, bootRenderMs: bootRenderMs,
        heapMB: (window.performance && performance.memory) ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null, level: Stick.guard ? Stick.guard.level(pc.logical) : null};
    };
    // pile and stack timings: Stick.dev.stackAll(), Stick.dev.pileAll(), Stick.dev.unpileAll() act on everything drawn (confirmation-free, dev only)
    function timedPile(label, run){ var t0 = performance.now(); run(); void boardInner.offsetHeight; return Object.assign({op: label, ms: Math.round(performance.now() - t0)}, Stick.dev.perf()); }
    Stick.dev.stackAll = function(){ return timedPile("stack", function(){ stackNotes(notes.filter(function(n){ return n.el && !isPileObj(n); }).map(function(n){ return n.id; })); }); };
    Stick.dev.pileAll = function(){ return timedPile("pile", function(){ makePile(notes.filter(function(n){ return n.el && !isPileObj(n); }).map(function(n){ return n.id; })); }); };
    Stick.dev.unpileAll = function(){ return timedPile("unpile", function(){ notes.filter(isPileObj).forEach(unpilePile); }); };
    Stick.dev.perfRender = function(){            // redraw every object once and time it
      var t0 = performance.now();
      notes.slice().forEach(function(n){ if(n.el) n.el.remove(); try{ renderNote(n, false); }catch(e){} });
      void boardInner.offsetHeight;
      return {ms: Math.round(performance.now() - t0), objects: notes.length};
    };
    Stick.dev.stress = function(count){           // guest boards only: it would otherwise sync hundreds of notes to an account
      if(CLOUD) return "Stress test is only for guest boards (it would sync hundreds of notes to an account).";
      count = Math.max(1, Math.min(2000, Number(count) || 100));
      var made = [], t0 = performance.now();
      for(var i = 0; i < count; i++){
        zCounter += 1;
        var n = {id: "st-" + newId(), x: 20 + (i % 36) * 130 + rand(-10, 10), y: 0, w: NOTE_W, html: "Stress note " + i, bg: randomColor(), font: pickFont(), rot: rand(-3, 3), z: zCounter, categoryIndex: 0, phys: makePhys()};
        n.y = clampY(30 + Math.floor(i / 36) * 70, n);
        notes.push(n); made.push(n);
      }
      made.forEach(function(n){ renderNote(n, false); });
      void boardInner.offsetHeight;
      ensureWidth(); saveNotes(); updateCount(); updateMinimap();
      return Object.assign({addedMs: Math.round(performance.now() - t0)}, Stick.dev.perf());
    };
    Stick.dev.stressClear = function(){
      var ids = notes.filter(function(n){ return /^st-/.test(n.id); }).map(function(n){ return n.id; });
      deleteNotes(ids, {silent: true}); return "Removed " + ids.length + " stress notes.";
    };
    Stick.dev.shopVariant = function(v){ try{ if(v) localStorage.setItem("stickit.dev.shopVariant", v); else localStorage.removeItem("stickit.dev.shopVariant"); }catch(e){} notes.filter(isShopping).forEach(function(n){ delete n._variant; rerenderNote(n); }); return "Shopping list look: " + (v || "a"); };
    Stick.dev.shopCycle = function(){ notes.filter(isShopping).sort(function(x, y){ return x.x - y.x; }).forEach(function(n, i){ n._variant = ["a", "b", "c"][i % 3]; rerenderNote(n); }); return "Gave the lists looks a, b, c left to right."; };
    // three sample lists side by side, one per look (not saved with their look; a reload shows the default look)
    Stick.dev.shopVariants = function(){
      var sample = {fields: ["qty", "price", "note", "tag", "link"], cur: "EUR", items: [
        {t: "Milk", q: "2", p: 340, n: "lactose-free"}, {t: "Electric toothbrush", p: 4990, g: "health", l: "https://shop.example/brush"}, {t: "Olive oil from Crete", q: "1 l", p: 1250},
        {t: "Eggs", c: 1, ct: 2}, {t: "Coffee", q: "500 g", c: 1, ct: 3, p: 890}]};
      var made = ["a", "b", "c"].map(function(v, i){
        var n = newPaper("shopping", 170 + i * 340, 220, Object.assign({title: "Athens trip"}, JSON.parse(JSON.stringify(sample)))); n._variant = v; n.x = 40 + i * 340; n.y = 60; return n;
      });
      insertNotes(made, "Add sample shopping lists");
      return "Added three sample lists: looks a, b and c.";
    };
  }

  // ---- creating one: a tiny choice of starting points (Blank first), then the list opens ready for its first item
  function createShopping(bx, by, presetKey, clientAt){
    var S = Stick.shopping;
    function make(key){
      var p = S.PRESETS[key] || S.PRESETS.blank, vc = viewCenter();
      var x = bx != null ? bx : vc.x, y = by != null ? by : Math.min(vc.y, 240);
      var n = newPaper("shopping", x, y, {fields: p.fields.slice(), title: p.title, createdFromPreset: key, cur: S.defaultCurrency(shopLocale(), shopTz()), items: []});
      insertNotes([n], "Add shopping list"); recoverVertical([n]); dismissHint();
      setTimeout(function(){ var a = n.el && n.el.querySelector(".shAddIn"); if(a) a.focus(); }, 80);
      return n;
    }
    if(presetKey){ return make(presetKey); }
    closeFloatingPopovers(); closeCaptureMenu();
    var at = clientAt || (function(){ var br = boardInner.getBoundingClientRect(), vc = viewCenter(); return {x: br.left + (bx != null ? bx : vc.x) * boardZoom, y: br.top + (by != null ? by : 160) * boardZoom}; })();
    var pop = openFloatingPopover(pointAnchor(at.x, at.y), "noteMenu"); if(!pop) return null;
    var h = makeDiv("menuHint"); h.textContent = "Start with"; pop.appendChild(h);
    ["blank", "groceries", "trip"].forEach(function(k){
      var b = menuItem(ICONS.cart, S.PRESETS[k].label, function(){ closeFloatingPopovers(); make(k); }, {title: k === "blank" ? "No extra details" : "Switches on a few details; you can change them any time"});
      pop.appendChild(b);
    });
    menuNav(pop); placeAtPointer(pop, at.x, at.y);
    var first = pop.querySelector("button"); if(first) first.focus();
    return null;
  }

  // ---- creating one
  function newPaper(kind, bx, by, extra){
    var d = Object.assign({type: kind, id: newId(), x: 0, y: 0, rot: rand(-3, 3), z: 1, createdAt: Date.now()}, extra || {});
    var base = Stick.objects.normalize(d, paperHelpers()) || {};
    var n = Object.assign({}, base, {id: d.id, x: 0, y: 0, rot: d.rot, z: 1, createdAt: d.createdAt, type: kind});
    if(kind === "receipt" && !n.title) n.title = "Receipt";
    if(kind === "receipt" && !n.date) n.date = todayShort();
    if(kind === "ticket" && !n.title) n.title = "Ticket";
    n.phys = {};
    var sz = Stick.objects.sizeEstimate(n);
    n.x = Math.max(0, bx - sz.w / 2); n.y = Math.max(0, Math.min(boardHeight() - sz.h - 8, by - sz.h / 2));
    return n;
  }
  function createPaper(kind, bx, by, extra){
    var n = newPaper(kind, bx, by, extra);
    insertNotes([n], "Add " + Stick.objects.LABELS[kind]);
    recoverVertical([n]); dismissHint();
    if(kind === "receipt" || kind === "ticket"){ setTimeout(function(){ var t = n.el && n.el.querySelector(".poF"); if(t) editPaperField(n, t); }, 60); }
    return n;
  }
  // Photo -> postcard: a new postcard beside the photo (the photo stays). Note -> postcard: only when the words map safely
  // (plain text, short, no formatting that would be lost); otherwise the menu item is not offered.
  function makePostcardFromPhoto(p){
    if(!p.image && !p.assetId){ toast("This photo is still loading. Try again in a moment."); return; }
    var n = createPaper("postcard", p.x + 60, p.y + 80, {image: p.image, assetId: p.assetId, imgRatio: clampNum(p.imgRatio, 0.4, 2.5, 0.667), location: p.caption || "", font: p.font});
    toast("Made a postcard from this photo.");
    return n;
  }
  function noteIsPlainShort(n){
    var html = n.textEl ? n.textEl.innerHTML : (n.html || "");
    if(!html || /<(ul|ol|li|h[1-6]|mark|b|strong|i|em|a|img|font|span)[\s>]/i.test(html)) return false;
    if(n.image || n.isTask) return false;
    var t = htmlToText(html).trim();
    return t.length > 0 && t.length <= 300;
  }
  function makePostcardFromNote(n){
    var t = n.textEl ? getPlainText(n.textEl) : htmlToText(n.html || "");
    createPaper("postcard", n.x + 80, n.y + 80, {message: String(t || "").trim(), font: n.font});
    toast("Made a postcard from this note.");
  }
  function createPostcardFromFile(bx, by){
    var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
    inp.onchange = function(){
      var f = inp.files && inp.files[0];
      if(!f){ return; }
      if(f.type.indexOf("image/") !== 0){ toast("That doesn't look like a photo."); return; }
      loadPhotoFile(f).then(function(l){ var n = createPaper("postcard", bx, by, {image: l.src, imgRatio: clampNum(l.ratio, 0.4, 2.5, 0.667)}); setTimeout(function(){ var m = n.el && n.el.querySelector('.poF[data-f="location"]'); if(m) editPaperField(n, m); }, 80); },
        function(){ toast("That image couldn't be read."); });
    };
    inp.click();
  }

  // ---- photo strips: from photos already on the board, or from files
  function stripFramesFromPhotos(list){
    return list.map(function(p){ var f = {ratio: clampNum(p.imgRatio, 0.3, 3, 0.75)}; if(p.image) f.image = p.image; if(p.assetId) f.assetId = p.assetId; return f; });
  }
  function makeStripFromPhotos(ids){
    var photos = ids.map(findNote).filter(function(n){ return isPhoto(n); });
    if(photos.length < Stick.objects.STRIP_MIN){ stripNeedsMore(photos.length, function(){ openStripPicker(photos.map(function(p){ return p.id; })); }); return; }
    if(photos.length > Stick.objects.STRIP_MAX){ stripNeedsMore(photos.length, function(){ openStripPicker(photos.slice(0, Stick.objects.STRIP_MAX).map(function(p){ return p.id; })); }); return; }
    photos.sort(function(a, b){ return (a.x - b.x) || (a.y - b.y); });          // left to right, then top to bottom
    var cx = photos.reduce(function(s, p){ return s + p.x; }, 0) / photos.length, cy = photos.reduce(function(s, p){ return s + p.y; }, 0) / photos.length;
    var strip = newPaper("photo_strip", cx + 90, cy + 140, {variant: "vertical", frames: stripFramesFromPhotos(photos), font: pickFont()});
    var snapshots = photos.map(snapNote), strip0 = strip;
    var removed = photos.map(function(p){ return p.id; });
    removed.forEach(function(id){ var n = findNote(id); if(n){ removeNoteEl(n, false); notes.splice(notes.indexOf(n), 1); selected.delete(id); clearDecorations(id); } });
    zCounter += 1; strip.z = zCounter; notes.push(strip); renderNote(strip, true, {focus:false});
    ensureWidth(); saveNotes(); updateCount(); updateMinimap(); setSelection([strip.id]);
    if(cloudSync) setTimeout(function(){ cloudSync.hydrateAll(); watchPhotoLoading(); }, 0);
    var action = pushHistory({label:"Make photo strip", custom:true, t:Date.now(),
      undo:function(){
        var cur = findNote(strip.id); if(cur){ removeNoteEl(cur, false); notes.splice(notes.indexOf(cur), 1); selected.delete(cur.id); clearDecorations(cur.id); }
        snapshots.forEach(function(s){ var c = Object.assign({}, s); if(c.phys) c.phys = Object.assign({}, c.phys); notes.push(c); renderNote(c, false, {focus:false}); });
        return true;
      },
      redo:function(){
        snapshots.forEach(function(s){ var n = findNote(s.id); if(n){ removeNoteEl(n, false); notes.splice(notes.indexOf(n), 1); selected.delete(n.id); clearDecorations(n.id); } });
        notes.push(strip); renderNote(strip, false, {focus:false});
        return true;
      }});
    toast("Made a photo strip.", "Undo", function(){ undoIfTop(action); });
    return strip;
  }
  // One branded modal for "this isn't enough photos" (the same dialog system as every other question in the app).
  function stripNeedsMore(have, retry){
    var tooMany = have > Stick.objects.STRIP_MAX;
    openModal({
      title: tooMany ? "Photo strips hold up to " + Stick.objects.STRIP_MAX + " photos" : "Photo strips need at least two photos",
      sub: tooMany ? "Pick the ones you want on the strip." : (have ? "Pick one more photo to make a strip." : "Pick two or more photos to make a strip."),
      width: 380,
      actions: [{label: "Exit", value: false}, {label: tooMany ? "Choose photos" : "Pick another", kind: "primary", value: true}],
      onClose: function(v){ if(v && retry) setTimeout(retry, 0); }
    });
  }
  // Choose photos already on the board (a small tray of thumbnails). Whatever was selected before stays selected.
  function openStripPicker(preIds){
    var photos = notes.filter(isPhoto), chosen = new Set(preIds || []), content = makeDiv("stripPick"), grid = makeDiv("stripPickGrid"), msg = makeDiv("stripPickMsg");
    msg.setAttribute("role", "status");
    if(photos.length < Stick.objects.STRIP_MIN){
      var none = document.createElement("p"); none.className = "acctSub"; none.textContent = "This board has only " + photos.length + " photo" + (photos.length === 1 ? "" : "s") + ". Add another photo first, or start a strip from your device with the right-click menu.";
      content.appendChild(none);
    }
    var make = null;
    function sync(){
      var k = chosen.size; msg.textContent = k + " chosen (" + Stick.objects.STRIP_MIN + " to " + Stick.objects.STRIP_MAX + ")";
      if(make) make.disabled = k < Stick.objects.STRIP_MIN || k > Stick.objects.STRIP_MAX;
    }
    photos.forEach(function(p, i){
      var b = document.createElement("button"); b.type = "button"; b.className = "stripPickItem"; b.setAttribute("aria-pressed", chosen.has(p.id) ? "true" : "false");
      b.setAttribute("aria-label", "Photo " + (i + 1) + (p.caption ? ": " + p.caption : ""));
      if(p.image){ var im = new Image(); im.alt = ""; im.src = p.image; b.appendChild(im); } else { var ph = makeDiv("stripPickBlank"); ph.innerHTML = ICONS.strip; b.appendChild(ph); }
      var tick = makeDiv("stripPickTick"); tick.innerHTML = ICONS.tick; b.appendChild(tick);
      b.addEventListener("click", function(){
        if(chosen.has(p.id)) chosen.delete(p.id); else if(chosen.size < Stick.objects.STRIP_MAX) chosen.add(p.id);
        b.setAttribute("aria-pressed", chosen.has(p.id) ? "true" : "false"); sync();
      });
      grid.appendChild(b);
    });
    content.appendChild(grid); content.appendChild(msg);
    var m = openModal({title: "Choose photos for the strip", sub: "They go onto the strip left to right, top to bottom.", content: content, width: 420,
      actions: [{label: "Cancel", value: false}, {label: "Make photo strip", kind: "primary", value: true, id: "stripPickMake"}],
      onClose: function(v){ if(v && chosen.size >= Stick.objects.STRIP_MIN) setTimeout(function(){ makeStripFromPhotos(Array.from(chosen)); }, 0); }});
    make = m.card.querySelector("#stripPickMake"); sync();
  }
  function createStripFromFiles(bx, by, prior){
    var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.multiple = true;
    prior = prior || [];
    inp.onchange = function(){
      var files = prior.concat(Array.prototype.filter.call(inp.files || [], function(f){ return f.type.indexOf("image/") === 0; })).slice(0, Stick.objects.STRIP_MAX);
      if(files.length < Stick.objects.STRIP_MIN){ stripNeedsMore(files.length, function(){ createStripFromFiles(bx, by, files); }); return; }
      Promise.all(files.map(loadPhotoFile)).then(function(loaded){
        createPaper("photo_strip", bx, by, {variant: "vertical", font: pickFont(), frames: loaded.map(function(l){ return {image: l.src, ratio: clampNum(l.ratio, 0.3, 3, 0.75)}; })});
      }, function(){ toast("One of those images couldn't be read."); });
    };
    inp.click();
  }
  // the small strip editor: reorder, caption, remove, add
  function openStripEditor(n){
    if(readOnly) return;
    var work = (n.frames || []).map(function(f){ return Object.assign({}, f); }), content = document.createElement("div"), list = makeDiv("stripEd");
    var capIn = document.createElement("input"); capIn.type = "text"; capIn.maxLength = 80; capIn.value = n.caption || ""; capIn.setAttribute("aria-label", "Strip caption"); capIn.placeholder = "Caption (optional)"; capIn.className = "stripCap";
    function paint(){
      list.innerHTML = "";
      work.forEach(function(f, i){
        var row = makeDiv("stripRow"), th = document.createElement("img"); th.alt = "Picture " + (i + 1); th.src = stripFrameSrc(f) || ""; th.draggable = false;
        var up = document.createElement("button"); up.type = "button"; up.textContent = "←"; up.setAttribute("aria-label", "Move picture " + (i + 1) + " earlier"); up.disabled = i === 0;
        var dn = document.createElement("button"); dn.type = "button"; dn.textContent = "→"; dn.setAttribute("aria-label", "Move picture " + (i + 1) + " later"); dn.disabled = i === work.length - 1;
        var rm = document.createElement("button"); rm.type = "button"; rm.textContent = "✕"; rm.setAttribute("aria-label", "Remove picture " + (i + 1)); rm.disabled = work.length <= Stick.objects.STRIP_MIN;
        up.addEventListener("click", function(){ var t = work[i - 1]; work[i - 1] = work[i]; work[i] = t; paint(); });
        dn.addEventListener("click", function(){ var t = work[i + 1]; work[i + 1] = work[i]; work[i] = t; paint(); });
        rm.addEventListener("click", function(){ work.splice(i, 1); paint(); });
        row.appendChild(th); row.appendChild(up); row.appendChild(dn); row.appendChild(rm); list.appendChild(row);
      });
      add.disabled = work.length >= Stick.objects.STRIP_MAX;
    }
    var add = document.createElement("button"); add.type = "button"; add.className = "pillBtn"; add.textContent = "Add photos";
    add.addEventListener("click", function(){
      var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.multiple = true;
      inp.onchange = function(){
        var files = Array.prototype.filter.call(inp.files || [], function(f){ return f.type.indexOf("image/") === 0; }).slice(0, Stick.objects.STRIP_MAX - work.length);
        Promise.all(files.map(loadPhotoFile)).then(function(loaded){ loaded.forEach(function(l){ work.push({image: l.src, ratio: clampNum(l.ratio, 0.3, 3, 0.75)}); }); paint(); }, function(){ toast("An image couldn't be read."); });
      };
      inp.click();
    });
    content.appendChild(list); content.appendChild(add); content.appendChild(capIn); paint();
    openModal({title: "Photo strip", content: content, width: 380, actions: [{label: "Cancel", value: false}, {label: "Done", kind: "primary", value: true}],
      onClose: function(ok){
        if(!ok) return;
        var cur = findNote(n.id); if(!cur) return;
        var before = captureState([n.id]);
        cur.frames = work; cur.caption = Stick.objects.clean.one(capIn.value, 80);
        saveNotes(); rerenderNote(cur); recordChange("Edit photo strip", before);
        if(cloudSync){ cloudSync.notesChanged(); cloudSync.hydrateAll(); watchPhotoLoading(); }
      }});
  }

  // ---- thumbnail card for the board list
  function drawThumbPaper(g, n, it, sc, ox, oy, dark){
    var w = it.w * sc, h = it.h * sc;
    g.save();
    g.translate(ox + (n.x + it.w/2) * sc, oy + (n.y + it.h/2) * sc);
    g.rotate((n.rot || 0) * Math.PI / 180);
    g.shadowColor = dark ? "rgba(0,0,0,0.6)" : "rgba(60,45,10,0.28)"; g.shadowBlur = 3; g.shadowOffsetY = 1.2;
    g.fillStyle = n.type === "photo_strip" ? (n.variant === "film" ? "#1d1b1a" : "#fbfaf4") : n.type === "ticket" ? "#f2e6c9" : n.type === "postcard" ? "#f7f2e4" : "#faf8f0";
    g.fillRect(-w/2, -h/2, w, h);
    g.shadowColor = "transparent";
    g.fillStyle = "rgba(58,53,40,0.42)";
    var rows = Math.max(2, Math.min(6, Math.floor(h / (7 * Math.max(sc, 0.3)))));
    for(var i = 0; i < rows; i++) g.fillRect(-w/2 + w * 0.12, -h/2 + h * (0.14 + i * 0.8 / rows), w * (i % 2 ? 0.5 : 0.7), Math.max(0.6, 2.2 * sc));
    g.restore();
  }

  // ---------- Alphabet Soup (Premium cosmetic) ----------
  // A cosmetic on an ordinary note (note.cosmetic = "soup"): when nobody is typing, the words are shown as pasta letters
  // floating in a bowl. The words themselves never change: the real text stays in the note (read once by a screen reader),
  // the letter pieces are decorative (aria-hidden), at most SOUP_MAX of them exist, and only a few notes ever animate.
  // Seeing a soup note never needs Premium; making one does (the server checks that too).
  var SOUP_MAX = 100, SOUP_LIVE_MAX = 2, SOUP_BOB_MAX = 8;
  function isPremium(){
    if(window.Stick && Stick.dev){ try{ var o = localStorage.getItem("stickit.dev.premium"); if(o === "1") return true; if(o === "0") return false; }catch(e){} }
    return !!(settings.account && settings.account.plan === "premium");
  }
  function openPremiumInfo(what){
    var c = document.createElement("div"); c.className = "acctSub"; c.style.textAlign = "left";
    c.innerHTML = '<p style="margin:0 0 8px;"></p><p style="margin:0;">Premium isn’t available yet, so there is nothing to buy today. Everyone can still see Alphabet Soup notes that someone else made.</p>';
    c.firstChild.textContent = what + " is a Premium extra.";
    openModal({title: what, content: c, width: 380, actions: [{label: "OK", kind: "primary", value: true}]});
  }
  function graphemes(text){
    try{ if(window.Intl && Intl.Segmenter) return Array.from(new Intl.Segmenter(undefined, {granularity: "grapheme"}).segment(text), function(x){ return x.segment; }); }catch(e){}
    return Array.from(text);
  }
  function soupSourceText(n, textEl){
    var t = textEl ? getPlainText(textEl) : htmlToText(n.html || "");
    return String(t || "").replace(/\s+/g, " ").trim();
  }
  // A real bowl: ceramic rim and wall, a broth surface, pasta letters floating in it, a soft shadow underneath. The bowl and letters
  // are decorative (aria-hidden); the note's own text stays in .text (hidden while resting, shown as a readable card while editing).
  var SOUP_RATIO = 230 / 300;                                            // bowl height / width
  var SOUP_BOWL_SVG = '<svg class="soupBowl" viewBox="0 0 300 230" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
    '<defs>' +
    '<radialGradient id="sbShadow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000" stop-opacity=".34"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="sbWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf5e6"/><stop offset=".6" stop-color="#eadfc6"/><stop offset="1" stop-color="#d5c7a6"/></linearGradient>' +
    '<radialGradient id="sbBroth" cx="42%" cy="38%" r="75%"><stop offset="0" stop-color="#f6b45a"/><stop offset=".6" stop-color="#e58a33"/><stop offset="1" stop-color="#c8641f"/></radialGradient>' +
    '<linearGradient id="sbIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8bb9a"/><stop offset="1" stop-color="#eee4cc"/></linearGradient>' +
    '</defs>' +
    '<ellipse cx="150" cy="213" rx="122" ry="13" fill="url(#sbShadow)"/>' +
    '<path d="M16 92 C 18 168 70 212 150 212 C 230 212 282 168 284 92 Z" fill="url(#sbWall)" stroke="#a89a78" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M24 128 C 52 168 100 182 150 182 C 200 182 248 168 276 128" fill="none" stroke="#cf5a3e" stroke-width="5" stroke-linecap="round" opacity=".85"/>' +
    '<path d="M31 142 C 58 178 104 192 150 192 C 196 192 242 178 269 142" fill="none" stroke="#cf5a3e" stroke-width="2" stroke-linecap="round" opacity=".7"/>' +
    '<ellipse cx="150" cy="92" rx="134" ry="62" fill="#fbf6e8" stroke="#a89a78" stroke-width="2"/>' +
    '<ellipse cx="150" cy="95" rx="122" ry="53" fill="url(#sbIn)"/>' +
    '<ellipse cx="150" cy="99" rx="114" ry="47" fill="url(#sbBroth)"/>' +
    '<path d="M60 84 C 90 62 150 56 200 62" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".22"/>' +
    '<circle cx="86" cy="118" r="3" fill="#ffe0a0" opacity=".5"/><circle cx="224" cy="86" r="2.4" fill="#ffe0a0" opacity=".45"/><circle cx="196" cy="128" r="2" fill="#ffe0a0" opacity=".4"/>' +
    '</svg>';
  function soupGeometry(W){ var H = W * SOUP_RATIO; return {W: W, H: H, cx: W * 0.5, cy: H * 0.43, rx: W * 0.36, ry: H * 0.185}; }
  // Place the words as pasta letters inside the broth ellipse: rows follow the ellipse (shorter near the edge), the tile size shrinks
  // until everything fits, and anything beyond SOUP_MAX or the smallest readable size is replaced by an ellipsis.
  function soupLayout(text, W){
    var G = soupGeometry(W), words = text.split(" ").filter(Boolean).map(function(w){ return graphemes(w); }), total = 0, lastTry = null;
    for(var s = Math.max(17, Math.min(30, Math.round(W * 0.105))); s >= 17; s--){
      lastTry = tryLayout(words, s, G);
      if(lastTry.complete) break;
    }
    return {G: G, s: lastTry.s, tiles: lastTry.tiles, more: !lastTry.complete};
  }
  function tryLayout(words, s, G){
    var rows = Math.max(1, Math.floor((2 * G.ry * 0.96) / (s * 1.16))), rowH = (2 * G.ry * 0.96) / rows, gap = s * 0.7, adv = s * 0.95;
    var rowsOut = [], r = 0, cur = [], used = 0, budget = SOUP_MAX, complete = true;
    function avail(i){ var y = G.cy - G.ry * 0.96 + (i + 0.5) * rowH, k = Math.sqrt(Math.max(0, 1 - Math.pow((y - G.cy) / G.ry, 2))); return Math.max(s * 1.4, 2 * G.rx * k - s * 0.9); }
    function flush(){ rowsOut.push({items: cur, used: used}); cur = []; used = 0; r++; }
    outer:
    for(var wi = 0; wi < words.length; wi++){
      var ch = words[wi], pos = 0;
      while(pos < ch.length){
        if(r >= rows){ complete = false; break outer; }
        var room = avail(r) - used - (cur.length ? gap : 0), fitN = Math.floor(room / adv), left = ch.length - pos;
        if(left <= fitN){ cur.push(ch.slice(pos)); used += (cur.length > 1 ? gap : 0) + left * adv; pos = ch.length; }
        else if(cur.length){ flush(); }                                     // does not fit after the previous word: next row
        else if(fitN >= 1){ cur.push(ch.slice(pos, pos + fitN)); used += fitN * adv; pos += fitN; flush(); }
        else flush();
      }
    }
    if(cur.length && r < rows) flush(); else if(cur.length) complete = false;
    var tiles = [], rng = seededRng(hashStr(words.join("|") + s));
    rowsOut.forEach(function(row, i){
      var y = G.cy - G.ry * 0.96 + (i + 0.5) * rowH + (rowsOut.length === 1 ? 0 : 0), x = G.cx - row.used / 2 + adv / 2;
      row.items.forEach(function(piece, pi){
        if(pi) x += gap;
        piece.forEach(function(c, ci){
          if(budget <= 0){ complete = false; return; }
          budget--;
          var wave = Math.sin((ci + pi) * 1.1 + i) * s * 0.11;
          tiles.push({c: c, x: x, y: y + wave + (rng() - 0.5) * s * 0.22, r: Math.round((rng() - 0.5) * 52), d: (-rng() * 6).toFixed(2), sx: Math.round((rng() - 0.5) * 70), sy: Math.round((rng() - 0.5) * 40)});
          x += adv;
        });
      });
    });
    return {s: s, tiles: tiles, complete: complete};
  }
  function buildSoupLayer(n, text, W){
    var lay = soupLayout(text, W), layer = makeDiv("soupLayer"); layer.setAttribute("aria-hidden", "true"); layer.dir = "auto";
    layer.style.fontSize = (lay.s / 1.3).toFixed(1) + "px";
    lay.tiles.forEach(function(t, i){
      var e = document.createElement("span"); e.className = "soupTile" + (i < SOUP_BOB_MAX ? " bob" : ""); e.textContent = t.c;
      e.style.left = t.x.toFixed(1) + "px"; e.style.top = t.y.toFixed(1) + "px";
      e.style.setProperty("--r", t.r + "deg"); e.style.setProperty("--d", t.d + "s"); e.style.setProperty("--sx", t.sx + "px"); e.style.setProperty("--sy", t.sy + "px"); e.style.setProperty("--i", String(i));
      layer.appendChild(e);
    });
    if(lay.more){ var m = document.createElement("span"); m.className = "soupTile soupMore"; m.textContent = "…"; m.style.left = (lay.G.cx + lay.G.rx * 0.78).toFixed(1) + "px"; m.style.top = (lay.G.cy + lay.G.ry * 0.7).toFixed(1) + "px"; m.style.setProperty("--r", "0deg"); layer.appendChild(m); }
    return layer;
  }
  var soupSettleNext = {};                                             // note ids whose letters should drift back into place after editing
  function soupDecorate(el, n, textEl){
    ["soupLayer", "soupBowl"].forEach(function(c){ var old = el.querySelector(":scope > ." + c); if(old) old.remove(); });
    el.classList.remove("soup"); el.style.height = "";
    if(n.cosmetic !== "soup") return;
    el.classList.add("soup");
    var W = n.w || NOTE_W;
    el.style.height = Math.round(W * SOUP_RATIO) + "px";
    var holder = document.createElement("div"); holder.innerHTML = SOUP_BOWL_SVG;
    var bowl = holder.firstChild; el.insertBefore(bowl, el.firstChild);
    var layer = buildSoupLayer(n, soupSourceText(n, textEl), W);
    if(soupSettleNext[n.id]){ delete soupSettleNext[n.id]; layer.classList.add("settle"); setTimeout(function(){ layer.classList.remove("settle"); }, 1400); }
    el.appendChild(layer);
    // the bowl is the handle: dragging it moves the note, a double click starts typing (the paper tab does the same job on a plain note)
    if(!readOnly && !el._soupWired){
      el._soupWired = true;
      el.addEventListener("pointerdown", function(e){
        if(!el.classList.contains("soup") || el.classList.contains("editing") || (e.target.closest && e.target.closest(".del, .moreBtn, .fontCycle, .tab, .text, .taskDock, .listHint, .checkToggle"))) return;
        var tab = el.querySelector(":scope > .tab");
        if(tab) tab.dispatchEvent(new PointerEvent("pointerdown", {clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId, pointerType: e.pointerType, button: 0, ctrlKey: e.ctrlKey, metaKey: e.metaKey, bubbles: false, cancelable: true}));
      });
      el.addEventListener("dblclick", function(e){ if(el.classList.contains("soup") && !el.classList.contains("editing") && n.textEl && !(e.target.closest && e.target.closest(".del, .moreBtn"))){ e.preventDefault(); focusNoScroll(n.textEl); } });
    }
    soupBalance();
  }
  function applySoup(n){ if(n.el) soupDecorate(n.el, n, n.textEl); }
  // only a few soup notes move at once, and only the ones on screen (offscreen / hidden pasta is still pasta)
  var soupObserver = null, soupVisible = new Set();
  function soupBalance(){
    var layers = Array.prototype.slice.call(document.querySelectorAll(".note.soup:not(.editing) .soupLayer"));
    if(window.IntersectionObserver && !soupObserver){
      soupObserver = new IntersectionObserver(function(entries){
        entries.forEach(function(en){ if(en.isIntersecting) soupVisible.add(en.target); else soupVisible.delete(en.target); });
        soupBalance();
      }, {rootMargin: "80px"});
    }
    var live = 0;
    layers.forEach(function(l){
      if(soupObserver && !l._obs){ l._obs = true; soupObserver.observe(l); }
      var on = (!soupObserver || soupVisible.has(l)) && live < SOUP_LIVE_MAX && !document.hidden;
      if(on) live++;
      l.classList.toggle("live", on);
    });
  }
  document.addEventListener("visibilitychange", function(){ soupBalance(); });
  function setNoteCosmetic(n, value){
    if(value === "soup" && !isPremium()){ openPremiumInfo("Alphabet Soup"); return; }
    if((n.cosmetic || "") === (value || "")) return;
    var before = captureState([n.id]);
    if(value) n.cosmetic = value; else delete n.cosmetic;
    saveNotes(); applySoup(n); if(n.el) n.el.classList.toggle("soup", !!value);
    recordChange(value ? "Alphabet Soup" : "Remove Alphabet Soup", before);
  }
  function createSoup(bx, by){
    if(!isPremium()){ openPremiumInfo("Alphabet Soup"); return; }
    addNoteAt(bx, by, {html: "Hello soup", focus: false, cosmetic: "soup", label: "Add Alphabet Soup"});
  }

  // ---------- mobile quick capture: tap the desk, choose what to put down ----------
  var captureMenuEl = null, captureDotEl = null, captureClosedAt = 0;
  function closeCaptureMenu(){
    if(captureMenuEl){ captureMenuEl.remove(); captureMenuEl = null; }
    if(captureDotEl){ captureDotEl.remove(); captureDotEl = null; }
  }
  document.addEventListener("pointerdown", function(e){
    if(captureMenuEl && !captureMenuEl.contains(e.target)){ closeCaptureMenu(); captureClosedAt = Date.now(); }
  }, true);
  window.addEventListener("resize", closeCaptureMenu);
  document.addEventListener("contextmenu", function(e){ if(openPopover && !openPopover.contains(e.target)) closeFloatingPopovers(); }, true);
  var captureInputs = {};
  function captureInput(kind){
    if(captureInputs[kind]) return captureInputs[kind];
    var inp = document.createElement("input");
    inp.type = "file"; inp.hidden = true;
    inp.accept = kind === "photo" ? "image/*" : "video/*"; // no `capture`: the phone offers camera *and* library
    document.body.appendChild(inp);
    captureInputs[kind] = inp;
    return inp;
  }
  function openCaptureMenu(clientX, clientY, bx, by){
    closeCaptureMenu();
    closeFloatingPopovers();
    var m = makeDiv("captureMenu");
    m.setAttribute("role", "menu");
    function fill(list, withBack){
      m.innerHTML = "";
      list.forEach(function(o){
        var b = document.createElement("button");
        b.setAttribute("role", "menuitem");
        b.innerHTML = o[2] + "<span></span>";
        b.querySelector("span").textContent = o[1];
        b.addEventListener("click", function(e){ e.stopPropagation(); if(o[0] === "__more"){ fill(moreList(), true); return; } if(o[0] === "__back"){ fill(mainList(), false); return; } closeCaptureMenu(); insertAction(o[0], bx, by); });
        m.appendChild(b);
      });
    }
    function mainList(){
      var l = [["sticky", "Sticky", ICONS.sticky], ["photo", "Photo", ICONS.camera], ["record", "Record", ICONS.mic], ["video", "Video", ICONS.film]];
      if(insertItems().some(function(it){ return it.touch === "more"; })) l.push(["__more", "More\u2026", ICONS.more]);
      return l;
    }
    function moreList(){
      var l = insertItems().filter(function(it){ return it.touch === "more"; }).map(function(it){ return [it.id, it.label, it.icon]; });
      l.push(["__back", "Back", ICONS.close]);
      return l;
    }
    fill(mainList(), false);
    document.body.appendChild(m);
    // keep it on screen and above the phone's bottom bars
    var vv = window.visualViewport, vw = vv ? vv.width : window.innerWidth, vh = vv ? vv.height : window.innerHeight;
    var offX = vv ? vv.offsetLeft : 0, offY = vv ? vv.offsetTop : 0;
    var headerBottom = document.querySelector(".topbar").getBoundingClientRect().bottom;
    var w = m.offsetWidth, h = m.offsetHeight, top = clientY - h - 18;
    if(top < Math.max(offY, headerBottom) + 8) top = clientY + 18; // not over the header: open below the finger
    top = Math.min(Math.max(Math.max(offY, headerBottom) + 8, top), offY + vh - h - 12);
    var left = Math.min(Math.max(offX + 8, clientX - w / 2), offX + vw - w - 8);
    m.style.left = left + "px"; m.style.top = top + "px";
    var dot = makeDiv("captureDot");
    dot.style.left = clientX + "px"; dot.style.top = clientY + "px";
    document.body.appendChild(dot);
    captureMenuEl = m; captureDotEl = dot; captureLayer.open();
  }
  // Everything that can be put on the board from an empty spot. `touch: "main"` items are in the first touch menu; the rest sit under More.
  // New physical objects register themselves here (see the object packs) so the two menus never drift apart.
  var INSERT_ITEMS = [
    {id: "sticky", group: "Add", label: "Note", icon: ICONS.sticky, touch: "main"},
    {id: "photo", group: "Add", label: "Photo", icon: ICONS.camera, touch: "main"},
    {id: "cutout", group: "Add", label: "Cutout Photo", icon: ICONS.scissors, touch: "more", ready: function(){ return !!(window.Stick && Stick.cutout && Stick.cutout.available()); }},
    {id: "shopping", group: "Add", label: "Shopping List", icon: ICONS.cart, touch: "more", run: function(bx, by){ createShopping(bx, by); }},
    {id: "receipt", group: "Add", label: "Receipt", icon: ICONS.receipt, touch: "more", run: function(bx, by){ createPaper("receipt", bx, by); }},
    {id: "ticket", group: "Add", label: "Ticket", icon: ICONS.ticket, touch: "more", run: function(bx, by){ createPaper("ticket", bx, by); }},
    {id: "postcard", group: "Add", label: "Postcard", icon: ICONS.postcard, touch: "more", run: function(bx, by){ createPostcardFromFile(bx, by); }},
    {id: "strip", group: "Add", label: "Photo Strip", icon: ICONS.strip, touch: "more", run: function(bx, by){ createStripFromFiles(bx, by); }},
    {id: "record", group: "Media", label: "Record", icon: ICONS.mic, touch: "main"},
    {id: "video", group: "Media", label: "Video", icon: ICONS.film, touch: "main"},
    {id: "zone", group: "Add", label: "Zone", icon: ICONS.zone, touch: "more", run: function(bx, by){ createZone(bx, by); }},
    {id: "soup", group: "Premium", label: "Alphabet Soup", icon: ICONS.soup, touch: "more", run: function(bx, by){ createSoup(bx, by); }}
  ];
  function insertItems(){ return INSERT_ITEMS.filter(function(it){ return !it.ready || it.ready(); }); }
  // a one-pixel anchor the existing popovers can hang from when a menu opens at the pointer instead of at a button
  var ctxAnchor = null;
  function pointAnchor(x, y){
    if(!ctxAnchor){ ctxAnchor = document.createElement("div"); ctxAnchor.setAttribute("aria-hidden", "true"); ctxAnchor.style.cssText = "position:fixed;width:1px;height:1px;pointer-events:none;opacity:0;"; document.body.appendChild(ctxAnchor); }
    ctxAnchor.style.left = x + "px"; ctxAnchor.style.top = y + "px";
    return ctxAnchor;
  }
  // put a popover's corner at the pointer, keep it fully on screen and clear of the header
  function placeAtPointer(pop, x, y){
    if(!pop) return;
    var vv = window.visualViewport, vw = vv ? vv.width : window.innerWidth, vh = vv ? vv.height : window.innerHeight;
    var headerBottom = document.querySelector(".topbar").getBoundingClientRect().bottom;
    pop.style.bottom = "auto"; pop.style.maxHeight = Math.max(160, vh - headerBottom - 16) + "px"; pop.style.overflowY = "auto";
    var w = pop.offsetWidth, h = pop.offsetHeight;
    var left = Math.max(8, Math.min(x, vw - w - 8)), top = y;
    if(top + h > vh - 8) top = y - h;                          // no room below: open upwards
    top = Math.max(headerBottom + 8, Math.min(top, vh - h - 8));
    pop.style.left = left + "px"; pop.style.top = top + "px";
  }
  function menuNav(pop){                                        // keyboard: arrows move, Home/End jump, Esc closes (the global handler)
    pop.setAttribute("role", "menu");
    Array.prototype.forEach.call(pop.querySelectorAll("button.menuItem"), function(b){ b.setAttribute("role", "menuitem"); });
    pop.addEventListener("keydown", function(e){
      var items = Array.prototype.slice.call(pop.querySelectorAll("button.menuItem")).filter(function(b){ return !b.closest("[hidden]") && !b.disabled; }), i = items.indexOf(document.activeElement);
      if(!items.length) return;
      if(e.key === "ArrowDown"){ e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if(e.key === "ArrowUp"){ e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if(e.key === "Home"){ e.preventDefault(); items[0].focus(); }
      else if(e.key === "End"){ e.preventDefault(); items[items.length - 1].focus(); }
    });
  }
  function openInsertMenu(x, y, bx, by){
    closeFloatingPopovers(); closeCaptureMenu();
    var pop = openFloatingPopoverAt({left: x, right: x, top: y, bottom: y, width: 0, height: 0}, "noteMenu", null);
    pop.classList.add("insMenu"); pop.setAttribute("aria-label", "Add to the board");
    var group = "";
    insertItems().forEach(function(it){
      if(it.group !== group){ group = it.group; var h = makeDiv("menuHint"); h.textContent = group.toUpperCase(); pop.appendChild(h); }
      pop.appendChild(menuItem(it.icon, it.label, function(){ closeFloatingPopovers(); safeSet("stickit.rcUsed", true); insertAction(it.id, bx, by); }));
    });
    menuNav(pop);
    placeAtPointer(pop, x, y);
    var first = pop.querySelector("button.menuItem"); if(first) try{ first.focus({preventScroll: true}); }catch(e){}
  }
  function insertAction(id, bx, by){
    var it = INSERT_ITEMS.filter(function(x){ return x.id === id; })[0];
    if(it && it.run){ it.run(bx, by); return; }
    captureAction(id, bx, by);
  }
  function openObjectContextMenu(n, x, y){
    if(!selected.has(n.id) || selected.size < 2) setSelection([n.id]);
    closeFloatingPopovers(); closeCaptureMenu();
    var a = pointAnchor(x, y);
    if(selected.size > 1){ openGroupMenu(a, x, y); return; }
    if(isPhoto(n)) openPhotoMenu(n, a);
    else if(isAV(n)) openAVMenu(n, a);
    else if(n.type && OBJECT_MENUS[n.type]) OBJECT_MENUS[n.type](n, a);
    else openNoteMenu(n, a);
    if(openPopover && window.Stick && Stick.collab && Stick.collab.active() && Stick.collab.canComment()){
      var cm = menuItem(ICONS.pencil, "Comment…", function(){ closeFloatingPopovers(); setTimeout(function(){ Stick.collab.openSlip(n, pointAnchor(x, y)); }, 0); });
      openPopover.insertBefore(cm, openPopover.lastChild);
    }
    if(openPopover){ menuNav(openPopover); placeAtPointer(openPopover, x, y); }
  }
  function openGroupMenu(anchor, x, y){
    var ids = Array.from(selected), pop = openFloatingPopoverAt({left: x, right: x, top: y, bottom: y, width: 0, height: 0}, "noteMenu", null);
    var h = makeDiv("menuHint"); h.textContent = ids.length + " selected"; pop.appendChild(h);
    var onlyPhotos = ids.every(function(id){ return isPhoto(findNote(id)); });
    if(onlyPhotos) pop.appendChild(menuItem(ICONS.strip, "Make photo strip", function(){ closeFloatingPopovers(); makeStripFromPhotos(ids); }));
    var anyUnpinned = ids.some(function(id){ var q = findNote(id); return q && !isPinned(q); });
    if(ids.some(function(id){ var q = findNote(id); return q && !q.type; })) pop.appendChild(menuItem(ICONS.tick, "Mark done", function(){ closeFloatingPopovers(); markDoneGroup(ids); }, {title: "Move the selected notes to the Done pile"}));
    pop.appendChild(menuItem(ICONS.pin, anyUnpinned ? "Pin in place" : "Unpin", function(){ closeFloatingPopovers(); setPinned(ids, anyUnpinned); }));
    if(ids.some(function(id){ var q = findNote(id); return rotatable(q) && (q.rot || 0) !== 0 && !isPinned(q); })) pop.appendChild(menuItem(ICONS.move, "Straighten", function(){ closeFloatingPopovers(); straighten(ids.map(findNote).filter(Boolean)); }, {title: "Put the selected items back level"}));
    if(pileEligibleList(ids).length >= 2){
      pop.appendChild(menuItem(ICONS.move, "Stack (arrange vertically)", function(){ closeFloatingPopovers(); stackNotes(ids); }, {title: "Lines the notes up one below another. Nothing else changes."}));
      pop.appendChild(menuItem(ICONS.move, "Collapse into a pile", function(){ closeFloatingPopovers(); makePile(ids); }, {title: "Tucks the notes into one pile. Nothing is deleted; Unpile spreads them back."}));
    }
    pop.appendChild(menuItem(ICONS.copy, "Duplicate", function(){ closeFloatingPopovers(); duplicateNotes(ids); }, {kbd: MOD + "+D"}));
    var moveItem = menuItem(ICONS.move, "Move to board", function(){
      var open = moveItem.nextSibling && moveItem.nextSibling.classList && moveItem.nextSibling.classList.contains("boardPick");
      if(open){ moveItem.nextSibling.remove(); return; }
      moveItem.parentNode.insertBefore(boardPicker(document.createDocumentFragment(), ids), moveItem.nextSibling);
    }, {kbd: "\u203A"});
    pop.appendChild(moveItem);
    pop.appendChild(menuItem(ICONS.share, "Share selection\u2026", function(){ closeFloatingPopovers(); openShareModal(selectedNotes()); }));
    pop.appendChild(menuItem(ICONS.trash, "Delete", function(){ closeFloatingPopovers(); deleteNotes(ids); }, {cls: "danger"}));
  }
  function captureAction(kind, bx, by){
    if(kind === "sticky"){ addNoteAt(bx, by); return; }
    if(kind === "record"){ startRecording(bx, by); return; }
    if(kind === "cutout"){
      var cin = captureInput("photo"); cin.value = "";
      cin.onchange = function(){
        var cf = cin.files && cin.files[0]; if(!cf) return;
        if(cf.type.indexOf("image/") !== 0){ toast("That doesn't look like a photo."); return; }
        dropPhotoFiles([cf], bx, by, {afterAdd: function(made){ if(made[0]) startCutout(made[0], "cutout"); }});
      };
      cin.click();
      return;
    }
    var inp = captureInput(kind);
    inp.value = "";
    inp.onchange = function(){
      var f = inp.files && inp.files[0];
      if(!f) return;
      if(kind === "photo"){
        if(f.type.indexOf("image/") !== 0){ toast("That doesn't look like a photo."); return; }
        dropPhotoFiles([f], bx, by);
      } else {
        if(f.type.indexOf("video/") !== 0){ toast("That doesn't look like a video."); return; }
        createVideoObject(f, bx, by);
      }
    };
    inp.click();
  }
  function placeObj(n, bx, by){
    var sz = objSize(n);
    n.x = Math.max(0, bx - sz.w / 2);
    n.y = Math.max(0, Math.min(boardHeight() - sz.h - 8, by - sz.h / 2));
  }
  function addMediaObject(n, blob, label){
    MediaStore.remember(n.mediaId, blob);
    var tooBig = n.type === "video" && blob.size > MAX_STORED_VIDEO;
    var saved = tooBig ? Promise.reject(new Error("too big")) : MediaStore.put(n.mediaId, blob);
    insertNotes([n], label);
    recoverVertical([n]);
    dismissHint();
    saved.catch(function(){
      toast(tooBig ? "This video is too large to keep on the device, so it plays only until you close the page."
                   : "Couldn't save this on the device, so it plays only until you close the page.");
    });
  }
  // Voice memo: microphone permission is asked only now, when Record is chosen.
  var recording = null;
  async function startRecording(bx, by){
    if(recording) return;
    if(!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder)){
      toast("Recording isn't supported in this browser.");
      return;
    }
    var stream;
    try{ stream = await navigator.mediaDevices.getUserMedia({audio:true}); }
    catch(e){
      toast(e && (e.name === "NotAllowedError" || e.name === "SecurityError")
        ? "Microphone access was blocked. You can allow it in your browser's site settings."
        : "Couldn't start the microphone.");
      return;
    }
    var types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
    var mime = types.filter(function(t){ return MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t); })[0] || "";
    var rec;
    try{ rec = mime ? new MediaRecorder(stream, {mimeType:mime}) : new MediaRecorder(stream); }
    catch(e){ stream.getTracks().forEach(function(t){ t.stop(); }); toast("Recording isn't supported in this browser."); return; }
    var chunks = [], started = Date.now(), cancelled = false;
    var sheet = makeDiv("recSheet");
    sheet.innerHTML = '<span class="recDot"></span><span>Recording</span><span class="recTime">0:00</span>' +
      '<button class="pillBtn" data-a="cancel">Cancel</button><button class="pillBtn primary" data-a="stop">Stop</button>';
    document.body.appendChild(sheet);
    var timeEl = sheet.querySelector(".recTime");
    var tick = setInterval(function(){
      var sec = (Date.now() - started) / 1000;
      timeEl.textContent = fmtDur(sec);
      if(sec >= 300) rec.stop(); // five minutes is plenty for a memo
    }, 250);
    function finish(cancel){ cancelled = cancel; if(rec.state !== "inactive") rec.stop(); }
    sheet.querySelector('[data-a="stop"]').addEventListener("click", function(){ finish(false); });
    sheet.querySelector('[data-a="cancel"]').addEventListener("click", function(){ finish(true); });
    rec.ondataavailable = function(e){ if(e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = function(){
      clearInterval(tick);
      stream.getTracks().forEach(function(t){ t.stop(); });
      sheet.remove();
      recording = null;
      if(cancelled){ toast("Recording discarded."); return; }
      if(!chunks.length){ toast("Nothing was recorded."); return; }
      var blob = new Blob(chunks, {type:rec.mimeType || mime || "audio/webm"});
      var n = {id:newId(), type:"audio", x:0, y:0, rot:rand(-4, 4), mediaId:newId(), duration:(Date.now() - started) / 1000,
               mime:blob.type, caption:"Recording", font:pickFont(), createdAt:Date.now(), phys:{}};
      placeObj(n, bx, by);
      addMediaObject(n, blob, "Add recording");
    };
    recording = {stop:function(){ finish(false); }, cancel:function(){ finish(true); }}; recLayer.open();
    rec.start(1000);
  }
  // Video: the browser's own picker (camera or library); we keep a poster frame and the duration.
  function videoInfo(url){
    return new Promise(function(resolve){
      var v = document.createElement("video"), done = false;
      v.muted = true; v.playsInline = true; v.preload = "metadata"; v.src = url;
      function finish(info){ if(done) return; done = true; v.removeAttribute("src"); v.load(); resolve(info); }
      var t = setTimeout(function(){ finish({duration:isFinite(v.duration) ? v.duration : 0, ratio:v.videoWidth ? v.videoHeight / v.videoWidth : 0.5625, poster:null}); }, 5000);
      v.addEventListener("loadeddata", function(){ try{ v.currentTime = Math.min(0.5, (v.duration || 1) / 3); }catch(e){} });
      v.addEventListener("seeked", function(){
        clearTimeout(t);
        var poster = null, ratio = v.videoWidth ? v.videoHeight / v.videoWidth : 0.5625;
        try{
          var sc = Math.min(1, 320 / Math.max(v.videoWidth, v.videoHeight));
          var c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(v.videoWidth * sc)); c.height = Math.max(1, Math.round(v.videoHeight * sc));
          c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
          poster = c.toDataURL("image/jpeg", 0.72);
        }catch(e){}
        finish({duration:isFinite(v.duration) ? v.duration : 0, ratio:ratio, poster:poster});
      });
      v.addEventListener("error", function(){ clearTimeout(t); finish({duration:0, ratio:0.5625, poster:null}); });
    });
  }
  function createVideoObject(file, bx, by){
    if(CLOUD && window.Stick && file.size > Stick.config.MEDIA_LIMITS.video.maxBytes){
      toast("Videos over " + Math.round(Stick.config.MEDIA_LIMITS.video.maxBytes / 1048576) + " MB can't be saved to your account. Try a shorter clip.");
      return;
    }
    var url = URL.createObjectURL(file);
    videoInfo(url).then(function(info){
      URL.revokeObjectURL(url);
      var ratio = Math.min(2, Math.max(0.3, info.ratio || 0.5625));
      var n = {id:newId(), type:"video", x:0, y:0, w:ratio > 1 ? 150 : 210, imgRatio:+ratio.toFixed(4), rot:rand(-4, 4),
               mediaId:newId(), duration:info.duration, mime:file.type, poster:safeImage(info.poster), caption:"",
               font:pickFont(), createdAt:Date.now(), phys:{}};
      placeObj(n, bx, by);
      addMediaObject(n, file, "Add video");
    });
  }

  // ---------- focus mode: pick a note up to write on it comfortably ----------
  // The element is lifted out of the (zoomed) board while focused; its saved
  // position and size never change, only the words do.
  var focusState = null;
  // ---- the formatting strip in Focus Mode: the common controls without opening the "..." menu. Faint until it is used or hovered.
  var focusBar = null, focusBarSel = null, focusBarIdle = 0;
  function buildFocusBar(n){
    var bar = makeDiv("focusBar"), text = n.textEl, items = [];
    bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", "Formatting"); bar.setAttribute("aria-orientation", "horizontal");
    function add(key, html, label, run, extra){
      var b = document.createElement("button"); b.type = "button"; b.className = "fbBtn" + (extra ? " " + extra : ""); b.dataset.k = key; b.innerHTML = html; b.title = label; b.setAttribute("aria-label", label); b.setAttribute("aria-pressed", "false");
      b.tabIndex = items.length ? -1 : 0;                       // one tab stop; arrow keys move along the strip
      b.addEventListener("mousedown", function(e){ e.preventDefault(); });
      b.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
      b.addEventListener("click", function(e){ e.stopPropagation(); run(b); focusBarPulse(); updateFocusBar(); });
      bar.appendChild(b); items.push(b); return b;
    }
    function sep(){ var s = makeDiv("fbSep"); s.setAttribute("aria-hidden", "true"); bar.appendChild(s); }
    add("bold", ICONS.bold, "Bold (" + MOD + "+B)", function(){ execIn(text, "bold"); });
    add("italic", ICONS.italic, "Italic (" + MOD + "+I)", function(){ execIn(text, "italic"); });
    add("underline", ICONS.underline, "Underline (" + MOD + "+U)", function(){ execIn(text, "underline"); });
    sep();
    [1, 2, 3].forEach(function(lv){ add("h" + lv, "H" + lv, "Heading " + lv, function(){ toggleHeading(text, lv); }, "fbText"); });
    sep();
    add("mark", ICONS.highlighter, "Highlight", function(){ toggleHighlight(text); });
    add("ul", ICONS.ul, "Bullet list", function(){ setListKind(text, "ul"); });
    add("ol", ICONS.ol, "Numbered list", function(){ setListKind(text, "ol"); });
    add("check", ICONS.checklist, "Checklist", function(){ setListKind(text, "check"); });
    add("title", ICONS.titleLine, "Title line (no checkbox)", function(){ toggleChecklistTitle(text); });
    add("link", ICONS.link, "Link", function(b){ openLinkPopover(text, b); });
    bar.addEventListener("keydown", function(e){
      var i = items.indexOf(document.activeElement);
      if(e.key === "ArrowRight" || e.key === "ArrowLeft"){
        e.preventDefault(); e.stopPropagation();
        var j = (i + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
        items.forEach(function(x){ x.tabIndex = -1; }); items[j].tabIndex = 0; items[j].focus();
      } else if(e.key === "Escape"){ e.stopPropagation(); e.preventDefault(); try{ text.focus(); }catch(err){} }
      else e.stopPropagation();
    });
    return bar;
  }
  function focusBarPulse(){ if(!focusBar) return; focusBar.classList.add("awake"); clearTimeout(focusBarIdle); focusBarIdle = setTimeout(function(){ if(focusBar) focusBar.classList.remove("awake"); }, 2600); }
  // reflect what is under the caret: bold/italic, heading level, highlight, list kind
  function updateFocusBar(){
    if(!focusBar || !focusState) return;
    var text = focusState.n.textEl, r = selectionIn(text), st = {};
    if(r){
      try{ st.bold = document.queryCommandState("bold"); st.italic = document.queryCommandState("italic"); st.underline = document.queryCommandState("underline"); }catch(e){}
      var tli = closestIn(r.startContainer, "li", text); st.title = !!(tli && tli.getAttribute("data-title") === "true");
      var node = r.startContainer, h = closestIn(node, "h1", text) ? 1 : closestIn(node, "h2", text) ? 2 : closestIn(node, "h3", text) ? 3 : 0;
      st.h1 = h === 1; st.h2 = h === 2; st.h3 = h === 3;
      st.mark = !!closestIn(node, "mark", text);
      var k = listKind(currentList(text)); st.ul = k === "ul"; st.ol = k === "ol"; st.check = k === "check";
    }
    Array.prototype.forEach.call(focusBar.querySelectorAll(".fbBtn"), function(b){ b.setAttribute("aria-pressed", String(!!st[b.dataset.k])); b.classList.toggle("on", !!st[b.dataset.k]); });
  }
  function showFocusBar(f){
    if(focusBar) hideFocusBar();
    focusBar = buildFocusBar(f.n); f.el.appendChild(focusBar);
    focusBarSel = function(){ if(focusState && f.n.textEl && f.n.textEl.contains(document.getSelection().anchorNode)){ focusBarPulse(); updateFocusBar(); } };
    document.addEventListener("selectionchange", focusBarSel);
    f.n.textEl.addEventListener("keydown", focusBarPulse);
    updateFocusBar();
  }
  function hideFocusBar(){
    if(focusBarSel) document.removeEventListener("selectionchange", focusBarSel);
    if(focusBar) focusBar.remove();
    focusBar = null; focusBarSel = null; clearTimeout(focusBarIdle);
  }
  function enterFocus(n){
    if(!n || n.type === "photo" || readOnly || focusState || !n.el || !n.textEl) return;
    closeFloatingPopovers(); hideLinkCard();
    setSelection([n.id]);
    var el = n.el;
    var scrim = makeDiv("focusScrim");
    scrim.addEventListener("mousedown", function(e){ e.preventDefault(); exitFocus(); });
    document.body.appendChild(scrim);
    var placeholder = document.createComment("focused note");
    el.parentNode.insertBefore(placeholder, el);
    document.body.appendChild(el);
    el.classList.add("focused");
    var closeBtn = document.createElement("button");
    closeBtn.className = "focusClose";
    closeBtn.innerHTML = ICONS.close;
    closeBtn.title = "Done (Esc)";
    closeBtn.setAttribute("aria-label", "Put the note back");
    closeBtn.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
    closeBtn.addEventListener("mousedown", function(e){ e.preventDefault(); });
    closeBtn.addEventListener("click", function(e){ e.stopPropagation(); exitFocus(); });
    el.appendChild(closeBtn);
    focusState = {n:n, el:el, scrim:scrim, placeholder:placeholder, closeBtn:closeBtn}; focusLayer.open();
    document.body.classList.add("focusing");
    showFocusBar(focusState);
    ensureCaret(n.textEl);
    updateScrollCue(n.textEl);
  }
  function exitFocus(){
    if(!focusState) return;
    var f = focusState;
    focusState = null;
    hideFocusBar();
    f.closeBtn.remove();
    f.el.classList.remove("focused");
    if(f.placeholder.parentNode){ f.placeholder.parentNode.insertBefore(f.el, f.placeholder); f.placeholder.remove(); }
    else boardInner.appendChild(f.el);
    f.scrim.remove();
    document.body.classList.remove("focusing");
    if(f.n.textEl){
      f.n.html = f.n.textEl.innerHTML;
      f.n.textEl.scrollTop = 0;
      updateScrollCue(f.n.textEl);
      refreshDates(f.n);
      updateListHint(f.n);
    }
    saveNotes();
    recoverVertical([f.n]);
  }

  // ---------- note rendering ----------
  function makeBadge(n){
    var badge = document.createElement("div");
    badge.className = "badge" + (n.done ? " done" : "");
    badge.textContent = n.due ? ("Due " + formatDueLabel(n.due) + (n.dueTime ? ", " + n.dueTime : "")) : "Task";
    return badge;
  }
  function makeDiv(cls){ var d = document.createElement("div"); d.className = cls; return d; }

  // Read-only note for share previews and public pages: same paper, tape, font and formatting.
  function buildStaticNote(item){
    if(item && item.type === "pile") return buildPileStatic(item);
    if(isPhoto(item)) return buildStaticPhoto(item);
    if(isPaper(item)) return buildStaticPaper(item);
    if(isAV(item)){
      var sb = buildAVEl(item); sb.el.classList.add("static");
      item.el = sb.el;
      sb.play.addEventListener("click", function(e){ e.stopPropagation(); playAV(item, sb.play); });
      return sb.el;
    }
    var el = makeDiv("note staticNote");
    el.style.width = (item.w || NOTE_W) + "px";
    applyNoteLook(el, item);
    el.appendChild(makeDiv("tab"));
    el.appendChild(makeDiv("paperFx"));
    if(item.isTask) el.appendChild(makeBadge(item));
    if(item.image) el.appendChild(buildImageWrap(item).wrap);
    var t = makeDiv("text" + (item.done ? " done" : ""));
    t.dir = "auto";
    t.style.fontFamily = fontStack(item.font);
    t.innerHTML = sanitizeHtml(item.html);
    t.addEventListener("click", function(e){
      var a = e.target.closest("a");
      if(a){ e.preventDefault(); openLink(a.getAttribute("href")); }
    });
    el.appendChild(t);
    if(item.cosmetic === "soup") soupDecorate(el, item, t);
    return el;
  }

  // ---------- Piles and vertical stacks (phase 1) ----------
  // A vertical stack is only an arrangement: the same objects, laid out a little below one another. A pile is a small object that REFERENCES
  // its members (rules in js/pile.js). While collapsed, the members stay in `notes` (so sync, search, export and undo still see every one of
  // them) and are simply not drawn: the page draws the top paper, a few paper edges and a count, whatever the size of the pile.
  // NEVER treat "no element" as "does not exist": hiddenIds only says what is not drawn.
  var hiddenIds = {};
  function isPileObj(n){ return !!n && n.type === "pile"; }
  function isHiddenMember(n){ return !!n && !!hiddenIds[n.id]; }
  function rebuildHidden(){
    var byId = {}, live = {};
    notes.forEach(function(n){ byId[n.id] = n; });
    notes.forEach(function(p){ if(isPileObj(p)){ var c = 0; (p.members || []).forEach(function(id){ if(byId[id]) c++; }); live[p.id] = c; } });
    hiddenIds = {};
    notes.forEach(function(n){
      if(isPileObj(n) || !n.pileId) return;
      var p = byId[n.pileId];
      if(p && isPileObj(p) && live[p.id] >= Stick.pile.MIN_MEMBERS && (p.members || []).indexOf(n.id) !== -1) hiddenIds[n.id] = true;
    });
  }
  function pileLive(p){ return (p.members || []).map(findNote).filter(Boolean); }          // top first
  function logicalCount(){ return Stick.pile.logicalCount(notes); }
  // draw what should be drawn and stop drawing what should not (after anything that changes who is in which pile)
  function syncPileVisibility(){
    rebuildHidden();
    notes.forEach(function(n){
      if(isPileObj(n)) return;
      if(hiddenIds[n.id]){
        if(n.el){ selected.delete(n.id); clearTimeout(n._cleanT); try{ n.el.remove(); }catch(e){} n.el = null; n.textEl = null; n.captionEl = null; n.badgeEl = null; clearDecorations(n.id); }
      } else if(!n.el){ try{ renderNote(n, false, {focus: false}); }catch(err){} }
    });
    notes.filter(isPileObj).forEach(function(p){ if(p.el){ try{ p.el.remove(); }catch(e){} p.el = null; } try{ renderNote(p, false); }catch(err){} });
    applySelection();
  }

  // ---- the pile on the board: top paper + a few edges + a count (about 8 elements however many papers it holds)
  function pileSnippet(top){
    var t = isPaper(top) ? Stick.objects.text(top) : htmlToText(top.html || "");
    t = String(t || "").replace(/\s+/g, " ").trim();
    return t.slice(0, 140) || (isPaper(top) ? Stick.objects.LABELS[top.type] : "Empty note");
  }
  // Browsing a pile is a VIEW: which member is showing is remembered here (not saved, not synced). The pile's member list, every member's data
  // and the board's object list are never touched by it.
  var pileBrowse = {};
  function browseIdx(n, live){ var i = pileBrowse[n.id] || 0; return live.length ? Math.min(Math.max(0, i), live.length - 1) : 0; }
  function paintPileShown(n, el){
    var live = pileLive(n); if(!el || !live.length) return;
    var i = browseIdx(n, live), top = live[i], txt = el.querySelector(".pileText"), topEl = el.querySelector(".pileTop"), badge = el.querySelector(".pileCount");
    if(txt){ txt.textContent = pileSnippet(top); txt.style.fontFamily = top && top.font && FONT_BY_NAME[top.font] ? '"' + top.font + '", cursive' : ""; }
    if(topEl){ var bg = top && !top.type && top.bg ? top.bg : "#fffdf5"; topEl.style.background = document.body.classList.contains("dark") && top && !top.type && top.bg ? dimPaperColor(top.bg) : bg; }
    if(badge) badge.textContent = i ? (i + 1) + " / " + live.length : String(live.length);
    el.setAttribute("aria-label", Stick.pile.label(n, live.length) + ". Showing " + (i + 1) + " of " + live.length + ": " + pileSnippet(top).slice(0, 60));
  }
  function pileStep(n, dir){
    var live = pileLive(n); if(live.length < 2) return;
    pileBrowse[n.id] = (browseIdx(n, live) + dir + live.length) % live.length;
    paintPileShown(n, n.el);
  }
  function buildPileEl(n, live){
    var top = live[browseIdx(n, live)], P = Stick.pile;
    var el = makeDiv("boardObj paperObj pileObj");
    el.style.setProperty("--pw", (n.w || P.WIDTH[2]) + "px"); el.style.setProperty("--rot", (n.rot || 0) + "deg");
    el.setAttribute("role", "group"); el.setAttribute("aria-label", P.label(n, live.length) + ". On top: " + pileSnippet(top).slice(0, 60)); el.tabIndex = 0;
    var rng = seededRng(n.edges || 1);
    for(var i = 3; i >= 1; i--){
      var edge = makeDiv("pileEdge");
      edge.style.setProperty("--er", ((rng() * 6 - 3) * (i % 2 ? 1 : -1)).toFixed(2) + "deg"); edge.style.setProperty("--ey", (i * 4) + "px"); edge.style.setProperty("--ex", ((rng() * 6 - 3)).toFixed(1) + "px");
      el.appendChild(edge);
    }
    var topEl = makeDiv("pileTop"), txt = makeDiv("pileText");
    var bg = top && !top.type && top.bg ? top.bg : "#fffdf5";
    topEl.style.background = document.body.classList.contains("dark") && top && !top.type && top.bg ? dimPaperColor(top.bg) : bg;
    txt.textContent = pileSnippet(top); txt.dir = "auto";
    if(top && top.font && FONT_BY_NAME[top.font]) txt.style.fontFamily = '"' + top.font + '", cursive';
    topEl.appendChild(txt); el.appendChild(topEl);
    var badge = makeDiv("pileCount"); badge.textContent = browseIdx(n, live) ? (browseIdx(n, live) + 1) + " / " + live.length : String(live.length); badge.setAttribute("aria-hidden", "true"); el.appendChild(badge);
    return el;
  }
  function buildPileStatic(item){ var live = pileLive(item); if(live.length < 2) return makeDiv(""); var el = buildPileEl(item, live); el.classList.add("static"); el.removeAttribute("tabindex"); return el; }
  function renderPile(n, isNew){
    var live = pileLive(n);
    if(live.length < Stick.pile.MIN_MEMBERS){ n.el = null; return null; }          // a pile with fewer than two papers is not drawn; whatever is left shows as itself
    var el = buildPileEl(n, live);
    if(isNew) el.classList.add("new");
    el.dataset.id = n.id; el.style.left = n.x + "px"; el.style.top = n.y + "px"; el.style.zIndex = n.z;
    if(selected.has(n.id)) el.classList.add("selected");
    n.el = el; n.textEl = null; n.captionEl = null;
    boardInner.appendChild(el);
    if(!readOnly){
      var more = document.createElement("button"); more.type = "button"; more.className = "pCtl pMore"; more.innerHTML = ICONS.more; more.title = "Options for this pile"; more.setAttribute("aria-label", "Options for this pile");
      more.addEventListener("pointerdown", function(e){ e.stopPropagation(); }); more.addEventListener("mousedown", function(e){ e.preventDefault(); });
      more.addEventListener("click", function(e){ e.stopPropagation(); pileMenu(n, more); });
      el.appendChild(more);
      [["pilePrev", "\u2039", "Previous paper in this pile", -1], ["pileNext", "\u203a", "Next paper in this pile", 1]].forEach(function(d){
        var nb = document.createElement("button"); nb.type = "button"; nb.className = "pileNav " + d[0]; nb.textContent = d[1]; nb.title = d[2]; nb.setAttribute("aria-label", d[2]);
        nb.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
        nb.addEventListener("mousedown", function(e){ e.preventDefault(); });
        nb.addEventListener("click", function(e){ e.stopPropagation(); pileStep(n, d[3]); });
        el.appendChild(nb);
      });
      var pileDownAt = null;
      el.addEventListener("dblclick", function(e){ if(!(e.target.closest && e.target.closest("button"))) openPileBrowser(n); });
      el.addEventListener("pointerdown", function(e){
        if(e.pointerType === "mouse" && e.button !== 0) return;
        if(e.target.closest && e.target.closest("button")) return;
        pileDownAt = {x: e.clientX, y: e.clientY, touch: e.pointerType === "touch" || e.pointerType === "pen"};
        e.preventDefault(); endEditing(); closeCaptureMenu();
        if(searchInput.value.trim()) setTimeout(clearSearch, 0);
        if(e.ctrlKey || e.metaKey){ toggleSelected(n.id); return; }
        var group = selected.has(n.id) && selected.size > 1;
        if(!group) setSelection([n.id]);
        bringToFront(n, el);
        startDrag(e, n, group ? selectedNotes() : [n]);          // only the pile moves: its members are not drawn and keep their place until it is opened
      });
      // a touch tap (not a drag) on a pile opens the browser: no hover needed, one paper shown clearly at a time
      el.addEventListener("pointerup", function(e){
        if(!pileDownAt || !pileDownAt.touch) return;
        var moved = Math.abs(e.clientX - pileDownAt.x) + Math.abs(e.clientY - pileDownAt.y) > 8; pileDownAt = null;
        if(!moved && !(e.target.closest && e.target.closest("button"))) openPileBrowser(n);
      });
      el.addEventListener("keydown", function(e){
        if(e.target !== el) return;
        if(e.key === " "){ e.preventDefault(); setSelection([n.id]); }
        else if(e.key === "ArrowRight" || e.key === "ArrowLeft"){ e.preventDefault(); var rtl = getComputedStyle(el).direction === "rtl"; pileStep(n, (e.key === "ArrowRight") !== rtl ? 1 : -1); }
        else if(e.key === "Enter"){ e.preventDefault(); var r0 = el.getBoundingClientRect(); openObjectContextMenu(n, r0.left + 24, r0.top + 24); }
        else if(e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")){ e.preventDefault(); var r = el.getBoundingClientRect(); openObjectContextMenu(n, r.left + 24, r.top + 24); }
        else if(e.key === "Delete" || e.key === "Backspace"){ e.preventDefault(); deleteNotes([n.id]); }     // the safe meaning: open the pile, delete nothing
      });
      el.addEventListener("focus", function(){ if(!selected.has(n.id)) setSelection([n.id]); });
      if(isNew) el.addEventListener("animationend", function(){ el.classList.remove("new"); }, {once: true});
    }
    return el;
  }

  // ---- what a person can do
  function pileEligibleList(ids){ return ids.map(findNote).filter(function(n){ return n && n.el && !isHiddenMember(n) && Stick.pile.eligible(n); }); }
  function pileTransactionIds(pile){ return pileLive(pile).map(function(m){ return m.id; }).concat([pile.id]); }

  // take papers out of the pile object and put them back on the board (no history; callers wrap it)
  function dissolveInto(pile, members){
    var sh = Stick.pile.unpileShift(pile), dx = sh.dx, dy = sh.dy;
    if(members.length){          // move the papers back as one piece, so their spacing survives the board's edges
      dx = Math.max(dx, -Math.min.apply(null, members.map(function(m){ return m.x; })));
      dy = Math.max(dy, -Math.min.apply(null, members.map(function(m){ return m.y; })));
      dy = Math.min(dy, Math.min.apply(null, members.map(function(m){ return itemMaxY(m) - m.y; })));
    }
    members.slice().reverse().forEach(function(m){              // bottom of the pile first, so they land in their old order
      delete m.pileId; m.x = Math.max(0, m.x + dx); m.y = Math.max(0, m.y + dy); zCounter += 1; m.z = zCounter;
    });
    var i = notes.indexOf(pile); if(i !== -1) notes.splice(i, 1);
    selected.delete(pile.id); if(pile.el){ try{ pile.el.remove(); }catch(e){} pile.el = null; } clearDecorations(pile.id);
  }
  function finishPileChange(){ syncPileVisibility(); saveNotes(); ensureWidth(); updateCount(); updateMinimap(); }

  function makePile(ids){
    if(readOnly) return;
    var list = pileEligibleList(ids), skipped = ids.length - list.length;
    if(list.length < Stick.pile.MIN_MEMBERS){ toast("Select at least two notes (not pinned, not Done) to pile them."); return; }
    if(list.length > Stick.pile.MAX_MEMBERS){ toast("A pile holds up to " + Stick.pile.MAX_MEMBERS + " papers."); return; }
    endEditing(); closeFloatingPopovers();
    var ordered = Stick.pile.order(list), top = ordered[0], before = captureState(ordered.map(function(m){ return m.id; }));
    var anchor = ordered.filter(function(m){ try{ return m.el && onScreen(m); }catch(e){ return false; } })[0] || top;          // the pile appears where you can see it
    zCounter += 1;
    var pile = {id: newId(), type: "pile", x: anchor.x, y: anchor.y, w: Stick.pile.WIDTH[2], rot: rand(-2, 2), z: zCounter, members: ordered.map(function(m){ return m.id; }), ox: anchor.x, oy: anchor.y, edges: Math.floor(rand(1, 99999)), phys: {}, createdAt: Date.now()};
    ordered.forEach(function(m){ m.pileId = pile.id; });
    notes.push(pile);
    finishPileChange();
    setSelection([pile.id]);
    var action = recordChange("Pile " + ordered.length + " papers", before, {newIds: [pile.id]});
    toast("Piled " + ordered.length + " papers." + (skipped > 0 ? " (" + skipped + " left out: pinned, Done or not a note.)" : ""), "Undo", function(){ undoIfTop(action); });
  }
  function unpilePile(pile){
    if(readOnly || !isPileObj(pile)) return;
    endEditing(); closeFloatingPopovers();
    var live = pileLive(pile), ids = live.map(function(m){ return m.id; }), before = captureState(ids.concat([pile.id]));
    dissolveInto(pile, live);
    finishPileChange();
    setSelection(ids);
    var action = recordChange("Unpile " + ids.length + " papers", before);
    toast("Opened the pile: " + ids.length + " papers back on the board. Nothing was deleted.", "Undo", function(){ undoIfTop(action); });
  }
  function pileSendTopToBack(pile){
    var before = captureState([pile.id]);
    pile.members = Stick.pile.sendTopToBack(pile.members);
    syncPileVisibility(); saveNotes();
    recordChange("Send the top paper to the back", before);
  }
  function pileTakeTop(pile, memberId){
    var live = pileLive(pile); if(live.length < Stick.pile.MIN_MEMBERS) return;
    var top = (memberId && findNote(memberId) && live.indexOf(findNote(memberId)) !== -1) ? findNote(memberId) : live[0], before = captureState(pileTransactionIds(pile));
    delete top.pileId; pile.members = Stick.pile.removeMember(pile.members, top.id);
    var rest = pileLive(pile);
    top.x = Math.max(0, pile.x + (pile.w || 200) + 24); top.y = clampY(pile.y, top); zCounter += 1; top.z = zCounter;
    if(rest.length < Stick.pile.MIN_MEMBERS) dissolveInto(pile, rest);          // one paper left is just a paper again
    finishPileChange();
    setSelection([top.id]);
    var action = recordChange(rest.length < Stick.pile.MIN_MEMBERS ? "Take the top paper out (pile closed)" : "Take the top paper out", before);
    toast(rest.length < Stick.pile.MIN_MEMBERS ? "The pile is down to one paper, so it is open again." : "Took the top paper out of the pile.", "Undo", function(){ undoIfTop(action); });
  }
  // an explicit, separate, destructive action: the pile AND everything in it
  function deletePileAndContents(pile){
    var ids = pile.members.filter(function(id){ return !!findNote(id); });
    confirmDialog({title: "Delete the pile and its " + ids.length + " papers?", body: "This deletes the pile and every paper in it. (To keep the papers, choose Unpile instead.) You can undo it right after.", confirm: "Delete everything", danger: true}).then(function(ok){
      if(!ok) return;
      deleteNotes(ids.concat([pile.id]), {force: true});
    });
  }
  // a paper leaves the pile because it was marked Done (here or on another device): the pile shrinks, and with one paper left it opens again
  function pileRelease(id, local){
    var done = false;
    notes.forEach(function(p){
      if(!isPileObj(p) || (p.members || []).indexOf(id) === -1) return;
      p.members = Stick.pile.removeMember(p.members, id); done = true;
      var rest = pileLive(p).filter(function(m){ return m.id !== id; });
      if(rest.length < Stick.pile.MIN_MEMBERS){
        if(local){ dissolveInto(p, rest); }          // the user's own action: close the pile and put the last paper back
        else { rest.forEach(function(m){ delete m.pileId; }); }        // from another device: never delete anything on inference; the leftover pile row is simply not drawn
      }
    });
    var n = findNote(id); if(n) delete n.pileId;
    return done;
  }

  // ---- a vertical stack: an arrangement, nothing else changes about the papers
  function stackNotes(ids){
    if(readOnly) return;
    var list = pileEligibleList(ids), P = Stick.pile;
    if(list.length < 2){ toast("Select at least two notes (not pinned, not Done) to stack them."); return; }
    endEditing(); closeFloatingPopovers();
    var before = captureState(list.map(function(n){ return n.id; }));
    var items = list.map(function(n){ return {id: n.id, x: n.x, y: n.y}; }), y0 = Math.min.apply(null, items.map(function(i){ return i.y; }));
    var lastH = estimateNoteH(list[list.length - 1]), maxRoom = boardHeight() - 12 - lastH;
    var step = Math.max(2, Math.min(P.STACK_STEP, maxRoom / Math.max(1, list.length - 1)));          // a long stack tightens its steps rather than run off the board
    var lay = P.stackLayout(items, step), dy = Math.max(0, Math.min(y0, maxRoom - step * (list.length - 1))) - y0;          // and starts higher if it has to
    lay.forEach(function(l){
      var n = findNote(l.id); n.x = l.x; n.y = Math.max(0, l.y + dy); zCounter += 1; n.z = zCounter;
      if(n.el){ n.el.style.left = n.x + "px"; n.el.style.top = n.y + "px"; n.el.style.zIndex = n.z; }
    });
    ensureWidth(); saveNotes(); updateMinimap();
    setSelection(list.map(function(n){ return n.id; }));
    var action = recordChange("Stack " + list.length + " papers", before);
    toast("Stacked " + list.length + " papers. Click a paper's top edge to bring it forward.", "Undo", function(){ undoIfTop(action); });
  }

  // put the listed objects back exactly as they were (used by the undo of a pile operation that also touches the Done pile)
  function restoreStates(before){
    Object.keys(before).forEach(function(id){
      var s = before[id], cur = findNote(id);
      if(!s) return;
      if(cur){ SERIAL_FIELDS.forEach(function(k){ if(k in s) cur[k] = s[k]; else delete cur[k]; }); if(cur.members) cur.members = cur.members.slice(); }
      else { var c = Object.assign({}, s); if(c.members) c.members = c.members.slice(); if(c.phys) c.phys = Object.assign({}, c.phys); notes.push(c); }
    });
  }
  // the top paper is finished: it leaves the pile (state kept, count down by one, the pile opens when one paper is left) and goes to the Done pile
  function pileMarkTopDone(pileId){
    if(readOnly) return;
    var pile = findNote(pileId); if(!pile || pileLive(pile).length < Stick.pile.MIN_MEMBERS) return;
    closeFloatingPopovers();
    var before = captureState(pileTransactionIds(pile)), topId = pileLive(pile)[0].id, by = whoAmI(), at = Date.now();
    function take(){
      var p = findNote(pileId); if(!p) return false;
      var t = pileLive(p)[0]; if(!t) return false;
      var snap = snapNote(t); delete snap.pileId; snap.doneAt = at; if(by) snap.doneBy = String(by).slice(0, 60);
      pileRelease(t.id, true);
      removeNoteEl(t, false); notes.splice(notes.indexOf(t), 1); selected.delete(t.id); clearDecorations(t.id);
      donePile.push(snap);
      finishPileChange(); updateDonePile(true);
      return true;
    }
    function put(){
      var pi = donePile.findIndex(function(x){ return x.id === topId; }); if(pi !== -1) donePile.splice(pi, 1);
      restoreStates(before);
      finishPileChange(); updateDonePile(false);
    }
    take();
    var action = pushHistory({label: "Mark the top paper done", custom: true, t: Date.now(), undo: function(){ put(); return true; }, redo: function(){ take(); return true; }});
    toast("Moved the top paper to Done.", "Undo", function(){ undoIfTop(action); });
  }

  var pileBrowserState = null, pileBrowserLayer = OV.layer("pile-browser", function(){ closePileBrowser(); }, function(){ return !!pileBrowserState; });
  function closePileBrowser(){
    if(!pileBrowserState) return;
    var st = pileBrowserState; pileBrowserState = null; pileBrowserLayer.close(); st.root.remove();
    var n = findNote(st.id); if(n && n.el) paintPileShown(n, n.el);
    if(st.opener && st.opener.focus && document.contains(st.opener)){ try{ st.opener.focus(); }catch(e){} }
  }
  function openPileBrowser(pile){
    if(!pile || !isPileObj(pile) || pileLive(pile).length < Stick.pile.MIN_MEMBERS) return;
    closePileBrowser(); closeFloatingPopovers();
    var root = makeDiv("pbBackdrop"), card = makeDiv("pbCard"), stage = makeDiv("pbStage"), bar = makeDiv("pbBar");
    card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "true"); card.setAttribute("aria-label", "Browse the pile"); card.tabIndex = -1;
    var prev = document.createElement("button"), next = document.createElement("button"), idx = makeDiv("pbIndex"), back = document.createElement("button");
    prev.type = next.type = back.type = "button"; prev.className = next.className = "pbNav"; back.className = "pbBack";
    prev.textContent = "\u2039"; next.textContent = "\u203a"; prev.setAttribute("aria-label", "Previous paper"); next.setAttribute("aria-label", "Next paper");
    back.textContent = "Back to the pile"; idx.setAttribute("role", "status"); idx.setAttribute("aria-live", "polite");
    var take = document.createElement("button"); take.type = "button"; take.className = "pbTake"; take.textContent = "Take this one out";
    bar.appendChild(prev); bar.appendChild(idx); bar.appendChild(next);
    card.appendChild(stage); card.appendChild(bar); var foot = makeDiv("pbFoot"); foot.appendChild(take); foot.appendChild(back); card.appendChild(foot);
    root.appendChild(card); document.body.appendChild(root);
    pileBrowserState = {id: pile.id, root: root, opener: document.activeElement};
    pileBrowserLayer.open();
    function paint(){
      var live = pileLive(pile);
      if(live.length < Stick.pile.MIN_MEMBERS){ closePileBrowser(); return; }
      var i = browseIdx(pile, live), m = live[i]; stage.textContent = "";
      var paper = null;
      try{ paper = buildStaticNote(m); }catch(err){ paper = null; }
      if(paper){ paper.classList.add("pbPaper"); paper.style.cssText += ";position:relative;left:auto;top:auto;transform:none;margin:0 auto;"; stage.appendChild(paper); }
      else { var f = makeDiv("pbFallback"); f.textContent = pileSnippet(m); stage.appendChild(f); }
      idx.textContent = (i + 1) + " / " + live.length;
      take.hidden = readOnly;
    }
    function step(d){ var live = pileLive(pile); if(live.length < 2) return; pileBrowse[pile.id] = (browseIdx(pile, live) + d + live.length) % live.length; paint(); }
    prev.addEventListener("click", function(){ step(-1); }); next.addEventListener("click", function(){ step(1); });
    back.addEventListener("click", closePileBrowser);
    root.addEventListener("mousedown", function(e){ if(e.target === root) closePileBrowser(); });
    take.addEventListener("click", function(){ var live = pileLive(pile), m = live[browseIdx(pile, live)]; closePileBrowser(); if(m) pileTakeTop(pile, m.id); });
    card.addEventListener("keydown", function(e){
      if(e.key === "ArrowRight"){ e.preventDefault(); step(1); } else if(e.key === "ArrowLeft"){ e.preventDefault(); step(-1); }
      else if(e.key === "Tab"){ var f = Array.prototype.filter.call(card.querySelectorAll("button"), function(b){ return !b.hidden; }); if(!f.length) return; var a = f[0], z = f[f.length - 1]; if(e.shiftKey && document.activeElement === a){ e.preventDefault(); z.focus(); } else if(!e.shiftKey && document.activeElement === z){ e.preventDefault(); a.focus(); } }
    });
    // swipe left / right on the paper
    var sx = null;
    stage.addEventListener("pointerdown", function(e){ sx = e.clientX; });
    stage.addEventListener("pointerup", function(e){ if(sx == null) return; var dx = e.clientX - sx; sx = null; if(Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); });
    stage.addEventListener("pointercancel", function(){ sx = null; });
    paint(); next.focus();
  }

  // ---- menus
  function pileMenu(n, anchor){
    var pop = openFloatingPopover(anchor, "noteMenu"); if(!pop) return;
    var live = pileLive(n), h = makeDiv("menuHint"); h.textContent = Stick.pile.label(n, live.length); pop.appendChild(h);
    pop.appendChild(menuItem(ICONS.search || ICONS.more, "Browse the papers\u2026", function(){ closeFloatingPopovers(); openPileBrowser(n); }, {title: "Look through the pile one paper at a time. Nothing changes."}));
    pop.appendChild(menuItem(ICONS.move, "Unpile (put them back)", function(){ closeFloatingPopovers(); unpilePile(n); }, {title: "Spreads the papers back out where they were. Nothing is deleted."}));
    pop.appendChild(menuItem(ICONS.move, "Send the top paper to the back", function(){ closeFloatingPopovers(); pileSendTopToBack(n); }));
    pop.appendChild(menuItem(ICONS.move, "Take the top paper out", function(){ closeFloatingPopovers(); pileTakeTop(n); }));
    pop.appendChild(menuItem(ICONS.tick, "Mark the top paper done", function(){ pileMarkTopDone(n.id); }, {title: "Only the top paper goes to Done. A pile cannot be marked done."}));
    pop.appendChild(makeDiv("menuSep"));
    pop.appendChild(pinMenuItem(n));
    pop.appendChild(makeDiv("menuSep"));
    pop.appendChild(menuItem(ICONS.trash, "Delete the pile and its papers…", function(){ closeFloatingPopovers(); deletePileAndContents(n); }, {cls: "danger", title: "Deletes every paper in the pile. Unpile keeps them."}));
  }
  OBJECT_MENUS.pile = pileMenu;

  function renderNote(n, isNew, opts){
    if(hiddenIds[n.id]) return null;                               // inside a collapsed pile: not drawn, still on the board
    var made = renderNoteCore(n, isNew, opts);
    decoratePin(n);
    if(selected.size === 1 && selected.has(n.id)) syncRotHandle();
    if(window.Stick && Stick.collab && Stick.collab.active() && (n.el || made)) Stick.collab.decorate(n, n.el || made);
    return made;
  }
  function renderNoteCore(n, isNew, opts){
    if(isPileObj(n)) return renderPile(n, isNew);
    if(n.type === "embed") return renderEmbed(n, isNew);
    if(isZone(n)) return renderZone(n, isNew);
    if(isPhoto(n)) return renderPhoto(n, isNew, opts);
    if(isPaper(n)) return renderPaper(n, isNew, opts);
    if(isAV(n)) return renderAV(n, isNew, opts);
    opts = opts || {};
    var el = document.createElement("div");
    el.className = "note" + (isNew ? " new" : "");
    el.dataset.id = n.id;
    el.style.left = n.x + "px";
    el.style.top = n.y + "px";
    el.style.width = (n.w || NOTE_W) + "px";
    el.style.zIndex = n.z;
    applyNoteLook(el, n);
    if(selected.has(n.id)) el.classList.add("selected");
    n.el = el;

    var tab = makeDiv("tab");
    tab.title = readOnly ? "" : "Drag to move";
    el.appendChild(tab);
    el.appendChild(makeDiv("paperFx"));

    var del = document.createElement("button");
    del.className = "del";
    del.setAttribute("aria-label","Delete note");
    del.innerHTML = ICONS.close;
    el.appendChild(del);
    var qd = null;
    if(!readOnly && !n.type){
      var grip = document.createElement("button"); grip.type = "button"; grip.className = "pCtl pHandle noteHandle"; grip.title = "Drag to resize"; grip.setAttribute("aria-label", "Resize note");
      grip.addEventListener("pointerdown", function(e){ startNoteResize(e, n); }); grip.addEventListener("mousedown", function(e){ e.preventDefault(); });
      // pull the bottom or right edge to make the note longer or wider (a wide, always-visible tab on touch screens)
      var edgeB = document.createElement("div"); edgeB.className = "noteEdge noteEdgeB"; edgeB.title = "Pull to make the note longer"; edgeB.setAttribute("aria-hidden", "true");
      edgeB.addEventListener("pointerdown", function(e){ startNoteResize(e, n, "y"); });
      var edgeR = document.createElement("div"); edgeR.className = "noteEdge noteEdgeR"; edgeR.title = "Pull to make the note wider"; edgeR.setAttribute("aria-hidden", "true");
      edgeR.addEventListener("pointerdown", function(e){ startNoteResize(e, n, "x"); });
      el.appendChild(edgeB); el.appendChild(edgeR);
      el.appendChild(grip);                                           // a quick "done" tick beside the x (notes and checklists; hidden on soup)
      qd = document.createElement("button");
      qd.type = "button"; qd.className = "quickDone"; qd.title = "Mark done"; qd.setAttribute("aria-label", "Mark done");
      qd.innerHTML = ICONS.doneTick;
      el.appendChild(qd);
    }

    if(n.isTask){ n.badgeEl = makeBadge(n); el.appendChild(n.badgeEl); }

    if(n.image){
      var built = buildImageWrap(n, function(){ if(!readOnly) saveNotes(); });
      var imgWrap = built.wrap, img = built.img;
      if(!readOnly){
        var rmImg = document.createElement("button");
        rmImg.className = "rmImg";
        rmImg.innerHTML = ICONS.close;
        rmImg.title = "Remove image";
        rmImg.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
        rmImg.addEventListener("mousedown", function(e){ e.preventDefault(); e.stopPropagation(); });
        rmImg.addEventListener("click", function(e){
          e.stopPropagation();
          removeImage(n);
        });
        imgWrap.appendChild(rmImg);
        var handle = makeDiv("imgHandle");
        handle.title = "Drag to resize";
        handle.addEventListener("pointerdown", function(e){ startImageResize(e, n, img); });
        imgWrap.appendChild(handle);
        // clicking the photo selects it (and its note) without starting to type
        img.addEventListener("mousedown", function(e){ if(!(e.ctrlKey || e.metaKey)) e.preventDefault(); });
        img.addEventListener("pointerdown", function(e){
          if(e.ctrlKey || e.metaKey) return;
          endEditing();
          selectImage(n);
        });
      }
      el.appendChild(imgWrap);
      if(selectedImageNote && selectedImageNote.id === n.id){ imgWrap.classList.add("imgSel"); selectedImageNote = n; }
    }

    n.html = sanitizeHtml(n.html || "");
    var text = makeDiv("text" + (n.done ? " done" : ""));
    text.contentEditable = readOnly ? "false" : "true";
    text.spellcheck = false;
    text.dir = "auto";
    text.setAttribute("data-placeholder","Type something…");
    text.style.fontFamily = fontStack(n.font);
    text.innerHTML = n.html;
    el.appendChild(text);
    n.textEl = text;

    if(!readOnly){
      if(n.isTask){
        var taskRow = makeDiv("taskRow");

        var doneBtn = document.createElement("button");
        doneBtn.className = "checkToggle" + (n.done ? " checked" : "");
        doneBtn.innerHTML = ICONS.check;
        doneBtn.title = "Mark done";
        doneBtn.addEventListener("mousedown", function(e){ e.preventDefault(); });
        doneBtn.addEventListener("click", function(){
          var before = captureState([n.id]);
          n.done = !n.done;
          saveNotes();
          rerenderNote(n);
          recordChange(n.done ? "Mark done" : "Mark not done", before);
          if(n.done) toast("Everything’s checked off. Move this note to Done?", "Move to Done", function(){ markDone(findNote(n.id)); });
        });
        taskRow.appendChild(doneBtn);

        var dateBtn = document.createElement("button");
        dateBtn.className = "dateTrigger";
        dateBtn.textContent = formatDueLabel(n.due);
        dateBtn.addEventListener("mousedown", function(e){ e.preventDefault(); e.stopPropagation(); });
        dateBtn.addEventListener("click", function(e){
          e.stopPropagation();
          openDatePicker(dateBtn, n.due, function(iso){
            var before = captureState([n.id]);
            n.due = iso;
            saveNotes();
            rerenderNote(n);
            recordChange("Change due date", before);
          });
        });
        taskRow.appendChild(dateBtn);

        var timeInput = document.createElement("input");
        timeInput.type = "time";
        timeInput.id = n.id + "-time";
        timeInput.value = n.dueTime || "09:00";
        timeInput.addEventListener("mousedown", function(e){ e.stopPropagation(); });
        timeInput.addEventListener("click", function(e){ e.stopPropagation(); });
        timeInput.addEventListener("change", function(){
          var before = captureState([n.id]);
          n.dueTime = timeInput.value;
          saveNotes();
          rerenderNote(n);
          recordChange("Change due time", before);
        });
        taskRow.appendChild(timeInput);

        if(n.due){
          var calBtn = document.createElement("button");
          calBtn.className = "calBtn";
          calBtn.innerHTML = ICONS.cal;
          calBtn.title = "Add to your calendar";
          calBtn.addEventListener("mousedown", function(e){ e.preventDefault(); e.stopPropagation(); });
          calBtn.addEventListener("click", function(e){
            e.stopPropagation();
            openCalendarPopover(n, calBtn);
          });
          taskRow.appendChild(calBtn);
        }

        var taskDock = makeDiv("taskDock");
        taskDock.appendChild(taskRow);
        el.appendChild(taskDock);
      }

      var moreBtn = document.createElement("button");
      moreBtn.className = "moreBtn";
      moreBtn.innerHTML = ICONS.more;
      moreBtn.title = "Format & more";
      moreBtn.setAttribute("aria-label", "Format and more actions");
      moreBtn.addEventListener("mousedown", function(e){ e.preventDefault(); e.stopPropagation(); });
      moreBtn.addEventListener("click", function(e){
        e.stopPropagation();
        openNoteMenu(n, moreBtn);
      });
      el.appendChild(moreBtn);

      var fontBtn = document.createElement("button");
      fontBtn.className = "fontCycle";
      fontBtn.innerHTML = "Aa" + ICONS.cycle;
      fontBtn.title = "Try another handwriting (" + fontInfo(n.font).name + ")";
      fontBtn.setAttribute("aria-label", "Try another handwriting");
      fontBtn.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
      fontBtn.addEventListener("mousedown", function(e){ e.preventDefault(); });
      fontBtn.addEventListener("click", function(e){ e.stopPropagation(); cycleFont(n); fontBtn.title = "Try another handwriting (" + fontInfo(n.font).name + ")"; });
      el.appendChild(fontBtn);
    }

    boardInner.appendChild(el);
    if(n.cosmetic === "soup") soupDecorate(el, n, text);

    // links work everywhere; in an editable note they need Ctrl/Cmd so plain clicks can place the caret
    text.addEventListener("click", function(e){
      var a = e.target.closest && e.target.closest("a");
      if(a && text.contains(a) && (e.ctrlKey || e.metaKey || readOnly)){
        e.preventDefault(); openLink(a.getAttribute("href")); return;
      }
      if(e.ctrlKey || e.metaKey || e.shiftKey) return;
      var hit = dateAtPoint(n, e.clientX, e.clientY);
      if(hit){ e.stopPropagation(); openDatePopover(n, hit, e.clientX, e.clientY); }
    });

    if(!readOnly){
      // search: picking a match clears the search and keeps that note selected
      el.addEventListener("pointerdown", function(){
        if(searchInput.value.trim()) setTimeout(function(){ clearSearch(); setSelection([n.id]); }, 0);
      }, true);
      el.addEventListener("mousedown", function(e){
        if((e.ctrlKey || e.metaKey) && !(e.target.closest && e.target.closest(".text a"))) e.preventDefault();
      });
      el.addEventListener("pointerdown", function(e){
        if(e.pointerType === "mouse" && e.button !== 0) return;
        var onLink = e.target.closest && e.target.closest(".text a");
        if((e.ctrlKey || e.metaKey) && !onLink){
          e.preventDefault();
          endEditing();
          toggleSelected(n.id);
          return;
        }
        if(!selected.has(n.id) || selected.size > 1) setSelection([n.id]);
        bringToFront(n, el);
      });

      text.addEventListener("scroll", function(){ updateScrollCue(text); }, {passive:true});
      text.addEventListener("input", function(){
        stripInlineStyles(text);
        updateScrollCue(text);
        n.html = text.innerHTML;
        clearTimeout(text._t);
        text._t = setTimeout(saveNotesTyping, 250);
        clearTimeout(text._d);
        text._d = setTimeout(function(){
          refreshDates(n);
          if(searchInput.value.trim()) runSearch();
          maybeAutoFont(n);
          updateListHint(n);
          if(!focusState || focusState.n !== n) recoverVertical([n]);
        }, 450);
      });
      text.addEventListener("keydown", function(e){
        if((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key.toLowerCase() === "u" || e.code === "KeyU")){ e.preventDefault(); return; }   // underline is applied by the window handler; never the browser's view-source (also on a Hebrew keyboard, where the key is not "u")
        if(e.key === "Enter" && !e.shiftKey){
          if(handleListEnter(text, e)) return;
          if(focusState && focusState.n === n) return;
          e.preventDefault();
          text.blur();
        }
      });
      text.addEventListener("mousedown", function(e){
        var li = e.target.closest && e.target.closest("ul.checklist > li");
        if(li && text.contains(li) && li.getAttribute("data-title") !== "true" && checkboxHit(li, e.clientX)){
          e.preventDefault();
          li.setAttribute("data-checked", li.getAttribute("data-checked") === "true" ? "false" : "true");
          notifyInput(text);
          if(li.getAttribute("data-checked") === "true") offerDoneForChecklist(n);
        }
      });
      text.addEventListener("paste", function(e){
        var cd = e.clipboardData;
        if(!cd) return;
        var file = Array.prototype.filter.call(cd.files || [], function(f){ return f.type.indexOf("image/") === 0; })[0];
        if(file){ e.preventDefault(); handleImageDrop(file, n); return; }
        var plain = cd.getData("text/plain");
        var html = cd.getData("text/html");
        if(!plain && !html) return;
        e.preventDefault();
        var one = plain && plain.trim();
        var insert;
        if(one && !/\s/.test(one) && /^(https?:\/\/|www\.)/i.test(one) && normalizeUrl(one)){
          insert = '<a href="' + escapeAttr(normalizeUrl(one)) + '">' + escapeHtml(one) + '</a>&nbsp;';
        } else if(html){
          // keep simple formatting from other apps, drop their fonts, colours and sizes
          insert = cleanPastedHtml(html);
          if(!htmlToText(insert).trim() && plain) insert = linkifyText(plain.replace(/\s+$/, ""));
        } else {
          insert = linkifyText(plain.replace(/\s+$/, ""));
        }
        document.execCommand("insertHTML", false, insert);
      });
      text.addEventListener("focus", function(){
        var holder = window.Stick && Stick.collab && Stick.collab.blockedBy(n.id);
        if(holder){ setTimeout(function(){ text.blur(); }, 0); toast(holder + " is editing this note."); return; }          // one person at a time per note
        if(window.Stick && Stick.collab) Stick.collab.setEditing(n.id);
        clearTimeout(n._cleanT);
        el.classList.add("editing"); if(n.cosmetic === "soup") soupBalance();
        setTimeout(function(){ adjustForKeyboard(text); }, 250);
      });
      text.addEventListener("blur", function(){
        if(window.Stick && Stick.collab) Stick.collab.setEditing(null);
        el.classList.remove("editing"); if(n.cosmetic === "soup"){ soupSettleNext[n.id] = true; applySoup(n); }
        resetKeyboardShift();
        setTimeout(function(){ maybeSuggestTrim(n); }, 350);
        // tidy leftovers from editing (empty spans and the like) once the caret has left
        var clean = sanitizeHtml(text.innerHTML);
        if(clean !== text.innerHTML){
          text.innerHTML = clean;
          n.html = clean;
          saveNotes();
          refreshDates(n);
        }
        updateListHint(n);
        scheduleCleanup(n);
      });

      del.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
      del.addEventListener("click", function(e){
        e.stopPropagation();
        deleteNotes([n.id]);
      });
      if(qd){
        qd.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
        qd.addEventListener("mousedown", function(e){ e.preventDefault(); });
        qd.addEventListener("click", function(e){ e.stopPropagation(); markDone(n); });
      }

      el.addEventListener("dblclick", function(e){
        if(focusState || !e.target.closest) return;
        if(e.target.closest(".del, .moreBtn, .fontCycle, .imgHandle, .rmImg, .listHint, .taskDock, .focusClose")) return;
        e.preventDefault();
        e.stopPropagation();
        enterFocus(n);
      });
      // Ctrl/Cmd+click anywhere on a note (not only its tab) adds it to, or removes it from, the selection. A link still opens with Ctrl+click.
      el.addEventListener("pointerdown", function(e){
        if(!(e.ctrlKey || e.metaKey) || focusState || (e.pointerType === "mouse" && e.button !== 0)) return;
        if(e.target.closest && e.target.closest("a[href], .del, .moreBtn, .fontCycle, .quickDone, .noteHandle, .noteEdge, .pCtl, .taskDock, .focusClose")) return;
        e.preventDefault(); e.stopPropagation(); endEditing(); toggleSelected(n.id);
      }, true);
      tab.addEventListener("pointerdown", function(e){
        e.stopPropagation();
        e.preventDefault();
        if(focusState) return;
        endEditing();
        if(e.ctrlKey || e.metaKey){ toggleSelected(n.id); return; }
        if(searchInput.value.trim()) setTimeout(clearSearch, 0);
        var group = selected.has(n.id) && selected.size > 1;
        if(!group) setSelection([n.id]);
        bringToFront(n, el);
        startDrag(e, n, group ? selectedNotes() : [n]);
      });

      el.addEventListener("dragover", function(e){ e.preventDefault(); e.stopPropagation(); el.classList.add("dragOver"); }, true);
      el.addEventListener("dragleave", function(){ el.classList.remove("dragOver"); }, true);
      el.addEventListener("drop", function(e){
        e.preventDefault(); e.stopPropagation();
        el.classList.remove("dragOver");
        var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if(file && file.type.indexOf("image/") === 0) handleImageDrop(file, n);
      }, true);

      if(isNew){
        if(opts.focus !== false) focusNoScroll(text);
        el.addEventListener("animationend", function(){
          el.classList.remove("new");
        }, {once:true});
      }
    }

    refreshDates(n);
    if(!readOnly) updateListHint(n);
    setTimeout(function(){ updateScrollCue(text); }, 0);
    return el;
  }

  function rerenderNote(n){
    var old = n.el;
    if(old) old.remove();
    renderNote(n, false);
    if(searchInput.value.trim()) runSearch();
    updateMinimap();
  }

  function removeNoteEl(n, animate){
    if(isAV(n)){ stopMediaFor(n); if(n.mediaId) MediaStore.release(n.mediaId); }
    var elRef = n.el;
    if(!elRef) return;
    if(embedObserver){ try{ embedObserver.unobserve(elRef); }catch(e){} }          // a removed video player is gone for good (no leak)
    if(!animate){ elRef.remove(); return; }
    elRef.classList.add("removing");
    elRef.addEventListener("animationend", function(){ elRef.remove(); }, {once:true});
    setTimeout(function(){ elRef.remove(); }, 450);
  }

  function bringToFront(n, el){
    zCounter += 1;
    n.z = zCounter;
    el.style.zIndex = n.z;
    saveNotes();
  }

  var draggingIds = null;
  function startDrag(e, primary, group){
    var everyone = group;
    group = group.filter(function(g){ return !isPinned(g); });               // pinned items stay put, even in a group
    if(!group.length){ everyone.forEach(pinTug); return; }
    var startX = e.clientX, startY = e.clientY;
    var orig = group.map(function(g){ return {n:g, x:g.x, y:g.y}; });
    var before = captureState(group.map(function(g){ return g.id; }));
    var minX0 = Math.min.apply(null, orig.map(function(o){ return o.x; }));
    var minY0 = Math.min.apply(null, orig.map(function(o){ return o.y; }));
    // how far the group may move down before its lowest-reaching member hits the bottom
    var dyMax = Math.min.apply(null, orig.map(function(o){ return itemMaxY(o.n) - o.y; }));
    var moved = false;
    draggingIds = new Set(group.map(function(g){ return g.id; }));
    group.forEach(function(g){ if(g.el) g.el.classList.add("dragging"); });

    function move(ev){
      var dx = (ev.clientX - startX) / boardZoom;
      var dy = (ev.clientY - startY) / boardZoom;
      if(!moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      moved = true;
      // clamp the group as one piece so relative spacing survives the board edges
      dx = Math.max(-minX0, dx);
      dy = Math.max(-minY0, Math.min(Math.max(-minY0, dyMax), dy));
      orig.forEach(function(o){
        o.n.x = o.x + dx; o.n.y = o.y + dy;
        if(o.n.el){ o.n.el.style.left = o.n.x + "px"; o.n.el.style.top = o.n.y + "px"; }
      });
      updateMinimap();
    }
    function up(){
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      group.forEach(function(g){ if(g.el) g.el.classList.remove("dragging"); });
      draggingIds = null;
      if(moved){
        ensureWidth();
        saveNotes();
        updateMinimap();
        recordChange(group.length > 1 ? "Move " + group.length + " notes" : "Move note", before);
      } else if(group.length > 1){
        setSelection([primary.id]);
      }
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  function clampY(y, n){ return Math.min(n && n.el ? itemMaxY(n) : Math.max(0, boardHeight() - NOTE_H - 10), Math.max(0, y)); }

  function addNoteAt(x, y, opts){
    opts = opts || {};
    zCounter += 1;
    var n = {
      id: newId(),
      x: Math.max(0, x - (opts.cosmetic === "soup" ? 160 : NOTE_W/2)),
      y: clampY(y - 30),
      w: opts.cosmetic === "soup" ? 320 : NOTE_W,                 // a bowl needs room for its letters
      html: opts.html || "",
      bg: newNoteBg(),
      font: pickFont(),
      rot: rand(-6,6) * tiltFactor(),
      z: zCounter,
      categoryIndex: 0,
      isTask:false, done:false, due:"", dueTime:"09:00", image:null,
      phys: makeNotePhys()
    };
    if(opts.cosmetic) n.cosmetic = opts.cosmetic;
    notes.push(n);
    ensureWidth();
    renderNote(n, true, {focus:opts.focus});
    setSelection([n.id]);
    if(opts.html) recoverVertical([n]);
    saveNotes();
    updateCount();
    updateMinimap();
    dismissHint();
    recordChange(opts.label || (opts.html ? "Paste as note" : "Create note"), {}, {newIds:[n.id]});
    return n;
  }

  // opts.silent: tidy-up removal, no toast and no undo step
  function deleteNotes(ids, opts){
    opts = opts || {};
    var list = ids.map(findNote).filter(Boolean);
    if(!opts.force && list.some(isPileObj)){          // deleting a pile means opening it: its papers are never deleted by accident
      list.filter(isPileObj).forEach(unpilePile);
      list = list.filter(function(n){ return !isPileObj(n); });
    }
    if(!list.length) return;
    var hadContent = list.some(noteHasContent);
    var before = opts.silent ? null : captureState(list.map(function(n){ return n.id; }));
    list.forEach(function(n){
      selected.delete(n.id);
      clearTimeout(n._cleanT);
      removeNoteEl(n, true);
      var i = notes.indexOf(n);
      if(i !== -1) notes.splice(i, 1);
      clearDecorations(n.id);
    });
    applySelection();
    saveNotes();
    updateCount();
    updateMinimap();
    if(opts.silent){
      // forget the "create" step of a note that was never used
      var gone = new Set(list.map(function(n){ return n.id; }));
      undoStack = undoStack.filter(function(a){
        return !(a.changes && a.changes.length === 1 && a.changes[0].kind === "exist" && !a.changes[0].before && gone.has(a.changes[0].id));
      });
      return;
    }
    var action = recordChange(list.length > 1 ? "Delete " + list.length + " " + itemWord(list) : "Delete " + itemWord(list), before);
    var word = itemWord(list);
    var label = list.length > 1 ? list.length + " " + word + " deleted." : word.charAt(0).toUpperCase() + word.slice(1) + " deleted.";
    if(hadContent) toast(label, "Undo", function(){ undoIfTop(action); });
    else toast(label);
  }
  // keyboard / group deletes ask first when anything would be lost
  function requestDelete(ids){
    var list = ids.map(findNote).filter(Boolean);
    if(!list.length) return;
    if(list.some(isPileObj)){ deleteNotes(ids); return; }
    if(!list.some(noteHasContent)){ deleteNotes(ids); return; }
    confirmDialog({
      title: list.length > 1 ? "Delete " + list.length + " " + itemWord(list) + "?" : "Delete this " + itemWord(list) + "?",
      body: "You can bring " + (list.length > 1 ? "them" : "it") + " back with " + MOD + "+Z.",
      confirm: "Delete", danger: true
    }).then(function(ok){ if(ok) deleteNotes(ids); });
  }

  // Blank notes you walk away from quietly disappear (unless turned off in Settings).
  function scheduleCleanup(n){
    if(readOnly || !settings.cleanupEmpty) return;
    clearTimeout(n._cleanT);
    n._cleanT = setTimeout(function(){
      if(notes.indexOf(n) === -1 || noteHasContent(n)) return;
      if(selected.has(n.id)) return;
      if(n.el && n.el.contains(document.activeElement)) return;
      if(pendingImageNote === n) return;
      if(openPopoverTrigger && n.el && n.el.contains(openPopoverTrigger)) return;
      if(draggingIds && draggingIds.has(n.id)) return;
      deleteNotes([n.id], {silent:true});
    }, 1400);
  }

  function handleImageDrop(file, n){
    var reader = new FileReader();
    reader.onload = function(){
      var img = new Image();
      img.onload = function(){
        var maxDim = 480;
        var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        var w = Math.max(1, Math.round(img.width * scale));
        var h = Math.max(1, Math.round(img.height * scale));
        var canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        var before = captureState([n.id]);
        n.image = canvas.toDataURL("image/jpeg", 0.82);
        n.imgRatio = +(h / w).toFixed(4);
        n.imgW = null;
        saveNotes();
        rerenderNote(n);
        recordChange(before[n.id] && before[n.id].image ? "Replace image" : "Add image", before);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  imageUploadInput.addEventListener("change", function(){
    var file = imageUploadInput.files && imageUploadInput.files[0];
    if(file && pendingImageNote) handleImageDrop(file, pendingImageNote);
    pendingImageNote = null;
  });

  // ---------- fonts on a note ----------
  function cycleFont(n){
    if(isPhoto(n)) return;
    var script = detectScript(n.textEl ? n.textEl.textContent : "");
    var pool = fontPool(script);
    if(!pool.length) return;
    var idx = -1;
    pool.forEach(function(f, i){ if(f.name === n.font) idx = i; });
    var next = pool[(idx + 1) % pool.length];
    var before = captureState([n.id]);
    n.font = next.name;
    n.fontManual = true;
    if(n.textEl) n.textEl.style.fontFamily = fontStack(n.font);
    saveNotes();
    recordChange("Change font", before);
  }
  // Typing Hebrew/Chinese/Japanese/Korean into a Latin-only font swaps in one that
  // really has those letters, keeping the note's feel (mood). Undo puts it back and
  // stops it happening again for that note.
  function maybeAutoFont(n){
    if(isPhoto(n) || n.fontManual || settings.lockFont || !n.textEl) return;
    var script = detectScript(n.textEl.textContent);
    if(script === "latin" || fontCovers(n.font, script)) return;
    var before = captureState([n.id]);
    before[n.id].fontManual = true;
    n.font = pickFont(script, fontInfo(n.font).mood);
    n.textEl.style.fontFamily = fontStack(n.font);
    saveNotes();
    var action = recordChange("Switch font", before);
    toast("Switched to a " + SCRIPT_NAMES[script] + " handwriting.", "Undo", function(){ undoIfTop(action); });
  }

  // ---------- duplicate, copy & paste, move between boards ----------
  function viewCenter(){
    var br = board.getBoundingClientRect(), ir = boardInner.getBoundingClientRect();
    return {x:(br.left + board.clientWidth/2 - ir.left) / boardZoom, y:boardHeight()/2};
  }
  function groupBox(list){
    var box = {x1:Infinity, y1:Infinity, x2:-Infinity, y2:-Infinity};
    list.forEach(function(n){
      var h = (n.el && n.el.offsetHeight) || NOTE_H;
      box.x1 = Math.min(box.x1, n.x); box.y1 = Math.min(box.y1, n.y);
      box.x2 = Math.max(box.x2, n.x + (n.w || NOTE_W)); box.y2 = Math.max(box.y2, n.y + h);
    });
    return box;
  }
  // shift a group so it's centred on (cx, cy), staying inside the board vertically
  function centerGroup(list, cx, cy){
    var b = groupBox(list);
    var dx = cx - (b.x1 + b.x2)/2, dy = cy - (b.y1 + b.y2)/2;
    var maxY = Math.max(0, boardHeight() - Math.max.apply(null, list.map(itemHeight)) - 8);
    var topMost = Math.min.apply(null, list.map(function(n){ return n.y; }));
    var lowMost = Math.max.apply(null, list.map(function(n){ return n.y; }));
    dx = Math.max(20 - b.x1, dx);
    dy = Math.max(10 - topMost, Math.min(maxY - lowMost, dy));
    list.forEach(function(n){ n.x += dx; n.y += dy; });
  }
  // a fresh piece of paper with the same content: new id, new rotation and tape
  function paperCopy(src){
    var c = normalizeIncoming(src, {allowAssets:true});
    if(!c) return null;
    c.phys = isPhoto(c) ? makePhotoPhys() : (isAV(c) || isPaper(c)) ? {} : makePhys();
    var srcRot = Number(src.rot);
    c.rot = isFinite(srcRot) ? clampRot(srcRot) : (isPhoto(c) ? rand(-5, 5) : isPaper(c) ? rand(-3, 3) : rand(-6, 6));          // a copy keeps the angle its original was turned to
    c.fontManual = !!src.fontManual;
    if(c.cutoutKey && src.cutoutKey){ c.cutoutKey = "co-" + newId(); copyCutoutBlob(src.cutoutKey, c.cutoutKey); }     // a copy never shares the device blob
    return c;
  }
  function insertNotes(list, label){
    if(cloudSync) setTimeout(function(){ cloudSync.hydrateAll(); watchPhotoLoading(); }, 0);
    list.forEach(function(n){
      zCounter += 1; n.z = isZone(n) ? 0 : zCounter;
      n.y = clampY(n.y);
      notes.push(n);
      renderNote(n, true, {focus:false});
    });
    ensureWidth(); saveNotes(); updateCount(); updateMinimap();
    setSelection(list.map(function(n){ return n.id; }));
    return recordChange(label, {}, {newIds:list.map(function(n){ return n.id; })});
  }
  // Actions that multiply objects (duplicate, paste) share one guard (js/boardguard.js): a short burst runs at once, a sustained burst is slowed
  // down (never dropped; each action stays whole), and an action that would take the board past ~1000 objects asks first.
  var multiplyLimiter = (window.Stick && Stick.guard) ? Stick.guard.createLimiter({burst: 15, windowMs: 5000, spacingMs: 600}) : null;
  var multiplyToastAt = 0;
  function guardedMultiply(count, run){
    var G = window.Stick && Stick.guard;
    function go(){
      if(!multiplyLimiter){ run(); return; }
      var plan = multiplyLimiter.reserve(Date.now());
      if(!plan.queued){ run(); return; }
      if(Date.now() - multiplyToastAt > 8000){ multiplyToastAt = Date.now(); toast("Lots of duplicates \u2014 slowing this down to protect performance."); }
      setTimeout(run, plan.delay);
    }
    if(G && G.needsConfirm(logicalCount(), count)){
      confirmDialog({title: "Add " + count + " objects?", body: G.confirmText(logicalCount(), count), confirm: "Add them"}).then(function(ok){ if(ok) go(); });
    } else go();
  }
  function duplicateNotes(ids){
    var src = ids.map(findNote).filter(function(n){ return n && !isPileObj(n); });
    if(ids.some(function(id){ return isPileObj(findNote(id)); })) toast("A pile can't be duplicated yet. Open it first.");
    if(!src.length || readOnly) return;
    guardedMultiply(src.length, function(){ duplicateNow(ids); });
  }
  function duplicateNow(ids){
    var src = ids.map(findNote).filter(function(n){ return n && !isPileObj(n); });          // phase 1: a pile is not duplicated (open it first)                 // resolved when it actually runs: a note deleted in the meantime is simply skipped
    if(!src.length) return;
    var copies = src.map(function(s){ var c = paperCopy(serializeNote(s)); if(c){ c.x = s.x + 26; c.y = s.y + 26; } return c; }).filter(Boolean);
    if(copies.length) insertNotes(copies, copies.length > 1 ? "Duplicate " + copies.length + " notes" : "Duplicate note");
  }

  var CLIP_KEY = "stickyboard.clipboard.v1";
  var CLIP_MIME = "application/x-stickit+json";
  // The keyboard shortcut stores the notes (works everywhere); the copy event, when the
  // browser fires one, also puts them on the system clipboard as text + a private type.
  var lastNoteCopy = 0;
  function copyNotesToClipboard(e, quiet){
    var list = selectedNotes();
    if(!list.length) return false;
    var data = {v:1, board:activeBoardId, ts:Date.now(), notes:list.map(serializeNote)};
    var plain = list.map(itemText).filter(Boolean).join("\n\n");
    data.text = plain;
    if(!e) { safeSet(CLIP_KEY, data); lastNoteCopy = Date.now(); }
    if(e && e.clipboardData){
      e.clipboardData.setData("text/plain", plain || " ");
      try{ e.clipboardData.setData(CLIP_MIME, JSON.stringify(data)); }catch(err){}
      e.preventDefault();
      if(Date.now() - lastNoteCopy > 800) safeSet(CLIP_KEY, data);
    }
    if(!quiet) toast(list.length > 1 ? "Copied " + list.length + " notes." : "Note copied.");
    return true;
  }
  var pasteSeq = 0, lastPasteTs = 0;
  function pasteNotes(data){
    if(!data || !Array.isArray(data.notes) || !data.notes.length) return;
    guardedMultiply(data.notes.length, function(){ pasteNow(data); });
  }
  function pasteNow(data){
    if(data.ts !== lastPasteTs){ lastPasteTs = data.ts; pasteSeq = 0; }
    pasteSeq += 1;
    var sameBoard = data.board === activeBoardId && data.notes.some(function(s){ return findNote(s.id); });
    var copies = data.notes.map(function(s){ return paperCopy(s); }).filter(Boolean);
    if(!copies.length) return;
    if(sameBoard){
      copies.forEach(function(c){ c.x += 26 * pasteSeq; c.y += 26 * pasteSeq; });
    } else {
      var vc = viewCenter();
      centerGroup(copies, vc.x + 26 * (pasteSeq - 1), vc.y + 26 * (pasteSeq - 1));
    }
    insertNotes(copies, copies.length > 1 ? "Paste " + copies.length + " notes" : "Paste note");
  }
  // ---------- video links: keep as a link, or show as an embedded video (v0.8.2.1) ----------
  // Only allowlisted providers (js/embed.js) can become a video. The player address is BUILT from a validated id; the pasted address is never an
  // iframe source. Nothing contacts the provider until Play is pressed, and the player is unmounted again when it scrolls away or the object goes.
  function embedInfo(n){ return window.Stick && Stick.embed ? Stick.embed.parse(n.url) : null; }
  var embedObserver = null;
  function embedWatch(n){
    if(!window.IntersectionObserver || !n.el) return;
    if(!embedObserver) embedObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if(!en.isIntersecting){ var id = en.target.dataset && en.target.dataset.id, m = id && findNote(id); if(m && m.type === "embed") embedStop(m); } });
    }, {root: null, threshold: 0});
    embedObserver.observe(n.el);
  }
  function embedStop(n){
    if(!n.el) return;
    var frame = n.el.querySelector(".embFrame"); if(!frame || !frame.querySelector("iframe")) return;
    frame.textContent = ""; frame.appendChild(embedPoster(n)); frame.classList.remove("playing");
  }
  function embedPlay(n){
    var info = embedInfo(n); if(!info || !n.el) return;
    var frame = n.el.querySelector(".embFrame"); if(!frame) return;
    var f = document.createElement("iframe");
    f.src = info.embedUrl + "&autoplay=1";
    f.title = (Stick.embed.PROVIDERS[info.provider].label) + " video";
    f.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture; fullscreen"); f.setAttribute("allowfullscreen", "");
    f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin"); f.setAttribute("loading", "lazy");
    f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox");
    frame.textContent = ""; frame.appendChild(f); frame.classList.add("playing"); embedWatch(n);
  }
  function embedPoster(n){
    var info = embedInfo(n), label = info ? Stick.embed.PROVIDERS[info.provider].label : "Video";
    var b = document.createElement("button"); b.type = "button"; b.className = "embPlay"; b.setAttribute("aria-label", "Play the " + label + " video here");
    b.innerHTML = '<svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.55)"/><path d="M9.5 7.5l7 4.5-7 4.5z" fill="#fff"/></svg><span class="embWho"></span>';
    b.querySelector(".embWho").textContent = label;
    b.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
    b.addEventListener("click", function(e){ e.stopPropagation(); embedPlay(n); });
    return b;
  }
  function renderEmbed(n, isNew){
    var info = embedInfo(n);
    if(!info){ n.el = null; return null; }                                  // an address that no longer checks out is not drawn (and never deleted)
    var P = Stick.embed.PROVIDERS[info.provider];
    var el = makeDiv("boardObj paperObj embedObj");
    el.style.setProperty("--pw", (n.w || 340) + "px"); el.style.setProperty("--rot", (n.rot || 0) + "deg");
    el.setAttribute("role", "group"); el.setAttribute("aria-label", P.label + " video. " + n.url); el.tabIndex = 0;
    var head = makeDiv("embHead"); head.textContent = P.label + " video"; el.appendChild(head);
    var frame = makeDiv("embFrame"); frame.appendChild(embedPoster(n)); el.appendChild(frame);
    var foot = makeDiv("embFoot"), a = document.createElement("a"); a.className = "embSrc";
    var href = safeHref(n.url); if(href){ a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; }
    a.textContent = n.url.replace(/^https?:\/\//, "").slice(0, 64); a.title = "Open the original link";
    a.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
    foot.appendChild(a); el.appendChild(foot);
    if(isNew) el.classList.add("new");
    el.dataset.id = n.id; el.style.left = n.x + "px"; el.style.top = n.y + "px"; el.style.zIndex = n.z;
    if(selected.has(n.id)) el.classList.add("selected");
    n.el = el; n.textEl = null; n.captionEl = null;
    boardInner.appendChild(el);
    if(!readOnly){
      var more = document.createElement("button"); more.type = "button"; more.className = "pCtl pMore"; more.innerHTML = ICONS.more; more.title = "Options for this video"; more.setAttribute("aria-label", "Options for this video");
      more.addEventListener("pointerdown", function(e){ e.stopPropagation(); }); more.addEventListener("mousedown", function(e){ e.preventDefault(); });
      more.addEventListener("click", function(e){ e.stopPropagation(); embedMenu(n, more); });
      el.appendChild(more);
      var h = document.createElement("button"); h.type = "button"; h.className = "pCtl pHandle"; h.title = "Drag to resize"; h.setAttribute("aria-label", "Drag to resize");
      h.addEventListener("pointerdown", function(e){ embedResize(e, n); }); h.addEventListener("mousedown", function(e){ e.preventDefault(); });
      el.appendChild(h);
      el.addEventListener("pointerdown", function(e){
        if(e.pointerType === "mouse" && e.button !== 0) return;
        if(e.target.closest && (e.target.closest("button") || e.target.closest("iframe") || e.target.closest("a"))) return;
        e.preventDefault(); endEditing(); closeCaptureMenu();
        if(searchInput.value.trim()) setTimeout(clearSearch, 0);
        if(e.ctrlKey || e.metaKey){ toggleSelected(n.id); return; }
        var group = selected.has(n.id) && selected.size > 1;
        if(!group) setSelection([n.id]);
        bringToFront(n, el);
        startDrag(e, n, group ? selectedNotes() : [n]);
      });
      el.addEventListener("keydown", function(e){
        if(e.target !== el) return;
        if(e.key === " "){ e.preventDefault(); setSelection([n.id]); }
        else if(e.key === "Enter"){ e.preventDefault(); embedPlay(n); }
        else if(e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")){ e.preventDefault(); var r = el.getBoundingClientRect(); openObjectContextMenu(n, r.left + 24, r.top + 24); }
        else if(e.key === "Delete" || e.key === "Backspace"){ e.preventDefault(); requestDelete([n.id]); }
      });
      el.addEventListener("focus", function(){ if(!selected.has(n.id)) setSelection([n.id]); });
      if(isNew) el.addEventListener("animationend", function(){ el.classList.remove("new"); }, {once: true});
    }
    return el;
  }
  function embedResize(e, n){
    e.preventDefault(); e.stopPropagation();
    var el = n.el, before = captureState([n.id]), startX = e.clientX, startW = n.w || 340, w = startW;
    document.body.style.cursor = "nwse-resize";
    function move(ev){ w = Math.round(Math.min(640, Math.max(220, startW + (ev.clientX - startX) / boardZoom))); el.style.setProperty("--pw", w + "px"); }
    function up(){
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      document.body.style.cursor = "";
      if(w === startW) return;
      n.w = w; ensureWidth(); saveNotes(); updateMinimap(); recordChange("Resize video", before);
    }
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
  }
  function embedMenu(n, anchor){
    var pop = openFloatingPopover(anchor, "noteMenu"); if(!pop) return;
    var info = embedInfo(n), h = makeDiv("menuHint"); h.textContent = info ? Stick.embed.PROVIDERS[info.provider].label + " video" : "Video"; pop.appendChild(h);
    pop.appendChild(menuItem(ICONS.link, "Open the original link", function(){ closeFloatingPopovers(); var u = safeHref(n.url); if(u) window.open(u, "_blank", "noopener,noreferrer"); }));
    pop.appendChild(menuItem(ICONS.copy, "Copy link", function(){ closeFloatingPopovers(); copyText(n.url).then(function(ok){ toast(ok ? "Link copied." : "Couldn\u2019t copy automatically."); }); }));
    pop.appendChild(menuItem(ICONS.link, "Convert back to a link", function(){ closeFloatingPopovers(); embedToLink(n); }, {title: "Turns this back into a note with the link. The original address is kept."}));
    pop.appendChild(pinMenuItem(n));
    pop.appendChild(makeDiv("menuSep"));
    pop.appendChild(menuItem(ICONS.trash, "Delete", function(){ closeFloatingPopovers(); deleteNotes([n.id]); }, {cls: "danger"}));
  }
  OBJECT_MENUS.embed = embedMenu;
  function linkNoteHtml(url){ return '<a href="' + escapeAttr(url) + '">' + escapeHtml(url) + "</a>"; }
  // swap one object for another at the same place, as ONE undo step (the old one is removed, the new one is created)
  function swapObject(old, fresh, label){
    var before = captureState([old.id]);
    fresh.x = old.x; fresh.y = old.y; zCounter += 1; fresh.z = zCounter;
    var i = notes.indexOf(old); if(i !== -1) notes.splice(i, 1);
    selected.delete(old.id); removeNoteEl(old, false); clearDecorations(old.id);
    notes.push(fresh); renderNote(fresh, true, {focus: false});
    ensureWidth(); saveNotes(); updateCount(); updateMinimap(); setSelection([fresh.id]);
    return recordChange(label, before, {newIds: [fresh.id]});
  }
  function embedToLink(n){
    var nn = {id: newId(), x: n.x, y: n.y, html: linkNoteHtml(n.url), bg: randomColor(), font: pickFont(), rot: rand(-4, 4), z: 0, categoryIndex: 0, phys: makePhys()};
    var action = swapObject(n, nn, "Show video as a link");
    toast("Back to a normal link.", "Undo", function(){ undoIfTop(action); });
  }
  function linkToEmbed(n, info){
    var emb = {id: newId(), type: "embed", x: n.x, y: n.y, w: 340, rot: rand(-2, 2), z: 0, url: info.source, provider: info.provider, vid: info.id, phys: {}};
    if(info.start) emb.start = info.start;
    var action = swapObject(n, emb, "Show link as video");
    toast("Showing it as a video. Nothing loads until you press Play.", "Undo", function(){ undoIfTop(action); });
  }
  function createEmbedAt(info, x, y){
    zCounter += 1;
    var emb = {id: newId(), type: "embed", x: Math.max(0, x), y: clampY(y), w: 340, rot: rand(-2, 2), z: zCounter, url: info.source, provider: info.provider, vid: info.id, phys: {}};
    if(info.start) emb.start = info.start;
    notes.push(emb); renderNote(emb, true, {focus: false});
    ensureWidth(); saveNotes(); updateCount(); updateMinimap(); setSelection([emb.id]);
    recordChange("Add video", {}, {newIds: [emb.id]});
  }
  // the choice: never converted automatically. Closing the dialog any other way keeps it as a link.
  function askVideoChoice(info){
    return new Promise(function(resolve){
      var P = Stick.embed.PROVIDERS[info.provider];
      var body = document.createElement("p"); body.className = "acctSub"; body.style.margin = "0";
      body.textContent = "This is a " + P.label + " video link. You can keep it as a normal link, or show it as a video you can play here. Nothing is loaded from " + P.label + " until you press Play.";
      openModal({title: "Show this " + P.label + " link as a video?", content: body, width: 380,
        actions: [{label: "Keep as link", value: "link"}, {label: "Show as embedded video", kind: "primary", value: "embed"}],
        onClose: function(v){ resolve(v === "embed" ? "embed" : "link"); }});
    });
  }

  // Pasting on the board (not while typing) captures whatever is on the clipboard.
  // The note is only created once we know what goes in it.
  function pasteAsNewNote(text, html){
    var one = (text || "").trim(), content;
    var vInfo = one && !/\s/.test(one) && window.Stick && Stick.embed ? Stick.embed.parse(normalizeUrl(one) || "") : null;
    if(vInfo){                                                      // a video link: ask, never convert on its own
      var vc0 = viewCenter();
      askVideoChoice(vInfo).then(function(choice){
        if(choice === "embed") createEmbedAt(vInfo, vc0.x - 170, vc0.y - 100);
        else addNoteAt(vc0.x, vc0.y - 60, {html: '<a href="' + escapeAttr(normalizeUrl(one)) + '">' + escapeHtml(one) + "</a>", focus: false});
      });
      return true;
    }
    if(one && !/\s/.test(one) && /^(https?:\/\/|www\.)/i.test(one) && normalizeUrl(one)){
      content = '<a href="' + escapeAttr(normalizeUrl(one)) + '">' + escapeHtml(one) + "</a>";
    } else if(html){
      content = cleanPastedHtml(html);
      if(!htmlToText(content).trim()) content = linkifyText((text || "").replace(/\s+$/, ""));
    } else {
      content = linkifyText((text || "").replace(/\s+$/, ""));
    }
    if(!htmlToText(content).trim()) return false;
    var vc = viewCenter();
    addNoteAt(vc.x, vc.y - 60, {html:content, focus:false});
    return true;
  }

  function canEditBoard(b){ return !!b && !b.readOnly && (!b.access || b.access === "owner" || b.access === "editor" || b.access === "edit"); }
  function moveTargets(){
    return boards.filter(function(b){ return b.id !== activeBoardId && canEditBoard(b); });
  }
  function boardViewKey(id){ return "stickyboard." + NS + "view." + id; }
  // Moves notes into another board's storage, arranged around where that board was last viewed.
  function moveNotesToBoard(ids, destId){
    var dest = boards.filter(function(b){ return b.id === destId; })[0];
    var list = ids.map(findNote).filter(Boolean);
    if(list.some(isPileObj)){ toast("Open the pile first, then move its papers to another board."); return; }
    if(!dest || !list.length) return;
    var origSnaps = list.map(snapNote);
    var destNotes = safeGet(notesKeyFor(destId)) || [];
    var view = safeGet(boardViewKey(destId)) || {cx: window.innerWidth/2, cy: boardHeight()/2};
    var moved = list.map(snapNote);
    moved.forEach(function(m, i){ m.el = list[i].el; });
    centerGroup(moved, view.cx, boardHeight()/2);
    var destZ = destNotes.reduce(function(mx, x){ return Math.max(mx, x.z || 0); }, 10);
    var srcIds = list.map(function(n){ return n.id; });
    // in an account the destination gets NEW ids: the originals are deleted on this board, and a database
    // row can't be in two places at once (Undo restores the originals on this board)
    moved = moved.map(function(m){ var o = persistForm(m); if(CLOUD) o.id = newId(); destZ += 1; o.z = destZ; return o; });
    function doMove(){
      var dn = safeGet(notesKeyFor(destId)) || [];
      var ok = safeSet(notesKeyFor(destId), dn.concat(moved.map(function(m){ return Object.assign({}, m); })));
      if(!ok){ toast("Couldn't move: browser storage is full."); return false; }
      try{ localStorage.removeItem(thumbKey(destId)); }catch(err){}
      srcIds.forEach(function(sid){
        var n = findNote(sid);
        if(!n) return;
        selected.delete(n.id);
        removeNoteEl(n, true);
        notes.splice(notes.indexOf(n), 1);
        clearDecorations(n.id);
      });
      return true;
    }
    function undoMove(){
      var ids2 = new Set(moved.map(function(m){ return m.id; }));
      var dn = safeGet(notesKeyFor(destId)) || [];
      safeSet(notesKeyFor(destId), dn.filter(function(x){ return !ids2.has(x.id); }));
      try{ localStorage.removeItem(thumbKey(destId)); }catch(err){}
      origSnaps.forEach(function(s){
        if(findNote(s.id)) return;
        var copy = Object.assign({}, s);
        notes.push(copy);
        renderNote(copy, true, {focus:false});
      });
      return true;
    }
    if(!doMove()) return;
    afterHistoryApply();
    var label = list.length > 1 ? "Move " + list.length + " notes to " + dest.name : "Move note to " + dest.name;
    var action = pushHistory({label:label, custom:true, undo:undoMove, redo:doMove, t:Date.now()});
    toast("Moved to " + dest.name + " \u2713", "Undo", function(){ undoIfTop(action); });
  }

  // ---------- menus ----------
  // ---------- grouped menus (v0.8.2.2): one level of submenu, keyboard friendly ----------
  // Top level = actions on the object itself. A submenu = actions on one physical property (Paper, Arrange). Never nested deeper.
  function menuSub(pop, icon, label, build){
    var wrap = makeDiv("menuSub");
    var head = menuItem(icon, label, function(){ toggle(); }, {kbd: "›"});
    head.setAttribute("aria-haspopup", "true"); head.setAttribute("aria-expanded", "false");
    var body = makeDiv("menuSubBody"); body.hidden = true; body.setAttribute("role", "group"); body.setAttribute("aria-label", label);
    build(body);
    function toggle(force){
      var open = force != null ? force : body.hidden;
      body.hidden = !open; head.setAttribute("aria-expanded", open ? "true" : "false");
      if(open){ var f = body.querySelector("button.menuItem"); if(f && force === true) f.focus(); }
    }
    head.addEventListener("keydown", function(e){
      if(e.key === "ArrowRight"){ e.preventDefault(); e.stopPropagation(); toggle(true); }
      else if(e.key === "ArrowLeft" && !body.hidden){ e.preventDefault(); e.stopPropagation(); toggle(false); }
    });
    body.addEventListener("keydown", function(e){
      if(e.key === "ArrowLeft" || e.key === "Backspace"){ e.preventDefault(); e.stopPropagation(); toggle(false); head.focus(); }
    });
    wrap.appendChild(head); wrap.appendChild(body); pop.appendChild(wrap);
    return wrap;
  }
  // Paper > Fit paper to content, Rip off empty paper, Restore full paper (only what applies to this note)
  function paperSubmenu(pop, n){
    if(n.cosmetic === "soup") return;
    menuSub(pop, ICONS.fit, "Paper", function(body){
      body.appendChild(menuItem(ICONS.fit, "Fit paper to content", function(){ trimPaper(n, "fit"); }, {title: "Shrink the note around its words"}));
      body.appendChild(menuItem(ICONS.rip, "Rip off empty paper", function(){ trimPaper(n, "rip"); }, {title: "Tear away the unused paper"}));
      var restore = menuItem(ICONS.sticky, "Restore full paper", function(){ closeFloatingPopovers(); restorePaper(n); });
      if(!(n.h || n.rip)){ restore.disabled = true; restore.classList.add("disabled"); restore.title = "Nothing has been trimmed"; }
      body.appendChild(restore);
    });
  }
  // Arrange > Rotate left, Rotate right, Straighten (keyboard / non-pointer way to turn things, and a home for layer actions later)
  function arrangeSubmenu(pop, n){
    if(!rotatable(n)) return;
    menuSub(pop, ICONS.move, "Arrange", function(body){
      var pinned = isPinned(n);
      var l = menuItem(ICONS.move, "Rotate left", function(){ rotateBy([n], -ROT_STEP); }, {title: "Turn it " + ROT_STEP + "° anticlockwise"});
      var r = menuItem(ICONS.move, "Rotate right", function(){ rotateBy([n], ROT_STEP); }, {title: "Turn it " + ROT_STEP + "° clockwise"});
      var s = menuItem(ICONS.move, "Straighten", function(){ closeFloatingPopovers(); straighten([n]); }, {title: "Put it back level"});
      [l, r, s].forEach(function(b){ if(pinned){ b.classList.add("disabled"); b.title = "Pinned items stay exactly as they are. Unpin to turn it."; } body.appendChild(b); });
      if(pinned) return;
      l.addEventListener("click", function(){ if(l.isConnected) l.focus(); }); r.addEventListener("click", function(){ if(r.isConnected) r.focus(); });
    });
  }
  // the pin item, then Arrange (where the object can be turned)
  function pinAndArrange(pop, n){ pop.appendChild(pinMenuItem(n)); arrangeSubmenu(pop, n); }

  function menuItem(icon, label, fn, extra){
    extra = extra || {};
    var b = document.createElement("button");
    b.className = "menuItem" + (extra.cls ? " " + extra.cls : "");
    b.innerHTML = icon + "<span></span>" + (extra.kbd ? '<span class="kbd"></span>' : "");
    b.querySelector("span").textContent = label;
    if(extra.kbd) b.querySelector(".kbd").textContent = extra.kbd;
    if(extra.title) b.title = extra.title;
    b.addEventListener("mousedown", function(e){ e.preventDefault(); });
    b.addEventListener("click", function(e){ e.stopPropagation(); fn(b); });
    return b;
  }
  function boardPicker(container, ids){
    var targets = moveTargets();
    var wrap = makeDiv("boardPick");
    if(!targets.length){
      var none = makeDiv("menuHint");
      none.textContent = "No other boards yet. Make one from the board menu at the top left.";
      wrap.appendChild(none);
    }
    targets.forEach(function(b){
      wrap.appendChild(menuItem("", b.name, function(){ closeFloatingPopovers(); moveNotesToBoard(ids, b.id); }));
    });
    container.appendChild(wrap);
    return wrap;
  }
  function setNoteColor(n, bg){
    var before = captureState([n.id]);
    n.bg = bg;
    n.categoryIndex = 0;
    if(n.el) applyNoteLook(n.el, n);
    saveNotes(); updateMinimap();
    recordChange("Change colour", before);
  }
  function openNoteMenu(n, anchor){
    var pop = openFloatingPopover(anchor, "noteMenu");
    if(!pop) return;
    var text = n.textEl;
    function fmt(html, title, fn){
      var b = document.createElement("button");
      b.innerHTML = html; b.title = title; b.setAttribute("aria-label", title);
      b.addEventListener("mousedown", function(e){ e.preventDefault(); });
      b.addEventListener("click", function(e){ e.stopPropagation(); fn(b); });
      return b;
    }
    var grid = makeDiv("fmtGrid");
    [1,2,3].forEach(function(lv){ grid.appendChild(fmt("H" + lv, "Heading " + lv, function(){ toggleHeading(text, lv); })); });
    grid.appendChild(fmt(ICONS.bold, "Bold (" + MOD + "+B)", function(){ execIn(text, "bold"); }));
    grid.appendChild(fmt(ICONS.italic, "Italic (" + MOD + "+I)", function(){ execIn(text, "italic"); }));
    grid.appendChild(fmt(ICONS.underline, "Underline (" + MOD + "+U)", function(){ execIn(text, "underline"); }));
    grid.appendChild(fmt(ICONS.highlighter, "Highlight selected text", function(){ toggleHighlight(text); }));
    grid.appendChild(fmt(ICONS.ul, "Bullet list", function(){ setListKind(text, "ul"); }));
    grid.appendChild(fmt(ICONS.ol, "Numbered list", function(){ setListKind(text, "ol"); }));
    grid.appendChild(fmt(ICONS.checklist, "Checklist", function(){ setListKind(text, "check"); }));
    grid.appendChild(fmt(ICONS.titleLine, "Title line (no checkbox)", function(){ toggleChecklistTitle(text); }));
    grid.appendChild(fmt(ICONS.link, "Link", function(){ openLinkPopover(text, anchor); }));
    pop.appendChild(grid);
    pop.appendChild(makeDiv("menuSep"));

    var sw = makeDiv("swatchLine");
    PAPER_COLORS.forEach(function(c){
      var b = document.createElement("button");
      b.style.background = c.bg; b.title = c.name; b.setAttribute("aria-label", c.name);
      b.classList.toggle("active", n.bg === c.bg);
      b.addEventListener("mousedown", function(e){ e.preventDefault(); });
      b.addEventListener("click", function(e){
        e.stopPropagation();
        setNoteColor(n, c.bg);
        sw.querySelectorAll("button").forEach(function(x){ x.classList.toggle("active", x === b); });
      });
      sw.appendChild(b);
    });
    var shuffle = document.createElement("button");
    shuffle.className = "shuffle"; shuffle.innerHTML = ICONS.shuffle; shuffle.title = "Surprise me";
    shuffle.addEventListener("mousedown", function(e){ e.preventDefault(); });
    shuffle.addEventListener("click", function(e){
      e.stopPropagation();
      setNoteColor(n, randomColor());
      sw.querySelectorAll("button").forEach(function(x){ x.classList.remove("active"); });
    });
    sw.appendChild(shuffle);
    pop.appendChild(sw);

    pop.appendChild(menuItem(ICONS.image, n.image ? "Replace image" : "Add image", function(){
      closeFloatingPopovers();
      pendingImageNote = n;
      imageUploadInput.value = "";
      imageUploadInput.click();
    }));
    if(n.image && n.imgW){
      pop.appendChild(menuItem(ICONS.image, "Reset image size", function(){ closeFloatingPopovers(); resetImageSize(n); }));
    }
    if(noteIsPlainShort(n)) pop.appendChild(menuItem(ICONS.postcard, "Make postcard", function(){ closeFloatingPopovers(); makePostcardFromNote(n); }));
    pop.appendChild(menuItem(ICONS.sticky, n.cosmetic === "soup" ? "Remove Alphabet Soup" : isPremium() ? "Alphabet Soup" : "Alphabet Soup (Premium)", function(){
      closeFloatingPopovers(); setNoteCosmetic(n, n.cosmetic === "soup" ? null : "soup");
    }));
    paperSubmenu(pop, n);
    var vOnly = window.Stick && Stick.embed && !n.image ? Stick.embed.parse(htmlToText(n.textEl ? n.textEl.innerHTML : (n.html || "")).trim()) : null;
    if(vOnly) pop.appendChild(menuItem(ICONS.video || ICONS.link, "Show link as video", function(){ closeFloatingPopovers(); linkToEmbed(n, vOnly); }, {title: "Shows this " + Stick.embed.PROVIDERS[vOnly.provider].label + " link as a video you can play here"}));
    pop.appendChild(menuItem(ICONS.tick, "Mark done", function(){ closeFloatingPopovers(); markDone(n); }, {title: "Move this note to the Done pile"}));
    pinAndArrange(pop, n);
    pop.appendChild(menuItem(ICONS.task, n.isTask ? "Unmark as task" : "Mark as task", function(){
      closeFloatingPopovers();
      var before = captureState([n.id]);
      n.isTask = !n.isTask;
      saveNotes();
      rerenderNote(n);
      recordChange(n.isTask ? "Mark as task" : "Unmark task", before);
    }));
    pop.appendChild(makeDiv("menuSep"));

    var empty = !noteHasContent(n);
    pop.appendChild(menuItem(ICONS.share, "Share note…", function(){
      if(!noteHasContent(n)){ toast("Add some text or an image before sharing."); return; }
      closeFloatingPopovers();
      openShareModal([n]);
    }, {cls: empty ? "disabled" : "", title: empty ? "Add some text or an image first" : ""}));
    pop.appendChild(menuItem(ICONS.copy, "Duplicate", function(){ closeFloatingPopovers(); duplicateNotes([n.id]); }, {kbd: MOD + "+D"}));
    var moveItem = menuItem(ICONS.move, "Move to board", function(){
      var open = moveItem.nextSibling && moveItem.nextSibling.classList && moveItem.nextSibling.classList.contains("boardPick");
      if(open){ moveItem.nextSibling.remove(); return; }
      var holder = document.createDocumentFragment();
      var picker = boardPicker(holder, [n.id]);
      moveItem.parentNode.insertBefore(picker, moveItem.nextSibling);
    }, {kbd:"\u203A"});
    pop.appendChild(moveItem);
    pop.appendChild(menuItem(ICONS.trash, "Delete", function(){ closeFloatingPopovers(); deleteNotes([n.id]); }, {cls:"danger"}));
  }

  // ---------- Pin in place: this scrap is pushed down with a pin and stays where it is ----------
  // Pinned means the POSITION is locked. It can still be selected, edited, resized, commented on, marked done, moved to another board
  // or deleted. It does not move when a group is dragged or nudged, and Clean up leaves it exactly where it is (and tidies around it).
  // Duplicates, pastes and imports are never pinned.
  function isPinned(n){ return !!n && n.pinned === true; }
  function isZone(n){ return !!n && n.type === "zone"; }
  // ---------- Board zones: a patch of paper laid down behind the notes, so a corner of the board can have a name ----------
  // A zone is a plain object like the others (it syncs, copies, pins and undoes the same way) but it sits underneath everything and only
  // its title strip and its corner handle take the pointer, so the notes on top and the empty board around it stay easy to use.
  // Deleting a zone only removes the paper: the notes on it are never touched. "Move with its notes" is off until chosen.
  function zoneMaterial(n){ return ZONE_MATERIALS.some(function(m){ return m[0] === n.variant; }) ? n.variant : "paper"; }
  function zoneBox(n){ return {l: n.x, t: n.y, r: n.x + (n.w || 360), b: n.y + (n.h || 240)}; }
  function noteCenter(o){ var el = o.el, w = o.w || NOTE_W, h = (el && el.offsetHeight) || NOTE_H; return {x: o.x + w / 2, y: o.y + h / 2}; }
  function inBox(pt, b){ return pt.x >= b.l && pt.x <= b.r && pt.y >= b.t && pt.y <= b.b; }
  // the notes whose middle lies inside the zone
  function zoneContents(z){
    var box = zoneBox(z);
    return notes.filter(function(o){ return o !== z && !isZone(o) && o.el && o.el.isConnected && inBox(noteCenter(o), box); });
  }
  function insideAnyZone(n){ if(isZone(n)) return false; var c = noteCenter(n); return notes.some(function(z){ return isZone(z) && z.el && z.el.isConnected && inBox(c, zoneBox(z)); }); }
  function zoneLabel(n){ return n.title ? "Zone: " + n.title : "Untitled zone"; }
  function renderZone(n, isNew){
    var el = document.createElement("div");
    el.className = "zone mat-" + zoneMaterial(n) + (isNew ? " new" : "");
    el.dataset.id = n.id; el.style.left = n.x + "px"; el.style.top = n.y + "px"; el.style.width = (n.w || 360) + "px"; el.style.height = (n.h || 240) + "px"; el.style.zIndex = 0;
    el.style.setProperty("--zone", safeColor(n.bg) || ZONE_TINTS[0]);
    el.setAttribute("aria-label", zoneLabel(n)); el.setAttribute("role", "group");
    if(selected.has(n.id)) el.classList.add("selected");
    n.el = el; n.textEl = null; n.captionEl = null;
    var bar = makeDiv("zoneBar"), title = makeDiv("zoneTitle");
    title.textContent = n.title || ""; title.setAttribute("data-ph", "Name this zone");
    bar.appendChild(title);
    el.appendChild(bar);
    if(!readOnly){
      var more = document.createElement("button"); more.type = "button"; more.className = "zoneMore"; more.innerHTML = ICONS.more; more.title = "Zone options"; more.setAttribute("aria-label", "Options for this zone");
      more.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
      more.addEventListener("click", function(e){ e.stopPropagation(); zoneMenu(n, more); });
      bar.appendChild(more);
      var handle = makeDiv("zoneHandle"); handle.title = "Drag to resize"; handle.setAttribute("aria-hidden", "true");
      handle.addEventListener("pointerdown", function(e){ startZoneResize(e, n); });
      el.appendChild(handle);
      el.tabIndex = 0;
      bar.addEventListener("pointerdown", function(e){
        if(e.pointerType === "mouse" && e.button !== 0) return;
        if(title.isContentEditable) return;
        e.preventDefault(); endEditing(); closeCaptureMenu();
        if(e.ctrlKey || e.metaKey){ toggleSelected(n.id); return; }
        var group = selected.has(n.id) && selected.size > 1;
        if(!group) setSelection([n.id]);
        var base = group ? selectedNotes() : [n], seen = {}, all = [];
        base.forEach(function(b){ seen[b.id] = 1; all.push(b); });
        base.forEach(function(b){ if(isZone(b) && b.carry === true) zoneContents(b).forEach(function(o){ if(!seen[o.id]){ seen[o.id] = 1; all.push(o); } }); });
        startDrag(e, n, all);
      });
      bar.addEventListener("dblclick", function(e){ e.preventDefault(); e.stopPropagation(); editZoneTitle(n); });
      el.addEventListener("keydown", function(e){
        if(e.target !== el) return;
        if(e.key === "Enter"){ e.preventDefault(); editZoneTitle(n); }
        else if(e.key === " "){ e.preventDefault(); setSelection([n.id]); }
        else if(e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")){ e.preventDefault(); var r = el.getBoundingClientRect(); openObjectContextMenu(n, r.left + 24, r.top + 24); }
      });
      el.addEventListener("focus", function(){ if(!selected.has(n.id)) setSelection([n.id]); });
      el.addEventListener("contextmenu", function(e){ if(e.shiftKey || !e.target.closest(".zoneBar")) return; e.preventDefault(); openObjectContextMenu(n, e.clientX, e.clientY); });
    }
    boardInner.appendChild(el);
    return el;
  }
  function editZoneTitle(n){
    if(readOnly || !n.el) return;
    var t = n.el.querySelector(".zoneTitle"), before = captureState([n.id]), start = n.title || "", done = false;
    t.contentEditable = "true"; t.focus();
    var rg = document.createRange(); rg.selectNodeContents(t); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rg);
    function finish(commit){
      if(done) return; done = true;
      t.removeEventListener("keydown", key); t.removeEventListener("blur", onBlur); t.removeEventListener("paste", paste);
      t.contentEditable = "false";
      var v = commit ? t.textContent.replace(/[\u0000-\u001f\u202a-\u202e\u2066-\u2069]/g, "").replace(/\s+/g, " ").trim().slice(0, 40) : start;
      t.textContent = v;
      if(v === start) return;
      n.title = v; n.el.setAttribute("aria-label", zoneLabel(n)); saveNotes(); recordChange("Name zone", before);
    }
    function key(e){ if(e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); finish(false); n.el.focus(); } else if(e.key === "Enter"){ e.preventDefault(); finish(true); n.el.focus(); } }
    function onBlur(){ finish(true); }
    function paste(e){ e.preventDefault(); var tx = (e.clipboardData && e.clipboardData.getData("text/plain")) || ""; document.execCommand("insertText", false, tx.replace(/\s+/g, " ")); }
    t.addEventListener("keydown", key); t.addEventListener("blur", onBlur); t.addEventListener("paste", paste);
  }
  function startZoneResize(e, n){
    e.preventDefault(); e.stopPropagation();
    var el = n.el, before = captureState([n.id]), sx = e.clientX, sy = e.clientY, w0 = n.w || 360, h0 = n.h || 240, w = w0, h = h0;
    setSelection([n.id]);
    function move(ev){
      w = Math.round(Math.min(ZONE_MAX_W, Math.max(ZONE_MIN_W, w0 + (ev.clientX - sx) / boardZoom)));
      h = Math.round(Math.min(ZONE_MAX_H, Math.max(ZONE_MIN_H, h0 + (ev.clientY - sy) / boardZoom)));
      el.style.width = w + "px"; el.style.height = h + "px";
    }
    function up(){
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      if(w === w0 && h === h0) return;
      n.w = w; n.h = h; saveNotes(); ensureWidth(); updateMinimap(); recordChange("Resize zone", before);
    }
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
  }
  function createZone(bx, by){
    if(readOnly) return null;
    var vc = viewCenter();
    var x = bx != null ? bx : vc.x, y = by != null ? by : Math.min(vc.y, 260);
    var z = {id: newId(), type: "zone", x: Math.max(0, Math.round(x - 180)), y: Math.max(0, Math.round(y - 120)), w: 360, h: 240, title: "", variant: "paper", bg: ZONE_TINTS[Math.floor(Math.random() * 3)], rot: 0, z: 0, phys: {}, createdAt: Date.now()};
    z.y = Math.min(z.y, Math.max(0, boardHeight() - z.h - 8));
    insertNotes([z], "Add zone");
    setTimeout(function(){ editZoneTitle(z); }, 60);
    return z;
  }
  function zoneMenu(n, anchor){
    var pop = openFloatingPopover(anchor, "noteMenu"); if(!pop) return;
    var count = zoneContents(n).length;
    var hint = makeDiv("menuHint"); hint.textContent = count + (count === 1 ? " note on this zone" : " notes on this zone"); pop.appendChild(hint);
    pop.appendChild(menuItem(ICONS.pencil, "Rename", function(){ closeFloatingPopovers(); editZoneTitle(n); }));
    var mh = makeDiv("menuHint"); mh.textContent = "Material"; pop.appendChild(mh);
    ZONE_MATERIALS.forEach(function(m){
      pop.appendChild(menuItem(zoneMaterial(n) === m[0] ? ICONS.tick : '<span class="menuGap"></span>', m[1], function(){
        closeFloatingPopovers(); var before = captureState([n.id]); n.variant = m[0]; saveNotes(); rerenderNote(n); recordChange("Zone material", before);
      }, {cls: zoneMaterial(n) === m[0] ? "on" : ""}));
    });
    var ch = makeDiv("menuHint"); ch.textContent = "Colour"; pop.appendChild(ch);
    var sw = makeDiv("zoneSwatches");
    ZONE_TINTS.forEach(function(c){
      var b = document.createElement("button"); b.type = "button"; b.className = "zoneSw" + ((safeColor(n.bg) || ZONE_TINTS[0]) === c ? " on" : ""); b.style.background = c; b.setAttribute("aria-label", "Colour " + c);
      b.addEventListener("click", function(){ closeFloatingPopovers(); var before = captureState([n.id]); n.bg = c; saveNotes(); rerenderNote(n); recordChange("Zone colour", before); });
      sw.appendChild(b);
    });
    pop.appendChild(sw);
    pop.appendChild(menuItem(n.carry === true ? ICONS.tick : '<span class="menuGap"></span>', "Move with its notes", function(){
      closeFloatingPopovers(); var before = captureState([n.id]); if(n.carry === true) delete n.carry; else n.carry = true; saveNotes(); recordChange("Zone moves with its notes", before);
    }, {cls: n.carry === true ? "on" : "", title: "When on, dragging the zone carries the notes lying on it"}));
    pop.appendChild(pinMenuItem(n));
    pop.appendChild(menuItem(ICONS.trash, "Delete zone", function(){ closeFloatingPopovers(); deleteNotes([n.id]); }, {cls: "danger", title: "Only the paper goes; notes on it stay"}));
  }
  OBJECT_MENUS.zone = zoneMenu;
  // ---------- turning things by hand (v0.8.2.2) ----------
  // ONE angle: n.rot is the final angle in degrees and the only thing stored. The natural, slightly random tilt a new object gets is just its
  // starting value; turning it by hand edits that same number. Nothing is added on top at render time, so there is no second random angle, no
  // compounding and no drift on reload. Range -15..+15 (it is a design range: enough personality, never upside-down). Shift snaps to 5 degrees.
  // Supported: notes, every paper kind (checklists are notes; receipts, tickets, postcards, photo strips, shopping lists), photos.
  // Not supported: zones (background paper), piles, embedded video (a live player), audio and video recordings. Pinned items do not turn.
  var ROT_MAX = 15, ROT_STEP = 3, ROT_SNAP = 5;
  function rotatable(n){ return !!n && !isZone(n) && !isPileObj(n) && n.type !== "embed" && !isAV(n) && !isHiddenMember(n); }
  function clampRot(v){ v = Number(v); if(!isFinite(v)) return 0; return Math.round(Math.max(-ROT_MAX, Math.min(ROT_MAX, v)) * 10) / 10; }
  function snapRot(v){ return clampRot(Math.round(Number(v) / ROT_SNAP) * ROT_SNAP); }
  function paintRot(n){ if(n && n.el) n.el.style.setProperty("--rot", (n.rot || 0) + "deg"); }
  // set the angle of several objects as ONE undo step. Returns how many changed.
  function setRotation(list, valueOf, label){
    if(readOnly) return 0;
    var eligible = list.filter(rotatable), turnable = eligible.filter(function(n){ return !isPinned(n); });
    if(eligible.length && !turnable.length){ eligible.forEach(pinTug); toast("Pinned items stay exactly as they are. Unpin to turn them."); return 0; }
    var before = captureState(turnable.map(function(n){ return n.id; })), changed = 0;
    turnable.forEach(function(n){ var v = clampRot(valueOf(n)); if(v !== (n.rot || 0)){ n.rot = v; paintRot(n); changed++; } });
    if(!changed) return 0;
    saveNotes(); updateMinimap();
    recordChange(label, before, {coalesce: label === "Rotate" ? null : null});
    return changed;
  }
  function rotateBy(list, deg){ return setRotation(list, function(n){ return (n.rot || 0) + deg; }, deg < 0 ? "Rotate left" : "Rotate right"); }
  function straighten(list){
    var n = setRotation(list, function(){ return 0; }, "Straighten");
    if(!n && list.some(function(x){ return rotatable(x) && !isPinned(x); })) toast("Already level.");
    return n;
  }

  var rotHandleEl = null;
  function removeRotHandle(){ if(rotHandleEl){ rotHandleEl.remove(); rotHandleEl = null; } }
  // the handle only exists on the one selected object (so a big board pays nothing for it)
  function syncRotHandle(){
    removeRotHandle();
    if(readOnly || singleNoteMode || selected.size !== 1) return;
    var n = findNote(Array.from(selected)[0]);
    if(!rotatable(n) || !n.el || isPinned(n)) return;
    var b = document.createElement("button"); b.type = "button"; b.className = "rotHandle";
    b.title = "Drag to turn (hold Shift to snap, double-click to straighten)"; b.setAttribute("aria-label", "Turn: drag, or use the arrow keys. Double-click to straighten.");
    b.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/></svg>';
    b.addEventListener("pointerdown", function(e){ if(e.pointerType === "mouse" && e.button !== 0) return; startRotate(e, n, b); });
    b.addEventListener("mousedown", function(e){ e.preventDefault(); e.stopPropagation(); });
    b.addEventListener("click", function(e){ e.stopPropagation(); });
    b.addEventListener("dblclick", function(e){ e.preventDefault(); e.stopPropagation(); straighten([n]); });
    b.addEventListener("keydown", function(e){
      var d = e.shiftKey ? 1 : ROT_STEP;
      if(e.key === "ArrowLeft" || e.key === "ArrowDown"){ e.preventDefault(); e.stopPropagation(); rotateBy([n], -d); }
      else if(e.key === "ArrowRight" || e.key === "ArrowUp"){ e.preventDefault(); e.stopPropagation(); rotateBy([n], d); }
      else if(e.key === "Home" || e.key === "0"){ e.preventDefault(); e.stopPropagation(); straighten([n]); }
    });
    n.el.appendChild(b); rotHandleEl = b;
  }
  function startRotate(e, n, handle){
    e.preventDefault(); e.stopPropagation();
    var el = n.el; if(!el) return;
    var r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    function angleAt(ev){ return Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI; }
    var a0 = angleAt(e), start = n.rot || 0, cur = start, before = captureState([n.id]);
    el.classList.add("rotating"); handle.classList.add("on");
    try{ handle.setPointerCapture(e.pointerId); }catch(err){}
    function move(ev){
      var d = angleAt(ev) - a0; while(d > 180) d -= 360; while(d < -180) d += 360;
      var v = start + d;
      cur = ev.shiftKey ? snapRot(v) : clampRot(v);
      n.rot = cur; paintRot(n); handle.setAttribute("data-deg", (cur > 0 ? "+" : "") + Math.round(cur) + "°");
    }
    function up(){
      handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); handle.removeEventListener("pointercancel", up);
      el.classList.remove("rotating"); handle.classList.remove("on"); handle.removeAttribute("data-deg");
      if(cur !== start){ saveNotes(); updateMinimap(); recordChange("Rotate", before); }
    }
    handle.addEventListener("pointermove", move); handle.addEventListener("pointerup", up); handle.addEventListener("pointercancel", up);
  }

  // ---------- a real tack (v0.8.2.2) ----------
  // Only the pinned / not pinned state is stored. The tack is a small decoration drawn on the object (a spot and a tilt picked from its id, so it is
  // the same every time); the drop and the fall are short, temporary animations that are removed when they finish and never touch the board's data.
  var TACK_SVG = '<svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true" focusable="false">' +
    '<ellipse cx="15" cy="16.5" rx="8.5" ry="6.2" fill="rgba(40,25,10,0.28)"/>' +
    '<circle cx="12" cy="12" r="8.6" fill="#b3402e"/><circle cx="12" cy="12" r="8.6" fill="none" stroke="#7d2a1d" stroke-width="1.2"/>' +
    '<circle cx="12" cy="12" r="5.3" fill="#d4604a"/><ellipse cx="9.4" cy="9.3" rx="2.4" ry="1.5" fill="rgba(255,255,255,0.65)" transform="rotate(-35 9.4 9.3)"/>' +
    '</svg>';
  function decoratePin(n, how){
    var el = n && n.el; if(!el) return;
    var old = el.querySelector(":scope > .pinTack, :scope > .pinBadge"); if(old) old.remove();
    el.classList.toggle("pinned", isPinned(n));
    if(!isPinned(n)) return;
    var h = hashStr(String(n.id)), jx = (h % 17) - 8, side = (h >> 4) % 2 ? 1 : -1;
    var t = document.createElement("span"); t.className = "pinTack"; t.title = "Pinned in place"; t.setAttribute("role", "img"); t.setAttribute("aria-label", "Pinned in place");
    t.style.setProperty("--tx", (side * (34 + Math.abs(jx))) + "px"); t.style.setProperty("--tr", (((h >> 7) % 29) - 14) + "deg");
    t.innerHTML = TACK_SVG;
    if(how === "drop" && !reducedMotion()){
      t.classList.add("drop"); el.classList.add("thud");
      setTimeout(function(){ t.classList.remove("drop"); el.classList.remove("thud"); }, 520);
    }
    el.appendChild(t);
  }
  // unpinning: the tack lets go and falls. The falling copy is a temporary element on the page (not a board object); it is removed when it has gone.
  function tackFall(n){
    if(reducedMotion() || !n || !n.el) return;
    var t = n.el.querySelector(":scope > .pinTack"); if(!t) return;
    var r = t.getBoundingClientRect(); if(!r.width) return;
    var c = t.cloneNode(true); c.className = "tackFall"; c.removeAttribute("title");
    c.style.cssText = "left:" + r.left + "px;top:" + r.top + "px;width:" + r.width + "px;height:" + r.height + "px;--tr:" + (t.style.getPropertyValue("--tr") || "0deg");
    document.body.appendChild(c);
    var gone = false; function done(){ if(gone) return; gone = true; c.remove(); }
    c.addEventListener("animationend", done); setTimeout(done, 900);
  }
  function setPinned(ids, on){
    var list = ids.map(findNote).filter(function(n){ return n && isPinned(n) !== on; });
    if(!list.length || readOnly) return;
    var before = captureState(list.map(function(n){ return n.id; }));
    list.forEach(function(n){ if(on){ n.pinned = true; decoratePin(n, "drop"); } else { tackFall(n); delete n.pinned; decoratePin(n); } });
    syncRotHandle();
    saveNotes();
    recordChange(on ? (list.length > 1 ? "Pin " + list.length + " items" : "Pin in place") : (list.length > 1 ? "Unpin " + list.length + " items" : "Unpin"), before);
    toast(on ? (list.length > 1 ? "Pinned " + list.length + " items in place." : "Pinned in place.") : "Unpinned.");
  }
  function pinMenuItem(n){
    return menuItem(ICONS.pin, isPinned(n) ? "Unpin" : "Pin in place", function(){ closeFloatingPopovers(); setPinned([n.id], !isPinned(n)); }, {title: isPinned(n) ? "Let this move again" : "Keep this exactly where it is"});
  }
  // a tug at a pinned note: it does not move, it just shows why
  function pinTug(n){ if(!n || !n.el || reducedMotion()) return; n.el.classList.remove("pinTug"); void n.el.offsetWidth; n.el.classList.add("pinTug"); setTimeout(function(){ if(n.el) n.el.classList.remove("pinTug"); }, 320); }

  // ---------- the Done pile: finished notes go into a little stack at the board's edge, not into the bin ----------
  // A finished note keeps its words, colour, place and who finished it and when. It leaves the board (so the board stays calm) but stays
  // in the same stored list as everything else (so it syncs, exports and survives a reload). It can be read, put back, or thrown away.
  function isDoneItem(o){ return !!o && Number(o.doneAt) > 0; }
  function findPile(id){ for(var i = 0; i < donePile.length; i++){ if(donePile[i].id === id) return donePile[i]; } return null; }
  function pileTitle(o){
    var t = "";
    if(o.type === "photo" || o.type === "audio" || o.type === "video") t = o.caption || "";
    else if(isPaper(o)) t = Stick.objects.text(o);
    else t = htmlToText(o.html || "");
    t = String(t || "").replace(/\s+/g, " ").trim();
    return t || "Empty note";
  }
  function pileWhen(o){ try{ return new Date(o.doneAt).toLocaleDateString(undefined, {day:"numeric", month:"short"}); }catch(e){ return ""; } }
  var pileBtn = null;
  function ensurePileBtn(){
    if(pileBtn) return pileBtn;
    pileBtn = document.createElement("button");
    pileBtn.type = "button"; pileBtn.className = "donePile"; pileBtn.hidden = true;
    pileBtn.innerHTML = '<span class="dpStack" aria-hidden="true"><i></i><i></i><i></i></span><span class="dpLabel"></span>';
    pileBtn.addEventListener("click", openDoneTray);
    document.body.appendChild(pileBtn);
    return pileBtn;
  }
  function updateDonePile(bump){
    var b = ensurePileBtn(), k = donePile.length;
    b.hidden = !k || singleNoteMode || readOnly;
    b.querySelector(".dpLabel").textContent = "Done \u00b7 " + k;
    b.setAttribute("aria-label", "Done pile: " + k + (k === 1 ? " finished note" : " finished notes") + ". Open it.");
    if(bump && !b.hidden){ b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
  }
  function whoAmI(){ return (CLOUD && settings.account && settings.account.name) || ""; }       // only signed-in people are named (guests are not)
  // Mark done: the note shrinks and slides to the pile. Undo brings it back exactly where it was.
  function markDone(n){
    if(readOnly || !n || isDoneItem(n) || (n.type && n.type !== "shopping")) return;       // notes and shopping lists can be marked done
    endEditing(); closeFloatingPopovers();
    var snap = snapNote(n), el = n.el, id = n.id;
    snap.doneAt = Date.now(); var by = whoAmI(); if(by) snap.doneBy = String(by).slice(0, 60);
    function take(){
      var cur = findNote(id); if(!cur) return;
      removeNoteEl(cur, false); notes.splice(notes.indexOf(cur), 1); selected.delete(id); clearDecorations(id);
      donePile.push(Object.assign({}, snap));
      applySelection(); ensureWidth(); saveNotes(); updateCount(); updateMinimap(); updateDonePile(true);
    }
    function put(){
      var pi = donePile.findIndex(function(x){ return x.id === id; }); if(pi !== -1) donePile.splice(pi, 1);
      var c = Object.assign({}, snap); delete c.doneAt; delete c.doneBy; if(c.phys) c.phys = Object.assign({}, c.phys);
      if(!findNote(id)){ notes.push(c); renderNote(c, false, {focus:false}); }
      updateDonePile(false);
    }
    var reduce = reducedMotion(), target = ensurePileBtn();
    if(el && !reduce && !target.hidden || (el && !reduce && donePile.length === 0)){
      var r = el.getBoundingClientRect(), t = target.hidden ? {left: 16, top: window.innerHeight - 60, width: 90, height: 40} : target.getBoundingClientRect();
      var dx = (t.left + t.width / 2 - (r.left + r.width / 2)) / boardZoom, dy = (t.top + t.height / 2 - (r.top + r.height / 2)) / boardZoom;
      el.classList.add("toDone");
      el.style.transform = "translate(" + dx + "px," + dy + "px) rotate(" + ((n.rot || 0) - 12) + "deg) scale(0.2)";
      el.style.opacity = "0";
      setTimeout(take, 520);
    } else take();
    var action = pushHistory({label: "Mark done", custom: true, t: Date.now(), undo: function(){ put(); return true; }, redo: function(){ take(); return true; }});
    toast("Moved to Done.", "Undo", function(){ undoIfTop(action); });
  }
  // Mark every selected note done in one step: one history entry, one toast, one Undo. Only ordinary notes go to the pile
  // (photos, recordings and other objects stay on the board).
  function markDoneGroup(ids){
    if(readOnly) return;
    var list = ids.map(findNote).filter(function(n){ return n && (!n.type || n.type === "shopping") && !isDoneItem(n); });
    if(!list.length){ toast("Select some notes first. Photos and other objects can’t be marked done."); return; }
    if(list.length === 1){ markDone(list[0]); return; }
    endEditing(); closeFloatingPopovers();
    var by = whoAmI(), at = Date.now();
    var snaps = list.map(function(n){ var o = snapNote(n); o.doneAt = at; if(by) o.doneBy = String(by).slice(0, 60); return o; });
    function take(){
      snaps.forEach(function(sn){
        var cur = findNote(sn.id); if(!cur) return;
        removeNoteEl(cur, false); notes.splice(notes.indexOf(cur), 1); selected.delete(sn.id); clearDecorations(sn.id);
        donePile.push(Object.assign({}, sn));
      });
      applySelection(); ensureWidth(); saveNotes(); updateCount(); updateMinimap(); updateDonePile(true);
    }
    function put(){
      snaps.forEach(function(sn){
        var pi = donePile.findIndex(function(x){ return x.id === sn.id; }); if(pi !== -1) donePile.splice(pi, 1);
        var c = Object.assign({}, sn); delete c.doneAt; delete c.doneBy; if(c.phys) c.phys = Object.assign({}, c.phys);
        if(!findNote(c.id)){ notes.push(c); renderNote(c, false, {focus:false}); }
      });
      ensureWidth(); saveNotes(); updateCount(); updateMinimap(); updateDonePile(false);
    }
    take();
    var action = pushHistory({label: "Mark " + list.length + " done", custom: true, t: Date.now(), undo: function(){ put(); return true; }, redo: function(){ take(); return true; }});
    toast("Moved " + list.length + " notes to Done.", "Undo", function(){ undoIfTop(action); });
  }
  function restoreFromPile(id){
    var o = findPile(id); if(!o) return;
    var c = Object.assign({}, o); delete c.doneAt; delete c.doneBy; if(c.phys) c.phys = Object.assign({}, c.phys);
    zCounter += 1; c.z = zCounter; c.y = clampY(c.y);
    donePile.splice(donePile.indexOf(o), 1);
    notes.push(c); renderNote(c, true, {focus:false});
    ensureWidth(); saveNotes(); updateCount(); updateMinimap(); updateDonePile(false);
    var action = pushHistory({label: "Restore from Done", custom: true, t: Date.now(),
      undo: function(){ var cur = findNote(c.id); if(cur){ removeNoteEl(cur, false); notes.splice(notes.indexOf(cur), 1); selected.delete(c.id); clearDecorations(c.id); } donePile.push(o); updateDonePile(false); return true; },
      redo: function(){ var i = donePile.indexOf(o); if(i !== -1) donePile.splice(i, 1); if(!findNote(c.id)){ notes.push(c); renderNote(c, false, {focus:false}); } updateDonePile(false); return true; }});
    setSelection([c.id]);
  }
  function deleteFromPile(id){
    var o = findPile(id); if(!o) return Promise.resolve(false);
    return confirmDialog({title: "Throw this away for good?", body: "\u201c" + pileTitle(o).slice(0, 60) + "\u201d will be deleted. This can\u2019t be undone.", confirm: "Delete", danger: true}).then(function(ok){
      if(!ok) return false;
      var i = donePile.indexOf(o); if(i !== -1) donePile.splice(i, 1);
      saveNotes(); updateDonePile(false); return true;
    });
  }
  function openDoneTray(){
    var content = makeDiv("doneTray"), list = makeDiv("doneList"), modal = null;
    content.appendChild(list);
    function paint(){
      list.innerHTML = "";
      if(!donePile.length){ var e = document.createElement("p"); e.className = "acctSub"; e.textContent = "Nothing in the pile yet."; list.appendChild(e); return; }
      donePile.slice().sort(function(a, b){ return b.doneAt - a.doneAt; }).forEach(function(o){
        var row = makeDiv("doneRow"), chip = makeDiv("doneChip"), body = makeDiv("doneBody"), tt = makeDiv("doneTitle"), meta = makeDiv("doneMeta"), acts = makeDiv("doneActs"), full = makeDiv("doneFull");
        chip.style.background = o.bg || "#f6e58a"; chip.setAttribute("aria-hidden", "true");
        tt.textContent = pileTitle(o); tt.dir = "auto";
        meta.textContent = "Done " + pileWhen(o) + (o.doneBy ? " \u00b7 " + o.doneBy : "");
        full.hidden = true; full.dir = "auto"; full.textContent = pileTitle(o); full.style.fontFamily = o.font ? fontStack(o.font) : "";
        function btn(label, cls, fn){ var b = document.createElement("button"); b.type = "button"; b.className = "pillBtn cmtSmall " + (cls || ""); b.textContent = label; b.addEventListener("click", fn); acts.appendChild(b); return b; }
        var rd = btn("Read", "", function(){ full.hidden = !full.hidden; rd.textContent = full.hidden ? "Read" : "Hide"; rd.setAttribute("aria-expanded", String(!full.hidden)); }); rd.setAttribute("aria-expanded", "false");
        btn("Put back", "primary", function(){ restoreFromPile(o.id); if(!donePile.length && modal) modal.close(true); else paint(); });
        btn("Delete\u2026", "", function(){ deleteFromPile(o.id).then(function(ok){ if(ok){ if(!donePile.length && modal) modal.close(true); else paint(); } }); });
        body.appendChild(tt); body.appendChild(meta); body.appendChild(full); body.appendChild(acts);
        row.appendChild(chip); row.appendChild(body); list.appendChild(row);
      });
    }
    paint();
    modal = openModal({title: "Done", sub: "Finished notes wait here. Put one back, read it, or throw it away.", content: content, width: 460, actions: [{label: "Close", value: true}]});
  }
  // a checklist with everything ticked: offer the pile, never act on its own
  function offerDoneForChecklist(n){
    if(readOnly || !n || !n.textEl || n.type) return;
    var items = n.textEl.querySelectorAll('ul.checklist > li:not([data-title="true"])');
    if(!items.length) return;
    for(var i = 0; i < items.length; i++){ if(items[i].getAttribute("data-checked") !== "true") return; }
    toast("Everything\u2019s checked off. Move this note to Done?", "Move to Done", function(){ markDone(n); });
  }

  // ---------- multi-select bar ----------
  function renderSelBar(){
    if(readOnly || singleNoteMode || selected.size < 2){ selBar.hidden = true; selBar.innerHTML = ""; return; }
    selBar.hidden = false;
    selBar.innerHTML = "";
    var ids = Array.from(selected);
    var count = document.createElement("span");
    count.className = "selCount";
    count.textContent = ids.length + " selected";
    selBar.appendChild(count);
    function add(icon, label, fn, cls){
      var b = document.createElement("button");
      b.innerHTML = icon + "<span></span>";
      b.querySelector("span").textContent = label;
      if(cls) b.className = cls;
      b.addEventListener("click", function(e){ e.stopPropagation(); fn(b); });
      selBar.appendChild(b);
      return b;
    }
    if(ids.some(function(id){ var q = findNote(id); return q && !q.type; })) add(ICONS.tick, "Mark done", function(){ markDoneGroup(ids); });
    if(pileEligibleList(ids).length >= 2){
      add(ICONS.move, "Stack", function(){ stackNotes(ids); }).title = "Arrange these notes in a vertical stack";
      add(ICONS.move, "Pile", function(){ makePile(ids); }).title = "Collapse these notes into one pile (nothing is deleted)";
    }
    add(ICONS.copy, "Duplicate", function(){ duplicateNotes(ids); });
    add(ICONS.move, "Move " + ids.length + " to…", function(b){
      var pop = openFloatingPopover(b, "noteMenu");
      if(!pop) return;
      var head = makeDiv("menuHint");
      head.textContent = "Move " + ids.length + " notes to";
      pop.appendChild(head);
      var picker = boardPicker(pop, ids);
      picker.style.paddingLeft = "0";
    });
    add(ICONS.share, "Share", function(){ openShareModal(selectedNotes()); });
    add(ICONS.trash, "Delete", function(){ requestDelete(ids); }, "danger");
    var x = add(ICONS.close, "", function(){ clearSelection(); }, "x");
    x.title = "Clear selection"; x.setAttribute("aria-label", "Clear selection");
  }

  // ---------- modals ----------
  // ---- keyboard: dialogs keep Tab inside themselves, and give focus back to what opened them ----
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  function focusablesIn(root){
    return Array.prototype.slice.call(root.querySelectorAll(FOCUSABLE)).filter(function(el){ return !el.hidden && el.getAttribute("aria-disabled") !== "true" && (el.offsetWidth || el.offsetHeight || el === document.activeElement); });
  }
  function isTopBackdrop(b){ var all = document.querySelectorAll(".acctBackdrop"); return all.length && all[all.length - 1] === b; }
  function trapTab(e, backdrop, card){
    if(e.key !== "Tab" || !isTopBackdrop(backdrop)) return;
    var f = focusablesIn(card);
    if(!f.length){ e.preventDefault(); card.focus(); return; }
    var first = f[0], last = f[f.length - 1], inside = card.contains(document.activeElement);
    if(e.shiftKey && (!inside || document.activeElement === first)){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && (!inside || document.activeElement === last)){ e.preventDefault(); first.focus(); }
  }
  var dialogSeq = 0;
  function openModal(o){
    var opener = document.activeElement;
    var backdrop = makeDiv("acctBackdrop");
    var card = makeDiv("acctCard modalCard" + (o.slip ? " slipCard" : ""));
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    if(o.width) card.style.width = o.width + "px";
    backdrop.appendChild(card);
    var closeBtn = document.createElement("button");
    closeBtn.className = "acctClose"; closeBtn.innerHTML = ICONS.close; closeBtn.setAttribute("aria-label", "Close");
    card.appendChild(closeBtn);
    var h = document.createElement("h3"); h.textContent = o.title; h.id = "dlgTitle" + (++dialogSeq); card.appendChild(h);
    card.setAttribute("aria-labelledby", h.id); card.setAttribute("tabindex", "-1");
    if(o.sub){ var sub = document.createElement("p"); sub.className = "acctSub"; sub.textContent = o.sub; card.appendChild(sub); }
    if(o.content) card.appendChild(o.content);
    var closed = false, ovModal = OV.layer("modal", function(){ close(false); }, function(){ return !closed && backdrop.isConnected; });
    function close(result){
      if(closed) return;
      closed = true; ovModal.close();
      backdrop.remove();
      document.removeEventListener("keydown", onKey, true);
      if(opener && opener.focus && document.contains(opener)){ try{ opener.focus(); }catch(e){} }
      if(o.onClose) o.onClose(result);
    }
    function onKey(e){
      if(e.key === "Escape" && isTopBackdrop(backdrop)){ e.stopPropagation(); close(false); }
      else trapTab(e, backdrop, card);
    }
    if(o.actions && o.actions.length){
      var row = makeDiv("modalActions");
      o.actions.forEach(function(a){
        var b = document.createElement("button");
        b.className = "pillBtn" + (a.kind ? " " + a.kind : "");
        b.textContent = a.label;
        if(a.id) b.id = a.id;
        b.addEventListener("click", function(){
          var keep = a.onClick ? a.onClick(close, b) === false : false;
          if(!keep) close(a.value);
        });
        row.appendChild(b);
      });
      card.appendChild(row);
    }
    closeBtn.addEventListener("click", function(){ close(false); });
    backdrop.addEventListener("mousedown", function(e){ if(e.target === backdrop) close(false); });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(backdrop); ovModal.open();
    setTimeout(function(){ if(!card.contains(document.activeElement)){ var f = focusablesIn(card).filter(function(el){ return el !== closeBtn; }); (f[0] || closeBtn).focus(); } }, 0);
    return {card:card, close:close, backdrop:backdrop};
  }
  function confirmDialog(o){
    return new Promise(function(resolve){
      var body = document.createElement("p");
      body.className = "acctSub"; body.style.margin = "0";
      body.textContent = o.body || "";
      var m = openModal({
        title:o.title, content:body, width:360,
        actions:[
          {label:"Cancel", value:false},
          {label:o.confirm || "OK", kind:o.danger ? "dangerFill" : "primary", value:true, id:"confirmOk"}
        ],
        onClose:function(v){ resolve(!!v); }
      });
      var okBtn = m.card.querySelector("#confirmOk");
      okBtn.addEventListener("keydown", function(e){ if(e.key === "Enter"){ e.preventDefault(); okBtn.click(); } });
      setTimeout(function(){ okBtn.focus(); }, 0);
    });
  }

  // ---------- sharing notes ----------
  function flashCopied(btn, label){
    if(btn._orig === undefined) btn._orig = btn.innerHTML;
    clearTimeout(btn._copyT);
    btn.classList.remove("copied");
    void btn.offsetWidth;
    btn.classList.add("copied");
    btn.innerHTML = '<span class="ok">' + ICONS.tick + "<span></span></span>";
    btn.querySelector(".ok > span").textContent = label || "Copied!";
    btn._copyT = setTimeout(function(){ btn.classList.remove("copied"); btn.innerHTML = btn._orig; }, 1500);
  }
  async function copyText(text){
    try{ await navigator.clipboard.writeText(text); return true; }
    catch(e){
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try{ ok = document.execCommand("copy"); }catch(err){}
      ta.remove();
      return ok;
    }
  }
  // Lays static notes out at their relative positions, scaled to fit a box.
  function buildArrangement(items, maxW, maxH){
    var outer = document.createElement("div");
    outer.style.position = "relative";
    var stage = makeDiv("publicStage");
    stage.style.position = "absolute"; stage.style.left = "0"; stage.style.top = "0";
    stage.style.transformOrigin = "0 0";
    outer.appendChild(stage);
    var minX = Math.min.apply(null, items.map(function(i){ return i.x || 0; }));
    var minY = Math.min.apply(null, items.map(function(i){ return i.y || 0; }));
    var els = items.map(function(it){
      var el = buildStaticNote(it);
      el.style.left = ((it.x || 0) - minX + 14) + "px";
      el.style.top = ((it.y || 0) - minY + 16) + "px";
      stage.appendChild(el);
      return el;
    });
    function fit(){
      var w = 0, h = 0;
      els.forEach(function(el){ w = Math.max(w, el.offsetLeft + el.offsetWidth + 14); h = Math.max(h, el.offsetTop + el.offsetHeight + 16); });
      var sc = Math.min(1, maxW / w, maxH / h);
      stage.style.width = w + "px"; stage.style.height = h + "px";
      stage.style.transform = "scale(" + sc + ")";
      outer.style.width = Math.ceil(w * sc) + "px";
      outer.style.height = Math.ceil(h * sc) + "px";
    }
    return {el:outer, fit:fit};
  }
  async function openShareModal(list){
    // Signed in (on a board you can edit): a short server link to a frozen copy. Guests: the link carries the content.
    var cloudShare = !!(CLOUD && cloudSync && !viewerMode && window.Stick && Stick.share);
    var avLeft = list.filter(isAV).length;
    var shareable = list.filter(function(n){ return !isPileObj(n) && noteHasContent(n) && (cloudShare || !isAV(n)); });
    if(!shareable.length && avLeft && !cloudShare){ toast("Voice memos and videos stay on this device for now, so they can't be shared by link yet. Sign in to share them."); return; }
    if(!shareable.length){
      toast(list.length > 1 ? "Those notes are empty. Add something first." : "Add some text or an image before sharing.");
      return;
    }
    if(cloudShare && settings.account && settings.account.prof && settings.account.prof.ageBand === "child"){
      var okChild = await confirmDialog({title: "Anyone with the link can see this", body: "Only share what you are happy for anyone to see, and check with a parent or guardian first.", confirm: "Make the link"});
      if(!okChild) return;
    }
    var ident = cloudShare ? shareIdentity() : {name:getDisplayName(), avatar:false, bio:false};
    var name = ident.name;
    var isGroup = shareable.length > 1;
    var items, link, shareInfo = null;
    if(cloudShare){
      busyStart("share", "Preparing share\u2026", {delay: 250});
      var ready = await cloudSync.settle(60000);     // the link can only point at things that have reached the server
      busyEnd("share");
      if(!ready){ toast("Couldn't finish saving to your account yet. Check your connection and try again."); return; }
      var kept = shareable.filter(function(n){ return !isAV(n) || n.assetId; });
      avLeft = shareable.length - kept.length;
      shareable = kept;
      if(!shareable.length){ toast("That recording is still uploading. Try again in a moment."); return; }
      isGroup = shareable.length > 1;
      items = shareable.map(PublicShare.toPublicNote);     // preview only: pictures are already loaded on this device
      try{ shareInfo = await Stick.share.createSnapshot(activeBoardId, shareable.map(function(n){ return n.id; }), name, ident); link = shareInfo.url; }
      catch(e){ var se = Stick.errors.parse(e); toast(se.code === "FORBIDDEN" ? "You don't have permission to share from this board." : "Couldn't create a share link for that."); return; }
    } else {
      items = await PublicShare.prepare(shareable.map(PublicShare.toPublicNote));
      var payload = isGroup ? {v:2, byName:name, notes:items} : Object.assign({v:2, byName:name}, items[0]);
      try{ link = await PublicShare.createLink(isGroup ? "group" : "note", payload); }
      catch(e){ toast("Couldn't create a share link for that."); return; }
    }
    var msg;
    if(isGroup){
      msg = "Check out these " + shareable.length + " items by " + name + ". Click to view: " + link;
    } else {
      var plain = itemText(shareable[0]);
      var short = plain.replace(/\s+/g, " ").slice(0, 80);
      msg = "Check out this " + (isPhoto(shareable[0]) ? "photo" : isAV(shareable[0]) ? itemWord(shareable) : "sticky note") + " by " + name + (short ? ": \"" + short + (plain.length > 80 ? "…" : "") + "\"" : "") + ". Click to view: " + link;
    }
    var skipped = list.length - shareable.length;

    var content = document.createElement("div");
    var previewBox = makeDiv("sharePreview");
    var arr = buildArrangement(items, 330, 230);
    previewBox.appendChild(arr.el);
    content.appendChild(previewBox);
    var msgBox = makeDiv("shareMsg");
    msgBox.textContent = msg;
    content.appendChild(msgBox);
    var copyMsg = document.createElement("button");
    copyMsg.className = "guestBtn copyBtn";
    copyMsg.style.cssText = "background:var(--accent-strong);color:var(--on-accent);border-color:var(--accent-strong);";
    copyMsg.textContent = "Copy message";
    content.appendChild(copyMsg);
    var copyLink = document.createElement("button");
    copyLink.className = "acctBack";
    copyLink.style.cssText = "display:block;text-align:center;width:100%;margin:12px 0 0;";
    copyLink.textContent = "Just copy the link";
    content.appendChild(copyLink);
    var fine = document.createElement("p");
    fine.className = "shareFine";
    fine.className = "shareFine big";
    var lead = document.createElement("strong");
    lead.textContent = "Anyone with the link can view " + (isGroup ? "these items" : "this") + ", no account needed. ";
    fine.appendChild(lead);
    fine.appendChild(document.createTextNode("Shared links don't expire, so think of it like handing over a paper note: once it's sent, they can keep it." +
      (cloudShare ? " It's a frozen copy: changing the original later won't change what they see." : "") +
      (isGroup ? " Only the selected items are included, never the rest of your board." : "") +
      (skipped - avLeft > 0 ? " (" + (skipped - avLeft) + " empty note" + (skipped - avLeft > 1 ? "s were" : " was") + " left out.)" : "") +
      (avLeft ? (cloudShare ? " (" + avLeft + " recording" + (avLeft > 1 ? "s" : "") + " still uploading " + (avLeft > 1 ? "were" : "was") + " left out.)" : " Voice memos and videos stay on this device for now, so they aren't included.") : "") +
      (!cloudShare && link.length > 12000 ? " Photos make the link long; a few apps may cut it short." : "")));
    content.appendChild(fine);
    if(shareInfo){
      var off = document.createElement("button");
      off.className = "acctBack";
      off.style.cssText = "display:block;text-align:center;width:100%;margin:10px 0 0;color:var(--danger);";
      off.textContent = "Turn this link off";
      off.addEventListener("click", function(){
        Stick.share.disable(shareInfo.id).then(function(){ off.textContent = "\u2713 Link turned off"; off.disabled = true; toast("That link no longer works."); })
          .catch(function(){ toast("Couldn't turn it off. Try again."); });
      });
      content.appendChild(off);
    }

    openModal({
      title: isGroup ? "Share " + shareable.length + " notes" : "Share this note",
      sub: "Here\u2019s what they\u2019ll see:",
      content: content
    });
    setTimeout(arr.fit, 0);
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(arr.fit);
    copyMsg.addEventListener("click", async function(){
      if(await copyText(msg)) flashCopied(copyMsg, "Copied!");
      else toast("Couldn't copy automatically. Select the text above.");
    });
    copyLink.addEventListener("click", async function(){
      if(await copyText(link)){
        copyLink.textContent = "\u2713 Link copied";
        clearTimeout(copyLink._t);
        copyLink._t = setTimeout(function(){ copyLink.textContent = "Just copy the link"; }, 1500);
      } else toast("Couldn't copy automatically.");
    });
  }

  // Public page for a shared note or group: minimal, just the paper.
  function publicShell(){
    document.querySelector(".topbar").style.display = "none";
    board.style.display = "none";
    minimap.style.display = "none";
    hint.style.display = "none";
    shareBanner.hidden = true;
    var wrap = document.createElement("div");
    wrap.style.cssText = "min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:32px 20px;text-align:center;";
    document.body.appendChild(wrap);
    document.body.appendChild(legalLinksEl("legalFoot fixed"));
    var sk = document.getElementById("skipLink"); if(sk) sk.remove();     // there is no board to skip to on a public note page
    return wrap;
  }
  function publicOpenButton(wrap){
    var openBtn = document.createElement("button");
    openBtn.className = "btn primary";
    openBtn.style.width = "auto";
    openBtn.textContent = "Open Stick-It";
    openBtn.addEventListener("click", function(){ location.hash = ""; location.reload(); });
    wrap.appendChild(openBtn);
  }
  // who shared it: name, and (only if the sharer chose to) their photo and bio
  function buildByline(byName, who){
    var box = makeDiv("");
    box.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:6px;";
    var line = makeDiv("");
    line.style.cssText = "display:flex;align-items:center;gap:8px;";
    if(who && who.avatarUrl){
      var av = makeDiv("acctAv");
      av.style.cssText = "width:30px;height:30px;";
      paintAvatar(av, {name: byName, source: "none", url: who.avatarUrl});
      line.appendChild(av);
    }
    var t = document.createElement("span");
    t.className = "muted";
    t.textContent = "Shared by " + (byName ? String(byName).slice(0, 60) : "someone");
    line.appendChild(t);
    box.appendChild(line);
    if(who && who.bio){
      var b = document.createElement("span");
      b.className = "muted"; b.style.cssText = "font-size:0.8rem;max-width:420px;"; b.dir = "auto";
      b.textContent = String(who.bio).slice(0, 120);
      box.appendChild(b);
    }
    return box;
  }
  function renderPublicViewItems(items, byName, token, who){
    var wrap = publicShell();
    if(!items.length){ wrap.innerHTML = '<p class="muted">This link looks broken or incomplete.</p>'; return; }
    wrap.appendChild(buildByline(byName, who));
    var arr = buildArrangement(items, Math.min(window.innerWidth - 40, 1100), Math.max(260, window.innerHeight - 200));
    wrap.appendChild(arr.el);
    setTimeout(arr.fit, 0);
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(arr.fit);
    window.addEventListener("resize", arr.fit);
    publicOpenButton(wrap);
    if(token && window.Stick){
      var rep = document.createElement("button");
      rep.className = "acctBack"; rep.style.margin = "0"; rep.textContent = "Report this content";
      rep.addEventListener("click", function(){ Stick.share.report(token).then(function(){ rep.textContent = "Report sent"; rep.disabled = true; }); });
      wrap.appendChild(rep);
    }
  }
  async function renderPublicView(hash){
    var isGroup = /^#sg=/.test(hash);
    var data = await decodeStateAny(hash.replace(/^#s[ng]=/, ""));
    var items = data ? (isGroup ? (Array.isArray(data.notes) ? data.notes : []) : [data]) : [];
    items = items.slice(0, 60).map(function(it){
      var n = normalizeIncoming(it);
      if(!n) return null;
      if(!n.phys) n.phys = isPhoto(n) ? makePhotoPhys(seededRng(hashStr(String(it.image || "").slice(-200)))) : makePhys(seededRng(hashStr(JSON.stringify([it.bg, it.rot, it.html]).slice(0, 200))));
      return n;
    }).filter(Boolean);
    renderPublicViewItems(items, data && data.byName, null);
  }

  // ---- new short links (#s=<token>): resolved by the server, no account needed ----
  function cloudShareObject(o){
    var img = o.image, mu = o.mediaUrl, cu = o.cutout;
    var c = cloudSanitize(o);
    if(!c) return null;
    if(typeof cu === "string" && /^https?:\/\//.test(cu)) c.cutout = cu;
    if(c.type === "postcard" && typeof img === "string" && /^https?:\/\//.test(img)) c.image = img;
    if(c.type === "photo_strip" && Array.isArray(o.frames) && Array.isArray(c.frames)){
      c.frames = c.frames.map(function(f){ var of = o.frames.filter(function(x){ return x && x.assetId === f.assetId; })[0], src = of && of.image; if(typeof src === "string" && /^https?:\/\//.test(src)) f.image = src; return f; });
    }
    if(typeof img === "string" && /^https?:\/\//.test(img)) c.image = img;       // signed URLs from the resolver only
    if(typeof mu === "string" && /^https?:\/\//.test(mu)) c.mediaUrl = mu;
    delete c.mediaId;                                                              // a device-local key means nothing here
    return c;
  }
  // The page shown when a shared link can't be opened. The words say what is true (gone, never existed, server trouble, no connection);
  // a short code under them helps when someone reports it, and never carries anything internal.
  var SHARE_WORDS = {
    network: "We couldn’t reach Stick-It. Check your connection and try again.",
    server: "Stick-It couldn’t open this board right now. Try again in a moment.",
    revoked: "This shared link is no longer available.",
    not_found: "We couldn’t find this shared board.",
    signin: "This board is only shared with invited people. Sign in to continue.",
    rate_limited: "Too many tries. Please wait a minute, then try again.",
    broken: "This link looks broken or incomplete."
  };
  function shareUnavailable(kind, opts){
    opts = opts || {};
    var wrap = opts.wrap || publicShell();
    wrap.innerHTML = "";
    var p = document.createElement("p"); p.className = "muted"; p.setAttribute("role", "alert"); p.textContent = SHARE_WORDS[kind] || SHARE_WORDS.server; wrap.appendChild(p);
    if(opts.code){ var c = document.createElement("p"); c.className = "muted"; c.style.cssText = "font-size:0.72rem;margin:-8px 0 0;opacity:0.75;"; c.textContent = "Code: " + opts.code; wrap.appendChild(c); }
    var row = document.createElement("div"); row.style.cssText = "display:flex;gap:10px;flex-wrap:wrap;justify-content:center;";
    if(opts.retry){
      var again = document.createElement("button"); again.className = "btn primary"; again.style.width = "auto"; again.textContent = "Try again";
      again.addEventListener("click", function(){ opts.retry(wrap); });
      row.appendChild(again);
    }
    wrap.appendChild(row);
    var openBtn = document.createElement("button");
    openBtn.className = opts.retry ? "btn" : "btn primary"; openBtn.style.width = "auto"; openBtn.textContent = "Open Stick-It";
    openBtn.addEventListener("click", function(){ location.hash = ""; location.reload(); });
    row.appendChild(openBtn);
    var first = row.querySelector("button"); if(first) setTimeout(function(){ try{ first.focus(); }catch(e){} }, 0);
  }
  function sharerOf(res){
    var av = res.by_avatar && res.assets && res.assets[res.by_avatar];
    return {bio: res.by_bio || "", avatarUrl: av && av.url ? av.url : ""};
  }
  function cloudShareBoot(){
    var token = window.Stick && Stick.share.tokenFromHash(location.hash);
    shareBanner.hidden = false; copyToMineBtn.hidden = true;
    shareBannerText.textContent = "Opening shared board\u2026";
    if(!token || !CLOUD_OK){ shareUnavailable("broken"); return; }
    var last = "";
    function paintLive(res){
      var objs = Stick.share.toClientObjects(res).map(cloudShareObject).filter(Boolean);
      var sig = JSON.stringify(res.objects) + Object.keys(res.assets || {}).join();
      if(sig === last) return;
      last = sig;
      notes.forEach(function(n){ if(n.el) n.el.remove(); });
      notes = [];
      objs.forEach(function(n, i){ n.id = "s" + i; if(!n.z) n.z = i + 1; if(!n.phys) ensurePhys(n); notes.push(n); renderNote(n, false); });
      ensureWidth(); updateMinimap();
    }
    var resolving = false, errWrap = null;
    function attempt(wrap){
      if(resolving) return;                                       // one request at a time, however often it is clicked
      resolving = true; if(wrap) errWrap = wrap;
      if(wrap){ wrap.innerHTML = '<p class="muted" role="status" aria-live="polite" style="display:flex;align-items:center;gap:8px;">' + miniLoaderHtml() + "<span>Opening shared board…</span></p>"; }
      Stick.share.resolve(token).then(function(res){ resolving = false; handleResolved(res); }, function(){ resolving = false; handleResolved({ok: false, kind: "network", status: 0}); });
    }
    function problem(res){
      var kind = res.kind || "not_found";
      var recoverable = kind === "network" || kind === "server" || kind === "rate_limited";
      try{ console.warn("Stick-It share could not be opened:", kind, res.status || "", res.reason || ""); }catch(e){}
      shareUnavailable(kind, {wrap: errWrap, retry: recoverable ? attempt : null, code: res.timedOut ? "timeout" : (res.status ? String(res.status) : (kind === "network" ? "network" : ""))});
    }
    attempt(null);
    function handleResolved(res){
      if(!res.ok){ problem(res); return; }
      if(res.type !== "board_live"){
        var objs = Stick.share.toClientObjects(res).map(cloudShareObject).filter(Boolean);
        objs.forEach(function(n){ if(!n.phys) n.phys = isPhoto(n) ? makePhotoPhys() : isAV(n) ? {} : makePhys(); });
        renderPublicViewItems(objs, res.by_name, token, sharerOf(res));
        return;
      }
      document.body.appendChild(legalLinksEl("legalFoot fixed"));
      shareBannerText.textContent = (res.board && res.board.name ? "\u201c" + res.board.name + "\u201d" : "A shared board") + " \u00b7 shared by " + (res.by_name || "someone") + " \u00b7 view only" + (res.by_bio ? " \u00b7 " + String(res.by_bio).slice(0, 120) : "");
      var sh = sharerOf(res);
      if(sh.avatarUrl){
        var bav = makeDiv("acctAv"); bav.style.cssText = "width:24px;height:24px;margin-right:8px;";
        paintAvatar(bav, {name: res.by_name, source: "none", url: sh.avatarUrl});
        shareBanner.insertBefore(bav, shareBanner.firstChild);
      }
      var rep = document.createElement("button");
      rep.className = "pillBtn"; rep.textContent = "Report";
      rep.addEventListener("click", function(){ Stick.share.report(token).then(function(){ rep.textContent = "Report sent"; rep.disabled = true; }); });
      shareBanner.appendChild(rep);
      paintLive(res);
      setInterval(function(){                                          // it's a live link: pick up the owner's changes
        if(document.visibilityState === "hidden") return;
        Stick.share.resolve(token).then(function(r2){ if(r2.ok && r2.type === "board_live") paintLive(r2); else if(!r2.ok && (r2.kind === "revoked" || r2.kind === "not_found")) location.reload(); });
      }, 30000);
    }
  }

  // ---------- board: click to stick, drag a box to select ----------
  var suppressBoardClick = false;
  if(!readOnly){
    var lastBoardPointer = "mouse";
    boardInner.addEventListener("pointerdown", function(e){ if(e.target === boardInner) lastBoardPointer = e.pointerType || "mouse"; }, true);
    function noteAtEvent(e){
      var rect = boardInner.getBoundingClientRect();
      addNoteAt((e.clientX - rect.left) / boardZoom, (e.clientY - rect.top) / boardZoom);
    }
    boardInner.addEventListener("click", function(e){
      if(e.target !== boardInner) return;
      if(suppressBoardClick){ suppressBoardClick = false; return; }
      if(e.ctrlKey || e.metaKey || e.shiftKey) return;
      var touchLike = lastBoardPointer === "touch" || lastBoardPointer === "pen";
      if(selected.size > 1){ clearSelection(); return; }
      if(!touchLike){ clearSelection(); endEditing(); return; }
      // touch: the first tap just puts down whatever you were holding (keyboard, selection);
      // a tap on a clear desk opens the capture menu
      var busy = selected.size > 0 || isTyping() || Date.now() - captureClosedAt < 450;
      clearSelection();
      endEditing();
      if(busy) return;
      var rect = boardInner.getBoundingClientRect();
      openCaptureMenu(e.clientX, e.clientY, (e.clientX - rect.left) / boardZoom, (e.clientY - rect.top) / boardZoom);
    });
    // long-press on empty board: a sticky straight away (a shortcut; the menu stays the main way)
    var pressT = null, pressStart = null;
    boardInner.addEventListener("pointerdown", function(e){
      if(e.target !== boardInner || e.pointerType !== "touch") return;
      pressStart = {x:e.clientX, y:e.clientY};
      clearTimeout(pressT);
      pressT = setTimeout(function(){
        pressT = null;
        closeCaptureMenu();
        suppressBoardClick = true;
        setTimeout(function(){ suppressBoardClick = false; }, 700);
        if(navigator.vibrate) try{ navigator.vibrate(12); }catch(err){}
        var rect = boardInner.getBoundingClientRect();
        addNoteAt((pressStart.x - rect.left) / boardZoom, (pressStart.y - rect.top) / boardZoom);
      }, 550);
    });
    boardInner.addEventListener("pointermove", function(e){
      if(pressT && pressStart && Math.abs(e.clientX - pressStart.x) + Math.abs(e.clientY - pressStart.y) > 10){ clearTimeout(pressT); pressT = null; }
    });
    ["pointerup", "pointercancel"].forEach(function(t){ boardInner.addEventListener(t, function(){ clearTimeout(pressT); pressT = null; }); });
    // Desktop: right-click on empty board = insertion menu; on an object = that object's own menu. Text being edited keeps the
    // browser's native menu (spelling, paste), and touch devices keep their tap menu.
    boardInner.addEventListener("contextmenu", function(e){
      if(COARSE && (e.pointerType === "touch" || lastBoardPointer === "touch")){ if(e.target === boardInner) e.preventDefault(); return; }
      if(e.shiftKey) return;                                                // Shift+right-click: the browser's own menu, always available
      if(e.target.closest && e.target.closest("[contenteditable=true], input, textarea, a[href]")) return;
      if(e.target === boardInner){
        e.preventDefault(); endEditing(); clearSelection();
        var r = boardInner.getBoundingClientRect();
        openInsertMenu(e.clientX, e.clientY, (e.clientX - r.left) / boardZoom, (e.clientY - r.top) / boardZoom);
        return;
      }
      var host = e.target.closest ? e.target.closest(".note, .photoObj, .boardObj") : null;
      var n = host && host.dataset.id ? findNote(host.dataset.id) : null;
      if(!n) return;
      e.preventDefault(); endEditing();
      openObjectContextMenu(n, e.clientX, e.clientY);
    });
    // keyboard access to the same menu: Shift+F10 / the Menu key on the board
    boardInner.addEventListener("keydown", function(e){
      if(!(e.key === "ContextMenu" || (e.shiftKey && e.key === "F10"))) return;
      if(e.target !== boardInner) return;
      e.preventDefault();
      var r = boardInner.getBoundingClientRect(), vc = viewCenter();
      openInsertMenu(r.left + r.width / 2, r.top + r.height / 3, vc.x, vc.y);
    });
    boardInner.addEventListener("dragover", function(e){
      if(e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") !== -1){ e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }
    });
    boardInner.addEventListener("drop", function(e){
      var files = e.dataTransfer ? Array.prototype.filter.call(e.dataTransfer.files || [], function(f){ return f.type.indexOf("image/") === 0; }) : [];
      if(!files.length) return;
      e.preventDefault();
      var rect = boardInner.getBoundingClientRect();
      dropPhotoFiles(files.slice(0, 12), (e.clientX - rect.left) / boardZoom, (e.clientY - rect.top) / boardZoom);
    });
    boardInner.addEventListener("dblclick", function(e){
      if(e.target !== boardInner || suppressBoardClick) return;
      if(e.ctrlKey || e.metaKey || e.shiftKey) return;
      if(lastBoardPointer === "touch" || lastBoardPointer === "pen") return;
      noteAtEvent(e);
    });
    boardInner.addEventListener("pointerdown", function(e){
      if(e.target !== boardInner || e.button !== 0 || e.pointerType !== "mouse") return;
      var r0 = boardInner.getBoundingClientRect();
      var sx = (e.clientX - r0.left) / boardZoom, sy = (e.clientY - r0.top) / boardZoom;
      var base = (e.ctrlKey || e.metaKey || e.shiftKey) ? Array.from(selected) : [];
      var box = null;
      function move(ev){
        var r = boardInner.getBoundingClientRect();
        var cx = (ev.clientX - r.left) / boardZoom, cy = (ev.clientY - r.top) / boardZoom;
        if(!box){
          if(Math.abs(cx - sx) + Math.abs(cy - sy) < 8 / boardZoom) return;
          box = makeDiv("marquee");
          boardInner.appendChild(box);
          document.body.style.userSelect = "none";
          if(document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur();
          closeFloatingPopovers();
        }
        var x1 = Math.min(sx, cx), y1 = Math.min(sy, cy), x2 = Math.max(sx, cx), y2 = Math.max(sy, cy);
        box.style.left = x1 + "px"; box.style.top = y1 + "px";
        box.style.width = (x2 - x1) + "px"; box.style.height = (y2 - y1) + "px";
        var hit = notes.filter(function(n){
          if(!n.el) return false;
          var w = n.w || NOTE_W, h = n.el.offsetHeight || NOTE_H;
          return n.x < x2 && n.x + w > x1 && n.y < y2 && n.y + h > y1;
        }).map(function(n){ return n.id; });
        setSelection(base.concat(hit.filter(function(id){ return base.indexOf(id) === -1; })));
      }
      function up(){
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        if(box){
          box.remove();
          document.body.style.userSelect = "";
          suppressBoardClick = true;
          setTimeout(function(){ suppressBoardClick = false; }, 350);
        }
      }
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    });
  }

  board.addEventListener("wheel", function(e){
    if(Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
    var t = e.target.closest && e.target.closest(".note > .text");
    if(t && t.parentNode.classList.contains("capped")){
      var atTop = t.scrollTop <= 0, atBottom = t.scrollTop + t.clientHeight >= t.scrollHeight - 1;
      if((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) return; // native scroll inside the note
    }
    board.scrollLeft += e.deltaY;
    e.preventDefault();
    dismissHint();
  }, {passive:false});

  var viewSaveT = null;
  function saveBoardView(){
    if(readOnly || singleNoteMode || !activeBoardId) return;
    clearTimeout(viewSaveT);
    viewSaveT = setTimeout(function(){ safeSet(boardViewKey(activeBoardId), {cx:viewCenter().x}); }, 300);
  }
  board.addEventListener("scroll", function(){ if(board.scrollTop && boardZoom <= 1) board.scrollTop = 0; dismissHint(); closeCaptureMenu(); updateMinimapViewport(); closeFloatingPopovers(); hideLinkCard(); saveBoardView(); scheduleViewCheckpoint(); }, {passive:true});

  // ---------- search ----------
  // search sees hidden members too: a pile lights up when any paper inside it matches
  function pileSearchHits(q){
    var hits = {};
    notes.forEach(function(p){
      if(!isPileObj(p)) return;
      var c = 0;
      pileLive(p).forEach(function(m){ if(String(itemText(m) || "").toLowerCase().indexOf(q) !== -1) c++; });
      if(c) hits[p.id] = c;
    });
    return hits;
  }
  function runSearch(){
    var q = searchInput.value.trim().toLowerCase();
    decor.search.clear();
    var pileHits = q ? pileSearchHits(q) : {};
    notes.forEach(function(n){
      if(isPileObj(n)){ if(n.el){ var hit = !q || !!pileHits[n.id]; n.el.style.opacity = hit ? "" : "0.15"; n.el.style.pointerEvents = hit ? "" : "none"; n.el.classList.toggle("pileHit", !!q && !!pileHits[n.id]); n.el.title = q && pileHits[n.id] ? pileHits[n.id] + " match" + (pileHits[n.id] > 1 ? "es" : "") + " inside this pile. Click to select it, or open it." : ""; } return; }
      if(!n.el) return;
      if(!q || isZone(n)){ n.el.style.opacity = ""; n.el.style.pointerEvents = ""; return; }
      if(isPaper(n) && !n.textEl){ var pHit = Stick.objects.text(n).toLowerCase().indexOf(q) !== -1; n.el.style.opacity = pHit ? "1" : "0.15"; n.el.style.pointerEvents = pHit ? "" : "none"; return; }
      var searchable = n.textEl || n.captionEl;
      if(!searchable){ n.el.style.opacity = "0.15"; n.el.style.pointerEvents = "none"; return; }
      var idx = textIndex(searchable);
      var hay = idx.text.toLowerCase();
      var match = hay.indexOf(q) !== -1;
      n.el.style.opacity = match ? "1" : "0.15";
      n.el.style.pointerEvents = match ? "" : "none";
      if(match){
        var list = [], from = 0, at;
        while((at = hay.indexOf(q, from)) !== -1 && list.length < 50){
          var r = rangeFor(idx, at, at + q.length);
          if(r) list.push(r);
          from = at + q.length;
        }
        decor.search.set(n.id, list);
      }
    });
    syncHighlight("search");
  }
  function clearSearch(){
    if(!searchInput.value) return;
    searchInput.value = "";
    runSearch();
  }
  searchInput.addEventListener("input", runSearch);
  // phones: Search is a small icon that opens a full-width field over the header, and Cancel puts the header back
  (function(){
    var tgl = document.getElementById("searchToggle"), cancel = document.getElementById("searchCancel");
    if(!tgl || !cancel) return;
    function setOpen(on){
      document.body.classList.toggle("searchOpen", on); tgl.setAttribute("aria-expanded", on ? "true" : "false");
      if(on) setTimeout(function(){ searchInput.focus(); }, 0);
      else { clearSearch(); searchInput.blur(); tgl.focus(); }
    }
    tgl.addEventListener("click", function(){ setOpen(true); });
    cancel.addEventListener("click", function(){ setOpen(false); });
    searchInput.addEventListener("keydown", function(e){ if(e.key === "Escape" && !searchInput.value && document.body.classList.contains("searchOpen")) setOpen(false); });
    window.matchMedia && matchMedia("(min-width: 601px)").addEventListener && matchMedia("(min-width: 601px)").addEventListener("change", function(m){ if(m.matches) document.body.classList.remove("searchOpen"); });
  })();
  searchInput.addEventListener("keydown", function(e){ if(e.key === "Escape"){ clearSearch(); searchInput.blur(); } });

  // ---------- settings & share panels ----------
  function closeOtherPanels(except){
    if(except !== panel && !panel.hidden) cancelSettings();
    [sharePanel, boardPanel].forEach(function(p){ if(p !== except) p.hidden = true; });
    closeAccountModal();
  }
  // Preferences changed in Settings are previewed live but only kept on Save;
  // Cancel (or closing the dialog) puts back what was there when it opened.
  // Clear board and Import are separate, immediate actions with their own confirmation.
  var STAGED_KEYS = ["lockFont","fontName","theme","cleanupEmpty","displayName","soundOn","soundVolume","shadow","paper","tilt","attach","dots","compact","reduceMotion","highContrast"];
  // ---------- look and feel: a few honest controls, previewed live, kept on Save ----------
  // shadow 0|1|2 (soft, normal, strong), paper 0|1|2 (off, light, normal), tilt 0|1|2 (straight, gentle, natural: for NEW notes),
  // attach "mixed"|"tape"|"pin" (for NEW notes), dots, compact, reduceMotion and highContrast (the last two are shared with the legal
  // pages through js/a11y.js).
  function lookDefaults(){ return {shadow: 1, paper: 2, tilt: 2, attach: "mixed", dots: true, compact: false}; }       // a function, so it works before this section has run
  function lookVal(k){ return settings[k] === undefined ? lookDefaults()[k] : settings[k]; }
  function reducedMotion(){
    return !!((window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) || document.documentElement.getAttribute("data-a11y-motion") === "reduce");
  }
  function applyLook(){
    var b = document.body, sh = lookVal("shadow"), px = lookVal("paper");
    b.classList.toggle("sh-soft", sh === 0); b.classList.toggle("sh-strong", sh === 2);
    b.classList.toggle("px-off", px === 0); b.classList.toggle("px-light", px === 1);
    b.classList.toggle("no-dots", !lookVal("dots")); b.classList.toggle("compact", !!lookVal("compact"));
    var h = document.documentElement;
    if(settings.reduceMotion) h.setAttribute("data-a11y-motion", "reduce"); else h.removeAttribute("data-a11y-motion");
    if(settings.highContrast) h.setAttribute("data-a11y-contrast", "on"); else h.removeAttribute("data-a11y-contrast");
  }
  function tiltFactor(){ return [0, 0.5, 1][lookVal("tilt")] === undefined ? 1 : [0, 0.5, 1][lookVal("tilt")]; }
  function makeNotePhys(){
    var p = makePhys(), a = lookVal("attach");
    if(a === "tape"){ p.pin = false; if(!p.tape) p.tape = 1 + Math.floor(Math.random() * 5); }
    else if(a === "pin"){ p.pin = true; p.tape = 0; }
    return p;
  }
  // a small radio group made of buttons (arrow keys move, like a real radio group)
  function segControl(box, label, options, get, set){
    box.className = "segCtl"; box.setAttribute("role", "radiogroup"); box.setAttribute("aria-label", label);
    function paint(){
      box.innerHTML = "";
      options.forEach(function(o){
        var b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "radio"); b.textContent = o[1];
        var on = String(get()) === String(o[0]); b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1; b.className = on ? "on" : "";
        b.addEventListener("click", function(){ set(o[0]); paint(); });
        b.addEventListener("keydown", function(e){
          var i = options.findIndex(function(x){ return String(x[0]) === String(get()); }), j = i;
          if(e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % options.length; else if(e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i + options.length - 1) % options.length; else return;
          e.preventDefault(); set(options[j][0]); paint(); var nb = box.querySelector('[aria-checked="true"]'); if(nb) nb.focus();
        });
        box.appendChild(b);
      });
    }
    paint();
  }
  function buildLookSection(cc, pane){
    var sec = document.createElement("section"); sec.className = "setSec"; sec.id = "secLook";
    sec.innerHTML = '<h4>Paper &amp; canvas</h4>' +
      '<div class="setRow"><span class="lbl">Note shadows<small>How much each note lifts off the board.</small></span><div id="lkShadow"></div></div>' +
      '<div class="setRow"><span class="lbl">Paper texture<small>The faint grain and creases on notes.</small></span><div id="lkPaper"></div></div>' +
      '<div class="setRow"><span class="lbl">New note tilt<small>How crooked new notes land. Existing notes stay as they are.</small></span><div id="lkTilt"></div></div>' +
      '<div class="setRow"><span class="lbl">Tape or pin<small>What holds new notes up.</small></span><div id="lkAttach"></div></div>' +
      '<div class="setRow"><label class="lbl" for="lkDots">Canvas dots<small>The faint dot grid behind the notes.</small></label><button class="switch" id="lkDots" role="switch" aria-checked="true"></button></div>' +
      '<div class="setRow"><label class="lbl" for="lkCompact">Compact controls<small>Smaller buttons in the top bar.</small></label><button class="switch" id="lkCompact" role="switch" aria-checked="false"></button></div>' +
      '<div class="setRow"><label class="lbl" for="lkMotion">Reduce decorative motion<small>No swaying, bobbing or sliding. Also used on the legal pages.</small></label><button class="switch" id="lkMotion" role="switch" aria-checked="false"></button></div>' +
      '<div class="setRow"><label class="lbl" for="lkContrast">High-contrast text<small>Darker ink and stronger outlines. Also used on the legal pages.</small></label><button class="switch" id="lkContrast" role="switch" aria-checked="false"></button></div>';
    pane.appendChild(sec);
    var q = function(id){ return sec.querySelector("#" + id); };
    segControl(q("lkShadow"), "Note shadows", [[0, "Soft"], [1, "Normal"], [2, "Strong"]], function(){ return lookVal("shadow"); }, function(v){ settings.shadow = Number(v); applyLook(); });
    segControl(q("lkPaper"), "Paper texture", [[0, "Off"], [1, "Light"], [2, "Normal"]], function(){ return lookVal("paper"); }, function(v){ settings.paper = Number(v); applyLook(); });
    segControl(q("lkTilt"), "New note tilt", [[0, "Straight"], [1, "Gentle"], [2, "Natural"]], function(){ return lookVal("tilt"); }, function(v){ settings.tilt = Number(v); });
    segControl(q("lkAttach"), "Tape or pin", [["mixed", "Mixed"], ["tape", "Tape"], ["pin", "Pin"]], function(){ return lookVal("attach"); }, function(v){ settings.attach = v; });
    function sw(id, key, getv){
      var b = q(id); syncSwitch(b, getv());
      b.addEventListener("click", function(){ settings[key] = !getv(); syncSwitch(b, getv()); applyLook(); });
    }
    sw("lkDots", "dots", function(){ return !!lookVal("dots"); });
    sw("lkCompact", "compact", function(){ return !!lookVal("compact"); });
    sw("lkMotion", "reduceMotion", function(){ return !!settings.reduceMotion; });
    sw("lkContrast", "highContrast", function(){ return !!settings.highContrast; });
  }


  var settingsSnapshot = null;
  function applySettingsUI(){
    document.body.classList.toggle("dark", settings.theme === "dark"); mirrorTheme();
    applyLook();
    syncSwitch(darkToggle, settings.theme === "dark");
    syncSwitch(lockToggle, !!settings.lockFont);
    syncSwitch(cleanupToggle, !!settings.cleanupEmpty);
    document.getElementById("fontPickRow").hidden = !settings.lockFont;
    fontSelect.value = settings.fontName;
    displayNameInput.value = (CLOUD && settings.account) ? (settings.account.name || "") : (settings.displayName || "");
    var moved = !!(CLOUD && settings.account);      // identity belongs to Account settings, this dialog is about this device
    document.getElementById("acctNameNote").hidden = !moved;
    document.querySelector('label[for="displayNameInput"]').hidden = moved;
    displayNameInput.hidden = moved;
    displayNameInput.nextElementSibling.hidden = moved;
  }
  function openSettings(section){ openControlCenter(section || "appearance"); }
  function cancelSettings(){
    if(settingsSnapshot){
      STAGED_KEYS.forEach(function(k){ settings[k] = settingsSnapshot[k]; });
      settingsSnapshot = null;
      applySettingsUI();
    }
    panel.hidden = true;
  }
  function closeSettings(){ if(CC) closeAccountModal(); else cancelSettings(); }
  gearBtn.addEventListener("click", function(){
    if(CC) closeAccountModal(); else openControlCenter("appearance");
    gearBtn.classList.remove("spin");
    void gearBtn.offsetWidth;
    gearBtn.classList.add("spin");
  });
  panel.hidden = true;                      // the old Settings dialog is only a holder now: its sections are shown inside the Control Center
  // ---------- Control Center: one place for account, appearance, sharing, privacy & data, sounds, shortcuts and legal ----------
  // One dialog, one footer. Sections are described in CC_SECTIONS; a section may build itself lazily the first time it is shown.
  // Changes to settings and to the profile are staged: Save keeps them, Cancel (or closing) drops them. Export, Sign out, Delete
  // account and the like stay immediate and never wait for Save.
  var CC = null;
  var CC_SECTIONS = [
    {id: "account", label: "Account", icon: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'},
    {id: "appearance", label: "Appearance", icon: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/>'},
    {id: "sharing", label: "Sharing", icon: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.6l6.8-4.2M8.6 13.4l6.8 4.2"/>'},
    {id: "privacy", label: "Privacy & Data", icon: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/>'},
    {id: "sounds", label: "Sounds", icon: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>', build: buildSoundsPane},
    {id: "shortcuts", label: "Shortcuts", icon: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7 14h10"/>', footer: false, build: buildShortcutsPane},
    {id: "legal", label: "Legal & About", icon: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>', footer: false, build: buildLegalPane}
  ];
  function ccSignedIn(){ return !!(settings.account && CLOUD && window.Stick && Stick.account); }
  function openControlCenter(section){
    var want = CC_SECTIONS.some(function(x){ return x.id === section; }) ? section : "account";
    if(CC && acctBackdrop && acctBackdrop === CC.backdrop){ CC.show(want); return CC; }
    var opener = document.activeElement;
    closeOtherPanels(null); closeFloatingPopovers(); closeAccountModal();
    acctOpener = opener;
    var backdrop = makeDiv("acctBackdrop ccBackdrop"), card = makeDiv("acctCard acctWide ccCard");
    card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "true"); card.setAttribute("aria-labelledby", "ccTitle"); card.tabIndex = -1;
    backdrop.appendChild(card); acctBackdrop = backdrop;
    backdrop.addEventListener("mousedown", function(e){ if(e.target === backdrop) closeAccountModal(); });
    card.innerHTML = '<button class="acctClose" id="acctCloseBtn" aria-label="Close settings">' + ICONS.close + '</button>' +
      '<header class="ccHead"><h3 id="ccTitle">Settings</h3></header>' +
      '<div class="ccLayout"><nav class="ccNav" role="tablist" aria-orientation="vertical" aria-label="Settings sections"></nav><div class="ccPanes"></div></div>' +
      '<div class="ccFoot" id="ccFoot"><p class="asErr" id="asErr" role="alert"></p><p class="ccSaved" id="ccSaved" role="status" aria-live="polite"></p><button type="button" class="pillBtn" id="asCancel">Cancel</button><button type="button" class="pillBtn primary" id="asSave">Save</button></div>';
    document.body.appendChild(backdrop);
    document.addEventListener("keydown", acctEscHandler);
    OV.layer("control-center", function(){ closeAccountModal(); }, function(){ return acctBackdrop === backdrop; }).open();
    acctTrapKey = function(e){ if(acctBackdrop === backdrop) trapTab(e, backdrop, card); };
    document.addEventListener("keydown", acctTrapKey, true);

    var nav = card.querySelector(".ccNav"), panesBox = card.querySelector(".ccPanes"), foot = card.querySelector("#ccFoot"), closers = [], moved = [], built = {}, hooks = {}, saved = false;
    var cc = CC = {backdrop: backdrop, card: card, panes: {}, tabs: {}, active: null, accountSave: null, focusProfile: null,
      onClose: function(fn){ closers.push(fn); },
      // Save keeps the dialog open on the same section: the saved values become the new baseline for Cancel, and a small "Saved" shows.
      markSaved: function(){
        saveSettings(); settingsSnapshot = {}; STAGED_KEYS.forEach(function(k){ settingsSnapshot[k] = settings[k]; });
        if(window.StickA11y){ StickA11y.set({motion: settings.reduceMotion ? "reduce" : "system", contrast: !!settings.highContrast}); }
        var ok = card.querySelector("#ccSaved"), btn = card.querySelector("#asSave");
        if(ok){ ok.textContent = "✓ Saved"; clearTimeout(cc._okT); cc._okT = setTimeout(function(){ ok.textContent = ""; }, 2600); }
        if(btn){ btn.disabled = false; btn.textContent = "Save"; }
      },
      adopt: function(el, pane){ if(!el) return; moved.push({el: el, home: el.parentNode}); pane.appendChild(el); },
      once: function(id, fn){ (hooks[id] = hooks[id] || []).push(fn); },
      show: show,
      teardown: function(){
        closers.forEach(function(fn){ try{ fn(); }catch(e){} });
        if(!saved && settingsSnapshot){ STAGED_KEYS.forEach(function(k){ settings[k] = settingsSnapshot[k]; }); settingsSnapshot = null; applySettingsUI(); }
        moved.forEach(function(m){ if(m.home) m.home.appendChild(m.el); });
        CC = null;
      }};
    CC_SECTIONS.forEach(function(sec){
      var t = document.createElement("button"); t.type = "button"; t.className = "ccTab"; t.id = "cct-" + sec.id; t.setAttribute("role", "tab"); t.setAttribute("aria-controls", "ccp-" + sec.id); t.setAttribute("aria-selected", "false"); t.tabIndex = -1;
      t.innerHTML = '<svg class="ccIc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + sec.icon + '</svg><span></span>';
      t.querySelector("span").textContent = sec.label;
      t.addEventListener("click", function(){ show(sec.id); });
      nav.appendChild(t); cc.tabs[sec.id] = t;
      var p = makeDiv("ccPane"); p.id = "ccp-" + sec.id; p.setAttribute("role", "tabpanel"); p.setAttribute("aria-labelledby", "cct-" + sec.id); p.hidden = true; p.tabIndex = -1;
      panesBox.appendChild(p); cc.panes[sec.id] = p;
    });
    nav.addEventListener("keydown", function(e){
      var ids = CC_SECTIONS.map(function(x){ return x.id; }), i = ids.indexOf(cc.active), j = i;
      if(e.key === "ArrowDown" || e.key === "ArrowRight") j = (i + 1) % ids.length;
      else if(e.key === "ArrowUp" || e.key === "ArrowLeft") j = (i + ids.length - 1) % ids.length;
      else if(e.key === "Home") j = 0; else if(e.key === "End") j = ids.length - 1; else return;
      e.preventDefault(); show(ids[j]); cc.tabs[ids[j]].focus();
    });
    function show(id){
      var sec = CC_SECTIONS.filter(function(x){ return x.id === id; })[0]; if(!sec) return;
      cc.active = id;
      CC_SECTIONS.forEach(function(x){ var on = x.id === id; cc.tabs[x.id].setAttribute("aria-selected", String(on)); cc.tabs[x.id].tabIndex = on ? 0 : -1; cc.panes[x.id].hidden = !on; });
      if(sec.build && !built[id]){ built[id] = true; sec.build(cc, cc.panes[id]); }
      if(hooks[id]){ var hs = hooks[id]; delete hooks[id]; hs.forEach(function(f){ try{ f(); }catch(e){} }); }          // work that only this section needs happens when it is first shown
      foot.hidden = sec.footer === false; card.dataset.section = id;
      var er = card.querySelector("#asErr"); if(er) er.textContent = "";
      panesBox.scrollTop = 0;
    }
    card.querySelector("#acctCloseBtn").addEventListener("click", function(){ closeAccountModal(); });
    card.querySelector("#asCancel").addEventListener("click", function(){ closeAccountModal(); });
    card.querySelector("#asSave").addEventListener("click", function(){
      var okEl = card.querySelector("#ccSaved"); if(okEl) okEl.textContent = "";
      if(cc.accountSave) return cc.accountSave();
      cc.markSaved();
    });

    // ---- fill the sections. The older Settings panel's controls keep their elements (and listeners); they simply move in here.
    settingsSnapshot = {}; STAGED_KEYS.forEach(function(k){ settingsSnapshot[k] = settings[k]; });
    updateCount(); applySettingsUI();
    var signedIn = ccSignedIn();
    cc.adopt(document.getElementById("secAppearance"), cc.panes.appearance);
    buildLookSection(cc, cc.panes.appearance);
    if(!signedIn) cc.adopt(document.getElementById("sharingSec"), cc.panes.sharing);
    if(signedIn) buildAccountParts(cc); else buildGuestAccount(cc, cc.panes.account);
    cc.adopt(document.getElementById("secBoardData"), cc.panes.privacy);
    cc.adopt(document.getElementById("secDanger"), cc.panes.privacy);
    if(!signedIn) cc.panes.privacy.insertBefore(legalPointer(), cc.panes.privacy.firstChild);
    show(want);
    setTimeout(function(){ var t = cc.tabs[cc.active]; if(t && acctBackdrop === backdrop && !card.contains(document.activeElement)) t.focus(); }, 60);
    return cc;
  }
  Stick.hooks = Stick.hooks || {}; Stick.hooks.openSettings = function(section){ return openControlCenter(section); };       // any part of the app can open the Control Center at a section
  function legalPointer(){
    var b = document.createElement("button"); b.type = "button"; b.className = "asAction ccPointer";
    b.innerHTML = '<span class="lbl">Privacy Policy, Terms and notices<small>What Stick-It collects, why, and your choices.</small></span><span class="go" aria-hidden="true">›</span>';
    b.addEventListener("click", function(){ if(CC) CC.show("legal"); });
    return b;
  }
  // the Account section for someone who is not signed in (or has only the older local sign-in)
  function buildGuestAccount(cc, pane){
    var acc = settings.account;
    pane.innerHTML = '<section class="asHero" aria-label="Your profile"><div class="acctAv pic" id="ccGuestPic" role="img" aria-label="Profile picture"></div><div class="asHeroText"><h3 class="asHeroName" id="ccGuestName"></h3><p class="asHeroHandle" id="ccGuestSub"></p></div></section>' +
      '<section class="asCard"><h4>' + (acc ? "Signed in" : "Sign in") + '</h4><p class="asHint" id="ccGuestHint" style="margin-top:0;"></p><div class="setBtns" id="ccGuestBtns"></div></section>';
    var pic = pane.querySelector("#ccGuestPic");
    if(acc && acc.picture){ paintAvatar(pic, {name: acc.name, source: "none", url: acc.picture}); }
    else paintAvatar(pic, {name: acc ? acc.name : getDisplayName(), source: "none"});
    pane.querySelector("#ccGuestName").textContent = acc ? acc.name : "You’re using Stick-It as a guest";
    pane.querySelector("#ccGuestSub").textContent = acc ? (acc.email || "") : "";
    pane.querySelector("#ccGuestSub").hidden = !(acc && acc.email);
    pane.querySelector("#ccGuestHint").textContent = acc ? "Your name and photo show up on anything you share. Your notes themselves live in this browser."
      : (CLOUD_OK ? "Your boards live on this device. Sign in to keep them in your account and use them on your other devices." : "Your boards live on this device.");
    var btns = pane.querySelector("#ccGuestBtns"), b = document.createElement("button"); b.type = "button";
    if(acc){ b.className = "pillBtn danger"; b.textContent = "Sign out"; b.addEventListener("click", function(){ closeAccountModal(); signOut(); }); btns.appendChild(b); }
    else if(CLOUD_OK){ b.className = "pillBtn primary"; b.textContent = "Sign in"; b.addEventListener("click", function(){ closeAccountModal(); openAccountModal(); }); btns.appendChild(b); }
    else pane.querySelector("section.asCard").hidden = true;
  }

  // ---- Sounds: the preference lives here now; the sound library itself comes later
  var SoundFx = (function(){
    var ctx = null;
    function audio(){ if(ctx) return ctx; var C = window.AudioContext || window.webkitAudioContext; if(!C) return null; try{ ctx = new C(); }catch(e){ ctx = null; } return ctx; }
    // one soft paper tap (filtered noise, 90 ms): enough to hear the volume, not a sound design
    function tap(vol){
      var c = audio(); if(!c) return false;
      if(c.state === "suspended") try{ c.resume(); }catch(e){}
      var n = Math.floor(c.sampleRate * 0.09), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for(var i = 0; i < n; i++){ d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.4); }
      var src = c.createBufferSource(); src.buffer = buf;
      var f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1900;
      var g = c.createGain(); g.gain.value = Math.max(0, Math.min(1, vol / 100)) * 0.7;
      src.connect(f); f.connect(g); g.connect(c.destination); src.start();
      return true;
    }
    return {
      enabled: function(){ return settings.soundOn !== false; },
      volume: function(){ return Math.max(0, Math.min(100, Number(settings.soundVolume == null ? 60 : settings.soundVolume))); },
      preview: function(){ return tap(this.volume()); },
      play: function(){ return this.enabled() && this.volume() > 0 ? tap(this.volume()) : false; }
    };
  })();
  function buildSoundsPane(cc, pane){
    pane.innerHTML = '<section class="asCard" aria-labelledby="ccSndH"><h4 id="ccSndH">Sounds</h4>' +
      '<div class="asItem"><label class="lbl" for="sndOn">Sound effects<small>Soft paper sounds for the things you do.</small></label><input type="checkbox" class="asSw" id="sndOn" role="switch"></div>' +
      '<div class="asItem" id="sndVolRow"><label class="lbl" for="sndVol">Volume<small id="sndVolVal"></small></label><input type="range" class="ccRange" id="sndVol" min="0" max="100" step="5"></div>' +
      '<div class="setBtns"><button type="button" class="pillBtn sndPreview" id="sndPreview"><svg class="pvIc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path class="pvA1" d="M16 9.5a3.5 3.5 0 0 1 0 5"/><path class="pvA2" d="M18.6 7a7 7 0 0 1 0 10"/></svg><span class="pvLb">Play a preview</span><span class="pvBar" aria-hidden="true"></span></button></div>' +
      '<p class="asHint">Stick-It doesn’t play sounds yet. This remembers your choice for when it does.</p></section>';
    var on = pane.querySelector("#sndOn"), vol = pane.querySelector("#sndVol"), val = pane.querySelector("#sndVolVal"), prev = pane.querySelector("#sndPreview"), row = pane.querySelector("#sndVolRow");
    function paint(){ on.checked = SoundFx.enabled(); vol.value = String(SoundFx.volume()); vol.disabled = !on.checked; prev.disabled = !on.checked; row.classList.toggle("off", !on.checked); val.textContent = SoundFx.volume() + "%"; vol.setAttribute("aria-valuetext", SoundFx.volume() + " percent"); }
    on.addEventListener("change", function(){ settings.soundOn = on.checked; paint(); if(on.checked) SoundFx.preview(); });
    vol.addEventListener("input", function(){ settings.soundVolume = Number(vol.value); val.textContent = vol.value + "%"; });
    vol.addEventListener("change", function(){ SoundFx.preview(); });
    var pvTimer = 0;
    prev.addEventListener("click", function(){
      if(prev.classList.contains("playing")) return;
      if(!SoundFx.preview()){ toast("This browser can’t play sounds."); return; }
      prev.classList.add("playing"); prev.setAttribute("aria-busy", "true"); prev.querySelector(".pvLb").textContent = "Playing…";      // one short press-and-sweep, then back to rest
      clearTimeout(pvTimer);
      pvTimer = setTimeout(function(){ prev.classList.remove("playing"); prev.removeAttribute("aria-busy"); prev.querySelector(".pvLb").textContent = "Play a preview"; }, 1000);
    });
    paint();
  }

  // ---- Shortcuts: a small searchable cheat-sheet
  var SHORTCUT_GROUPS = [
    {title: "Selecting & moving", items: [
      ["Click", "Select a note or object"],
      [MOD + " + Click", "Add or remove from the selection"],
      ["Drag on empty board", "Select everything inside the box"],
      ["Arrow keys", "Nudge the selection (hold Shift for bigger steps)"],
      [MOD + " + A", "Select everything"],
      ["Delete", "Delete the selection (when you’re not typing)"]
    ]},
    {title: "Editing", items: [
      ["Double-click a note", "Open it large (Focus Mode)"],
      ["Enter", "Finish editing · in a list, add an item"],
      ["Shift + Enter", "New line"],
      [MOD + " + B", "Bold"],
      [MOD + " + I", "Italic"],
      [MOD + " + Click a link", "Open it"],
      [MOD + " + Enter", "Add a comment"],
      ["Esc", "Close a menu or stop editing"]
    ]},
    {title: "Board", items: [
      [MOD + " + Z", "Undo"],
      [MOD + " + Shift + Z", "Redo"],
      [MOD + " + C", "Copy (notes can be pasted onto another board)"],
      [MOD + " + V", "Paste"],
      [MOD + " + +", "Make the selection bigger, or zoom the board"],
      [MOD + " + −", "Make the selection smaller, or zoom the board"],
      [MOD + " + 0", "Reset size or zoom"],
      ["Right-click", "Add something at that spot"],
      ["Shift + Right-click", "Your browser’s own menu"],
      ["Menu / Shift + F10", "Open the menu of the selected object"]
    ]},
    {title: "Media", items: [
      ["Click ▶", "Play (videos play right on the board)"],
      ["Click the waveform", "Jump to that point in a recording"],
      ["Click a playing video", "Pause or resume"],
      ["Expand button", "Open a video large"]
    ]},
    {title: "Navigation", items: [
      ["Mouse wheel", "Scroll the board sideways"],
      ["Click the minimap", "Jump there"],
      ["Drag the minimap window", "Pan the board"]
    ]},
    {title: "Cutout Maker", items: [
      ["E / R", "Erase / Restore"],
      ["H", "Move the picture"],
      ["F / 0", "Fit the subject / the whole photo"],
      ["[ and ]", "Smaller and bigger brush"],
      ["Space + drag", "Pan"],
      [MOD + " + Z", "Undo a stroke"]
    ]}
  ];
  // the "Your shortcuts" card: every rebindable action, its key, Change / Reset, and the rules that keep a rebind safe
  function buildRebinder(box, groups){
    var sec = document.createElement("section"); sec.className = "asCard kbdGroup kbdCustom"; sec.setAttribute("aria-labelledby", "kbdCustomH");
    sec.innerHTML = '<h4 id="kbdCustomH">Your shortcuts</h4><p class="asHint">Choose a row’s <b>Change</b> and press the keys you want. Shortcuts you change are saved' + (CLOUD ? ' and follow your account.' : ' on this device.') + '</p><div class="kbdRebind"></div><div class="kbdResetAll"><button type="button" class="pillBtn" id="kbdResetAll">Reset all to default</button><span class="asSaved" id="kbdSavedMsg" role="status" aria-live="polite"></span></div>';
    var list = sec.querySelector(".kbdRebind"), resetAll = sec.querySelector("#kbdResetAll"), saved = sec.querySelector("#kbdSavedMsg");
    var editingId = null, stopCapture = null, rowsOut = [];
    function note(msg){ saved.textContent = msg; clearTimeout(note.t); note.t = setTimeout(function(){ saved.textContent = ""; }, 2400); }
    function listActions(){ return ACTIONS.filter(function(a){ return a.rebind !== false; }); }
    function capsEl(binding){
      var keys = makeDiv("kbdKeys"); keys.setAttribute("aria-label", binding ? keyCaps(binding).join(" plus ") : "not set");
      if(!binding){ var none = document.createElement("span"); none.className = "kbdNone2"; none.textContent = "Not set"; keys.appendChild(none); return keys; }
      keyCaps(binding).forEach(function(part, i){ if(i){ var plus = document.createElement("span"); plus.className = "kbdPlus"; plus.setAttribute("aria-hidden", "true"); plus.textContent = "+"; keys.appendChild(plus); } var k = document.createElement("kbd"); k.textContent = part; keys.appendChild(k); });
      return keys;
    }
    function setBinding(id, binding){
      var custom = customKeys(), def = defaultKeys()[id] || "";
      if(binding === def) delete custom[id]; else custom[id] = binding;
      saveShortcuts(custom);
    }
    function endCapture(){ if(stopCapture){ stopCapture(); stopCapture = null; } editingId = null; rebinderOpen = false; rebLayer.close(); }
    var rebLayer = OV.layer("shortcut-rebinder", function(){ endCapture(); render(); }, function(){ return !!editingId && sec.isConnected; });
    function startCapture(a, row, msg, actionsBox){
      endCapture(); editingId = a.id; rebinderOpen = true; rebLayer.open(); render();
    }
    function render(){
      list.innerHTML = ""; rowsOut = [];
      var current = activeKeys();
      listActions().forEach(function(a){
        var row = makeDiv("kbdRow kbdRebRow"), desc = makeDiv("kbdDesc"), right = makeDiv("kbdRebCtl");
        var isCustom = Object.prototype.hasOwnProperty.call(customKeys(), a.id);
        desc.textContent = a.label; if(isCustom){ var tag = document.createElement("small"); tag.className = "kbdCustomTag"; tag.textContent = " · changed"; desc.appendChild(tag); }
        if(editingId === a.id){
          row.classList.add("editing");
          var prompt = document.createElement("span"); prompt.className = "kbdPrompt"; prompt.textContent = "Press a new shortcut…"; prompt.tabIndex = -1; prompt.setAttribute("role", "status"); right.appendChild(prompt);
          var cancel = document.createElement("button"); cancel.type = "button"; cancel.className = "pillBtn kbdBtn"; cancel.textContent = "Cancel"; cancel.addEventListener("click", function(){ endCapture(); render(); }); right.appendChild(cancel);
          var msg = document.createElement("p"); msg.className = "kbdMsg"; msg.setAttribute("role", "alert");
          var box2 = makeDiv("kbdConfirm");
          row.appendChild(desc); row.appendChild(right);
          var wrap = makeDiv("kbdRebWrap"); wrap.appendChild(row); wrap.appendChild(msg); wrap.appendChild(box2); list.appendChild(wrap);
          function onKey(e){
            if(!sec.isConnected){ endCapture(); return; }
            if(e.isComposing) return;
            if(e.target && e.target.closest && e.target === cancel) { if(e.key === "Enter" || e.key === " ") return; }
            var b = KB.fromEvent(e, IS_MAC);
            e.preventDefault(); e.stopImmediatePropagation();
            if(!b){ msg.textContent = "Now press a key to go with it."; return; }
            var r = KB.check(b, {isMac: IS_MAC, forId: a.id, current: activeKeys(), actions: ACTIONS, fixed: FIXED_BINDINGS});
            box2.innerHTML = "";
            if(r.ok){ setBinding(a.id, b); endCapture(); render(); note(a.label + " is now " + KB.sentence(b, IS_MAC) + "."); return; }
            msg.textContent = r.message;
            if(r.kind === "duplicate"){
              var holder = actionById(r.holder);
              msg.textContent = r.message + " Replace it?";
              var rep = document.createElement("button"); rep.type = "button"; rep.className = "pillBtn primary kbdBtn"; rep.textContent = "Replace";
              var keep = document.createElement("button"); keep.type = "button"; keep.className = "pillBtn kbdBtn"; keep.textContent = "Cancel";
              rep.addEventListener("click", function(){ var custom = customKeys(); custom[r.holder] = ""; var def = defaultKeys()[a.id] || ""; if(b === def) delete custom[a.id]; else custom[a.id] = b; saveShortcuts(custom); endCapture(); render(); note(a.label + " is now " + KB.sentence(b, IS_MAC) + "; " + (holder ? holder.label : "the other action") + " has no shortcut."); });
              keep.addEventListener("click", function(){ box2.innerHTML = ""; msg.textContent = "Press a new shortcut…"; });
              box2.appendChild(rep); box2.appendChild(keep); rep.focus();
              // the captured keys must not fire while the question is open
            }
          }
          document.addEventListener("keydown", onKey, true);
          stopCapture = function(){ document.removeEventListener("keydown", onKey, true); };
          setTimeout(function(){ if(editingId === a.id) prompt.focus(); }, 0);
          rowsOut.push({el: wrap, text: a.label.toLowerCase()});
          return;
        }
        right.appendChild(capsEl(current[a.id] || ""));
        var chg = document.createElement("button"); chg.type = "button"; chg.className = "pillBtn kbdBtn"; chg.textContent = "Change"; chg.setAttribute("aria-label", "Change the shortcut for " + a.label);
        chg.addEventListener("click", function(){ startCapture(a); });
        right.appendChild(chg);
        if(isCustom){
          var rs = document.createElement("button"); rs.type = "button"; rs.className = "pillBtn kbdBtn"; rs.textContent = "Reset"; rs.setAttribute("aria-label", "Reset the shortcut for " + a.label + " to default");
          rs.addEventListener("click", function(){
            var custom = customKeys(); delete custom[a.id];
            var clash = KB.find(KB.resolve(defaultKeys(), custom), defaultKeys()[a.id] || "\u0000");
            if(clash && clash !== a.id){ var other = actionById(clash); note("The default key is taken by " + (other ? other.label : "another action") + ". Reset that one first."); return; }
            saveShortcuts(custom); render(); note(a.label + " is back to " + (defaultKeys()[a.id] ? KB.sentence(defaultKeys()[a.id], IS_MAC) : "no shortcut") + ".");
          });
          right.appendChild(rs);
        }
        row.appendChild(desc); row.appendChild(right); list.appendChild(row);
        rowsOut.push({el: row, text: (a.label + " " + (a.keywords || "") + " " + (current[a.id] ? KB.sentence(current[a.id], IS_MAC) : "")).toLowerCase()});
      });
      resetAll.disabled = !Object.keys(customKeys()).length;
      if(entry){ entry.rows = rowsOut; }
    }
    resetAll.addEventListener("click", function(){ endCapture(); saveShortcuts({}); render(); note("All shortcuts are back to their defaults."); });
    var entry = {el: sec, rows: rowsOut};
    box.appendChild(sec); groups.push(entry);
    render();
    shortcutPaneRefresh = function(){ if(sec.isConnected) render(); else shortcutPaneRefresh = null; };
    rebinderEl = sec; sec._cleanup = endCapture;
    return sec;
  }
  function buildShortcutsPane(cc, pane){
    pane.innerHTML = '<div class="kbdSearch"><label class="sr-only" for="kbdQ">Search shortcuts</label><input type="search" id="kbdQ" class="asIn" placeholder="Search shortcuts…" autocomplete="off" spellcheck="false"><p class="kbdCount" id="kbdCount" role="status" aria-live="polite"></p></div><div class="kbdGroups" id="kbdGroups"></div><p class="asHint kbdNone" id="kbdNone" hidden>No shortcut matches that. Try another word.</p>';
    var box = pane.querySelector("#kbdGroups"), q = pane.querySelector("#kbdQ"), none = pane.querySelector("#kbdNone"), count = pane.querySelector("#kbdCount"), groups = [];
    if(KB) buildRebinder(box, groups);
    SHORTCUT_GROUPS.forEach(function(g){
      var sec = document.createElement("section"); sec.className = "asCard kbdGroup"; var h = document.createElement("h4"); h.textContent = g.title; sec.appendChild(h);
      var rows = [];
      g.items.forEach(function(it){
        var row = makeDiv("kbdRow"), keys = makeDiv("kbdKeys"), desc = makeDiv("kbdDesc");
        it[0].split(" + ").forEach(function(part, i){ if(i){ var plus = document.createElement("span"); plus.className = "kbdPlus"; plus.setAttribute("aria-hidden", "true"); plus.textContent = "+"; keys.appendChild(plus); } var k = document.createElement("kbd"); k.textContent = part; keys.appendChild(k); });
        keys.setAttribute("aria-label", it[0].replace(/ \+ /g, " plus "));
        desc.textContent = it[1]; row.appendChild(keys); row.appendChild(desc); sec.appendChild(row);
        rows.push({el: row, text: (g.title + " " + it[0] + " " + it[1]).toLowerCase()});
      });
      box.appendChild(sec); groups.push({el: sec, rows: rows});
    });
    function filter(){
      var v = q.value.trim().toLowerCase(), shown = 0;
      groups.forEach(function(g){ var any = 0; g.rows.forEach(function(r){ var hit = !v || v.split(/\s+/).every(function(w){ return r.text.indexOf(w) !== -1; }); r.el.hidden = !hit; if(hit){ any++; shown++; } }); g.el.hidden = !any; });
      none.hidden = !!shown; count.textContent = v ? shown + (shown === 1 ? " shortcut" : " shortcuts") : "";
    }
    q.setAttribute("data-esc-clear", "1");
    q.addEventListener("input", filter);
    q.addEventListener("keydown", function(e){ if(e.key === "Escape" && q.value){ e.stopPropagation(); q.value = ""; filter(); } });
  }

  // ---- Legal & About
  // ---------- Stick-It's own small icons for Legal & policies (v0.8.2.2) ----------
  // One family: 24px, 1.7 stroke, round caps, a slightly lopsided paper scrap behind each idea. They follow the text colour, so light and dark both work.
  // Decorative (the row label already says what it is), so they are hidden from assistive technology.
  var SCRAP = '<path d="M4.2 3.6l15.4-.5.5 15.9-3.1 1.9-12.8.4-.6-17.1z" fill="currentColor" fill-opacity="0.1"/>';
  var LEGAL_ICONS = {
    whatsNew: '<path d="M4 4.2l14.8-.6 1.2 14.6-14.2 1.9z" fill="currentColor" fill-opacity="0.1"/><path d="M12 7.4l1.1 2.6 2.7.3-2 1.9.6 2.7-2.4-1.4-2.4 1.4.6-2.7-2-1.9 2.7-.3z"/>',
    language: null,
    privacy: SCRAP + '<rect x="8" y="11" width="8.4" height="6.6" rx="1.4"/><path d="M9.6 11V9.3a2.6 2.6 0 0 1 5.2 0V11"/><path d="M12.2 13.7v1.5"/>',
    terms: SCRAP + '<path d="M8 8.2h8M8 11.4h8M8 14.6h5"/><path d="M14.4 17.2l1.2 1 2.2-2.6"/>',
    young: SCRAP + '<circle cx="9" cy="9.2" r="1.9"/><path d="M5.9 16.4c.2-2.3 1.4-3.5 3.1-3.5s2.9 1.2 3.1 3.5"/><circle cx="15.4" cy="11.2" r="1.4"/><path d="M13.4 16.4c.1-1.6 1-2.5 2-2.5s1.9.9 2 2.5"/>',
    storage: '<path d="M3.8 8.4l16.2-.3-.4 3.4-15.4.2z" fill="currentColor" fill-opacity="0.1"/><path d="M4.8 11.6l.6 7.6 13.4-.2.5-7.4"/><path d="M9.6 14.6h4.8"/><path d="M6 5.6l12-.4"/>',
    accessibility: SCRAP + '<circle cx="12" cy="7.6" r="1.4"/><path d="M7.6 10.2l4.4.7 4.4-.7"/><path d="M12 11v3.1M12 14.1l-2 3.6M12 14.1l2 3.6"/>',
    copyright: SCRAP + '<circle cx="12" cy="11.4" r="4.6"/><path d="M13.9 9.6a2.6 2.6 0 1 0 0 3.6"/><path d="M7.4 18.4h9.4" stroke-dasharray="1.6 1.4"/>'
  };
  function legalIconEl(key){
    var span = document.createElement("span"); span.className = "ccIco"; span.setAttribute("aria-hidden", "true");
    if(key === "language" && window.Stick && Stick.lang && Stick.lang.iconSvg){ span.innerHTML = Stick.lang.iconSvg(24); return span; }
    var body = LEGAL_ICONS[key]; if(!body) return null;
    span.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" focusable="false">' + body + '</svg>';
    return span;
  }
  var LEGAL_ABOUT = [
    ["Privacy Policy", "legal/privacy.html", "What Stick-It collects, why, and your choices."],
    ["Terms", "legal/terms.html", "The rules for using Stick-It."],
    ["Young people & parents", "legal/young-people.html", "What under-18s and parents can expect."],
    ["Storage", "legal/storage.html", "What is kept on your device."],
    ["Accessibility", "legal/accessibility.html", "How Stick-It aims to work for everyone."],
    ["Copyright / DMCA", "legal/copyright.html", "Report content or send a notice."]
  ];
  function buildLegalPane(cc, pane){
    pane.innerHTML = '<section class="asCard" aria-labelledby="ccLegH"><h4 id="ccLegH">Legal &amp; policies</h4><div class="ccLegalList"></div></section>' +
      '<section class="asCard" aria-labelledby="ccAbH"><h4 id="ccAbH">About Stick-It</h4><p class="ccAbout" id="ccAbout"></p></section>';
    var list = pane.querySelector(".ccLegalList");
    var wn = document.createElement("button"); wn.type = "button"; wn.className = "asAction ccLink"; wn.id = "ccWhatsNew";
    wn.innerHTML = '<span class="lbl"><span class="t">What’s New</span><small>What changed in this version, with a short tour.</small></span><span class="go" aria-hidden="true">›</span>';
    wn.addEventListener("click", function(){ openWhatsNew(); });
    var wnIco = legalIconEl("whatsNew"); if(wnIco){ wn.insertBefore(wnIco, wn.firstChild); wn.classList.add("hasIco"); }
    list.appendChild(wn);
    // the globe: only languages whose legal pages are complete are listed (js/lang.js); the same registry will serve the app later
    var langs = window.Stick && Stick.lang ? Stick.lang.complete("legal") : [];
    if(langs.length > 1){
      var gb = document.createElement("button"); gb.type = "button"; gb.className = "asAction ccLink"; gb.id = "ccLang"; gb.setAttribute("aria-expanded", "false"); gb.setAttribute("aria-controls", "ccLangList");
      gb.classList.add("hasIco"); gb.innerHTML = (Stick.lang ? '<span class="ccIco" aria-hidden="true">' + Stick.lang.iconSvg(24) + '</span>' : "") + '<span class="lbl"><span class="t">Language</span><small>Read the legal pages in another language.</small></span><span class="go" aria-hidden="true">›</span>';
      var gl = document.createElement("div"); gl.className = "ccLangList"; gl.id = "ccLangList"; gl.hidden = true;
      langs.forEach(function(l){
        var a = document.createElement("a"); a.className = "asAction ccLink ccLangItem"; a.href = l.code === "en" ? "legal/privacy.html" : "legal/" + l.code + "/privacy.html"; a.target = "_blank"; a.rel = "noopener"; a.lang = l.code; a.dir = l.dir; a.textContent = l.native;
        a.addEventListener("click", function(e){ if(window.Stick && Stick.legalReader && Stick.legalContent){ e.preventDefault(); try{ localStorage.setItem("stickit.legal.lang", l.code); }catch(err){} Stick.legalReader.open("privacy", {lang: l.code}); } });
        gl.appendChild(a);
      });
      var langLayer = OV.layer("language-chooser", function(){ gl.hidden = true; gb.setAttribute("aria-expanded", "false"); gb.focus(); }, function(){ return !gl.hidden && gl.isConnected; });
      gb.addEventListener("click", function(){ gl.hidden = !gl.hidden; gb.setAttribute("aria-expanded", gl.hidden ? "false" : "true"); if(gl.hidden) langLayer.close(); else langLayer.open(); });
      list.appendChild(gb); list.appendChild(gl);
    }
    LEGAL_ABOUT.forEach(function(l){
      var a = document.createElement("a"); a.className = "asAction ccLink"; a.href = l[1]; a.target = "_blank"; a.rel = "noopener";
      var docId = {"legal/privacy.html": "privacy", "legal/terms.html": "terms", "legal/young-people.html": "young", "legal/storage.html": "storage", "legal/accessibility.html": "accessibility", "legal/copyright.html": "copyright"}[l[1]];
      a.addEventListener("click", function(e){ if(docId && window.Stick && Stick.legalReader && Stick.legalContent){ e.preventDefault(); a.removeAttribute("target"); Stick.legalReader.open(docId); } });
      a.innerHTML = '<span class="lbl"><span class="t"></span><small></small></span><span class="go" aria-hidden="true">›</span>';
      a.querySelector(".t").textContent = l[0]; a.querySelector("small").textContent = l[2];
      var ico = legalIconEl(docId); if(ico){ a.insertBefore(ico, a.firstChild); a.classList.add("hasIco"); }
      if(/[\u0590-\u05ff]/.test(l[0])){ a.querySelector(".lbl").dir = "auto"; }
      list.appendChild(a);
    });
    var c = (Stick.config || {});
    pane.querySelector("#ccAbout").textContent = "Stick-It " + (c.APP_VERSION ? "v" + c.APP_VERSION : "") + (c.APP_CODENAME ? " · " + c.APP_CODENAME : "") + (c.APP_STATUS === "development" ? " (in development)" : "") + ". A corkboard for notes, pictures and small things, kept simple.";
    var dev = document.getElementById("devSection"); if(dev) cc.adopt(dev, pane);
  }

  shareBtn.addEventListener("click", function(){
    var willOpen = sharePanel.hidden;
    closeOtherPanels(willOpen ? sharePanel : null);
    if(willOpen) updateCollabButton();
    sharePanel.hidden = !willOpen; if(willOpen) shareLayer.open();
  });
  document.addEventListener("click", function(e){
    if(!sharePanel.hidden && !sharePanel.contains(e.target) && e.target !== shareBtn && !shareBtn.contains(e.target)){
      sharePanel.hidden = true;
    }
  });

  // ---------- account: Google Sign-In or guest ----------
  var GOOGLE_ICON =
    '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.43 3.58v2.98h3.94C22.2 19.1 23.5 15.98 23.5 12.27z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.92l-3.94-2.98c-1.08.72-2.45 1.15-3.99 1.15-3.07 0-5.67-2.07-6.6-4.85H1.34v3.07C3.3 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.4 14.4c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.75H1.34C.49 8.4 0 10.15 0 12.11s.49 3.71 1.34 5.36L5.4 14.4z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.79l3.5-3.5C17.94 1.19 15.24 0 12 0 7.31 0 3.3 2.7 1.34 6.75l4.06 3.07C6.33 6.94 8.93 4.75 12 4.75z"/></svg>';

  function decodeJwt(token){
    try{
      var b64 = token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/");
      var json = decodeURIComponent(atob(b64).split("").map(function(c){
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(""));
      return JSON.parse(json);
    }catch(e){ return null; }
  }

  // ---- avatars: photo (custom or from the sign-in provider), else initials or an emoji on a colour ----
  function avatarInitials(name){
    var parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
    if(!parts.length) return "?";
    var first = Array.from(parts[0])[0] || "?";
    var last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] || "") : "";
    return (first + last).toUpperCase();
  }
  function avatarColorFor(name, color){
    if(color) return color;
    var pal = Stick.account.AVATAR_COLORS;
    return pal[hashStr(String(name || "")) % pal.length];
  }
  // av: {name, source: custom|provider|none, assetId, providerUrl, style, color, emoji, url}
  function paintAvatar(el, av){
    var token = (el._avTok = (el._avTok || 0) + 1);
    function fallback(){
      if(el._avTok !== token) return;
      el.innerHTML = "";
      var useEmoji = av.style === "emoji" && av.emoji;
      el.textContent = useEmoji ? av.emoji : avatarInitials(av.name);
      el.style.background = avatarColorFor(av.name, av.color);
      el.classList.toggle("emoji", !!useEmoji);
    }
    function img(u){
      if(el._avTok !== token) return;
      var im = new Image();
      im.alt = ""; im.referrerPolicy = "no-referrer";
      im.onerror = fallback;
      im.onload = function(){ if(el._avTok === token){ el.innerHTML = ""; el.style.background = "transparent"; el.classList.remove("emoji"); el.appendChild(im); } };
      im.src = u;
    }
    fallback();
    if(av.url) img(av.url);
    else if(av.source === "custom" && av.assetId && CLOUD && window.Stick) Stick.assets.blobUrl(av.assetId).then(function(u){ if(u) img(u); });
    else if(av.source === "provider" && av.providerUrl) img(av.providerUrl);
  }
  function accountAvatarSpec(){
    var acc = settings.account || {}, pf = acc.prof || {};
    return {name: acc.name, source: pf.avatarSource || "provider", assetId: pf.avatarAssetId, providerUrl: acc.providerUrl || acc.picture,
            style: pf.avatarStyle, color: pf.avatarColor, emoji: pf.avatarEmoji};
  }
  (function(){ var v = document.getElementById("verTag"), c = (window.Stick && Stick.config) || {};
    if(v && c.APP_VERSION){ v.textContent = "v" + c.APP_VERSION + (c.APP_STATUS === "development" ? " dev" : "") + " · " + (c.APP_CODENAME || ""); v.title = "Stick-It " + c.APP_VERSION + (c.APP_CODENAME ? " – " + c.APP_CODENAME : "") + (c.APP_STATUS ? " (" + c.APP_STATUS + ")" : ""); } })();
  var CROWN_SVG = '<svg viewBox="0 0 24 16" aria-hidden="true" focusable="false" shape-rendering="geometricPrecision"><path d="M2.6 13.6 1.6 4.4 7 8.3 12 2.1 17 8.3 22.4 4.4 21.4 13.6z" fill="#f5b800" stroke="#7a4f00" stroke-width="1.4" stroke-linejoin="round"></path><path d="M3.2 11.4h17.6" stroke="#7a4f00" stroke-width="1" opacity=".55" fill="none"></path><circle cx="1.6" cy="4.4" r="1.25" fill="#fff4b8" stroke="#7a4f00" stroke-width=".9"></circle><circle cx="12" cy="2.1" r="1.25" fill="#fff4b8" stroke="#7a4f00" stroke-width=".9"></circle><circle cx="22.4" cy="4.4" r="1.25" fill="#fff4b8" stroke="#7a4f00" stroke-width=".9"></circle></svg>';
  function updateAccountIcon(){
    updateAccountIcon0();
    var old = accountBtn.querySelector(".crown");
    if(old) old.remove();
    var qs = document.getElementById("quickSignOut");
    if(qs) qs.hidden = !settings.account;
    if(settings.account && isPremium()){
      var c = makeDiv("crown"); c.innerHTML = CROWN_SVG; c.title = "Premium";
      accountBtn.appendChild(c);
      accountBtn.setAttribute("aria-label", "Account (Premium)");
    } else accountBtn.setAttribute("aria-label", "Account");
  }
  function updateAccountIcon0(){
    if(settings.account && CLOUD){
      accountBtn.innerHTML = "";
      var holder = makeDiv("acctAv");
      accountBtn.appendChild(holder);
      paintAvatar(holder, accountAvatarSpec());
    } else if(settings.account && settings.account.picture){
      accountBtn.innerHTML = '<img src="' + settings.account.picture + '" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">';
    } else {
      accountBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7"></path></svg>';
    }
  }

  window.handleGoogleCredentialResponse = function(response){
    var payload = decodeJwt(response.credential);
    if(!payload) return;
    settings.account = { name: payload.name, email: payload.email, picture: payload.picture, sub: payload.sub };
    settings.guestConfirmed = false;
    saveSettings();
    updateAccountIcon();
    toast("Signed in as " + payload.name + ".");
    closeAccountModal();
  };

  function signOut(){
    settings.account = null;
    saveSettings();
    updateAccountIcon();
    try{ if(window.google && window.google.accounts) window.google.accounts.id.disableAutoSelect(); }catch(e){}
    renderAccountModal("choice");
  }

  var acctBackdrop = null;
  var acctOpener = null, acctTrapKey = null;
  function closeAccountModal(){
    if(CC && acctBackdrop === CC.backdrop){ try{ CC.teardown(); }catch(e){ CC = null; } }
    if(acctBackdrop){ acctBackdrop.remove(); acctBackdrop = null; }
    document.removeEventListener("keydown", acctEscHandler);
    if(acctTrapKey){ document.removeEventListener("keydown", acctTrapKey, true); acctTrapKey = null; }
    if(acctOpener && acctOpener.focus && document.contains(acctOpener)){ try{ acctOpener.focus(); }catch(e){} }
    acctOpener = null;
  }
  function openAccountModal(){
    if(ccSignedIn()){ openControlCenter("account"); return; }
    var opener = document.activeElement;
    closeOtherPanels(null);
    closeAccountModal();
    acctOpener = opener;
    acctBackdrop = document.createElement("div");
    acctBackdrop.className = "acctBackdrop";
    acctBackdrop.addEventListener("click", function(e){ if(e.target === acctBackdrop) closeAccountModal(); });
    var card = document.createElement("div");
    card.className = "acctCard";
    card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "true"); card.setAttribute("aria-label", "Account"); card.setAttribute("tabindex", "-1");
    acctBackdrop.appendChild(card);
    document.body.appendChild(acctBackdrop);
    document.addEventListener("keydown", acctEscHandler);
    var signInBackdrop = acctBackdrop;
    OV.layer("account", function(){ closeAccountModal(); }, function(){ return acctBackdrop === signInBackdrop; }).open();
    var myBackdrop = acctBackdrop;
    acctTrapKey = function(e){ if(acctBackdrop === myBackdrop) trapTab(e, myBackdrop, card); };
    document.addEventListener("keydown", acctTrapKey, true);
    var initial = settings.account ? "signedIn" : (settings.guestConfirmed ? "guestHome" : "choice");
    renderAccountModal(initial);
    setTimeout(function(){ if(acctBackdrop && !card.contains(document.activeElement)){ var f = focusablesIn(card); (f[0] || card).focus(); } }, 80);
  }
  function acctEscHandler(e){
    if(e.key !== "Escape") return;
    var over = Array.prototype.slice.call(document.querySelectorAll(".acctBackdrop:not(#settingsModal)")).filter(function(b){ return b !== acctBackdrop; });
    if(!over.length) closeAccountModal();                // a dialog opened over it (cropper, confirm...) handles its own Esc first
  }

  // ---------- sign in with an e-mail code (Supabase Auth one-time password; no passwords, nothing of the code is kept by Stick-It) ----------
  // E-mail one-time-code sign-in is built and tested but NOT offered: production delivery needs a verified sending domain.
  // It stays off (no button, no 'coming soon') until Stick.config.EMAIL_AUTH is true. See docs/auth/email-auth-deferred.md.
  var EMAIL_AUTH = !!(Stick.config && Stick.config.EMAIL_AUTH);
  var pendingAuth = null, pendingEmail = "", emailTimer = null;
  var EMAIL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"></rect><path d="M3.5 7.5 12 13.5l8.5-6"></path></svg>';
  function miniLoaderHtml(){ return '<span class="slMini" aria-hidden="true">' + buildLogoSvg(LOGO_COLORS.loading.fill, LOGO_COLORS.loading.dark) + '</span>'; }
  function setBusy(btn, busy, text){
    if(!btn) return;
    if(busy){ btn.dataset.label = btn.textContent; btn.disabled = true; btn.setAttribute("aria-busy", "true"); btn.innerHTML = miniLoaderHtml() + '<span>' + escapeHtml(text || btn.dataset.label) + '</span>'; }
    else { btn.disabled = false; btn.removeAttribute("aria-busy"); btn.textContent = btn.dataset.label || btn.textContent; }
  }
  function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 254; }
  function beginEmailSignIn(){
    if(!ageFlag() && !ageKnown()){ pendingAuth = "email"; renderAccountModal("age"); return; }
    renderAccountModal("emailEnter");
  }
  function renderEmailEnter(card, closeBtnHtml){
    card.innerHTML = closeBtnHtml +
      '<button type="button" class="acctBack" id="acctBackBtn">\u2190 Back</button>' +
      '<h3>Sign in with email</h3>' +
      '<form id="emailForm" novalidate>' +
        '<label class="authLabel" for="authEmailInput">Email</label>' +
        '<input class="authInput" id="authEmailInput" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="you@example.com" value="' + escapeAttr(pendingEmail) + '">' +
        '<p class="asErr authMsg" id="authMsg" role="alert"></p>' +
        '<button type="submit" class="pillBtn primary authPrimary" id="sendCodeBtn">Send code</button>' +
      '</form>';
    var input = card.querySelector("#authEmailInput"), msg = card.querySelector("#authMsg"), btn = card.querySelector("#sendCodeBtn");
    card.querySelector("#acctBackBtn").addEventListener("click", function(){ renderAccountModal("choice"); });
    card.querySelector("#emailForm").addEventListener("submit", function(e){
      e.preventDefault();
      var v = input.value.trim();
      if(!validEmail(v)){ msg.textContent = "Please enter a valid e-mail address."; input.focus(); return; }
      msg.textContent = "";
      setBusy(btn, true, "Sending\u2026");
      Stick.auth.sendEmailCode(v).then(function(){
        pendingEmail = v; emailSentAt = Date.now(); renderAccountModal("emailCode");
      }, function(err){
        setBusy(btn, false);
        var er = Stick.errors.parse(err);
        msg.textContent = er.code === "CODE_RATE_LIMIT" || er.offline ? Stick.errors.friendly(er) : "Couldn\u2019t send a code. Check the address and try again.";
      });
    });
    setTimeout(function(){ input.focus(); }, 30);
  }
  var emailSentAt = 0;
  function renderEmailCode(card, closeBtnHtml){
    card.innerHTML = closeBtnHtml +
      '<h3>Check your inbox</h3>' +
      '<p class="acctSub authLead">If this address can receive a code, we\u2019ve sent one to:<br><strong class="authAddr"></strong></p>' +
      '<form id="codeForm" novalidate>' +
        '<label class="authLabel" for="authCode">Code</label>' +
        '<input class="authInput otpInput" id="authCode" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" maxlength="12" placeholder="\u2022 \u2022 \u2022 \u2022 \u2022 \u2022" spellcheck="false">' +
        '<p class="asErr authMsg" id="authMsg" role="alert"></p>' +
        '<button type="submit" class="pillBtn primary authPrimary" id="verifyBtn">Continue</button>' +
        '<div class="authLinks"><button type="button" class="linkBtn" id="resendBtn"></button><button type="button" class="linkBtn" id="otherEmailBtn">Use another email</button></div>' +
      '</form>';
    card.querySelector(".authAddr").textContent = pendingEmail;
    var input = card.querySelector("#authCode"), msg = card.querySelector("#authMsg"), btn = card.querySelector("#verifyBtn"), resend = card.querySelector("#resendBtn");
    input.addEventListener("input", function(){ input.value = input.value.replace(/\D/g, "").slice(0, 12); });       // a pasted code with spaces or dashes still works
    function tick(){
      var left = Math.max(0, 30 - Math.floor((Date.now() - emailSentAt) / 1000));
      resend.disabled = left > 0;
      resend.textContent = left > 0 ? "Resend code in " + left + "s" : "Resend code";
      if(!left) clearInterval(emailTimer);
    }
    clearInterval(emailTimer); tick(); emailTimer = setInterval(tick, 500);
    resend.addEventListener("click", function(){
      if(resend.disabled) return;
      msg.textContent = ""; resend.disabled = true; resend.textContent = "Sending\u2026";
      Stick.auth.sendEmailCode(pendingEmail).then(function(){ emailSentAt = Date.now(); msg.textContent = ""; msg.className = "asErr authMsg ok"; msg.textContent = "A new code is on its way."; clearInterval(emailTimer); emailTimer = setInterval(tick, 500); tick(); },
        function(err){ var er = Stick.errors.parse(err); msg.className = "asErr authMsg"; msg.textContent = er.code === "CODE_RATE_LIMIT" || er.offline ? Stick.errors.friendly(er) : "Couldn\u2019t send a new code. Try again in a moment."; tick(); });
    });
    card.querySelector("#otherEmailBtn").addEventListener("click", function(){ renderAccountModal("emailEnter"); });
    card.querySelector("#codeForm").addEventListener("submit", function(e){
      e.preventDefault();
      var code = input.value.trim();
      msg.className = "asErr authMsg";
      if(code.length < 6){ msg.textContent = "Enter the code from the e-mail."; input.focus(); return; }
      msg.textContent = "";
      setBusy(btn, true, "Checking\u2026");
      Stick.auth.verifyEmailCode(pendingEmail, code).then(function(session){
        if(!session){ setBusy(btn, false); msg.textContent = "Couldn\u2019t sign you in. Please try again."; return; }
        clearInterval(emailTimer);
        pendingEmail = "";
        closeAccountModal();
        stickLoaderDone("Signed in.", function(){ try{ history.replaceState(null, "", location.pathname); }catch(e){} location.reload(); });
      }, function(err){
        setBusy(btn, false);
        msg.textContent = Stick.errors.friendly(Stick.errors.parse(err));
        input.focus(); input.select();
      });
    });
    setTimeout(function(){ input.focus(); }, 30);
  }

  function renderAccountModal(state){
    if(!acctBackdrop) return;
    var card = acctBackdrop.querySelector(".acctCard");
    card.className = "acctCard";
    clearInterval(emailTimer);
    var closeBtnHtml = '<button class="acctClose" id="acctCloseBtn" aria-label="Close">' + ICONS.close + '</button>';

    if(state === "signedIn" && settings.account && CLOUD && window.Stick && Stick.account){
      closeAccountModal(); openControlCenter("account");
      return;
    }
    if(state === "signedIn" && settings.account){
      var acc = settings.account;
      var localCount = (CLOUD && window.Stick) ? Stick.migrate.inspectLocal(localStorage).length : 0;
      var avatar = acc.picture
        ? '<img src="' + escapeAttr(acc.picture) + '" alt="" referrerpolicy="no-referrer" style="width:64px;height:64px;border-radius:50%;object-fit:cover;margin-bottom:12px;">'
        : '<div style="width:64px;height:64px;border-radius:50%;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.5rem;color:var(--accent);margin-bottom:12px;">' + escapeHtml((acc.name || "?").charAt(0).toUpperCase()) + '</div>';
      card.innerHTML = closeBtnHtml +
        '<div style="display:flex;flex-direction:column;align-items:center;">' + avatar +
          '<h3>' + escapeHtml(acc.name) + '</h3>' +
          '<p class="acctSub" style="margin-bottom:4px;">' + escapeHtml(acc.email) + '</p>' +
          (CLOUD ? '<span class="planBadge">' + escapeHtml(acc.plan || "free") + ' plan</span>' : '') +
        '</div>' +
        '<div class="acctWhy" style="margin-top:14px;"><p>' + (CLOUD
          ? 'Your boards, photos and recordings are saved to your account and follow you to your other devices. Your name shows on anything you share.'
          : 'Your real name &amp; photo show up on anything you share: boards, notes, and any future collaboration features. Your notes themselves still only live in this browser.') + '</p></div>' +
        (localCount ? '<button class="guestBtn" id="importLocalBtn" style="margin-top:14px;">Import a board saved on this device (' + localCount + ')\u2026</button>' : '') +
        '<button class="guestBtn" id="signOutBtn" style="margin-top:14px;color:var(--danger);border-color:var(--danger);">Sign out</button>';
      card.querySelector("#signOutBtn").addEventListener("click", CLOUD ? cloudSignOut : signOut);
      var imp = card.querySelector("#importLocalBtn");
      if(imp) imp.addEventListener("click", function(){ closeAccountModal(); startManualImport(); });

    } else if(state === "age"){
      card.innerHTML = closeBtnHtml + '<h3 id="ageTitle">A quick check</h3><div id="ageHost"></div>';
      card.querySelector("#ageHost").appendChild(buildAgeForm({
        extra: [{label: "Back", fn: function(){ renderAccountModal("choice"); }}],
        onBand: function(band){
          ageRemember(band);
          if(band === "child"){ pendingAuth = null; renderChildStep(card); return; }
          var next = pendingAuth; pendingAuth = null;
          if(next === "email") renderAccountModal("emailEnter");
          else if(next === "google" || next === "github") startProviderSignIn(next);
          else renderAccountModal(settings.guestConfirmed ? "guestHome" : "choice");
        }}));
    } else if(state === "emailEnter"){
      renderEmailEnter(card, closeBtnHtml);
    } else if(state === "emailCode"){
      renderEmailCode(card, closeBtnHtml);
    } else if(state === "guestHome"){
      card.innerHTML = closeBtnHtml +
        '<h3 style="text-align:center;">Browsing as a guest</h3>' +
        '<p class="acctSub">Notes you share will show this name:</p>' +
        '<div style="display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:18px;">' +
          '<div style="width:40px;height:40px;border-radius:50%;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--accent);flex:none;">' + escapeHtml(getDisplayName().charAt(0).toUpperCase()) + '</div>' +
          '<input id="guestNameInput" type="text" value="' + escapeHtml(getDisplayName()) + '" placeholder="Nickname" aria-label="Nickname" style="flex:1;padding:9px 12px;border-radius:10px;border:1px solid var(--edge);font-size:0.9rem;font-family:inherit;">' +
        '</div>' +
        (CLOUD_OK
          ? '<button type="button" class="guestBtn" id="signInStartBtn">Sign in or create an account</button>'
          : '<div class="googleBtn" id="googleBtnFallback"></div>' +
            '<div class="googleBtn" id="githubBtn" style="margin-top:8px;"></div>' +
            '<div id="googleBtnHolder" style="margin-top:2px;"></div>' +
            '');
      var startBtn = card.querySelector("#signInStartBtn");
      if(startBtn) startBtn.addEventListener("click", function(){ renderAccountModal("choice"); });
      else mountGoogleButton();
      card.querySelector("#guestNameInput").addEventListener("input", function(e){
        settings.displayName = e.target.value.trim();
        saveSettings();
      });

    } else if(state === "guestCompare"){
      card.innerHTML =
        '<button class="acctBack" id="acctBackBtn">← Back</button>' +
        '<h3 style="text-align:center;">Here’s the difference</h3>' +
        '<p class="acctSub">No judgment either way, just so you know what you’re choosing.</p>' +
        '<div class="acctCompare">' +
          '<div><strong>Guest</strong><ul>' +
            '<li>No permissions asked</li>' +
            '<li>Shared notes show “Anon-XXXX”</li>' +
            '<li>' + (CLOUD_OK ? 'Boards stay on this device only' : 'Nothing leaves this browser') + '</li>' +
            '<li>' + (CLOUD_OK ? 'Links to photos and recordings need an account' : 'Features that need an account won’t be available') + '</li>' +
          '</ul></div>' +
          '<div><strong>Google</strong><ul>' +
            '<li>Stick-It asks only for your name, e-mail &amp; profile photo (Google or GitHub)</li>' +
            '<li>Shared notes show your real name</li>' +
            '<li>' + (CLOUD_OK ? 'Boards, photos and recordings sync across your devices' : 'Features that need an account become available') + '</li>' +
            '<li>No access to your password, mail, calendar or files</li>' +
          '</ul></div>' +
        '</div>' +
        '<button class="guestBtn" id="confirmGuestBtn">Continue as guest</button>';
      card.querySelector("#acctBackBtn").addEventListener("click", function(){ renderAccountModal("choice"); });
      card.querySelector("#confirmGuestBtn").addEventListener("click", function(){
        settings.guestConfirmed = true;
        saveSettings();
        closeAccountModal();
        toast("You're browsing as a guest.");
      });

    } else {
      if(CLOUD_OK){
        card.innerHTML = closeBtnHtml +
          '<h3>Sign in to Stick-It</h3>' +
          '<p class="acctSub authLead">Sign in to sync your boards across devices.</p>' +
          '<div class="authBtns">' +
            '<button type="button" class="googleBtn" id="googleBtnFallback">' + GOOGLE_ICON + '<span>Continue with Google</span></button>' +
            '<button type="button" class="googleBtn" id="githubBtn">' + GITHUB_ICON + '<span>Continue with GitHub</span></button>' +
            (EMAIL_AUTH ? '<button type="button" class="googleBtn" id="emailBtn">' + EMAIL_ICON + '<span>Continue with email</span></button>' : '') +
          '</div>' +
          '<div class="authOr" role="separator"><span>or</span></div>' +
          '<button type="button" class="guestBtn authGuest" id="chooseGuestBtn">Continue as guest</button>' +
          '<p class="legalAck">' + LEGAL_ACK_HTML + '</p>';
        card.querySelector("#googleBtnFallback").addEventListener("click", function(){ beginProviderSignIn("google"); });
        card.querySelector("#githubBtn").addEventListener("click", function(){ beginProviderSignIn("github"); });
        if(EMAIL_AUTH) card.querySelector("#emailBtn").addEventListener("click", beginEmailSignIn);
      } else {
        card.innerHTML = closeBtnHtml +
          '<h3>Sign in to Stick-It</h3>' +
          '<div class="googleBtn" id="googleBtnFallback"></div>' +
          '<div id="googleBtnHolder" style="margin-top:2px;"></div>' +
          '<button class="guestBtn" id="chooseGuestBtn">Continue as guest</button>' +
          '<p class="legalAck">' + LEGAL_ACK_HTML + '</p>';
        mountGoogleButton();
      }
      card.querySelector("#chooseGuestBtn").addEventListener("click", function(){
        settings.guestConfirmed = true; saveSettings(); closeAccountModal(); toast("You\u2019re browsing as a guest.");
      });
    }

    var closeBtn = card.querySelector("#acctCloseBtn");
    if(closeBtn) closeBtn.addEventListener("click", closeAccountModal);
  }

  // ---------- Account settings (signed in): who I am, how I appear when I share, what belongs to my account ----------
  // Normal Settings answers "how does Stick-It look and behave on THIS device?". This answers "who am I here?".
  var AV_EMOJIS = ["\uD83D\uDE42", "\uD83C\uDFB8", "\uD83C\uDF3F", "\uD83D\uDCCC", "\uD83E\uDD8A", "\uD83C\uDFA8", "\uD83D\uDC19", "\u2615"];
  function providerName(p){ return p === "github" ? "GitHub" : p === "google" ? "Google" : "your sign-in provider"; }
  function fmtBytes(b){
    b = Number(b) || 0;
    if(b >= 1073741824) return (b / 1073741824).toFixed(1) + " GB";
    var mb = b / 1048576;
    return (mb < 10 ? mb.toFixed(1) : Math.round(mb)) + " MB";
  }
  function monthYear(iso){ try{ return new Date(iso).toLocaleDateString(undefined, {month:"long", year:"numeric"}); }catch(e){ return ""; } }
  function downloadText(filename, text, type){
    var blob = new Blob([text], {type: type || "application/json"});
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
  }

  // pick + reposition + zoom a photo, returns a small square Blob (or null when cancelled)
  function openAvatarCropper(file){
    return new Promise(function(resolve){
      if(!/^image\/(jpeg|png|webp|gif)$/.test(file.type)){ toast("Please choose a JPG, PNG, WebP or GIF picture."); return resolve(null); }
      if(file.size > 15 * 1048576){ toast("That picture is too large (15 MB max)."); return resolve(null); }
      var url = URL.createObjectURL(file), img = new Image();
      img.onerror = function(){ URL.revokeObjectURL(url); toast("Couldn't read that picture."); resolve(null); };
      img.onload = function(){
        var view = {zoom: 1, dx: 0, dy: 0}, SZ = 220;
        var content = document.createElement("div");
        content.style.textAlign = "center";
        var cv = document.createElement("canvas");
        cv.style.cssText = "width:" + SZ + "px;height:" + SZ + "px;border-radius:50%;background:#ddd;cursor:grab;touch-action:none;box-shadow:0 0 0 3px var(--accent-soft);";
        function draw(){ Stick.account.drawCrop(cv, img, view, SZ); }
        var down = null;
        cv.addEventListener("pointerdown", function(e){ down = {x: e.clientX, y: e.clientY}; cv.setPointerCapture(e.pointerId); cv.style.cursor = "grabbing"; });
        cv.addEventListener("pointermove", function(e){
          if(!down) return;
          view.dx -= (e.clientX - down.x) / SZ; view.dy -= (e.clientY - down.y) / SZ;   // drag the picture under the circle
          down = {x: e.clientX, y: e.clientY}; draw();
        });
        function up(){ down = null; cv.style.cursor = "grab"; }
        cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
        content.appendChild(cv);
        var zl = document.createElement("label");
        zl.style.cssText = "display:block;margin-top:14px;font-size:0.78rem;color:var(--ink-soft);";
        zl.textContent = "Zoom ";
        var zr = document.createElement("input");
        zr.type = "range"; zr.min = "1"; zr.max = "3"; zr.step = "0.01"; zr.value = "1"; zr.style.cssText = "vertical-align:middle;width:60%;";
        zr.addEventListener("input", function(){ view.zoom = parseFloat(zr.value) || 1; draw(); });
        zl.appendChild(zr); content.appendChild(zl);
        var hint = document.createElement("p");
        hint.className = "acctSub"; hint.style.cssText = "text-align:center;margin:8px 0 0;font-size:0.74rem;";
        hint.textContent = "Drag to reposition. Your photo is cropped to a square and shrunk before it is saved.";
        content.appendChild(hint);
        openModal({
          title: "Adjust your photo", content: content, width: 340,
          actions: [{label: "Cancel", value: null}, {label: "Use photo", kind: "primary", onClick: function(close){
            Stick.account.cropToBlob(img, view, 256).then(function(b){ close(b); });
            return false;
          }}],
          onClose: function(v){ URL.revokeObjectURL(url); resolve(v instanceof Blob ? v : null); }
        });
        draw();
      };
      img.src = url;
    });
  }

  // everything on the account as one file. Pictures are embedded; voice memos and videos are not.
  async function exportAllCloud(lblEl){
    var btn = lblEl.closest("button"), label = lblEl.firstChild.textContent;
    btn.disabled = true; lblEl.firstChild.textContent = "Preparing\u2026";
    busyStart("export", "Preparing your export\u2026", {delay: 300});
    try{
      if(cloudSync){ try{ await cloudSync.flush(); }catch(e){} }
      var boards = await Stick.repo.listBoards();
      var out = [], avSkipped = 0, imgMissing = 0, total = 0;
      for(var i = 0; i < boards.length; i++){
        var rows = await Stick.repo.fetchObjects(boards[i].id);
        var objs = [];
        for(var j = 0; j < rows.length; j++){
          var o = Stick.repo.fromRow(rows[j]);
          var av = o.type === "audio" || o.type === "video";
          var aid = o.assetId || o.attachedAssetId;
          if(av){ avSkipped++; }
          else if(aid){
            try{ var blob = await Stick.assets.blob(aid); if(blob) o.image = await Stick.assets.blobToDataUrl(blob); else imgMissing++; }
            catch(e){ imgMissing++; }
          }
          delete o.assetId; delete o.attachedAssetId; delete o.mediaState; delete o.mediaId;
          objs.push(o);
        }
        total += objs.length;
        out.push({name: boards[i].name, subtitle: boards[i].subtitle || "", notes: objs});
      }
      // the account itself: what is stored about the person, who they share with, and the links they made (never the links' secrets)
      var me = (Stick.auth.user() || {}), acc = settings.account || {}, pf = acc.prof || {}, pr = settings.accountPrefs || {};
      var shares = [];
      try{
        var names = {}; boards.forEach(function(b){ names[b.id] = b.name; });
        shares = (await Stick.share.list()).map(function(x){
          return {type: x.share_type, board: names[x.board_id] || null, createdAt: x.created_at, active: !!x.is_active, shownAs: x.by_name || null,
                  withPhoto: !!x.by_avatar_asset_id, withBio: !!x.by_bio, turnedOffAt: x.disabled_at || null};
        });
      }catch(e){}
      var account = {
        displayName: acc.name || null, email: me.email || acc.email || null, plan: acc.plan || null,
        profile: {username: pr.handle || null, bio: pr.bio || null, avatar: pf.avatarSource || null, fallbackStyle: pf.avatarStyle || null, fallbackColour: pf.avatarColor || null, fallbackEmoji: pf.avatarEmoji || null},
        preferences: {shareAs: pr.shareDefaultIdentity || null, showPhotoOnShares: !!pr.shareShowAvatar, showBioOnShares: !!pr.shareShowBio, newBoardLinks: pr.shareDefaultBoardMode || null,
                      preferredFont: pr.preferredFont || null, defaultNoteColour: pr.defaultNoteColor || null, productUpdateEmails: !!pr.marketingOptIn},
        memberships: boards.map(function(b){ return {board: b.name, role: b.role || null, isOwner: b.owner_id === me.id}; }),
        shareLinks: shares
      };
      downloadText("stick-it-account-" + new Date().toISOString().slice(0, 10) + ".json",
        JSON.stringify({app: "stick-it", version: 2, kind: "account-export", exportedAt: new Date().toISOString(),
          includes: ["account and profile", "preferences", "boards you can open and everything on them (text, layout, formatting)", "pictures (embedded)", "your share links (without their secret addresses)", "which boards you belong to and your role"],
          notIncluded: ["voice memo and video files (the items are listed, the recordings are not)", "the secret address of each share link", "comments (the app has no comments yet)"],
          account: account, boards: out}, null, 2));
      toast("Downloaded " + out.length + (out.length === 1 ? " board" : " boards") + " (" + total + " items)." +
        (avSkipped ? " " + avSkipped + " voice memo/video item" + (avSkipped === 1 ? "" : "s") + " kept their place but not their files." : "") +
        (imgMissing ? " " + imgMissing + " picture" + (imgMissing === 1 ? "" : "s") + " couldn't be fetched." : ""));
    }catch(e){
      toast("Couldn't export: " + Stick.errors.friendly(Stick.errors.parse(e)));
    }
    busyEnd("export");
    btn.disabled = false; lblEl.firstChild.textContent = label;
  }

  async function openManageShares(onChange){
    var content = document.createElement("div");
    content.className = "acctSub"; content.style.textAlign = "left";
    var modal = openModal({title: "Your active links", content: content, width: 460, actions: [{label: "Done", kind: "primary", value: true}]});
    var ld = localLoader(content, "Loading your links\u2026");
    try{
      var list = await Stick.share.list();
      var names = {};
      try{ (await Stick.repo.listBoards()).forEach(function(b){ names[b.id] = b.name; }); }catch(e){}
      var act = list.filter(function(x){ return x.is_active; });
      await new Promise(function(r){ ld.stop(r); });
      content.innerHTML = "";
      if(!act.length){ content.textContent = "You have no active share links."; return; }
      var note = document.createElement("p"); note.style.margin = "0 0 10px";
      note.textContent = "Anyone with one of these links can view it. Turn a link off and it stops working straight away.";
      content.appendChild(note);
      act.forEach(function(x){
        var row = makeDiv("asRow");
        var t = document.createElement("div");
        var kind = x.share_type === "board_live" ? "Live board" : x.share_type === "group_snapshot" ? "Group of items" : "Single item";
        t.innerHTML = "<span></span><small></small>";
        t.firstChild.textContent = kind + (x.board_id && names[x.board_id] ? " \u00b7 " + names[x.board_id] : "");
        t.lastChild.textContent = "Created " + new Date(x.created_at).toLocaleDateString() + (x.by_name ? " \u00b7 shown as " + x.by_name : "") +
          (x.by_avatar_asset_id ? " \u00b7 with photo" : "") + (x.by_bio ? " \u00b7 with bio" : "");
        var b = document.createElement("button"); b.className = "pillBtn danger"; b.textContent = "Turn off";
        b.addEventListener("click", function(){
          b.disabled = true;
          Stick.share.disable(x.id).then(function(){ row.remove(); if(onChange) onChange(-1); toast("That link no longer works."); },
            function(){ b.disabled = false; toast("Couldn't turn it off. Try again."); });
        });
        row.appendChild(t); row.appendChild(b); content.appendChild(row);
      });
    }catch(e){ if(!modal.card.isConnected){ ld.stop(); return; } ld.fail("Couldn\u2019t load your links. " + Stick.errors.friendly(Stick.errors.parse(e)), function(){ modal.close(false); setTimeout(function(){ openManageShares(onChange); }, 0); }); }
  }

  function openDeleteAccount(){
    var content = document.createElement("div");
    content.className = "acctSub"; content.style.textAlign = "left";
    content.innerHTML = '<p style="margin:0 0 8px;">This permanently deletes your account: every board, note, photo, recording and video stored in it, and your profile.</p>' +
      '<p style="margin:0 0 8px;"><b>Every share link you made stops working</b> (snapshots too), and people you shared boards with lose access.</p>' +
      '<p style="margin:0 0 8px;">It can\u2019t be undone. Boards saved as a guest on this device are not touched. Consider exporting first.</p>' +
      '<label class="asField" style="margin-top:12px;"><span>Type DELETE to confirm</span><input type="text" id="delConfirm" autocomplete="off" spellcheck="false"></label>' +
      '<p class="asErr" id="delErr"></p>';
    var m = openModal({
      title: "Delete your account?", content: content, width: 440,
      actions: [{label: "Cancel", value: false}, {label: "Delete forever", kind: "dangerFill", id: "delGo", onClick: function(close, btn){
        var errEl = content.querySelector("#delErr");
        btn.disabled = true; btn.textContent = "Deleting\u2026"; errEl.textContent = "";
        var uid = Stick.mode.uid;
        cloudOverlay("Deleting your account"+String.fromCharCode(8230));
        Stick.account.deleteAccount().then(async function(){
          hideCloudOverlay();
          cloudSigningOut = true;
          try{ await Stick.auth.signOut("local"); }catch(e){}
          if(uid) wipeCloudCache(uid);
          try{ await Stick.assets.cacheClear(); }catch(e){}
          settings.account = null; settings.accountPrefs = null; saveSettings();
          content.innerHTML = '<p style="margin:0;">Your account and its data have been deleted.</p>';
          var act = m.card.querySelector(".modalActions"); if(act) act.remove();
          var ok = document.createElement("button"); ok.className = "pillBtn primary"; ok.textContent = "OK"; ok.style.marginTop = "14px";
          ok.addEventListener("click", function(){ location.hash = ""; location.reload(); });
          content.appendChild(ok);
        }, function(e){
          hideCloudOverlay();
          btn.textContent = "Delete forever"; btn.disabled = content.querySelector("#delConfirm").value !== "DELETE";
          errEl.textContent = (e && e.message) || "Couldn't delete the account.";
        });
        return false;
      }}]
    });
    var go = m.card.querySelector("#delGo"), inp = content.querySelector("#delConfirm");
    go.disabled = true;
    inp.addEventListener("input", function(){ go.disabled = inp.value !== "DELETE"; });
    setTimeout(function(){ inp.focus(); }, 30);
  }

  var AV_COLOR_NAMES = ["Green", "Amber", "Plum", "Blue", "Rust", "Slate", "Gold", "Teal"];
  function avColorName(c){ var i = Stick.account.AVATAR_COLORS.indexOf(c); return i >= 0 ? AV_COLOR_NAMES[i] : "Auto colour"; }
  var CAMERA_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l1.6-2h6.8L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.4"/></svg>';

  // one small popover at a time: click-outside, Esc and Tab close it; arrows move between items
  var openMenuState = null;
  function closeMenu(refocus){
    var st = openMenuState; if(!st) return;
    openMenuState = null;
    st.menu.remove(); st.anchor.setAttribute("aria-expanded", "false");
    document.removeEventListener("mousedown", st.outside, true); document.removeEventListener("keydown", st.keys, true);
    if(refocus) st.anchor.focus();
  }
  function openMenu(anchor, menu){
    closeMenu();
    anchor.parentNode.appendChild(menu);
    anchor.setAttribute("aria-expanded", "true");
    function items(){ return Array.prototype.slice.call(menu.querySelectorAll("button")); }
    menuLayer.open();
    var st = {anchor: anchor, menu: menu,
      outside: function(e){ if(!menu.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) closeMenu(false); },
      keys: function(e){
        if(e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); closeMenu(true); return; }
        if(e.key === "Tab"){ closeMenu(false); return; }
        var list = items(), i = list.indexOf(document.activeElement);
        if(e.key === "ArrowDown"){ e.preventDefault(); list[(i + 1) % list.length].focus(); }
        else if(e.key === "ArrowUp"){ e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
        else if(e.key === "Home"){ e.preventDefault(); list[0].focus(); }
        else if(e.key === "End"){ e.preventDefault(); list[list.length - 1].focus(); }
      }};
    openMenuState = st;
    document.addEventListener("mousedown", st.outside, true); document.addEventListener("keydown", st.keys, true);
    var first = items()[0]; if(first) first.focus();
  }

  // The signed-in parts of the Control Center. Their markup is dropped into the Account, Appearance, Sharing and Privacy & Data
  // sections; one closure wires all of it (every element is found through the shared dialog card), so a keystroke in the Bio
  // field only touches the text it changes. cc: {card, panes, show(id), onClose(fn), accountSave}
  // ---- the plan chip in Account: hover, keyboard focus or a tap shows what the plan includes (no pricing, no marketing)
  function planFeatures(plan){
    var L = (Stick.config && Stick.config.PLAN_LIMITS) || {}, lim = L[plan] || {}, boards = lim.boards || (plan === "premium" ? 6 : 2);
    var gb = plan === "premium" ? "5 GB" : "200 MB";
    var base = [boards + " cloud boards", gb + " of pictures and recordings", "Sharing links", "Comments and review", "Cutouts", "Search"];
    if(plan === "premium") base.push("Alphabet Soup");
    return base;
  }
  function wirePlanChip(btn, pop){
    var plan = btn.dataset.plan === "premium" ? "premium" : "free", open = false, t = 0;
    pop.innerHTML = '<b class="ppTitle"></b><ul class="ppList"></ul>';
    pop.querySelector(".ppTitle").textContent = plan === "premium" ? "Premium" : "Free";
    var ul = pop.querySelector(".ppList");
    planFeatures(plan).forEach(function(f){ var li = document.createElement("li"); li.textContent = f; ul.appendChild(li); });
    function show(){ clearTimeout(t); open = true; pop.hidden = false; btn.setAttribute("aria-expanded", "true"); layer.open(); }
    function hide(){ clearTimeout(t); open = false; pop.hidden = true; btn.setAttribute("aria-expanded", "false"); layer.close(); }
    var layer = OV.layer("plan-popover", function(){ if(open){ open = false; pop.hidden = true; btn.setAttribute("aria-expanded", "false"); } }, function(){ return open; });
    btn.addEventListener("mouseenter", function(){ clearTimeout(t); t = setTimeout(show, 120); });
    btn.addEventListener("mouseleave", function(){ clearTimeout(t); t = setTimeout(hide, 160); });
    pop.addEventListener("mouseenter", function(){ clearTimeout(t); }); pop.addEventListener("mouseleave", function(){ t = setTimeout(hide, 160); });
    btn.addEventListener("focus", show);
    btn.addEventListener("blur", function(){ t = setTimeout(hide, 120); });
    btn.addEventListener("click", function(e){ e.preventDefault(); if(open && pop.dataset.tapped === "1"){ pop.dataset.tapped = ""; hide(); } else { pop.dataset.tapped = "1"; show(); } });   // a tap opens it on touch screens, and a second tap closes it
    return {hide: hide};
  }
  // storage: what is used, what is left, and the total, in words as well as in the bar
  function storageHtml(u){
    var used = Number(u.storage_used) || 0, quota = Number(u.storage_quota) || 0, left = Math.max(0, quota - used), pct = quota ? Math.min(100, Math.round(100 * used / quota)) : 0;
    var txt = fmtBytes(used) + " used, " + fmtBytes(left) + " left of " + fmtBytes(quota);
    return '<div class="asStat wide asStore"><small>Storage</small>' +
      '<div class="asStoreNums"><span><b>' + fmtBytes(used) + '</b> used</span><span><b>' + fmtBytes(left) + '</b> left</span><span class="tot">' + fmtBytes(quota) + ' total</span></div>' +
      '<div class="asBar2" role="img" aria-label="' + escapeAttr(txt + " (" + pct + " percent used)") + '"><i class="u" style="width:' + pct + '%"></i><i class="r"></i></div>' +
      '<div class="asStoreKey" aria-hidden="true"><span><i class="kU"></i>Used</span><span><i class="kR"></i>Remaining</span></div></div>';
  }
  function buildAccountParts(cc){
    var card = cc.card, P = cc.panes;
    closeMenu();
    var acc = settings.account, user = Stick.auth.user() || {};
    var pf = acc.prof || {};
    var pr = Object.assign({}, Stick.account.DEFAULTS, settings.accountPrefs || {});
    var provider = (user.app_metadata && user.app_metadata.provider) || "google";
    var providerUrl = acc.providerUrl || "";
    var savedHandle = pr.handle || "";
    var draft = {
      displayName: acc.name || "", avatarStyle: pf.avatarStyle || "initials", avatarColor: pf.avatarColor || "", avatarEmoji: pf.avatarEmoji || "",
      bio: pr.bio, handle: pr.handle, shareDefaultIdentity: pr.shareDefaultIdentity, shareShowAvatar: pr.shareShowAvatar, shareShowBio: pr.shareShowBio,
      shareDefaultBoardMode: pr.shareDefaultBoardMode, preferredFont: pr.preferredFont, defaultNoteColor: pr.defaultNoteColor
    };
    var stage = {action: "keep", blob: null, url: null};
    var handleStatus = "idle", avSig = "", pvSig = "", pvEls = null;

    P.account.insertAdjacentHTML("beforeend",
// ---------- who I am
        '<section class="asHero" aria-label="Your profile">' +
          '<div class="acctAv pic" id="asPic" role="img" aria-label="Your profile photo"></div>' +
          '<div class="asHeroText">' +
            '<h3 class="asHeroName" id="asHeroName"></h3>' +
            '<p class="asHeroHandle" id="asHeroHandle" hidden></p>' +
            '<p class="asHeroBio" id="asHeroBio" hidden></p>' +
            '<div class="asHeroActions"><div class="asMenuWrap"><button type="button" class="asPhotoBtn" id="asPhotoBtn" aria-haspopup="menu" aria-expanded="false">' + CAMERA_ICON + '<span id="asPhotoLbl">Change photo</span></button></div></div>' +
          '</div>' +
        '</section>' +
// ---------- edit profile
        '<section class="asCard asEdit" aria-labelledby="asH1">' +
          '<h4 id="asH1">Edit profile</h4>' +
          '<div class="asField" id="asNameF"><label class="l" for="asName">Display name</label><input class="asIn" type="text" id="asName" maxlength="60" autocomplete="nickname" dir="auto"></div>' +
          '<div class="asField" id="asHandleF"><label class="l" for="asHandle">Username <span class="cnt">optional</span></label><div class="asPfx"><span aria-hidden="true">@</span><input type="text" id="asHandle" maxlength="20" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="asHandleHelp"></div><p class="help" id="asHandleHelp"></p></div>' +
          '<div class="asField" id="asBioF"><label class="l" for="asBio">Bio <span class="cnt" id="asBioCnt"></span></label><textarea class="asIn" id="asBio" maxlength="120" rows="2" dir="auto" placeholder="A little about you\u2026"></textarea></div>' +
          '<button type="button" class="asAction asFallRow" id="asFallRow" aria-expanded="false" aria-controls="asFall" style="margin-top:10px;"><span class="lbl">Avatar fallback<small>Shown when you have no photo</small></span><span class="go"><span id="asFallVal"></span><span class="chev" aria-hidden="true">\u203A</span></span></button>' +
          '<div class="asFall" id="asFall" hidden>' +
            '<div class="asSeg" id="asStyle" role="group" aria-label="Fallback style"></div>' +
            '<div class="asSwatches" id="asSwatches" role="group" aria-label="Fallback colour"></div>' +
            '<div id="asEmojiBox" hidden><label class="l" for="asEmoji" style="font-size:0.76rem;font-weight:600;color:var(--ink-soft);">Emoji</label><input class="asIn" type="text" id="asEmoji" maxlength="8" placeholder="Pick one or type your own" dir="auto" style="max-width:240px;margin-top:4px;"><div class="asEmojis" id="asEmojiList"></div></div>' +
          '</div>' +
        '</section>');
    P.sharing.insertAdjacentHTML("beforeend",
// ---------- sharing
        '<section class="asCard" aria-labelledby="asH2">' +
          '<h4 id="asH2">Sharing</h4>' +
          '<div class="asItem"><label class="lbl" for="asIdent">Share as</label><span class="asSel"><select class="asSelect" id="asIdent"></select></span></div>' +
          '<div class="asItem" id="asAvRow"><label class="lbl" for="asShowAv">Show profile photo</label><input type="checkbox" class="asSw" id="asShowAv" role="switch"></div>' +
          '<div class="asItem" id="asBioRow"><label class="lbl" for="asShowBio">Show bio</label><input type="checkbox" class="asSw" id="asShowBio" role="switch"></div>' +
          '<div class="asItem"><label class="lbl" for="asBoardMode">New board links<small>Nothing is shared until you make a link.</small></label><span class="asSel"><select class="asSelect" id="asBoardMode"><option value="view">Read only</option><option value="ask">Ask every time</option></select></span></div>' +
          '<div class="asPreview" id="asPreview" aria-live="polite"></div>' +
        '</section>');
    P.appearance.insertAdjacentHTML("beforeend",
// ---------- personalization
        '<section class="asCard" aria-labelledby="asH3">' +
          '<h4 id="asH3">Personalization</h4>' +
          '<div class="asItem"><label class="lbl" for="asFont">Preferred handwriting</label><span class="asSel"><select class="asSelect" id="asFont"></select></span></div>' +
          '<div class="asItem"><span class="lbl" id="asNoteLbl">Default note colour</span><div class="asMenuWrap"><button type="button" class="asAction" id="asNoteBtn" style="width:auto;border:0;padding:6px 8px;" aria-haspopup="menu" aria-expanded="false" aria-labelledby="asNoteLbl asNoteVal"><span class="go" id="asNoteVal"></span></button></div></div>' +
          '<p class="asHint">A preference, not a rule: text a font can\u2019t draw gets a suitable one instead.</p>' +
        '</section>');
    P.account.insertAdjacentHTML("beforeend",
// ---------- account
        '<section class="asCard" aria-labelledby="asH4">' +
          '<h4 id="asH4">Account</h4>' +
          '<div class="asItem"><span class="lbl">E-mail<small>Only you can see this.</small></span><span class="val">' + escapeHtml(acc.email || "") + '</span></div>' +
          '<div class="asItem"><span class="lbl">Plan<small id="asPlanNote"></small></span><span class="val planWrap"><button type="button" class="planChip" id="asPlanName" data-plan="' + escapeAttr(acc.plan === "premium" ? "premium" : "free") + '" aria-expanded="false" aria-controls="asPlanPop" aria-describedby="asPlanPop">' + escapeHtml((acc.plan || "free").charAt(0).toUpperCase() + (acc.plan || "free").slice(1)) + '</button><div class="planPop" id="asPlanPop" role="tooltip" hidden></div></span></div>' +
          '<div class="asStats" id="asStats" aria-live="polite"></div>' +
          '<h5>Connected accounts</h5>' +
          '<div id="asProviders"></div>' +
          '<button type="button" class="asAction" id="asSignOut"><span class="lbl">Sign out<small>On this device only.</small></span></button>' +
        '</section>');
    P.privacy.insertAdjacentHTML("beforeend",
// ---------- data & privacy
        '<section class="asCard" aria-labelledby="asH5">' +
          '<h4 id="asH5">Data &amp; privacy</h4>' +
          '<div class="asItem" id="asMktRow"><label class="lbl" for="asMarketing">Product updates by email<small>Occasional Stick-It news and feature updates. You can unsubscribe anytime.</small></label><input type="checkbox" class="asSw" id="asMarketing" role="switch"></div>' +
          '<button type="button" class="asAction" id="asExport"><span class="lbl">Export my boards<small>One file with your text, layout and pictures. Voice memos and videos are not included yet.</small></span><span class="go" aria-hidden="true">\u203A</span></button>' +
          '<button type="button" class="asAction" id="asImport" hidden><span class="lbl">Import boards from this device<small id="asImportSub"></small></span><span class="go" aria-hidden="true">›</span></button>' +
          '<button type="button" class="asAction" id="asShares"><span class="lbl">Manage active shares<small>See or turn off links you\u2019ve created.</small></span><span class="go"><span id="asSharesN"></span><span aria-hidden="true">\u203A</span></span></button>' +
          '<button type="button" class="asAction" id="asCorrect"><span class="lbl">Correct my profile details<small>Change your name, username or bio at the top of this page, then Save.</small></span><span class="go" aria-hidden="true">\u203A</span></button>' +
          '<button type="button" class="asAction" id="asSignAll"><span class="lbl">Sign out of all devices<small>Ends your sessions everywhere, including this one.</small></span><span class="go" aria-hidden="true">\u203A</span></button>' +
          '<p class="asHint" id="asPrivacyHint" style="margin-top:10px;"></p>' +
          '<div id="asLegal" style="padding-bottom:12px;"></div>' +
        '</section>');
    P.account.insertAdjacentHTML("beforeend",
// ---------- danger
        '<section class="asDanger" aria-labelledby="asH6">' +
          '<div class="lbl"><span class="k" id="asH6">Danger zone</span>Delete account<small>Permanently deletes your account and cloud data. Your public shares will stop working.</small></div>' +
          '<button type="button" class="pillBtn danger" id="asDelete">Delete account\u2026</button>' +
        '</section>');

    var $ = function(id){ return card.querySelector("#" + id); };
    var picEl = $("asPic");
    (function(){                                    // Premium is shown the same way everywhere: a crown sitting on the head of the avatar, never as a word beside it
      var wrap = makeDiv("avCrownWrap"); picEl.parentNode.insertBefore(wrap, picEl); wrap.appendChild(picEl);
      if(isPremium()){ var c = makeDiv("crown"); c.innerHTML = CROWN_SVG; c.title = "Premium"; wrap.appendChild(c); }
    })();

    // ---------- avatar
    function effSource(){
      if(stage.action === "upload") return "upload";
      if(stage.action === "provider" || stage.action === "none") return stage.action;
      var src = pf.avatarSource || "provider";
      return (src === "provider" && !providerUrl) ? "none" : src;
    }
    function avSpec(){
      var eff = effSource();
      return {name: draft.displayName, source: eff === "upload" ? "none" : eff, assetId: eff === "custom" ? pf.avatarAssetId : null,
        providerUrl: providerUrl, style: draft.avatarStyle, color: draft.avatarColor, emoji: draft.avatarEmoji, url: eff === "upload" ? stage.url : null};
    }
    function anonymous(){ return draft.shareDefaultIdentity === "anonymous"; }
    function refreshPreview(){
      var box = $("asPreview");
      if(anonymous()){ pvEls = null; pvSig = ""; box.textContent = "Shared anonymously. Your name, photo and bio aren\u2019t shown."; return; }
      if(!pvEls || !box.contains(pvEls.av)){                               // built once; later keystrokes only change the text
        box.innerHTML = "";
        pvEls = {av: makeDiv("acctAv pv"), t: makeDiv("t"), small: document.createElement("small"), b: document.createElement("b"), i: null};
        pvEls.small.textContent = "What people see";
        pvEls.t.appendChild(pvEls.small); pvEls.t.appendChild(pvEls.b); box.appendChild(pvEls.av); box.appendChild(pvEls.t); pvSig = "";
      }
      var showPhoto = !!draft.shareShowAvatar, sp = avSpec();
      var sig = (showPhoto ? ["p", sp.source, sp.assetId, sp.providerUrl, sp.style, sp.color, sp.emoji, sp.url, sp.source === "none" ? Array.from((sp.name || "").trim()).slice(0, 2).join("") : ""].join("\u0001") : "q");
      if(sig !== pvSig){
        pvSig = sig;
        if(showPhoto){ pvEls.av.removeAttribute("style"); pvEls.av.textContent = ""; paintAvatar(pvEls.av, sp); }
        else { pvEls.av.innerHTML = ""; pvEls.av.style.background = "transparent"; pvEls.av.style.boxShadow = "inset 0 0 0 1px var(--line)"; pvEls.av.style.color = "var(--ink-soft)"; pvEls.av.textContent = "?"; }
      }
      pvEls.b.textContent = "Shared by " + (draft.displayName.trim() || "you");
      var bio = draft.shareShowBio && draft.bio.trim() ? draft.bio.trim() : "";
      if(bio){ if(!pvEls.i){ pvEls.i = document.createElement("i"); pvEls.t.appendChild(pvEls.i); } pvEls.i.textContent = bio; }
      else if(pvEls.i){ pvEls.i.remove(); pvEls.i = null; }
    }
    function refreshHero(){
      var name = draft.displayName.trim();
      $("asHeroName").textContent = name || "Your name";
      $("asHeroName").style.opacity = name ? "1" : "0.5";
      var hd = $("asHeroHandle"); hd.hidden = !draft.handle; hd.textContent = draft.handle ? "@" + draft.handle : "";
      var hb = $("asHeroBio"); hb.hidden = !draft.bio.trim(); hb.textContent = draft.bio.trim();
      var eff = effSource(), sp = avSpec();
      var sig = [sp.source, sp.assetId, sp.providerUrl, sp.style, sp.color, sp.emoji, sp.url, eff === "none" ? Array.from((sp.name || "").trim()).slice(0, 2).join("") : ""].join("\u0001");
      if(sig !== avSig){ avSig = sig; paintAvatar(picEl, sp); }          // typing a bio or a name must not rebuild (and re-fetch) the picture
      $("asPhotoLbl").textContent = (eff === "none" ? "Add photo" : "Change photo");
      $("asFallVal").textContent = (draft.avatarStyle === "emoji" ? "Emoji" : "Initials") + " \u00B7 " + avColorName(draft.avatarColor);
      refreshPreview();
    }
    function setStage(next){ if(stage.url) URL.revokeObjectURL(stage.url); stage = next; refreshHero(); }
    async function pickPhoto(){
      var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/jpeg,image/png,image/webp,image/gif";
      inp.addEventListener("change", async function(){
        var f = inp.files[0]; if(!f) return;
        var blob = await openAvatarCropper(f);
        if(blob) setStage({action: "upload", blob: blob, url: URL.createObjectURL(blob)});
      });
      inp.click();
    }
    $("asPhotoBtn").addEventListener("click", function(){
      if(openMenuState && openMenuState.anchor === $("asPhotoBtn")){ closeMenu(true); return; }
      var eff = effSource(), menu = makeDiv("asMenu");
      menu.setAttribute("role", "menu");
      function item(label, fn, cls){
        var b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "menuitem"); b.textContent = label; if(cls) b.className = cls;
        b.addEventListener("click", function(){ closeMenu(true); fn(); }); menu.appendChild(b);
      }
      item(eff === "none" ? "Upload photo" : "Upload a new photo", pickPhoto);
      if(providerUrl && eff !== "provider") item("Use " + providerName(provider) + " photo", function(){ setStage({action: "provider", blob: null, url: null}); });
      if(eff !== "none") item("Remove photo", function(){ setStage({action: "none", blob: null, url: null}); }, "danger");
      openMenu($("asPhotoBtn"), menu);
    });

    // ---------- fields
    function clearErr(){ $("asErr").textContent = ""; card.querySelectorAll(".asField.err").forEach(function(f){ f.classList.remove("err"); }); }
    function showErr(msg, field){
      $("asErr").textContent = msg;
      var f = field && $({name: "asNameF", handle: "asHandleF", bio: "asBioF"}[field] || "");
      if(f){ f.classList.add("err"); var i = f.querySelector("input,textarea"); if(i) i.focus(); }
    }
    $("asName").value = draft.displayName;
    $("asName").addEventListener("input", function(){ draft.displayName = $("asName").value; clearErr(); refreshHero(); });
    $("asBio").value = draft.bio;
    function bioCount(){ $("asBioCnt").textContent = Array.from($("asBio").value).length + " / 120"; }
    bioCount();
    $("asBio").addEventListener("input", function(){ draft.bio = $("asBio").value; bioCount(); clearErr(); refreshHero(); });

    // username: normalise as typed, ask the server (politely, debounced) whether it is free
    var hTimer = null;
    function paintHandleHelp(){
      var help = $("asHandleHelp"); help.className = "help";
      var v = draft.handle;
      if(!v || v === savedHandle){ help.textContent = "Used as your Stick-It handle. Letters, numbers and _ (3\u201320)."; return; }
      if(!Stick.account.HANDLE_RE.test(v)){ help.textContent = "Use 3\u201320 letters, numbers or _."; help.classList.add("bad"); return; }
      if(handleStatus === "checking"){ help.innerHTML = miniLoaderHtml() + "<span>Checking\u2026</span>"; help.classList.add("checking"); }
      else if(handleStatus === "ok"){ help.textContent = "\u2713 Available"; help.classList.add("good"); }
      else if(handleStatus === "taken"){ help.textContent = "That username is taken."; help.classList.add("bad"); }
      else help.textContent = "Used as your Stick-It handle. Letters, numbers and _ (3\u201320).";
    }
    $("asHandle").value = draft.handle;
    $("asHandle").addEventListener("input", function(){
      var v = $("asHandle").value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
      $("asHandle").value = v; draft.handle = v; clearErr(); handleStatus = "idle";
      clearTimeout(hTimer);
      if(v && v !== savedHandle && Stick.account.HANDLE_RE.test(v)){
        handleStatus = "checking";
        hTimer = setTimeout(function(){
          Stick.account.handleAvailable(v).then(function(ok){ if(draft.handle === v){ handleStatus = ok ? "ok" : "taken"; paintHandleHelp(); } },
            function(){ if(draft.handle === v){ handleStatus = "idle"; paintHandleHelp(); } });     // can't check right now: the server still decides on Save
        }, 450);
      }
      paintHandleHelp(); refreshHero();
    });
    paintHandleHelp();

    // ---------- avatar fallback (collapsed by default)
    $("asFallRow").addEventListener("click", function(){
      var open = $("asFall").hidden; $("asFall").hidden = !open; $("asFallRow").setAttribute("aria-expanded", String(open));
    });
    function seg(id, options, get, set){
      var box = $(id);
      function paint(){ box.innerHTML = ""; options.forEach(function(o){
        var b = document.createElement("button"); b.type = "button"; b.textContent = o[1]; b.className = get() === o[0] ? "on" : ""; b.setAttribute("aria-pressed", String(get() === o[0]));
        b.addEventListener("click", function(){ set(o[0]); paint(); }); box.appendChild(b); }); }
      paint();
    }
    function paintSwatches(){
      var box = $("asSwatches"); box.innerHTML = "";
      var auto = document.createElement("button"); auto.type = "button"; auto.className = "auto" + (!draft.avatarColor ? " on" : ""); auto.textContent = "Automatic";
      auto.addEventListener("click", function(){ draft.avatarColor = ""; paintSwatches(); refreshHero(); }); box.appendChild(auto);
      Stick.account.AVATAR_COLORS.forEach(function(c, i){
        var b = document.createElement("button"); b.type = "button"; b.style.background = c; b.setAttribute("aria-label", AV_COLOR_NAMES[i]); b.title = AV_COLOR_NAMES[i]; b.className = draft.avatarColor === c ? "on" : "";
        b.addEventListener("click", function(){ draft.avatarColor = c; paintSwatches(); refreshHero(); }); box.appendChild(b);
      });
    }
    function paintStyleBits(){ $("asEmojiBox").hidden = draft.avatarStyle !== "emoji"; }
    seg("asStyle", [["initials", "Initials"], ["emoji", "Emoji"]], function(){ return draft.avatarStyle; }, function(v){ draft.avatarStyle = v; paintStyleBits(); refreshHero(); });
    paintSwatches(); paintStyleBits();
    $("asEmoji").value = draft.avatarEmoji;
    $("asEmoji").addEventListener("input", function(){ draft.avatarEmoji = Array.from($("asEmoji").value).slice(0, 2).join(""); refreshHero(); });
    AV_EMOJIS.forEach(function(em){
      var b = document.createElement("button"); b.type = "button"; b.textContent = em; b.setAttribute("aria-label", "Use " + em);
      b.addEventListener("click", function(){ draft.avatarEmoji = em; $("asEmoji").value = em; refreshHero(); });
      $("asEmojiList").appendChild(b);
    });

    // ---------- sharing: one identity choice; photo/bio only make sense when sharing as yourself
    function paintIdent(){
      var sel = $("asIdent"); sel.innerHTML = "";
      var o1 = document.createElement("option"); o1.value = "named"; o1.textContent = draft.displayName.trim() || "Me";
      var o2 = document.createElement("option"); o2.value = "anonymous"; o2.textContent = "Anonymous";
      sel.appendChild(o1); sel.appendChild(o2); sel.value = draft.shareDefaultIdentity === "anonymous" ? "anonymous" : "named";
    }
    function paintShareChecks(){
      var anon = anonymous();
      [["asShowAv", "shareShowAvatar", "asAvRow"], ["asShowBio", "shareShowBio", "asBioRow"]].forEach(function(p){
        var cb = $(p[0]); cb.checked = !anon && !!draft[p[1]]; cb.disabled = anon; $(p[2]).classList.toggle("off", anon);
      });
      refreshPreview();
    }
    paintIdent();
    $("asIdent").addEventListener("change", function(){ draft.shareDefaultIdentity = $("asIdent").value; paintShareChecks(); });
    $("asName").addEventListener("input", paintIdent);
    $("asBoardMode").value = draft.shareDefaultBoardMode === "ask" ? "ask" : "view";
    $("asBoardMode").addEventListener("change", function(){ draft.shareDefaultBoardMode = $("asBoardMode").value; });
    $("asShowAv").addEventListener("change", function(){ draft.shareShowAvatar = $("asShowAv").checked; refreshPreview(); });
    $("asShowBio").addEventListener("change", function(){ draft.shareShowBio = $("asShowBio").checked; refreshPreview(); });
    paintShareChecks();

    // ---------- personalization
    var fs = $("asFont");
    var auto = document.createElement("option"); auto.value = ""; auto.textContent = "Let Stick-It choose"; fs.appendChild(auto);
    SCRIPT_ORDER.forEach(function(sc){
      var g = document.createElement("optgroup"); g.label = SCRIPT_NAMES[sc];
      fontsOfScript(sc).forEach(function(f){ var o = document.createElement("option"); o.value = f.name; o.textContent = f.name; o.style.fontFamily = fontStack(f.name); g.appendChild(o); });
      fs.appendChild(g);
    });
    fs.value = FONT_BY_NAME[draft.preferredFont] ? draft.preferredFont : "";
    fs.addEventListener("change", function(){ draft.preferredFont = fs.value; });
    function paintNoteVal(){
      var pc = PAPER_COLORS.filter(function(c){ return c.name === draft.defaultNoteColor; })[0];
      $("asNoteVal").innerHTML = "";
      if(pc){ var d = document.createElement("span"); d.className = "dot"; d.style.background = pc.bg; $("asNoteVal").appendChild(d); }
      $("asNoteVal").appendChild(document.createTextNode(pc ? pc.name : "Surprise me"));
      var chev = document.createElement("span"); chev.setAttribute("aria-hidden", "true"); chev.textContent = "\u25BE"; $("asNoteVal").appendChild(chev);
    }
    paintNoteVal();
    $("asNoteBtn").addEventListener("click", function(){
      if(openMenuState && openMenuState.anchor === $("asNoteBtn")){ closeMenu(true); return; }
      var menu = makeDiv("asMenu right"); menu.setAttribute("role", "menu");
      var a = document.createElement("button"); a.type = "button"; a.setAttribute("role", "menuitem"); a.textContent = "Surprise me";
      a.addEventListener("click", function(){ draft.defaultNoteColor = ""; closeMenu(true); paintNoteVal(); }); menu.appendChild(a);
      var sw = makeDiv("asSwatches");
      PAPER_COLORS.forEach(function(c){
        var b = document.createElement("button"); b.type = "button"; b.style.background = c.bg; b.title = c.name; b.setAttribute("aria-label", c.name); b.className = draft.defaultNoteColor === c.name ? "on" : "";
        b.addEventListener("click", function(){ draft.defaultNoteColor = c.name; closeMenu(true); paintNoteVal(); }); sw.appendChild(b);
      });
      menu.appendChild(sw);
      openMenu($("asNoteBtn"), menu);
    });

    // ---------- account facts (loaded from the server; nothing invented)
    var planUi = wirePlanChip($("asPlanName"), $("asPlanPop"));
    cc.onClose(function(){ planUi.hide(); });
    $("asPlanNote").textContent = (acc.plan === "premium") ? "Thank you for supporting Stick-It." : "Premium is coming later. Nothing to buy yet.";
    function statSkeleton(){
      $("asStats").innerHTML = '<div class="asStat"><small>Boards</small><span class="asSkel"></span></div><div class="asStat"><small>Items</small><span class="asSkel"></span></div>' +
        '<div class="asStat"><small>Storage</small><span class="asSkel"></span></div><div class="asStat"><small>Member since</small><span class="asSkel"></span></div>';
    }
    var activeShares = null;
    function paintShareCount(){ $("asSharesN").textContent = activeShares == null ? "" : activeShares + (activeShares === 1 ? " link" : " links"); }
    function loadUsage(){
      statSkeleton();
      Stick.account.usage().then(function(u){
        if(!card.isConnected) return;
        var pl = u.plan === "premium" ? "premium" : "free"; $("asPlanName").textContent = pl.charAt(0).toUpperCase() + pl.slice(1);
        if($("asPlanName").dataset.plan !== pl){ $("asPlanName").dataset.plan = pl; planUi.hide(); wirePlanChip($("asPlanName"), $("asPlanPop")); }
        var pct = u.storage_quota ? Math.min(100, Math.round(100 * u.storage_used / u.storage_quota)) : 0;
        var cells = [];
        if(u.boards != null) cells.push('<div class="asStat"><small>Boards</small>' + u.boards + (u.boards_limit ? ' / ' + u.boards_limit : '') + '</div>');
        if(u.objects != null) cells.push('<div class="asStat"><small>Items</small>' + u.objects + '</div>');
        if(u.storage_used != null) cells.push(storageHtml(u));
        if(u.member_since) cells.push('<div class="asStat"><small>Member since</small>' + escapeHtml(monthYear(u.member_since)) + '</div>');
        $("asStats").innerHTML = cells.join("");
        activeShares = u.active_shares; paintShareCount();
      }, function(){
        if(!card.isConnected) return;
        $("asStats").innerHTML = '<div class="asStat wide" style="font-weight:400;color:var(--ink-soft);">Couldn\u2019t load your numbers. <button type="button" class="asLink" id="asRetry">Try again</button></div>';
        $("asRetry").addEventListener("click", loadUsage);
      });
    }
    var usageLoaded = false;
    function ensureUsage(){ if(usageLoaded) return; usageLoaded = true; loadUsage(); }
    cc.once("account", ensureUsage); cc.once("privacy", ensureUsage);       // the numbers are fetched when a section that shows them is opened

    function loadProviders(){
      var box = $("asProviders");
      box.innerHTML = '<div class="asItem"><span class="lbl"><span class="asSkel" style="width:90px"></span></span></div>';
      Stick.auth.identities().then(function(list){
        if(!card.isConnected) return;
        box.innerHTML = "";
        var byProv = {}; list.forEach(function(i){ byProv[i.provider] = i; });
        ["google", "github"].forEach(function(pv){
          var idn = byProv[pv], row = makeDiv("asItem asProv");
          var lbl = document.createElement("span"); lbl.className = "lbl";
          lbl.textContent = providerName(pv);
          if(idn && pv === provider){ var chip = document.createElement("span"); chip.className = "asChip"; chip.textContent = "This sign-in"; lbl.appendChild(chip); }
          var sm = document.createElement("small"); sm.textContent = idn ? (((idn.identity_data || {}).email) || "Connected") : "Not connected"; lbl.appendChild(sm);
          row.appendChild(lbl);
          var right = document.createElement("span"); right.className = "val";
          if(idn){ right.textContent = "Connected"; }
          else {
            var b = document.createElement("button"); b.type = "button"; b.className = "asLink"; b.textContent = "Connect";
            b.addEventListener("click", function(){
              Stick.auth.linkProvider(pv).catch(function(e){
                var er = Stick.errors.parse(e);
                toast(/manual linking|linking is disabled|not enabled|provider is not/i.test(er.message) ? providerName(pv) + " isn\u2019t switched on for this project yet." : "Couldn\u2019t connect " + providerName(pv) + ": " + Stick.errors.friendly(er));
              });
            });
            right.appendChild(b);
          }
          row.appendChild(right); box.appendChild(row);
        });
      }, function(){
        if(!card.isConnected) return;
        box.innerHTML = '<div class="asItem"><span class="lbl" style="color:var(--ink-soft);">Couldn\u2019t load your sign-ins. <button type="button" class="asLink" id="asRetryP">Try again</button></span></div>';
        $("asRetryP").addEventListener("click", loadProviders);
      });
    }
    cc.once("account", loadProviders);

    // ---------- e-mail preference (staged like the rest: Save writes it, Cancel drops it)
    draft.marketingOptIn = !!pr.marketingOptIn;
    $("asMarketing").checked = draft.marketingOptIn;
    $("asMarketing").addEventListener("change", function(){ draft.marketingOptIn = $("asMarketing").checked; });
    if((pf.ageBand || "adult") !== "adult"){      // promotional e-mail is only for adult accounts (policy choice, flagged for legal review)
      draft.marketingOptIn = false; $("asMarketing").checked = false; $("asMarketing").disabled = true; $("asMktRow").classList.add("off");
      $("asMktRow").querySelector("small").textContent = "Not available for this account.";
    }
    // ---------- privacy requests + legal links
    var lg = Stick.legal || {};
    $("asPrivacyHint").textContent = "Export, correct and delete work straight away from this page. Voice memos and videos aren" + "\u2019t in the export yet. " +
      (lg.privacyEmail ? "Anything else: " + lg.privacyEmail + "." : "");
    $("asLegal").appendChild(legalPointer());

    // ---------- immediate actions (never staged)
    $("asExport").addEventListener("click", function(){ exportAllCloud($("asExport").querySelector(".lbl")); });
    $("asShares").addEventListener("click", function(){ openManageShares(function(d){ if(activeShares != null){ activeShares += d; paintShareCount(); } }); });
    try{
      var localBoards = Stick.migrate.inspectLocal(localStorage);
      if(localBoards.length){
        var n = localBoards.reduce(function(a, b){ return a + b.objects; }, 0);
        $("asImport").hidden = false;
        $("asImportSub").textContent = localBoards.length + (localBoards.length === 1 ? " board" : " boards") + " made before you signed in · " + n + (n === 1 ? " item" : " items") + ". Your copies on this device stay untouched.";
        $("asImport").addEventListener("click", function(){ cleanup(); closeAccountModal(); startManualImport(); });
      }
    }catch(e){}
    $("asSignAll").addEventListener("click", async function(){
      var go = await confirmDialog({title: "Sign out of all devices?", body: "You\u2019ll be signed out everywhere, including here. Your boards stay safe in your account.", confirm: "Sign out everywhere", danger: true});
      if(go) cloudSignOut("global");
    });
    $("asSignOut").addEventListener("click", function(){ cloudSignOut("local"); });
    $("asCorrect").addEventListener("click", function(){ cc.show("account"); setTimeout(function(){ $("asName").focus(); }, 30); });
    $("asDelete").addEventListener("click", openDeleteAccount);

    // ---------- Cancel discards (nothing was uploaded); Save validates and persists everything staged
    function cleanup(){ closeMenu(); clearTimeout(hTimer); if(stage.url) URL.revokeObjectURL(stage.url); }
    cc.onClose(cleanup);
    cc.accountSave = async function(){
      clearErr();
      var bad = Stick.account.validate(draft);
      if(bad){ showErr(bad.message, bad.field); return; }
      if(handleStatus === "taken" && draft.handle !== savedHandle){ showErr("That username is taken. Pick another one.", "handle"); return; }
      var btn = $("asSave"); btn.disabled = true; btn.textContent = "Saving\u2026";
      try{
        var res = await Stick.account.save(draft, stage);
        applyAccountData(res);
        // the saved profile is the new starting point; stay where you are
        pf = (settings.account && settings.account.prof) || {}; pr = Object.assign({}, Stick.account.DEFAULTS, settings.accountPrefs || {});
        savedHandle = pr.handle || ""; handleStatus = "idle"; avSig = ""; pvSig = "";
        if(stage.url) URL.revokeObjectURL(stage.url);
        stage = {action: "keep", blob: null, url: null};
        draft.handle = pr.handle || draft.handle; paintHandleHelp(); refreshHero();
        cc.markSaved();
      }catch(e){
        var er = Stick.errors.parse(e);
        btn.disabled = false; btn.textContent = "Save";
        var taken = er.code === "HANDLE_TAKEN";
        if(taken){ handleStatus = "taken"; paintHandleHelp(); }
        showErr(er.code === "INVALID" ? e.message : Stick.errors.friendly(er), e.field || (taken ? "handle" : null));   // everything typed is still here
      }
    };
    cc.focusProfile = function(){ var n = $("asName"); if(n) n.focus({preventScroll: true}); };
    refreshHero();
  }

  var GITHUB_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.7 5.4-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>';
  function mountGitHubButton(){
    var gh = document.getElementById("githubBtn");
    if(!gh) return;
    if(!CLOUD_OK){ gh.style.display = "none"; return; }       // needs the cloud backend
    gh.innerHTML = GITHUB_ICON + "<span>Continue with GitHub</span>";
    gh.addEventListener("click", function(){ beginProviderSignIn("github"); });
  }
  function mountGoogleButton(){
    mountGitHubButton();
    var fallback = document.getElementById("googleBtnFallback");
    var holder = document.getElementById("googleBtnHolder");
    if(!fallback || !holder) return;
    if(CLOUD_OK){                              // Supabase Auth: a full redirect to Google and back
      fallback.innerHTML = GOOGLE_ICON + "<span>Continue with Google</span>";
      fallback.addEventListener("click", beginGoogleSignIn);
      return;
    }
    var configured = GOOGLE_CLIENT_ID.indexOf("YOUR_GOOGLE_CLIENT_ID") === -1;
    if(!configured || !window.google || !window.google.accounts){
      fallback.innerHTML = GOOGLE_ICON + "<span>Continue with Google</span>";
      fallback.addEventListener("click", function(){
        toast(configured ? "Still loading Google Sign-In. Try again in a second." : "Google Sign-In isn’t configured yet on this deployment.");
      });
      return;
    }
    fallback.style.display = "none";
    try{
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: window.handleGoogleCredentialResponse });
      window.google.accounts.id.renderButton(holder, { theme: "outline", size: "large", width: 304, text: "continue_with" });
    }catch(e){
      fallback.style.display = "flex";
      fallback.innerHTML = GOOGLE_ICON + "<span>Continue with Google</span>";
      fallback.addEventListener("click", function(){ toast("Google Sign-In couldn't load just now."); });
    }
  }

  (function(){ var b = document.getElementById("board"); if(b) b.setAttribute("tabindex", "-1"); })();
  document.getElementById("skipLink").addEventListener("click", function(e){ e.preventDefault(); var b = document.getElementById("board"); if(b) b.focus(); });
  accountBtn.addEventListener("click", openAccountModal);
  var quickOut = document.getElementById("quickSignOut");
  if(quickOut) quickOut.addEventListener("click", function(){ closeFloatingPopovers(); if(CLOUD) cloudSignOut(); else { settings.account = null; saveSettings(); updateAccountIcon(); toast("Signed out."); } });
  if(window.Stick && Stick.dev){        // local development only: this block is never built on any other hostname
    Stick.hooks = Stick.hooks || {};
    Stick.dev.presenceDemo = function(on){ try{ if(on) localStorage.setItem("stickit.dev.presence", "bc"); else localStorage.removeItem("stickit.dev.presence"); }catch(e){} return on ? "Presence demo on: reload two tabs" : "Presence demo off"; };
    Stick.dev.startPresence = function(name){                       // starts the broadcast transport on the current board even in guest mode
      Stick.collab.start({boardId: activeBoardId, role: "owner", comments: false, canComment: false, transport: "broadcast",
        me: {uid: "dev-" + (name || getDisplayName()), name: name || getDisplayName()},
        host: {refresh: function(){ notes.forEach(function(n){ if(n.el) Stick.collab.decorate(n, n.el); }); }, openPopover: function(){ return null; }}});
      return "presence on";
    };
    Stick.dev.ui = {                // local only: open the new dialogs without setting up a board for each (used in the polish pass tests)
      cleanUp: function(p){ openCleanUp(p); }, activeShares: function(){ openManageShares(function(){}); },
      foot: {start: function(t, d){ busyStart('dev', t || 'Loading board…', {delay: d == null ? 0 : d}); }, done: function(t){ busyDone('dev', t || 'Done.'); }, fail: function(t){ busyFail('dev', t || 'Couldn’t load photos.', function(){}); }, end: function(){ busyEnd('dev'); }},
      controlCenter: function(sec){ openControlCenter(sec); }, stripNeedsMore: function(n){ stripNeedsMore(n == null ? 1 : n, function(){}); }, stripPicker: function(){ openStripPicker([]); }, doneTray: function(){ openDoneTray(); },
      askReason: function(){ return Stick.collab.askReason({modal: openModal}, null, function(){}); }
    };
    Stick.dev.setPremium = function(on){ try{ if(on === null || on === undefined) localStorage.removeItem("stickit.dev.premium"); else localStorage.setItem("stickit.dev.premium", on ? "1" : "0"); }catch(e){} return on ? "Premium on (this browser only)" : "Premium off (this browser only)"; };
    Stick.dev.loader = {         // local only: look at the loader states without needing a slow network
      show: function(t, cover){ cloudOverlay(t || "Loading…", !!cover); },
      done: function(t){ stickLoaderDone(t || "Done."); },
      fail: function(t){ stickLoaderFail(t || "Couldn’t load this board.", function(){}); },
      hide: hideCloudOverlay
    };
    Stick.hooks.openSettings = function(section){ openControlCenter(section); };
    Stick.hooks.showAgeFlow = function(){ if(!settings.account){ openAccountModal(); renderAccountModal("age"); } };
    var devSec = document.createElement("section");
    devSec.className = "setSec";
    devSec.innerHTML = '<h4>Developer (local only)</h4><div class="setBtns"><button class="pillBtn" id="devResetAge">Reset age/consent test state</button><button class="pillBtn" id="devShowAge">Show age flow</button></div>' +
      '<p class="setHelp">Clears only this browser\u2019s local state. Server records are not changed.</p>';
    devSec.id = "devSection";                                       // shown inside Legal & About (the Control Center adopts it there)
    document.querySelector("#settingsModal .acctCard").appendChild(devSec);
    devSec.querySelector("#devResetAge").addEventListener("click", function(){ Stick.dev.resetAgeGate(); Stick.dev.resetConsent(); toast("Age and consent test state cleared."); });
    devSec.querySelector("#devShowAge").addEventListener("click", function(){ closeAccountModal(); cancelSettings(); Stick.dev.showAgeFlow(); });
  }
  document.getElementById("openAcctFromSettings").addEventListener("click", function(e){ e.preventDefault(); cancelSettings(); openAccountModal(); });
  updateAccountIcon();

  // ---------- settings controls ----------
  (function buildFontSelect(){
    SCRIPT_ORDER.forEach(function(sc){
      var group = document.createElement("optgroup");
      group.label = SCRIPT_NAMES[sc];
      fontsOfScript(sc).forEach(function(f){
        var opt = document.createElement("option");
        opt.value = f.name;
        opt.textContent = f.name;
        opt.style.fontFamily = fontStack(f.name);
        group.appendChild(opt);
      });
      fontSelect.appendChild(group);
    });
  })();
  if(!FONT_BY_NAME[settings.fontName]) settings.fontName = FONTS[0].name;
  fontSelect.value = settings.fontName;
  var fontPickRow = document.getElementById("fontPickRow");
  function syncSwitch(sw, on){ sw.classList.toggle("on", on); sw.setAttribute("aria-checked", String(on)); }
  syncSwitch(lockToggle, settings.lockFont);
  fontPickRow.hidden = !settings.lockFont;

  lockToggle.addEventListener("click", function(){
    settings.lockFont = !settings.lockFont;
    syncSwitch(lockToggle, settings.lockFont);
    fontPickRow.hidden = !settings.lockFont;
  });
  fontSelect.addEventListener("change", function(){
    settings.fontName = fontSelect.value;
  });

  syncSwitch(darkToggle, settings.theme === "dark");
  darkToggle.addEventListener("click", function(){
    settings.theme = settings.theme === "dark" ? "light" : "dark";
    document.body.classList.toggle("dark", settings.theme === "dark"); mirrorTheme();
    syncSwitch(darkToggle, settings.theme === "dark");
  });

  syncSwitch(cleanupToggle, settings.cleanupEmpty);
  cleanupToggle.addEventListener("click", function(){
    settings.cleanupEmpty = !settings.cleanupEmpty;
    syncSwitch(cleanupToggle, settings.cleanupEmpty);
  });
  // clicking a row's label flips its switch
  Array.prototype.forEach.call(panel.querySelectorAll(".setRow > label.lbl"), function(lbl){
    lbl.addEventListener("click", function(e){
      var sw = document.getElementById(lbl.getAttribute("for"));
      if(sw && sw.classList.contains("switch")){ e.preventDefault(); sw.click(); }
    });
  });

  displayNameInput.value = settings.displayName || "";
  displayNameInput.addEventListener("input", function(){
    if(!CLOUD) settings.displayName = displayNameInput.value.trim();     // signed in: saved to the account on Save
  });
  displayNameInput.addEventListener("keydown", function(e){ if(e.key === "Enter") saveSettingsAndClose(); });

  function currentBoardName(){
    var b = boards.filter(function(x){ return x.id === activeBoardId; })[0];
    return b ? b.name : "My Board";
  }
  // swap every note on the board for `next`, as one undoable step
  function replaceAllNotes(next, label){
    var before = captureState(notes.map(function(n){ return n.id; }));
    notes.forEach(function(n){ clearTimeout(n._cleanT); clearDecorations(n.id); if(n.el) n.el.remove(); });
    selected = new Set();
    notes = next;
    notes.forEach(function(n){ renderNote(n, false); });
    afterHistoryApply();
    return recordChange(label, before, {newIds:notes.map(function(n){ return n.id; })});
  }

  var clearArmed = false, clearTimer;
  clearBtn.addEventListener("click", function(){
    if(!notes.length){ toast("The board is already empty."); return; }
    if(!clearArmed){
      clearArmed = true;
      clearBtn.textContent = "Click again to clear";
      clearBtn.classList.add("dangerFill");
      clearTimer = setTimeout(function(){
        clearArmed = false;
        clearBtn.textContent = "Clear board";
        clearBtn.classList.remove("dangerFill");
      }, 3500);
      return;
    }
    clearTimeout(clearTimer);
    clearArmed = false;
    clearBtn.textContent = "Clear board";
    clearBtn.classList.remove("dangerFill");
    var action = replaceAllNotes([], "Clear board");
    updateCount();
    toast("Board cleared.", "Undo", function(){ undoIfTop(action); });
  });

  // ---------- export / import ----------
  function exportPayload(){
    return {app:"stick-it", version:2, board:currentBoardName(), exportedAt:new Date().toISOString(), notes:notes.concat(donePile).map(serializeNote)};
  }
  // Pictures that live in the account are downloaded into the file so it stays portable. Recordings and videos are
  // not included (their files stay in the account / on the device); the dialog says so.
  async function exportPayloadCloud(){
    var out = [];
    for(var i = 0; i < notes.length; i++){
      var o = serializeNote(notes[i]);
      var aid = o.assetId || o.attachedAssetId;
      if(!isAV(o) && aid && (!o.image || !/^data:/.test(o.image))){
        try{
          var blob = o.image ? await (await fetch(o.image)).blob() : await Stick.assets.blob(aid);
          if(blob) o.image = await Stick.assets.blobToDataUrl(blob); else delete o.image;
        }catch(e){ delete o.image; }
      }
      delete o.assetId; delete o.attachedAssetId; delete o.mediaState;
      if(isAV(o)) delete o.image;
      out.push(o);
    }
    return {app:"stick-it", version:2, board:currentBoardName(), exportedAt:new Date().toISOString(), notes:out};
  }
  exportBtn.addEventListener("click", async function(){
    var payload = CLOUD ? await exportPayloadCloud() : exportPayload();
    var data = JSON.stringify(payload, null, 2);
    var withImg = notes.filter(function(n){ return n.image || n.assetId || n.attachedAssetId; }).filter(function(n){ return !isAV(n); }).length;
    var avCount = notes.filter(isAV).length;
    var content = document.createElement("div");
    var box = makeDiv("noteBox");
    box.textContent = "“" + currentBoardName() + "” · " + notes.length + (notes.length === 1 ? " note" : " notes") +
      (withImg ? " (" + withImg + " with images)" : "") + ". The file keeps text, formatting, colours, fonts, images and positions." +
      (avCount ? " Voice memos and videos aren\u2019t included in the file (" + avCount + " on this board)." : "");
    content.appendChild(box);
    var m = openModal({
      title:"Export board",
      sub:"Save a copy you can import later, here or in another browser.",
      content:content,
      actions:[
        {label:"Copy JSON", onClick:function(close, b){
          copyText(data).then(function(ok){ if(ok) flashCopied(b, "Copied!"); else toast("Couldn't copy automatically."); });
          return false;
        }},
        {label:"Download .json", kind:"primary", onClick:function(){
          var safeName = currentBoardName().replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "board";
          downloadBlob("stickit-" + safeName + ".json", new Blob([data], {type:"application/json"}));
          toast("Board exported.");
        }}
      ]
    });
    m.card.querySelector(".modalActions .pillBtn").classList.add("copyBtn");
  });

  function parseImport(raw){
    var parsed;
    try{ parsed = JSON.parse(raw); }catch(e){ return {error:"That doesn't look like valid board JSON."}; }
    var list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.notes) ? parsed.notes : null);
    if(!list) return {error:"Expected a Stick-It export (a list of notes)."};
    return {notes:list.filter(function(x){ return x && typeof x === "object"; })};
  }
  importBtn.addEventListener("click", function(){
    var content = document.createElement("div");
    var warn = makeDiv("noteBox warn");
    warn.textContent = "Importing replaces the " + notes.length + (notes.length === 1 ? " note" : " notes") +
      " on “" + currentBoardName() + "”. You can undo it right after with " + MOD + "+Z.";
    content.appendChild(warn);
    var area = document.createElement("textarea");
    area.className = "importArea";
    area.placeholder = "Paste exported board JSON here…";
    area.spellcheck = false;
    content.appendChild(area);
    var row = makeDiv("setBtns");
    row.style.gridTemplateColumns = "auto 1fr";
    row.style.alignItems = "center";
    var fileBtn = document.createElement("button");
    fileBtn.className = "pillBtn";
    fileBtn.textContent = "Choose a file…";
    var status = makeDiv("importStatus");
    row.appendChild(fileBtn); row.appendChild(status);
    content.appendChild(row);
    var fileInput = document.createElement("input");
    fileInput.type = "file"; fileInput.accept = ".json,application/json"; fileInput.hidden = true;
    content.appendChild(fileInput);

    var result = null;
    function check(){
      if(!area.value.trim()){ result = null; status.textContent = ""; status.className = "importStatus"; }
      else {
        result = parseImport(area.value);
        status.textContent = result.error || ("Found " + result.notes.length + (result.notes.length === 1 ? " note." : " notes.") + (window.Stick && Stick.guard && result.notes.length >= Stick.guard.LEVELS.huge ? " That is a very large board (" + result.notes.length + "), which can be slow and use a lot of memory." : ""));
        status.className = "importStatus " + (result.error ? "bad" : "good");
      }
      go.setAttribute("aria-disabled", String(!(result && !result.error)));
    }
    var m = openModal({
      title:"Import board",
      sub:"Paste a Stick-It export, or pick the .json file.",
      content:content,
      actions:[
        {label:"Cancel"},
        {label:"Replace board", kind:"dangerFill", id:"importGo", onClick:function(){
          if(!result || result.error){ area.focus(); return false; }
          var incoming = result.notes.map(normalizeIncoming).filter(Boolean);
          incoming.forEach(function(n){ zCounter += 1; n.z = zCounter; });
          var action = replaceAllNotes(incoming, "Import board");
          updateCount();
          toast("Board imported.", "Undo", function(){ undoIfTop(action); });
        }}
      ]
    });
    var go = m.card.querySelector("#importGo");
    area.addEventListener("input", check);
    fileBtn.addEventListener("click", function(){ fileInput.click(); });
    fileInput.addEventListener("change", function(){
      var f = fileInput.files && fileInput.files[0];
      if(!f) return;
      f.text().then(function(t){ area.value = t; check(); });
    });
    check();
    setTimeout(function(){ area.focus(); }, 0);
  });

  // ---------- Clean up: straighten the desk (never deletes anything) ----------
  // Objects keep their reading order (top to bottom in bands, left to right inside a band) and are set down again in loose rows with
  // room between them, so nothing overlaps and nothing sits under the header. Sizes and tilt are kept: it should look like a tidied
  // desk, not a diagram. Pinned objects never move and are treated as obstacles. The list of objects is fixed once, when the dialog
  // opens, and that same list is what is counted, moved and undone.
  var CLEAN_MARGIN = 20, CLEAN_BAND = 140;
  function cleanRegion(){
    var br = board.getBoundingClientRect(), ir = boardInner.getBoundingClientRect(), x0 = (br.left - ir.left) / boardZoom;
    return {x0: x0, x1: x0 + board.clientWidth / boardZoom, y0: 0, y1: boardHeight()};
  }
  function cleanItem(n){
    var sz = objSize(n), w = sz.w, h = sz.h, a = Math.abs((n.rot || 0) * Math.PI / 180);
    return {n: n, w: w, h: h, bw: w * Math.cos(a) + h * Math.sin(a), bh: w * Math.sin(a) + h * Math.cos(a)};
  }
  // only real, drawn board objects: not the Done pile, not pinned, nothing that is merely a control or a decoration
  function cleanEligible(){
    return notes.filter(function(n){ return n.el && n.el.isConnected && !isPinned(n) && !isZone(n) && !insideAnyZone(n); });
  }
  // what is actually on screen, judged from where the object is drawn (not from stale coordinates)
  function onScreen(n){
    var r = n.el.getBoundingClientRect(), b = board.getBoundingClientRect();
    return r.width > 0 && r.right > b.left + 2 && r.left < b.right - 2 && r.bottom > b.top + 2 && r.top < b.bottom - 2;
  }
  function cleanObstacles(){
    var out = [];
    notes.forEach(function(n){ if(n.el && n.el.isConnected && (isPinned(n) || isZone(n))){ var it = cleanItem(n); out.push({l: n.x, t: n.y, r: n.x + it.w, b: n.y + it.h, zone: isZone(n)}); } });
    return out;
  }
  function cleanOrder(items){
    var sorted = items.slice().sort(function(a, b){ return a.n.y - b.n.y; }), bands = [];
    sorted.forEach(function(it){
      var b = bands[bands.length - 1];
      if(b && it.n.y - b.y0 <= CLEAN_BAND) b.items.push(it); else bands.push({y0: it.n.y, items: [it]});
    });
    var out = [];
    bands.forEach(function(b){ b.items.sort(function(p, q){ return p.n.x - q.n.x; }); out = out.concat(b.items); });
    return out;
  }
  // set the items down in rows inside one page; what does not fit comes back as `rest`. obstacles: rectangles to keep clear of.
  function cleanPack(items, page, gap, obstacles){
    obstacles = obstacles || [];
    var rows = [], row = null, x = page.x0, y = page.y0, rest = [];
    function hit(it, px, py){
      for(var i = 0; i < obstacles.length; i++){ var o = obstacles[i]; if(px < o.r + gap && px + it.bw > o.l - gap && py < o.b + gap && py + it.bh > o.t - gap) return o; }
      return null;
    }
    items.forEach(function(it){
      if(rest.length){ rest.push(it); return; }
      var guard = 0, placedHere = false;
      while(!placedHere && guard++ < 200){
        if(row && x > page.x0 && x + it.bw > page.x1){ y += row.h + gap; x = page.x0; row = null; continue; }
        var o = hit(it, x, row ? row.y : y);
        if(o){ x = o.r + gap; if(x + it.bw > page.x1 && x > page.x0){ if(row){ y += row.h + gap; row = null; } else y = o.b + gap; x = page.x0; } continue; }
        placedHere = true;
      }
      if(y + it.bh > page.y1 && (rows.length || row)){ rest.push(it); return; }
      if(!row){ row = {y: y, h: 0, items: []}; rows.push(row); }
      row.items.push({it: it, x: x}); row.h = Math.max(row.h, it.bh); x += it.bw + gap;
    });
    var placed = [];
    rows.forEach(function(r, ri){
      r.items.forEach(function(p, pi){
        var drop = (r.h - p.it.bh) * (0.3 + ((pi + ri) % 3) * 0.1);            // a little vertical give, so the rows are not ruler-straight
        placed.push({it: p.it, cx: p.x + p.it.bw / 2, cy: r.y + drop + p.it.bh / 2});
      });
    });
    return {placed: placed, rest: rest};
  }
  function cleanPlan(items){
    if(!items.length) return {items: [], placed: []};
    var order = cleanOrder(items), r = cleanRegion(), pageW = Math.max(480, r.x1 - r.x0 - 2 * CLEAN_MARGIN), pageH = Math.max(200, r.y1 - 2 * CLEAN_MARGIN);
    var scopeScreen = items.length < cleanEligible().length;
    var x0 = scopeScreen ? r.x0 + CLEAN_MARGIN : CLEAN_MARGIN, placed = [], rest = order, pageNo = 0, obstacles = cleanObstacles();
    while(rest.length && pageNo < 60){
      var page = {x0: x0 + pageNo * (pageW + 60), x1: x0 + pageNo * (pageW + 60) + pageW, y0: CLEAN_MARGIN, y1: CLEAN_MARGIN + pageH};
      var res = cleanPack(rest, page, 26, obstacles);
      if(!res.placed.length){ res.placed = [{it: rest[0], cx: page.x0 + rest[0].bw / 2, cy: page.y0 + rest[0].bh / 2}]; res.rest = rest.slice(1); }
      placed = placed.concat(res.placed); rest = res.rest; pageNo++;
    }
    return {items: items, placed: placed, pages: pageNo};
  }
  function cleanTarget(p){ return {x: Math.max(0, Math.round(p.cx - p.it.w / 2)), y: Math.max(8, Math.round(p.cy - p.it.h / 2))}; }
  // the objects that would really change place (this is the number the person sees)
  function cleanMoving(plan){ return plan.placed.filter(function(p){ var t = cleanTarget(p); return t.x !== Math.round(p.it.n.x) || t.y !== Math.round(p.it.n.y); }); }
  // plan from the exact ids chosen when the dialog opened
  function cleanSnapshot(){
    var eligible = cleanEligible(), screenIds = eligible.filter(onScreen).map(function(n){ return n.id; }), allIds = eligible.map(function(n){ return n.id; });
    var pinnedHere = notes.filter(function(n){ return n.el && n.el.isConnected && isPinned(n); });
    function build(ids){
      var items = ids.map(findNote).filter(Boolean).map(cleanItem), plan = cleanPlan(items);
      return {ids: ids, plan: plan, moving: cleanMoving(plan).length};
    }
    var pinnedOnScreen = pinnedHere.filter(onScreen).length;
    return {screen: build(screenIds), board: build(allIds), pinned: {screen: pinnedOnScreen, board: pinnedHere.length}};
  }
  function applyClean(snap, scope){
    var part = scope === "screen" ? snap.screen : snap.board;
    var plan = cleanPlan(part.ids.map(findNote).filter(Boolean).map(cleanItem)), moving = cleanMoving(plan);
    if(!moving.length) return 0;
    var before = captureState(part.ids);
    moving.forEach(function(p){
      var n = p.it.n, t = cleanTarget(p);
      n.x = t.x; n.y = t.y;
      if(n.el){ n.el.style.left = n.x + "px"; n.el.style.top = n.y + "px"; }
    });
    if(!reducedMotion()){ document.body.classList.add("tidying"); setTimeout(function(){ document.body.classList.remove("tidying"); }, 800); }
    ensureWidth(); saveNotes(); updateMinimap(); recoverVertical(moving.map(function(p){ return p.it.n; }));
    recordChange(scope === "screen" ? "Clean up (my screen)" : "Clean up (whole canvas)", before);
    return moving.length;
  }
  function openCleanUp(preset){
    if(readOnly || singleNoteMode) return;
    closeFloatingPopovers(); endEditing();
    var snap = cleanSnapshot();
    if(!snap.board.ids.length){ toast(snap.pinned.board ? "Everything on this board is pinned in place." : "The board is empty, so there is nothing to tidy."); return; }
    function run(scope){ setTimeout(function(){ var moved = applyClean(snap, scope); toast(moved ? "Tidied " + moved + (moved === 1 ? " item." : " items.") : "Everything was already tidy.", moved ? "Undo" : null, moved ? function(){ undo(); } : null); }, 30); }
    if(preset === "screen" || preset === "board"){ run(preset); return; }       // from the command palette
    var vis = snap.screen.moving, total = snap.board.moving, scope = snap.screen.ids.length ? "screen" : "board", content = makeDiv("cleanBox"), group = makeDiv("cleanOpts"), summary = makeDiv("cleanSum"), go = null;
    group.setAttribute("role", "radiogroup"); group.setAttribute("aria-label", "What to tidy"); summary.setAttribute("role", "status");
    function plural(k){ return k + (k === 1 ? " item" : " items"); }
    function opt(id, title, desc, count, icon, disabled){
      var b = document.createElement("button"); b.type = "button"; b.className = "cleanOpt"; b.setAttribute("role", "radio"); b.dataset.scope = id; b.disabled = !!disabled;
      b.innerHTML = '<span class="cleanIc" aria-hidden="true">' + icon + '</span><span class="cleanTx"><b></b><span class="cleanDesc"></span><span class="cleanCount"></span></span>';
      b.querySelector("b").textContent = title; b.querySelector(".cleanDesc").textContent = desc; b.querySelector(".cleanCount").textContent = count;
      b.addEventListener("click", function(){ if(b.disabled) return; scope = id; paint(); });
      group.appendChild(b); return b;
    }
    opt("screen", "Clean my screen", "Tidy only what you\u2019re looking at right now.", vis ? plural(vis) + " will move" : (snap.screen.ids.length ? "Already tidy" : "Nothing on screen right now"), ICONS.fit, !vis);
    opt("board", "Clean whole canvas", "Tidy every item on this board, including what\u2019s off to the side.", total ? plural(total) + " will move" : "Already tidy", ICONS.rip.replace(/<path[^>]*d="M4 15[^>]*>/, ""), !total);
    function pinNote(){ var k = scope === "screen" ? snap.pinned.screen : snap.pinned.board; return k ? " " + plural(k) + " pinned in place stay where they are." : ""; }
    function paint(){
      Array.prototype.forEach.call(group.children, function(b){ var on = b.dataset.scope === scope; b.setAttribute("aria-checked", String(on)); b.classList.toggle("on", on); b.tabIndex = on ? 0 : -1; });
      var n = scope === "screen" ? vis : total;
      summary.textContent = n ? (scope === "screen" ? "Tidy " + plural(n) + " on your screen" : "Tidy " + plural(n) + " across the board") : "Everything here is already tidy";
      note.textContent = "Nothing is deleted. Items keep their size and tilt, and you can undo it right after." + pinNote();
      if(go) go.disabled = !n;
    }
    group.addEventListener("keydown", function(e){
      if(e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowLeft"){
        e.preventDefault(); var ids = ["screen", "board"].filter(function(id){ return id === "screen" ? vis : total; }), i = ids.indexOf(scope);
        if(!ids.length) return;
        scope = ids[(i + (e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : ids.length - 1) + ids.length) % ids.length]; paint();
        var cur = group.querySelector('[data-scope="' + scope + '"]'); if(cur) cur.focus();
      }
    });
    if(!vis && total) scope = "board";
    var note = makeDiv("cleanNote");
    content.appendChild(group); content.appendChild(summary); content.appendChild(note);
    var m = openModal({title: "Clean up canvas", sub: "Put things back in order, like straightening up a desk.", content: content, width: 440,
      actions: [{label: "Cancel", value: false}, {label: "Tidy up", kind: "primary", value: true, id: "cleanGo"}],
      onClose: function(v){ if(v) run(scope); }});
    go = m.card.querySelector("#cleanGo"); paint();
    setTimeout(function(){ var cur = group.querySelector(".cleanOpt.on"); if(cur) cur.focus(); }, 60);
  }
  (function(){ var b = document.getElementById("cleanBtn"); if(b) b.addEventListener("click", openCleanUp); })();

  // ---------- minimap ----------
  // The strip mirrors every object's position. Rebuilt at most once per frame, reusing its little pills (a note drag used to rebuild the
  // whole strip on every pointer move).
  var miniPills = [], miniView = null, miniRaf = 0;
  function updateMinimap(){
    if(miniRaf) return;
    miniRaf = requestAnimationFrame(function(){ miniRaf = 0; paintMinimap(); });
  }
  function paintMinimap(){
    var boardWidth = ensureWidth(), trackWidth = minimapTrack.clientWidth || 1, list = notes.filter(function(n){ return !hiddenIds[n.id]; });
    while(miniPills.length < list.length){ var m = document.createElement("div"); m.className = "miniNote"; minimapTrack.insertBefore(m, miniView); miniPills.push(m); }
    while(miniPills.length > list.length) miniPills.pop().remove();
    list.forEach(function(n, i){
      var m = miniPills[i];
      m.style.left = ((n.x/boardWidth)*trackWidth) + "px";
      m.style.width = Math.max(3, (NOTE_W/boardWidth)*trackWidth) + "px";
      m.style.background = isObj(n) ? (n.type === "video" ? "#4a433c" : isPaper(n) ? "#e6dcc4" : "#cfc6b0") : n.bg;
    });
    updateMinimapViewport();
  }
  (function initMinimap(){
    miniView = document.createElement("div"); miniView.className = "miniView"; miniView.id = "miniViewIndicator"; minimapTrack.appendChild(miniView);
  })();
  function updateMinimapViewport(){
    if(!miniView) return;
    var boardWidth = boardInner.scrollWidth || 1;
    var trackWidth = minimapTrack.clientWidth || 1;
    miniView.style.left = ((board.scrollLeft/boardWidth)*trackWidth) + "px";
    miniView.style.width = Math.max(8, (window.innerWidth/boardWidth)*trackWidth) + "px";
  }
  // Drag the viewport rectangle to pan the board; press anywhere else on the strip to jump there and keep dragging.
  (function(){
    var drag = null, lastX = 0;
    function apply(){
      if(!drag) return;
      var ratio = (lastX - drag.grab - drag.rect.left) / drag.rect.width, boardWidth = boardInner.scrollWidth;
      board.scrollLeft = Math.max(0, Math.min(boardWidth - board.clientWidth, ratio * boardWidth - window.innerWidth / 2));
    }
    minimapTrack.addEventListener("pointerdown", function(e){
      if(e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      var rect = minimapTrack.getBoundingClientRect(), vr = miniView.getBoundingClientRect();
      var onView = e.clientX >= vr.left - 2 && e.clientX <= vr.right + 2;
      drag = {rect: rect, grab: onView ? e.clientX - (vr.left + vr.width / 2) : 0};
      lastX = e.clientX;
      try{ minimapTrack.setPointerCapture(e.pointerId); }catch(err){}
      minimapTrack.classList.add("dragging");
      apply();
    });
    minimapTrack.addEventListener("pointermove", function(e){ if(!drag) return; lastX = e.clientX; apply(); });          // pointer events already arrive at most once a frame; setting scrollLeft is cheap
    function end(e){ if(!drag) return; drag = null; minimapTrack.classList.remove("dragging"); try{ minimapTrack.releasePointerCapture(e.pointerId); }catch(err){} }
    minimapTrack.addEventListener("pointerup", end); minimapTrack.addEventListener("pointercancel", end);
  })();
  var recoverT = null;
  // the board can change size without a window resize (panes, split views, the header wrapping)
  if(window.ResizeObserver) new ResizeObserver(function(){
    syncNoteMaxHeight();
    clearTimeout(recoverT);
    recoverT = setTimeout(function(){ if(!readOnly && !singleNoteMode && boardInner.clientHeight) recoverVertical(); }, 250);
  }).observe(board);
  window.addEventListener("resize", function(){
    ensureWidth(); updateMinimap(); syncNoteMaxHeight();
    clearTimeout(recoverT);
    recoverT = setTimeout(function(){ if(!readOnly && !singleNoteMode && boardInner.clientHeight) recoverVertical(); }, 250);
  });
  // the header (and, on a shared board, the view-only strip) take space at the top: keep the board directly below them, whatever their height
  (function syncTopbarHeight(){
    var bar = document.querySelector(".topbar");
    function sync(){
      var h = Math.max(44, Math.round(bar.getBoundingClientRect().bottom));
      var strip = shareBanner.hidden ? 0 : Math.round(shareBanner.getBoundingClientRect().height);
      shareBanner.style.top = h + "px";
      board.style.top = (h + strip) + "px";
      document.documentElement.style.setProperty("--chrome-top", (h + strip) + "px");
      document.body.classList.toggle("viewStrip", !shareBanner.hidden);
      syncNoteMaxHeight();
    }
    sync();
    if(window.ResizeObserver){ var ro = new ResizeObserver(sync); ro.observe(bar); ro.observe(shareBanner); }
    window.addEventListener("resize", sync);
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(sync); // the header grows once its fonts arrive
  })();

  // ---------- share: snapshot ----------
  // Rebuilds what's in view from note data on an offscreen stage and renders only
  // that, so dialogs, menus, selection and other chrome can never appear in it.
  function visibleRegion(){
    var br = board.getBoundingClientRect(), ir = boardInner.getBoundingClientRect();
    return {x:(br.left - ir.left) / boardZoom, y:0, w:board.clientWidth / boardZoom, h:boardHeight()};
  }
  // html2canvas cannot do color-mix(), so the snapshot computes the same dimmed paper the dark board shows (Oklab mix, 36% paper / 64% base)
  function dimPaperColor(bg){
    var d = document.createElement("div"); d.style.color = bg; document.body.appendChild(d);
    var m = getComputedStyle(d).color.match(/[\d.]+/g); d.remove();
    if(!m) return bg;
    function lin(c){ c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    function ok(r, g, b){
      r = lin(r); g = lin(g); b = lin(b);
      var l = Math.cbrt(0.4122214708*r + 0.5363325363*g + 0.0514459929*b), mm = Math.cbrt(0.2119034982*r + 0.6806995451*g + 0.1073969566*b), s2 = Math.cbrt(0.0883024619*r + 0.2817188376*g + 0.6299787005*b);
      return [0.2104542553*l + 0.793617785*mm - 0.0040720468*s2, 1.9779984951*l - 2.428592205*mm + 0.4505937099*s2, 0.0259040371*l + 0.7827717662*mm - 0.808675766*s2];
    }
    var a = ok(+m[0], +m[1], +m[2]), b = ok(15, 12, 22), t = 0.36, mix = [0, 1, 2].map(function(i){ return a[i]*t + b[i]*(1 - t); });
    var l2 = mix[0] + 0.3963377774*mix[1] + 0.2158037573*mix[2], m2 = mix[0] - 0.1055613458*mix[1] - 0.0638541728*mix[2], s3 = mix[0] - 0.0894841775*mix[1] - 1.291485548*mix[2];
    l2 = l2*l2*l2; m2 = m2*m2*m2; s3 = s3*s3*s3;
    var rgb = [4.0767416621*l2 - 3.3077115913*m2 + 0.2309699292*s3, -1.2684380046*l2 + 2.6097574011*m2 - 0.3413193965*s3, -0.0041960863*l2 - 0.7034186147*m2 + 1.707614701*s3];
    return "rgb(" + rgb.map(function(c){ c = Math.max(0, Math.min(1, c)); c = c <= 0.0031308 ? 12.92*c : 1.055*Math.pow(c, 1/2.4) - 0.055; return Math.round(c*255); }).join(",") + ")";
  }
  function inkSwap(svg){ return document.body.classList.contains("dark") ? svg.split("#33301f").join("#f2eadb") : svg; }
  function buildSnapshotStage(region){
    var old = document.getElementById("snapStage");
    if(old) old.remove();
    var stage = document.createElement("div");
    stage.id = "snapStage";
    stage.style.width = Math.ceil(region.w) + "px";
    stage.style.height = Math.ceil(region.h) + "px";
    var dots = makeDiv("");
    dots.style.cssText = "position:absolute;inset:0;background-image:radial-gradient(circle, var(--paper-dot) 1.6px, transparent 1.6px);background-size:26px 26px;background-position:" + (6 - region.x % 26) + "px 6px;";
    stage.appendChild(dots);
    notes.slice().sort(function(a, b){ return (a.z || 0) - (b.z || 0); }).forEach(function(n){
      if(hiddenIds[n.id]) return;
      var h = (n.el && n.el.offsetHeight) || NOTE_H;
      var wReach = isObj(n) ? objSize(n).w : (n.w || NOTE_W);
      if(n.x + wReach < region.x - 40 || n.x > region.x + region.w + 40) return;
      var el = buildStaticNote(n);
      if(document.body.classList.contains("dark") && !isObj(n) && n.bg){ el.style.background = dimPaperColor(n.bg); el.style.color = "#f2eadb"; }
      el.style.left = (n.x - region.x) + "px";
      el.style.top = (n.y - region.y) + "px";
      if(!isObj(n)) el.style.minHeight = h + "px";
      stage.appendChild(el);
    });
    document.body.appendChild(stage);
    var BOX = "data:image/svg+xml," + encodeURIComponent(inkSwap('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#33301f" stroke-opacity="0.8" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4.2 5.1c4.9-.6 10.1-.9 15.3-.4.4 4.8.5 9.6.1 14.6-5 .5-10.1.6-15.1.2-.6-4.7-.7-9.5-.3-14.4z"/></svg>'));
    var TICK = "data:image/svg+xml," + encodeURIComponent(inkSwap('<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 28 28" fill="none" stroke="#33301f" stroke-opacity="0.8" stroke-linecap="round" stroke-linejoin="round"><path stroke-width="1.6" d="M5.2 7.1c4.9-.6 10.1-.9 15.3-.4.4 4.8.5 9.6.1 14.6-5 .5-10.1.6-15.1.2-.6-4.7-.7-9.5-.3-14.4z"/><path stroke-width="2.6" d="M8.4 14.6c1.4 1.2 2.6 2.7 3.6 4.4 2.9-5.6 6.6-10.4 11.6-14.6"/></svg>'));
    var STRIKE = "data:image/svg+xml," + encodeURIComponent(inkSwap('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="80" viewBox="0 0 100 20" preserveAspectRatio="none"><path d="M1 11.6C18 10.2 34 12.4 52 10.9S84 10.3 99 9.9" fill="none" stroke="#33301f" stroke-opacity="0.85" stroke-width="1.7" stroke-linecap="round"/></svg>'));
    Array.prototype.forEach.call(stage.querySelectorAll('ul.checklist > li:not([data-title="true"])'), function(li){
      var fs = parseFloat(getComputedStyle(li).fontSize) || 18;
      var rtl = getComputedStyle(li).direction === "rtl";
      var done = li.getAttribute("data-checked") === "true";
      var box = document.createElement("img");
      box.className = "snapMark";
      box.src = done ? TICK : BOX;
      var sz = fs * (done ? 1.2 : 1);
      box.style.width = sz + "px"; box.style.height = sz + "px";
      box.style.top = (fs * (done ? 0.08 : 0.22)) + "px";
      box.style[rtl ? "right" : "left"] = "0px";
      li.appendChild(box);
      if(done){
        var lh = fs * 1.42, lines = Math.max(1, Math.round(li.offsetHeight / lh));
        for(var i = 0; i < lines; i++){
          var st = document.createElement("img");
          st.className = "snapMark";
          st.src = STRIKE;
          st.style.top = (i * lh) + "px";
          st.style.height = lh + "px";
          st.style[rtl ? "right" : "left"] = (fs * 1.3) + "px";
          st.style.width = Math.max(10, li.offsetWidth - fs * 1.3) + "px";
          li.appendChild(st);
        }
      }
    });
    return stage;
  }
  async function renderBoardSnapshot(){
    var region = visibleRegion();
    var stage = buildSnapshotStage(region);
    try{
      await Promise.all(Array.prototype.map.call(stage.querySelectorAll("img"), function(im){
        return im.complete ? null : new Promise(function(r){ im.onload = im.onerror = r; });
      }));
      if(document.fonts && document.fonts.ready) await document.fonts.ready;
      return await html2canvas(stage, {
        backgroundColor: getComputedStyle(document.body).backgroundColor || "#faf6e8",
        scale: boardZoom * Math.min(window.devicePixelRatio || 1, 2),
        logging: false,
        onclone: function(doc){ var st = doc.getElementById("snapStage"); if(st) st.style.opacity = "1"; }
      });
    } finally {
      stage.remove();
    }
  }
  snapshotBtn.addEventListener("click", async function(){
    shareResult.innerHTML = '<p class="muted">Rendering snapshot…</p>';
    if(typeof html2canvas !== "function"){
      shareResult.innerHTML = '<p class="muted">Snapshot tool didn\'t load. Try again in a moment.</p>';
      return;
    }
    try{
      var canvas = await renderBoardSnapshot();
      canvas.toBlob(function(blob){
        if(!blob){ shareResult.innerHTML = '<p class="muted">Couldn\'t render a snapshot.</p>'; return; }
        var url = URL.createObjectURL(blob);
        shareResult.innerHTML = "";
        var img = document.createElement("img");
        img.src = url;
        shareResult.appendChild(img);
        var saveBtn = document.createElement("button");
        saveBtn.className = "btn primary";
        saveBtn.style.margin = "8px 0 0";
        saveBtn.textContent = "Save image";
        saveBtn.addEventListener("click", function(){
          downloadBlob("stickit-snapshot.jpg", blob);
          toast("Snapshot saved.");
        });
        shareResult.appendChild(saveBtn);
      }, "image/jpeg", 0.92);
    }catch(e){
      shareResult.innerHTML = '<p class="muted">Couldn\'t render a snapshot in this view.</p>';
    }
  });

  // ---------- share: interactive link ----------
  // Signed in: a LIVE link. Whoever has it always sees the board as it currently is, read-only.
  async function publishLiveBoard(){
    shareResult.innerHTML = '<p class="muted">Getting your board ready\u2026</p>';
    busyStart("share", "Preparing share\u2026", {delay: 250});
    var ready = await cloudSync.settle(60000);
    busyEnd("share");
    if(!ready){ shareResult.innerHTML = '<p class="muted">Couldn\'t finish saving to your account yet. Check your connection and try again.</p>'; return; }
    var info, ident = shareIdentity();
    try{ info = await Stick.share.createLive(activeBoardId, ident.name, ident); }
    catch(e){
      var er = Stick.errors.parse(e);
      shareResult.innerHTML = '<p class="muted">' + escapeHtml(er.code === "FORBIDDEN" ? "Only the board's owner can publish a live link. You can still share selected items." : Stick.errors.friendly(er)) + '</p>';
      return;
    }
    shareResult.innerHTML = "";
    var p = document.createElement("p");
    p.className = "muted";
    var pl = document.createElement("strong"); pl.textContent = "Anyone with this link can see this whole board, now and as it changes (read only, no account needed). ";
    p.appendChild(pl);
    p.appendChild(document.createTextNode("It doesn't expire until you turn it off."));
    shareResult.appendChild(p);
    var row = document.createElement("div");
    row.className = "copyRow";
    var input = document.createElement("input");
    input.readOnly = true; input.value = info.url; input.id = "shareLinkInput";
    row.appendChild(input);
    var copyBtn = document.createElement("button");
    copyBtn.className = "btn primary copyBtn";
    copyBtn.style.cssText = "margin:0;width:auto;";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", async function(){
      if(await copyText(info.url)) flashCopied(copyBtn, "Copied!");
      else { input.select(); toast("Select the link and copy it manually."); }
    });
    row.appendChild(copyBtn);
    shareResult.appendChild(row);
    renderMyLinks();
  }
  // the links this account has made for this board, with an off switch (tokens can't be shown again)
  async function renderMyLinks(){
    try{
      var all = await Stick.share.list();
      var mine = all.filter(function(x){ return x.board_id === activeBoardId && x.is_active && x.share_type === "board_live"; });
      var old = shareResult.querySelector(".shareLinks"); if(old) old.remove();
      if(!mine.length) return;
      var box = makeDiv("shareLinks");
      var head = document.createElement("div"); head.className = "muted"; head.style.marginBottom = "6px";
      head.textContent = "Live links for this board (" + mine.length + ")";
      box.appendChild(head);
      mine.forEach(function(x){
        var r = makeDiv("row");
        var t = document.createElement("span"); t.textContent = "Made " + timeAgo(Date.parse(x.created_at));
        var b = document.createElement("button"); b.className = "pillBtn danger"; b.textContent = "Turn off";
        b.addEventListener("click", function(){ Stick.share.disable(x.id).then(function(){ r.remove(); toast("That link no longer works."); }, function(){ toast("Couldn't turn it off. Try again."); }); });
        r.appendChild(t); r.appendChild(b); box.appendChild(r);
      });
      shareResult.appendChild(box);
    }catch(e){}
  }
  publishBtn.addEventListener("click", async function(){
    if(CLOUD && cloudSync && !viewerMode){
      var pr = settings.accountPrefs;
      if(settings.account && settings.account.prof && settings.account.prof.ageBand === "child"){
        var okC = await confirmDialog({title: "Anyone with the link can see this whole board", body: "Only share what you are happy for anyone to see, and check with a parent or guardian first.", confirm: "Create link"});
        if(!okC){ shareResult.innerHTML = ""; return; }
      }
      if(pr && pr.shareDefaultBoardMode === "ask"){       // account default: ask before every live link
        var yes = await confirmDialog({title:"Create a live link to this board?", body:"Anyone with the link will be able to see this board (read only) and follow your changes until you turn the link off.", confirm:"Create link"});
        if(!yes){ shareResult.innerHTML = ""; return; }
      }
      return publishLiveBoard();
    }
    shareResult.innerHTML = '<p class="muted">Preparing link\u2026</p>';
    var payload = await PublicShare.prepare(notes.filter(function(n){ return !isAV(n); }).map(PublicShare.toPublicNote));
    var link = null;
    try{ link = await PublicShare.createLink("board", payload); }catch(e){}
    if(!link){
      shareResult.innerHTML = '<p class="muted">Couldn\'t encode the board for sharing. Try the snapshot image instead.</p>';
      return;
    }
    shareResult.innerHTML = "";
    var p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Anyone who opens it can view the whole board, no account needed. Links don't expire, so share it like you'd hand over the real corkboard." +
      (link.length > 30000 ? " Photos make this link long; some chat apps may cut it short, so the snapshot image can be safer for big boards." : "");
    shareResult.appendChild(p);
    var row = document.createElement("div");
    row.className = "copyRow";
    var input = document.createElement("input");
    input.readOnly = true;
    input.value = link;
    input.id = "shareLinkInput";
    row.appendChild(input);
    var copyBtn = document.createElement("button");
    copyBtn.className = "btn primary copyBtn";
    copyBtn.style.margin = "0";
    copyBtn.style.width = "auto";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", async function(){
      if(await copyText(link)) flashCopied(copyBtn, "Copied!");
      else { input.select(); toast("Select the link and copy it manually."); }
    });
    row.appendChild(copyBtn);
    shareResult.appendChild(row);
  });

  // ---------- shared read-only view ----------
  if(readOnly && !viewerMode && /^#s=/.test(location.hash)) cloudShareBoot();
  else if(readOnly && !viewerMode){
    shareBanner.hidden = false;
    var shared = [];
    decodeStateAny(location.hash.replace(/^#sb=/, "")).then(function(data){
      shared = Array.isArray(data) ? data.slice(0, 500) : [];
      if(!shared.length){
        shareBannerText.textContent = "This shared board link looks broken or empty.";
        copyToMineBtn.hidden = true;
        return;
      }
      shared.forEach(function(item, i){
        var n = normalizeIncoming(item);
        if(!n) return;
        n.id = "s" + i;
        n.z = i + 1;
        if(!n.phys) ensurePhys(n);
        notes.push(n);
        renderNote(n, false);
      });
      ensureWidth();
      updateMinimap();
    });

    copyToMineBtn.addEventListener("click", function(){
      var mine = safeGet(NOTES_KEY) || [];
      shared.forEach(function(item){
        var n = normalizeIncoming(item);
        if(!n) return;
        n.x += 20; n.y += 20;
        mine.push(n);
      });
      if(!safeSet(NOTES_KEY, mine)){ toast("Couldn't save: browser storage is full."); return; }
      location.hash = "";
      location.reload();
    });
  }

  // ---------- interactive tour ----------
  var tourRoot = null, tourIndex = 0, tourSteps = [];
  function buildTourSteps(){
    var steps = [
      {sel:null, title:"Welcome to Stick-It", body:"A little corkboard for quick notes. Let's walk through what you can do. Hit Next to begin."},
      {sel:"#boardInner", title:COARSE ? "Add something" : "Stick a note", body:COARSE
        ? "Tap anywhere on the board and choose what to put down: a sticky, a photo, a voice memo or a video. Press and hold for a sticky straight away."
        : "Double-click any empty spot on the board to pin a new note there, ready to type into right away."},
      {sel:".note", title:"Move, format, delete", body:"Drag a note by its tape to move it. Tap \u2022\u2022\u2022 for headings, checklists, the highlighter, links, colours, duplicate and move. A selected note has a little Aa button that tries another handwriting."},
      {sel:null, title:"Photos & focus", body:COARSE
        ? "Photos you add become prints; their little style button switches between a Polaroid and a cut-out. Double-tap a note to pick it up and write comfortably."
        : "Drop or paste a photo onto the board to pin it as a print, then use its little style button for a Polaroid or a cut-out. Double-click any note to pick it up and write comfortably; Esc puts it back."},
      {sel:null, title:"Handle a few at once", body:"Ctrl/Cmd+click notes, or drag a box on empty board, to select several. Then move, duplicate, share or delete them together. Ctrl/Cmd+Z undoes almost anything on the board.", desktopOnly:true},
      {sel:"#searchInput", title:"Find a note", body:"Type here to dim every note that doesn't match. Click a match to jump back to the full board with it selected."},
      {sel:"#minimap", title:"See the whole board", body:"This strip mirrors every note's position along the board. Click anywhere on it to jump there, or drag the highlighted window to pan the board."},
      {sel:"#accountBtn", title:"Sign in (optional)", body:"Sign in with Google so your real name and photo show up on notes you share, or stay a guest. Totally up to you."},
      {sel:"#gearBtn", title:"Settings", body:"Dark mode, a fixed font for new notes, tidying up blank notes, and exporting or importing your board."},
      {sel:"#shareBtn", title:"Share your board", body:"Get a public, read-only link to the whole board, or a JPEG snapshot. To share just a few notes, select them and choose Share instead."},
      {sel:null, title:"That's it!", body:"Click anywhere on the board to get started."}
    ];
    return steps.filter(function(s){
      if(s.desktopOnly && COARSE) return false;
      if(!s.sel) return true;
      var el = document.querySelector(s.sel);
      if(!el) return false;
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  }

  function startTour(custom){
    if(!panel.hidden) cancelSettings();
    sharePanel.hidden = true;
    closeFloatingPopovers();
    tourSteps = Array.isArray(custom) && custom.length ? custom : buildTourSteps();
    tourIndex = 0;
    tourRoot = document.createElement("div");
    var block = document.createElement("div");
    block.className = "tourBlock";
    var spot = document.createElement("div");
    spot.className = "spotlight";
    var card = document.createElement("div");
    card.className = "tourCard";
    tourRoot.appendChild(block);
    tourRoot.appendChild(spot);
    tourRoot.appendChild(card);
    document.body.appendChild(tourRoot); tourLayer.open();
    renderTourStep();
    window.addEventListener("resize", positionTourStep);
  }
  function endTour(){
    if(!tourRoot) return;
    window.removeEventListener("resize", positionTourStep);
    tourRoot.remove();
    tourRoot = null;
  }
  function renderTourStep(){
    var card = tourRoot.querySelector(".tourCard");
    var step = tourSteps[tourIndex];
    var dotsHtml = tourSteps.map(function(s,i){ return '<span class="' + (i===tourIndex?"active":"") + '"></span>'; }).join("");
    card.innerHTML =
      "<h4>" + step.title + "</h4>" +
      "<p>" + step.body + "</p>" +
      '<div class="tourFoot">' +
        '<button class="tourSkip" id="tourSkip">Skip</button>' +
        '<div class="tourDots" aria-label="Step ' + (tourIndex + 1) + ' of ' + tourSteps.length + '">' + dotsHtml + "</div>" +
        '<div class="tourBtns">' +
          (tourIndex > 0 ? '<button id="tourBack">Previous</button>' : "") +
          '<button class="primary" id="tourNext">' + (tourIndex === tourSteps.length-1 ? "Done" : "Next") + "</button>" +
        "</div>" +
      "</div>";
    card.querySelector("#tourSkip").addEventListener("click", endTour);
    var backBtn = card.querySelector("#tourBack");
    if(backBtn) backBtn.addEventListener("click", function(){ tourIndex--; renderTourStep(); });
    card.querySelector("#tourNext").addEventListener("click", function(){
      if(tourIndex === tourSteps.length-1){ endTour(); return; }
      tourIndex++; renderTourStep();
    });
    // when the dots don't fit, show "4 / 11" instead; if even that is tight, Skip gets its own row
    var foot = card.querySelector(".tourFoot"), dots = card.querySelector(".tourDots");
    if(dots.scrollWidth > dots.clientWidth + 1){
      dots.outerHTML = '<div class="tourCount">' + (tourIndex + 1) + " / " + tourSteps.length + "</div>";
    }
    if(foot.scrollWidth > foot.clientWidth + 1) foot.classList.add("tight");
    positionTourStep();
  }
  function positionTourStep(){
    if(!tourRoot) return;
    var spot = tourRoot.querySelector(".spotlight");
    var card = tourRoot.querySelector(".tourCard");
    var step = tourSteps[tourIndex];
    var target = step.sel ? document.querySelector(step.sel) : null;
    var pad = 8;
    var r = target ? target.getBoundingClientRect() : null;
    if(r){
      spot.style.left = (r.left - pad) + "px";
      spot.style.top = (r.top - pad) + "px";
      spot.style.width = (r.width + pad*2) + "px";
      spot.style.height = (r.height + pad*2) + "px";
    } else {
      var cx = window.innerWidth/2, cy = window.innerHeight/2;
      spot.style.left = cx + "px";
      spot.style.top = cy + "px";
      spot.style.width = "0px";
      spot.style.height = "0px";
    }
    var cardW = card.offsetWidth || 280, cardH = card.offsetHeight || 180;
    var top, left;
    if(r){
      top = r.bottom + pad + 14;
      if(top + cardH > window.innerHeight - 8) top = r.top - cardH - pad - 14;
      left = Math.min(Math.max(12, r.left), window.innerWidth - cardW - 12);
    } else {
      top = window.innerHeight/2 - cardH/2;
      left = window.innerWidth/2 - cardW/2;
    }
    top = Math.min(Math.max(8, top), Math.max(8, window.innerHeight - cardH - 8));
    left = Math.max(8, left);
    card.style.top = top + "px";
    card.style.left = left + "px";
  }
  helpBtn.addEventListener("click", function(){ startTour(); });

  kbdBtn.addEventListener("click", function(e){ e.stopPropagation(); openControlCenter("shortcuts"); });

  // ---------- board thumbnails ----------
  // Drawn straight from note data onto a small canvas (no DOM capture), so menus,
  // selection and dialogs can't appear, and other boards can be drawn without loading them.
  var THUMB_W = 176, THUMB_H = 110;
  function thumbKey(id){ return "stickyboard." + NS + "thumb." + id; }
  var thumbImgs = new Map();
  function thumbImage(src){
    var im = thumbImgs.get(src);
    if(!im){
      im = new Image(); im.src = src; thumbImgs.set(src, im);
      if(thumbImgs.size > 80) thumbImgs.delete(thumbImgs.keys().next().value);
    }
    return im;
  }
  function estimateNoteH(n){
    if(isObj(n) || (n && n.type === "embed")) return objSize(n).h;
    if(n.el && n.el.offsetHeight) return n.el.offsetHeight;
    var inner = (n.w || NOTE_W) - 28, h = 40;
    if(n.image){ var iw = Math.min(inner, n.imgW || defaultImgW(n) || inner); h += iw * (n.imgRatio || 0.75) + 8; }
    var chars = htmlToText(n.html || "").length;
    h += Math.ceil(Math.max(1, chars) / 22) * 25;
    return Math.max(NOTE_H, h);
  }
  function drawThumb(list){
    var k = 2, c = document.createElement("canvas");
    c.width = THUMB_W * k; c.height = THUMB_H * k;
    var g = c.getContext("2d");
    g.scale(k, k);
    var cs = getComputedStyle(document.body);
    var dark = document.body.classList.contains("dark");
    g.fillStyle = cs.getPropertyValue("--paper").trim() || "#faf6e8";
    g.fillRect(0, 0, THUMB_W, THUMB_H);
    var pending = false;
    var byId = {}; list.forEach(function(n){ byId[n.id] = n; });
    list = list.filter(function(n){ return !(window.Stick && Stick.pile && Stick.pile.isHidden(n, function(id){ return byId[id] || null; })); });
    var items = list.map(function(n){ return {n:n, w:isObj(n) ? objSize(n).w : (n.w || NOTE_W), h:n.type === "pile" ? 150 : estimateNoteH(n)}; });
    var x1 = 0, y1 = 0, x2 = 900, y2 = 560;
    if(items.length){
      x1 = Math.min.apply(null, items.map(function(i){ return i.n.x; })) - 40;
      y1 = Math.min.apply(null, items.map(function(i){ return i.n.y; })) - 40;
      x2 = Math.max.apply(null, items.map(function(i){ return i.n.x + i.w; })) + 40;
      y2 = Math.max.apply(null, items.map(function(i){ return i.n.y + i.h; })) + 40;
      // never zoom in so far that one note fills the card
      var minW = 900, minH = minW * THUMB_H / THUMB_W;
      if(x2 - x1 < minW){ var cx = (x1 + x2) / 2; x1 = cx - minW/2; x2 = cx + minW/2; }
      if(y2 - y1 < minH){ var cy = (y1 + y2) / 2; y1 = cy - minH/2; y2 = cy + minH/2; }
    }
    var sc = Math.min(THUMB_W / (x2 - x1), THUMB_H / (y2 - y1));
    var ox = (THUMB_W - (x2 - x1) * sc) / 2 - x1 * sc, oy = (THUMB_H - (y2 - y1) * sc) / 2 - y1 * sc;
    var step = 26 * sc;
    if(step >= 3){
      g.fillStyle = cs.getPropertyValue("--paper-dot").trim() || "rgba(60,50,20,0.05)";
      for(var gx = (ox % step + step) % step; gx < THUMB_W; gx += step)
        for(var gy = (oy % step + step) % step; gy < THUMB_H; gy += step){ g.beginPath(); g.arc(gx, gy, Math.max(0.35, 1.6 * sc), 0, 7); g.fill(); }
    }
    items.sort(function(a, b){ return (a.n.z || 0) - (b.n.z || 0); }).forEach(function(it){
      var n = it.n, w = it.w * sc, h = it.h * sc, p = ensurePhys(n);
      if(isPhoto(n)){ if(drawThumbPhoto(g, n, it, sc, ox, oy, dark)) pending = true; return; }
      if(isAV(n)){ drawThumbAV(g, n, it, sc, ox, oy, dark); return; }
      if(isPaper(n)){ drawThumbPaper(g, n, it, sc, ox, oy, dark); return; }
      g.save();
      g.translate(ox + (n.x + it.w/2) * sc, oy + (n.y + it.h/2) * sc);
      g.rotate((n.rot || 0) * Math.PI / 180);
      g.shadowColor = dark ? "rgba(0,0,0,0.6)" : "rgba(60,45,10,0.28)";
      g.shadowBlur = 3; g.shadowOffsetY = 1.2;
      g.fillStyle = n.bg || "#fff3a8";
      g.fillRect(-w/2, -h/2, w, h);
      g.shadowColor = "transparent";
      if(dark && p.pin){
        g.fillStyle = PIN_COLORS[p.pc] || PIN_COLORS[0];
        g.beginPath(); g.arc(p.tx * sc, -h/2 + 2.5 * sc + 1, Math.max(1.2, 7 * sc), 0, 7); g.fill();
      } else {
        g.fillStyle = "rgba(255,255,255," + (p.to || 0.55) + ")";
        var tw = (p.tw || 56) * sc;
        g.fillRect(p.tx * sc - tw/2, -h/2 - 11 * sc, tw, 22 * sc);
      }
      var left = -w/2 + 14 * sc, y = -h/2 + 26 * sc, inner = w - 28 * sc;
      if(n.image){
        var im = (n.el && n.el.querySelector(".noteImgWrap img")) || thumbImage(n.image);
        var ratio = n.imgRatio || (im.naturalWidth ? im.naturalHeight / im.naturalWidth : 0.75);
        var iw = Math.min(inner, (n.imgW || defaultImgW(n) || (it.w - 28)) * sc), ih = iw * ratio;
        if(im.complete && im.naturalWidth) g.drawImage(im, left, y, iw, ih);
        else { pending = true; g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(left, y, iw, ih); }
        y += ih + 8 * sc;
      }
      var text = (n.textEl ? n.textEl.textContent : htmlToText(n.html || "")).replace(/\s+/g, " ").trim();
      if(text){
        var fs = Math.max(2.4, 17 * sc);
        g.font = fs + "px " + fontStack(n.font);
        g.fillStyle = "rgba(51,48,31,0.85)";
        var rtl = detectScript(text) === "hebrew";
        g.textAlign = rtl ? "right" : "left";
        var words = text.split(" "), line = "", lh = fs * 1.35;
        for(var i = 0; i < words.length && y < h/2 - 8 * sc; i++){
          var test = line ? line + " " + words[i] : words[i];
          if(g.measureText(test).width > inner && line){ g.fillText(line, rtl ? left + inner : left, y + fs); y += lh; line = words[i]; }
          else line = test;
        }
        if(line && y < h/2 - 8 * sc) g.fillText(line, rtl ? left + inner : left, y + fs);
      }
      g.restore();
    });
    return {url:c.toDataURL("image/jpeg", 0.82), pending:pending};
  }
  function drawThumbPhoto(g, n, it, sc, ox, oy, dark){
    var style = n.photoStyle || "polaroid", pw = (n.w || 220) * sc, ph = pw * (n.imgRatio || 0.75), pending = false;
    var im = (n.el && n.el.querySelector(".pFrame img")) || thumbImage(n.image);
    g.save();
    g.translate(ox + (n.x + it.w/2) * sc, oy + (n.y + it.h/2) * sc);
    g.rotate((n.rot || 0) * Math.PI / 180);
    g.shadowColor = dark ? "rgba(0,0,0,0.6)" : "rgba(60,45,10,0.3)";
    g.shadowBlur = 3; g.shadowOffsetY = 1.2;
    if(n.el && n.el.classList.contains("finished") && im.complete && im.naturalWidth){      // a real cutout: its own outline, no rectangle
      var cw = pw, ch = pw * im.naturalHeight / im.naturalWidth;
      g.drawImage(im, -cw/2, -ch/2, cw, ch); g.restore();
      return false;
    }
    var fw, fh, ix, iy;
    if(style === "polaroid"){
      var m = pw * 0.055; fw = pw + 2 * m; fh = ph + m + pw * 0.26;
      g.fillStyle = dark ? "#e9e4d8" : "#f6f2e9"; g.fillRect(-fw/2, -fh/2, fw, fh);
      ix = -fw/2 + m; iy = -fh/2 + m;
    } else {
      var pad = pw * 0.03 + 2 * sc; fw = pw + 2 * pad; fh = ph + 2 * pad;
      if(style === "mounted"){
        var bp = pw * 0.085;
        g.fillStyle = "#d8c29a";
        g.fillRect(-fw/2 - bp + n.phys.bx * sc, -fh/2 - bp + n.phys.by * sc, fw + 2 * bp, fh + 2 * bp);
      }
      g.fillStyle = "#fdfcf8"; g.fillRect(-fw/2, -fh/2, fw, fh);
      ix = -fw/2 + pad; iy = -fh/2 + pad;
    }
    g.shadowColor = "transparent";
    if(im.complete && im.naturalWidth) g.drawImage(im, ix, iy, pw, ph);
    else { pending = true; g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(ix, iy, pw, ph); }
    if(n.caption){
      var fs = Math.max(2.4, Math.min(28, (n.w || 220) * 0.075) * sc);
      g.font = fs + "px " + fontStack(n.font);
      g.fillStyle = "rgba(51,48,31,0.85)";
      g.textAlign = "center";
      g.fillText(n.caption.slice(0, 40), 0, style === "polaroid" ? fh/2 - pw * 0.11 : fh/2 + fs * 1.4, fw);
    }
    g.restore();
    return pending;
  }
  function storeThumb(boardId, list, ts){
    var d = drawThumb(list);
    var rec = {url:d.url, theme:settings.theme, ts:ts || Date.now(), count:list.length};
    safeSet(thumbKey(boardId), rec);
    return {rec:rec, pending:d.pending};
  }
  var thumbT = null;
  function scheduleThumb(){
    if(readOnly || singleNoteMode || !activeBoardId) return;
    clearTimeout(thumbT);
    thumbT = setTimeout(saveThumbNow, 2500);
  }
  function saveThumbNow(){
    clearTimeout(thumbT);
    if(readOnly || singleNoteMode || !activeBoardId) return;
    try{ storeThumb(activeBoardId, notes); }catch(e){}
  }
  document.addEventListener("visibilitychange", function(){ if(document.visibilityState === "hidden") saveThumbNow(); });
  // For the board list: use the stored card, or redraw it if it's missing or from the other theme.
  function thumbFor(b, onUpdate){
    var rec = safeGet(thumbKey(b.id));
    if(rec && rec.theme === settings.theme && rec.url) return rec;
    var list = b.id === activeBoardId ? notes : (safeGet(notesKeyFor(b.id)) || []);
    var out = storeThumb(b.id, list, rec && rec.ts);
    if(out.pending){
      Promise.all(list.filter(function(n){ return n.image; }).map(function(n){
        var im = thumbImage(n.image);
        return im.complete ? null : new Promise(function(r){ im.onload = im.onerror = r; });
      })).then(function(){ onUpdate(storeThumb(b.id, list, out.rec.ts).rec); });
    }
    return out.rec;
  }
  // Custom covers live apart from the automatic thumbnail, so automatic redraws never overwrite them.
  // {mode:"view"|"upload", url, ts}; no record means Automatic.
  function coverKey(id){ return "stickyboard." + NS + "cover." + id; }
  var COVER_W = 352, COVER_H = 220;
  // centre-crop any image/canvas to the 16:10 card without stretching it
  function coverFrom(src, sw, sh){
    var c = document.createElement("canvas");
    c.width = COVER_W; c.height = COVER_H;
    var g = c.getContext("2d");
    var sc = Math.max(COVER_W / sw, COVER_H / sh);
    var dw = sw * sc, dh = sh * sc;
    g.fillStyle = getComputedStyle(document.body).getPropertyValue("--paper").trim() || "#faf6e8";
    g.fillRect(0, 0, COVER_W, COVER_H);
    g.drawImage(src, (COVER_W - dw) / 2, (COVER_H - dh) / 2, dw, dh);
    return c.toDataURL("image/jpeg", 0.84);
  }
  function applyCover(boardId, rec){
    if(rec) safeSet(coverKey(boardId), rec);
    else { try{ localStorage.removeItem(coverKey(boardId)); }catch(e){} }
  }
  function openCoverEditor(b){
    var oldCover = safeGet(coverKey(b.id));
    var oldSub = b.subtitle || "";
    var draft = oldCover ? Object.assign({}, oldCover) : null; // null = Automatic
    var isActive = b.id === activeBoardId;
    var content = document.createElement("div");
    var preview = document.createElement("img");
    preview.className = "coverPreview"; preview.alt = "Preview of the board cover";
    var modes = makeDiv("coverModes");
    var hintEl = makeDiv("coverHint");
    function autoUrl(){ return thumbFor(b, function(rec){ if(!draft) preview.src = rec.url; }).url; }
    function mode(label, key, fn){
      var btn = document.createElement("button");
      btn.className = "pillBtn"; btn.textContent = label; btn.dataset.mode = key;
      btn.addEventListener("click", fn);
      modes.appendChild(btn);
      return btn;
    }
    function sync(){
      preview.src = draft ? draft.url : autoUrl();
      Array.prototype.forEach.call(modes.children, function(x){ x.classList.toggle("on", (draft ? draft.mode : "auto") === x.dataset.mode); });
      hintEl.textContent = !draft ? "Updates by itself as the board changes." :
        draft.mode === "view" ? "A still of the board as it looks right now. It won't change until you pick Automatic." :
        "Your picture, cropped to fit. It won't change until you pick Automatic.";
    }
    mode("Automatic", "auto", function(){ draft = null; sync(); });
    var viewBtn = mode("Use current view", "view", async function(){
      if(!isActive || typeof html2canvas !== "function") return;
      viewBtn.setAttribute("aria-disabled", "true");
      hintEl.textContent = "Taking the picture\u2026";
      try{
        var canvas = await renderBoardSnapshot();
        draft = {mode:"view", url:coverFrom(canvas, canvas.width, canvas.height), ts:Date.now()};
      }catch(e){ toast("Couldn't capture this view."); }
      viewBtn.removeAttribute("aria-disabled");
      sync();
    });
    if(!isActive){ viewBtn.setAttribute("aria-disabled", "true"); viewBtn.title = "Open this board to use its view"; }
    var fileInput = document.createElement("input");
    fileInput.type = "file"; fileInput.accept = "image/*"; fileInput.hidden = true;
    mode("Upload image\u2026", "upload", function(){ fileInput.value = ""; fileInput.click(); });
    fileInput.addEventListener("change", function(){
      var f = fileInput.files && fileInput.files[0];
      if(!f) return;
      var reader = new FileReader();
      reader.onload = function(){
        var im = new Image();
        im.onload = function(){ draft = {mode:"upload", url:coverFrom(im, im.naturalWidth, im.naturalHeight), ts:Date.now()}; sync(); };
        im.onerror = function(){ toast("That image couldn't be read."); };
        im.src = reader.result;
      };
      reader.readAsDataURL(f);
    });
    var subLabel = document.createElement("label");
    subLabel.className = "setLabel"; subLabel.textContent = "Subtitle (optional)";
    var sub = document.createElement("input");
    sub.className = "setInput"; sub.maxLength = 60; sub.value = oldSub;
    sub.placeholder = "e.g. October 20\u201328";
    subLabel.htmlFor = sub.id = "boardSubInput";
    content.appendChild(preview); content.appendChild(modes); content.appendChild(hintEl);
    content.appendChild(fileInput); content.appendChild(subLabel); content.appendChild(sub);
    sync();
    var m = openModal({
      title: "\u201c" + b.name + "\u201d cover",
      sub: "How this board looks in your board list.",
      content: content,
      actions: [
        {label:"Cancel"},
        {label:"Save", kind:"primary", onClick:function(){
          var newSub = sub.value.replace(/\s+/g, " ").trim().slice(0, 60);
          var newCover = draft;
          var coverChanged = JSON.stringify(newCover) !== JSON.stringify(oldCover);
          if(!coverChanged && newSub === oldSub) return;
          function put(cover, subtitle){
            var bb = boards.filter(function(x){ return x.id === b.id; })[0];
            if(!bb) return false;
            applyCover(b.id, cover);
            if(subtitle) bb.subtitle = subtitle; else delete bb.subtitle;
            safeSet(BOARDS_KEY, boards);
            if(!cover && bb.id === activeBoardId) saveThumbNow();
            if(!boardPanel.hidden) renderBoardList();
            updateBoardLabel();
            if(CLOUD && cloudSync) cloudSync.boardMetaChanged(b.id, {subtitle: subtitle || null, cover: cover ? {mode:cover.mode, url:cover.url} : null});
            return true;
          }
          put(newCover, newSub);
          var label = coverChanged ? (newCover ? (newCover.mode === "upload" ? "Set cover image" : "Use view as cover") : "Back to automatic cover") : "Change subtitle";
          pushHistory({label:label, custom:true, t:Date.now(),
            undo:function(){ return put(oldCover, oldSub); },
            redo:function(){ return put(newCover, newSub); }});
          toast("Board cover saved.");
        }}
      ]
    });
    sub.addEventListener("keydown", function(e){ if(e.key === "Enter") m.card.querySelector(".modalActions .primary").click(); });
  }
  function timeAgo(ts){
    if(!ts) return "";
    var m = Math.round((Date.now() - ts) / 60000);
    if(m < 1) return "just now";
    if(m < 60) return m + " min ago";
    var h = Math.round(m / 60);
    if(h < 24) return h + " h ago";
    var d = Math.round(h / 24);
    return d === 1 ? "yesterday" : d + " days ago";
  }

  // ---------- board switcher ----------
  function renderBoardList(){
    boardList.innerHTML = "";
    if(activeBoardId) saveThumbNow();
    boards.forEach(function(b){
      var row = document.createElement("div");
      row.className = "boardRow" + (b.id === activeBoardId ? " active" : "");
      var thumb = document.createElement("img");
      thumb.className = "thumb";
      thumb.alt = "";
      var info = makeDiv("info");
      var nameSpan = document.createElement("span");
      nameSpan.className = "name";
      nameSpan.textContent = b.name;
      var meta = document.createElement("span");
      meta.className = "meta";
      info.appendChild(nameSpan);
      if(b.subtitle){
        var subSpan = document.createElement("span");
        subSpan.className = "sub";
        subSpan.textContent = b.subtitle;
        info.appendChild(subSpan);
      }
      info.appendChild(meta);
      function fill(rec){
        var cover = safeGet(coverKey(b.id));
        thumb.src = cover && cover.url ? cover.url : rec.url;
        meta.textContent = rec.count + (rec.count === 1 ? " note" : " notes") + (rec.count ? " \u00b7 " + timeAgo(rec.ts) : "");
      }
      fill(thumbFor(b, fill));
      row.appendChild(thumb);
      row.appendChild(info);
      row.addEventListener("click", async function(){
        if(b.id === activeBoardId) return;
        safeSet(boardViewKey(activeBoardId), {cx:viewCenter().x});
        saveThumbNow();
        if(CLOUD && cloudSync){
          // make sure nothing is left behind, and that the board is on this device before we switch to it
          try{
            if(cloudSync.hasPending()) await cloudSync.flush();
            if(!safeGet(notesKeyFor(b.id))){ cloudOverlay("Opening \u201c" + b.name + "\u201d\u2026"); await cloudSync.fillBoardCache(b.id); }
          }catch(e){ hideCloudOverlay(); toast(Stick.errors.friendly(Stick.errors.parse(e))); return; }
        }
        safeSet(ACTIVE_BOARD_KEY, b.id);
        location.hash = "";
        location.reload();
      });

      var renameBtn = document.createElement("button");
      renameBtn.innerHTML = ICONS.pencil;
      renameBtn.title = "Rename";
      renameBtn.addEventListener("click", function(e){
        e.stopPropagation();
        var input = document.createElement("input");
        input.value = b.name;
        row.innerHTML = "";
        row.appendChild(input);
        input.focus(); input.select();
        function commit(){
          var v = input.value.trim();
          if(v){ b.name = v; if(CLOUD && cloudSync) cloudSync.boardMetaChanged(b.id, {name:v}); }
          safeSet(BOARDS_KEY, boards);
          renderBoardList();
          updateBoardLabel();
        }
        input.addEventListener("keydown", function(ev){
          if(ev.key === "Enter") commit();
          if(ev.key === "Escape") renderBoardList();
        });
        input.addEventListener("blur", commit);
      });
      var canManage = !CLOUD || !b.access || b.access === "owner";
      if(canManage) row.appendChild(renameBtn);

      var coverBtn = document.createElement("button");
      coverBtn.innerHTML = ICONS.image;
      coverBtn.title = "Cover & subtitle";
      coverBtn.setAttribute("aria-label", "Board cover and subtitle");
      coverBtn.addEventListener("click", function(e){ e.stopPropagation(); openCoverEditor(b); });
      if(canManage) row.appendChild(coverBtn);

      if(boards.length > 1){
        var delBtn = document.createElement("button");
        delBtn.innerHTML = ICONS.close;
        delBtn.title = (CLOUD && b.access && b.access !== "owner") ? "Leave board" : "Delete board";
        delBtn.addEventListener("click", function(e){
          e.stopPropagation();
          if(!confirm2(delBtn)) return;
          if(CLOUD) cloudRemoveBoard(b); else finishLocalBoardRemoval(b);
        });
        row.appendChild(delBtn);
      }

      boardList.appendChild(row);
    });
  }
  function finishLocalBoardRemoval(b){
    boards = boards.filter(function(x){ return x.id !== b.id; });
    safeSet(BOARDS_KEY, boards);
    try{ localStorage.removeItem(notesKeyFor(b.id)); localStorage.removeItem(boardViewKey(b.id)); localStorage.removeItem(thumbKey(b.id)); localStorage.removeItem(coverKey(b.id)); localStorage.removeItem("stickyboard." + NS + "sync." + b.id); }catch(err){}
    if(b.id === activeBoardId){
      safeSet(ACTIVE_BOARD_KEY, boards[0].id);
      location.hash = "";
      location.reload();
      return;
    }
    renderBoardList();
  }
  // in an account the server decides first: only when it agrees do we forget the board locally
  async function cloudRemoveBoard(b){
    try{
      if(b.access && b.access !== "owner") await Stick.repo.leaveBoard(b.id); else await Stick.repo.deleteBoard(b.id);
    }catch(e){ toast(Stick.errors.friendly(Stick.errors.parse(e))); return; }
    finishLocalBoardRemoval(b);
  }
  function boardLimitMessage(err){
    var plan = (settings.account && settings.account.plan) || "free";
    var lim = ((Stick.config.PLAN_LIMITS || {})[plan] || {}).boards;
    return err && err.code === "BOARD_LIMIT_REACHED"
      ? "Your " + plan + " plan includes " + (lim || "a limited number of") + " boards. Delete one to make room."
      : Stick.errors.friendly(err);
  }
  function confirm2(btn){
    if(btn.dataset.armed === "1"){ return true; }
    btn.dataset.armed = "1";
    btn.innerHTML = ICONS.check;
    btn.title = "Click again to confirm delete";
    setTimeout(function(){ btn.dataset.armed = "0"; btn.innerHTML = ICONS.close; btn.title = "Delete board"; }, 3000);
    return false;
  }
  function updateBoardLabel(){
    var cur = boards.filter(function(x){ return x.id === activeBoardId; })[0];
    brandBtn.title = cur && cur.subtitle ? cur.name + " \u00b7 " + cur.subtitle : "Switch board";
    var b = boards.filter(function(x){ return x.id === activeBoardId; })[0];
    boardNameLabel.textContent = b ? b.name : "";
  }

  if((!readOnly || viewerMode) && !singleNoteMode){
    updateBoardLabel();
    brandBtn.addEventListener("click", function(){
      var willOpen = boardPanel.hidden;
      closeOtherPanels(willOpen ? boardPanel : null);
      boardPanel.hidden = !willOpen; if(willOpen) boardLayer.open();
      if(willOpen) renderBoardList();
    });
    document.addEventListener("click", function(e){
      if(!boardPanel.hidden && !boardPanel.contains(e.target) && !brandBtn.contains(e.target)){
        boardPanel.hidden = true;
      }
    });
    addBoardBtn.addEventListener("click", async function(){
      var name = newBoardName.value.trim() || "New board";
      if(CLOUD){
        if(!cloudSync || addBoardBtn.disabled) return;
        addBoardBtn.disabled = true;
        try{
          var created = await Stick.repo.createBoard(name);          // the server enforces the plan's board limit
          await cloudSync.refreshBoards();
          await cloudSync.fillBoardCache(created.id);
          safeSet(ACTIVE_BOARD_KEY, created.id);
        }catch(e){ addBoardBtn.disabled = false; toast(boardLimitMessage(Stick.errors.parse(e))); return; }
        newBoardName.value = "";
        location.hash = "";
        location.reload();
        return;
      }
      var id = "b" + Date.now().toString(36) + Math.floor(rand(0,99));
      boards.push({id:id, name:name});
      safeSet(BOARDS_KEY, boards);
      safeSet(ACTIVE_BOARD_KEY, id);
      newBoardName.value = "";
      location.hash = "";
      location.reload();
    });
    newBoardName.addEventListener("keydown", function(e){
      if(e.key === "Enter") addBoardBtn.click();
    });
  }

  // ---------- actions: one registry behind the shortcuts, the command palette and the shortcut settings ----------
  // Every command a person can run by key or by name is one entry here: id, label, group, keywords, default key, when it applies, what it does.
  // The keyboard handler, the palette and the "Shortcuts" pane all read this list, so they can never disagree.
  var KB = (window.Stick && Stick.keys) || null;
  var ACTIONS = [];
  function defineAction(a){ ACTIONS.push(a); return a; }
  function actionById(id){ for(var i = 0; i < ACTIONS.length; i++){ if(ACTIONS[i].id === id) return ACTIONS[i]; } return null; }
  function actionReady(a){
    if(a.edit && (readOnly || singleNoteMode)) return false;
    try{ return a.when ? !!a.when() : true; }catch(e){ return false; }
  }
  // keys that do something fixed (editing, closing); a person can't give them away
  var FIXED_BINDINGS = {"Mod+B": "Bold", "Mod+I": "Italic", "Mod+Enter": "Add a comment", "Mod+Shift+Z": "Redo"};
  function defaultKeys(){ var d = {}; ACTIONS.forEach(function(a){ if(a.rebind !== false) d[a.id] = a.def || ""; }); return d; }
  function fixedKeys(){ var d = {}; ACTIONS.forEach(function(a){ if(a.rebind === false && a.def) d[a.id] = a.def; }); return d; }
  function customKeys(){ return KB ? KB.sanitize(settings.shortcuts || {}, defaultKeys(), IS_MAC, FIXED_BINDINGS) : {}; }
  function activeKeys(){ return KB ? KB.resolve(defaultKeys(), customKeys()) : defaultKeys(); }
  function keyOf(a){ if(a.rebind === false) return a.def || ""; var m = activeKeys(); return m[a.id] || ""; }
  function keyCaps(binding){ return KB && binding ? KB.format(binding, IS_MAC) : []; }

  var shortcutSyncT = null;
  function saveShortcuts(custom){
    if(Object.keys(custom).length) settings.shortcuts = custom; else delete settings.shortcuts;
    saveSettings();
    clearTimeout(shortcutSyncT);
    if(CLOUD && window.Stick && Stick.auth && Stick.auth.user() && Stick.account && Stick.account.saveUiPrefs){
      shortcutSyncT = setTimeout(function(){
        var cur = (Stick.account.cached() && Stick.account.cached().settings && Stick.account.cached().settings.uiPrefs) || {};
        var next = {}; Object.keys(cur).forEach(function(k){ next[k] = cur[k]; });
        if(Object.keys(custom).length) next.shortcuts = custom; else delete next.shortcuts;
        Stick.account.saveUiPrefs(next).catch(function(){});
      }, 700);
    }
  }
  // signed in: what the account holds wins on this device (so two devices agree); nothing stored there yet: this device's choices go up
  function adoptAccountShortcuts(prefs){
    var remote = prefs && prefs.shortcuts;
    if(remote && typeof remote === "object"){
      var clean = KB ? KB.sanitize(remote, defaultKeys(), IS_MAC, FIXED_BINDINGS) : {};
      if(JSON.stringify(clean) !== JSON.stringify(settings.shortcuts || {})){ if(Object.keys(clean).length) settings.shortcuts = clean; else delete settings.shortcuts; saveSettings(); refreshShortcutPane(); }
    } else if(settings.shortcuts && Object.keys(settings.shortcuts).length){ saveShortcuts(settings.shortcuts); }
  }
  var shortcutPaneRefresh = null;
  function refreshShortcutPane(){ if(shortcutPaneRefresh) try{ shortcutPaneRefresh(); }catch(e){} }

  function selIds(){ return Array.from(selected).filter(function(id){ return !!findNote(id); }); }
  function viewBookmarkPoint(){ return {x: Math.round(viewCenter().x), sy: Math.round(board.scrollTop / (boardZoom || 1)), zoom: boardZoom}; }

  defineAction({id: "newNote", label: "New note", group: "Create", keywords: "add sticky write", def: "N", edit: true,
    run: function(){
      var vr = board.getBoundingClientRect(), br = boardInner.getBoundingClientRect();
      addNoteAt((vr.left + vr.width / 2 - br.left) / boardZoom, (vr.top + Math.min(vr.height / 2, 240) - br.top) / boardZoom, {focus: true});
    }});
  defineAction({id: "duplicate", label: "Duplicate selection", group: "Selection", keywords: "copy clone", def: "Mod+D", edit: true,
    when: function(){ return selected.size > 0 || !!document.querySelector(".note .text:focus"); },
    run: function(){
      var ae = document.activeElement;
      var editing = ae && ae.classList && ae.classList.contains("text") ? notes.filter(function(n){ return n.textEl === ae; })[0] : null;
      var ids = editing ? [editing.id] : selIds();
      if(!ids.length) return; if(editing) ae.blur(); duplicateNotes(ids);
    }});
  defineAction({id: "newShopping", label: "Add a shopping list", group: "Create", keywords: "buy groceries cart trip list purchase", def: "", edit: true, run: function(){ createShopping(); }});
  defineAction({id: "newZone", label: "Add a zone", group: "Create", keywords: "area region section paper background label", def: "", edit: true, run: function(){ createZone(); }});
  defineAction({id: "pin", label: "Pin or unpin selection", group: "Selection", keywords: "lock fix place stay anchor", def: "P", edit: true,
    when: function(){ return selIds().length > 0; },
    run: function(){ var ids = selIds(); var any = ids.some(function(id){ return !isPinned(findNote(id)); }); setPinned(ids, any); }});
  defineAction({id: "done", label: "Mark selected as done", group: "Selection", keywords: "finish complete tick", def: "Shift+D", edit: true,
    when: function(){ return selIds().length > 0; },
    run: function(){ markDoneGroup(selIds()); }});
  defineAction({id: "stack", label: "Stack selected notes vertically", group: "Selection", keywords: "arrange line up column heap", def: "", edit: true,
    when: function(){ return pileEligibleList(selIds()).length >= 2; }, run: function(){ stackNotes(selIds()); }});
  defineAction({id: "pile", label: "Collapse selected notes into a pile", group: "Selection", keywords: "stack group bundle heap collapse", def: "", edit: true,
    when: function(){ return pileEligibleList(selIds()).length >= 2; }, run: function(){ makePile(selIds()); }});
  defineAction({id: "unpile", label: "Unpile (open the selected pile)", group: "Selection", keywords: "spread expand open uncollapse", def: "", edit: true,
    when: function(){ var ids = selIds(); return ids.length === 1 && isPileObj(findNote(ids[0])); }, run: function(){ unpilePile(findNote(selIds()[0])); }});
  defineAction({id: "straighten", label: "Straighten selected items", group: "Selection", keywords: "level rotate turn tilt flat", def: "", edit: true,
    when: function(){ return selIds().some(function(id){ var q = findNote(id); return rotatable(q) && (q.rot || 0) !== 0; }); }, run: function(){ straighten(selIds().map(findNote).filter(Boolean)); }});
  defineAction({id: "rotateLeft", label: "Rotate selected item left", group: "Selection", keywords: "turn tilt anticlockwise", def: "", edit: true,
    when: function(){ return selIds().some(function(id){ return rotatable(findNote(id)); }); }, run: function(){ rotateBy(selIds().map(findNote).filter(Boolean), -ROT_STEP); }});
  defineAction({id: "rotateRight", label: "Rotate selected item right", group: "Selection", keywords: "turn tilt clockwise", def: "", edit: true,
    when: function(){ return selIds().some(function(id){ return rotatable(findNote(id)); }); }, run: function(){ rotateBy(selIds().map(findNote).filter(Boolean), ROT_STEP); }});
  defineAction({id: "focus", label: "Open selection in Focus Mode", group: "Selection", keywords: "large big full", def: "F",
    when: function(){ var ids = selIds(); return ids.length === 1 && !findNote(ids[0]).type; },
    run: function(){ enterFocus(findNote(selIds()[0])); }});
  defineAction({id: "selectAll", label: "Select everything", group: "Selection", keywords: "all", def: "Mod+A", rebind: false, edit: true,
    run: function(){ setSelection(notes.map(function(n){ return n.id; })); }});
  defineAction({id: "undo", label: "Undo", group: "Board", keywords: "back revert", def: "Mod+Z", rebind: false, edit: true, run: function(){ undo(); }});
  defineAction({id: "redo", label: "Redo", group: "Board", keywords: "forward again", def: "Mod+Shift+Z", rebind: false, edit: true, run: function(){ redo(); }});
  defineAction({id: "cleanScreen", label: "Clean my screen", group: "Board", keywords: "tidy organize arrange visible", def: "", edit: true, run: function(){ openCleanUp("screen"); }});
  defineAction({id: "cleanBoard", label: "Clean the whole board", group: "Board", keywords: "tidy organize arrange everything canvas", def: "", edit: true, run: function(){ openCleanUp("board"); }});
  defineAction({id: "cleanUp", label: "Clean up…", group: "Board", keywords: "tidy organize arrange broom", def: "", edit: true, run: function(){ openCleanUp(); }});
  defineAction({id: "palette", label: "Open the command palette", group: "Go", keywords: "commands actions find run", def: "Mod+K", run: function(){ openPalette(); }});
  defineAction({id: "search", label: "Search notes", group: "Go", keywords: "find look", def: "/", run: function(){ var t = document.getElementById("searchToggle"); if(t && t.offsetParent !== null){ t.click(); return; } searchInput.focus(); searchInput.select(); }});
  defineAction({id: "boards", label: "Switch board", group: "Go", keywords: "boards change open other", def: "",
    run: function(){ if(boardPanel.hidden) brandBtn.click(); }});
  defineAction({id: "shortcuts", label: "Keyboard shortcuts", group: "Go", keywords: "keys keyboard help rebind customize", def: "?", run: function(){ openControlCenter("shortcuts"); }});
  defineAction({id: "settings", label: "Open Settings", group: "Go", keywords: "preferences control center appearance", def: "", run: function(){ openControlCenter(); }});
  defineAction({id: "whatsNew", label: "Show What’s New", group: "Go", keywords: "patch notes changes version tour update", def: "",
    when: function(){ return !!ptData(); }, run: function(){ openWhatsNew(); }});
  defineAction({id: "bookmarkHere", label: "Bookmark this spot", group: "Go", keywords: "save place view remember", def: "B", edit: true, run: function(){ bookmarkThisSpot(); }});
  defineAction({id: "bookmarks", label: "Manage bookmarks…", group: "Go", keywords: "places saved spots rename delete", def: "", run: function(){ manageBookmarks(); }});

  // ---- the keyboard dispatcher
  if(!singleNoteMode){
    document.addEventListener("keydown", function(e){
      if(rebinderOpen && !(rebinderEl && rebinderEl.isConnected)) rebinderOpen = false;
      if(e.defaultPrevented || e.isComposing || !KB || rebinderOpen) return;
      var b = KB.fromEvent(e, IS_MAC); if(!b) return;
      if(paletteState) return;
      var hasMod = /(^|\+)(Mod|Alt|Ctrl|Meta)\+/.test(b);
      if(isTyping() && !hasMod) return;                                     // letters belong to the text
      if(modalOpen() && !(b === activeKeys().palette && !focusState && !tourRoot)) return;
      var id = KB.find(activeKeys(), b) || KB.find(fixedKeys(), b), a = id ? actionById(id) : null;
      if(!a || !actionReady(a)) return;
      if(isTyping() && /^(selectAll|undo|redo)$/.test(a.id)) return;        // inside a note, the browser's own editing applies
      e.preventDefault(); e.stopImmediatePropagation();
      a.run();
    });
  }

  // ---- spatial history: Back / Forward through the places you have looked at on this board (this visit only)
  // A place is remembered once you have stayed somewhere clearly different for a moment, so scrolling past is not recorded.
  var VH = {list: [], i: -1, timer: null, jumping: false, CAP: 30};
  function curView(){ return {x: Math.round(viewCenter().x), sy: Math.round(board.scrollTop / (boardZoom || 1)), zoom: boardZoom}; }
  function viewFar(a, b){ return Math.abs(a.x - b.x) > board.clientWidth * 0.6 / (boardZoom || 1) || Math.abs((a.zoom || 1) - (b.zoom || 1)) > 0.25 || Math.abs(a.sy - b.sy) > 240; }
  function viewCheckpoint(){
    if(!VH || VH.jumping) return;
    var v = curView();
    if(VH.i < 0){ VH.list = [v]; VH.i = 0; return; }
    if(!viewFar(VH.list[VH.i], v)) { VH.list[VH.i] = VH.list[VH.i]; return; }
    VH.list = VH.list.slice(0, VH.i + 1); VH.list.push(v);
    if(VH.list.length > VH.CAP) VH.list.shift();
    VH.i = VH.list.length - 1;
  }
  function scheduleViewCheckpoint(){ if(!VH) return; clearTimeout(VH.timer); VH.timer = setTimeout(viewCheckpoint, 1100); }
  function goToView(v){
    VH.jumping = true; clearTimeout(VH.timer);
    boardZoom = Math.min(1.6, Math.max(0.5, +v.zoom || 1)); applyZoom();
    board.scrollLeft = Math.max(0, v.x * boardZoom - board.clientWidth / 2);
    if(boardZoom > 1) board.scrollTop = Math.max(0, (v.sy || 0) * boardZoom);
    updateMinimapViewport();
    setTimeout(function(){ VH.jumping = false; }, 600);
  }
  function viewBack(){ viewCheckpoint(); if(VH.i <= 0){ toast("No earlier place to go back to."); return; } VH.i--; goToView(VH.list[VH.i]); }
  function viewForward(){ if(VH.i < 0 || VH.i >= VH.list.length - 1){ toast("No later place to go forward to."); return; } VH.i++; goToView(VH.list[VH.i]); }
  setTimeout(viewCheckpoint, 1500);
  defineAction({id: "viewBack", label: "Go back to the previous place on the board", group: "Go", keywords: "history previous spatial view back", def: "Alt+[", when: function(){ return VH.i > 0 || (VH.i === 0 && viewFar(VH.list[0], curView())); }, run: viewBack});
  defineAction({id: "viewForward", label: "Go forward to the next place on the board", group: "Go", keywords: "history next spatial view forward", def: "Alt+]", when: function(){ return VH.i >= 0 && VH.i < VH.list.length - 1; }, run: viewForward});
  Stick.viewHistory = {list: function(){ return VH.list.slice(); }, index: function(){ return VH.i; }, back: viewBack, forward: viewForward, checkpoint: viewCheckpoint};

  // ---- bookmarks: named places on one board (this device)
  var BOOKMARK_MAX = 30;
  function bookmarkKey(){ return "stickyboard." + NS + "bookmarks." + activeBoardId; }
  function readBookmarks(){
    var raw = safeGet(bookmarkKey()); if(!Array.isArray(raw)) return [];
    return raw.filter(function(b){ return b && typeof b.id === "string" && typeof b.name === "string" && isFinite(b.x); }).slice(0, BOOKMARK_MAX);
  }
  function writeBookmarks(list){ safeSet(bookmarkKey(), list.slice(0, BOOKMARK_MAX)); }
  function goToBookmark(b){
    viewCheckpoint();
    boardZoom = Math.min(1.6, Math.max(0.5, +b.zoom || 1)); applyZoom();
    board.scrollLeft = Math.max(0, b.x * boardZoom - board.clientWidth / 2);
    if(boardZoom > 1) board.scrollTop = Math.max(0, (b.sy || 0) * boardZoom);
    updateMinimapViewport();
    scheduleViewCheckpoint(); setTimeout(viewCheckpoint, 400);
    toast("Went to “" + b.name + "”.");
  }
  function nameDialog(title, label, value, confirmLabel, done){
    var wrap = makeDiv("nameDlg"), lab = document.createElement("label"), input = document.createElement("input");
    lab.textContent = label; lab.className = "asLbl"; input.type = "text"; input.className = "asIn"; input.maxLength = 40; input.value = value || ""; input.autocomplete = "off";
    var id = "nameDlgIn" + (++dialogSeq); input.id = id; lab.setAttribute("for", id); wrap.appendChild(lab); wrap.appendChild(input);
    var m = openModal({title: title, content: wrap, width: 360, actions: [{label: "Cancel", value: false}, {label: confirmLabel, kind: "primary", id: "nameOk", onClick: function(close){ var v = input.value.replace(/\s+/g, " ").trim(); if(!v){ input.focus(); return false; } done(v); }}]});
    input.addEventListener("keydown", function(e){ if(e.key === "Enter"){ e.preventDefault(); m.card.querySelector("#nameOk").click(); } });
    setTimeout(function(){ input.focus(); input.select(); }, 0);
  }
  function bookmarkThisSpot(){
    var list = readBookmarks();
    if(list.length >= BOOKMARK_MAX){ toast("That’s " + BOOKMARK_MAX + " bookmarks, the most a board holds. Delete one first."); return; }
    var pt = viewBookmarkPoint();
    nameDialog("Bookmark this spot", "Name", "Spot " + (list.length + 1), "Save bookmark", function(name){
      var cur = readBookmarks(); cur.push({id: "bm" + Date.now().toString(36) + Math.floor(Math.random() * 1000), name: name.slice(0, 40), x: pt.x, sy: pt.sy, zoom: pt.zoom});
      writeBookmarks(cur); toast("Bookmarked “" + name + "”. Find it in the command palette (" + MOD + " + K).");
    });
  }
  function manageBookmarks(){
    var wrap = makeDiv("bmList"), m;
    function paint(){
      wrap.innerHTML = ""; var list = readBookmarks();
      if(!list.length){ var p = document.createElement("p"); p.className = "acctSub"; p.textContent = "No bookmarks on this board yet. Press B (or use the command palette) to save the spot you are looking at."; wrap.appendChild(p); return; }
      list.forEach(function(b){
        var row = makeDiv("bmRow"), go = document.createElement("button"), ren = document.createElement("button"), del = document.createElement("button");
        go.type = ren.type = del.type = "button"; go.className = "bmGo"; go.textContent = b.name; go.addEventListener("click", function(){ m.close(); goToBookmark(b); });
        ren.className = del.className = "pillBtn bmBtn"; ren.textContent = "Rename"; del.textContent = "Delete";
        ren.setAttribute("aria-label", "Rename " + b.name); del.setAttribute("aria-label", "Delete bookmark " + b.name);
        ren.addEventListener("click", function(){ nameDialog("Rename bookmark", "Name", b.name, "Save", function(v){ var cur = readBookmarks(); cur.forEach(function(x){ if(x.id === b.id) x.name = v.slice(0, 40); }); writeBookmarks(cur); paint(); }); });
        del.addEventListener("click", function(){ writeBookmarks(readBookmarks().filter(function(x){ return x.id !== b.id; })); paint(); });
        row.appendChild(go); row.appendChild(ren); row.appendChild(del); wrap.appendChild(row);
      });
    }
    paint();
    m = openModal({title: "Bookmarks", content: wrap, width: 420, actions: [{label: "Done", kind: "primary", value: true}]});
  }

  // ---- the command palette
  var paletteState = null;
  var palLayer = OV.layer("command-palette", function(){ closePalette(); }, function(){ return !!paletteState; });
  function paletteItems(){
    var items = [];
    ACTIONS.forEach(function(a){
      if(!actionReady(a)) return;
      items.push({kind: "action", id: a.id, label: a.label, group: a.group, key: keyOf(a), hay: (a.label + " " + a.group + " " + (a.keywords || "")).toLowerCase(), run: a.run});
    });
    readBookmarks().forEach(function(b){ items.push({kind: "bookmark", id: "bm:" + b.id, label: "Go to bookmark: " + b.name, group: "Bookmarks", key: "", hay: ("go to bookmark " + b.name + " place spot").toLowerCase(), run: function(){ goToBookmark(b); }}); });
    return items;
  }
  function paletteScore(it, words){
    var s = 0;
    for(var i = 0; i < words.length; i++){
      var w = words[i], at = it.hay.indexOf(w); if(at === -1) return -1;
      s += at === 0 ? 3 : (it.hay.charAt(at - 1) === " " ? 2 : 1);
      if(it.label.toLowerCase().indexOf(w) !== -1) s += 2;
    }
    return s;
  }
  function openPalette(){
    if(paletteState){ paletteState.input.focus(); return; }
    closeFloatingPopovers(); closeCaptureMenu();
    var opener = document.activeElement;
    var back = makeDiv("palBackdrop"), card = makeDiv("palCard");
    card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "true"); card.setAttribute("aria-label", "Command palette");
    var input = document.createElement("input"); input.type = "text"; input.className = "palInput"; input.placeholder = "Type a command…"; input.autocomplete = "off"; input.spellcheck = false;
    input.setAttribute("role", "combobox"); input.setAttribute("aria-expanded", "true"); input.setAttribute("aria-controls", "palList"); input.setAttribute("aria-label", "Search commands"); input.setAttribute("aria-autocomplete", "list");
    var list = document.createElement("ul"); list.className = "palList"; list.id = "palList"; list.setAttribute("role", "listbox");
    var status = makeDiv("sr-only"); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    var foot = makeDiv("palFoot"); foot.textContent = "↑↓ to choose · Enter to run · Esc to close";
    card.appendChild(input); card.appendChild(list); card.appendChild(status); card.appendChild(foot); back.appendChild(card);
    var all = paletteItems(), shown = [], sel = 0;
    function paint(){
      var q = input.value.trim().toLowerCase(), words = q ? q.split(/\s+/) : [];
      shown = all.map(function(it){ return {it: it, s: words.length ? paletteScore(it, words) : 0}; }).filter(function(x){ return x.s >= 0; });
      if(words.length) shown.sort(function(a, b){ return b.s - a.s; });
      shown = shown.map(function(x){ return x.it; }).slice(0, 40);
      if(sel >= shown.length) sel = Math.max(0, shown.length - 1);
      list.innerHTML = "";
      if(!shown.length){ var none = document.createElement("li"); none.className = "palNone"; none.textContent = "Nothing matches that. Try another word."; none.setAttribute("role", "presentation"); list.appendChild(none); input.removeAttribute("aria-activedescendant"); }
      shown.forEach(function(it, i){
        var li = document.createElement("li"); li.className = "palItem" + (i === sel ? " sel" : ""); li.id = "palOpt" + i; li.setAttribute("role", "option"); li.setAttribute("aria-selected", i === sel ? "true" : "false");
        var t = document.createElement("span"); t.className = "palLabel"; t.textContent = it.label;
        var g = document.createElement("span"); g.className = "palGroup"; g.textContent = it.group;
        li.appendChild(t); li.appendChild(g);
        if(it.key){ var caps = makeDiv("palKeys"); keyCaps(it.key).forEach(function(c){ var k = document.createElement("kbd"); k.textContent = c; caps.appendChild(k); }); li.appendChild(caps); }
        li.addEventListener("mousemove", function(){ if(sel !== i){ sel = i; mark(); } });
        li.addEventListener("click", function(){ run(it); });
        list.appendChild(li);
      });
      if(shown.length){ input.setAttribute("aria-activedescendant", "palOpt" + sel); }
      status.textContent = shown.length + (shown.length === 1 ? " command" : " commands");
    }
    function mark(){
      Array.prototype.forEach.call(list.children, function(li, i){ var on = i === sel; li.classList.toggle("sel", on); li.setAttribute("aria-selected", on ? "true" : "false"); if(on){ input.setAttribute("aria-activedescendant", li.id); li.scrollIntoView({block: "nearest"}); } });
    }
    function run(it){ closePalette(true); setTimeout(function(){ try{ it.run(); }catch(err){ toast("That didn’t work. Try again."); } }, 0); }
    input.addEventListener("input", function(){ sel = 0; paint(); });
    input.addEventListener("keydown", function(e){
      if(e.isComposing) return;
      if(e.key === "ArrowDown"){ e.preventDefault(); if(shown.length){ sel = (sel + 1) % shown.length; mark(); } }
      else if(e.key === "ArrowUp"){ e.preventDefault(); if(shown.length){ sel = (sel - 1 + shown.length) % shown.length; mark(); } }
      else if(e.key === "Home" && !input.value){ e.preventDefault(); sel = 0; mark(); }
      else if(e.key === "End" && !input.value){ e.preventDefault(); sel = Math.max(0, shown.length - 1); mark(); }
      else if(e.key === "Enter"){ e.preventDefault(); if(shown[sel]) run(shown[sel]); }
      else if(e.key === "Tab"){ e.preventDefault(); }
    });
    back.addEventListener("mousedown", function(e){ if(e.target === back) closePalette(); });
    document.body.appendChild(back);
    paletteState = {back: back, input: input, opener: opener};
    palLayer.open(); paint(); input.focus();
  }
  function closePalette(ran){
    if(!paletteState) return;
    var st = paletteState; paletteState = null; palLayer.close(); st.back.remove();
    if(!ran && st.opener && st.opener.focus && document.contains(st.opener)){ try{ st.opener.focus(); }catch(e){} }
  }
  // opening the palette from outside (a button, the dev tools)
  Stick.palette = {open: function(){ openPalette(); }, close: function(){ closePalette(); }, isOpen: function(){ return !!paletteState; }, actions: function(){ return ACTIONS.map(function(a){ return {id: a.id, label: a.label, group: a.group, key: keyOf(a), rebind: a.rebind !== false}; }); }};
  var rebinderOpen = false, rebinderEl = null;

  // ---------- keyboard shortcuts ----------
  function isTyping(){
    var ae = document.activeElement;
    return !!(ae && (ae.isContentEditable || ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.tagName === "SELECT"));
  }
  function modalOpen(){ return !!document.querySelector(".acctBackdrop:not([hidden])") || !!tourRoot || !!focusState; }

  if(!readOnly && !singleNoteMode){
    document.addEventListener("keydown", function(e){
      var typing = isTyping();
      var mod = e.ctrlKey || e.metaKey;
      var key = e.key;
      if(key === "Escape"){
        if(captureMenuEl){ closeCaptureMenu(); return; }
        if(recording){ recording.cancel(); return; }
        if(openPopover){ closeFloatingPopovers(); return; }
        if(focusState){ e.preventDefault(); exitFocus(); return; }
        if(modalOpen()) return;
        if(typing){ document.activeElement.blur(); }
        else if(selected.size){ clearSelection(); }
        return;
      }
      if(modalOpen()) return;

      // board-level undo / redo; inside a note or field the browser's own text undo applies
      if(mod && !e.altKey && !typing && (key.toLowerCase() === "z" || key.toLowerCase() === "y")){
        e.preventDefault();
        if(key.toLowerCase() === "y" || e.shiftKey) redo(); else undo();
        return;
      }
      var isZoomKey = mod && (key === "+" || key === "=" || key === "-" || key === "_" || key === "0");
      if(isZoomKey && !typing){
        e.preventDefault();
        var sel = selectedNotes();
        if(sel.length){
          var before = captureState(sel.map(function(n){ return n.id; }));
          sel.forEach(function(selNote){
            if(isAV(selNote)) return; // memo strips and film stills keep their size
            if(isPhoto(selNote)){
              selNote.w = key === "0" ? defaultPhotoW(selNote) : Math.round(Math.min(PHOTO_MAX_W, Math.max(PHOTO_MIN_W, selNote.w * ((key === "-" || key === "_") ? 0.9 : 1.1))));
              if(selNote.el) selNote.el.style.setProperty("--pw", selNote.w + "px");
              return;
            }
            if(key === "0"){ selNote.w = NOTE_W; }
            else{
              var wStep = (key === "-" || key === "_") ? -20 : 20;
              selNote.w = Math.min(420, Math.max(160, (selNote.w || NOTE_W) + wStep));
            }
            if(selNote.el) selNote.el.style.width = selNote.w + "px";
          });
          saveNotes();
          updateMinimap();
          recordChange(sel.length > 1 ? "Resize notes" : "Resize note", before, {coalesce:"resize:" + Array.from(selected).join(",")});
        } else {
          if(key === "0"){ boardZoom = 1; }
          else{
            var zStep = (key === "-" || key === "_") ? -0.1 : 0.1;
            boardZoom = Math.round(Math.min(1.6, Math.max(0.5, boardZoom + zStep)) * 100) / 100;
          }
          applyZoom();
        }
        return;
      }

      if(!typing && selectedImageNote && (key === "Delete" || key === "Backspace") && findNote(selectedImageNote.id)){
        e.preventDefault();
        var act = removeImage(selectedImageNote);
        toast("Image removed.", "Undo", function(){ undoIfTop(act); });
        return;
      }
      if(typing || !selected.size) return;
      if(key === "Delete" || key === "Backspace"){
        // only when not editing text: Backspace inside a note always edits text
        e.preventDefault();
        requestDelete(Array.from(selected));
        return;
      }
      var step = e.shiftKey ? 20 : 4;
      var dx = 0, dy = 0;
      if(key === "ArrowUp") dy = -step;
      else if(key === "ArrowDown") dy = step;
      else if(key === "ArrowLeft") dx = -step;
      else if(key === "ArrowRight") dx = step;
      else return;
      e.preventDefault();
      var list = selectedNotes().filter(function(n){ return !isPinned(n); });
      if(!list.length) return;
      var before2 = captureState(list.map(function(n){ return n.id; }));
      var minX = Math.min.apply(null, list.map(function(n){ return n.x; }));
      var minY = Math.min.apply(null, list.map(function(n){ return n.y; }));
      var roomDown = Math.min.apply(null, list.map(function(n){ return itemMaxY(n) - n.y; }));
      dx = Math.max(-minX, dx);
      dy = Math.max(-minY, Math.min(Math.max(0, roomDown), dy));
      list.forEach(function(n){
        n.x += dx; n.y += dy;
        if(n.el){ n.el.style.left = n.x + "px"; n.el.style.top = n.y + "px"; }
      });
      ensureWidth();
      saveNotes();
      updateMinimap();
      recordChange(list.length > 1 ? "Move notes" : "Move note", before2, {coalesce:"nudge:" + Array.from(selected).join(",")});
    });

    // copy / paste whole notes when not editing text; text copy/paste is left alone
    function pageTextSelected(){
      var s = window.getSelection();
      return !!(s && !s.isCollapsed && String(s).trim());
    }
    var pendingPasteT = null;
    document.addEventListener("keydown", function(e){
      if(!(e.ctrlKey || e.metaKey) || e.altKey || isTyping() || modalOpen()) return;
      var k = e.key.toLowerCase();
      if((k === "c" || k === "x") && selected.size && !pageTextSelected()){
        var ids = Array.from(selected);
        copyNotesToClipboard(null, k === "x");
        if(k === "x") deleteNotes(ids);
      } else if(k === "v"){
        // if the browser doesn't deliver a paste event (no permission, older Safari), use our own copy
        clearTimeout(pendingPasteT);
        pendingPasteT = setTimeout(function(){
          var stored = safeGet(CLIP_KEY);
          if(stored && stored.notes) pasteNotes(stored);
        }, 80);
      }
    });
    document.addEventListener("copy", function(e){
      if(isTyping() || modalOpen() || pageTextSelected()) return;
      copyNotesToClipboard(e, Date.now() - lastNoteCopy < 800);
    });
    document.addEventListener("cut", function(e){
      if(isTyping() || modalOpen() || pageTextSelected()) return;
      if(Date.now() - lastNoteCopy < 800 && e.clipboardData){
        var stored = safeGet(CLIP_KEY);
        if(stored){
          e.clipboardData.setData("text/plain", stored.text || " ");
          try{ e.clipboardData.setData(CLIP_MIME, JSON.stringify(stored)); }catch(err){}
          e.preventDefault();
        }
      }
    });
    document.addEventListener("paste", function(e){
      clearTimeout(pendingPasteT);
      if(isTyping() || modalOpen()) return;
      var cd = e.clipboardData;
      var data = null;
      if(cd){
        try{ var raw = cd.getData(CLIP_MIME); if(raw) data = JSON.parse(raw); }catch(err){}
      }
      var stored = safeGet(CLIP_KEY);
      var plain = cd ? cd.getData("text/plain") : "";
      if(!data && stored && (plain === (stored.text || " ") || (!plain && !(cd && cd.files && cd.files.length)))) data = stored;
      if(data && data.notes){ e.preventDefault(); pasteNotes(data); return; }
      var file = cd ? firstImageFile(cd) : null;
      if(file){
        e.preventDefault();
        var sel = selectedNotes();
        if(sel.length === 1 && !isPhoto(sel[0])){ handleImageDrop(file, sel[0]); toast("Added the image to the selected note."); }
        else { var vc = viewCenter(); dropPhotoFiles([file], vc.x, vc.y); }
        return;
      }
      var html = cd ? cd.getData("text/html") : "";
      if((plain && plain.trim()) || html){
        e.preventDefault();
        pasteAsNewNote(plain, html);
      }
    });
  }

  // ================================================================
  // Cloud (Supabase) integration. Everything here is inert unless a
  // backend is configured AND the visitor is signed in.
  // ================================================================
  var syncPill = document.getElementById("syncPill");
  var authLost = false, cloudSigningOut = false, migratedCloudId = null;

  // ---- the Stick-It loader --------------------------------------------------------------------------------------------
  // A red sticky note wobbles while something takes a moment; when it worked it turns into a green one that sticks and fades.
  // Rules: nothing shows for the first ~180 ms (no flicker on fast operations); once shown it stays at least 250 ms; the success and
  // failure moments are short. Cheap on purpose: only transform and opacity animate. Reduced motion: no wobble, a plain fade (see CSS).
  var SL = {el: null, timer: null, shownAt: 0, hideTimer: null, pending: null, retry: null};
  var SL_SHOW_AFTER = 180, SL_MIN_VISIBLE = 250;
  function slBuild(cover){
    var o = makeDiv("cloudOverlay stickLoader" + (cover ? " cover" : ""));
    o.id = "cloudOverlay"; o.setAttribute("role", "status"); o.setAttribute("aria-live", "polite");
    o.innerHTML = '<div class="slNote" aria-hidden="true"><span class="slRed">' + buildLogoSvg(LOGO_COLORS.loading.fill, LOGO_COLORS.loading.dark) + '</span>' +
      '<span class="slGreen">' + buildLogoSvg(LOGO_COLORS.ready.fill, LOGO_COLORS.ready.dark) + '</span></div>' +
      '<div class="msg"></div><button type="button" class="pillBtn slRetry" hidden>Try again</button>';
    document.body.appendChild(o);
    SL.el = o; SL.shownAt = Date.now();
    return o;
  }
  function slLive(){ if(SL.el && !SL.el.isConnected) SL.el = null; }          // something else removed it: forget it
  function slReset(o, text){
    o.classList.remove("ok", "fail", "out");
    o.querySelector(".msg").textContent = text;
    o.querySelector(".slRetry").hidden = true;
  }
  // text: what is happening ("Signing you in\u2026"). cover: true only when there is nothing else on screen yet (first load).
  function cloudOverlay(text, cover){
    clearTimeout(SL.hideTimer); SL.hideTimer = null; slLive();
    if(SL.el){ slReset(SL.el, text); return SL.el; }
    if(cover){ clearTimeout(SL.timer); SL.timer = null; var o = slBuild(true); slReset(o, text); return o; }
    SL.pending = text;
    if(!SL.timer) SL.timer = setTimeout(function(){ SL.timer = null; if(SL.pending !== null){ var o2 = slBuild(false); slReset(o2, SL.pending); } }, SL_SHOW_AFTER);
    return null;
  }
  function slRemove(){ if(SL.el){ SL.el.remove(); SL.el = null; } }
  function hideCloudOverlay(){
    clearTimeout(SL.timer); SL.timer = null; SL.pending = null;
    if(!SL.el) return;
    clearTimeout(SL.hideTimer);
    SL.hideTimer = setTimeout(slRemove, Math.max(0, SL_MIN_VISIBLE - (Date.now() - SL.shownAt)));
  }
  // it worked: the red note slows, turns green, pops, sticks, fades. `after` runs when it is done.
  function stickLoaderDone(text, after){
    clearTimeout(SL.timer); SL.timer = null; SL.pending = null; clearTimeout(SL.hideTimer); slLive();
    var o = SL.el || slBuild(false);
    slReset(o, text); void o.offsetWidth;
    o.classList.add("ok");
    setTimeout(function(){ o.classList.add("out"); }, 520);
    setTimeout(function(){ if(SL.el === o) slRemove(); if(after) after(); }, 760);
  }
  // it did not: the note stops, shakes once, says what happened and offers another try (never a flashing alert)
  function stickLoaderFail(text, retry){
    clearTimeout(SL.timer); SL.timer = null; SL.pending = null; clearTimeout(SL.hideTimer); slLive();
    var o = SL.el || slBuild(false);
    slReset(o, text); void o.offsetWidth;
    o.classList.add("fail");
    var btn = o.querySelector(".slRetry");
    btn.hidden = false; btn.onclick = function(){ slRemove(); if(retry) retry(); };
    if(!retry){ btn.textContent = "OK"; btn.onclick = slRemove; } else btn.textContent = "Try again";
    setTimeout(function(){ try{ btn.focus(); }catch(e){} }, 50);
  }

  // ---- the status slip at the foot of the canvas ------------------------------------------------------------------------
  // "Stick-It is still working": a small slip with the red note, along the bottom edge. The board stays visible and usable (the slip
  // ignores the pointer except for its Try again link). It only appears when something has taken longer than `delay`, stays long enough
  // to read, turns green for a moment when the thing finished, and stays (with a way to retry) only when it failed.
  var FT = {items: [], el: null, timer: null};
  function ftFind(key){ for(var i = 0; i < FT.items.length; i++){ if(FT.items[i].key === key) return FT.items[i]; } return null; }
  function ftDrop(key){ FT.items = FT.items.filter(function(i){ return i.key !== key; }); ftPaint(); }
  function ftEl(){
    if(FT.el && FT.el.isConnected) return FT.el;
    var e = makeDiv("footSlip"); e.setAttribute("role", "status"); e.setAttribute("aria-live", "polite"); e.hidden = true;
    e.innerHTML = '<span class="fsNote" aria-hidden="true"><span class="fsRed">' + buildLogoSvg(LOGO_COLORS.loading.fill, LOGO_COLORS.loading.dark) + '</span><span class="fsGreen">' + buildLogoSvg(LOGO_COLORS.ready.fill, LOGO_COLORS.ready.dark) + '</span></span><span class="fsMsg"></span><button type="button" class="fsRetry" hidden>Try again</button>';
    document.body.appendChild(e); FT.el = e;
    if(window.__floaterObserver) window.__floaterObserver.observe(e, {attributes: true, attributeFilter: ["hidden", "class"]});
    return e;
  }
  function ftPaint(){
    clearTimeout(FT.timer);
    var now = Date.now(), live = FT.items.filter(function(i){ return i.state !== "work" || now - i.t >= i.delay; });
    var e = ftEl();
    if(!live.length){
      e.hidden = true;
      var waiting = FT.items.filter(function(i){ return i.state === "work"; });
      if(waiting.length) FT.timer = setTimeout(ftPaint, Math.max(30, Math.min.apply(null, waiting.map(function(i){ return i.t + i.delay - now; }))));
      return;
    }
    var top = live[live.length - 1];
    if(!top.shownAt) top.shownAt = now;
    e.hidden = false; e.classList.toggle("ok", top.state === "ok"); e.classList.toggle("fail", top.state === "fail");
    e.querySelector(".fsMsg").textContent = top.text;
    var rb = e.querySelector(".fsRetry");
    rb.hidden = top.state !== "fail";
    if(top.state === "fail"){ rb.textContent = top.retry ? "Try again" : "OK"; rb.onclick = function(){ var r = top.retry; ftDrop(top.key); if(r) r(); }; }
  }
  // start (or update) a piece of work. `delay`: nothing shows until it has taken this long (default 400 ms).
  function busyStart(key, text, opts){
    var it = ftFind(key);
    if(it){ it.text = text; it.state = "work"; }
    else { it = {key: key, text: text, state: "work", t: Date.now(), delay: opts && opts.delay != null ? opts.delay : 400, shownAt: 0}; FT.items.push(it); }
    ftPaint(); return key;
  }
  // finished well: if the slip was showing it turns green with `text` for a moment, otherwise nothing ever appears
  function busyDone(key, text){
    var it = ftFind(key); if(!it) return;
    if(!it.shownAt){ ftDrop(key); return; }
    it.state = "ok"; if(text) it.text = text;
    var wait = Math.max(0, 450 - (Date.now() - it.shownAt));
    setTimeout(function(){ ftPaint(); setTimeout(function(){ if(ftFind(key) === it && it.state === "ok") ftDrop(key); }, 900); }, wait);
  }
  // finished without a result of its own (e.g. a quiet refresh): just remove it, after it has been readable for a moment
  function busyEnd(key){
    var it = ftFind(key); if(!it) return;
    if(!it.shownAt){ ftDrop(key); return; }
    setTimeout(function(){ if(ftFind(key) === it && it.state === "work") ftDrop(key); }, Math.max(0, 500 - (Date.now() - it.shownAt)));
  }
  function busyFail(key, text, retry){
    var it = ftFind(key) || (FT.items.push({key: key, delay: 0, t: Date.now(), shownAt: 0}), ftFind(key));
    it.state = "fail"; it.text = text; it.retry = retry || null; ftPaint();
  }
  // the same loader inside a section or dialog (not over the whole screen): shows after a short beat, never flickers
  function localLoader(box, text){
    var el = makeDiv("slLocal"), done = false, shown = 0, timer;
    el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite"); el.hidden = true;
    el.innerHTML = miniLoaderHtml() + '<span class="slLocalMsg"></span><button type="button" class="pillBtn cmtSmall slLocalRetry" hidden>Try again</button>';
    el.querySelector(".slLocalMsg").textContent = text;
    box.appendChild(el);
    timer = setTimeout(function(){ if(!done){ el.hidden = false; shown = Date.now(); } }, 150);
    return {
      el: el,
      stop: function(cb){ done = true; clearTimeout(timer); var wait = shown ? Math.max(0, 300 - (Date.now() - shown)) : 0; setTimeout(function(){ el.remove(); if(cb) cb(); }, wait); },
      fail: function(msg, retry){ done = true; clearTimeout(timer); el.hidden = false; el.classList.add("fail"); el.querySelector(".slMini").remove(); el.querySelector(".slLocalMsg").textContent = msg;
        var b = el.querySelector(".slLocalRetry"); b.hidden = !retry; b.onclick = function(){ el.remove(); if(retry) retry(); }; }
    };
  }

  // pictures coming down from the account: the foot slip says so while any are still on their way (checked twice a second, only then)
  var photoWatch = null;
  function photosPending(){ return notes.some(function(n){ return (isPhoto(n) || n.type === "postcard") && (n.assetId) && !n.image && n.mediaState !== "failed" && n.mediaState !== "missing"; }); }
  function watchPhotoLoading(){
    if(photoWatch || !CLOUD) return;
    var t0 = Date.now();
    photoWatch = setInterval(function(){
      if(photosPending() && Date.now() - t0 < 30000){ busyStart("photos", "Loading photos…", {delay: 600}); }
      else { clearInterval(photoWatch); photoWatch = null; busyEnd("photos"); }
    }, 500);
  }
  // one quiet word in the header; nothing on individual notes
  function updateSyncPill(state, note){
    if(!CLOUD){ syncPill.hidden = true; return; }
    syncPill.hidden = false;
    if(viewerMode){ syncPill.className = "syncPill saved"; syncPill.textContent = "View only"; syncPill.title = "You can look at this board but not change it."; return; }
    var labels = {saved:"Saved", saving:"Saving\u2026", offline:"Offline", problem: authLost ? "Sign in again" : "Sync problem"};
    syncPill.className = "syncPill " + state;
    syncPill.textContent = labels[state] || "Saved";
    if(state === "saving") busyStart("sync", "Syncing\u2026", {delay: 1200}); else if(state === "offline") busyStart("sync", "Reconnecting\u2026", {delay: 1500}); else busyEnd("sync");
    syncPill.title = state === "problem" ? ((note || "Some changes couldn't be saved.") + " Click to try again.")
      : state === "offline" ? "You're offline. Changes are kept on this device and will sync when you're back." : "";
  }
  syncPill.addEventListener("click", function(){
    if(!cloudSync) return;
    if(authLost){ beginGoogleSignIn(); return; }
    var st = cloudSync.status().state;
    if(st === "problem" || st === "offline") cloudSync.retryAll();
  });

  // what the sync layer needs from the app
  var cloudHost = {
    protectedIds: function(){ return quarantined; },           // unreadable here is not the same as deleted: never sent as a delete
    isShareView: function(){ return SHARE_LINK_PAGE; },       // the sync layer refuses to attach to a board from a share-link page
    snapshot: function(){ return notes.concat(donePile).map(persistForm); },
    getObject: function(id){ var n = findNote(id) || findPile(id); return n ? persistForm(n) : null; },
    // changes that came from the server: applied without an undo step
    applyRemote: function(d){
      (d.removes || []).forEach(function(id){
        var pi = donePile.findIndex(function(x){ return x.id === id; }); if(pi !== -1) donePile.splice(pi, 1);
        var n = findNote(id); if(!n) return;
        selected.delete(id);
        if(n.el) n.el.remove();
        notes.splice(notes.indexOf(n), 1);
        clearDecorations(id);
      });
      (d.upserts || []).forEach(function(raw){
        var o = sanitizeSafely(raw); if(!o) return;
        var ex = findNote(o.id), inPile = donePile.findIndex(function(x){ return x.id === o.id; });
        if(isDoneItem(o)){                                          // finished on another device: it belongs in the pile
          pileRelease(o.id, false);                                  // ...and it leaves any pile it was in (the pile shrinks, nothing else is touched)
          if(ex){ if(ex.el) ex.el.remove(); notes.splice(notes.indexOf(ex), 1); selected.delete(ex.id); clearDecorations(ex.id); }
          if(inPile !== -1) donePile[inPile] = o; else donePile.push(o);
          return;
        }
        if(inPile !== -1) donePile.splice(inPile, 1);               // put back on another device: fall through and draw it
        if(ex){
          var keepImg = ex.image, was = ex.assetId || ex.attachedAssetId;
          Object.keys(ex).forEach(function(k){ if(["el","textEl","captionEl","badgeEl"].indexOf(k) === -1) delete ex[k]; });
          Object.assign(ex, o);
          if(keepImg && (ex.assetId || ex.attachedAssetId) === was) ex.image = keepImg;   // same picture: keep what is already loaded
          rerenderNote(ex);
        } else {
          zCounter = Math.max(zCounter, o.z || 0);
          notes.push(o);
          try{ renderNote(o, false, {focus:false}); }catch(err){ try{ console.warn("Stick-It: one object could not be drawn:", o && o.id, err); }catch(e2){} }
        }
      });
      syncPileVisibility();
      ensureWidth(); updateCount(); updateMinimap(); applySelection(); updateDonePile(false);
      if(searchInput.value.trim()) runSearch();
      saveNotesCache();
    },
    patch: function(id, fields){ var n = findNote(id); if(!n) return; Object.assign(n, fields); if(fields.mediaState && n.el && isAV(n)) rerenderNote(n); saveNotes(); },
    setRuntime: function(id, fields){ var n = findNote(id); if(!n) return; Object.assign(n, fields); if(n.el) rerenderNote(n); },
    // both people edited the same note: the server copy stays, this device's words are kept as a copy beside it
    addConflictCopy: function(o){
      var c = normalizeIncoming(o, {allowAssets:true}); if(!c) return;
      c.x = o.x + 30; c.y = clampY(o.y + 30); zCounter += 1; c.z = zCounter;
      notes.push(c); renderNote(c, true, {focus:false}); saveNotes();
      toast("Someone else changed a note at the same time. Your version is kept as a copy next to it.");
    },
    mediaBlob: function(mediaId){ return MediaStore.blob(mediaId).catch(function(){ return null; }); },
    toast: function(m){ toast(m); },
    onAuthLost: function(){ authLost = true; updateSyncPill("problem", "Please sign in again."); }
  };
  function setupCloudSync(){
    cloudSync = Stick.createSync({
      host: cloudHost, storage: localStorage,
      keys: {
        sync: function(id){ return "stickyboard." + NS + "sync." + id; },
        meta: function(){ return "stickyboard." + NS + "sync.meta"; },
        notes: notesKeyFor, boards: function(){ return BOARDS_KEY; }, cover: coverKey
      }
    });
    cloudSync.onStatus(updateSyncPill);
    return cloudSync;
  }

  function rememberAccount(user, profile){
    if(profile && profile.age_band) ageKnownSet(profile.age_band);
    var meta = (user && user.user_metadata) || {};
    var prev = settings.account || {};
    settings.account = {
      name: (profile && profile.display_name) || meta.full_name || meta.name || meta.user_name || getAnonName(),      // never the part of the e-mail before the @: it could be a real name and would end up on share links
      email: user.email, sub: user.id, cloud: true,
      picture: (profile && profile.avatar_url) || meta.avatar_url || meta.picture || "",
      providerUrl: (profile && profile.avatar_url) || meta.avatar_url || meta.picture || "",
      plan: (profile && profile.plan) || "free",
      prof: profile ? {avatarSource: profile.avatar_source, avatarAssetId: profile.avatar_asset_id, avatarStyle: profile.avatar_style,
                       avatarColor: profile.avatar_color, avatarEmoji: profile.avatar_emoji,
                       ageBand: profile.age_band || null, consent: profile.parental_consent_status || null} : prev.prof
    };
    settings.guestConfirmed = false;
    saveSettings();
    updateAccountIcon();
  }
  // server truth -> what this device shows and uses (also the offline mirror)
  function applyAccountData(res){
    if(!res || !res.profile || !settings.account) return;
    rememberAccount(Stick.auth.user() || {id: settings.account.sub, email: settings.account.email}, res.profile);
    settings.accountPrefs = res.settings;
    saveSettings();
    updateCollabButton();
    if(typeof adoptAccountShortcuts === "function") { adoptAccountShortcuts(res.settings && res.settings.uiPrefs); if(typeof adoptAccountPatchTour === "function") adoptAccountPatchTour(res.settings && res.settings.uiPrefs); }
  }
  function refreshAccountData(){
    if(!CLOUD || !window.Stick || !Stick.auth.user()) return Promise.resolve();
    return Stick.account.load().then(applyAccountData, function(){});
  }

  function beginProviderSignIn(provider){
    if(!ageFlag() && !ageKnown()){ pendingAuth = provider; renderAccountModal("age"); return; }     // never contact a provider before the age step is resolved
    startProviderSignIn(provider);
  }
  function startProviderSignIn(provider){
    cloudOverlay("Opening " + providerName(provider) + "\u2026");
    Stick.auth.signInWithProvider(provider).catch(function(e){
      stickLoaderFail("Couldn\u2019t start sign-in with " + providerName(provider) + ". " + Stick.errors.friendly(Stick.errors.parse(e)), function(){ startProviderSignIn(provider); });
    });
  }
  function beginGoogleSignIn(){ beginProviderSignIn("google"); }
  function wipeCloudCache(uid){
    var prefix = "stickyboard.cloud." + uid + ".";
    Object.keys(localStorage).forEach(function(k){ if(k.indexOf(prefix) === 0) localStorage.removeItem(k); });
  }
  async function cloudSignOut(scope){
    scope = scope === "global" ? "global" : "local";
    flushTypingNotify();
    if(cloudSync && cloudSync.hasPending()){
      var go = await confirmDialog({title:"Sign out with unsynced changes?", body:"Some recent changes haven't reached your account yet. Signing out on this device will lose them.", confirm:"Sign out anyway", danger:true});
      if(!go) return;
    } else if(cloudSync){ try{ await cloudSync.flush(); }catch(e){} }
    cloudSigningOut = true;
    var uid = Stick.mode.uid;
    try{ await Stick.auth.signOut(scope); }catch(e){}
    if(uid) wipeCloudCache(uid);                  // a shared computer keeps nothing of your account afterwards
    try{ await Stick.assets.cacheClear(); }catch(e){}
    settings.account = null; settings.accountPrefs = null; saveSettings();
    location.hash = ""; location.reload();
  }

  // ---- guest -> account: "Bring your current board with you?" ---------------------
  function planRoom(profile, existing){
    var plan = (profile && profile.plan) || (settings.account && settings.account.plan) || "free";
    var lim = ((Stick.config.PLAN_LIMITS || {})[plan] || {}).boards || 0;
    var me = (Stick.auth.user() || {}).id;
    var owned = existing.filter(function(b){ return b.owner_id === me || b.role === "owner"; }).length;
    return {plan: plan, limit: lim, room: Math.max(0, lim - owned)};
  }
  // Resolves true when the person chose to import (whatever the outcome), false when they declined.
  // Nothing on this device is ever deleted unless they explicitly ask for that after everything arrived.
  function offerMigration(local, existing, profile){
    return new Promise(function(resolve){
      var cap = planRoom(profile, existing);
      var content = document.createElement("div");
      var lead = document.createElement("p");
      lead.className = "acctSub"; lead.style.margin = "0 0 6px";
      lead.textContent = existing.length
        ? "This account already has " + existing.length + (existing.length === 1 ? " board" : " boards") + ". Importing adds your local board as another one; nothing is merged or replaced."
        : "You made this board before signing in. Bring it into your account and it will follow you to your other devices.";
      content.appendChild(lead);
      var listEl = makeDiv("migList");
      var boxes = [];
      local.forEach(function(lb, i){
        var row = document.createElement("label"); row.className = "migRow";
        var cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = i < cap.room; cb.value = lb.id;
        var t = makeDiv("t");
        var bits = [lb.objects + (lb.objects === 1 ? " item" : " items")];
        if(lb.images) bits.push(lb.images + (lb.images === 1 ? " photo" : " photos"));
        if(lb.media) bits.push(lb.media + " recording/video" + (lb.media === 1 ? "" : "s"));
        t.innerHTML = "<span></span><small></small>";
        t.firstChild.textContent = lb.name + (lb.subtitle ? " \u00b7 " + lb.subtitle : "");
        t.lastChild.textContent = bits.join(" \u00b7 ");
        row.appendChild(cb); row.appendChild(t); listEl.appendChild(row); boxes.push(cb);
      });
      content.appendChild(listEl);
      var note = makeDiv("noteBox"); note.style.marginTop = "10px";
      content.appendChild(note);
      function chosen(){ return boxes.filter(function(b){ return b.checked; }).map(function(b){ return b.value; }); }
      function refresh(){
        var n = chosen().length;
        note.textContent = cap.room === 0
          ? "Your " + cap.plan + " plan has no room for another board (" + cap.limit + " allowed). Your local board stays on this device, untouched."
          : n > cap.room ? "Your " + cap.plan + " plan has room for " + cap.room + " more board" + (cap.room === 1 ? "" : "s") + ". Pick fewer, or the extra ones stay on this device."
          : "Your " + cap.plan + " plan has room for " + cap.room + " more board" + (cap.room === 1 ? "" : "s") + ". Whatever you don't import stays on this device.";
        var go = m && m.card.querySelector("#migGo");
        if(go) go.setAttribute("aria-disabled", String(n === 0 || n > cap.room));
      }
      boxes.forEach(function(b){ b.addEventListener("change", refresh); });
      var settled = false;
      function finish(v){ if(!settled){ settled = true; resolve(v); } }
      var m = openModal({
        title: existing.length ? "Import your local board into this account?" : "Bring your current board with you?",
        content: content, width: 440,
        actions: cap.room === 0
          ? [{label:"OK", kind:"primary", value:false}]
          : [{label:"Not now", value:false}, {label:"Bring it with me", kind:"primary", id:"migGo", onClick:function(close){
              var ids = chosen();
              if(!ids.length || ids.length > cap.room) return false;
              runMigrationInModal(m, ids, close, finish);
              return false;
            }}],
        onClose: function(v){ finish(v === true); }
      });
      refresh();
    });
  }
  async function runMigrationInModal(m, ids, close, finish){
    var card = m.card;
    var actions = card.querySelector(".modalActions"); if(actions) actions.remove();
    var closeX = card.querySelector(".acctClose"); if(closeX) closeX.style.display = "none";
    var body = card.lastElementChild;
    var title = card.querySelector("h3");
    title.textContent = "Bringing your board over\u2026";
    body.innerHTML = '<div class="migProgress"><i></i></div><p class="acctSub" id="migLabel" style="margin:0">Starting\u2026</p><p class="acctSub" style="margin:8px 0 0;font-size:0.72rem">Keep this page open. Nothing on this device is changed.</p>';
    var bar = body.querySelector(".migProgress i"), label = body.querySelector("#migLabel");
    var res = await Stick.migrate.run({
      store: localStorage, boardIds: ids,
      mediaBlob: function(id){ return MediaStore.blob(id).catch(function(){ return null; }); },
      onProgress: function(p){
        var pct = p.total ? Math.round(100 * (p.done || 0) / p.total) : 8;
        bar.style.width = Math.max(6, Math.min(100, pct)) + "%";
        label.textContent = (p.board ? "\u201c" + p.board + "\u201d: " : "") + (p.label || (p.phase === "verify" ? "Checking everything arrived\u2026" : "Working\u2026"));
      }
    });
    bar.style.width = "100%";
    var good = res.boards.filter(function(b){ return b.verified; });
    if(good.length && !migratedCloudId) migratedCloudId = good[0].cloudId;
    var missingMedia = res.boards.reduce(function(a, b){ return a + b.mediaMissing; }, 0);
    var failed = res.boards.filter(function(b){ return !b.verified; });
    var limitHit = failed.some(function(b){ return b.error && b.error.code === "BOARD_LIMIT_REACHED"; });
    title.textContent = failed.length ? "Almost there" : "Your board is in your account";
    var lines = [];
    good.forEach(function(b){ lines.push("\u2713 \u201c" + b.name + "\u201d: " + b.migrated + " new" + (b.existing ? ", " + b.existing + " already there" : "") + " item" + ((b.migrated + b.existing) === 1 ? "" : "s")); });
    failed.forEach(function(b){
      var msg = b.error && b.error.code ? (b.error.code === "BOARD_LIMIT_REACHED" ? "your plan has no room for it" : Stick.errors.friendly(b.error)) : (b.error || "it didn't finish");
      lines.push("\u2717 \u201c" + b.name + "\u201d: " + msg);
    });
    body.innerHTML = "";
    var ul = document.createElement("p"); ul.className = "acctSub"; ul.style.cssText = "margin:0;text-align:left;line-height:1.7;white-space:pre-line";
    ul.textContent = lines.join("\n"); body.appendChild(ul);
    if(missingMedia){
      var mm = makeDiv("noteBox"); mm.style.marginTop = "10px";
      mm.textContent = "Some media wasn\u2019t available on this device (" + missingMedia + "), so those items came across without their recording or video.";
      body.appendChild(mm);
    }
    var row = makeDiv("modalActions");
    body.appendChild(row);
    function btn(label, kind, fn){ var b = document.createElement("button"); b.className = "pillBtn" + (kind ? " " + kind : ""); b.textContent = label; b.addEventListener("click", fn); row.appendChild(b); return b; }
    if(failed.length && !limitHit) btn("Try again", null, function(){ close(true); finish(true); setTimeout(function(){ startManualImport(); }, 50); });
    if(good.length){
      var note2 = makeDiv("noteBox"); note2.style.marginTop = "10px";
      note2.textContent = "Everything above was checked on the server. Keep a copy on this device, or remove it now that it's safe in your account?";
      body.insertBefore(note2, row);
      btn("Keep a copy here", null, function(){ close(true); finish(true); });
      btn("Remove from this device", "danger", function(){ Stick.migrate.removeLocal(localStorage, good.map(function(b){ return b.localId; })); toast("Removed from this device. It's in your account."); close(true); finish(true); });
    } else {
      btn("Continue", "primary", function(){ close(true); finish(true); });
    }
  }
  // from the account menu, any time later
  // auto=true: offered by itself after sign-in (once; "Not now" is remembered). Otherwise the person asked for it.
  async function startManualImport(auto){
    try{
      var local = Stick.migrate.inspectLocal(localStorage);
      if(!local.length){ if(auto !== true) toast("There's nothing saved on this device to import."); return; }
      var existing = await Stick.repo.listBoards();
      var profile = await Stick.auth.profile();
      var ran = await offerMigration(local, existing, profile);
      if(auto === true && !ran && Stick.mode.uid) safeSet("stickit.migration.declined." + Stick.mode.uid, true);
      if(ran && migratedCloudId){
        cloudOverlay("Opening your board\u2026");
        await cloudSync.refreshBoards();
        await cloudSync.fillBoardCache(migratedCloudId);
        safeSet(ACTIVE_BOARD_KEY, migratedCloudId);
        location.hash = ""; location.reload();
      }
    }catch(e){ hideCloudOverlay(); toast(Stick.errors.friendly(Stick.errors.parse(e))); }
  }

  // ---- first time this account is opened on this device -------------------
  async function firstCloudLoad(user, profile){
    cloudOverlay("Setting up your account\u2026", true);
    var existing = await Stick.repo.listBoards();
    var local = Stick.migrate.inspectLocal(localStorage);
    var declinedKey = "stickit.migration.declined." + user.id;
    if(local.length && !safeGet(declinedKey)){
      hideCloudOverlay();
      var ran = await offerMigration(local, existing, profile);
      cloudOverlay("Setting up your account\u2026", true);
      if(!ran) safeSet(declinedKey, true);
      existing = await Stick.repo.listBoards();
    }
    if(!existing.length) await Stick.repo.createBoard("My Board");     // a brand-new account starts with one empty board
    var list = await cloudSync.refreshBoards();
    var owned = list.filter(function(b){ return b.access === "owner"; });
    var pick = (migratedCloudId && list.some(function(b){ return b.id === migratedCloudId; })) ? migratedCloudId : (owned[0] || list[0]).id;
    await cloudSync.fillBoardCache(pick);
    safeSet(ACTIVE_BOARD_KEY, pick);
    location.hash = ""; location.reload();
  }
  async function fillBoardAndReload(id){
    cloudOverlay("Loading your board\u2026");
    await cloudSync.fillBoardCache(id);
    location.reload();
  }
  // keep the list of boards (names, covers, who shared what) current; a change of access needs a fresh page
  async function refreshBoardsQuietly(){
    try{
      var list = await cloudSync.refreshBoards();
      var cur = list.filter(function(b){ return b.id === activeBoardId; })[0];
      var mine = boards.filter(function(b){ return b.id === activeBoardId; })[0];
      if(!cur){
        toast("That board isn't available to you any more.");
        var alt = list[0];
        if(alt){ if(!safeGet(notesKeyFor(alt.id))) await cloudSync.fillBoardCache(alt.id); safeSet(ACTIVE_BOARD_KEY, alt.id); }
        location.reload(); return;
      }
      if(mine && (cur.access !== mine.access || !!cur.locked !== !!mine.locked)){ location.reload(); return; }
      boards = list; updateBoardLabel();
      if(!boardPanel.hidden) renderBoardList();
    }catch(e){ /* offline: the cached list stays */ }
  }

  // ---- collaboration (presence, comments, review): only for a cloud board, never for guests
  function startCollab(){
    if(!(window.Stick && Stick.collab) || !CLOUD || !activeBoardId || singleNoteMode) return;
    var meta = boards.filter(function(b){ return b.id === activeBoardId; })[0] || {}, role = meta.access || "owner";
    var user = Stick.auth.user() || {}, dev = window.Stick && Stick.dev && localStorage.getItem("stickit.dev.presence") === "bc";
    Stick.collab.start({
      boardId: activeBoardId, role: role, canComment: role === "owner" || role === "editor", transport: dev ? "broadcast" : undefined,
      me: {uid: user.id || "", name: (settings.account && settings.account.name) || getDisplayName()},
      host: {
        refresh: function(){ notes.forEach(function(n){ if(n.el) Stick.collab.decorate(n, n.el); }); },
        openPopover: function(anchor){
          closeFloatingPopovers(); var r = anchor.getBoundingClientRect(), pop = openFloatingPopoverAt(r, "cmtPop", anchor), below = window.innerHeight - r.bottom;
          if(below >= 250){ pop.style.bottom = "auto"; pop.style.top = (r.bottom + 6) + "px"; pop.style.maxHeight = Math.max(160, below - 16) + "px"; }     // the slip hangs under its tab, not over the object
          return pop;
        },
        modal: function(o){ return openModal(o); },
        // your own comments show your own picture; other people show their initial (their pictures are not shared with the board)
        paintAvatar: function(elm, uid){ var me = Stick.auth.user(); if(me && uid === me.id && settings.account){ paintAvatar(elm, accountAvatarSpec()); return true; } return false; }
      }
    });
    document.getElementById("presenceBar").setAttribute("aria-label", "People on this board");
  }
  async function startCloud(){
    setupCloudSync();
    if(viewerMode) cloudSync.setReadOnly(true);
    var session = null;
    try{ session = await Stick.auth.init(); }catch(e){ session = null; }
    Stick.auth.onChange(function(ev){
      if(ev === "SIGNED_OUT" && !cloudSigningOut){ authLost = true; updateSyncPill("problem", "Please sign in again."); }
      if(ev === "SIGNED_IN" || ev === "TOKEN_REFRESHED"){ if(authLost && cloudSync){ authLost = false; updateSyncPill("saving"); cloudSync.retryAll(); } }
    });
    if(!session && !viewerMode){
      try{ if(sessionStorage.getItem(INVITE_KEY)){ toast("Sign in to accept your invitation."); setTimeout(function(){ try{ openAccountModal(); }catch(e){} }, 600); } }catch(e){}
    }
    if(!session){
      // can't prove who we are right now (offline, or the login expired): work from the cache; edits stay queued
      authLost = !navigator.onLine ? false : true;
      if(activeBoardId && !needsCloudBootstrap && !needsBoardFill) cloudSync.attach(activeBoardId);
      updateSyncPill(authLost ? "problem" : "offline", authLost ? "Please sign in again." : "");
      if(needsCloudBootstrap){ cloudOverlay("Please sign in again to load your boards.", true); }
      return;
    }
    var profile = null;
    try{ profile = await Stick.auth.profile(); }catch(e){}
    if(profile && !(await ensureAgeAttested(profile))) return;      // nothing else loads until the age screen has been passed
    rememberAccount(session.user, profile);
    refreshAccountData();                               // preferences + photo; the mirror in settings covers offline
    var lastAcctRefresh = Date.now();
    document.addEventListener("visibilitychange", function(){
      if(document.visibilityState === "visible" && Date.now() - lastAcctRefresh > 120000){ lastAcctRefresh = Date.now(); refreshAccountData(); }
    });
    try{
      if(needsCloudBootstrap){ await firstCloudLoad(session.user, profile); return; }
      if(needsBoardFill){ await fillBoardAndReload(activeBoardId); return; }
    }catch(e){
      hideCloudOverlay();
      var er = Stick.errors.parse(e);
      toast(er.offline ? "You're offline. Connect to load your boards." : Stick.errors.friendly(er));
      return;
    }
    if(await maybeAcceptInvite()) return;
    cloudSync.attach(activeBoardId);
    updateSyncPill("saved");
    watchPhotoLoading(); await cloudSync.start(); watchPhotoLoading();
    startCollab();
    refreshBoardsQuietly();
    // Boards made as a guest on this device that were never imported (signed in again later, or the first offer
    // was skipped by a reload): ask once, and always keep the manual route in Account settings.
    try{
      if(!viewerMode && Stick.migrate.inspectLocal(localStorage).length && !safeGet("stickit.migration.declined." + session.user.id)){
        setTimeout(function(){ startManualImport(true); }, 900);
      }
    }catch(e){}
  }

  // ---- coming back from Google -------------------------------------------
  function finishSignIn(){
    cloudOverlay("Signing you in\u2026", true);
    Stick.auth.init().then(function(session){
      try{ history.replaceState(null, "", location.pathname); }catch(e){}
      if(!session){ hideCloudOverlay(); toast("Sign-in didn't complete. You're still browsing as a guest."); return; }
      stickLoaderDone("Signed in.", function(){ location.reload(); });          // boots again as this account
    }, function(){ hideCloudOverlay(); toast("Couldn't finish signing in."); });
  }

  // ---------- Collaborate (Premium): invite people to your board ----------
  // The button exists only for a signed-in Premium owner of the board they are looking at; for everyone else it stays hidden (not greyed out).
  // An invite is a link that works once, for 7 days, for one chosen person (by e-mail) or anyone who holds it. People accepting an invite do not
  // need Premium. The server checks who may create and accept invites; this only decides what to show.
  var collabBtn = document.getElementById("collabBtn");
  function canShowCollab(){
    if(!CLOUD || readOnly || viewerMode || singleNoteMode || !activeBoardId) return false;
    if(!(window.Stick && Stick.auth && Stick.auth.user && Stick.auth.user())) return false;
    if(!isPremium()) return false;
    var meta = boards.filter(function(b){ return b.id === activeBoardId; })[0] || {};
    return !meta.access || meta.access === "owner";
  }
  function updateCollabButton(){ if(collabBtn) collabBtn.hidden = !canShowCollab(); }
  function inviteLink(token){ return location.origin + location.pathname + "#invite=" + token; }
  function openCollabDialog(){
    if(!canShowCollab()){ updateCollabButton(); return; }
    var meta = boards.filter(function(b){ return b.id === activeBoardId; })[0] || {};
    var wrap = makeDiv("collabDlg");
    wrap.innerHTML = '<p class="acctSub" style="margin:0 0 10px;">Invite someone to work on this board with you. Each link works once and expires after 7 days.</p>' +
      '<label class="asLbl" for="cbRole">They can</label>' +
      '<select id="cbRole" class="asIn"><option value="editor">Add, move and edit notes</option><option value="viewer">Look, but not change anything</option></select>' +
      '<label class="asLbl" for="cbEmail">Their e-mail (optional)</label>' +
      '<input id="cbEmail" class="asIn" type="email" autocomplete="off" maxlength="254" placeholder="Leave empty to let anyone with the link join">' +
      '<p class="asHint" id="cbHint">With an e-mail, only that account can use the link.</p>' +
      '<div id="cbOut" class="collabOut" role="status" aria-live="polite"></div>';
    openModal({title: "Collaborate on “" + (meta.name || "this board") + "”", content: wrap, width: 420, actions: [
      {label: "Close", value: false},
      {label: "Create invite link", kind: "primary", id: "cbCreate", onClick: function(close, btn){
        var email = wrap.querySelector("#cbEmail").value.trim(), role = wrap.querySelector("#cbRole").value, out = wrap.querySelector("#cbOut");
        if(email && !validEmail(email)){ out.textContent = "That e-mail doesn’t look right."; return false; }
        setBusy(btn, true, "Creating…");
        Stick.repo.createInvite(activeBoardId, email, role).then(function(r){
          setBusy(btn, false);
          var url = inviteLink(r.token);
          out.innerHTML = "";
          var inp = document.createElement("input"); inp.className = "asIn"; inp.readOnly = true; inp.value = url; inp.setAttribute("aria-label", "Invite link");
          var copy = document.createElement("button"); copy.type = "button"; copy.className = "pillBtn"; copy.textContent = "Copy link";
          copy.addEventListener("click", function(){ copyText(url).then(function(ok){ flashCopied(copy, ok ? "Copied!" : "Select and copy"); }); });
          var note = document.createElement("p"); note.className = "asHint"; note.textContent = (role === "viewer" ? "Viewer" : "Editor") + " link" + (email ? " for " + email : "") + ". Send it only to the person you mean.";
          out.appendChild(inp); out.appendChild(copy); out.appendChild(note);
          inp.focus(); inp.select();
        }, function(e){ setBusy(btn, false); out.textContent = Stick.errors.friendly(Stick.errors.parse(e)); });
        return false;
      }}
    ]});
  }
  if(collabBtn) collabBtn.addEventListener("click", function(){ sharePanel.hidden = true; openCollabDialog(); });
  // opening someone's invite link (#invite=...): join once signed in; a signed-out visitor signs in first and is brought back to it
  var INVITE_KEY = "stickit.pendingInvite";
  function inviteTokenFromHash(){ var m = /^#invite=([a-f0-9]{64})$/i.exec(location.hash || ""); return m ? m[1].toLowerCase() : null; }
  function rememberInviteFromHash(){
    var t = inviteTokenFromHash();
    if(t){ try{ sessionStorage.setItem(INVITE_KEY, t); }catch(e){} try{ history.replaceState(null, "", location.pathname + location.search); }catch(e){} }
  }
  async function maybeAcceptInvite(){
    var t = null; try{ t = sessionStorage.getItem(INVITE_KEY); }catch(e){}
    if(!t || !/^[a-f0-9]{64}$/.test(t)) return false;
    try{ sessionStorage.removeItem(INVITE_KEY); }catch(e){}
    cloudOverlay("Joining the board…");
    try{
      var boardId = await Stick.repo.acceptInvite(t);
      if(boardId){
        await cloudSync.fillBoardCache(boardId);
        safeSet(ACTIVE_BOARD_KEY, boardId);
        stickLoaderDone("You’re in.", function(){ location.reload(); });
        return true;
      }
    }catch(e){
      var er = Stick.errors.parse(e), msg = String(er && er.message || "");
      hideCloudOverlay();
      toast(/INVITE_EXPIRED/.test(msg) ? "That invitation has expired. Ask for a new one."
        : /INVITE_USED/.test(msg) ? "That invitation was already used."
        : /EMAIL_MISMATCH/.test(msg) ? "That invitation was made for a different e-mail address."
        : /INVITE_NOT_FOUND/.test(msg) ? "We couldn’t find that invitation."
        : Stick.errors.friendly(er));
    }
    return false;
  }
  rememberInviteFromHash();

  // ---------- What's New / patch tour ----------
  // The words come from docs/patch-notes/patch-notes.json (through js/patch-data.js), so the app, the website and the Markdown notes tell the same
  // story. tourMode: "full" = a short walk-through with real targets, "summary" = one card of highlights, "none" = never offered.
  // Nothing here runs for someone using Stick-It for the first time (they get the normal tutorial) or on a shared, read-only view.
  var PT_KEY = "stickit.patchTour.v1";
  function ptData(){ var d = window.Stick && Stick.patchData; return d && d.version ? d : null; }
  function ptState(){ var s = safeGet(PT_KEY); return s && typeof s === "object" ? s : {}; }
  function ptMarkSeen(){
    var d = ptData(); if(!d) return;
    safeSet(PT_KEY, {seen: d.version, at: Date.now()});
    if(CLOUD && window.Stick && Stick.auth && Stick.auth.user() && Stick.account && Stick.account.saveUiPrefs){
      var cur = (Stick.account.cached() && Stick.account.cached().settings && Stick.account.cached().settings.uiPrefs) || {}, next = {};
      Object.keys(cur).forEach(function(k){ next[k] = cur[k]; });
      next.patchTour = {seen: d.version};
      Stick.account.saveUiPrefs(next).catch(function(){});
    }
  }
  // signed in on another device and already saw it there: don't ask again here
  function adoptAccountPatchTour(prefs){
    var d = ptData(), remote = prefs && prefs.patchTour && prefs.patchTour.seen;
    if(!d || remote !== d.version) return;
    if(ptState().seen !== d.version) safeSet(PT_KEY, {seen: d.version, at: Date.now()});
    closePatchCard();
  }
  function ptSteps(d){
    return (d.tour || []).map(function(s){ return {sel: s.target || null, title: escapeHtml(s.title || ""), body: escapeHtml(s.body || "")}; });
  }
  function startPatchTour(){
    var d = ptData(); if(!d) return false;
    if(d.tourMode === "full"){
      var steps = ptSteps(d).filter(function(s){ if(!s.sel) return true; var el = document.querySelector(s.sel); if(!el) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
      if(steps.length){ startTour(steps); return true; }
    }
    openWhatsNew(); return true;
  }
  var ptCard = null, ptLayer = OV.layer("patch-card", function(){ ptDismiss(); }, function(){ return !!ptCard; });
  function closePatchCard(){ if(!ptCard) return; ptCard.remove(); ptCard = null; ptLayer.close(); }
  function ptDismiss(){ ptMarkSeen(); closePatchCard(); }
  function patchNotesUrl(d){ return "https://github.com/JohnZach31/stick-it/blob/master/docs/patch-notes/" + encodeURIComponent(d.version) + ".md"; }
  function showPatchCard(d){
    if(ptCard) return;
    var card = makeDiv("ptCard"); card.setAttribute("role", "region"); card.setAttribute("aria-label", "What’s new");
    var h = document.createElement("h4"); h.textContent = "Stick-It updated to v" + d.version + (d.codename ? " · " + d.codename : "");
    var p = document.createElement("p"); p.textContent = d.tldr || "";
    var row = makeDiv("ptBtns");
    function btn(label, cls, fn){ var b = document.createElement("button"); b.type = "button"; b.className = "pillBtn " + cls; b.textContent = label; b.addEventListener("click", fn); row.appendChild(b); return b; }
    var show = btn("Show me", "primary", function(){ ptMarkSeen(); closePatchCard(); startPatchTour(); });
    btn("Not now", "", function(){ ptDismiss(); });
    var a = document.createElement("a"); a.className = "ptLink"; a.href = patchNotesUrl(d); a.target = "_blank"; a.rel = "noopener"; a.textContent = "View patch notes";
    card.appendChild(h); card.appendChild(p); card.appendChild(row); card.appendChild(a);
    document.body.appendChild(card); ptCard = card; ptLayer.open();
    var live = makeDiv("sr-only"); live.setAttribute("role", "status"); live.textContent = "Stick-It was updated. " + (d.tldr || ""); card.appendChild(live);
  }
  function maybeOfferPatchTour(){
    var d = ptData();
    if(!d || d.tourMode === "none" || readOnly || singleNoteMode || tourRoot || focusState) return;
    var st = ptState();
    if(st.seen === d.version) return;
    if(firstRun){ ptMarkSeen(); return; }                     // brand-new people get the normal tutorial, not a list of changes
    showPatchCard(d);
  }
  function openWhatsNew(){
    var d = ptData(); if(!d){ toast("There’s nothing to show yet."); return; }
    var wrap = makeDiv("wnBody");
    var p = document.createElement("p"); p.className = "acctSub"; p.textContent = d.tldr || ""; wrap.appendChild(p);
    if(d.highlights && d.highlights.length){
      var ul = document.createElement("ul"); ul.className = "wnList";
      d.highlights.forEach(function(t){ var li = document.createElement("li"); li.textContent = t; ul.appendChild(li); });
      wrap.appendChild(ul);
    }
    var actions = [{label: "Close", value: true}];
    if(d.tourMode === "full") actions.unshift({label: "Show me around", kind: "primary", onClick: function(close){ close(true); setTimeout(function(){ var steps = ptSteps(d); startTour(steps); }, 0); return false; }});
    var m = openModal({title: "What’s new in v" + d.version + (d.codename ? " · " + d.codename : ""), content: wrap, width: 460, actions: actions});
    var link = document.createElement("a"); link.className = "ptLink"; link.href = patchNotesUrl(d); link.target = "_blank"; link.rel = "noopener"; link.textContent = "Read the full patch notes";
    wrap.appendChild(link);
    ptMarkSeen();
  }
  if(window.Stick && Stick.dev){        // local development only
    Stick.dev.patchTour = {
      replay: function(){ closePatchCard(); startPatchTour(); return "Replaying the patch tour."; },
      reset: function(){ try{ localStorage.removeItem(PT_KEY); }catch(e){} return "Patch tour forgotten on this device. Reload to see the update card again."; },
      offer: function(){ try{ localStorage.removeItem(PT_KEY); }catch(e){} firstRun = false; maybeOfferPatchTour(); return "Offered."; }
    };
  }

  // ---------- boot ----------
  if(singleNoteMode){
    renderPublicView(location.hash);
  } else {
    if(!readOnly && settings.cleanupEmpty){
      notes = notes.filter(function(n){ return noteHasContent(n) || /^seed-/.test(n.id); });
      saveNotes();
    }
    syncNoteMaxHeight();
    ensureWidth();
    rebuildHidden();                                  // which papers are tucked inside a pile: not drawn, still on the board
    var bootT0 = (window.performance && performance.now) ? performance.now() : 0;
    notes.forEach(function(n){ try{ renderNote(n, false); }catch(err){ try{ console.warn("Stick-It: one object could not be drawn:", n && n.id, err); }catch(e2){} } });
    void boardInner.offsetHeight;                // include the browser's layout work, not only creating the elements
    bootRenderMs = (window.performance && performance.now) ? Math.round(performance.now() - bootT0) : 0;
    updateCount();
    applyZoom();
    if(!readOnly) setTimeout(function(){ if(boardInner.clientHeight) recoverVertical(); }, 300);
    updateMinimap();
    syncHighlight("date");

    // a quiet cue while the board is nearly empty
    if(!readOnly && notes.length < 5 && !(!COARSE && safeGet("stickit.rcUsed"))){
      hint.textContent = CREATE_HINT;
      hint.classList.remove("hidden");
      setTimeout(dismissHint, 7000);
    }
  }
  setTimeout(function(){ setLogo("ready"); }, 450);
  if(!singleNoteMode && !readOnly) setTimeout(maybeOfferPatchTour, 2200);

  if(CLOUD_OK && !singleNoteMode && !SHARE_LINK_PAGE){          // a share-link page never starts the account sync
    if(window.Stick.auth.callbackPending) finishSignIn();
    else if(CLOUD) startCloud();
  }
})();
