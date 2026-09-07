"use strict";

const { AboutMessagePreviewParent } = ChromeUtils.importESModule(
  "resource:///actors/AboutWelcomeParent.sys.mjs"
);

let messageSandbox;
add_setup(async function () {
  messageSandbox = sinon.createSandbox();
  registerCleanupFunction(() => {
    messageSandbox.restore();
  });
});

/**
 * Test the parent receiveMessage function
 */
add_task(async function test_receive_message() {
  let { cleanup, browser } = await openMessagePreviewTab();
  let aboutMessagePreviewActor = await getAboutMessagePreviewParent(browser);
  messageSandbox.spy(aboutMessagePreviewActor, "receiveMessage");

  await aboutMessagePreviewActor.receiveMessage({
    name: "MessagePreview:SHOW_MESSAGE",
    target: {
      browsingContext: {
        currentRemoteType: "privilegedabout",
      },
    },
  });

  await aboutMessagePreviewActor.receiveMessage({
    name: "MessagePreview:CHANGE_THEME",
    data: {},
    target: {
      browsingContext: {
        currentRemoteType: "privilegedabout",
      },
    },
  });

  const { callCount } = aboutMessagePreviewActor.receiveMessage;
  let messageCall;
  let themeCall;
  for (let i = 0; i < callCount; i++) {
    const call = aboutMessagePreviewActor.receiveMessage.getCall(i);
    info(`Call #${i}: ${JSON.stringify(call.args[0])}`);
    if (call.calledWithMatch({ name: "MessagePreview:SHOW_MESSAGE" })) {
      messageCall = call;
    } else if (call.calledWithMatch({ name: "MessagePreview:CHANGE_THEME" })) {
      themeCall = call;
    }
  }

  Assert.greaterOrEqual(callCount, 2, `${callCount} receive spy was called`);

  Assert.equal(
    messageCall.args[0]?.name,
    "MessagePreview:SHOW_MESSAGE",
    "Got call to handle showing a message"
  );
  Assert.equal(
    themeCall.args[0]?.name,
    "MessagePreview:CHANGE_THEME",
    "Got call to handle changing the theme"
  );

  messageSandbox.restore();
  await cleanup();
});
