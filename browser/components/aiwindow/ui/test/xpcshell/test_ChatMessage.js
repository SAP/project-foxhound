/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

do_get_profile();

const { ChatMessage } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatStore.sys.mjs"
);

add_task(function test_ChatMessage_constructor_defaults() {
  const message = new ChatMessage({
    ordinal: 0,
    role: 0,
    turnIndex: 0,
    content: "some content",
    pageUrl: new URL("https://www.mozilla.com"),
  });

  Assert.withSoftAssertions(function (soft) {
    soft.equal(message.id.length, 12);
    soft.equal(message.revisionRootMessageId, message.id);
    soft.ok(!isNaN(message.createdDate));
    soft.ok(message.isActiveBranch);
    const nullFields = [
      "parentMessageId",
      "modelId",
      "params",
      "usage",
      "convId",
      "memoriesEnabled",
      "memoriesFlagSource",
      "memoriesApplied",
      "webSearchQueries",
    ];

    nullFields.forEach(nullField => {
      soft.equal(
        message[nullField],
        null,
        `message.${nullField} should default to null`
      );
    });
  });
});

add_task(function test_pageUrl_as_URL_ChatConversation() {
  const message = new ChatMessage({
    ordinal: 0,
    role: 0,
    turnIndex: 0,
    content: "some content",
    pageUrl: new URL("https://www.mozilla.com"),
  });

  Assert.withSoftAssertions(function (soft) {
    soft.ok(URL.isInstance(message.pageUrl));
    soft.equal(message.pageUrl.href, "https://www.mozilla.com/");
  });
});

add_task(function test_missing_pageUrl_ChatConversation() {
  const message = new ChatMessage({
    ordinal: 0,
    role: 0,
    turnIndex: 0,
    content: "some content",
  });

  Assert.equal(message.pageUrl, null);
});

add_task(function test_empty_pageUrl_ChatConversation() {
  const message = new ChatMessage({
    ordinal: 0,
    role: 0,
    turnIndex: 0,
    content: "some content",
  });

  Assert.equal(message.pageUrl, null);
});
