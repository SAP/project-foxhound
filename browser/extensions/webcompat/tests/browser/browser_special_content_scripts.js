"use strict";

requestLongerTimeout(4000);

const TEST_PAGE_URL = `${TEST_ROOT}intervention_test.html`;

add_setup(async function () {
  // We don't send events or call official addon APIs while running
  // these tests, so there a good chance that test-verify mode may
  // end up seeing the addon as "idle". This pref should avoid that.
  await SpecialPowers.pushPrefEnv({
    set: [["extensions.background.idle.timeout", 300_000]],
  });
});

function make_config(id, interventions, bugs) {
  return {
    id,
    label: id,
    bugs: bugs ?? {
      [id]: {
        matches: ["*://example.com/*"],
      },
    },
    interventions,
  };
}

async function check_config(config, expectedResults, checkContent) {
  await WebCompatExtension.updateInterventions([config]);

  const { id } = config;

  let regs = await WebCompatExtension.getRegisteredContentScriptsFor(id);
  Assert.deepEqual(
    regs.map(reg => {
      delete reg.id;
      return reg;
    }),
    expectedResults,
    "Got expected results"
  );

  if (checkContent) {
    const need_alerts = checkContent.alert_counts ? 1 : 0;

    const tab = await BrowserTestUtils.openNewForegroundTab({
      gBrowser,
      opening: `${TEST_PAGE_URL}?alerts=${need_alerts}`,
      waitForLoad: true,
    });

    try {
      await SpecialPowers.spawn(
        tab.linkedBrowser,
        [checkContent],
        contentChecker
      );
    } catch (err) {
      ok(false, err);
    }

    await BrowserTestUtils.removeTab(tab);
  }

  await WebCompatExtension.disableInterventions([id]);

  regs = await WebCompatExtension.getRegisteredContentScriptsFor([id]);
  Assert.deepEqual(regs, {}, "Content scripts were properly unregistered");
}

function outputContentScript(overrides) {
  return Object.assign(
    {
      allFrames: false,
      matches: ["*://example.com/*"],
      matchOriginAsFallback: false,
      runAt: "document_start",
      world: "MAIN",
      persistAcrossSessions: true,
      cssOrigin: "author",
    },
    overrides
  );
}

