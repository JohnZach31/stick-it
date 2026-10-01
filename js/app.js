(function(){
  "use strict";

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
  function legalLinksEl(cls){
    var d = document.createElement("div");
    d.className = cls || "legalLinks";
    LEGAL_LINKS.forEach(function(l){
      var a = document.createElement("a"); a.href = l[1]; a.target = "_blank"; a.rel = "noopener"; a.textContent = l[0]; d.appendChild(a);
    });
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

  var settings = safeGet(SETTINGS_KEY) || { lockFont:false, fontName:FONTS[0].name, displayName:"", account:null, guestConfirmed:false, theme:"light" };
  if(settings.displayName === undefined) settings.displayName = "";
  if(settings.account === undefined) settings.account = null;
  if(settings.guestConfirmed === undefined) settings.guestConfirmed = false;
  if(settings.theme === undefined) settings.theme = "light";
  if(settings.cleanupEmpty === undefined) settings.cleanupEmpty = true;
  // With a real backend, the old browser-only "signed in" display state means nothing: only a real session counts.
  if(CLOUD_OK && !CLOUD && settings.account) settings.account = null;
  document.body.classList.toggle("dark", settings.theme === "dark");

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
  }

  // ---------- sanitising anything that arrives from outside (links, imports, pastes) ----------
  var ALLOWED_TAGS = {DIV:1,P:1,BR:1,B:1,STRONG:1,I:1,EM:1,H1:1,H2:1,H3:1,UL:1,OL:1,LI:1,A:1,MARK:1,SPAN:1};
  var DROP_TAGS = /^(SCRIPT|STYLE|IFRAME|FRAME|OBJECT|EMBED|TEMPLATE|SVG|MATH|NOSCRIPT|FORM|INPUT|TEXTAREA|BUTTON|SELECT|LINK|META|IMG|PICTURE|VIDEO|AUDIO|CANVAS|HEAD|TITLE)$/;
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
        if(tag === "SPAN" && /background/i.test(ch.getAttribute("style") || "")){
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
        if(tag === "LI"){ var dc = ch.getAttribute("data-checked"); if(dc === "true" || dc === "false") keep["data-checked"] = dc; }
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
      }
      return o;
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
        w: Math.round(clampNum(item.w, 120, 480, 200)),
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
  var SERIAL_FIELDS = ["id","type","x","y","w","html","bg","font","fontManual","rot","z","categoryIndex","isTask","done","due","dueTime","image","imgW","imgRatio","listHintOff","photoStyle","caption","cutoutKey","cutoutAssetId","cutoutRatio","backing","title","date","body","amount","variant","dateTime","place","details","orient","location","message","recipient","frames","createdAt","mediaId","duration","mime","poster","assetId","attachedAssetId","mediaState","legacyId","phys"];
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
    c.rot = clampNum(c.rot, -12, 12, 0);
    c.z = Math.round(clampNum(c.z, 0, 1e9, 1));
    if(c.font !== undefined && !FONT_BY_NAME[c.font]) c.font = pickFont();
    if(c.bg !== undefined && !safeColor(c.bg)) c.bg = randomColor();
    if(window.Stick && Stick.objects && Stick.objects.isKind(c.type)){
      var sp = Stick.objects.sanitize(c, paperHelpers());
      if(!sp) return null;
      sp.id = c.id; sp.x = c.x; sp.y = c.y; sp.z = c.z; sp.rot = c.rot; sp.phys = c.phys && typeof c.phys === "object" ? c.phys : {};
      if(c.w != null) sp.w = Math.round(clampNum(c.w, Stick.objects.WIDTH[c.type][0], Stick.objects.WIDTH[c.type][1], Stick.objects.defaultW(c)));
      if(c.mediaState !== undefined && ["uploading", "ready", "failed", "missing"].indexOf(c.mediaState) !== -1) sp.mediaState = c.mediaState;
      return sp;
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
        isTask:!!n.isTask, done:!!n.done, due:n.due || "", dueTime:n.dueTime || "",
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

  var readOnly = /^#(sb|s)=/.test(location.hash);   // legacy board link (#sb=) or a new server link (#s=<token>)
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

  var notes = [];
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
      notes = notes.map(cloudSanitize).filter(Boolean);        // cached from the server: never trust it blindly
    } else {
      notes.forEach(function(n){
        if(n.html === undefined) n.html = escapeHtml(n.text || "");
        if(n.categoryIndex === undefined) n.categoryIndex = 0;
      });
    }
  }

  var zCounter = notes.reduce(function(m,n){ return Math.max(m, n.z||0); }, 10);

  function saveNotes(){
    if(readOnly || singleNoteMode || !NOTES_KEY) return;
    safeSet(NOTES_KEY, notes.map(persistForm));
    if(typeof scheduleThumb === "function") scheduleThumb();
    if(cloudSync) cloudSync.notesChanged();
  }
  // write the cache without telling the sync layer (used when the change came from the server)
  function saveNotesCache(){
    if(NOTES_KEY) safeSet(NOTES_KEY, notes.map(persistForm));
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
    if(ZOOM_KEY) safeSet(ZOOM_KEY, boardZoom);
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

  function updateCount(){
    countEl.textContent = notes.length + (notes.length === 1 ? " note" : " notes") + " on this board. You can undo it right after.";
  }

  function getPlainText(el){ return (el.textContent || "").trim(); }

  var openPopover = null, openPopoverTrigger = null;
  function closeFloatingPopovers(){
    if(openPopover) openPopover.remove();
    openPopover = null;
    openPopoverTrigger = null;
  }
  function openFloatingPopover(triggerBtn, className){
    var rect = triggerBtn.getBoundingClientRect();
    if(openPopoverTrigger === triggerBtn){ closeFloatingPopovers(); return null; }
    return openFloatingPopoverAt(rect, className, triggerBtn);
  }
  var POP_WIDTHS = {notePop:230, calPop:250, dateCal:216, kbdPop:270, noteMenu:216, linkPop:260, datePop:250};
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
  var TRACK_FIELDS = ["x","y","w","bg","font","fontManual","rot","phys","categoryIndex","isTask","done","due","dueTime","image","imgW","imgRatio","photoStyle","caption","cutoutKey","cutoutAssetId","cutoutRatio","backing","title","date","body","amount","variant","dateTime","place","details","orient","location","message","recipient","frames"];
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
    renderSelBar();
  }
  function setSelection(ids){
    var prev = Array.from(selected);
    selected = new Set(ids.filter(function(id){ return !!findNote(id); }));
    applySelection();
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
    function kind(n){ return n.type === "audio" ? "recording" : n.type === "video" ? "video" : isPhoto(n) ? "photo" : isPaper(n) ? Stick.objects.LABELS[n.type] : "note"; }
    var kinds = list.map(kind);
    if(list.length === 1) return kinds[0];
    return kinds.every(function(k){ return k === kinds[0]; }) ? kinds[0] + "s" : "items";
  }
  function noteHasContent(n){
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
    Array.prototype.forEach.call(target.children, function(li){
      if(kind === "check"){ if(li.getAttribute("data-checked") !== "true") li.setAttribute("data-checked", "false"); }
      else li.removeAttribute("data-checked");
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
      var mode = style === "mounted" ? "mounted" : "sticker", backing = mode === "mounted" ? (n.backing || "cardboard") : "";
      var ck = src + "|" + mode + "|" + backing, hit = comps[ck];
      if(hit && hit.url) return hit;
      if(hit === "fail") return null;
      if(!hit){
        comps[ck] = "pending";
        Stick.sticker.compose(src, {mode: mode, material: backing, seed: hashStr(String(n.id) + (n.cutoutKey || n.cutoutAssetId || ""))}).then(function(r){
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
    ICONS: ICONS, toast: function(m){ toast(m); }, confirm: function(o){ return confirmDialog(o); }, trapTab: function(e, b, c){ trapTab(e, b, c); },
    loader: {show: function(t){ cloudOverlay(t); }, hide: function(){ hideCloudOverlay(); }, done: function(t, after){ stickLoaderDone(t, after); }, fail: function(t, retry){ stickLoaderFail(t, retry); }}
  };
  async function copyCutoutBlob(fromKey, toKey){
    try{ var b = await MediaStore.blob(fromKey); if(b){ await MediaStore.put(toKey, b); } }catch(e){}
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
    if(shownSrc) img.src = shownSrc; else frame.classList.add("pending");
    frame.appendChild(img);
    var cap = makeDiv("pCaption" + (item.caption ? "" : " empty"));
    cap.dir = "auto";
    cap.textContent = item.caption || "";
    cap.style.fontFamily = fontStack(item.font);
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
    pop.appendChild(menuItem(ICONS.scissors, hasRealCutout(n) ? "Redo cutout\u2026" : "Make cutout\u2026", function(){ closeFloatingPopovers(); startCutout(n, n.photoStyle); }));
    if(hasRealCutout(n)) pop.appendChild(menuItem(ICONS.close, "Remove cutout", function(){ closeFloatingPopovers(); removeCutout(n); }));
    if(hasRealCutout(n) && n.photoStyle === "mounted"){
      var bh = makeDiv("menuHint"); bh.textContent = "Backing"; pop.appendChild(bh);
      BACKINGS.forEach(function(bk){
        pop.appendChild(menuItem(bk === (n.backing || "cardboard") ? ICONS.tick : '<svg viewBox="0 0 24 24"></svg>', Stick.sticker.materialName(bk), function(){ closeFloatingPopovers(); setBacking(n, bk); }));
      });
    }
    pop.appendChild(makeDiv("menuSep"));
    pop.appendChild(menuItem(ICONS.pencil, n.caption ? "Edit caption" : "Add caption", function(){ closeFloatingPopovers(); editCaption(n); }));
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
  var MAX_STORED_VIDEO = 60 * 1024 * 1024;
  function fmtDur(sec){
    sec = Math.max(0, Math.round(sec || 0));
    return Math.floor(sec / 60) + ":" + pad2(sec % 60);
  }
  function objSize(n){
    if(isPhoto(n)) return photoFrameSize(n);
    if(isPaper(n)) return paperSize(n);
    if(n.el && n.el.offsetWidth) return {w:n.el.offsetWidth, h:n.el.offsetHeight};
    if(n.type === "audio") return {w:236, h:66};
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
    cap.style.fontFamily = fontStack(item.font);
    var play = document.createElement("button");
    play.innerHTML = ICONS.play;
    play.setAttribute("aria-label", "Play");
    if(item.type === "audio"){
      el = makeDiv("boardObj memoObj");
      el.appendChild(makeDiv("mTape"));
      play.className = "mPlay";
      el.appendChild(play);
      var body = makeDiv("mBody");
      body.appendChild(cap);
      var wave = document.createElement("div");
      wave.innerHTML = waveSvg(item.mediaId || item.id);
      body.appendChild(wave.firstChild);
      el.appendChild(body);
      var tm = makeDiv("mTime"); tm.textContent = fmtDur(item.duration);
      el.appendChild(tm);
    } else {
      el = makeDiv("boardObj filmObj");
      el.style.setProperty("--pw", (item.w || 200) + "px");
      var strip = makeDiv("fStrip"), frame = makeDiv("fFrame");
      frame.style.setProperty("--ar", "1 / " + (item.imgRatio || 0.5625));
      if(item.poster){ var im = document.createElement("img"); im.alt = ""; im.draggable = false; im.src = item.poster; frame.appendChild(im); }
      play.className = "fPlay";
      frame.appendChild(play);
      if(item.duration){ var ft = makeDiv("fTime"); ft.textContent = fmtDur(item.duration); frame.appendChild(ft); }
      strip.appendChild(frame);
      el.appendChild(strip);
      el.appendChild(cap);
    }
    el.style.setProperty("--rot", (item.rot || 0) + "deg");
    return {el:el, cap:cap, play:play};
  }
  var playing = null; // {n, audio}
  function stopMediaFor(n){
    if(playing && playing.n.id === n.id){ playing.audio.pause(); playing = null; }
  }
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
  function playAV(n, btn){
    mediaUrlFor(n).then(function(u){
      if(!u){
        markMissing(n);
        toast(n.mediaState === "uploading" ? "This is still uploading from another device."
          : "This " + (n.type === "audio" ? "recording" : "video") + " isn't available here.");
        if(n.mediaState === "failed" && cloudSync) cloudSync.retryAll();
        return;
      }
      if(n.type === "video"){ openVideoModal(n, u); return; }
      if(playing && playing.n.id === n.id){
        if(playing.audio.paused){ playing.audio.play(); btn.innerHTML = ICONS.pause; }
        else { playing.audio.pause(); btn.innerHTML = ICONS.play; }
        return;
      }
      if(playing){ playing.audio.pause(); var ob = playing.n.el && playing.n.el.querySelector(".mPlay"); if(ob) ob.innerHTML = ICONS.play; }
      var a = new Audio(u);
      playing = {n:n, audio:a};
      a.addEventListener("ended", function(){ btn.innerHTML = ICONS.play; if(playing && playing.audio === a) playing = null; });
      a.play().then(function(){ btn.innerHTML = ICONS.pause; }).catch(function(){ toast("Couldn't play this recording here."); });
    });
  }
  function openVideoModal(n, url){
    var content = makeDiv("videoModal");
    var v = document.createElement("video");
    v.src = url; v.controls = true; v.playsInline = true; v.autoplay = true;
    content.appendChild(v);
    openModal({title:n.caption || "Video", content:content, width:560, onClose:function(){ v.pause(); }});
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
    if(!readOnly){
      var more = document.createElement("button");
      more.className = "pCtl pMore"; more.innerHTML = ICONS.more; more.title = "Options"; more.setAttribute("aria-label", "Options");
      more.addEventListener("pointerdown", function(e){ e.stopPropagation(); });
      more.addEventListener("click", function(e){ e.stopPropagation(); openAVMenu(n, more); });
      el.appendChild(more);
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
    pop.appendChild(menuItem(ICONS.pencil, n.caption ? "Rename" : "Add a label", function(){ closeFloatingPopovers(); editCaption(n); }));
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
  function paperHelpers(){ return {safeImage: safeImage, fontOk: function(f){ return !!FONT_BY_NAME[f]; }}; }
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
      if(item.image){ var im = document.createElement("img"); im.src = item.image; im.alt = item.location ? "Postcard picture: " + item.location : "Postcard picture"; im.draggable = false; pic.appendChild(im); }
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
        if(src){ var im2 = document.createElement("img"); im2.src = src; im2.alt = f.cap || "Strip picture " + (i + 1) + " of " + item.frames.length; im2.draggable = false; fr.appendChild(im2); }
        else fr.classList.add("pending");
        frames.appendChild(fr);
      });
      sheet.appendChild(frames);
      sheet.appendChild(paperField("poCaption", "caption", item, true));
    }
    return api;
  }
  function buildStaticPaper(item){ var b = buildPaperEl(item); b.el.classList.add("static"); b.el.removeAttribute("tabindex"); return b.el; }

  // ---- placing it on the board, with the same drag / select / group behaviour as every other object
  function renderPaper(n, isNew){
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
        if(!group) setSelection([n.id]);
        bringToFront(n, el);
        startDrag(e, n, group ? selectedNotes() : [n]);
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
    if(activePaperEdit) activePaperEdit();
    setSelection([n.id]);
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
    if(photos.length < Stick.objects.STRIP_MIN || photos.length > Stick.objects.STRIP_MAX){ toast("Choose between " + Stick.objects.STRIP_MIN + " and " + Stick.objects.STRIP_MAX + " photos."); return; }
    photos.sort(function(a, b){ return (a.x - b.x) || (a.y - b.y); });          // left to right, then top to bottom
    var cx = photos.reduce(function(s, p){ return s + p.x; }, 0) / photos.length, cy = photos.reduce(function(s, p){ return s + p.y; }, 0) / photos.length;
    var strip = newPaper("photo_strip", cx + 90, cy + 140, {variant: "vertical", frames: stripFramesFromPhotos(photos), font: pickFont()});
    var snapshots = photos.map(snapNote), strip0 = strip;
    var removed = photos.map(function(p){ return p.id; });
    removed.forEach(function(id){ var n = findNote(id); if(n){ removeNoteEl(n, false); notes.splice(notes.indexOf(n), 1); selected.delete(id); clearDecorations(id); } });
    zCounter += 1; strip.z = zCounter; notes.push(strip); renderNote(strip, true, {focus:false});
    ensureWidth(); saveNotes(); updateCount(); updateMinimap(); setSelection([strip.id]);
    if(cloudSync) setTimeout(function(){ cloudSync.hydrateAll(); }, 0);
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
  function createStripFromFiles(bx, by){
    var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.multiple = true;
    inp.onchange = function(){
      var files = Array.prototype.filter.call(inp.files || [], function(f){ return f.type.indexOf("image/") === 0; }).slice(0, Stick.objects.STRIP_MAX);
      if(files.length < Stick.objects.STRIP_MIN){ toast("Choose at least " + Stick.objects.STRIP_MIN + " photos for a strip."); return; }
      Promise.all(files.map(loadPhotoFile)).then(function(loaded){
        createPaper("photo_strip", bx, by, {variant: "vertical", font: pickFont(), frames: loaded.map(function(l){ return {image: l.src, ratio: clampNum(l.ratio, 0.3, 3, 0.75)}; })});
      }, function(){ toast("An image couldn't be read."); });
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
        if(cloudSync){ cloudSync.notesChanged(); cloudSync.hydrateAll(); }
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
    captureMenuEl = m; captureDotEl = dot;
  }
  // Everything that can be put on the board from an empty spot. `touch: "main"` items are in the first touch menu; the rest sit under More.
  // New physical objects register themselves here (see the object packs) so the two menus never drift apart.
  var INSERT_ITEMS = [
    {id: "sticky", group: "Add", label: "Note", icon: ICONS.sticky, touch: "main"},
    {id: "photo", group: "Add", label: "Photo", icon: ICONS.camera, touch: "main"},
    {id: "cutout", group: "Add", label: "Cutout Photo", icon: ICONS.scissors, touch: "more", ready: function(){ return !!(window.Stick && Stick.cutout && Stick.cutout.available()); }},
    {id: "receipt", group: "Add", label: "Receipt", icon: ICONS.receipt, touch: "more", run: function(bx, by){ createPaper("receipt", bx, by); }},
    {id: "ticket", group: "Add", label: "Ticket", icon: ICONS.ticket, touch: "more", run: function(bx, by){ createPaper("ticket", bx, by); }},
    {id: "postcard", group: "Add", label: "Postcard", icon: ICONS.postcard, touch: "more", run: function(bx, by){ createPostcardFromFile(bx, by); }},
    {id: "strip", group: "Add", label: "Photo Strip", icon: ICONS.strip, touch: "more", run: function(bx, by){ createStripFromFiles(bx, by); }},
    {id: "record", group: "Media", label: "Record", icon: ICONS.mic, touch: "main"},
    {id: "video", group: "Media", label: "Video", icon: ICONS.film, touch: "main"}
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
      var items = Array.prototype.slice.call(pop.querySelectorAll("button.menuItem")), i = items.indexOf(document.activeElement);
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
    if(openPopover){ menuNav(openPopover); placeAtPointer(openPopover, x, y); }
  }
  function openGroupMenu(anchor, x, y){
    var ids = Array.from(selected), pop = openFloatingPopoverAt({left: x, right: x, top: y, bottom: y, width: 0, height: 0}, "noteMenu", null);
    var h = makeDiv("menuHint"); h.textContent = ids.length + " selected"; pop.appendChild(h);
    var onlyPhotos = ids.length >= Stick.objects.STRIP_MIN && ids.length <= Stick.objects.STRIP_MAX && ids.every(function(id){ return isPhoto(findNote(id)); });
    if(onlyPhotos) pop.appendChild(menuItem(ICONS.strip, "Make photo strip", function(){ closeFloatingPopovers(); makeStripFromPhotos(ids); }));
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
    recording = {stop:function(){ finish(false); }, cancel:function(){ finish(true); }};
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
    focusState = {n:n, el:el, scrim:scrim, placeholder:placeholder, closeBtn:closeBtn};
    document.body.classList.add("focusing");
    ensureCaret(n.textEl);
    updateScrollCue(n.textEl);
  }
  function exitFocus(){
    if(!focusState) return;
    var f = focusState;
    focusState = null;
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
    return el;
  }

  function renderNote(n, isNew, opts){
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
        text._t = setTimeout(saveNotes, 250);
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
        if((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "u"){ e.preventDefault(); return; } // no underline
        if(e.key === "Enter" && !e.shiftKey){
          if(handleListEnter(text, e)) return;
          if(focusState && focusState.n === n) return;
          e.preventDefault();
          text.blur();
        }
      });
      text.addEventListener("mousedown", function(e){
        var li = e.target.closest && e.target.closest("ul.checklist > li");
        if(li && text.contains(li) && checkboxHit(li, e.clientX)){
          e.preventDefault();
          li.setAttribute("data-checked", li.getAttribute("data-checked") === "true" ? "false" : "true");
          notifyInput(text);
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
          insert = sanitizeHtml(html.replace(/<!--[\s\S]*?-->/g, ""));
          if(!htmlToText(insert).trim() && plain) insert = linkifyText(plain);
        } else {
          insert = linkifyText(plain);
        }
        document.execCommand("insertHTML", false, insert);
      });
      text.addEventListener("focus", function(){
        clearTimeout(n._cleanT);
        setTimeout(function(){ adjustForKeyboard(text); }, 250);
      });
      text.addEventListener("blur", function(){
        resetKeyboardShift();
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

      el.addEventListener("dblclick", function(e){
        if(focusState || !e.target.closest) return;
        if(e.target.closest(".del, .moreBtn, .fontCycle, .imgHandle, .rmImg, .listHint, .taskDock, .focusClose")) return;
        e.preventDefault();
        e.stopPropagation();
        enterFocus(n);
      });
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
    if(isAV(n)) stopMediaFor(n);
    var elRef = n.el;
    if(!elRef) return;
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
      x: Math.max(0, x - NOTE_W/2),
      y: clampY(y - 30),
      w: NOTE_W,
      html: opts.html || "",
      bg: newNoteBg(),
      font: pickFont(),
      rot: rand(-6,6),
      z: zCounter,
      categoryIndex: 0,
      isTask:false, done:false, due:"", dueTime:"09:00", image:null,
      phys: makePhys()
    };
    notes.push(n);
    ensureWidth();
    renderNote(n, true, {focus:opts.focus});
    setSelection([n.id]);
    if(opts.html) recoverVertical([n]);
    saveNotes();
    updateCount();
    updateMinimap();
    dismissHint();
    recordChange(opts.html ? "Paste as note" : "Create note", {}, {newIds:[n.id]});
  }

  // opts.silent: tidy-up removal, no toast and no undo step
  function deleteNotes(ids, opts){
    opts = opts || {};
    var list = ids.map(findNote).filter(Boolean);
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
    c.rot = isPhoto(c) ? rand(-5, 5) : isPaper(c) ? rand(-3, 3) : rand(-6, 6);
    c.fontManual = !!src.fontManual;
    if(c.cutoutKey && src.cutoutKey){ c.cutoutKey = "co-" + newId(); copyCutoutBlob(src.cutoutKey, c.cutoutKey); }     // a copy never shares the device blob
    return c;
  }
  function insertNotes(list, label){
    if(cloudSync) setTimeout(function(){ cloudSync.hydrateAll(); }, 0);
    list.forEach(function(n){
      zCounter += 1; n.z = zCounter;
      n.y = clampY(n.y);
      notes.push(n);
      renderNote(n, true, {focus:false});
    });
    ensureWidth(); saveNotes(); updateCount(); updateMinimap();
    setSelection(list.map(function(n){ return n.id; }));
    return recordChange(label, {}, {newIds:list.map(function(n){ return n.id; })});
  }
  function duplicateNotes(ids){
    var src = ids.map(findNote).filter(Boolean);
    if(!src.length) return;
    var copies = src.map(function(s){ var c = paperCopy(serializeNote(s)); if(c){ c.x = s.x + 26; c.y = s.y + 26; } return c; }).filter(Boolean);
    insertNotes(copies, copies.length > 1 ? "Duplicate " + copies.length + " notes" : "Duplicate note");
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
  // Pasting on the board (not while typing) captures whatever is on the clipboard.
  // The note is only created once we know what goes in it.
  function pasteAsNewNote(text, html){
    var one = (text || "").trim(), content;
    if(one && !/\s/.test(one) && /^(https?:\/\/|www\.)/i.test(one) && normalizeUrl(one)){
      content = '<a href="' + escapeAttr(normalizeUrl(one)) + '">' + escapeHtml(one) + "</a>";
    } else if(html){
      content = sanitizeHtml(html.replace(/<!--[\s\S]*?-->/g, ""));
      if(!htmlToText(content).trim()) content = linkifyText(text || "");
    } else {
      content = linkifyText(text || "");
    }
    if(!htmlToText(content).trim()) return false;
    var vc = viewCenter();
    addNoteAt(vc.x, vc.y - 60, {html:content, focus:false});
    return true;
  }

  function canEditBoard(b){ return !!b && !b.readOnly && (!b.access || b.access === "owner" || b.access === "edit"); }
  function moveTargets(){
    return boards.filter(function(b){ return b.id !== activeBoardId && canEditBoard(b); });
  }
  function boardViewKey(id){ return "stickyboard." + NS + "view." + id; }
  // Moves notes into another board's storage, arranged around where that board was last viewed.
  function moveNotesToBoard(ids, destId){
    var dest = boards.filter(function(b){ return b.id === destId; })[0];
    var list = ids.map(findNote).filter(Boolean);
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
    grid.appendChild(fmt(ICONS.highlighter, "Highlight selected text", function(){ toggleHighlight(text); }));
    grid.appendChild(fmt(ICONS.ul, "Bullet list", function(){ setListKind(text, "ul"); }));
    grid.appendChild(fmt(ICONS.ol, "Numbered list", function(){ setListKind(text, "ol"); }));
    grid.appendChild(fmt(ICONS.checklist, "Checklist", function(){ setListKind(text, "check"); }));
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
    var card = makeDiv("acctCard modalCard");
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
    var closed = false;
    function close(result){
      if(closed) return;
      closed = true;
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
    document.body.appendChild(backdrop);
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
    var shareable = list.filter(function(n){ return noteHasContent(n) && (cloudShare || !isAV(n)); });
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
      cloudOverlay("Getting ready to share\u2026");
      var ready = await cloudSync.settle(60000);     // the link can only point at things that have reached the server
      hideCloudOverlay();
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
  function shareUnavailable(text){
    var wrap = publicShell();
    wrap.innerHTML = "";
    var p = document.createElement("p"); p.className = "muted"; p.textContent = text; wrap.appendChild(p);
    publicOpenButton(wrap);
  }
  function sharerOf(res){
    var av = res.by_avatar && res.assets && res.assets[res.by_avatar];
    return {bio: res.by_bio || "", avatarUrl: av && av.url ? av.url : ""};
  }
  function cloudShareBoot(){
    var token = window.Stick && Stick.share.tokenFromHash(location.hash);
    shareBanner.hidden = false; copyToMineBtn.hidden = true;
    shareBannerText.textContent = "Opening shared board\u2026";
    if(!token || !CLOUD_OK){ shareUnavailable("This link looks broken or incomplete."); return; }
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
    Stick.share.resolve(token).then(function(res){
      if(!res.ok){
        shareUnavailable(res.reason === "disabled" || res.reason === "expired" ? "The person who shared this has turned the link off."
          : res.reason === "rate_limited" ? "Too many tries. Please wait a minute and reload."
          : res.reason === "unavailable" ? "Couldn't reach the server. Check your connection and try again."
          : "This link isn't available.");
        return;
      }
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
        Stick.share.resolve(token).then(function(r2){ if(r2.ok && r2.type === "board_live") paintLive(r2); else if(!r2.ok && (r2.reason === "disabled" || r2.reason === "not_found")) location.reload(); });
      }, 30000);
    });
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
  board.addEventListener("scroll", function(){ if(board.scrollTop && boardZoom <= 1) board.scrollTop = 0; dismissHint(); closeCaptureMenu(); updateMinimapViewport(); closeFloatingPopovers(); hideLinkCard(); saveBoardView(); }, {passive:true});

  // ---------- search ----------
  function runSearch(){
    var q = searchInput.value.trim().toLowerCase();
    decor.search.clear();
    notes.forEach(function(n){
      if(!n.el) return;
      if(!q){ n.el.style.opacity = ""; n.el.style.pointerEvents = ""; return; }
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
  var STAGED_KEYS = ["lockFont","fontName","theme","cleanupEmpty","displayName"];
  var settingsSnapshot = null;
  function applySettingsUI(){
    document.body.classList.toggle("dark", settings.theme === "dark");
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
  function openSettings(){
    closeOtherPanels(panel);
    closeFloatingPopovers();
    updateCount();
    settingsSnapshot = {};
    STAGED_KEYS.forEach(function(k){ settingsSnapshot[k] = settings[k]; });
    applySettingsUI();
    panel.hidden = false;
  }
  function saveSettingsAndClose(){
    saveSettings();
    settingsSnapshot = null;
    panel.hidden = true;
    toast("Settings saved.");
  }
  function cancelSettings(){
    if(settingsSnapshot){
      STAGED_KEYS.forEach(function(k){ settings[k] = settingsSnapshot[k]; });
      settingsSnapshot = null;
      applySettingsUI();
    }
    panel.hidden = true;
  }
  function closeSettings(){ cancelSettings(); }
  document.getElementById("settingsSave").addEventListener("click", saveSettingsAndClose);
  document.getElementById("settingsCancel").addEventListener("click", cancelSettings);
  gearBtn.addEventListener("click", function(){
    if(panel.hidden) openSettings(); else closeSettings();
    gearBtn.classList.remove("spin");
    void gearBtn.offsetWidth;
    gearBtn.classList.add("spin");
  });
  document.getElementById("settingsClose").innerHTML = ICONS.close;
  document.getElementById("settingsClose").addEventListener("click", closeSettings);
  panel.addEventListener("mousedown", function(e){ if(e.target === panel) closeSettings(); });
  document.addEventListener("keydown", function(e){
    if(e.key === "Escape" && !panel.hidden && !document.querySelector(".acctBackdrop:not(#settingsModal)")) closeSettings();
  });
  shareBtn.addEventListener("click", function(){
    var willOpen = sharePanel.hidden;
    closeOtherPanels(willOpen ? sharePanel : null);
    sharePanel.hidden = !willOpen;
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
  function updateAccountIcon(){
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
    if(acctBackdrop){ acctBackdrop.remove(); acctBackdrop = null; }
    document.removeEventListener("keydown", acctEscHandler);
    if(acctTrapKey){ document.removeEventListener("keydown", acctTrapKey, true); acctTrapKey = null; }
    if(acctOpener && acctOpener.focus && document.contains(acctOpener)){ try{ acctOpener.focus(); }catch(e){} }
    acctOpener = null;
  }
  function openAccountModal(){
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
      renderAccountSettings(card);
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
    btn.disabled = false; lblEl.firstChild.textContent = label;
  }

  async function openManageShares(onChange){
    var content = document.createElement("div");
    content.className = "acctSub"; content.style.textAlign = "left";
    content.textContent = "Loading\u2026";
    openModal({title: "Your active links", content: content, width: 460, actions: [{label: "Done", kind: "primary", value: true}]});
    try{
      var list = await Stick.share.list();
      var names = {};
      try{ (await Stick.repo.listBoards()).forEach(function(b){ names[b.id] = b.name; }); }catch(e){}
      var act = list.filter(function(x){ return x.is_active; });
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
    }catch(e){ content.textContent = "Couldn't load your links: " + Stick.errors.friendly(Stick.errors.parse(e)); }
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

  function renderAccountSettings(card){
    closeMenu();
    card.className = "acctCard acctWide";
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
    var handleStatus = "idle";

    card.innerHTML = '<button class="acctClose" id="acctCloseBtn" aria-label="Close">' + ICONS.close + '</button>' +
      '<div class="acctScroll" id="asScroll">' +

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
        '</section>' +

        // ---------- sharing
        '<section class="asCard" aria-labelledby="asH2">' +
          '<h4 id="asH2">Sharing</h4>' +
          '<div class="asItem"><label class="lbl" for="asIdent">Share as</label><span class="asSel"><select class="asSelect" id="asIdent"></select></span></div>' +
          '<div class="asItem" id="asAvRow"><label class="lbl" for="asShowAv">Show profile photo</label><input type="checkbox" class="asSw" id="asShowAv" role="switch"></div>' +
          '<div class="asItem" id="asBioRow"><label class="lbl" for="asShowBio">Show bio</label><input type="checkbox" class="asSw" id="asShowBio" role="switch"></div>' +
          '<div class="asItem"><label class="lbl" for="asBoardMode">New board links<small>Nothing is shared until you make a link.</small></label><span class="asSel"><select class="asSelect" id="asBoardMode"><option value="view">Read only</option><option value="ask">Ask every time</option></select></span></div>' +
          '<div class="asPreview" id="asPreview" aria-live="polite"></div>' +
        '</section>' +

        // ---------- personalization
        '<section class="asCard" aria-labelledby="asH3">' +
          '<h4 id="asH3">Personalization</h4>' +
          '<div class="asItem"><label class="lbl" for="asFont">Preferred handwriting</label><span class="asSel"><select class="asSelect" id="asFont"></select></span></div>' +
          '<div class="asItem"><span class="lbl" id="asNoteLbl">Default note colour</span><div class="asMenuWrap"><button type="button" class="asAction" id="asNoteBtn" style="width:auto;border:0;padding:6px 8px;" aria-haspopup="menu" aria-expanded="false" aria-labelledby="asNoteLbl asNoteVal"><span class="go" id="asNoteVal"></span></button></div></div>' +
          '<p class="asHint">A preference, not a rule: text a font can\u2019t draw gets a suitable one instead.</p>' +
        '</section>' +

        // ---------- account
        '<section class="asCard" aria-labelledby="asH4">' +
          '<h4 id="asH4">Account</h4>' +
          '<div class="asItem"><span class="lbl">E-mail<small>Only you can see this.</small></span><span class="val">' + escapeHtml(acc.email || "") + '</span></div>' +
          '<div class="asItem"><span class="lbl">Plan<small id="asPlanNote"></small></span><span class="val"><b id="asPlanName">' + escapeHtml((acc.plan || "free").charAt(0).toUpperCase() + (acc.plan || "free").slice(1)) + '</b></span></div>' +
          '<div class="asStats" id="asStats" aria-live="polite"></div>' +
          '<h5>Connected accounts</h5>' +
          '<div id="asProviders"></div>' +
          '<button type="button" class="asAction" id="asSignOut"><span class="lbl">Sign out<small>On this device only.</small></span></button>' +
        '</section>' +

        // ---------- data & privacy
        '<section class="asCard" aria-labelledby="asH5">' +
          '<h4 id="asH5">Data &amp; privacy</h4>' +
          '<div class="asItem" id="asMktRow"><label class="lbl" for="asMarketing">Product updates by e-mail<small>Off unless you turn it on. Stick-It doesn\u2019t send any yet; this records your choice for when it does. Every such message will have an unsubscribe link. Security and account messages are separate and aren\u2019t affected.</small></label><input type="checkbox" class="asSw" id="asMarketing" role="switch"></div>' +
          '<button type="button" class="asAction" id="asExport"><span class="lbl">Export my boards<small>One file with your text, layout and pictures. Voice memos and videos are not included yet.</small></span><span class="go" aria-hidden="true">\u203A</span></button>' +
          '<button type="button" class="asAction" id="asImport" hidden><span class="lbl">Import boards from this device<small id="asImportSub"></small></span><span class="go" aria-hidden="true">›</span></button>' +
          '<button type="button" class="asAction" id="asShares"><span class="lbl">Manage active shares<small>See or turn off links you\u2019ve created.</small></span><span class="go"><span id="asSharesN"></span><span aria-hidden="true">\u203A</span></span></button>' +
          '<button type="button" class="asAction" id="asCorrect"><span class="lbl">Correct my profile details<small>Change your name, username or bio at the top of this page, then Save.</small></span><span class="go" aria-hidden="true">\u203A</span></button>' +
          '<button type="button" class="asAction" id="asSignAll"><span class="lbl">Sign out of all devices<small>Ends your sessions everywhere, including this one.</small></span><span class="go" aria-hidden="true">\u203A</span></button>' +
          '<p class="asHint" id="asPrivacyHint" style="margin-top:10px;"></p>' +
          '<div id="asLegal" style="padding-bottom:12px;"></div>' +
        '</section>' +

        // ---------- danger
        '<section class="asDanger" aria-labelledby="asH6">' +
          '<div class="lbl"><span class="k" id="asH6">Danger zone</span>Delete account<small>Permanently deletes your account and cloud data. Your public shares will stop working.</small></div>' +
          '<button type="button" class="pillBtn danger" id="asDelete">Delete account\u2026</button>' +
        '</section>' +
      '</div>' +
      '<div class="asFoot"><p class="asErr" id="asErr" role="alert"></p><button type="button" class="pillBtn" id="asCancel">Cancel</button><button type="button" class="pillBtn primary" id="asSave">Save</button></div>';

    var $ = function(id){ return card.querySelector("#" + id); };
    var picEl = $("asPic");

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
      var box = $("asPreview"); box.innerHTML = "";
      if(anonymous()){ box.textContent = "Shared anonymously. Your name, photo and bio aren\u2019t shown."; return; }
      var showPhoto = !!draft.shareShowAvatar;
      var av = makeDiv("acctAv pv");
      if(showPhoto) paintAvatar(av, avSpec());
      else { av.style.background = "transparent"; av.style.boxShadow = "inset 0 0 0 1px var(--line)"; av.style.color = "var(--ink-soft)"; av.textContent = "?"; }
      var t = makeDiv("t"), small = document.createElement("small"), b = document.createElement("b");
      small.textContent = "What people see"; b.textContent = "Shared by " + (draft.displayName.trim() || "you");
      t.appendChild(small); t.appendChild(b);
      if(draft.shareShowBio && draft.bio.trim()){ var i = document.createElement("i"); i.textContent = draft.bio.trim(); t.appendChild(i); }
      box.appendChild(av); box.appendChild(t);
    }
    function refreshHero(){
      var name = draft.displayName.trim();
      $("asHeroName").textContent = name || "Your name";
      $("asHeroName").style.opacity = name ? "1" : "0.5";
      var hd = $("asHeroHandle"); hd.hidden = !draft.handle; hd.textContent = draft.handle ? "@" + draft.handle : "";
      var hb = $("asHeroBio"); hb.hidden = !draft.bio.trim(); hb.textContent = draft.bio.trim();
      var eff = effSource();
      paintAvatar(picEl, avSpec());
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
      if(handleStatus === "checking") help.textContent = "Checking\u2026";
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
        $("asPlanName").textContent = String(u.plan).charAt(0).toUpperCase() + String(u.plan).slice(1);
        var pct = u.storage_quota ? Math.min(100, Math.round(100 * u.storage_used / u.storage_quota)) : 0;
        var cells = [];
        if(u.boards != null) cells.push('<div class="asStat"><small>Boards</small>' + u.boards + (u.boards_limit ? ' / ' + u.boards_limit : '') + '</div>');
        if(u.objects != null) cells.push('<div class="asStat"><small>Items</small>' + u.objects + '</div>');
        if(u.storage_used != null) cells.push('<div class="asStat"><small>Storage</small>' + fmtBytes(u.storage_used) + '<div class="asBar" title="' + pct + '% of ' + fmtBytes(u.storage_quota) + '"><i style="width:' + pct + '%"></i></div></div>');
        if(u.member_since) cells.push('<div class="asStat"><small>Member since</small>' + escapeHtml(monthYear(u.member_since)) + '</div>');
        $("asStats").innerHTML = cells.join("");
        activeShares = u.active_shares; paintShareCount();
      }, function(){
        if(!card.isConnected) return;
        $("asStats").innerHTML = '<div class="asStat wide" style="font-weight:400;color:var(--ink-soft);">Couldn\u2019t load your numbers. <button type="button" class="asLink" id="asRetry">Try again</button></div>';
        $("asRetry").addEventListener("click", loadUsage);
      });
    }
    loadUsage();

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
    loadProviders();

    // ---------- e-mail preference (staged like the rest: Save writes it, Cancel drops it)
    draft.marketingOptIn = !!pr.marketingOptIn;
    $("asMarketing").checked = draft.marketingOptIn;
    $("asMarketing").addEventListener("change", function(){ draft.marketingOptIn = $("asMarketing").checked; });
    if((pf.ageBand || "adult") !== "adult"){      // promotional e-mail is only for adult accounts (policy choice, flagged for legal review)
      draft.marketingOptIn = false; $("asMarketing").checked = false; $("asMarketing").disabled = true; $("asMktRow").classList.add("off");
      $("asMktRow").querySelector("small").textContent = "Promotional e-mail isn\u2019t available for this account. Security and account messages are separate.";
    }
    // ---------- privacy requests + legal links
    var lg = Stick.legal || {};
    $("asPrivacyHint").textContent = "To see, correct or delete your data, use Export, Correct and Delete account here: they work straight away. The export doesn\u2019t yet include voice-memo and video files. " +
      (lg.privacyEmail ? "For anything else, or to ask for something this page can\u2019t do, write to " + lg.privacyEmail + "." : "A contact address for privacy requests hasn\u2019t been published yet.");
    $("asLegal").appendChild(legalLinksEl("legalLinks"));

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
    $("asCorrect").addEventListener("click", function(){ var sc = $("asScroll"); if(sc) sc.scrollTop = 0; $("asName").focus(); });
    $("asDelete").addEventListener("click", openDeleteAccount);

    // ---------- Cancel discards (nothing was uploaded); Save validates and persists everything staged
    function cleanup(){ closeMenu(); clearTimeout(hTimer); if(stage.url) URL.revokeObjectURL(stage.url); }
    $("asCancel").addEventListener("click", function(){ cleanup(); closeAccountModal(); });
    $("acctCloseBtn").addEventListener("click", function(){ cleanup(); closeAccountModal(); });
    $("asSave").addEventListener("click", async function(){
      clearErr();
      var bad = Stick.account.validate(draft);
      if(bad){ showErr(bad.message, bad.field); return; }
      if(handleStatus === "taken" && draft.handle !== savedHandle){ showErr("That username is taken. Pick another one.", "handle"); return; }
      var btn = $("asSave"); btn.disabled = true; btn.textContent = "Saving\u2026";
      try{
        var res = await Stick.account.save(draft, stage);
        applyAccountData(res);
        cleanup();
        closeAccountModal();
        toast("Account updated.");
      }catch(e){
        var er = Stick.errors.parse(e);
        btn.disabled = false; btn.textContent = "Save";
        var taken = er.code === "HANDLE_TAKEN";
        if(taken){ handleStatus = "taken"; paintHandleHelp(); }
        showErr(er.code === "INVALID" ? e.message : Stick.errors.friendly(er), e.field || (taken ? "handle" : null));   // everything typed is still here
      }
    });
    refreshHero();
    setTimeout(function(){ var n = $("asName"); if(n && !("ontouchstart" in window) && window.innerWidth > 560) n.focus({preventScroll: true}); }, 60);
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
  document.getElementById("settingsLegal").replaceWith(legalLinksEl("legalLinks"));
  if(window.Stick && Stick.dev){        // local development only: this block is never built on any other hostname
    Stick.hooks = Stick.hooks || {};
    Stick.dev.loader = {         // local only: look at the loader states without needing a slow network
      show: function(t, cover){ cloudOverlay(t || "Loading…", !!cover); },
      done: function(t){ stickLoaderDone(t || "Done."); },
      fail: function(t){ stickLoaderFail(t || "Couldn’t load this board.", function(){}); },
      hide: hideCloudOverlay
    };
    Stick.hooks.showAgeFlow = function(){ if(!settings.account){ openAccountModal(); renderAccountModal("age"); } };
    var devSec = document.createElement("section");
    devSec.className = "setSec";
    devSec.innerHTML = '<h4>Developer (local only)</h4><div class="setBtns"><button class="pillBtn" id="devResetAge">Reset age/consent test state</button><button class="pillBtn" id="devShowAge">Show age flow</button></div>' +
      '<p class="setHelp">Clears only this browser\u2019s local state. Server records are not changed.</p>';
    var legalSec = document.querySelector("#settingsModal .setSec:has(.legalLinks)") || document.querySelector(".legalLinks").closest("section");
    legalSec.insertAdjacentElement("afterend", devSec);
    devSec.querySelector("#devResetAge").addEventListener("click", function(){ Stick.dev.resetAgeGate(); Stick.dev.resetConsent(); toast("Age and consent test state cleared."); });
    devSec.querySelector("#devShowAge").addEventListener("click", function(){ cancelSettings(); Stick.dev.showAgeFlow(); });
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
    document.body.classList.toggle("dark", settings.theme === "dark");
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
    return {app:"stick-it", version:2, board:currentBoardName(), exportedAt:new Date().toISOString(), notes:notes.map(serializeNote)};
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
        status.textContent = result.error || ("Found " + result.notes.length + (result.notes.length === 1 ? " note." : " notes."));
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

  // ---------- minimap ----------
  function updateMinimap(){
    minimapTrack.innerHTML = "";
    var boardWidth = ensureWidth();
    var trackWidth = minimapTrack.clientWidth || 1;
    notes.forEach(function(n){
      var m = document.createElement("div");
      m.className = "miniNote";
      m.style.left = ((n.x/boardWidth)*trackWidth) + "px";
      m.style.width = Math.max(3, (NOTE_W/boardWidth)*trackWidth) + "px";
      m.style.background = isObj(n) ? (n.type === "video" ? "#4a433c" : isPaper(n) ? "#e6dcc4" : "#cfc6b0") : n.bg;
      minimapTrack.appendChild(m);
    });
    var view = document.createElement("div");
    view.className = "miniView";
    view.id = "miniViewIndicator";
    minimapTrack.appendChild(view);
    updateMinimapViewport();
  }
  function updateMinimapViewport(){
    var view = document.getElementById("miniViewIndicator");
    if(!view) return;
    var boardWidth = boardInner.scrollWidth || 1;
    var trackWidth = minimapTrack.clientWidth || 1;
    view.style.left = ((board.scrollLeft/boardWidth)*trackWidth) + "px";
    view.style.width = Math.max(8, (window.innerWidth/boardWidth)*trackWidth) + "px";
  }
  minimapTrack.addEventListener("click", function(e){
    var rect = minimapTrack.getBoundingClientRect();
    var ratio = (e.clientX - rect.left) / rect.width;
    var boardWidth = boardInner.scrollWidth;
    var target = ratio*boardWidth - window.innerWidth/2;
    board.scrollTo({left: Math.max(0, target), behavior:"smooth"});
  });
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
  // the header wraps onto extra rows on narrow screens; keep the board (and banner) below it
  (function syncTopbarHeight(){
    var bar = document.querySelector(".topbar");
    function sync(){
      var h = Math.max(56, Math.round(bar.getBoundingClientRect().bottom));
      board.style.top = h + "px";
      shareBanner.style.top = h + "px";
      syncNoteMaxHeight();
    }
    sync();
    if(window.ResizeObserver) new ResizeObserver(sync).observe(bar);
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
    Array.prototype.forEach.call(stage.querySelectorAll("ul.checklist > li"), function(li){
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
    var ready = await cloudSync.settle(60000);
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
      {sel:"#minimap", title:"See the whole board", body:"This strip mirrors every note's position along the board. Click anywhere on it to jump straight there."},
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

  function startTour(){
    if(!panel.hidden) cancelSettings();
    sharePanel.hidden = true;
    closeFloatingPopovers();
    tourSteps = buildTourSteps();
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
    document.body.appendChild(tourRoot);
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
  helpBtn.addEventListener("click", startTour);

  var SHORTCUT_GROUPS = [
    { title: "Selecting & moving", items: [
      ["Click a note", "Select it &middot; " + MOD + "+click adds or removes more"],
      ["Drag on empty board", "Select every note inside the box"],
      ["Arrow keys", "Nudge the selection &middot; hold Shift for bigger steps"],
      ["Delete / Backspace", "Delete the selection (when you're not typing)"],
      ["N", "New note in the middle of the screen (no mouse needed)"]
    ]},
    { title: "Board actions", items: [
      [MOD + " + Z", "Undo &middot; " + MOD + "+Shift+Z to redo"],
      [MOD + " + D", "Duplicate"],
      [MOD + " + C / V", "Copy and paste notes, even onto another board"],
      [MOD + " + A", "Select every note"]
    ]},
    { title: "Resizing & zoom", items: [
      [MOD + " + / -", "Resize the selected notes, or zoom the board if nothing's selected"],
      [MOD + " + 0", "Reset their size, or the board zoom"]
    ]},
    { title: "Typing in a note", items: [
      ["Enter", "Finish editing &middot; in a list, adds an item"],
      ["Shift + Enter", "New line"],
      [MOD + " + B / I", "Bold / italic"],
      [MOD + " + click a link", "Open it"],
      ["Esc", "Close a popover, or stop editing"]
    ]}
  ];
  function showShortcutsPopover(){
    if(openPopoverTrigger === kbdBtn) return;
    var pop = openFloatingPopover(kbdBtn, "kbdPop");
    if(!pop) return;
    pop.innerHTML = "<h4>Keyboard shortcuts</h4>" + SHORTCUT_GROUPS.map(function(g, gi){
      return (gi > 0 ? '<div class="kbdSep"></div>' : "") +
        '<div class="kbdGroupTitle">' + g.title + "</div><dl>" +
        g.items.map(function(s){ return "<dt>" + s[0] + "</dt><dd>" + s[1] + "</dd>"; }).join("") +
        "</dl>";
    }).join("");
    pop.addEventListener("mouseleave", function(){
      if(openPopoverTrigger === kbdBtn) closeFloatingPopovers();
    });
  }
  kbdBtn.addEventListener("mouseenter", showShortcutsPopover);
  kbdBtn.addEventListener("mouseleave", function(){
    setTimeout(function(){
      if(openPopoverTrigger === kbdBtn && openPopover && !openPopover.matches(":hover")){
        closeFloatingPopovers();
      }
    }, 150);
  });
  kbdBtn.addEventListener("click", function(e){
    e.stopPropagation();
    if(openPopoverTrigger === kbdBtn){ closeFloatingPopovers(); return; }
    showShortcutsPopover();
  });

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
    if(isObj(n)) return objSize(n).h;
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
    var items = list.map(function(n){ return {n:n, w:isObj(n) ? objSize(n).w : (n.w || NOTE_W), h:estimateNoteH(n)}; });
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
      boardPanel.hidden = !willOpen;
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
      // duplicate works while typing in a note too (and saves you from the bookmark dialog)
      if(mod && !e.altKey && key.toLowerCase() === "d"){
        var ae = document.activeElement;
        var editingNote = ae && ae.classList && ae.classList.contains("text") ? notes.filter(function(n){ return n.textEl === ae; })[0] : null;
        var ids = editingNote ? [editingNote.id] : Array.from(selected);
        if(ids.length && (editingNote || !typing)){ e.preventDefault(); if(editingNote) ae.blur(); duplicateNotes(ids); }
        return;
      }
      if(mod && !typing && key.toLowerCase() === "a"){
        e.preventDefault();
        setSelection(notes.map(function(n){ return n.id; }));
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
      // keyboard-only people can start a note too: N puts a new one near the middle of what is on screen, ready to type in
      if(!typing && !mod && !e.altKey && (key === "n" || key === "N") && !readOnly && !modalOpen()){
        e.preventDefault();
        var vr = board.getBoundingClientRect(), br = boardInner.getBoundingClientRect();
        addNoteAt((vr.left + vr.width / 2 - br.left) / boardZoom, (vr.top + Math.min(vr.height / 2, 240) - br.top) / boardZoom, {focus:true});
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
      var list = selectedNotes();
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

  // one quiet word in the header; nothing on individual notes
  function updateSyncPill(state, note){
    if(!CLOUD){ syncPill.hidden = true; return; }
    syncPill.hidden = false;
    if(viewerMode){ syncPill.className = "syncPill saved"; syncPill.textContent = "View only"; syncPill.title = "You can look at this board but not change it."; return; }
    var labels = {saved:"Saved", saving:"Saving\u2026", offline:"Offline", problem: authLost ? "Sign in again" : "Sync problem"};
    syncPill.className = "syncPill " + state;
    syncPill.textContent = labels[state] || "Saved";
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
    snapshot: function(){ return notes.map(persistForm); },
    getObject: function(id){ var n = findNote(id); return n ? persistForm(n) : null; },
    // changes that came from the server: applied without an undo step
    applyRemote: function(d){
      (d.removes || []).forEach(function(id){
        var n = findNote(id); if(!n) return;
        selected.delete(id);
        if(n.el) n.el.remove();
        notes.splice(notes.indexOf(n), 1);
        clearDecorations(id);
      });
      (d.upserts || []).forEach(function(raw){
        var o = cloudSanitize(raw); if(!o) return;
        var ex = findNote(o.id);
        if(ex){
          var keepImg = ex.image, was = ex.assetId || ex.attachedAssetId;
          Object.keys(ex).forEach(function(k){ if(["el","textEl","captionEl","badgeEl"].indexOf(k) === -1) delete ex[k]; });
          Object.assign(ex, o);
          if(keepImg && (ex.assetId || ex.attachedAssetId) === was) ex.image = keepImg;   // same picture: keep what is already loaded
          rerenderNote(ex);
        } else {
          zCounter = Math.max(zCounter, o.z || 0);
          notes.push(o);
          renderNote(o, false, {focus:false});
        }
      });
      ensureWidth(); updateCount(); updateMinimap(); applySelection();
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

  async function startCloud(){
    setupCloudSync();
    if(viewerMode) cloudSync.setReadOnly(true);
    var session = null;
    try{ session = await Stick.auth.init(); }catch(e){ session = null; }
    Stick.auth.onChange(function(ev){
      if(ev === "SIGNED_OUT" && !cloudSigningOut){ authLost = true; updateSyncPill("problem", "Please sign in again."); }
      if(ev === "SIGNED_IN" || ev === "TOKEN_REFRESHED"){ if(authLost && cloudSync){ authLost = false; updateSyncPill("saving"); cloudSync.retryAll(); } }
    });
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
    cloudSync.attach(activeBoardId);
    updateSyncPill("saved");
    await cloudSync.start();
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
    notes.forEach(function(n){ renderNote(n, false); });
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

  if(CLOUD_OK && !singleNoteMode){
    if(window.Stick.auth.callbackPending) finishSignIn();
    else if(CLOUD) startCloud();
  }
})();
