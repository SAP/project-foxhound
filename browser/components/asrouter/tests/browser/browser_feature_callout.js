"use strict";

add_setup(async function () {
  registerCleanupFunction(() => ASRouter.resetMessageState());
});
function getArrowPosition(doc) {
  let callout = doc.querySelector(calloutSelector);
  return callout.getAttribute("arrow-position");
}
const squareWidth = 24;
const arrowWidth = Math.hypot(squareWidth, squareWidth);
const arrowHeight = arrowWidth / 2;
let overlap = 5 - arrowHeight;

function getTestMessage() {
  return {
    id: "TEST_CALLOUT",
    template: "feature_callout",
    groups: [],
    content: {
      id: "TEST_CALLOUT",
      template: "multistage",
      backdrop: "transparent",
      transitions: false,
      disableHistoryUpdates: true,
      screens: [
        {
          id: "TEST_CALLOUT_1",
          anchors: [
            {
              selector: "#PanelUI-menu-button",
              arrow_position: "top",
            },
          ],
          content: {
            position: "callout",
            title: { raw: "Test Callout" },
            primary_button: {
              label: {
                raw: "TEST",
              },
              action: {
                dismiss: true,
              },
            },
            dismiss_button: {
              label: {
                raw: "TEST 2",
              },
              action: {
                dismiss: true,
              },
            },
            page_event_listeners: [
              {
                params: {
                  type: "toggle",
                  selectors: "#PanelUI-menu-button",
                },
                action: {
                  reposition: true,
                },
              },
            ],
          },
        },
      ],
    },
  };
}

async function showFeatureCallout(browser, message) {
  let resolveClosed;
  let closed = new Promise(resolve => {
    resolveClosed = resolve;
  });
  const config = {
    win: browser.ownerGlobal,
    location: "chrome",
    context: "chrome",
    browser,
    theme: { preset: "chrome" },
    listener: (_, event) => {
      if (event === "end") {
        resolveClosed();
      }
    },
  };
  const featureCallout = new FeatureCallout(config);
  let showing = await featureCallout.showFeatureCallout(message);
  return { featureCallout, showing, closed };
}

//Functionality tests
add_task(async function feature_callout_closes_on_dismiss() {
  const testMessage = getTestMessage();
  const sandbox = sinon.createSandbox();
  const spy = new TelemetrySpy(sandbox);
  const messageID = getTestMessage().content.screens[0].id;

  const win = await BrowserTestUtils.openNewBrowserWindow();
  const doc = win.document;
  const browser = win.gBrowser.selectedBrowser;

  const { closed } = await showFeatureCallout(browser, testMessage);

  await waitForCalloutScreen(doc, messageID);

  doc.querySelector(".dismiss-button").click();
  await closed;
  await waitForCalloutRemoved(doc);

  ok(
    !doc.querySelector(calloutSelector),
    "Callout is removed from screen on dismiss"
  );

  // Test that appropriate telemetry is sent
  spy.assertCalledWith({
    event: "CLICK_BUTTON",
    event_context: {
      source: "dismiss_button",
      page: "chrome",
    },
    message_id: sinon.match(messageID),
  });
  spy.assertCalledWith({
    event: "DISMISS",
    event_context: {
      source: "dismiss_button",
      page: "chrome",
    },
    message_id: sinon.match(messageID),
  });
  sandbox.restore();
  await BrowserTestUtils.closeWindow(win);
});

add_task(async function feature_callout_respects_cfr_features_pref() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "browser.newtabpage.activity-stream.asrouter.userprefs.cfr.features",
        false,
      ],
    ],
  });

  const testMessage = getTestMessage();

  const win = await BrowserTestUtils.openNewBrowserWindow();
  const doc = win.document;
  const browser = win.gBrowser.selectedBrowser;

  await showFeatureCallout(browser, testMessage);
  ok(
    !doc.querySelector(calloutSelector),
    "Feature Callout element was not created because CFR pref was disabled"
  );

  await SpecialPowers.popPrefEnv();
  await BrowserTestUtils.closeWindow(win);
});

