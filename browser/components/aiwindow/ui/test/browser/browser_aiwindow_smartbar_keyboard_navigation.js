/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const isWindows = AppConstants.platform == "win";

async function getSelectionStart(browser) {
  return SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Wait for Smartbar to be rendered"
    );
    return smartbar.inputField.selectionStart;
  });
}

/**
 * Walks the activeElement chain across shadow-DOM boundaries in the
 * content document. Returns each element's localName and id so the
 * result is serializable across the process boundary.
 *
 * @param {MozBrowser} browser
 * @returns {Promise<Array<{localName: string, id: string}>>}
 */
async function getFocusChain(browser) {
  return SpecialPowers.spawn(browser, [], () => {
    const chain = [];
    let root = content.document;
    while (root?.activeElement) {
      chain.push({
        localName: root.activeElement.localName,
        id: root.activeElement.id,
      });
      root = root.activeElement.shadowRoot;
    }
    return chain;
  });
}

/**
 * Polls until the activeElement chain matches a predicate.
 *
 * @param {MozBrowser} browser
 * @param {(chain: Array<{localName: string, id: string}>) => boolean} predicate
 * @param {string} message
 */
async function waitForFocusChain(browser, predicate, message) {
  return BrowserTestUtils.waitForCondition(async () => {
    return predicate(await getFocusChain(browser));
  }, message);
}