async function contentChecker(checkFor) {
  const waitForCondition = async (
    condition,
    msg,
    interval = 100,
    maxTries = 50
  ) => {
    return new Promise((resolve, reject) => {
      let tries = 0;

      async function tryOnce() {
        if (tries >= maxTries) {
          condition = null;
          reject(msg);
          return;
        }

        let conditionPassed = false;
        try {
          conditionPassed = await condition();
        } catch (e) {
          msg += ` - threw exception: ${e}`;
          condition = null;
          reject(msg);
          return;
        }

        if (conditionPassed) {
          condition = null;
          ok(true, msg);
          resolve(conditionPassed);
          return;
        }
        tries++;
        content.setTimeout(tryOnce, interval);
      }

      content.setTimeout(tryOnce, 1);
    });
  };

  const {
    meta_viewports,
    alert_counts,
    hidden_messages,
    shown_messages,
    useragents,
    has_window_chrome,
    console_messages,
  } = checkFor;

  if (meta_viewports) {
    await waitForCondition(
      () =>
        content.document.head?.querySelector("meta[name]")?.content ==
        meta_viewports[0],
      "meta viewport on top frame is overridden as expected"
    );
    await waitForCondition(
      () =>
        content.frames[0].document.head?.querySelector("meta[name]")?.content ==
        meta_viewports[1],
      "meta viewport on sub-frame is overridden as expected"
    );
  }

  if (hidden_messages?.[0]) {
    await waitForCondition(
      () => !content.document.querySelector(hidden_messages[0]),
      "message to hide on top frame is hidden"
    );
  }
  if (hidden_messages?.[1]) {
    await waitForCondition(
      () => !content.frames[0].document.querySelector(hidden_messages[1]),
      "message to hide on sub-frame is hidden"
    );
  }

  if (shown_messages?.[0]) {
    await waitForCondition(
      () => content.frames[0].document.querySelector(shown_messages[0]),
      "message to only hide on top frame remains visible"
    );
  }
  if (shown_messages?.[1]) {
    await waitForCondition(
      () => content.frames[0].document.querySelector(shown_messages[1]),
      "message to only hide on sub-frame remains visible"
    );
  }

  if (useragents?.[0]) {
    await waitForCondition(
      () => content.navigator.wrappedJSObject.userAgent.includes(useragents[0]),
      "top frame gets expected UA change"
    );
  }
  if (useragents?.[1]) {
    await waitForCondition(
      () =>
        content.frames[0].wrappedJSObject.navigator.userAgent.includes(
          useragents[1]
        ),
      "sub-frame gets expected UA change"
    );
  }

  if (has_window_chrome?.[0]) {
    await waitForCondition(
      () => content.wrappedJSObject.chrome,
      "top frame gets window.chrome"
    );
  }
  if (has_window_chrome?.[1]) {
    await waitForCondition(
      () => content.frames[0].wrappedJSObject.chrome,
      "sub-frame gets window.chrome"
    );
  }

  if (console_messages) {
    const ConsoleAPIStorage = Cc[
      "@mozilla.org/consoleAPI-storage;1"
    ].getService(Ci.nsIConsoleAPIStorage);

    const checkForConsoleMessage = (windowId, msg) => {
      return ConsoleAPIStorage.getEvents(windowId).some(
        m =>
          m.arguments[0] == msg && m.filename.includes("log_console_message.js")
      );
    };

    if (console_messages?.[0]) {
      await waitForCondition(
        () =>
          checkForConsoleMessage(
            content.windowGlobalChild.innerWindowId,
            console_messages[0]
          ),
        "expected console message appears on top frame"
      );
    }
    if (console_messages?.[1]) {
      await waitForCondition(
        () =>
          checkForConsoleMessage(
            content.frames[0].windowGlobalChild.innerWindowId,
            console_messages[1]
          ),
        "expected console message appears on sub-frame"
      );
    }
  }

  if (alert_counts) {
    const { ExtensionContent } = ChromeUtils.importESModule(
      "resource://gre/modules/ExtensionContent.sys.mjs"
    );

    const getContentScriptContext = win => {
      return ExtensionContent.getContextByExtensionId(
        "webcompat@mozilla.org",
        win
      ).cloneScope;
    };

    const checkAlerts = (ctx, { blocked, allowed }) => {
      const counts = SpecialPowers.Cu.evalInSandbox(
        "window.hide_alerts_status",
        ctx
      );
      return (
        counts &&
        counts.blocked.length >= blocked &&
        counts.allowed.length >= allowed
      );
    };

    if (alert_counts?.[0]) {
      const context = getContentScriptContext(content);
      await waitForCondition(
        () => checkAlerts(context, alert_counts[0]),
        "waiting for blocked/allowed alerts alerts on top frame"
      );
    }
    if (alert_counts?.[1]) {
      const context = getContentScriptContext(content.frames[0]);
      await waitForCondition(
        () => checkAlerts(context, alert_counts[1]),
        "waiting for blocked/allowed alerts alerts on sub-frame"
      );
    }
  }
}

