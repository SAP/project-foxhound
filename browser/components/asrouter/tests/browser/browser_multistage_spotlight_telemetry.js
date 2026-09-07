"use strict";

const { Spotlight } = ChromeUtils.importESModule(
  "resource:///modules/asrouter/Spotlight.sys.mjs"
);
const { PanelTestProvider } = ChromeUtils.importESModule(
  "resource:///modules/asrouter/PanelTestProvider.sys.mjs"
);

const { AboutWelcomeTelemetry } = ChromeUtils.importESModule(
  "resource:///modules/aboutwelcome/AboutWelcomeTelemetry.sys.mjs"
);

async function waitForClick(selector, win) {
  await TestUtils.waitForCondition(() => win.document.querySelector(selector));
  win.document.querySelector(selector).click();
}

function waitForDialog(callback = win => win.close()) {
  return BrowserTestUtils.promiseAlertDialog(
    null,
    "chrome://browser/content/spotlight.html",
    { callback, isSubDialog: true }
  );
}

function showAndWaitForDialog(dialogOptions, callback) {
  const promise = waitForDialog(callback);
  Spotlight.showSpotlightDialog(
    dialogOptions.browser,
    dialogOptions.message,
    dialogOptions.dispatchStub
  );
  return promise;
}

add_task(async function send_spotlight_as_page_in_telemetry() {
  let message = (await PanelTestProvider.getMessages()).find(
    m => m.id === "MULTISTAGE_SPOTLIGHT_MESSAGE"
  );
  let dispatchStub = sinon.stub();
  let browser = BrowserWindowTracker.getTopWindow().gBrowser.selectedBrowser;
  let sandbox = sinon.createSandbox();

  await showAndWaitForDialog({ message, browser, dispatchStub }, async win => {
    let stub = sandbox.stub(win, "AWSendEventTelemetry");
    await waitForClick("button.secondary", win);
    Assert.equal(
      stub.lastCall.args[0].event_context.page,
      "spotlight",
      "The value of event context page should be set to 'spotlight' in event telemetry"
    );
    win.close();
  });

  sandbox.restore();
});

add_task(async function send_dismiss_event_telemetry() {
  // Have to turn on AS telemetry for anything to be recorded.
  await SpecialPowers.pushPrefEnv({
    set: [["browser.newtabpage.activity-stream.telemetry", true]],
  });
  registerCleanupFunction(async () => {
    await SpecialPowers.popPrefEnv();
  });

  // Let's collect all "messaging-system" pings submitted in this test.
  let pingContents = [];
  let onSubmit = () => {
    pingContents.push({
      messageId: Glean.messagingSystem.messageId.testGetValue(),
      event: Glean.messagingSystem.event.testGetValue(),
    });
    GleanPings.messagingSystem.testBeforeNextSubmit(onSubmit);
  };
  GleanPings.messagingSystem.testBeforeNextSubmit(onSubmit);

  const messageId = "MULTISTAGE_SPOTLIGHT_MESSAGE";
  let message = (await PanelTestProvider.getMessages()).find(
    m => m.id === messageId
  );
  let browser = BrowserWindowTracker.getTopWindow().gBrowser.selectedBrowser;
  let sandbox = sinon.createSandbox();
  let spy = sandbox.spy(AboutWelcomeTelemetry.prototype, "sendTelemetry");
  // send without a dispatch function so that default is used
  await showAndWaitForDialog({ message, browser }, async win => {
    await waitForClick("button.dismiss-button", win);
    await win.close();
  });

  Assert.equal(
    spy.lastCall.args[0].message_id,
    messageId,
    "A dismiss event is called with the correct message id"
  );

  Assert.equal(
    spy.lastCall.args[0].event,
    "DISMISS",
    "A dismiss event is called with a top level event field with value 'DISMISS'"
  );

  Assert.greater(
    pingContents.length,
    0,
    "Glean 'messaging-system' pings were submitted."
  );
  Assert.ok(
    pingContents.some(ping => {
      return ping.messageId === messageId && ping.event === "DISMISS";
    }),
    "A Glean 'messaging-system' ping was sent for the correct message+event."
  );

  // Tidy up by removing the self-referential test callback.
  GleanPings.messagingSystem.testBeforeNextSubmit(() => {});
  sandbox.restore();
});

add_task(
  async function do_not_send_impression_telemetry_from_default_dispatch() {
    // Don't send impression telemetry from the Spotlight default dispatch function
    let message = (await PanelTestProvider.getMessages()).find(
      m => m.id === "MULTISTAGE_SPOTLIGHT_MESSAGE"
    );
    let browser = BrowserWindowTracker.getTopWindow().gBrowser.selectedBrowser;
    let sandbox = sinon.createSandbox();
    let stub = sandbox.stub(AboutWelcomeTelemetry.prototype, "sendTelemetry");
    // send without a dispatch function so that default is used
    await showAndWaitForDialog({ message, browser });

    Assert.equal(
      stub.calledOn(),
      false,
      "No extra impression event was sent for multistage Spotlight"
    );

    sandbox.restore();
  }
);

