/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { PromptTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/PromptTestUtils.sys.mjs"
);

/**
 * Test the about:keyboard UI.
 */

registerCleanupFunction(async function () {
  CustomKeys.resetAll();
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();
});

function addAboutKbTask(task) {
  const wrapped = function () {
    return BrowserTestUtils.withNewTab("about:keyboard", async tab => {
      await SpecialPowers.spawn(tab, [], async () => {
        if (!content.document.getElementById("table").firstElementChild) {
          await ContentTaskUtils.waitForEvent(
            content,
            "CustomKeysUpdate",
            false,
            null,
            true
          );
        }
      });
      await Services.fog.testFlushAllChildren();
      await task(tab);
    });
  };
  // Propagate the name of the task function to our wrapper function so it shows up in test run output.
  Object.defineProperty(wrapped, "name", { value: task.name });
  add_task(wrapped);
}

// Check telemetry before about:keyboard is first opened.
add_task(function testBeforeFirstOpen() {
  ok(!Glean.browserCustomkeys.opened.testGetValue(), "No telemetry for opened");
});

// Test initial loading of about:keyboard.
addAboutKbTask(async function testInit(tab) {
  is(
    Glean.browserCustomkeys.opened.testGetValue(),
    1,
    "Correct telemetry for opened"
  );
  await SpecialPowers.spawn(tab, [], () => {
    Assert.greater(
      content.document.querySelectorAll("tbody").length,
      5,
      "At least 5 categories"
    );
    const numKeys = content.document.querySelectorAll(".key").length;
    Assert.greater(numKeys, 50, "At least 50 keys");
    is(
      content.document.querySelectorAll("tbody[hidden], tr[hidden]").length,
      0,
      "No hidden categories or keys"
    );
    is(
      content.document.querySelectorAll(".customized").length,
      0,
      "No shortcuts are customized"
    );
    // Currently, we don't have any unassigned shortcuts. That will probably
    // change in future, at which point this next assertion will need to be
    // reconsidered.
    is(
      content.document.querySelectorAll(".assigned").length,
      numKeys,
      "All keys are assigned"
    );
    is(
      content.document.querySelectorAll(".editing").length,
      0,
      "No keys are being edited"
    );
    // Make sure that lazy DevTools items have been added.
    ok(
      content.document.querySelector('.key[data-id="key_browserConsole"]'),
      "key_browserConsole is present"
    );
  });
});

// Test searching.
addAboutKbTask(async function testSearch(tab) {
  is(
    Glean.browserCustomkeys.opened.testGetValue(),
    2,
    "Correct telemetry for opened"
  );
  await SpecialPowers.spawn(tab, [], async () => {
    is(
      content.document.querySelectorAll("tbody[hidden], tr[hidden]").length,
      0,
      "No hidden categories or keys"
    );
    const search = content.document.getElementById("search");
    search.focus();

    info("Searching for zzz");
    let updated = ContentTaskUtils.waitForEvent(
      content,
      "CustomKeysUpdate",
      false,
      null,
      true
    );
    EventUtils.sendString("zzz", content);
    await updated;
    is(
      content.document.querySelectorAll(
        "tbody:not([hidden]), .key:not([hidden])"
      ).length,
      0,
      "No visible categories or keys"
    );

    info("Clearing search");
    updated = ContentTaskUtils.waitForEvent(
      content,
      "CustomKeysUpdate",
      false,
      null,
      true
    );
    EventUtils.synthesizeKey("KEY_Escape", {}, content);
    await updated;
    is(
      content.document.querySelectorAll("tbody[hidden], tr[hidden]").length,
      0,
      "No hidden categories or keys"
    );

    info("Searching for download");
    updated = ContentTaskUtils.waitForEvent(
      content,
      "CustomKeysUpdate",
      false,
      null,
      true
    );
    EventUtils.sendString("download", content);
    await updated;
    let visibleKeys = content.document.querySelectorAll(".key:not([hidden])");
    is(visibleKeys.length, 1, "1 visible key");
    is(
      visibleKeys[0].dataset.id,
      "key_openDownloads",
      "Visible key is key_openDownloads"
    );
    let visibleCategories = content.document.querySelectorAll(
      "tbody:not([hidden])"
    );
    is(visibleCategories.length, 1, "1 visible category");
    is(
      visibleKeys[0].closest("tbody"),
      visibleCategories[0],
      "Visible key is inside visible category"
    );
    ok(
      !visibleCategories[0].querySelector(".category").hidden,
      "Category header is visible"
    );

    info("Clearing search");
    updated = ContentTaskUtils.waitForEvent(
      content,
      "CustomKeysUpdate",
      false,
      null,
      true
    );
    EventUtils.synthesizeKey("KEY_Escape", {}, content);
    await updated;
    is(
      content.document.querySelectorAll("tbody[hidden], tr[hidden]").length,
      0,
      "No hidden categories or keys"
    );

    info("Searching for history");
    updated = ContentTaskUtils.waitForEvent(
      content,
      "CustomKeysUpdate",
      false,
      null,
      true
    );
    EventUtils.sendString("history", content);
    await updated;
    // This gives us results from both the Sidebars and History categories.
    visibleKeys = content.document.querySelectorAll(".key:not([hidden])");
    is(visibleKeys.length, 3, "3 visible keys");
    visibleCategories = content.document.querySelectorAll(
      "tbody:not([hidden])"
    );
    is(visibleCategories.length, 2, "2 visible categories");
  });
});

