/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let chatTab;

describe("chat message table rendering", () => {
  beforeEach(async () => {
    await SpecialPowers.pushPrefEnv({
      set: [["browser.smartwindow.enabled", true]],
    });
    chatTab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      "about:aichatcontent"
    );
  });

  afterEach(async () => {
    BrowserTestUtils.removeTab(chatTab);
    chatTab = null;
    await SpecialPowers.popPrefEnv();
  });

  it("should render valid table markdown as ai-chat-table", async () => {
    await SpecialPowers.spawn(chatTab.linkedBrowser, [], async () => {
      await content.customElements.whenDefined("ai-chat-message");
      await content.customElements.whenDefined("ai-chat-table");

      const message = content.document.createElement("ai-chat-message");
      content.document.body.appendChild(message);

      const tableMarkdown = `| Header 1 | Header 2 |
|----------|----------|
| A        | B        |`;

      message.role = "assistant";
      message.setAttribute("role", "assistant");
      message.message = tableMarkdown;
      message.setAttribute("message", tableMarkdown);

      await ContentTaskUtils.waitForMutationCondition(
        message.shadowRoot,
        { childList: true, subtree: true },
        () =>
          message.shadowRoot.querySelector(".message-assistant ai-chat-table")
      );

      const tableWrapper = message.shadowRoot.querySelector(
        ".message-assistant ai-chat-table"
      );
      Assert.ok(tableWrapper, "ai-chat-table wrapper should exist");

      const table = tableWrapper.querySelector("table");
      Assert.ok(table, "table element should exist inside ai-chat-table");

      const headerCells = table.querySelectorAll("thead th");
      Assert.equal(headerCells.length, 2, "Table should have 2 header columns");
      Assert.equal(headerCells[0].textContent, "Header 1");
      Assert.equal(headerCells[1].textContent, "Header 2");

      const bodyRows = table.querySelectorAll("tbody tr");
      Assert.equal(bodyRows.length, 1, "Table should have 1 body row");

      const bodyCells = bodyRows[0].querySelectorAll("td");
      Assert.equal(bodyCells.length, 2, "Body row should have 2 cells");
      Assert.equal(bodyCells[0].textContent, "A");
      Assert.equal(bodyCells[1].textContent, "B");

      message.remove();
    });
  });

  it("should not render invalid table markdown as a table", async () => {
    await SpecialPowers.spawn(chatTab.linkedBrowser, [], async () => {
      await content.customElements.whenDefined("ai-chat-message");

      const message = content.document.createElement("ai-chat-message");
      content.document.body.appendChild(message);

      // Invalid table markdown missing the separator row.
      const invalidTableMarkdown = `| Header 1 | Header 2 |
| A        | B        |`;

      message.role = "assistant";
      message.setAttribute("role", "assistant");
      message.message = invalidTableMarkdown;
      message.setAttribute("message", invalidTableMarkdown);

      await ContentTaskUtils.waitForMutationCondition(
        message.shadowRoot,
        { childList: true, subtree: true },
        () => message.shadowRoot.querySelector(".message-assistant")
      );

      const assistantDiv =
        message.shadowRoot.querySelector(".message-assistant");
      Assert.ok(assistantDiv, "Message content should still render");
      Assert.ok(
        assistantDiv.textContent.includes("Header 1"),
        "Message text should be visible"
      );
      Assert.ok(
        !assistantDiv.querySelector("ai-chat-table"),
        "Invalid table markdown should not create ai-chat-table"
      );
      Assert.ok(
        !assistantDiv.querySelector("table"),
        "Invalid table markdown should not create table element"
      );

      message.remove();
    });
  });
});