add_task(async function feedback_data_only_sent_on_primary_button_submit() {
  let baseMessage = (await PanelTestProvider.getMessages()).find(
    m => m.id === "MULTISTAGE_SPOTLIGHT_MESSAGE"
  );
  const feedbackData = { metadata: { model: "test-model", turn_count: 1 } };
  let message = {
    ...baseMessage,
    content: {
      ...baseMessage.content,
      write_in_microsurvey: true,
      feedbackData,
    },
  };
  let browser = BrowserWindowTracker.getTopWindow().gBrowser.selectedBrowser;
  let sandbox = sinon.createSandbox();

  await showAndWaitForDialog({ message, browser }, async win => {
    // Simulate a non-submit event: feedbackData should NOT be attached
    let impressionData = {
      event: "IMPRESSION",
      event_context: { source: "spotlight", page: "spotlight" },
      message_id: message.content.id,
    };
    win.AWSendEventTelemetry(impressionData);
    Assert.ok(
      !impressionData.event_context?.smart_window_user_feedback_data,
      "feedbackData should not be attached to non-submit events"
    );

    // Simulate a primary button submit: feedbackData SHOULD be attached
    let submitData = {
      event: "CLICK_BUTTON",
      event_context: { source: "primary_button", page: "spotlight" },
      message_id: message.content.id,
    };
    win.AWSendEventTelemetry(submitData);
    Assert.deepEqual(
      submitData.event_context?.smart_window_user_feedback_data,
      feedbackData,
      "feedbackData should be attached on primary button submit"
    );

    win.close();
  });

  sandbox.restore();
});

add_task(async function feedback_chat_selection_based_on_content_toggle() {
  let baseMessage = (await PanelTestProvider.getMessages()).find(
    m => m.id === "MULTISTAGE_SPOTLIGHT_MESSAGE"
  );
  const chatLog = { log: [{ role: 0, content: { type: "text", body: "hi" } }] };
  const chatLogWithoutPageContent = { log: [] };
  const feedbackData = {
    metadata: { model: "test-model", turn_count: 1 },
    chat: chatLog,
    chatWithoutPageContent: chatLogWithoutPageContent,
  };
  let message = {
    ...baseMessage,
    content: {
      ...baseMessage.content,
      write_in_microsurvey: true,
      feedbackData,
    },
  };
  let browser = BrowserWindowTracker.getTopWindow().gBrowser.selectedBrowser;

  await showAndWaitForDialog({ message, browser }, async win => {
    // Toggle checked (include page content): sends full chat, strips chatWithoutPageContent
    let submitWithToggle = {
      event: "CLICK_BUTTON",
      event_context: {
        source: "primary_button",
        page: "spotlight",
        contentToggleState: true,
      },
    };
    win.AWSendEventTelemetry(submitWithToggle);
    Assert.deepEqual(
      submitWithToggle.event_context.smart_window_user_feedback_data,
      { metadata: feedbackData.metadata, chat: chatLog },
      "full chat is sent when toggle is checked"
    );
    Assert.ok(
      !(
        "chatWithoutPageContent" in
        submitWithToggle.event_context.smart_window_user_feedback_data
      ),
      "chatWithoutPageContent is stripped from sent data"
    );

    // Toggle unchecked (exclude page content): chat is replaced with chatWithoutPageContent
    let submitWithoutToggle = {
      event: "CLICK_BUTTON",
      event_context: {
        source: "primary_button",
        page: "spotlight",
        contentToggleState: false,
      },
    };
    win.AWSendEventTelemetry(submitWithoutToggle);
    Assert.deepEqual(
      submitWithoutToggle.event_context.smart_window_user_feedback_data,
      { metadata: feedbackData.metadata, chat: chatLogWithoutPageContent },
      "chatWithoutPageContent replaces chat when toggle is unchecked"
    );

    win.close();
  });
});

add_task(
  async function feedback_full_chat_sent_when_no_alternate_and_toggle_unchecked() {
    let baseMessage = (await PanelTestProvider.getMessages()).find(
      m => m.id === "MULTISTAGE_SPOTLIGHT_MESSAGE"
    );
    const chatLog = {
      log: [{ role: 0, content: { type: "text", body: "hi" } }],
    };
    const feedbackData = {
      metadata: { model: "test-model", turn_count: 1 },
      chat: chatLog,
    };
    let message = {
      ...baseMessage,
      content: {
        ...baseMessage.content,
        write_in_microsurvey: true,
        feedbackData,
      },
    };
    let browser = BrowserWindowTracker.getTopWindow().gBrowser.selectedBrowser;

    await showAndWaitForDialog({ message, browser }, async win => {
      let submitData = {
        event: "CLICK_BUTTON",
        event_context: {
          source: "primary_button",
          page: "spotlight",
          contentToggleState: false,
        },
      };
      win.AWSendEventTelemetry(submitData);
      Assert.deepEqual(
        submitData.event_context.smart_window_user_feedback_data,
        { metadata: feedbackData.metadata, chat: chatLog },
        "full chat is sent when toggle is unchecked but no alternate exists"
      );

      win.close();
    });
  }
);