add_task(async function feature_callout_dismiss_on_timeout() {
  const testMessage = getTestMessage();
  const sandbox = sinon.createSandbox();

  const messageID = getTestMessage().content.screens[0].id;

  // Configure message with a dismiss action on tab container click
  testMessage.content.screens[0].content.page_event_listeners = [
    {
      params: { type: "timeout", options: { once: true, interval: 5000 } },
      action: { dismiss: true, type: "CANCEL" },
    },
  ];

  const win = await BrowserTestUtils.openNewBrowserWindow();
  const doc = win.document;
  const browser = win.gBrowser.selectedBrowser;

  const telemetrySpy = new TelemetrySpy(sandbox);

  let onInterval;
  let startedInterval = new Promise(resolve => {
    sandbox.stub(win, "setInterval").callsFake((fn, ms) => {
      Assert.strictEqual(ms, 5000, "setInterval called with 5 second interval");
      onInterval = fn;
      resolve();
      return 1;
    });
  });

  await showFeatureCallout(browser, testMessage);

  info("Waiting for callout to render");

  await startedInterval;
  await waitForCalloutScreen(doc, messageID);

  info("Ending timeout");
  onInterval();
  await waitForCalloutRemoved(document);

  // Test that appropriate telemetry is sent
  telemetrySpy.assertCalledWith({
    event: "DISMISS",
    event_context: {
      source: "PAGE_EVENT:timeout",
      page: "chrome",
    },
    message_id: "TEST_CALLOUT",
  });
  sandbox.restore();
  await BrowserTestUtils.closeWindow(win);
});

add_task(async function feature_callout_page_event_listener() {
  const testMessage = getTestMessage();
  testMessage.content.screens[0].content.page_event_listeners = [
    {
      params: { type: "click", selectors: "#PanelUI-menu-button" },
      action: JSON.parse(
        JSON.stringify(
          testMessage.content.screens[0].content.primary_button.action
        )
      ),
    },
  ];

  const sandbox = sinon.createSandbox();
  const spy = new TelemetrySpy(sandbox);
  const messageID = testMessage.content.screens[0].id;

  const win = await BrowserTestUtils.openNewBrowserWindow();
  const doc = win.document;
  const browser = win.gBrowser.selectedBrowser;

  const { closed } = await showFeatureCallout(browser, testMessage);

  info("Waiting for callout to render");
  await waitForCalloutScreen(doc, messageID);

  info("Clicking on button");
  doc.querySelector("#PanelUI-menu-button").click();
  await closed;

  await waitForCalloutRemoved(doc);
  // Test that appropriate telemetry is sent
  spy.assertCalledWith({
    event: "DISMISS",
    event_context: {
      source: sinon.match("PAGE_EVENT"),
      page: "chrome",
    },
    message_id: "TEST_CALLOUT",
  });
  sandbox.restore();
  await BrowserTestUtils.closeWindow(win);
});

add_task(async function feature_callout_dismiss_on_escape() {
  const testMessage = getTestMessage();
  const sandbox = sinon.createSandbox();
  const spy = new TelemetrySpy(sandbox);
  const messageID = getTestMessage().content.screens[0].id;

  const win = await BrowserTestUtils.openNewBrowserWindow();
  const doc = win.document;
  const browser = win.gBrowser.selectedBrowser;

  const { closed } = await showFeatureCallout(browser, testMessage);

  info("Waiting for callout to render");
  await waitForCalloutScreen(doc, messageID);

  info("Pressing escape");
  // Press Escape to close
  EventUtils.synthesizeKey("KEY_Escape", {}, win);
  await closed;
  await waitForCalloutRemoved(doc);
  // Test that appropriate telemetry is sent
  spy.assertCalledWith({
    event: "DISMISS",
    event_context: {
      source: "KEY_Escape",
      page: "chrome",
    },
    message_id: "TEST_CALLOUT",
  });
  await BrowserTestUtils.closeWindow(win);
});

