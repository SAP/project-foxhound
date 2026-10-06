/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

add_task(async function testJsonImportAttribute() {
  let ns = ChromeUtils.importESModule("resource://test/import_attributes.mjs");
  Assert.equal(ns.data.value, 42);
});

add_task(async function testJsonImportAttributeInCurrentGlobal() {
  const win = createChromeWindow();
  win.eval(`
    var ns = ChromeUtils.importESModule("resource://test/import_attributes.mjs", {
      global: "current",
    });
  `);
  Assert.equal(win.eval(`ns.data.value`), 42);
});

add_task(async function testJsonImportAttributeAsyncThenSyncCurrentGlobal() {
  // Import via dynamic import (async, uses window's module loader), then
  // import via ChromeUtils.importESModule (sync). The modules are shared
  // between both loaders via JS::loader::ModuleLoaderBase::CopyModulesTo.
  const win = createChromeWindow();

  win.eval(`
    var ns = null;
    import("resource://test/import_attributes.mjs").then(v => { ns = v; });
  `);

  Services.tm.spinEventLoopUntil(
    "Wait until dynamic import finishes",
    () => win.eval(`ns !== null`)
  );

  Assert.equal(win.eval(`ns.data.value`), 42);

  win.eval(`
    var ns2 = ChromeUtils.importESModule("resource://test/import_attributes.mjs", {
      global: "current",
    });
  `);

  Assert.equal(win.eval(`ns2.data.value`), 42);
});

add_task(async function testJsonImportAttributeSyncThenAsyncCurrentGlobal() {
  // Import via ChromeUtils.importESModule (sync), then import via dynamic
  // import (async). The modules are shared between both loaders via
  // JS::loader::ModuleLoaderBase::MoveModulesTo.
  const win = createChromeWindow();

  win.eval(`
    var ns = ChromeUtils.importESModule("resource://test/import_attributes.mjs", {
      global: "current",
    });
  `);

  Assert.equal(win.eval(`ns.data.value`), 42);

  win.eval(`
    var ns2 = null;
    import("resource://test/import_attributes.mjs").then(v => { ns2 = v; });
  `);

  Services.tm.spinEventLoopUntil(
    "Wait until dynamic import finishes",
    () => win.eval(`ns2 !== null`)
  );

  Assert.equal(win.eval(`ns2.data.value`), 42);
});

add_task(async function testCssImportAttribute() {
  const win = createChromeWindow();
  const ns = win.eval(
    `ChromeUtils.importESModule("resource://test/import_attributes_css.mjs", { global: "current" })`
  );
  Assert.ok(ns.sheet instanceof win.CSSStyleSheet);
  Assert.equal(ns.sheet.cssRules.length, 1);
});

add_task(async function testCssImportAttributeAsyncThenSyncCurrentGlobal() {
  // Import via dynamic import (async, uses window's module loader), then
  // import via ChromeUtils.importESModule (sync). The modules are shared
  // between both loaders via JS::loader::ModuleLoaderBase::CopyModulesTo.
  const win = createChromeWindow();

  win.eval(`
    var ns = null;
    import("resource://test/import_attributes_css.mjs").then(v => { ns = v; });
  `);

  Services.tm.spinEventLoopUntil(
    "Wait until dynamic import finishes",
    () => win.eval(`ns !== null`)
  );

  Assert.ok(win.eval(`ns.sheet instanceof CSSStyleSheet`));
  Assert.equal(win.eval(`ns.sheet.cssRules.length`), 1);

  win.eval(`
    var ns2 = ChromeUtils.importESModule("resource://test/import_attributes_css.mjs", {
      global: "current",
    });
  `);

  Assert.ok(win.eval(`ns2.sheet instanceof CSSStyleSheet`));
  Assert.equal(win.eval(`ns2.sheet.cssRules.length`), 1);
});

add_task(async function testCssImportAttributeSyncThenAsyncCurrentGlobal() {
  // Import via ChromeUtils.importESModule (sync), then import via dynamic
  // import (async). The modules are shared between both loaders via
  // JS::loader::ModuleLoaderBase::MoveModulesTo.
  const win = createChromeWindow();

  win.eval(`
    var ns = ChromeUtils.importESModule("resource://test/import_attributes_css.mjs", {
      global: "current",
    });
  `);

  Assert.ok(win.eval(`ns.sheet instanceof CSSStyleSheet`));
  Assert.equal(win.eval(`ns.sheet.cssRules.length`), 1);

  win.eval(`
    var ns2 = null;
    import("resource://test/import_attributes_css.mjs").then(v => { ns2 = v; });
  `);

  Services.tm.spinEventLoopUntil(
    "Wait until dynamic import finishes",
    () => win.eval(`ns2 !== null`)
  );

  Assert.ok(win.eval(`ns2.sheet instanceof CSSStyleSheet`));
  Assert.equal(win.eval(`ns2.sheet.cssRules.length`), 1);
});

add_task(async function testTextImportAttributeSync() {
  const win = createChromeWindow();
  const ns = win.eval(
    `ChromeUtils.importESModule("resource://test/import_attributes_text.mjs", { global: "current" })`
  );

  Assert.equal(typeof ns.text, "string");
  Assert.ok(ns.text.startsWith("Hello"));
});

add_task(async function testTextImportAttributeAsync() {
  const win = createChromeWindow();
  win.eval(`
    var ns = null;
    import("resource://test/import_attributes_text.mjs").then(v => { ns = v; });
  `);
  Services.tm.spinEventLoopUntil(
    "Wait until dynamic import finishes",
    () => win.eval(`ns !== null`)
  );

  Assert.equal(win.eval(`typeof ns.text`), "string");
  Assert.ok(win.eval(`ns.text.startsWith("Hello")`));
});