// Test a simple change.
addAboutKbTask(async function testChange(tab) {
  ok(
    !Glean.browserCustomkeys.actions.change.testGetValue(),
    "No telemetry for change action"
  );
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    content.downloadsRow = content.document.querySelector(
      '.key[data-id="key_openDownloads"]'
    );
    ok(
      !content.downloadsRow.classList.contains("customized"),
      "key_openDownloads is not customized"
    );
    is(
      content.downloadsRow.children[1].textContent,
      _consts.downloadsDisplay,
      "Key is the default key"
    );
    info("Clicking Change for key_openDownloads");
    content.input = content.downloadsRow.querySelector(".new");
    let focused = ContentTaskUtils.waitForEvent(content.input, "focus");
    content.change = content.downloadsRow.querySelector(".change");
    content.change.click();
    await focused;
    ok(true, "New key input got focus");
    content.selected = ContentTaskUtils.waitForEvent(content.input, "select");
  });
  await Services.fog.testFlushAllChildren();
  is(
    Glean.browserCustomkeys.actions.change.testGetValue(),
    1,
    "Correct telemetry for change action"
  );
  info(`Pressing ${consts.unusedKey}`);
  EventUtils.synthesizeKey(consts.unusedKey, {}, window);
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    await content.selected;
    is(content.input.value, "Invalid", "Input shows invalid");
    content.selected = ContentTaskUtils.waitForEvent(content.input, "select");
  });
  info(`Pressing ${consts.unusedModifiersDisplay}`);
  EventUtils.synthesizeKey(...consts.unusedModifiersArgs, window);
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    await content.selected;
    is(
      content.input.value,
      _consts.unusedModifiersDisplay,
      "Input shows modifiers as they're pressed"
    );
    content.selected = ContentTaskUtils.waitForEvent(content.input, "select");
  });
  info(`Pressing Shift+${consts.unusedKey}`);
  EventUtils.synthesizeKey(consts.unusedKey, { shiftKey: true }, window);
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    await content.selected;
    is(content.input.value, "Invalid", "Input shows invalid");
    content.selected = ContentTaskUtils.waitForEvent(content.input, "select");
  });
  info(`Pressing ${consts.unusedModifiersDisplay}`);
  EventUtils.synthesizeKey(...consts.unusedModifiersArgs, window);
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    await content.selected;
    is(
      content.input.value,
      _consts.unusedModifiersDisplay,
      "Input shows modifiers as they're pressed"
    );
    content.selected = ContentTaskUtils.waitForEvent(content.input, "select");
  });
  info("Pressing Backspace");
  EventUtils.synthesizeKey("KEY_Backspace", {}, window);
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    await content.selected;
    is(content.input.value, "Invalid", "Input shows invalid");
    content.focused = ContentTaskUtils.waitForEvent(content.change, "focus");
  });
  info(`Pressing ${consts.unusedDisplay}`);
  EventUtils.synthesizeKey(consts.unusedKey, consts.unusedOptions, window);
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    await content.focused;
    ok(true, "Change button got focus");
    ok(
      content.downloadsRow.classList.contains("customized"),
      "key_openDownloads is customized"
    );
    is(
      content.downloadsRow.children[1].textContent,
      _consts.unusedDisplay,
      "Key is the customized key"
    );
  });
  // We deliberately let the result of this test leak into the next one.
});