add_task(async function feature_callout_returns_default_focus_to_top() {
  const testMessage = getTestMessage();

  const messageID = getTestMessage().content.screens[0].id;

  const win = await BrowserTestUtils.openNewBrowserWindow();
  const doc = win.document;
  const browser = win.gBrowser.selectedBrowser;

  const { closed } = await showFeatureCallout(browser, testMessage);

  await waitForCalloutScreen(doc, messageID);

  ok(doc.querySelector(calloutSelector), "Feature Callout element exists");

  doc.querySelector(".dismiss-button").click();
  await closed;
  await waitForCalloutRemoved(document);

  Assert.strictEqual(
    doc.activeElement.localName,
    "body",
    `by default focus returns to the document body after callout closes`
  );
  await BrowserTestUtils.closeWindow(win);
});

// Layout/UI tests
add_task(async function feature_callout_arrow_position_attribute_exists() {
  const testMessage = getTestMessage();
  const sandbox = sinon.createSandbox();
  const messageID = getTestMessage().content.screens[0].id;

  const win = await BrowserTestUtils.openNewBrowserWindow();
  const doc = win.document;
  const browser = win.gBrowser.selectedBrowser;

  await showFeatureCallout(browser, testMessage);

  await waitForCalloutScreen(doc, messageID);

  let callout = doc.querySelector(`${calloutSelector}`);
  is(
    callout.getAttribute("arrow-position"),
    testMessage.content.screens[0].anchors[0].arrow_position,
    "Arrow position attribute exists on parent container"
  );
  sandbox.restore();
  await BrowserTestUtils.closeWindow(win);
});

add_task(async function feature_callout_does_not_display_arrow_if_hidden() {
  const testMessage = getTestMessage();
  testMessage.content.screens[0].anchors[0].hide_arrow = true;

  const messageID = getTestMessage().content.screens[0].id;

  const win = await BrowserTestUtils.openNewBrowserWindow();
  const doc = win.document;
  const browser = win.gBrowser.selectedBrowser;

  await showFeatureCallout(browser, testMessage);

  await waitForCalloutScreen(doc, messageID);

  is(
    getComputedStyle(
      doc.querySelector(`${calloutSelector} .arrow-box`)
    ).getPropertyValue("display"),
    "none",
    "callout arrow is not visible"
  );
  await BrowserTestUtils.closeWindow(win);
});

//Feature callout Theme tests
function testStyles({ win, theme }) {
  const calloutEl = win.document.querySelector(calloutSelector);
  const calloutStyle = win.getComputedStyle(calloutEl);
  for (const type of ["light", "dark", "hcm"]) {
    const appliedTheme = Object.assign(
      {},
      FeatureCallout.themePresets[theme.preset],
      theme
    );
    const scheme = appliedTheme[type];
    for (const name of FeatureCallout.themePropNames) {
      Assert.equal(
        !!calloutStyle.getPropertyValue(`--fc-${name}-${type}`),
        !!(scheme?.[name] || appliedTheme.all?.[name]),
        `Theme property --fc-${name}-${type} is set`
      );
    }
  }
}

async function testCallout(config) {
  const testMessage = getTestMessage();
  const featureCallout = new FeatureCallout(config);
  const [screen] = testMessage.content.screens;
  screen.anchors[0].selector = "body";
  testMessage.content.screens = [screen];
  featureCallout.showFeatureCallout(testMessage);
  await waitForCalloutScreen(config.win.document, screen.id);
  testStyles(config);
  return { featureCallout };
}

add_task(async function feature_callout_chrome_theme() {
  const win = await BrowserTestUtils.openNewBrowserWindow();
  await testCallout({
    win,
    location: "chrome",
    context: "chrome",
    browser: win.gBrowser.selectedBrowser,
    theme: { preset: "chrome" },
  });
  await BrowserTestUtils.closeWindow(win);
});

add_task(async function feature_callout_pdfjs_theme() {
  const win = await BrowserTestUtils.openNewBrowserWindow();
  await testCallout({
    win,
    location: "pdfjs",
    context: "chrome",
    browser: win.gBrowser.selectedBrowser,
    theme: { preset: "pdfjs", simulateContent: true },
  });
  await BrowserTestUtils.closeWindow(win);
});
