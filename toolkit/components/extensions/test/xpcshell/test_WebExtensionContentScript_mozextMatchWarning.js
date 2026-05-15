/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
"use strict";

AddonTestUtils.createAppInfo("xpcshell@tests.mozilla.org", "XPCShell", "1");

createHttpServer({ hosts: ["example.com"] });

add_setup(() => {
  // Need a profile to init Glean.
  do_get_profile();
  Services.fog.initializeFOG();
});

async function test_mozExtensionGlobalMatch({ expectAllowed }) {
  const testMatchesWindowGlobal = async ({ allowed, extId, subframeURL }) => {
    const { MatchPatternSet, WebExtensionContentScript, WebExtensionPolicy } =
      Cu.getGlobalForObject(Services);

    const policy = WebExtensionPolicy.getByID(extId);
    const script = new WebExtensionContentScript(policy, {
      // This content script matches would be matching any extension document,
      // but we will be call matchesWindowGlobal only for a specific document
      // and so we expect the warning log to only be emitted for that
      // specific document (and not emitted for the other extension page).
      matches: new MatchPatternSet([policy.getURL("*")]),
      // The content script instance should be configured to match all
      // frames if we are testing a moz-extension subframe.
      allFrames: !!subframeURL,
      matchAboutBlank: false,
    });

    let targetWin = this.content;

    if (subframeURL) {
      info("Creating moz-extension subframe");
      const iframe = this.content.document.createElement("iframe");
      iframe.src = subframeURL;
      const promiseFrameLoaded = new Promise(resolve => {
        iframe.addEventListener("load", resolve, { once: true });
      });
      this.content.document.body.append(iframe);
      info("Waiting for subframe to be fully loaded");
      await promiseFrameLoaded;
      info("Subframe load is completed: " + iframe.contentDocument.documentURI);
      targetWin = iframe.contentWindow;
    }

    info(
      "Call WebExtensionContentScript.matchesWindowGlobal and wait for the console message"
    );
    const results = await new Promise(resolve => {
      let matchResult;
      let listener = {
        QueryInterface: ChromeUtils.generateQI(["nsIConsoleListener"]),
        observe(msg) {
          info(`Got console message: ${msg.message}`);
          const msgFound = msg.message.match(
            /Content Script execution in moz-extension document has been deprecated/
          );
          if (msgFound) {
            Services.console.unregisterListener(this);
            resolve({ matchResult, consoleMsg: msg });
          }
        },
      };
      Services.console.registerListener(listener);
      info(`Testing WebExtensionContentScript matchesWindowGlobal`);
      matchResult = script.matchesWindowGlobal(targetWin.windowGlobalChild);
    });

    info("Assert matchesWindowGlobal result and logged warning messages");

    Assert.equal(
      results.matchResult,
      allowed,
      `Got the expect matchesWindowGlobal result`
    );
    const expectWarningOutcomeMsg = allowed
      ? "and will be removed in"
      : "and it has been blocked";
    ok(results.consoleMsg, "Expect deprecation warning message to be logged");
    ok(
      results.consoleMsg?.message.includes(expectWarningOutcomeMsg),
      `Expect the warning message to include "${expectWarningOutcomeMsg}"`
    );
    const { documentURI } = targetWin.document;
    ok(
      results.consoleMsg.message.includes(`{file: "${documentURI}"`),
      `Expect the warning message to be associated to the extension page url: ${documentURI}`
    );
    Assert.equal(
      results.consoleMsg?.logLevel,
      Ci.nsIConsoleMessage.warn,
      "Extpect log level to be 'warn'."
    );
    Assert.ok(
      results.consoleMsg instanceof Ci.nsIScriptError,
      "Expect console message to be an instance of nsIScriptError"
    );
    Assert.equal(
      results.consoleMsg.innerWindowID,
      targetWin.windowGlobalChild.innerWindowId,
      "Expect the warning to be associated to the right innerWindowID"
    );
  };

  const extension = ExtensionTestUtils.loadExtension({
    manifest: {
      web_accessible_resources: ["extdoc.html"],
    },
    files: {
      "extdoc.html": `<h1>Extension Context</h1>`,
      "another-extdoc.html": `<h1>Another Extension Context</h1>`,
    },
  });

  await extension.startup();

  const page = await ExtensionTestUtils.loadContentPage(
    `moz-extension://${extension.uuid}/extdoc.html`
  );
  const anotherPage = await ExtensionTestUtils.loadContentPage(
    `moz-extension://${extension.uuid}/another-extdoc.html`
  );
  const webPage = await ExtensionTestUtils.loadContentPage(
    "http://example.com/"
  );

  // Flush and clear all child processes Glean data.
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  const extId = extension.id;

  // Test warning logged in top level frame.
  await page.spawn(
    [{ allowed: expectAllowed, extId }],
    testMatchesWindowGlobal
  );
  // Verify telemetry event for top-level page matching.
  await Services.fog.testFlushAllChildren();
  Assert.deepEqual(
    Glean.extensions.matchMozExtensionDocument.testGetValue()?.map(event => {
      delete event.timestamp;
      return event;
    }),
    [
      {
        category: "extensions",
        name: "match_moz_extension_document",
        extra: {
          restricted: `${!expectAllowed}`,
          addon_id: extension.id,
          is_top_level_frame: "true",
        },
      },
    ],
    "Got the expected telemetry matchMozExtensionDocument Glean events for top-level frame"
  );
  Services.fog.testResetFOG();
  await page.close();

  // Test warning logged in subframe.
  const subframeURL = `moz-extension://${extension.uuid}/extdoc.html`;
  await webPage.spawn(
    [{ allowed: expectAllowed, extId, subframeURL }],
    testMatchesWindowGlobal
  );
  // Verify telemetry event for subframe matching.
  await Services.fog.testFlushAllChildren();
  Assert.deepEqual(
    Glean.extensions.matchMozExtensionDocument.testGetValue()?.map(event => {
      delete event.timestamp;
      return event;
    }),
    [
      {
        category: "extensions",
        name: "match_moz_extension_document",
        extra: {
          restricted: `${!expectAllowed}`,
          addon_id: extId,
          is_top_level_frame: "false",
        },
      },
    ],
    "Got the expected telemetry matchMozExtensionDocument Glean events for subframe"
  );
  Services.fog.testResetFOG();
  await webPage.close();

  await anotherPage.close();
  await extension.unload();
}

