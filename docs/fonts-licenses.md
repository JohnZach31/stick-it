# Fonts: sources and licences

Stick-It loads **no fonts from Google or any other third party**. Every font is served from `assets/fonts/` on the same origin as the app (`assets/fonts/fonts.css` is the only font stylesheet). There is no request to `fonts.googleapis.com` or `fonts.gstatic.com` (verified in a browser, see `network-privacy-check.md`).

## Where they came from
Each family was downloaded once from the Google Fonts service by `tools/fetch-fonts.py` (re-runnable), as WOFF2 files, together with the family's licence text taken from the public `google/fonts` repository on GitHub, and each licence is stored beside the font files. Only the **scripts the app supports** are included: Latin (+ extended + Vietnamese), Cyrillic (+ extended), Hebrew, Arabic, and the Chinese / Japanese / Korean slices of the CJK families. Only the **weights the app uses** are included. `font-display: swap` is set so text appears at once in the fallback stack and switches when the font arrives (the stack is built per mood in the app, so a missing glyph falls to a deliberately chosen font, not a random one).

## Licences (checked per family)
All 82 families are under one of two licences that **permit redistribution and self-hosting**, including commercial use:
- **SIL Open Font License 1.1 (OFL):** may be used, embedded and redistributed; the licence text and copyright notices must stay with the fonts (they are in each family folder); the fonts may not be sold on their own, and a modified version may not reuse the Reserved Font Name. Stick-It does not modify the fonts.
- **Apache License 2.0:** permits use and redistribution with the licence text kept (included).

No family has a licence that forbids self-hosting, and none is non-commercial. **No font was excluded** for licensing reasons. This is a good-faith check of the licence files published by each project, not legal advice.

Total size on disk: **33.7 MB** (1538 font files). A visitor downloads only the few files for the scripts and families a note actually uses (the browser applies `unicode-range`).

