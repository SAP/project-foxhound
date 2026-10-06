/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/preferences/tests/head.js",
  this
);

async function openEtpPage() {
  await openPreferencesViaOpenPreferencesAPI("etp", { leaveOpen: true });
  let doc = gBrowser.contentDocument;
  await BrowserTestUtils.waitForCondition(
    () => doc.getElementById("contentBlockingCategoryRadioGroup"),
    "Wait for the ETP advanced radio group to render"
  );
  return {
    win: gBrowser.contentWindow,
    doc,
    tab: gBrowser.selectedTab,
  };
}

async function openEtpCustomizePage() {
  await openPreferencesViaOpenPreferencesAPI("etpCustomize", {
    leaveOpen: true,
  });
  let doc = gBrowser.contentDocument;
  await BrowserTestUtils.waitForCondition(
    () => doc.getElementById("etpAllowListBaselineEnabledCustom"),
    "Wait for the ETP customize controls to render"
  );
  return {
    win: gBrowser.contentWindow,
    doc,
  };
}

async function clickEtpBaselineCheckboxWithConfirm(
  doc,
  controlId,
  prefName,
  expectedValue,
  buttonNumClick
) {
  let checkbox = getControl(doc, controlId);

  let promptPromise = PromptTestUtils.handleNextPrompt(
    gBrowser.selectedBrowser,
    { modalType: Services.prompt.MODAL_TYPE_CONTENT },
    { buttonNumClick }
  );

  let prefChangePromise = null;
  if (buttonNumClick === 1) {
    prefChangePromise = waitForAndAssertPrefState(
      prefName,
      expectedValue,
      `${prefName} updated`
    );
  }

  synthesizeClick(checkbox);

  await promptPromise;

  if (prefChangePromise) {
    await prefChangePromise;
  }

  is(
    checkbox.checked,
    expectedValue,
    `Checkbox ${controlId} should be ${expectedValue}`
  );

  return checkbox;
}

// Ensure each test leaves the sidebar in its initial state when it completes

function getControl(doc, id) {
  let control = doc.getElementById(id);
  ok(control, `Control ${id} exists`);
  return control;
}

function getControlWrapper(doc, id) {
  return getControl(doc, id).closest("setting-control");
}
