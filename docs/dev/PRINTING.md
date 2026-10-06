# Print / Save as PDF

Stick-It prints through the **browser's print window** (`window.print()`). "Save as PDF" is the browser's own destination in that window; there is no Stick-It PDF engine, and nothing is uploaded.

## Entry points
* Object menus: **Print…** (note, photo, paper objects, shopping list) next to **Share…**
* Multi-selection menu and the selection bar: **Print selection**
* The Share window: **Print** (**Print selection** for a group) and **Print / Save as PDF**. Printing never creates a share link.

## How it works
1. `printObjects(list)` (js/app.js) keeps only printable objects: not piles, zones, recordings, videos, embeds, hidden pile members or empty notes. It tells the person what was left out.
2. It builds a temporary `#printRoot` from **clean copies** of the data (`PublicShare.toPublicNote(copy)` + `buildStaticNote`), with all ids removed and no handlers. No comments, reactions, tabs or menus exist in the copies.
3. `js/print-layout.js` plans the page (pure, unit-tested):
   * **single**: centred, enlarged up to 2.4x for readability; a very tall object is kept at natural size and may span pages;
   * **spatial**: several objects whose arrangement fits one page keep their relative layout, scaled to the page;
   * **flow**: objects scattered over a big canvas would print mostly blank pages, so they are set in reading order (top to bottom in rows, left to right), each kept whole on a page.
4. `css/print.css` hides everything except `#printRoot` while `body.printing` is set, forces a white page, keeps colours (`print-color-adjust: exact`), uses 14 mm margins and `break-inside: avoid` for each object.
5. The dark theme class is switched off for the duration (paper is printed on white) and restored, with the page title (which browsers use as the default PDF file name), on `afterprint`, with a 3-minute safety timer. One print at a time.

The board, its objects, selection and history are never touched.

## Inspecting the layout without printing
In the console on a local build: `Stick.print.byIds(["id1","id2"], {preview: true})` shows the print surface on screen; Esc closes it.

## Not covered / limits
* Recordings, videos and embeds, piles and zones are not printed (a paper inside a pile can be printed after taking it out or via Edit).
* Page size is assumed to be roughly A4 / Letter; the browser's scale setting can still shrink or grow the result.
* Pictures still loading are waited for up to 4 s each.
