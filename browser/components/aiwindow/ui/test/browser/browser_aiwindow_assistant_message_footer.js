"use strict";

const TEST_PAGE =
  "chrome://mochitests/content/browser/browser/components/aiwindow/ui/test/browser/test_assistant_message_footer_page.html";

add_task(async function test_message_footer_wires_buttons() {
  await BrowserTestUtils.withNewTab(TEST_PAGE, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const doc = content.document;
      const footer = doc.getElementById("footer");

      footer.messageId = "msg-1";
      footer.appliedMemories = ["User is vegan"];

      await content.customElements.whenDefined("assistant-message-footer");

      const shadow = footer.shadowRoot;
      ok(shadow, "Footer has a shadow root");

      const copyButton = shadow.querySelector("moz-button.copy-button");
      const retryButton = shadow.querySelector("moz-button.retry-button");
      const appliedButton = shadow.querySelector("applied-memories-button");

      ok(copyButton, "Found copy button");
      ok(retryButton, "Found retry button");
      ok(appliedButton, "Found applied memories button");

      is(
        appliedButton.messageId,
        "msg-1",
        "Footer passes messageId to applied memories button"
      );
      is(
        appliedButton.appliedMemories.length,
        1,
        "Footer passes appliedMemories to applied memories button"
      );

      let copyDetail = null;
      function onCopy(evt) {
        footer.removeEventListener("copy-message", onCopy);
        copyDetail = evt.detail;
      }
      footer.addEventListener("copy-message", onCopy);

      copyButton.click();
      await content.Promise.resolve();

      ok(copyDetail, "copy-message event fired");
      is(copyDetail.messageId, "msg-1", "copy-message includes messageId");

      let retryDetail = null;
      function onRetry(evt) {
        footer.removeEventListener("retry-message", onRetry);
        retryDetail = evt.detail;
      }
      footer.addEventListener("retry-message", onRetry);

      retryButton.click();
      await content.Promise.resolve();

      ok(retryDetail, "retry-message event fired");
      is(retryDetail.messageId, "msg-1", "retry-message includes messageId");
    });
  });
});
