/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_PAGE =
  "chrome://mochitests/content/browser/browser/components/aiwindow/ui/test/browser/test_smartwindow_panel_list_page.html";

/**
 * Opens a test page in a new tab.
 *
 * @param {string} pageUrl - The URL of the page to load
 * @returns {Promise<object>} - Object containing the tab and browser
 */
async function openTestPage(pageUrl) {
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, pageUrl);
  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    await content.customElements.whenDefined("smartwindow-panel-list");
  });
  return { tab, browser: tab.linkedBrowser };
}

/**
 * Sets properties on a panel element in content and waits for update.
 *
 * @param {Browser} browser - The browser element
 * @param {string} panelId - The ID of the panel element
 * @param {object} props - Properties to set on the panel
 * @returns {Promise<void>}
 */
async function setPanelPropsInContent(browser, panelId, props) {
  await SpecialPowers.spawn(
    browser,
    [panelId, props],
    async (id, properties) => {
      const panel = content.document.getElementById(id);
      Object.assign(panel, properties);
      if (panel.updateComplete) {
        await panel.updateComplete;
      }
    }
  );
}

add_task(async function test_empty_state() {
  const { tab, browser } = await openTestPage(TEST_PAGE);

  await setPanelPropsInContent(browser, "test-panel", {
    groups: [],
    alwaysOpen: true,
  });

  await SpecialPowers.spawn(browser, [], async () => {
    const panel = content.document.getElementById("test-panel");
    const shadow = panel.shadowRoot;
    const panelList = shadow.querySelector("panel-list");

    Assert.ok(panelList, "Panel list should exist");

    const items = Array.from(
      shadow.querySelectorAll("panel-item:not(.panel-section-header)")
    );
    Assert.equal(items.length, 0, "Should have no items in empty state");
  });

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_single_tab_state() {
  const { tab, browser } = await openTestPage(TEST_PAGE);

  await setPanelPropsInContent(browser, "test-panel", {
    groups: [
      {
        items: [
          {
            id: "current-tab",
            label: "Smart window chat",
            icon: "chrome://branding/content/icon16.png",
          },
          {
            id: "closed1",
            label: "MDN Web Docs",
            icon: "chrome://branding/content/icon16.png",
          },
        ],
      },
    ],
    alwaysOpen: true,
  });

  await SpecialPowers.spawn(browser, [], async () => {
    const panel = content.document.getElementById("test-panel");
    const shadow = panel.shadowRoot;

    const items = Array.from(
      shadow.querySelectorAll("panel-item:not(.panel-section-header)")
    );
    Assert.equal(items.length, 2, "Should have 2 items");
    Assert.equal(items[0].itemId, "current-tab", "First item ID should match");
    Assert.equal(items[1].itemId, "closed1", "Second item ID should match");
  });

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_multiple_groups() {
  const { tab, browser } = await openTestPage(TEST_PAGE);

  await setPanelPropsInContent(browser, "test-panel", {
    groups: [
      {
        items: [
          {
            id: "tab1",
            label: "Mozilla Firefox",
            icon: "chrome://branding/content/icon16.png",
          },
          {
            id: "tab2",
            label: "GitHub",
            icon: "chrome://branding/content/icon16.png",
          },
        ],
      },
      {
        items: [
          {
            id: "closed1",
            label: "MDN Web Docs",
            icon: "chrome://branding/content/icon16.png",
          },
        ],
      },
    ],
    alwaysOpen: true,
  });

  await SpecialPowers.spawn(browser, [], async () => {
    const panel = content.document.getElementById("test-panel");
    const shadow = panel.shadowRoot;

    const items = Array.from(
      shadow.querySelectorAll("panel-item:not(.panel-section-header)")
    );
    Assert.equal(items.length, 3, "Should have 3 items total");
  });

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_item_selection() {
  const { tab, browser } = await openTestPage(TEST_PAGE);

  await setPanelPropsInContent(browser, "test-panel", {
    groups: [
      {
        items: [
          {
            id: "test-tab",
            label: "Test Tab",
            icon: "chrome://branding/content/icon16.png",
          },
        ],
      },
    ],
    alwaysOpen: true,
  });

  await SpecialPowers.spawn(browser, [], async () => {
    const panel = content.document.getElementById("test-panel");
    const shadow = panel.shadowRoot;

    let selectedItem = null;
    panel.addEventListener(
      "item-selected",
      e => {
        selectedItem = e.detail;
      },
      { once: true }
    );

    const item = shadow.querySelector("panel-item:not(.panel-section-header)");
    item.click();

    await ContentTaskUtils.waitForCondition(
      () => selectedItem !== null,
      "Wait for item-selected event"
    );

    Assert.equal(selectedItem.id, "test-tab", "Selected item ID should match");
    Assert.equal(
      selectedItem.label,
      "Test Tab",
      "Selected item label should match"
    );
  });

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_icons_rendered() {
  const { tab, browser } = await openTestPage(TEST_PAGE);

  await setPanelPropsInContent(browser, "test-panel", {
    groups: [
      {
        items: [
          {
            id: "tab-with-icon",
            label: "Tab with icon",
            icon: "chrome://branding/content/icon16.png",
          },
          {
            id: "tab-without-icon",
            label: "Tab without icon",
          },
        ],
      },
    ],
    alwaysOpen: true,
  });

  await SpecialPowers.spawn(browser, [], async () => {
    const panel = content.document.getElementById("test-panel");
    const shadow = panel.shadowRoot;

    const items = Array.from(
      shadow.querySelectorAll("panel-item:not(.panel-section-header)")
    );

    Assert.equal(
      items[0].hasAttribute("icon"),
      true,
      "First item should have icon attribute"
    );
    Assert.equal(
      items[1].hasAttribute("icon"),
      false,
      "Second item should not have icon attribute"
    );
  });

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_panel_clamped_to_viewport_in_sidebar_mode() {
  const { tab, browser } = await openTestPage(TEST_PAGE);

  await setPanelPropsInContent(browser, "test-panel", {
    groups: [
      {
        items: [{ id: "tab1", label: "Tab 1" }],
      },
    ],
    sidebarMode: true,
  });

  await SpecialPowers.spawn(browser, [], async () => {
    const panelEl = content.document.getElementById("test-panel");
    const panelList = panelEl.shadowRoot.querySelector("panel-list");

    // Register before showing so we can't miss the event.
    // #clampToViewport() is registered in firstUpdated() and fires first,
    // so by the time this resolves the position has already been corrected.
    const shownPromise = new Promise(resolve =>
      panelList.addEventListener("shown", resolve, { once: true })
    );

    await panelEl.show();
    await shownPromise;

    // getBoundingClientRect() forces a synchronous layout flush, reflecting
    // the corrected style.left / style.top / maxWidth set by #clampToViewport().
    const rect = panelList.getBoundingClientRect();
    Assert.greaterOrEqual(rect.left, 0, "Panel left edge within viewport");
    Assert.greaterOrEqual(rect.top, 0, "Panel top edge within viewport");
    Assert.lessOrEqual(
      rect.right,
      content.innerWidth,
      "Panel right edge within viewport"
    );
    Assert.lessOrEqual(
      rect.bottom,
      content.innerHeight,
      "Panel bottom edge within viewport"
    );
  });

  BrowserTestUtils.removeTab(tab);
});

add_task(
  async function test_panel_repositions_when_groups_change_in_sidebar_mode() {
    const { tab, browser } = await openTestPage(TEST_PAGE);

    await SpecialPowers.spawn(browser, [], async () => {
      const panelEl = content.document.getElementById("test-panel");
      const panelList = panelEl.shadowRoot.querySelector("panel-list");

      // Position near the bottom so setAlign() picks valign=top (panel opens
      // above anchor). This is the condition where repositioning is necessary.
      panelEl.style.position = "fixed";
      panelEl.style.bottom = "10px";
      panelEl.style.left = "10px";

      panelEl.sidebarMode = true;
      panelEl.anchor = panelEl;
      panelEl.groups = [
        {
          items: [
            { id: "tab1", label: "Tab 1" },
            { id: "tab2", label: "Tab 2" },
            { id: "tab3", label: "Tab 3" },
            { id: "tab4", label: "Tab 4" },
          ],
        },
      ];
      await panelEl.updateComplete;

      const shownPromise = new Promise(resolve =>
        panelList.addEventListener("shown", resolve, { once: true })
      );
      await panelEl.show();
      await shownPromise;

      const topBefore = parseFloat(panelList.style.top);

      panelEl.groups = [{ items: [{ id: "tab1", label: "Tab 1" }] }];
      await panelEl.updateComplete;

      await new Promise(resolve => content.requestAnimationFrame(resolve));

      const topAfter = parseFloat(panelList.style.top);
      Assert.notEqual(
        topAfter,
        topBefore,
        "Panel should reposition when groups shrink in sidebar mode"
      );
    });

    BrowserTestUtils.removeTab(tab);
  }
);

add_task(async function test_keyboard_events() {
  const { tab, browser } = await openTestPage(TEST_PAGE);

  await setPanelPropsInContent(browser, "test-panel", {
    groups: [
      {
        items: [
          {
            id: "test-tab",
            label: "Test Tab",
          },
        ],
      },
    ],
    alwaysOpen: true,
  });

  await SpecialPowers.spawn(browser, [], async () => {
    const panel = content.document.getElementById("test-panel");
    const shadow = panel.shadowRoot;
    const panelList = shadow.querySelector("panel-list");

    let keydownEvent = null;
    panel.addEventListener(
      "panel-keydown",
      e => {
        keydownEvent = e.detail;
      },
      { once: true }
    );

    panelList.dispatchEvent(
      new content.KeyboardEvent("keydown", { key: "ArrowDown" })
    );

    await ContentTaskUtils.waitForCondition(
      () => keydownEvent !== null,
      "Wait for panel-keydown event"
    );

    Assert.ok(
      keydownEvent.originalEvent,
      "panel-keydown should include original event"
    );
    Assert.equal(
      keydownEvent.originalEvent.key,
      "ArrowDown",
      "Original event key should match"
    );
  });

  BrowserTestUtils.removeTab(tab);
});
