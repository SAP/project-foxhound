"use strict";

ChromeUtils.defineESModuleGetters(this, {
  ASRouter: "resource:///modules/asrouter/ASRouter.sys.mjs",
  FeatureCallout: "resource:///modules/asrouter/FeatureCallout.sys.mjs",

  FeatureCalloutBroker:
    "resource:///modules/asrouter/FeatureCalloutBroker.sys.mjs",

  FeatureCalloutMessages:
    "resource:///modules/asrouter/FeatureCalloutMessages.sys.mjs",

  PlacesTestUtils: "resource://testing-common/PlacesTestUtils.sys.mjs",
  QueryCache: "resource:///modules/asrouter/ASRouterTargeting.sys.mjs",
  AboutWelcomeParent: "resource:///actors/AboutWelcomeParent.sys.mjs",
});
const { FxAccounts } = ChromeUtils.importESModule(
  "resource://gre/modules/FxAccounts.sys.mjs"
);
// We import sinon here to make it available across all mochitest test files
const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const BROWSER_GLUE =
  Cc["@mozilla.org/browser/browserglue;1"].getService().wrappedJSObject;

// Feature callout constants
const calloutId = "feature-callout";
const calloutSelector = `#${calloutId}.featureCallout`;
const calloutCTASelector = `#${calloutId} :is(.primary, .secondary)`;
const calloutDismissSelector = `#${calloutId} .dismiss-button`;
const CTASelector = `#${calloutId} :is(.primary, .secondary)`;

function pushPrefs(...prefs) {
  return SpecialPowers.pushPrefEnv({ set: prefs });
}

async function clearHistoryAndBookmarks() {
  await PlacesUtils.bookmarks.eraseEverything();
  await PlacesUtils.history.clear();
  QueryCache.expireAll();
}

/**
 * Helper function to navigate and wait for page to load
 * https://searchfox.org/mozilla-central/rev/314b4297e899feaf260e7a7d1a9566a218216e7a/testing/mochitest/BrowserTestUtils/BrowserTestUtils.sys.mjs#404
 */
async function waitForUrlLoad(url) {
  let browser = gBrowser.selectedBrowser;
  BrowserTestUtils.startLoadingURIString(browser, url);
  await BrowserTestUtils.browserLoaded(browser, false, url);
}

async function waitForCalloutScreen(target, screenId) {
  await BrowserTestUtils.waitForMutationCondition(
    target,
    { childList: true, subtree: true, attributeFilter: ["class"] },
    () => target.querySelector(`${calloutSelector}:not(.hidden) .${screenId}`)
  );
}

async function waitForCalloutRemoved(target) {
  await BrowserTestUtils.waitForMutationCondition(
    target,
    { childList: true, subtree: true },
    () => !target.querySelector(calloutSelector)
  );
}

/**
 * A helper to check that correct telemetry was sent by AWSendEventTelemetry.
 * This is a wrapper around sinon's spy functionality.
 *
 * @example
 *  let spy = new TelemetrySpy();
 *  element.click();
 *  spy.assertCalledWith({ event: "CLICK" });
 *  spy.restore();
 */
class TelemetrySpy {
  /**
   * @param {object} [sandbox] A pre-existing sinon sandbox to build the spy in.
   *                           If not provided, a new sandbox will be created.
   */
  constructor(sandbox = sinon.createSandbox()) {
    this.sandbox = sandbox;
    this.spy = this.sandbox
      .spy(AboutWelcomeParent.prototype, "onContentMessage")
      .withArgs("AWPage:TELEMETRY_EVENT");
    registerCleanupFunction(() => this.restore());
  }
  /**
   * Assert that AWSendEventTelemetry sent the expected telemetry object.
   *
   * @param {object} expectedData
   */
  assertCalledWith(expectedData) {
    let match = this.spy.calledWith(
      "AWPage:TELEMETRY_EVENT",
      sinon.match(expectedData)
    );
    if (match) {
      ok(true, "Expected telemetry sent");
    } else if (this.spy.called) {
      ok(
        false,
        `Wrong telemetry sent: ${JSON.stringify(this.spy.lastCall.args)}`
      );
    } else {
      ok(false, "No telemetry sent");
    }
  }
  reset() {
    this.spy.resetHistory();
  }
  restore() {
    this.sandbox.restore();
  }
}

/**
 * NOTE: Should be replaced with synthesizeMouseAtCenter for
 * simulating user input. See Bug 1798322
 *
 * Clicks the primary button in the feature callout dialog
 *
 * @param {document} doc Document object
 */
const clickCTA = async doc => {
  doc.querySelector(CTASelector).click();
};

/**
 * Sets up stubs for ASRouter methods to simulate a scenario where a specific
 * message is made available via the ASRouter system.
 *
 * This function stubs:
 *  - `ASRouter.handleMessageRequest` to resolve the provided message.
 *  - `ASRouter.messagesEnabledInAutomation` to consider the message enabled for automation.
 *  - `ASRouter.getMessageById` to return the provided message when queried by its ID.
 *
 * After the provided task function `taskFn` is executed, it restores all the stubs.
 *
 * @param {SinonSandbox} sandbox - The Sinon sandbox used to create the stubs and ensure cleanup.
 * @param {object} message - The message object to be used in the stubs and passed for testing.
 * @param {function} taskFn - The function to be executed with the stubs in place.
 */
async function withTestMessage(sandbox, message, taskFn) {
  let handleMessageRequestStub = sandbox.stub(ASRouter, "handleMessageRequest");
  handleMessageRequestStub.callsFake(async ({ template, returnAll } = {}) => {
    if (!template || template === message.template) {
      return returnAll ? [message] : message;
    }
    return returnAll ? [] : null;
  });

  let messagesEnabledInAutomationStub = sandbox.stub(
    ASRouter,
    "messagesEnabledInAutomation"
  );
  messagesEnabledInAutomationStub.value([message.id]);

  let getMessageByIdStub = sandbox.stub(ASRouter, "getMessageById");
  getMessageByIdStub.withArgs(message.id).returns(message);

  await taskFn(handleMessageRequestStub);

  handleMessageRequestStub.restore();
  messagesEnabledInAutomationStub.restore();
  getMessageByIdStub.restore();
}
