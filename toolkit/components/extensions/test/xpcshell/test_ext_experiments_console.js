"use strict";

let consoleTesterExperimentalAPIS = {
  consoleTester: {
    schema: "schema.json",
    parent: {
      scopes: ["addon_parent"],
      script: "parent.js",
      paths: [["consoleTester"]],
    },
    child: {
      scopes: ["addon_child"],
      script: "child.js",
      paths: [["consoleTester"]],
    },
  },
};

let consoleTesterFiles = {
  "schema.json": JSON.stringify([
    {
      namespace: "consoleTester",
      functions: [
        {
          name: "testConsoleChild",
          type: "function",
          parameters: [],
          returns: { type: "array", items: { type: "string" } },
        },
        {
          name: "testConsoleParent",
          type: "function",
          parameters: [
            {
              type: "function",
              name: "callback",
              parameters: [{ type: "array", items: { type: "string" } }],
            },
          ],
          async: "callback",
        },
        {
          name: "testStringifyGlobalInChild",
          type: "function",
          parameters: [],
          returns: { type: "string" },
        },
      ],
    },
  ]),
  "common.js": () => {
    // Common test logic shared between parent.js and child.js
    globalThis.consoleTester_testConsole = context => {
      let capturedLogs = [];
      // Intercept console.log call handled by ConsoleAPI at:
      // https://searchfox.org/mozilla-central/rev/4e4c6befbae5dccbe4c718d6871f75c16d97f82d/toolkit/modules/Console.sys.mjs#451-458,484
      let origDump = console.dump;
      console.dump = function (msg) {
        capturedLogs.push(msg);
        return origDump.apply(this, arguments);
      };
      try {
        console.log("testConsole_Hello");
        // This used to trigger a crash, regression test for: bug 1977694
        console.log(context);
        console.log("testConsole_Bye");
      } finally {
        console.dump = origDump;
      }
      return capturedLogs;
    };
  },
  "parent.js": () => {
    /* globals ExtensionAPI */ // (also defined for use in child.js below)
    this.consoleTester = class extends ExtensionAPI {
      getAPI(context) {
        if (!globalThis.consoleTester_testConsole) {
          const mozExtJsFile = context.extension.getURL("common.js");
          Services.scriptloader.loadSubScript(mozExtJsFile, globalThis);
        }
        return {
          consoleTester: {
            testConsoleParent() {
              return globalThis.consoleTester_testConsole(context);
            },
          },
        };
      }
    };
  },
  "child.js": () => {
    this.consoleTester = class extends ExtensionAPI {
      getAPI(context) {
        if (!globalThis.consoleTester_testConsole) {
          const mozExtJsFile = context.extension.getURL("common.js");
          Services.scriptloader.loadSubScript(mozExtJsFile, globalThis);
        }
        return {
          consoleTester: {
            testConsoleChild() {
              let logs = globalThis.consoleTester_testConsole(context);
              return Cu.cloneInto(logs, context.cloneScope);
            },
            testStringifyGlobalInChild() {
              try {
                // global is _createExtGlobal() in ExtensionCommon.sys.mjs.
                // eslint-disable-next-line no-undef -- global is defined ^
                return JSON.stringify(global);
              } catch (e) {
                return String(e);
              }
            },
          },
        };
      }
    };
  },
};

// Test that console.log of context works instead of causing a crash.
// Regression test for https://bugzilla.mozilla.org/show_bug.cgi?id=1977694
add_task(async function test_console_log_context_in_experiment_sandbox() {
  let extension = ExtensionTestUtils.loadExtension({
    isPrivileged: true,
    manifest: {
      experiment_apis: consoleTesterExperimentalAPIS,
    },
    files: consoleTesterFiles,
    background() {
      browser.test.onMessage.addListener(async msg => {
        browser.test.assertEq("start", msg, "Expected message");

        function assertStartsWith(actual, expectedStart, message) {
          browser.test.assertTrue(
            actual.startsWith(expectedStart),
            `${message} - Starts with ${expectedStart} given actual: ${actual}`
          );
        }

        // Test 1/2: test console.log behavior in parent:
        let logs = await browser.consoleTester.testConsoleParent();
        browser.test.assertEq(3, logs.length, "Expected 3 log entries");
        browser.test.assertEq(
          logs[0],
          "console.log: WebExtensions: testConsole_Hello\n",
          "First message in parent"
        );
        assertStartsWith(
          logs[1],
          "console.log: WebExtensions: ExtensionPageContextParent",
          "Second message in parent, serialization of context"
        );
        browser.test.assertEq(
          logs[2],
          "console.log: WebExtensions: testConsole_Bye\n",
          "Last message in parent"
        );

        // Test 2/2: test console.log behavior in child:
        logs = browser.consoleTester.testConsoleChild();
        browser.test.assertEq(3, logs.length, "Expected 3 log entries");
        browser.test.assertEq(
          logs[0],
          "console.log: WebExtensions: testConsole_Hello\n",
          "First message in child"
        );
        assertStartsWith(
          logs[1],
          "console.log: WebExtensions: ExtensionPageContextChild",
          "Second message in child, serialization of context"
        );
        browser.test.assertEq(
          logs[2],
          "console.log: WebExtensions: testConsole_Bye\n",
          "Last message in child"
        );

        // Bonus: test that JSON.stringify on the API global throws gracefully.
        // This previously caused a crash, before the fix to bug 1977694.
        browser.test.assertEq(
          browser.consoleTester.testStringifyGlobalInChild(),
          "TypeError: cyclic object value",
          "JSON.stringify(global) should throw"
        );

        browser.test.sendMessage("done");
      });
    },
  });

  await extension.startup();
  extension.sendMessage("start");
  await extension.awaitMessage("done");

  await extension.unload();
});
