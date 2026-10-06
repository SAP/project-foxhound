/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_PAGE =
  "chrome://mochitests/content/browser/browser/components/aiwindow/ui/test/browser/test_ai_action_result_page.html";

async function openTestPage() {
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_PAGE);
  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    await content.customElements.whenDefined("ai-action-result");
  });
  return { tab, browser: tab.linkedBrowser };
}

async function withTestPage(fn) {
  const { tab, browser } = await openTestPage();
  try {
    await fn(browser);
  } finally {
    BrowserTestUtils.removeTab(tab);
  }
}

async function setProps(browser, props) {
  await SpecialPowers.spawn(browser, [props], async properties => {
    const el = content.document.getElementById("test-action-result");
    Object.assign(el, properties);
    await el.updateComplete;
  });
}

add_task(async function test_label_and_summary_render() {
  await withTestPage(async browser => {
    await setProps(browser, {
      label: "Closed tabs",
      summary: "I closed any open tabs about NYC hotels.",
    });

    await SpecialPowers.spawn(browser, [], async () => {
      const el = content.document.getElementById("test-action-result");
      const shadow = el.shadowRoot;

      Assert.equal(
        shadow.querySelector(".action-result-label").textContent.trim(),
        "Closed tabs",
        "Label text should match the label property"
      );
      Assert.equal(
        shadow.querySelector(".action-result-summary").textContent.trim(),
        "I closed any open tabs about NYC hotels.",
        "Summary text should match the summary property"
      );
    });
  });
});

add_task(async function test_toggle_expand_collapse() {
  await withTestPage(async browser => {
    await setProps(browser, {
      label: "Closed tabs",
      summary: "I closed any open tabs.",
      isExpanded: false,
    });

    await SpecialPowers.spawn(browser, [], async () => {
      const el = content.document.getElementById("test-action-result");
      const shadow = el.shadowRoot;

      Assert.ok(
        !shadow.querySelector(".action-result-expanded"),
        "Expanded section should not be present when collapsed"
      );

      shadow.querySelector(".action-result-header").click();
      await el.updateComplete;

      Assert.ok(
        shadow.querySelector(".action-result-expanded"),
        "Expanded section should appear after clicking header"
      );
      Assert.equal(
        el.isExpanded,
        true,
        "isExpanded should be true after toggle"
      );

      shadow.querySelector(".action-result-header").click();
      await el.updateComplete;

      Assert.ok(
        !shadow.querySelector(".action-result-expanded"),
        "Expanded section should be removed after second click"
      );
      Assert.equal(
        el.isExpanded,
        false,
        "isExpanded should be false after second toggle"
      );
    });
  });
});

add_task(async function test_items_render_when_expanded() {
  await withTestPage(async browser => {
    const items = [
      { url: "https://nychotels.com", label: "NYC Hotels", iconSrc: "" },
      { url: "https://booking.com", label: "Booking NYC", iconSrc: "" },
    ];

    await setProps(browser, {
      label: "Closed tabs",
      summary: "I closed any open tabs about NYC hotels.",
      rows: [{ label: "Closed tabs", items }],
      isExpanded: true,
    });

    await SpecialPowers.spawn(browser, [items], async expectedItems => {
      const shadow =
        content.document.getElementById("test-action-result").shadowRoot;

      const container = shadow.querySelector("website-chip-container");
      Assert.ok(
        container,
        "website-chip-container should be present when expanded"
      );
      Assert.deepEqual(
        container.websites,
        expectedItems,
        "website-chip-container should receive the items array"
      );
    });
  });
});

add_task(async function test_row_label_renders() {
  await withTestPage(async browser => {
    await setProps(browser, {
      label: "Closed 3 tabs",
      rows: [{ label: "Closed tabs", items: [] }],
      isExpanded: true,
    });

    await SpecialPowers.spawn(browser, [], async () => {
      const shadow =
        content.document.getElementById("test-action-result").shadowRoot;

      Assert.equal(
        shadow
          .querySelector(".action-result-expanded-row-label")
          .textContent.trim(),
        "Closed tabs",
        "Expanded row label should display the row's label"
      );
    });
  });
});

add_task(async function test_l10n_attributes_render() {
  await withTestPage(async browser => {
    await setProps(browser, {
      labelL10nId: "smart-window-closed-tabs-label",
      labelL10nArgs: { count: 3 },
      summaryL10nId: "smart-window-closed-tabs-summary",
      summaryL10nArgs: { count: 3 },
      rows: [
        {
          labelL10nId: "smart-window-restored-row-label",
          labelL10nArgs: { count: 2 },
          items: [],
        },
      ],
      isExpanded: true,
    });

    await SpecialPowers.spawn(browser, [], async () => {
      const el = content.document.getElementById("test-action-result");
      const shadow = el.shadowRoot;

      // Check main label L10n attributes
      const label = shadow.querySelector(".action-result-label");
      Assert.equal(
        label.getAttribute("data-l10n-id"),
        "smart-window-closed-tabs-label",
        "Label should have correct data-l10n-id"
      );
      Assert.equal(
        label.getAttribute("data-l10n-args"),
        '{"count":3}',
        "Label should have correct data-l10n-args"
      );

      // Check summary L10n attributes
      const summary = shadow.querySelector(".action-result-summary");
      Assert.equal(
        summary.getAttribute("data-l10n-id"),
        "smart-window-closed-tabs-summary",
        "Summary should have correct data-l10n-id"
      );
      Assert.equal(
        summary.getAttribute("data-l10n-args"),
        '{"count":3}',
        "Summary should have correct data-l10n-args"
      );

      // Check row label L10n attributes
      const rowLabel = shadow.querySelector(
        ".action-result-expanded-row-label"
      );
      Assert.equal(
        rowLabel.getAttribute("data-l10n-id"),
        "smart-window-restored-row-label",
        "Row label should have correct data-l10n-id"
      );
      Assert.equal(
        rowLabel.getAttribute("data-l10n-args"),
        '{"count":2}',
        "Row label should have correct data-l10n-args"
      );
    });
  });
});

add_task(async function test_mixed_l10n_and_plain_strings() {
  await withTestPage(async browser => {
    // Mix L10n and plain strings to ensure both work
    await setProps(browser, {
      labelL10nId: "smart-window-closed-tabs-label",
      labelL10nArgs: { count: 1 },
      summary: "This is a plain text summary", // Plain string
      isExpanded: true,
      rows: [
        { label: "Plain text row", items: [] }, // Plain string
        {
          labelL10nId: "smart-window-restored-row-label",
          labelL10nArgs: { count: 1 },
          items: [],
        },
      ],
    });

    await SpecialPowers.spawn(browser, [], async () => {
      const shadow =
        content.document.getElementById("test-action-result").shadowRoot;

      // L10n label should have attribute
      Assert.ok(
        shadow
          .querySelector(".action-result-label")
          .hasAttribute("data-l10n-id"),
        "Label with L10n ID should have data-l10n-id attribute"
      );

      // Plain summary should not have L10n attribute
      Assert.ok(
        !shadow
          .querySelector(".action-result-summary")
          .hasAttribute("data-l10n-id"),
        "Plain text summary should not have data-l10n-id attribute"
      );

      const rowLabels = shadow.querySelectorAll(
        ".action-result-expanded-row-label"
      );
      // First row should be plain text
      Assert.ok(
        !rowLabels[0].hasAttribute("data-l10n-id"),
        "Plain text row should not have data-l10n-id"
      );
      // Second row should have L10n
      Assert.ok(
        rowLabels[1].hasAttribute("data-l10n-id"),
        "L10n row should have data-l10n-id"
      );
    });
  });
});
