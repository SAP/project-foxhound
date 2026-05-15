/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Test for Bug 306937 - "Bookmark This Link..." context menu should not
 * add spurious whitespace characters to bookmark names when links contain
 * inline HTML formatting elements.
 */

add_task(async function test_bookmark_link_text_with_inline_formatting() {
  const TEST_PAGE = `data:text/html,
    <a id="link1" href="https://example.com/1">Plain text link</a>
    <a id="link2" href="https://example.com/2">Co<u>m</u>ponent</a>
    <a id="link3" href="https://example.com/3">@<span>username</span></a>
    <a id="link4" href="https://example.com/4"><span>Multiple</span> <span>Spans</span></a>
    <a id="link5" href="https://example.com/5">Text <strong>bold</strong> more</a>
    <a id="link6" href="https://example.com/6"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="Icon"> Text</a>
    <a id="link7" href="https://example.com/7">Normal <em>text</em> here</a>
    <a id="link8" href="https://example.com/8">Text   with   multiple   spaces</a>
  `;

  await BrowserTestUtils.withNewTab(TEST_PAGE, async browser => {
    const tests = [
      { selector: "#link1", expected: "Plain text link" },
      { selector: "#link2", expected: "Component" },
      { selector: "#link3", expected: "@username" },
      { selector: "#link4", expected: "Multiple Spans" },
      { selector: "#link5", expected: "Text bold more" },
      { selector: "#link6", expected: "Icon Text" },
      { selector: "#link7", expected: "Normal text here" },
      { selector: "#link8", expected: "Text with multiple spaces" },
    ];

    for (const test of tests) {
      let contextMenu = document.getElementById("contentAreaContextMenu");
      let popupShown = BrowserTestUtils.waitForEvent(contextMenu, "popupshown");

      BrowserTestUtils.synthesizeMouseAtCenter(
        test.selector,
        { type: "contextmenu", button: 2 },
        browser
      );

      await popupShown;

      // Get the linkText from the context menu's context
      let linkText = gContextMenu.linkTextStr;

      is(
        linkText,
        test.expected,
        `Link text for ${test.selector} should be "${test.expected}" without spurious spaces`
      );

      let popupHidden = BrowserTestUtils.waitForEvent(
        contextMenu,
        "popuphidden"
      );
      contextMenu.hidePopup();
      await popupHidden;
    }
  });
});