add_task(async function test_smartbar_keyboard_horizontal_arrows() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await typeInSmartbar(browser, "abc");

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Wait for Smartbar to be rendered"
    );
    smartbar.inputField.setSelectionRange(0, 0);
  });

  await BrowserTestUtils.synthesizeKey("KEY_ArrowRight", {}, browser);
  is(
    await getSelectionStart(browser),
    1,
    "ArrowRight moves cursor forward by one"
  );

  await BrowserTestUtils.synthesizeKey("KEY_ArrowLeft", {}, browser);
  is(await getSelectionStart(browser), 0, "ArrowLeft moves cursor back by one");

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_keyboard_vertical_arrows() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Wait for Smartbar to be rendered"
    );

    // not using typeInSmartbar because we need the line break
    smartbar.inputField.value = "Line 1\nLine 2";
    await new Promise(r => content.requestAnimationFrame(r));
    smartbar.inputField.setSelectionRange(3, 3);
  });

  // TODO(bug 2022453): On Windows, ArrowDown/Up open suggestions instead of
  // moving the cursor between lines but probably should be cross platform.
  await BrowserTestUtils.synthesizeKey("KEY_ArrowDown", {}, browser);
  Assert.greaterOrEqual(
    await getSelectionStart(browser),
    isWindows ? 3 : 7,
    "ArrowDown moves to second line"
  );

  await BrowserTestUtils.synthesizeKey("KEY_ArrowUp", {}, browser);
  Assert.less(
    await getSelectionStart(browser),
    7,
    "ArrowUp moves to first line"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_sidebar_keyboard_horizontal_arrows() {
  const { win, sidebarBrowser } = await openAIWindowWithSidebar();

  await typeInSmartbar(sidebarBrowser, "abc");
  await SpecialPowers.spawn(sidebarBrowser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement?.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Sidebar smartbar should be loaded"
    );
    smartbar.inputField.setSelectionRange(0, 0);
  });

  await BrowserTestUtils.synthesizeKey("KEY_ArrowRight", {}, sidebarBrowser);
  is(
    await getSelectionStart(sidebarBrowser),
    1,
    "ArrowRight moves cursor forward by one"
  );

  await BrowserTestUtils.synthesizeKey("KEY_ArrowLeft", {}, sidebarBrowser);
  is(
    await getSelectionStart(sidebarBrowser),
    0,
    "ArrowLeft moves cursor back by one"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_sidebar_keyboard_vertical_arrows() {
  const { win, sidebarBrowser } = await openAIWindowWithSidebar();

  await SpecialPowers.spawn(sidebarBrowser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement?.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Sidebar smartbar should be loaded"
    );

    // not using typeInSmartbar because we need the line break
    smartbar.inputField.value = "Line 1\nLine 2";
    await new Promise(r => content.requestAnimationFrame(r));
    smartbar.inputField.setSelectionRange(3, 3);
  });

  // TODO(bug 2022453): On Windows, ArrowDown/Up open suggestions instead of
  // moving the cursor between lines but probably should be cross platform.
  await BrowserTestUtils.synthesizeKey("KEY_ArrowDown", {}, sidebarBrowser);
  Assert.greaterOrEqual(
    await getSelectionStart(sidebarBrowser),
    isWindows ? 3 : 7,
    "ArrowDown moves to second line"
  );

  await BrowserTestUtils.synthesizeKey("KEY_ArrowUp", {}, sidebarBrowser);
  Assert.less(
    await getSelectionStart(sidebarBrowser),
    7,
    "ArrowUp moves to first line"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_input_cta_dropdown_keeps_suggestions_open() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await promiseSmartbarSuggestionsOpen(browser, () =>
    typeInSmartbar(browser, "hello")
  );

  const { viewOpenBeforeMove, viewOpenAfterMove } = await SpecialPowers.spawn(
    browser,
    [],
    async () => {
      const aiWindowElement = content.document.querySelector("ai-window");
      const smartbar = await ContentTaskUtils.waitForCondition(
        () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
        "Wait for Smartbar"
      );
      const inputCta = smartbar.querySelector("input-cta");
      const mozButton = inputCta.shadowRoot.querySelector("moz-button");
      const chevron = await ContentTaskUtils.waitForCondition(
        () => mozButton.shadowRoot.querySelector("#chevron-button"),
        "Wait for chevron button"
      );

      const panelList = inputCta.shadowRoot.querySelector("panel-list");
      const panelShown = new Promise(resolve =>
        panelList.addEventListener("shown", resolve, { once: true })
      );
      chevron.click();
      await panelShown;

      const isOpenBeforeMove = smartbar.hasAttribute("open");
      inputCta.focus();
      await new Promise(r => content.setTimeout(r, 0));

      return {
        viewOpenBeforeMove: isOpenBeforeMove,
        viewOpenAfterMove: smartbar.hasAttribute("open"),
      };
    }
  );

  ok(
    viewOpenBeforeMove,
    "Suggestions view should be open when input-cta dropdown is open"
  );
  ok(
    viewOpenAfterMove,
    "Suggestions view should stay open after focus moves into input-cta dropdown"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_tab_from_last_result_to_action_button() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await promiseSmartbarSuggestionsOpen(browser, () =>
    typeInSmartbar(browser, "hello")
  );

  // Pre-select the last suggestion so a single Tab triggers the transition.
  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    // Land on the very last selectable element (which may be a menu
    // button within the last row, not the row content), so Tab hits
    // the cycle boundary.
    smartbar.view.selectedRowIndex = -1;
    smartbar.view.selectBy(1, { reverse: true, userPressedTab: true });
  });

  await BrowserTestUtils.synthesizeKey("KEY_Tab", {}, browser);

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    Assert.ok(
      smartbar.hasAttribute("open"),
      "Suggestions view should stay open when focus moves to action buttons"
    );
  });

  await waitForFocusChain(
    browser,
    chain => chain.some(el => el.localName === "context-icon-button"),
    "Tab past the last suggestion should focus the context-icon-button"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(
  async function test_smartbar_tab_from_last_action_wraps_to_first_result() {
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await promiseSmartbarSuggestionsOpen(browser, () =>
      typeInSmartbar(browser, "hello")
    );

    // Move focus to the last action button (input-cta) with view open.
    await SpecialPowers.spawn(browser, [], async () => {
      const aiWindowElement = content.document.querySelector("ai-window");
      const smartbar = aiWindowElement.shadowRoot.querySelector(
        "#ai-window-smartbar"
      );
      smartbar.focusLastActionButton();
    });

    // Tab through any remaining focusables inside the last action button
    // (e.g. an input-cta split-button chevron) until focus wraps back into
    // the result list.
    for (let i = 0; i < 5; i++) {
      const wrapped = await SpecialPowers.spawn(browser, [], async () => {
        const aiWindowElement = content.document.querySelector("ai-window");
        const smartbar = aiWindowElement.shadowRoot.querySelector(
          "#ai-window-smartbar"
        );
        return smartbar.view.selectedRowIndex === 0;
      });
      if (wrapped) {
        break;
      }
      await BrowserTestUtils.synthesizeKey("KEY_Tab", {}, browser);
    }

    await SpecialPowers.spawn(browser, [], async () => {
      const aiWindowElement = content.document.querySelector("ai-window");
      const smartbar = aiWindowElement.shadowRoot.querySelector(
        "#ai-window-smartbar"
      );
      Assert.equal(
        smartbar.view.selectedRowIndex,
        0,
        "Tab past the last action button should wrap to the first result"
      );
      Assert.ok(
        smartbar.hasAttribute("open"),
        "Suggestions view should still be open after wrapping back to results"
      );
    });

    await BrowserTestUtils.closeWindow(win);
  }
);

add_task(
  async function test_smartbar_shift_tab_from_first_action_wraps_to_last_result() {
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await promiseSmartbarSuggestionsOpen(browser, () =>
      typeInSmartbar(browser, "hello")
    );

    await SpecialPowers.spawn(browser, [], async () => {
      const aiWindowElement = content.document.querySelector("ai-window");
      const smartbar = aiWindowElement.shadowRoot.querySelector(
        "#ai-window-smartbar"
      );
      smartbar.focusFirstActionButton();
    });

    await BrowserTestUtils.synthesizeKey(
      "KEY_Tab",
      { shiftKey: true },
      browser
    );

    await SpecialPowers.spawn(browser, [], async () => {
      const aiWindowElement = content.document.querySelector("ai-window");
      const smartbar = aiWindowElement.shadowRoot.querySelector(
        "#ai-window-smartbar"
      );
      const lastIndex = smartbar.view.visibleRowCount - 1;
      await ContentTaskUtils.waitForCondition(
        () => smartbar.view.selectedRowIndex === lastIndex,
        "Shift+Tab from first action button should wrap to last result"
      );
      Assert.ok(
        smartbar.hasAttribute("open"),
        "Suggestions view should still be open after wrapping back to results"
      );
    });

    await BrowserTestUtils.closeWindow(win);
  }
);

add_task(async function test_smartbar_tab_skips_disabled_first_action_button() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await promiseSmartbarSuggestionsOpen(browser, () =>
    typeInSmartbar(browser, "hello")
  );

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    // Disable the first button so Tab should skip past it.
    smartbar.querySelector("context-icon-button").disabled = true;
    // Land on the very last selectable element (which may be a menu
    // button within the last row, not the row content), so Tab hits
    // the cycle boundary.
    smartbar.view.selectedRowIndex = -1;
    smartbar.view.selectBy(1, { reverse: true, userPressedTab: true });
  });

  await BrowserTestUtils.synthesizeKey("KEY_Tab", {}, browser);

  await waitForFocusChain(
    browser,
    chain =>
      !chain.some(el => el.localName === "context-icon-button") &&
      chain.some(el =>
        ["memories-icon-button", "input-cta"].includes(el.localName)
      ),
    "Tab should skip the disabled context-icon-button and focus a later action button"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_shift_tab_preserves_context_chips() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Wait for Smartbar to be rendered"
    );
    smartbar.addContextMention({
      type: "tab",
      url: "https://example.com/preserved",
      label: "Preserved Tab",
      iconSrc: "",
    });
    const chipContainer = smartbar.querySelector(
      ".smartbar-context-chips-header"
    );
    await ContentTaskUtils.waitForCondition(
      () => chipContainer.websites.length >= 1,
      "Chip should be added"
    );
  });

  await promiseSmartbarSuggestionsOpen(browser, () =>
    typeInSmartbar(browser, "hello")
  );

  await BrowserTestUtils.synthesizeKey("KEY_Tab", { shiftKey: true }, browser);

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const chipContainer = smartbar.querySelector(
      ".smartbar-context-chips-header"
    );
    Assert.greaterOrEqual(
      chipContainer.websites.length,
      1,
      "Context chips should be preserved after Shift+Tab"
    );
  });

  await BrowserTestUtils.closeWindow(win);
});