// Test resetting a key. This also tests that the change from the previous test
// is reflected when the page is reloaded.
addAboutKbTask(async function testReset(tab) {
  ok(
    !Glean.browserCustomkeys.actions.reset.testGetValue(),
    "No telemetry for reset action"
  );
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    const downloadsRow = content.document.querySelector(
      '.key[data-id="key_openDownloads"]'
    );
    ok(
      downloadsRow.classList.contains("customized"),
      "key_openDownloads is customized"
    );
    is(
      downloadsRow.children[1].textContent,
      _consts.unusedDisplay,
      "Key is the customized key"
    );
    info("Clicking Reset for key_openDownloads");
    const reset = downloadsRow.querySelector(".reset");
    let updated = ContentTaskUtils.waitForEvent(
      content,
      "CustomKeysUpdate",
      false,
      null,
      true
    );
    reset.click();
    await updated;
    ok(
      !downloadsRow.classList.contains("customized"),
      "key_openDownloads is not customized"
    );
    is(
      downloadsRow.children[1].textContent,
      _consts.downloadsDisplay,
      "Key is the default key"
    );
  });
  await Services.fog.testFlushAllChildren();
  is(
    Glean.browserCustomkeys.actions.reset.testGetValue(),
    1,
    "Correct telemetry for reset action"
  );
});

// Test clearing a key.
addAboutKbTask(async function testClear(tab) {
  ok(
    !Glean.browserCustomkeys.actions.clear.testGetValue(),
    "No telemetry for clear action"
  );
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    const downloadsRow = content.document.querySelector(
      '.key[data-id="key_openDownloads"]'
    );
    ok(
      !downloadsRow.classList.contains("customized"),
      "key_openDownloads is not customized"
    );
    ok(
      downloadsRow.classList.contains("assigned"),
      "key_openDownloads is assigned"
    );
    info("Clicking Clear for key_openDownloads");
    const clear = downloadsRow.querySelector(".clear");
    let updated = ContentTaskUtils.waitForEvent(
      content,
      "CustomKeysUpdate",
      false,
      null,
      true
    );
    clear.click();
    await updated;
    ok(
      downloadsRow.classList.contains("customized"),
      "key_openDownloads is customized"
    );
    ok(
      !downloadsRow.classList.contains("assigned"),
      "key_openDownloads is not assigned"
    );
    is(downloadsRow.children[1].textContent, "", "Key is empty");
  });
  await Services.fog.testFlushAllChildren();
  is(
    Glean.browserCustomkeys.actions.clear.testGetValue(),
    1,
    "Correct telemetry for clear action"
  );
  // We deliberately let the result of this test leak into the next one.
});