add_task(
  {
    pref_set: [
      ["extensions.webextensions.allow_executeScript_in_moz_extension", true],
    ],
  },
  async function test_mozExtensionGlobalMatchAllowed() {
    await test_mozExtensionGlobalMatch({ expectAllowed: true });
  }
);

add_task(
  {
    pref_set: [
      ["extensions.webextensions.allow_executeScript_in_moz_extension", false],
    ],
  },
  async function test_mozExtensionGlobalMatchDisallowed() {
    await test_mozExtensionGlobalMatch({ expectAllowed: false });
  }
);

add_task(
  {
    pref_set: [
      ["extensions.webextensions.allow_executeScript_in_moz_extension", true],
    ],
  },
  async function test_rollbackPrefTelemetry() {
    await AddonTestUtils.promiseShutdownManager();
    Services.fog.testResetFOG();
    // Sanity check.
    Assert.equal(
      Glean.extensions.allowExecuteScriptInMozExtension.testGetValue(),
      null,
      "Expect allowExecuteScriptInMozExtension metric to be initially unset"
    );
    await AddonTestUtils.promiseStartupManager();
    Assert.equal(
      Glean.extensions.allowExecuteScriptInMozExtension.testGetValue(),
      true,
      "Expect allowExecuteScriptInMozExtension metric to be set to true after AOM startup"
    );
    Services.prefs.setBoolPref(
      "extensions.webextensions.allow_executeScript_in_moz_extension",
      false
    );
    Assert.equal(
      Glean.extensions.allowExecuteScriptInMozExtension.testGetValue(),
      false,
      "Expect allowExecuteScriptInMozExtension metric to be set to false after the pref value has been changed"
    );
  }
);
