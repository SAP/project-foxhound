// See https://bugzilla.mozilla.org/show_bug.cgi?id=1273251
"use strict"

ChromeUtils.importESModule("resource://gre/modules/Preferences.sys.mjs");

add_task(async function() {
  let webnav = Services.appShell.createWindowlessBrowser(false);

  let docShell = webnav.docShell;

  docShell.createAboutBlankContentViewer(null, null);

  let window = webnav.document.defaultView;
  let unwrapped = Cu.waiveXrays(window);

  window.document.body.innerHTML = '<div id="foo"></div>';

  equal(window.foo, undefined, "Should not have named X-ray property access");
  equal(typeof unwrapped.foo, "object", "Should always have non-X-ray named property access");

  webnav.close();
});

