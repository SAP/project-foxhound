/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { ASRouter, MessageLoaderUtils } = ChromeUtils.importESModule(
  "resource:///modules/asrouter/ASRouter.sys.mjs"
);
const { RemoteSettings } = ChromeUtils.importESModule(
  "resource://services-settings/remote-settings.sys.mjs"
);
const { EnrollmentType, ExperimentAPI } = ChromeUtils.importESModule(
  "resource://nimbus/ExperimentAPI.sys.mjs"
);
const { NimbusTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/NimbusTestUtils.sys.mjs"
);

const client = RemoteSettings("nimbus-desktop-experiments");
const secureClient = RemoteSettings("nimbus-secure-experiments");
// Making these calls eliminates a lot of noisy EmptyDatabaseErrors.
// TODO(bug 1979320): Remove this:
const dbsReady = Promise.all([
  client.db.importChanges({}, Date.now(), [], {}),
  secureClient.db.importChanges({}, Date.now(), [], {}),
]);

const TEST_MESSAGE_CONTENT = {
  id: "ON_LOAD_TEST_MESSAGE",
  template: "cfr_doorhanger",
  content: {
    bucket_id: "ON_LOAD_TEST_MESSAGE",
    anchor_id: "PanelUI-menu-button",
    layout: "icon_and_message",
    icon: "chrome://activity-stream/content/data/content/assets/glyph-webextension-16.svg",
    icon_dark_theme:
      "chrome://activity-stream/content/data/content/assets/glyph-webextension-16.svg",
    icon_class: "cfr-doorhanger-small-icon",
    heading_text: "Heading",
    text: "Text",
    buttons: {
      primary: {
        label: { value: "Primary CTA", attributes: { accesskey: "P" } },
        action: { navigate: true },
      },
      secondary: [
        {
          label: { value: "Secondary CTA", attributes: { accesskey: "S" } },
          action: { type: "CANCEL" },
        },
      ],
    },
    skip_address_bar_notifier: true,
  },
  targeting: "true",
  trigger: { id: "messagesLoaded" },
};

add_setup(async function () {
  await dbsReady;
  registerCleanupFunction(async () => {
    await client.db.clear();
    await secureClient.db.clear();
  });
});

add_task(async function test_messagesLoaded_reach_experiment() {
  const sandbox = sinon.createSandbox();
  await ASRouter.waitForInitialized;
  await ASRouter._updateMessageProviders();
  await ExperimentAPI._rsLoader.finishedUpdating();
  await ExperimentAPI.ready();

  const sendTriggerSpy = sandbox.spy(ASRouter, "sendTriggerMessage");
  const routeSpy = sandbox.spy(ASRouter, "routeCFRMessage");
  const reachSpy = sandbox.spy(ASRouter, "_recordReachEvent");
  const triggerMatch = sandbox.match({ id: "messagesLoaded" });
  const featureId = "cfr";
  const recipe = NimbusTestUtils.factories.recipe("messages_loaded_test", {
    branches: [
      {
        slug: "control",
        ratio: 1,
        features: [
          {
            featureId,
            value: {
              ...TEST_MESSAGE_CONTENT,
              id: "messages-loaded-test-1",
              recordReach: true,
            },
          },
        ],
      },
      {
        slug: "treatment",
        ratio: 1,
        features: [
          {
            featureId,
            value: {
              ...TEST_MESSAGE_CONTENT,
              id: "messages-loaded-test-2",
              recordReach: true,
            },
          },
        ],
      },
    ],
  });

  await client.db.importChanges({}, Date.now(), [recipe], { clear: true });
  await secureClient.db.importChanges({}, Date.now(), [], { clear: true });
  await SpecialPowers.pushPrefEnv({
    set: [
      ["app.shield.optoutstudies.enabled", true],
      ["datareporting.healthreport.uploadEnabled", true],
      [
        "browser.newtabpage.activity-stream.asrouter.providers.messaging-experiments",
        `{"id":"messaging-experiments","enabled":true,"type":"remote-experiments","updateCycleInMs":0}`,
      ],
    ],
  });
  await ExperimentAPI._rsLoader.updateRecipes("test");

  let metadata = await BrowserTestUtils.waitForCondition(
    () =>
      NimbusFeatures[featureId].getEnrollmentMetadata(
        EnrollmentType.EXPERIMENT
      ),
    "ExperimentAPI should return an experiment"
  );

  const filterFn = m =>
    ["messages-loaded-test-1", "messages-loaded-test-2"].includes(m?.id);
  await BrowserTestUtils.waitForCondition(
    () => ASRouter.state.messages.filter(filterFn).length > 1,
    "Should load the test messages"
  );

  Assert.ok(sendTriggerSpy.calledWith(triggerMatch, true), "Trigger fired");
  Assert.ok(
    routeSpy.calledWith(
      sandbox.match(filterFn),
      gBrowser.selectedBrowser,
      triggerMatch
    ),
    "Trigger routed to the correct message"
  );
  Assert.ok(
    reachSpy.calledWith(sandbox.match(filterFn)),
    "Trigger recorded a reach event"
  );
  const reachMessageId =
    metadata.branch === "control"
      ? "messages-loaded-test-2"
      : "messages-loaded-test-1";
  const reachMessageBranch =
    metadata.branch === "control" ? "treatment" : "control";
  const reachId = `${metadata.slug}:${reachMessageBranch}:${reachMessageId}`;
  Assert.ok(
    MessageLoaderUtils._recordedReachIds.has(reachId),
    "Reach message will not be sent again"
  );

  ExperimentAPI.manager.store._deleteForTests("messages_loaded_test");
  await client.db.importChanges({}, Date.now(), [], { clear: true });
  await ExperimentAPI._rsLoader.updateRecipes("test");
  MessageLoaderUtils._recordedReachIds.clear();
  await ASRouter._updateMessageProviders();
  sandbox.restore();
  await BrowserTestUtils.waitForCondition(
    () =>
      !NimbusFeatures[featureId].getEnrollmentMetadata(
        EnrollmentType.EXPERIMENT
      ),
    "Wait for unenrollment"
  );
});
