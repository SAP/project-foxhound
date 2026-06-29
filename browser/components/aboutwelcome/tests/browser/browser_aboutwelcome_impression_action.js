"use strict";

const { ASRouter } = ChromeUtils.importESModule(
  "resource:///modules/asrouter/ASRouter.sys.mjs"
);
const { SpecialMessageActions } = ChromeUtils.importESModule(
  "resource://messaging-system/lib/SpecialMessageActions.sys.mjs"
);

const PIN_SCREEN_ID = "AW_PIN_IMPRESSION";
const DISALLOWED_SCREEN_ID = "AW_DISALLOWED_IMPRESSION";
const MULTI_SCREEN_ID = "AW_MULTI_IMPRESSION";

function makeScreens(id, impression_action) {
  return [
    {
      id,
      content: {
        title: "Impression action test",
        impression_action,
      },
    },
  ];
}

async function clearScreenImpression(screenId) {
  await ASRouter.setState(state => {
    const screenImpressions = { ...state.screenImpressions };
    delete screenImpressions[screenId];
    return { screenImpressions };
  });
}

add_task(async function test_allowlisted_impression_action_fires_once() {
  const sandbox = sinon.createSandbox();
  const handleActionStub = sandbox
    .stub(SpecialMessageActions, "handleAction")
    .resolves();

  await clearScreenImpression(PIN_SCREEN_ID);
  await setAboutWelcomePref(true);
  await pushPrefs([
    "browser.aboutwelcome.screens",
    JSON.stringify(
      makeScreens(PIN_SCREEN_ID, {
        type: "PIN_FIREFOX_TO_TASKBAR",
        once: true,
      })
    ),
  ]);

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:welcome",
    true
  );
  let tab2;

  try {
    await TestUtils.waitForCondition(
      () => handleActionStub.called,
      "Impression action should be dispatched"
    );

    Assert.equal(
      handleActionStub.firstCall.args[0].type,
      "PIN_FIREFOX_TO_TASKBAR",
      "Allowlisted impression action is dispatched"
    );

    // Wait until the impression is recorded so the `once` check can observe it.
    await TestUtils.waitForCondition(
      () => ASRouter.state.screenImpressions?.[PIN_SCREEN_ID],
      "Screen impression should be recorded"
    );
    const firstImpressionTime = ASRouter.state.screenImpressions[PIN_SCREEN_ID];

    handleActionStub.resetHistory();
    tab2 = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      "about:welcome",
      true
    );

    // Wait until the second impression is recorded so the action supressed
    // by `once` has had a chance to (not) fire.
    await TestUtils.waitForCondition(
      () =>
        ASRouter.state.screenImpressions?.[PIN_SCREEN_ID] !==
        firstImpressionTime,
      "Second screen impression should be recorded"
    );
    sinon.assert.notCalled(handleActionStub);
  } finally {
    BrowserTestUtils.removeTab(tab);
    if (tab2) {
      BrowserTestUtils.removeTab(tab2);
    }
    Services.prefs.clearUserPref("browser.aboutwelcome.screens");
    await clearScreenImpression(PIN_SCREEN_ID);
    sandbox.restore();
  }
});

add_task(async function test_non_allowlisted_impression_action_rejected() {
  const sandbox = sinon.createSandbox();
  const handleActionStub = sandbox
    .stub(SpecialMessageActions, "handleAction")
    .resolves();

  await clearScreenImpression(DISALLOWED_SCREEN_ID);
  await setAboutWelcomePref(true);
  await pushPrefs([
    "browser.aboutwelcome.screens",
    JSON.stringify(
      makeScreens(DISALLOWED_SCREEN_ID, {
        type: "SET_DEFAULT_BROWSER",
      })
    ),
  ]);

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:welcome",
    true
  );

  try {
    // The page sends the impression action and then records the screen
    // impression, in that order. Waiting for the recorded impression
    // guarantees that the parent has already processed the impression action
    await TestUtils.waitForCondition(
      () => ASRouter.state.screenImpressions?.[DISALLOWED_SCREEN_ID],
      "Screen impression should be recorded"
    );

    sinon.assert.notCalled(handleActionStub);
  } finally {
    BrowserTestUtils.removeTab(tab);
    Services.prefs.clearUserPref("browser.aboutwelcome.screens");
    await clearScreenImpression(DISALLOWED_SCREEN_ID);
    sandbox.restore();
  }
});

add_task(async function test_multi_action_impression_fires() {
  const sandbox = sinon.createSandbox();
  const handleActionStub = sandbox
    .stub(SpecialMessageActions, "handleAction")
    .resolves();

  await clearScreenImpression(MULTI_SCREEN_ID);
  await setAboutWelcomePref(true);
  await pushPrefs([
    "browser.aboutwelcome.screens",
    JSON.stringify(
      makeScreens(MULTI_SCREEN_ID, {
        type: "MULTI_ACTION",
        data: {
          actions: [
            { type: "PIN_FIREFOX_TO_TASKBAR" },
            { type: "PIN_FIREFOX_TO_START_MENU" },
          ],
        },
      })
    ),
  ]);

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:welcome",
    true
  );

  try {
    await TestUtils.waitForCondition(
      () => handleActionStub.called,
      "Impression action should be dispatched"
    );

    const [action] = handleActionStub.firstCall.args;
    Assert.equal(action.type, "MULTI_ACTION", "MULTI_ACTION dispatched");
    Assert.deepEqual(
      action.data.actions.map(a => a.type),
      ["PIN_FIREFOX_TO_TASKBAR", "PIN_FIREFOX_TO_START_MENU"],
      "Nested pin actions are preserved"
    );
  } finally {
    BrowserTestUtils.removeTab(tab);
    Services.prefs.clearUserPref("browser.aboutwelcome.screens");
    await clearScreenImpression(MULTI_SCREEN_ID);
    sandbox.restore();
  }
});