add_task(
  async function test_smartbar_shift_tab_from_first_result_lands_on_chevron() {
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await promiseSmartbarSuggestionsOpen(browser, () =>
      typeInSmartbar(browser, "hello")
    );

    // Pre-select the first suggestion so Shift+Tab triggers the wrap.
    await SpecialPowers.spawn(browser, [], async () => {
      const aiWindowElement = content.document.querySelector("ai-window");
      const smartbar = aiWindowElement.shadowRoot.querySelector(
        "#ai-window-smartbar"
      );
      smartbar.view.selectedRowIndex = 0;
    });

    await BrowserTestUtils.synthesizeKey(
      "KEY_Tab",
      { shiftKey: true },
      browser
    );

    await waitForFocusChain(
      browser,
      chain => chain.at(-1)?.id === "chevron-button",
      "Shift+Tab from the first result should land on the chevron"
    );

    await BrowserTestUtils.closeWindow(win);
  }
);

add_task(async function test_smartbar_escape_from_action_button_closes_view() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await promiseSmartbarSuggestionsOpen(browser, () =>
    typeInSmartbar(browser, "hello")
  );

  // Move focus to the first action button with view open.
  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    smartbar.focusFirstActionButton();
  });

  await BrowserTestUtils.synthesizeKey("KEY_Escape", {}, browser);

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    await ContentTaskUtils.waitForCondition(
      () => !smartbar.hasAttribute("open"),
      "Escape from an action button should close the suggestions view"
    );
    Assert.ok(
      smartbar.matches(":focus-within"),
      "Focus should return inside the smartbar input after Escape"
    );
  });

  await BrowserTestUtils.closeWindow(win);
});

add_task(
  async function test_smartbar_space_does_not_insert_when_activating_selected() {
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await promiseSmartbarSuggestionsOpen(browser, () =>
      typeInSmartbar(browser, "hello")
    );

    await SpecialPowers.spawn(browser, [], async () => {
      const aiWindowElement = content.document.querySelector("ai-window");
      const smartbar = aiWindowElement.shadowRoot.querySelector(
        "#ai-window-smartbar"
      );

      // Stub the view to claim SPACE should activate the selected element.
      // This isolates SmartbarInput's _on_beforeinput from result-menu wiring.
      const originalFn = smartbar.view.shouldSpaceActivateSelectedElement;
      smartbar.view.shouldSpaceActivateSelectedElement = () => true;

      const before = smartbar.inputField.value;
      const event = new content.InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        data: " ",
        inputType: "insertText",
      });
      smartbar.inputField.dispatchEvent(event);

      Assert.ok(
        event.defaultPrevented,
        "SPACE beforeinput should be prevented when view says to activate selected element"
      );
      Assert.equal(
        smartbar.inputField.value,
        before,
        "Input value should not grow when SPACE is intercepted"
      );

      smartbar.view.shouldSpaceActivateSelectedElement = originalFn;
    });

    await BrowserTestUtils.closeWindow(win);
  }
);
