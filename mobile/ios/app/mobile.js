#filter dumbComments emptyLines substitution
// -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

pref("toolkit.defaultChromeURI", "chrome://geckoview/content/geckoview.xhtml");

// Use software webrender on simulator due to missing APIs.
#if TARGET_OS_SIMULATOR
  pref("gfx.webrender.software", true);
#endif

// Enable the restricted sandbox for content processes.
pref("security.sandbox.content.level", 1);

// Complete the page load progress bar at different places according to this pref.
// See the possible values below:
// 0 no change
// 1 complete progressbar at DOMContentLoaded
// 2 complete progressbar at first MozAfterPaint after DOMContentLoaded
pref("page_load.progressbar_completion", 2);
