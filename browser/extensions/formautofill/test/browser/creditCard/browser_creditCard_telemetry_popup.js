"use strict";

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/extensions/formautofill/test/browser/creditCard/browser_telemetry_utils.js",
  this
);

add_task(async function test_popup_opened() {
  const cleanupFunc = await setupTask(
    {
      set: [
        [ENABLED_AUTOFILL_CREDITCARDS_PREF, true],
        [AUTOFILL_CREDITCARDS_AVAILABLE_PREF, "on"],
      ],
    },
    TEST_CREDIT_CARD_1
  );

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: CREDITCARD_FORM_URL },
    async function (browser) {
      await openPopupOn(browser, "#cc-number");
      await closePopup(browser);

      // flushing Glean data within withNewTab callback before tab removal (see Bug 1843178)
      await Services.fog.testFlushAllChildren();
    }
  );

  let expectedFormEvents = [
    ccFormArgsv2("detected", buildccFormv2Extra({ cc_exp: "false" }, "true")),
    ccFormArgsv2("popup_shown", { field_name: "cc-number" }),
  ];
  await assertTelemetry(undefined, expectedFormEvents);
  assertFormInteractionEventsInGlean(expectedFormEvents);
  assertDetectedCcNumberFieldsCountInGlean([
    { label: "cc_number_fields_1", count: 1 },
  ]);

  await cleanupFunc();
});

add_task(async function test_popup_opened_form_without_autocomplete() {
  const cleanupFunc = await setupTask(
    {
      set: [
        [ENABLED_AUTOFILL_CREDITCARDS_PREF, true],
        [AUTOFILL_CREDITCARDS_AVAILABLE_PREF, "on"],
        [
          "extensions.formautofill.creditCards.heuristics.fathom.testConfidence",
          "1",
        ],
      ],
    },
    TEST_CREDIT_CARD_1
  );

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: CREDITCARD_FORM_WITHOUT_AUTOCOMPLETE_URL },
    async function (browser) {
      await openPopupOn(browser, "#cc-number");
      await closePopup(browser);

      // flushing Glean data within withNewTab callback before tab removal (see Bug 1843178)
      await Services.fog.testFlushAllChildren();
    }
  );

  let expectedFormEvents = [
    ccFormArgsv2(
      "detected",
      buildccFormv2Extra({ cc_number: "1", cc_name: "1", cc_exp: "false" }, "0")
    ),
    ccFormArgsv2("popup_shown", { field_name: "cc-number" }),
  ];
  await assertTelemetry(undefined, expectedFormEvents);
  assertFormInteractionEventsInGlean(expectedFormEvents);

  await cleanupFunc();
});