add_task(async function test_special_content_scripts() {
  await check_config(
    make_config("test_no_logging", [
      {
        platforms: "all",
        content_scripts: {
          no_console_message: true,
          js: ["use_chrome_useragent.js"],
        },
      },
    ]),
    [
      // log_console_message.js should not be present.
      outputContentScript({
        js: ["injections/js/use_chrome_useragent.js"],
      }),
    ]
  );

  await check_config(
    make_config("test_deduplication", [
      {
        platforms: "all",
        content_scripts: {
          no_console_message: true,
          js: [
            "bug123123-non-special-content-script.js",
            "use_chrome_useragent.js",
          ],
        },
      },
      {
        platforms: "all",
        content_scripts: {
          js: [
            "injections/js/bug123123-non-special-content-script.js",
            "injections/js/use_chrome_useragent.js",
          ],
        },
      },
    ]),
    [
      outputContentScript({
        js: [
          "injections/js/bug123123-non-special-content-script.js",
          "injections/js/use_chrome_useragent.js",
        ],
      }),
    ]
  );

  await check_config(
    make_config("test_logging_added", [
      {
        platforms: "all",
        content_scripts: {
          js: ["injections/js/use_chrome_useragent.js"],
        },
      },
    ]),
    [
      outputContentScript({
        js: ["injections/js/use_chrome_useragent.js"],
      }),
      outputContentScript({
        world: "ISOLATED",
        runAt: "document_idle",
        js: ["injections/js/log_console_message.js"],
      }),
    ]
  );

  await check_config(
    make_config("test_incorrect_direct_usage_filtered_out", [
      {
        platforms: "all",
        content_scripts: {
          js: [
            "hide_alerts.js",
            "hide_messages.js",
            "log_console_message.js",
            "modify_meta_viewport.js",
          ],
        },
      },
    ]),
    []
  );

  await check_config(
    make_config("test_direct_logging_use_ignored", [
      {
        platforms: "all",
        content_scripts: {
          js: [
            "log_console_message.js",
            "injections/js/use_chrome_useragent.js",
          ],
        },
      },
    ]),
    [
      outputContentScript({
        js: ["injections/js/use_chrome_useragent.js"],
      }),
      outputContentScript({
        runAt: "document_idle",
        world: "ISOLATED",
        js: ["injections/js/log_console_message.js"],
      }),
    ]
  );

  await check_config(
    make_config("test_logging_matches_all_frames", [
      {
        platforms: "all",
        content_scripts: {
          all_frames: true,
          js: ["injections/js/use_chrome_useragent.js"],
        },
      },
    ]),
    [
      outputContentScript({
        allFrames: true,
        js: ["injections/js/use_chrome_useragent.js"],
      }),
      outputContentScript({
        allFrames: true,
        world: "ISOLATED",
        runAt: "document_idle",
        js: ["injections/js/log_console_message.js"],
      }),
    ]
  );

  await check_config(
    make_config("test_logging_matches_match_origin_as_fallback", [
      {
        platforms: "all",
        content_scripts: {
          match_origin_as_fallback: true,
          js: ["injections/js/use_chrome_useragent.js"],
        },
      },
    ]),
    [
      outputContentScript({
        matchOriginAsFallback: true,
        js: ["injections/js/use_chrome_useragent.js"],
      }),
      outputContentScript({
        matchOriginAsFallback: true,
        world: "ISOLATED",
        runAt: "document_idle",
        js: ["injections/js/log_console_message.js"],
      }),
    ]
  );

  await check_config(
    make_config("test_hide_alerts_matches_all_frames", [
      {
        platforms: "all",
        hide_alerts: {
          all_frames: true,
          alerts: ["test"],
        },
      },
    ]),
    [
      // hide_alerts.js has both a MAIN and ISOLATED component.
      outputContentScript({
        allFrames: true,
        js: ["injections/js/hide_alerts.js"],
      }),
      outputContentScript({
        allFrames: true,
        world: "ISOLATED",
        js: ["injections/js/hide_alerts.js"],
      }),
    ]
  );

  await check_config(
    make_config("test_hide_alerts_matches_match_origin_as_fallback", [
      {
        platforms: "all",
        hide_alerts: {
          match_origin_as_fallback: true,
          alerts: ["test"],
        },
      },
    ]),
    [
      // hide_alerts.js has both a MAIN and ISOLATED component.
      outputContentScript({
        matchOriginAsFallback: true,
        js: ["injections/js/hide_alerts.js"],
      }),
      outputContentScript({
        matchOriginAsFallback: true,
        world: "ISOLATED",
        js: ["injections/js/hide_alerts.js"],
      }),
    ]
  );

  await check_config(
    make_config("test_hide_messages_matches_all_frames", [
      {
        platforms: "all",
        hide_messages: {
          all_frames: true,
          alerts: ["test"],
        },
      },
    ]),
    [
      outputContentScript({
        allFrames: true,
        world: "ISOLATED",
        js: ["injections/js/hide_messages.js"],
      }),
    ]
  );

  await check_config(
    make_config("test_hide_messages_matches_match_origin_as_fallback", [
      {
        platforms: "all",
        hide_messages: {
          match_origin_as_fallback: true,
          alerts: ["test"],
        },
      },
    ]),
    [
      outputContentScript({
        matchOriginAsFallback: true,
        world: "ISOLATED",
        js: ["injections/js/hide_messages.js"],
      }),
    ]
  );

  await check_config(
    make_config("test_modify_meta_viewport_matches_all_frames", [
      {
        platforms: "all",
        modify_meta_viewport: {
          all_frames: true,
          alerts: ["test"],
        },
      },
    ]),
    [
      outputContentScript({
        allFrames: true,
        world: "ISOLATED",
        js: ["injections/js/modify_meta_viewport.js"],
      }),
    ]
  );

  await check_config(
    make_config("test_modify_meta_viewport_matches_match_origin_as_fallback", [
      {
        platforms: "all",
        modify_meta_viewport: {
          match_origin_as_fallback: true,
          alerts: ["test"],
        },
      },
    ]),
    [
      outputContentScript({
        matchOriginAsFallback: true,
        world: "ISOLATED",
        js: ["injections/js/modify_meta_viewport.js"],
      }),
    ]
  );

  await check_config(
    make_config("test_special_content_scripts", [
      {
        platforms: "all",
        hide_alerts: ["blocked alert"],
        hide_messages: {
          container: "#message_container1",
          message: "message to hide",
        },
        modify_meta_viewport: {
          "minimum-scale": null,
          "maximum-scale": "10.0",
        },
      },
      {
        content_scripts: {
          all_frames: true,
          js: ["injections/js/use_chrome_useragent.js"],
        },
        hide_alerts: {
          all_frames: true,
          alerts: ["blocked iframe alert"],
        },
        hide_messages: {
          all_frames: true,
          container: "#message_container2",
          message: "message in iframe to hide",
          click_adjacent: "#close_button",
        },
        modify_meta_viewport: {
          all_frames: true,
          modify: {
            "interactive-widget": {
              value: "overlays-content",
              only_if_not_equals: "resizes-content",
            },
            "initial-scale": {
              value: "1.0",
              only_if_equals: "2.0",
            },
          },
        },
      },
    ]),
    [
      // hide_alerts.js has both a MAIN and ISOLATED component.
      outputContentScript({
        allFrames: true,
        js: [
          "injections/js/use_chrome_useragent.js",
          "injections/js/hide_alerts.js",
        ],
      }),
      outputContentScript({
        allFrames: true,
        world: "ISOLATED",
        js: [
          "injections/js/hide_alerts.js",
          "injections/js/hide_messages.js",
          "injections/js/modify_meta_viewport.js",
        ],
      }),
      outputContentScript({
        allFrames: true,
        runAt: "document_idle",
        world: "ISOLATED",
        js: ["injections/js/log_console_message.js"],
      }),
    ],
    {
      alert_counts: [
        { blocked: 2, allowed: 0 },
        { blocked: 2, allowed: 2 },
      ],
      hidden_messages: ["#message_container1", "#message_container2"],
      shown_messages: ["#message_container1"],
      meta_viewports: [
        "interactive-widget=overlays-content,initial-scale=1.0,maximum-scale=10.0",
        "interactive-widget=overlays-content,initial-scale=1.0,maximum-scale=10.0",
      ],
      useragents: ["Chrome", "Chrome"],
      console_messages: [
        "navigator.userAgent is being altered for compatibility reasons. See https://bugzil.la/test_special_content_scripts for details.",
        "navigator.userAgent is being altered for compatibility reasons. See https://bugzil.la/test_special_content_scripts for details.",
      ],
    }
  );

  await check_config(
    make_config("test_logger_lists_all_fixes", [
      {
        platforms: "all",
        content_scripts: {
          all_frames: true,
          js: ["use_chrome_useragent.js", "define_minimal_window_chrome.js"],
        },
      },
    ]),
    [
      outputContentScript({
        allFrames: true,
        js: [
          "injections/js/use_chrome_useragent.js",
          "injections/js/define_minimal_window_chrome.js",
        ],
      }),
      outputContentScript({
        allFrames: true,
        runAt: "document_idle",
        world: "ISOLATED",
        js: ["injections/js/log_console_message.js"],
      }),
    ],
    {
      useragents: ["Chrome", "Chrome"],
      has_window_chrome: [true, true],
      console_messages: [
        "navigator.userAgent, window.chrome are being altered for compatibility reasons. See https://bugzil.la/test_logger_lists_all_fixes for details.",
        "navigator.userAgent, window.chrome are being altered for compatibility reasons. See https://bugzil.la/test_logger_lists_all_fixes for details.",
      ],
    }
  );

  await check_config(
    make_config(
      "test_logger_chooses_right_bug_number",
      [
        {
          platforms: "all",
          content_scripts: {
            all_frames: true,
            js: ["define_minimal_window_chrome.js"],
          },
        },
      ],
      {
        bug1: {
          matches: ["*://example.com/*/intervention_test.html*"],
        },
        bug2: {
          matches: ["*://example.com/*/intervention_test_frame.html*"],
        },
      }
    ),
    [
      outputContentScript({
        allFrames: true,
        matches: [
          "*://example.com/*/intervention_test.html*",
          "*://example.com/*/intervention_test_frame.html*",
        ],
        js: ["injections/js/define_minimal_window_chrome.js"],
      }),
      outputContentScript({
        allFrames: true,
        matches: [
          "*://example.com/*/intervention_test.html*",
          "*://example.com/*/intervention_test_frame.html*",
        ],
        runAt: "document_idle",
        world: "ISOLATED",
        js: ["injections/js/log_console_message.js"],
      }),
    ],
    {
      has_window_chrome: [true, true],
      console_messages: [
        "window.chrome is being altered for compatibility reasons. See https://bugzil.la/bug1 for details.",
        "window.chrome is being altered for compatibility reasons. See https://bugzil.la/bug2 for details.",
      ],
    }
  );
});
