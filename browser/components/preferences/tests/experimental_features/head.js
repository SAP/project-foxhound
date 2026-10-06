/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/preferences/tests/head.js",
  this
);

const DEFAULT_LABS_RECIPES = [
  NimbusTestUtils.factories.recipe("nimbus-qa-1", {
    targeting: "true",
    isRollout: true,
    isFirefoxLabsOptIn: true,
    firefoxLabsTitle: "experimental-features-ime-search",
    firefoxLabsDescription: "experimental-features-ime-search-description",
    firefoxLabsDescriptionLinks: null,
    firefoxLabsGroup: "experimental-features-group-customize-browsing",
    requiresRestart: false,
    branches: [
      {
        slug: "control",
        ratio: 1,
        features: [
          {
            featureId: "nimbus-qa-1",
            value: {
              value: "recipe-value-1",
            },
          },
        ],
      },
    ],
  }),

  NimbusTestUtils.factories.recipe("nimbus-qa-2", {
    targeting: "true",
    isRollout: true,
    isFirefoxLabsOptIn: true,
    firefoxLabsTitle: "experimental-features-media-jxl",
    firefoxLabsDescription: "experimental-features-media-jxl-description",
    firefoxLabsDescriptionLinks: {
      bugzilla: "https://example.com",
    },
    firefoxLabsGroup: "experimental-features-group-webpage-display",
    branches: [
      {
        slug: "control",
        ratio: 1,
        features: [
          {
            featureId: "nimbus-qa-2",
            value: {
              value: "recipe-value-2",
            },
          },
        ],
      },
    ],
  }),

  NimbusTestUtils.factories.recipe("targeting-false", {
    targeting: "false",
    isRollout: true,
    isFirefoxLabsOptIn: true,
    firefoxLabsTitle: "experimental-features-ime-search",
    firefoxLabsDescription: "experimental-features-ime-search-description",
    firefoxLabsDescriptionLinks: null,
    firefoxLabsGroup: "experimental-features-group-developer-tools",
    requiresRestart: false,
  }),

  NimbusTestUtils.factories.recipe("bucketing-false", {
    bucketConfig: {
      ...NimbusTestUtils.factories.recipe.bucketConfig,
      count: 0,
    },
    isRollout: true,
    targeting: "true",
    isFirefoxLabsOptIn: true,
    firefoxLabsTitle: "experimental-features-ime-search",
    firefoxLabsDescription: "experimental-features-ime-search-description",
    firefoxLabsDescriptionLinks: null,
    firefoxLabsGroup: "experimental-features-group-developer-tools",
    requiresRestart: false,
  }),
];

async function setupLabsTest(recipes) {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["app.normandy.run_interval_seconds", 0],
      ["app.shield.optoutstudies.enabled", true],
      ["datareporting.healthreport.uploadEnabled", true],
      ["messaging-system.log", "debug"],
    ],
    clear: [
      ["browser.preferences.experimental"],
      ["browser.preferences.experimental.hidden"],
    ],
  });
  // Initialize Nimbus and wait for the RemoteSettingsExperimentLoader to finish
  // updating (with no recipes).
  await ExperimentAPI.ready();
  await ExperimentAPI._rsLoader.finishedUpdating();

  // Inject some recipes into the Remote Settings client and call
  // updateRecipes() so that we have available opt-ins.
  await ExperimentAPI._rsLoader.remoteSettingsClients.experiments.db.importChanges(
    {},
    Date.now(),
    recipes ?? DEFAULT_LABS_RECIPES,
    { clear: true }
  );
  await ExperimentAPI._rsLoader.remoteSettingsClients.secureExperiments.db.importChanges(
    {},
    Date.now(),
    [],
    { clear: true }
  );

  await ExperimentAPI._rsLoader.updateRecipes("test");

  return async function cleanup() {
    await NimbusTestUtils.removeStore(ExperimentAPI.manager.store);
    await SpecialPowers.popPrefEnv();
  };
}

function promiseNimbusStoreUpdate(wantedSlug, wantedActive) {
  const deferred = Promise.withResolvers();
  const listener = (_event, { slug, active }) => {
    info(
      `promiseNimbusStoreUpdate: received update for ${slug} active=${active}`
    );
    if (slug === wantedSlug && active === wantedActive) {
      ExperimentAPI._manager.store.off("update", listener);
      deferred.resolve();
    }
  };

  ExperimentAPI._manager.store.on("update", listener);
  return deferred.promise;
}

function enrollByClick(el, wantedActive) {
  const slug = el.dataset.nimbusSlug;

  info(`Enrolling in ${slug}:${el.dataset.nimbusBranchSlug}...`);

  const promise = promiseNimbusStoreUpdate(slug, wantedActive);
  el.scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(el.inputEl, {}, gBrowser.contentWindow);
  return promise;
}

/**
 * Clicks a checkbox and waits for the associated preference to change to the expected value.
 *
 * @param {Document} doc - The content document.
 * @param {string} checkboxId - The checkbox element id.
 * @param {string} prefName - The preference name.
 * @param {boolean} expectedValue - The expected value after click.
 * @returns {Promise<HTMLInputElement>}
 */
