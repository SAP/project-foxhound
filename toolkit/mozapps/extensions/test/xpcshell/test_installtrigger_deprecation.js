/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

createAppInfo("xpcshell@tests.mozilla.org", "XPCShell", "42", "42");

const testserver = createHttpServer({ hosts: ["example.com"] });

function createTestPage(body) {
  return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body>
        ${body}
      </body>
    </html>
  `;
}

testserver.registerPathHandler(
  "/installtrigger_ua_detection.html",
  (request, response) => {
    response.write(
      createTestPage(`
    <button/>
    <script>
      document.querySelector("button").onclick = () => {
        typeof InstallTrigger;
      };
    </script>
  `)
    );
  }
);

async function testDeprecationWarning(testPageURL, expectedDeprecationWarning) {
  const page = await ExtensionTestUtils.loadContentPage(testPageURL);

  const { message, messageInnerWindowID, pageInnerWindowID } = await page.spawn(
    [expectedDeprecationWarning],
    expectedWarning => {
      return new Promise(resolve => {
        const consoleListener = consoleMsg => {
          if (
            consoleMsg instanceof Ci.nsIScriptError &&
            consoleMsg.message?.includes(expectedWarning)
          ) {
            Services.console.unregisterListener(consoleListener);
            resolve({
              message: consoleMsg.message,
              messageInnerWindowID: consoleMsg.innerWindowID,
              pageInnerWindowID: this.content.windowGlobalChild.innerWindowId,
            });
          }
        };

        Services.console.registerListener(consoleListener);
        this.content.document.querySelector("button").click();
      });
    }
  );

  equal(
    typeof messageInnerWindowID,
    "number",
    `Warning message should be associated to an innerWindowID`
  );
  equal(
    messageInnerWindowID,
    pageInnerWindowID,
    `Deprecation warning "${message}" has been logged and associated to the expected window`
  );

  await page.close();

  return message;
}

add_task(
  {
    pref_set: [["extensions.InstallTrigger.enabled", true]],
  },
  function testDeprecationWarningsOnUADetection() {
    return testDeprecationWarning(
      "http://example.com/installtrigger_ua_detection.html",
      "InstallTrigger is deprecated and will be removed in the future."
    );
  }
);

async function testInstallTriggerDeprecationPrefs(expectedResults) {
  const page = await ExtensionTestUtils.loadContentPage("http://example.com");
  const promiseResults = page.spawn([], () => {
    return {
      uaDetectionResult: this.content.eval(
        "typeof InstallTrigger !== 'undefined'"
      ),
      typeofInstallMethod: this.content.eval("typeof InstallTrigger?.install"),
    };
  });
  if (expectedResults.error) {
    await Assert.rejects(
      promiseResults,
      expectedResults.error,
      "Got the expected error"
    );
  } else {
    Assert.deepEqual(
      await promiseResults,
      expectedResults,
      "Got the expected results"
    );
  }
  await page.close();
}

add_task(
  {
    pref_set: [["extensions.InstallTrigger.enabled", true]],
  },
  function testInstallTriggerEnabled() {
    return testInstallTriggerDeprecationPrefs({
      uaDetectionResult: true,
      typeofInstallMethod: "undefined",
    });
  }
);

add_task(
  {
    pref_set: [["extensions.InstallTrigger.enabled", false]],
  },
  function testInstallTriggerDisabled() {
    return testInstallTriggerDeprecationPrefs({
      error: /ReferenceError: InstallTrigger is not defined/,
    });
  }
);

add_task(
  {
    pref_set: [
      ["extensions.remoteSettings.disabled", false],
      ["extensions.InstallTrigger.enabled", true],
    ],
  },
  async function testInstallTriggerDeprecatedFromRemoteSettings() {
    await AddonTestUtils.promiseStartupManager();

    // InstallTrigger is expected to be initially enabled.
    await testInstallTriggerDeprecationPrefs({
      uaDetectionResult: true,
      typeofInstallMethod: "undefined",
    });

    info("Test remote settings update to hide InstallTrigger global");
    // InstallTrigger global is expected to still be enabled
    await setAndEmitFakeRemoteSettingsData([
      {
        id: "AddonManagerSettings",
        installTriggerDeprecation: {
          "extensions.InstallTrigger.enabled": false,
        },
      },
    ]);
    await testInstallTriggerDeprecationPrefs({
      error: /ReferenceError: InstallTrigger is not defined/,
    });

    info("Test remote settings update to re-enable InstallTrigger global");
    // InstallTrigger global is expected to still be enabled
    await setAndEmitFakeRemoteSettingsData([
      {
        id: "AddonManagerSettings",
        installTriggerDeprecation: {
          "extensions.InstallTrigger.enabled": true,
        },
      },
    ]);
    await testInstallTriggerDeprecationPrefs({
      uaDetectionResult: true,
      typeofInstallMethod: "undefined",
    });

    info("Test remote settings ignored when AMRemoteSettings is disabled");
    // RemoteSettings are expected to be ignored.
    Services.prefs.setBoolPref("extensions.remoteSettings.disabled", true);
    await setAndEmitFakeRemoteSettingsData(
      [
        {
          id: "AddonManagerSettings",
          installTriggerDeprecation: {
            "extensions.InstallTrigger.enabled": false,
          },
        },
      ],
      false /* expectClientInitialized */
    );
    await testInstallTriggerDeprecationPrefs({
      uaDetectionResult: true,
      typeofInstallMethod: "undefined",
    });

    info(
      "Test previously synchronized are processed on AOM started when AMRemoteSettings are enabled"
    );
    // RemoteSettings previously stored on disk are expected to disable InstallTrigger global and methods.
    await AddonTestUtils.promiseShutdownManager();
    Services.prefs.setBoolPref("extensions.remoteSettings.disabled", false);
    await AddonTestUtils.promiseStartupManager();
    await testInstallTriggerDeprecationPrefs({
      error: /ReferenceError: InstallTrigger is not defined/,
    });

    await AddonTestUtils.promiseShutdownManager();
  }
);