// Test resetting all keys. This depends on the state set up by the previous
// test.
addAboutKbTask(async function testResetAll(tab) {
  ok(
    !Glean.browserCustomkeys.actions.reset_all.testGetValue(),
    "No telemetry for reset all action"
  );
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    content.downloadsRow = content.document.querySelector(
      '.key[data-id="key_openDownloads"]'
    );
    ok(
      content.downloadsRow.classList.contains("customized"),
      "key_openDownloads is customized"
    );
    ok(
      !content.downloadsRow.classList.contains("assigned"),
      "key_openDownloads is not assigned"
    );
  });

  info("Clicking Reset all, then Cancel");
  let handled = PromptTestUtils.handleNextPrompt(
    window,
    { modalType: Services.prompt.MODAL_TYPE_CONTENT },
    { buttonNumClick: 1 }
  );
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    content.resetAll = content.document.getElementById("resetAll");
    content.resetAll.click();
  });
  await handled;
  await Services.fog.testFlushAllChildren();
  is(
    Glean.browserCustomkeys.actions.reset_all.testGetValue(),
    1,
    "Correct telemetry for reset all action"
  );
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    ok(
      content.downloadsRow.classList.contains("customized"),
      "key_openDownloads is customized"
    );
    ok(
      !content.downloadsRow.classList.contains("assigned"),
      "key_openDownloads is not assigned"
    );

    info("Clicking Reset all, then OK");
    content.updated = ContentTaskUtils.waitForEvent(
      content,
      "CustomKeysUpdate",
      false,
      null,
      true
    );
  });

  handled = PromptTestUtils.handleNextPrompt(
    window,
    { modalType: Services.prompt.MODAL_TYPE_CONTENT },
    { buttonNumClick: 0 }
  );
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    content.resetAll.click();
  });
  await handled;
  await Services.fog.testFlushAllChildren();
  is(
    Glean.browserCustomkeys.actions.reset_all.testGetValue(),
    2,
    "Correct telemetry for reset all action"
  );
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    await content.updated;
    ok(
      !content.downloadsRow.classList.contains("customized"),
      "key_openDownloads is not customized"
    );
    ok(
      content.downloadsRow.classList.contains("assigned"),
      "key_openDownloads is assigned"
    );
  });
});

// Test a change which conflicts with another key.
addAboutKbTask(async function testConflictingChange(tab) {
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    content.downloadsRow = content.document.querySelector(
      '.key[data-id="key_openDownloads"]'
    );
    ok(
      !content.downloadsRow.classList.contains("customized"),
      "key_openDownloads is not customized"
    );
    content.historyRow = content.document.querySelector(
      '.key[data-id="key_gotoHistory"]'
    );
    ok(
      !content.historyRow.classList.contains("customized"),
      "key_gotoHistory is not customized"
    );

    info("Clicking Change for key_openDownloads");
    content.input = content.downloadsRow.querySelector(".new");
    let focused = ContentTaskUtils.waitForEvent(content.input, "focus");
    content.change = content.downloadsRow.querySelector(".change");
    content.change.click();
    await focused;
    ok(true, "New key input got focus");
    content.focused = ContentTaskUtils.waitForEvent(content.change, "focus");
  });
  await Services.fog.testFlushAllChildren();
  is(
    Glean.browserCustomkeys.actions.change.testGetValue(),
    2,
    "Correct telemetry for change action"
  );
  info(`Pressing ${consts.historyDisplay}, then clicking Cancel`);
  let handled = PromptTestUtils.handleNextPrompt(
    window,
    { modalType: Services.prompt.MODAL_TYPE_CONTENT },
    { buttonNumClick: 1 }
  );
  EventUtils.synthesizeKey("H", consts.historyOptions, window);
  await handled;
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    await content.focused;
    ok(true, "Change button got focus");
    ok(
      !content.downloadsRow.classList.contains("customized"),
      "key_openDownloads is not customized"
    );
    ok(
      !content.historyRow.classList.contains("customized"),
      "key_gotoHistory is not customized"
    );

    info("Clicking Change for key_openDownloads");
    let focused = ContentTaskUtils.waitForEvent(content.input, "focus");
    content.change.click();
    await focused;
    ok(true, "New key input got focus");
    content.focused = ContentTaskUtils.waitForEvent(content.change, "focus");
  });
  await Services.fog.testFlushAllChildren();
  is(
    Glean.browserCustomkeys.actions.change.testGetValue(),
    3,
    "Correct telemetry for change action"
  );
  info(`Pressing ${consts.historyDisplay}, then clicking OK`);
  handled = PromptTestUtils.handleNextPrompt(
    window,
    { modalType: Services.prompt.MODAL_TYPE_CONTENT },
    { buttonNumClick: 0 }
  );
  EventUtils.synthesizeKey("H", consts.historyOptions, window);
  await handled;
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    await content.focused;
    ok(true, "Change button got focus");
    ok(
      content.downloadsRow.classList.contains("customized"),
      "key_openDownloads is customized"
    );
    ok(
      content.downloadsRow.classList.contains("assigned"),
      "key_openDownloads is assigned"
    );
    is(
      content.downloadsRow.children[1].textContent,
      _consts.historyDisplay,
      "Key is the customized key"
    );
    ok(
      content.historyRow.classList.contains("customized"),
      "key_gotoHistory is customized"
    );
    ok(
      !content.historyRow.classList.contains("assigned"),
      "key_gotoHistory is not assigned"
    );
    is(content.historyRow.children[1].textContent, "", "Key is empty");
  });
  // We deliberately let the result of this test leak into the next one.
});