## Families
| Family | Weights | Licence | Designer(s) | Source | Local files | Licence file |
|---|---|---|---|---|---|---|
| Sora | 400;500;600;700;800 | SIL Open Font License 1.1 | Jonathan Barnbrook, Julián Moncada | fonts.google.com/specimen/Sora | `assets/fonts/sora/` (10 files, 183 KB) | `OFL.txt` |
| Caveat | 500;700 | SIL Open Font License 1.1 | Impallari Type | fonts.google.com/specimen/Caveat | `assets/fonts/caveat/` (8 files, 438 KB) | `OFL.txt` |
| Kalam | 400;700 | SIL Open Font License 1.1 | Indian Type Foundry | fonts.google.com/specimen/Kalam | `assets/fonts/kalam/` (4 files, 67 KB) | `OFL.txt` |
| Shadows Into Light | 400 | SIL Open Font License 1.1 | Kimberly Geswein | fonts.google.com/specimen/Shadows+Into+Light | `assets/fonts/shadows-into-light/` (2 files, 25 KB) | `OFL.txt` |
| Indie Flower | 400 | SIL Open Font License 1.1 | Kimberly Geswein | fonts.google.com/specimen/Indie+Flower | `assets/fonts/indie-flower/` (2 files, 30 KB) | `OFL.txt` |
| Patrick Hand | 400 | SIL Open Font License 1.1 | Patrick Wagesreiter | fonts.google.com/specimen/Patrick+Hand | `assets/fonts/patrick-hand/` (3 files, 54 KB) | `OFL.txt` |
| Gochi Hand | 400 | SIL Open Font License 1.1 | HT Fonts | fonts.google.com/specimen/Gochi+Hand | `assets/fonts/gochi-hand/` (1 files, 19 KB) | `OFL.txt` |
| Architects Daughter | 400 | SIL Open Font License 1.1 | Kimberly Geswein | fonts.google.com/specimen/Architects+Daughter | `assets/fonts/architects-daughter/` (2 files, 20 KB) | `OFL.txt` |
| Permanent Marker | 400 | Apache License 2.0 | Font Diner | fonts.google.com/specimen/Permanent+Marker | `assets/fonts/permanent-marker/` (1 files, 29 KB) | `LICENSE.txt` |
| Reenie Beanie | 400 | SIL Open Font License 1.1 | James Grieshaber | fonts.google.com/specimen/Reenie+Beanie | `assets/fonts/reenie-beanie/` (1 files, 28 KB) | `OFL.txt` |
| Homemade Apple | 400 | Apache License 2.0 | Font Diner | fonts.google.com/specimen/Homemade+Apple | `assets/fonts/homemade-apple/` (1 files, 47 KB) | `LICENSE.txt` |
| Nanum Pen Script | 400 | SIL Open Font License 1.1 | Sandoll Communication | fonts.google.com/specimen/Nanum+Pen+Script | `assets/fonts/nanum-pen-script/` (93 files, 1687 KB) | `OFL.txt` |
| Covered By Your Grace | 400 | SIL Open Font License 1.1 | Kimberly Geswein | fonts.google.com/specimen/Covered+By+Your+Grace | `assets/fonts/covered-by-your-grace/` (2 files, 25 KB) | `OFL.txt` |
| Schoolbell | 400 | Apache License 2.0 | Font Diner | fonts.google.com/specimen/Schoolbell | `assets/fonts/schoolbell/` (1 files, 21 KB) | `LICENSE.txt` |
| Crafty Girls | 400 | Apache License 2.0 | Tart Workshop | fonts.google.com/specimen/Crafty+Girls | `assets/fonts/crafty-girls/` (1 files, 36 KB) | `LICENSE.txt` |
| Neucha | 400 | SIL Open Font License 1.1 | Jovanny Lemonad | fonts.google.com/specimen/Neucha | `assets/fonts/neucha/` (2 files, 44 KB) | `OFL.txt` |
| Dancing Script | 400 | SIL Open Font License 1.1 | Impallari Type | fonts.google.com/specimen/Dancing+Script | `assets/fonts/dancing-script/` (3 files, 41 KB) | `OFL.txt` |
| Handlee | 400 | SIL Open Font License 1.1 | Joe Prince | fonts.google.com/specimen/Handlee | `assets/fonts/handlee/` (1 files, 16 KB) | `OFL.txt` |
| Caveat Brush | 400 | SIL Open Font License 1.1 | Impallari Type | fonts.google.com/specimen/Caveat+Brush | `assets/fonts/caveat-brush/` (2 files, 96 KB) | `OFL.txt` |
| Sriracha | 400 | SIL Open Font License 1.1 | Cadson Demak | fonts.google.com/specimen/Sriracha | `assets/fonts/sriracha/` (3 files, 85 KB) | `OFL.txt` |
| Zeyada | 400 | SIL Open Font License 1.1 | Kimberly Geswein | fonts.google.com/specimen/Zeyada | `assets/fonts/zeyada/` (2 files, 30 KB) | `OFL.txt` |
| Rock Salt | 400 | Apache License 2.0 | Sideshow | fonts.google.com/specimen/Rock+Salt | `assets/fonts/rock-salt/` (1 files, 57 KB) | `LICENSE.txt` |
| Secular One | 400 | SIL Open Font License 1.1 | Michal Sahar | fonts.google.com/specimen/Secular+One | `assets/fonts/secular-one/` (3 files, 38 KB) | `OFL.txt` |
| Rubik | 500;700 | SIL Open Font License 1.1 | Hubert and Fischer, Meir Sadan, Cyreal, Daniel Grumer, Omaima Dajani | fonts.google.com/specimen/Rubik | `assets/fonts/rubik/` (12 files, 242 KB) | `OFL.txt` |
| Heebo | 500;700 | SIL Open Font License 1.1 | Oded Ezer | fonts.google.com/specimen/Heebo | `assets/fonts/heebo/` (6 files, 111 KB) | `OFL.txt` |
| Ma Shan Zheng | 400 | SIL Open Font License 1.1 | Ma ShanZheng | fonts.google.com/specimen/Ma+Shan+Zheng | `assets/fonts/ma-shan-zheng/` (92 files, 3483 KB) | `OFL.txt` |
| Zhi Mang Xing | 400 | SIL Open Font License 1.1 | Wei Zhimang | fonts.google.com/specimen/Zhi+Mang+Xing | `assets/fonts/zhi-mang-xing/` (92 files, 2506 KB) | `OFL.txt` |
| Long Cang | 400 | SIL Open Font License 1.1 | Chen Xiaomin | fonts.google.com/specimen/Long+Cang | `assets/fonts/long-cang/` (92 files, 3140 KB) | `OFL.txt` |
| Liu Jian Mao Cao | 400 | SIL Open Font License 1.1 | Liu Zhengjiang, Kimberly Geswein, ZhongQi | fonts.google.com/specimen/Liu+Jian+Mao+Cao | `assets/fonts/liu-jian-mao-cao/` (92 files, 2563 KB) | `OFL.txt` |
| Klee One | 600 | SIL Open Font License 1.1 | Fontworks Inc. | fonts.google.com/specimen/Klee+One | `assets/fonts/klee-one/` (123 files, 3405 KB) | `OFL.txt` |
| Yomogi | 400 | SIL Open Font License 1.1 | Satsuyako | fonts.google.com/specimen/Yomogi | `assets/fonts/yomogi/` (123 files, 2105 KB) | `OFL.txt` |
| Hachi Maru Pop | 400 | SIL Open Font License 1.1 | Nonty | fonts.google.com/specimen/Hachi+Maru+Pop | `assets/fonts/hachi-maru-pop/` (120 files, 2456 KB) | `OFL.txt` |
| Gaegu | 700 | SIL Open Font License 1.1 | JIKJI SOFT | fonts.google.com/specimen/Gaegu | `assets/fonts/gaegu/` (89 files, 1123 KB) | `OFL.txt` |
| Amatic SC | 700 | SIL Open Font License 1.1 | Vernon Adams, Ben Nathan, Thomas Jockin | fonts.google.com/specimen/Amatic+SC | `assets/fonts/amatic-sc/` (5 files, 89 KB) | `OFL.txt` |
| Karantina | 400;700 | SIL Open Font License 1.1 | Rony Koch | fonts.google.com/specimen/Karantina | `assets/fonts/karantina/` (6 files, 46 KB) | `OFL.txt` |
| Solitreo | 400 | SIL Open Font License 1.1 | Nathan Gross, Bryan Kirschen | fonts.google.com/specimen/Solitreo | `assets/fonts/solitreo/` (3 files, 50 KB) | `OFL.txt` |
| Playpen Sans Hebrew | 400;600 | SIL Open Font License 1.1 | TypeTogether, Tom Grace, Laura Meseguer, Veronika Burian, José Scaglione | fonts.google.com/specimen/Playpen+Sans+Hebrew | `assets/fonts/playpen-sans-hebrew/` (24 files, 891 KB) | `OFL.txt` |
| Varela Round | 400 | SIL Open Font License 1.1 | Joe Prince | fonts.google.com/specimen/Varela+Round | `assets/fonts/varela-round/` (4 files, 58 KB) | `OFL.txt` |
| Suez One | 400 | SIL Open Font License 1.1 | Michal Sahar | fonts.google.com/specimen/Suez+One | `assets/fonts/suez-one/` (3 files, 30 KB) | `OFL.txt` |
| Fredoka | 500 | SIL Open Font License 1.1 | Milena Brandão, Hafontia | fonts.google.com/specimen/Fredoka | `assets/fonts/fredoka/` (3 files, 24 KB) | `OFL.txt` |
| Gamja Flower | 400 | SIL Open Font License 1.1 | YoonDesign Inc | fonts.google.com/specimen/Gamja+Flower | `assets/fonts/gamja-flower/` (93 files, 2082 KB) | `OFL.txt` |
| Hi Melody | 400 | SIL Open Font License 1.1 | YoonDesign Inc | fonts.google.com/specimen/Hi+Melody | `assets/fonts/hi-melody/` (93 files, 1933 KB) | `OFL.txt` |
| Poor Story | 400 | SIL Open Font License 1.1 | Yoon Design | fonts.google.com/specimen/Poor+Story | `assets/fonts/poor-story/` (92 files, 915 KB) | `OFL.txt` |
| Zen Kurenaido | 400 | SIL Open Font License 1.1 | Yoshimichi Ohira | fonts.google.com/specimen/Zen+Kurenaido | `assets/fonts/zen-kurenaido/` (121 files, 1923 KB) | `OFL.txt` |
| Gloria Hallelujah | 400 | SIL Open Font License 1.1 | Kimberly Geswein | fonts.google.com/specimen/Gloria+Hallelujah | `assets/fonts/gloria-hallelujah/` (2 files, 29 KB) | `OFL.txt` |
| Just Another Hand | 400 | Apache License 2.0 | Astigmatic | fonts.google.com/specimen/Just+Another+Hand | `assets/fonts/just-another-hand/` (2 files, 54 KB) | `LICENSE.txt` |
| Sue Ellen Francisco | 400 | SIL Open Font License 1.1 | Kimberly Geswein | fonts.google.com/specimen/Sue+Ellen+Francisco | `assets/fonts/sue-ellen-francisco/` (1 files, 14 KB) | `OFL.txt` |
| Walter Turncoat | 400 | Apache License 2.0 | Sideshow | fonts.google.com/specimen/Walter+Turncoat | `assets/fonts/walter-turncoat/` (1 files, 59 KB) | `LICENSE.txt` |
| Rancho | 400 | Apache License 2.0 | Sideshow | fonts.google.com/specimen/Rancho | `assets/fonts/rancho/` (1 files, 20 KB) | `LICENSE.txt` |
| Nothing You Could Do | 400 | SIL Open Font License 1.1 | Kimberly Geswein | fonts.google.com/specimen/Nothing+You+Could+Do | `assets/fonts/nothing-you-could-do/` (1 files, 16 KB) | `OFL.txt` |
| Shadows Into Light Two | 400 | SIL Open Font License 1.1 | Kimberly Geswein | fonts.google.com/specimen/Shadows+Into+Light+Two | `assets/fonts/shadows-into-light-two/` (2 files, 24 KB) | `OFL.txt` |
| Swanky and Moo Moo | 400 | SIL Open Font License 1.1 | Kimberly Geswein | fonts.google.com/specimen/Swanky+and+Moo+Moo | `assets/fonts/swanky-and-moo-moo/` (2 files, 27 KB) | `OFL.txt` |
| Mansalva | 400 | SIL Open Font License 1.1 | Carolina Short | fonts.google.com/specimen/Mansalva | `assets/fonts/mansalva/` (3 files, 128 KB) | `OFL.txt` |
| Delicious Handrawn | 400 | SIL Open Font License 1.1 | Agung Rohmat | fonts.google.com/specimen/Delicious+Handrawn | `assets/fonts/delicious-handrawn/` (2 files, 41 KB) | `OFL.txt` |
| Short Stack | 400 | SIL Open Font License 1.1 | James Grieshaber | fonts.google.com/specimen/Short+Stack | `assets/fonts/short-stack/` (1 files, 24 KB) | `OFL.txt` |
| Loved by the King | 400 | SIL Open Font License 1.1 | Kimberly Geswein | fonts.google.com/specimen/Loved+by+the+King | `assets/fonts/loved-by-the-king/` (2 files, 17 KB) | `OFL.txt` |
| Give You Glory | 400 | SIL Open Font License 1.1 | Kimberly Geswein | fonts.google.com/specimen/Give+You+Glory | `assets/fonts/give-you-glory/` (2 files, 28 KB) | `OFL.txt` |
| Waiting for the Sunrise | 400 | SIL Open Font License 1.1 | Kimberly Geswein | fonts.google.com/specimen/Waiting+for+the+Sunrise | `assets/fonts/waiting-for-the-sunrise/` (2 files, 27 KB) | `OFL.txt` |
| Over the Rainbow | 400 | SIL Open Font License 1.1 | Kimberly Geswein | fonts.google.com/specimen/Over+the+Rainbow | `assets/fonts/over-the-rainbow/` (2 files, 29 KB) | `OFL.txt` |
| Kristi | 400 | SIL Open Font License 1.1 | Birgit Pulk | fonts.google.com/specimen/Kristi | `assets/fonts/kristi/` (1 files, 25 KB) | `OFL.txt` |
| Gveret Levin | 400 | SIL Open Font License 1.1 | AlefAlefAlef | fonts.google.com/specimen/Gveret+Levin | `assets/fonts/gveret-levin/` (2 files, 28 KB) | `OFL.txt` |
| Rubik Scribble | 400 | SIL Open Font License 1.1 | NaN, Luke Prowse | fonts.google.com/specimen/Rubik+Scribble | `assets/fonts/rubik-scribble/` (5 files, 302 KB) | `OFL.txt` |
| Alef | 400 | SIL Open Font License 1.1 | Hagilda, Mushon Zer-Aviv | fonts.google.com/specimen/Alef | `assets/fonts/alef/` (2 files, 29 KB) | `OFL.txt` |
| Miriam Libre | 400 | SIL Open Font License 1.1 | Michal Sahar | fonts.google.com/specimen/Miriam+Libre | `assets/fonts/miriam-libre/` (3 files, 28 KB) | `OFL.txt` |
| Frank Ruhl Libre | 400 | SIL Open Font License 1.1 | Yanek Iontef | fonts.google.com/specimen/Frank+Ruhl+Libre | `assets/fonts/frank-ruhl-libre/` (3 files, 29 KB) | `OFL.txt` |
| Bellefair | 400 | SIL Open Font License 1.1 | Nick Shinn, Liron Lavi Turkenic | fonts.google.com/specimen/Bellefair | `assets/fonts/bellefair/` (3 files, 34 KB) | `OFL.txt` |
| David Libre | 400 | SIL Open Font License 1.1 | Monotype Imaging Inc., SIL International, Meir Sadan | fonts.google.com/specimen/David+Libre | `assets/fonts/david-libre/` (4 files, 67 KB) | `OFL.txt` |
| Marck Script | 400 | SIL Open Font License 1.1 | Denis Masharov | fonts.google.com/specimen/Marck+Script | `assets/fonts/marck-script/` (3 files, 32 KB) | `OFL.txt` |
| Bad Script | 400 | SIL Open Font License 1.1 | Gaslight | fonts.google.com/specimen/Bad+Script | `assets/fonts/bad-script/` (5 files, 116 KB) | `OFL.txt` |
| Pangolin | 400 | SIL Open Font License 1.1 | Kevin Burke | fonts.google.com/specimen/Pangolin | `assets/fonts/pangolin/` (5 files, 240 KB) | `OFL.txt` |
| Comforter | 400 | SIL Open Font License 1.1 | Robert Leuschke | fonts.google.com/specimen/Comforter | `assets/fonts/comforter/` (4 files, 108 KB) | `OFL.txt` |
| Underdog | 400 | SIL Open Font License 1.1 | Sergey Steblina, Jovanny Lemonad | fonts.google.com/specimen/Underdog | `assets/fonts/underdog/` (3 files, 38 KB) | `OFL.txt` |
| Ruslan Display | 400 | SIL Open Font License 1.1 | Oleg Snarsky, Denis Masharov, Vladimir Rabdu | fonts.google.com/specimen/Ruslan+Display | `assets/fonts/ruslan-display/` (3 files, 18 KB) | `OFL.txt` |
| Aref Ruqaa | 400 | SIL Open Font License 1.1 | Abdullah Aref, Khaled Hosny, Hermann Zapf | fonts.google.com/specimen/Aref+Ruqaa | `assets/fonts/aref-ruqaa/` (3 files, 53 KB) | `OFL.txt` |
| Katibeh | 400 | SIL Open Font License 1.1 | KB Studio | fonts.google.com/specimen/Katibeh | `assets/fonts/katibeh/` (3 files, 60 KB) | `OFL.txt` |
| Marhey | 400 | SIL Open Font License 1.1 | Nur Syamsi, Bustanul Arifin | fonts.google.com/specimen/Marhey | `assets/fonts/marhey/` (3 files, 39 KB) | `OFL.txt` |
| Rakkas | 400 | SIL Open Font License 1.1 | Zeynep Akay | fonts.google.com/specimen/Rakkas | `assets/fonts/rakkas/` (3 files, 54 KB) | `OFL.txt` |
| Lalezar | 400 | SIL Open Font License 1.1 | Borna Izadpanah | fonts.google.com/specimen/Lalezar | `assets/fonts/lalezar/` (4 files, 87 KB) | `OFL.txt` |
| Reem Kufi | 400 | SIL Open Font License 1.1 | Khaled Hosny, Santiago Orozco | fonts.google.com/specimen/Reem+Kufi | `assets/fonts/reem-kufi/` (4 files, 35 KB) | `OFL.txt` |
| Mada | 400 | SIL Open Font License 1.1 | Khaled Hosny, Paul D. Hunt | fonts.google.com/specimen/Mada | `assets/fonts/mada/` (3 files, 33 KB) | `OFL.txt` |
| Lateef | 400 | SIL Open Font License 1.1 | SIL International | fonts.google.com/specimen/Lateef | `assets/fonts/lateef/` (3 files, 75 KB) | `OFL.txt` |
| Harmattan | 400 | SIL Open Font License 1.1 | SIL International | fonts.google.com/specimen/Harmattan | `assets/fonts/harmattan/` (3 files, 145 KB) | `OFL.txt` |
