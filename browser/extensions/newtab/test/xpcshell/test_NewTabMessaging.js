/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  actionTypes: "resource://newtab/common/Actions.mjs",
  actionUtils: "resource://newtab/common/Actions.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
  NewTabMessaging: "resource://newtab/lib/NewTabMessaging.sys.mjs",
});

function createMockSubject(targetBrowser, message, dispatch) {
  return {
    wrappedJSObject: { targetBrowser, message, dispatch },
  };
}

/**
 * Returns an instance of NewTabMessaging that has its store mocked out and
 * instrumented for easier testing.
 *
 * @param {SinonSandbox} sandbox
 *   A Sinon sandbox for stubbing and spying.
 * @param {function(NewTabMessaging):Promise<void>} taskFn
 *   An async function that accepts a test instance of NewTabMessaging to
 *   manipulate. This instance is pre-initialized, and will be uninitialized
 *   after taskFn resolves.
 */
async function getTestNewTabMessaging(sandbox, taskFn) {
  let messaging = new NewTabMessaging();
  messaging.store = {
    dispatch: sandbox.spy(),
    getState() {
      return this.state;
    },
  };

  // Ensure uninitialized state
  Assert.ok(!messaging.initialized, "Should not be initialized initially");

  // Initialize
  messaging.init();
  Assert.ok(messaging.initialized, "Should be initialized");

  await taskFn(messaging);
  messaging.uninit();
}

/**
 * Tests that the newtab-message observer notification can be used to show
 * messages on newtab.
 */
add_task(async function test_NewTabMessaging() {
  let sandbox = sinon.createSandbox();
  let mockDispatch = sandbox.spy();

  await getTestNewTabMessaging(sandbox, async messaging => {
    // Fake observer notification
    let mockMessage = { id: "test-message" };
    let mockBrowser = {
      browsingContext: {
        currentWindowGlobal: {
          getActor: () => ({
            getTabDetails: () => ({ portID: "12345" }),
          }),
        },
      },
    };

    messaging.observe(
      createMockSubject(mockBrowser, mockMessage, mockDispatch),
      "newtab-message",
      null
    );

    // Check if ASRouterDispatch was set
    Assert.equal(
      messaging.ASRouterDispatch,
      mockDispatch,
      "ASRouterDispatch should be assigned"
    );

    // Simulate impression handling
    messaging.handleImpression(mockMessage);
    Assert.ok(
      mockDispatch.calledWithMatch({ type: "IMPRESSION", data: mockMessage }),
      "Impression action should be dispatched"
    );

    // Simulate telemetry
    messaging.sendTelemetry("CLICK", mockMessage);
    Assert.ok(
      mockDispatch.calledWithMatch({
        type: "NEWTAB_MESSAGE_TELEMETRY",
        data: sandbox.match.has("event", "CLICK"),
      }),
      "Telemetry event should be dispatched"
    );
  });

  sandbox.restore();
});

/**
 * Tests that dismissing a message sends the action to hide all current messages
 * on all existing newtabs.
 */
add_task(async function test_dismissal() {
  let sandbox = sinon.createSandbox();
  await getTestNewTabMessaging(sandbox, async messaging => {
    messaging.onAction({
      type: actionTypes.MESSAGE_DISMISS,
      data: { message: "some-message-ID" },
    });

    Assert.ok(
      messaging.store.dispatch.calledOnce,
      "Should have dispatched a single action"
    );
    const [action] = messaging.store.dispatch.getCall(0).args;
    Assert.equal(
      action.type,
      actionTypes.MESSAGE_TOGGLE_VISIBILITY,
      "Should have sent the action to toggle visibility"
    );
    Assert.deepEqual(
      action.data,
      { isVisible: false },
      "Should have set visibility to false"
    );
    Assert.ok(
      actionUtils.isSendToPreloaded(action),
      "Should be sending the action to all newtab instances, including the preloaded one."
    );
  });

  sandbox.restore();
});