// Test a reset which conflicts with another key. This depends on the state set
// up by the previous test.
addAboutKbTask(async function testConflictingReset(tab) {
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    content.downloadsRow = content.document.querySelector(
      '.key[data-id="key_openDownloads"]'
    );
    ok(
      content.downloadsRow.classList.contains("customized"),
      "key_openDownloads is customized"
    );
    content.historyRow = content.document.querySelector(
      '.key[data-id="key_gotoHistory"]'
    );
    ok(
      content.historyRow.classList.contains("customized"),
      "key_gotoHistory is customized"
    );
  });

  info("Clicking Reset for key_gotoHistory, then Cancel");
  let handled = PromptTestUtils.handleNextPrompt(
    window,
    { modalType: Services.prompt.MODAL_TYPE_CONTENT },
    { buttonNumClick: 1 }
  );
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    content.reset = content.historyRow.querySelector(".reset");
    content.reset.click();
  });
  await handled;
  await Services.fog.testFlushAllChildren();
  is(
    Glean.browserCustomkeys.actions.reset.testGetValue(),
    2,
    "Correct telemetry for reset action"
  );
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    ok(
      content.downloadsRow.classList.contains("customized"),
      "key_openDownloads is customized"
    );
    ok(
      content.historyRow.classList.contains("customized"),
      "key_gotoHistory is customized"
    );
  });

  info("Clicking Reset for key_gotoHistory, then OK");
  handled = PromptTestUtils.handleNextPrompt(
    window,
    { modalType: Services.prompt.MODAL_TYPE_CONTENT },
    { buttonNumClick: 0 }
  );
  await SpecialPowers.spawn(tab, [], async () => {
    content.updated = ContentTaskUtils.waitForEvent(
      content,
      "CustomKeysUpdate",
      false,
      null,
      true
    );
    content.reset.click();
  });
  await handled;
  await Services.fog.testFlushAllChildren();
  is(
    Glean.browserCustomkeys.actions.reset.testGetValue(),
    3,
    "Correct telemetry for reset action"
  );
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    await content.updated;
    ok(
      content.downloadsRow.classList.contains("customized"),
      "key_openDownloads is customized"
    );
    ok(
      !content.downloadsRow.classList.contains("assigned"),
      "key_openDownloads is not assigned"
    );
    is(content.downloadsRow.children[1].textContent, "", "Key is empty");
    ok(
      !content.historyRow.classList.contains("customized"),
      "key_gotoHistory is not customized"
    );
    ok(
      content.historyRow.classList.contains("assigned"),
      "key_gotoHistory is assigned"
    );
    is(
      content.historyRow.children[1].textContent,
      _consts.historyDisplay,
      "Key is the default key"
    );
  });

  CustomKeys.resetAll();
});

