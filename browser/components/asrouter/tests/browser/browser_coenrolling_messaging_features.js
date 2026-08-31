/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { ASRouter, MessageLoaderUtils } = ChromeUtils.importESModule(
  "resource:///modules/asrouter/ASRouter.sys.mjs"
);
const { RemoteSettings } = ChromeUtils.importESModule(
  "resource://services-settings/remote-settings.sys.mjs"
);
const { ExperimentAPI } = ChromeUtils.importESModule(
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

add_setup(async function () {
  await dbsReady;
  registerCleanupFunction(async () => {
    await client.db.clear();
    await secureClient.db.clear();
  });
});

add_task(async function testCoenrollingMessagingFeatures() {
  const sandbox = sinon.createSandbox();
  await ASRouter.waitForInitialized;
  await ASRouter._updateMessageProviders();
  await ExperimentAPI._rsLoader.finishedUpdating();
  await ExperimentAPI.ready();

  Assert.strictEqual(
    ExperimentAPI.manager.store.getAllActiveExperiments().length,
    0,
    "Clean state"
  );

  const featureId = "fxms-message";
  const featureAPI = NimbusFeatures[featureId];

  let exposureStub = sandbox.stub(featureAPI, "recordExposureEvent");
  let reachSpy = sandbox.spy(ASRouter, "_recordReachEvent");

  const recipe1 = NimbusTestUtils.factories.recipe("experiment-1", {
    branches: [
      {
        slug: "control",
        ratio: 1,
        features: [
          {
            featureId,
            value: {
              id: "MESSAGE_1_CONTROL",
              recordReach: true,
              template: "spotlight",
              trigger: { id: "fakeTrigger" },
              targeting: "true",
              groups: [],
              content: {},
            },
          },
        ],
      },
      {
        slug: "treatment-a",
        ratio: 1,
        features: [
          {
            featureId,
            value: {
              id: "MESSAGE_1_TREATMENT_A",
              recordReach: true,
              template: "spotlight",
              trigger: { id: "fakeTrigger" },
              targeting: "true",
              groups: [],
              content: {},
            },
          },
        ],
      },
    ],
  });

  await client.db.importChanges({}, Date.now(), [recipe1], { clear: true });
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

  const enrollment1 = await BrowserTestUtils.waitForCondition(
    () =>
      [...featureAPI.getAllEnrollments()].find(
        ({ meta }) => meta.slug === "experiment-1"
      ),
    "Should be enrolled in experiment-1"
  );

  let messages = await BrowserTestUtils.waitForCondition(
    () => ASRouter.state.messages.find(m => m._nimbusFeature === featureId),
    "Should load the test messages"
  );
  ok(messages, "Should load messages for the experiment");

  await ASRouter.sendTriggerMessage({ id: "fakeTrigger" });

  ok(
    exposureStub.calledWithMatch({ slug: "experiment-1" }),
    "Should record exposure for experiment-1"
  );

  ok(reachSpy.calledOnce, "Should record reach event");
  const [reachMessage] = reachSpy.firstCall.args;
  const expectedReachMessageId =
    enrollment1.meta.branch === "control"
      ? "MESSAGE_1_TREATMENT_A"
      : "MESSAGE_1_CONTROL";
  is(
    reachMessage.id,
    expectedReachMessageId,
    "Reach event should be recorded for the correct message"
  );
  // We expect this message to get removed from ASRouter state on the next
  // refresh, because it gets added to MessageLoaderUtils._recordedReachIds, and
  // anything added there gets filtered out by _experimentsAPILoader.
  const reachId = `experiment-1:${reachMessage._branchSlug}:${reachMessage.id}`;
  ok(
    MessageLoaderUtils._recordedReachIds.has(reachId),
    "Message ID should be added to _recordedReachIds"
  );

  // Now try enrolling in another experiment with the same feature.
  Assert.lessOrEqual(
    ASRouter.state.messages.filter(m => m._nimbusFeature === featureId).length,
    2,
    "Should have messages from only one experiment before enrolling in the second one"
  );

  const recipe2 = NimbusTestUtils.factories.recipe("experiment-2", {
    branches: [
      {
        slug: "control",
        ratio: 1,
        features: [
          {
            featureId,
            value: {
              template: "multi",
              messages: [
                {
                  id: "MESSAGE_2_CONTROL_1",
                  recordReach: true,
                  template: "spotlight",
                  trigger: { id: "fakeTrigger" },
                  targeting: "true",
                  groups: [],
                  content: {},
                },
                {
                  id: "MESSAGE_2_CONTROL_2",
                  recordReach: true,
                  template: "spotlight",
                  trigger: { id: "fakeTrigger" },
                  targeting: "true",
                  groups: [],
                  content: {},
                },
              ],
            },
          },
        ],
      },
      {
        slug: "treatment-a",
        ratio: 1,
        features: [
          {
            featureId,
            value: {
              template: "multi",
              messages: [
                {
                  id: "MESSAGE_2_TREATMENT_A_1",
                  recordReach: true,
                  template: "spotlight",
                  trigger: { id: "fakeTrigger" },
                  targeting: "true",
                  groups: [],
                  content: {},
                },
                {
                  id: "MESSAGE_2_TREATMENT_B_2",
                  recordReach: true,
                  template: "spotlight",
                  trigger: { id: "fakeTrigger" },
                  targeting: "true",
                  groups: [],
                  content: {},
                },
              ],
            },
          },
        ],
      },
    ],
  });

  await client.db.importChanges({}, Date.now(), [recipe1, recipe2], {
    clear: true,
  });
  await ExperimentAPI._rsLoader.updateRecipes("test");

  await BrowserTestUtils.waitForCondition(
    () =>
      ASRouter.state.messages.filter(m => m._nimbusFeature === featureId)
        .length > 2,
    "Should load the test messages"
  );

  let nimbusMessages = ASRouter.state.messages.filter(
    m => m._nimbusFeature === featureId
  );
  is(nimbusMessages.length, 5, "Should have messages from both experiments");
  // Check that there are two _nimbusSlug values among the messages, one for
  // each experiment, and that they match the enrolled branches.
  await BrowserTestUtils.waitForCondition(
    () =>
      [...featureAPI.getAllEnrollments()].find(
        ({ meta }) => meta.slug === "experiment-2"
      ),
    "Should be enrolled in experiment-2"
  );
  let enrollments = featureAPI.getAllEnrollments();
  const slugs = new Set(nimbusMessages.map(m => m._nimbusSlug));
  for (const enrollment of enrollments) {
    ok(
      slugs.has(enrollment.meta.slug),
      `Should have a message from ${enrollment.meta.slug}`
    );
  }
  ok(
    !nimbusMessages.find(m => m.id === expectedReachMessageId),
    "Message that recorded the reach event earlier should no longer be in ASRouter state"
  );

  ExperimentAPI.manager.store._deleteForTests("experiment-1");
  ExperimentAPI.manager.store._deleteForTests("experiment-2");
  await client.db.importChanges({}, Date.now(), [], { clear: true });
  await ExperimentAPI._rsLoader.updateRecipes("test");
  MessageLoaderUtils._recordedReachIds.clear();
  await ASRouter._updateMessageProviders();
  sandbox.restore();
  await BrowserTestUtils.waitForCondition(
    () => ![...featureAPI.getAllEnrollments()].length,
    "Wait for unenrollment"
  );
});
