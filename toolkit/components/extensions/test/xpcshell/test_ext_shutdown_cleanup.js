"use strict";

const {
  ExtensionParent: { GlobalManager },
} = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionParent.sys.mjs"
);

add_task(async function test_global_manager_shutdown_cleanup() {
  equal(
    GlobalManager.initialized,
    false,
    "GlobalManager start as not initialized"
  );

  function background() {
    browser.test.notifyPass("background page loaded");
  }

  let extension = ExtensionTestUtils.loadExtension({
    background,
  });

  await extension.startup();
  await extension.awaitFinish("background page loaded");

  equal(
    GlobalManager.initialized,
    true,
    "GlobalManager has been initialized once an extension is started"
  );

  await extension.unload();

  equal(
    GlobalManager.initialized,
    false,
    "GlobalManager has been uninitialized once all the webextensions have been stopped"
  );
});