// Test that a reserved key is captured correctly.
addAboutKbTask(async function testReservedKey(tab) {
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    content.downloadsRow = content.document.querySelector(
      '.key[data-id="key_openDownloads"]'
    );
    info("Clicking Change for key_openDownloads");
    content.input = content.downloadsRow.querySelector(".new");
    let focused = ContentTaskUtils.waitForEvent(content.input, "focus");
    content.change = content.downloadsRow.querySelector(".change");
    content.change.click();
    await focused;
    ok(true, "New key input got focus");
    content.focused = ContentTaskUtils.waitForEvent(content.change, "focus");
  });
  await Services.fog.testFlushAllChildren();
  is(
    Glean.browserCustomkeys.actions.change.testGetValue(),
    4,
    "Correct telemetry for change action"
  );
  info(`Pressing ${consts.newWindowDisplay}, then clicking Cancel`);
  let handled = PromptTestUtils.handleNextPrompt(
    window,
    { modalType: Services.prompt.MODAL_TYPE_CONTENT },
    { buttonNumClick: 1 }
  );
  EventUtils.synthesizeKey("N", { accelKey: true }, window);
  await handled;
  await SpecialPowers.spawn(tab, [], async () => {
    await content.focused;
    ok(true, "Change button got focus");
  });
});

// Test that changing to a function key works correctly; i.e. that we handle key
// vs keycode.
addAboutKbTask(async function testFunctionKey(tab) {
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    content.downloadsRow = content.document.querySelector(
      '.key[data-id="key_openDownloads"]'
    );
    ok(
      !content.downloadsRow.classList.contains("customized"),
      "key_openDownloads is not customized"
    );
    info("Clicking Change for key_openDownloads");
    content.input = content.downloadsRow.querySelector(".new");
    let focused = ContentTaskUtils.waitForEvent(content.input, "focus");
    content.change = content.downloadsRow.querySelector(".change");
    content.change.click();
    await focused;
    ok(true, "New key input got focus");
    content.focused = ContentTaskUtils.waitForEvent(content.change, "focus");
  });
  await Services.fog.testFlushAllChildren();
  is(
    Glean.browserCustomkeys.actions.change.testGetValue(),
    5,
    "Correct telemetry for change action"
  );
  info("Pressing F1");
  EventUtils.synthesizeKey("KEY_F1", {}, window);
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    await content.focused;
    ok(true, "Change button got focus");
    ok(
      content.downloadsRow.classList.contains("customized"),
      "key_openDownloads is customized"
    );
    is(
      content.downloadsRow.children[1].textContent,
      "F1",
      "Key is the customized key"
    );
  });
  CustomKeys.resetAll();
});

// Test that changing to an arrow key works correctly.
addAboutKbTask(async function testFunctionKey(tab) {
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    content.backRow = content.document.querySelector(
      '.key[data-id="goBackKb"]'
    );
    ok(
      !content.backRow.classList.contains("customized"),
      "goBackKb is not customized"
    );
    info("Clicking Change for goBackKb");
    content.input = content.backRow.querySelector(".new");
    let focused = ContentTaskUtils.waitForEvent(content.input, "focus");
    content.change = content.backRow.querySelector(".change");
    content.change.click();
    await focused;
    ok(true, "New key input got focus");
    content.focused = ContentTaskUtils.waitForEvent(content.change, "focus");
  });
  await Services.fog.testFlushAllChildren();
  is(
    Glean.browserCustomkeys.actions.change.testGetValue(),
    6,
    "Correct telemetry for change action"
  );
  info(`Pressing ${consts.backDisplay}`);
  EventUtils.synthesizeKey(...consts.backArgs, window);
  await SpecialPowers.spawn(tab, [consts], async _consts => {
    await content.focused;
    ok(true, "Change button got focus");
    ok(
      !content.backRow.classList.contains("customized"),
      "goBackKb is not customized"
    );
    is(
      content.backRow.children[1].textContent,
      _consts.backDisplay,
      "Key is the default key"
    );
  });
});
