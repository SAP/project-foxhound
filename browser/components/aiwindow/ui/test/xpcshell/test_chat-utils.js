/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

do_get_profile();

const { ChatConversation, ChatMessage } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatStore.sys.mjs"
);
const {
  makeGuid,
  parseConversationRow,
  parseMessageRows,
  parseChatHistoryViewRows,
  parseJSONOrNull,
  getRoleLabel,
} = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatUtils.sys.mjs"
);

add_task(function test_makeGuid() {
  const guid = makeGuid();

  Assert.equal(guid.length, 12);
});

/**
 * Mock row
 */
class RowStub {
  constructor(data) {
    this.data = data;
  }

  getResultByName(key) {
    if (Object.hasOwn(this.data, key)) {
      return this.data[key];
    }

    throw new Error("NS_ERROR_NOT_AVAILABLE");
  }
}

add_task(function test_parseConversationRow() {
  const now = Date.now();
  const testRow = new RowStub({
    conv_id: "123456789012",
    title: "the title",
    description: "the description",
    page_url: "https://www.firefox.com",
    page_meta: '{"hello": "world"}',
    created_date: now,
    updated_date: now,
    status: "a status",
  });

  const conversation = parseConversationRow(testRow);

  Assert.withSoftAssertions(function (soft) {
    // eslint-disable-next-line mozilla/use-isInstance
    soft.ok(conversation instanceof ChatConversation);
    soft.equal(conversation.id, "123456789012");
    soft.equal(conversation.title, "the title");
    soft.equal(conversation.description, "the description");
    soft.ok(URL.isInstance(conversation.pageUrl));
    soft.equal(conversation.pageUrl.href, "https://www.firefox.com/");
    soft.deepEqual(conversation.pageMeta, { hello: "world" });
    soft.equal(conversation.createdDate, now);
    soft.equal(conversation.updatedDate, now);
    soft.equal(conversation.status, "a status");
  });
});

add_task(function test_missingField_parseConversationRow() {
  const now = Date.now();
  const testRow = new RowStub({
    title: "the title",
    description: "the description",
    page_url: "https://www.firefox.com",
    page_meta: '{"hello": "world"}',
    created_date: now,
    updated_date: now,
    status: "a status",
  });

  Assert.throws(function () {
    parseConversationRow(testRow);
  }, /NS_ERROR_NOT_AVAILABLE/);
});

add_task(function test_parseConversationRow() {
  const now = Date.now();
  const testRow = new RowStub({
    message_id: "123456789012",
    created_date: now,
    parent_message_id: "123456",
    revision_root_message_id: "1234",
    ordinal: 0,
    is_active_branch: true,
    role: 0,
    model_id: "a model id",
    params: '{ "some": "data" }',
    usage: '{ "some": "usage data" }',
    content: '{ "some": "content data" }',
    conv_id: "123456789012",
    page_url: "https://www.firefox.com",
    turn_index: 0,
    memories_enabled: true,
    memories_flag_source: 1,
    memories_applied: '{ "some": "memories" }',
    web_search_queries: '{ "some": "web search queries" }',
  });

  const rows = parseMessageRows([testRow]);
  const message = rows[0];

  Assert.withSoftAssertions(function (soft) {
    // eslint-disable-next-line mozilla/use-isInstance
    soft.ok(message instanceof ChatMessage);
    soft.equal(message.id, "123456789012");
    soft.equal(message.createdDate, now);
    soft.equal(message.parentMessageId, "123456");
    soft.equal(message.revisionRootMessageId, "1234");
    soft.equal(message.ordinal, 0);
    soft.equal(message.isActiveBranch, true);
    soft.equal(message.role, 0);
    soft.equal(message.modelId, "a model id");
    soft.deepEqual(message.params, { some: "data" });
    soft.deepEqual(message.usage, { some: "usage data" });
    soft.deepEqual(message.content, { some: "content data" });
    soft.deepEqual(message.convId, "123456789012");
    soft.ok(URL.isInstance(message.pageUrl));
    soft.deepEqual(message.pageUrl.href, "https://www.firefox.com/");
    soft.equal(message.turnIndex, 0);
    soft.equal(message.memoriesEnabled, true);
    soft.equal(message.memoriesFlagSource, 1);
    soft.deepEqual(message.memoriesApplied, { some: "memories" });
    soft.deepEqual(message.webSearchQueries, { some: "web search queries" });
  });
});

add_task(function test_missingField_parseConversationRow() {
  const now = Date.now();
  const testRow = new RowStub({
    //message_id: "123456789012",
    created_date: now,
    parent_message_id: "123456",
    revision_root_message_id: "1234",
    ordinal: 0,
    is_active_branch: true,
    role: 0,
    model_id: "a model id",
    params: '{ "some": "data" }',
    usage: '{ "some": "usage data" }',
    content: '{ "some": "content data" }',
    conv_id: "123456789012",
    page_url: "https://www.firefox.com",
    turn_index: 0,
    memories_enabled: true,
    memories_flag_source: 1,
    memories_applied: '{ "some": "memories" }',
    web_search_queries: '{ "some": "web search queries" }',
  });

  Assert.throws(function () {
    parseMessageRows([testRow]);
  }, /NS_ERROR_NOT_AVAILABLE/);
});

add_task(function test_parseJSONOrNull() {
  const json = '{"some": "data"}';

  const parsed = parseJSONOrNull(json);

  Assert.deepEqual(parsed, { some: "data" });
});

add_task(function test_invalidJson_parseJSONOrNull() {
  const json = '{some: "data"}';

  const parsed = parseJSONOrNull(json);

  Assert.equal(parsed, null);
});

add_task(function test_user_getRoleLabel() {
  const role = getRoleLabel(0);

  Assert.equal(role, "User");
});

add_task(function test_assistant_getRoleLabel() {
  const role = getRoleLabel(1);

  Assert.equal(role, "Assistant");
});

add_task(function test_system_getRoleLabel() {
  const role = getRoleLabel(2);

  Assert.equal(role, "System");
});

add_task(function test_user_getRoleLabel() {
  const role = getRoleLabel(3);

  Assert.equal(role, "Tool");
});

add_task(function test_parseChatHistoryViewRows() {
  const row1 = new RowStub({
    conv_id: "1",
    title: "conv 1",
    created_date: 116952982,
    updated_date: 116952982,
    urls: "https://www.firefox.com,https://www.mozilla.com",
  });

  const row2 = new RowStub({
    conv_id: "2",
    title: "conv 2",
    created_date: 117189198,
    updated_date: 117189198,
    urls: "https://www.mozilla.org",
  });

  const row3 = new RowStub({
    conv_id: "3",
    title: "conv 3",
    created_date: 168298919,
    updated_date: 168298919,
    urls: "https://www.firefox.com",
  });

  const rows = [row1, row2, row3];

  const viewRows = parseChatHistoryViewRows(rows);

  Assert.withSoftAssertions(function (soft) {
    soft.equal(viewRows[0].convId, "1");
    soft.equal(viewRows[0].title, "conv 1");
    soft.equal(viewRows[0].createdDate, 116952982);
    soft.equal(viewRows[0].updatedDate, 116952982);
    soft.deepEqual(viewRows[0].urls, [
      new URL("https://www.firefox.com"),
      new URL("https://www.mozilla.com"),
    ]);

    soft.equal(viewRows[1].convId, "2");
    soft.equal(viewRows[1].title, "conv 2");
    soft.equal(viewRows[1].createdDate, 117189198);
    soft.equal(viewRows[1].updatedDate, 117189198);
    soft.deepEqual(viewRows[1].urls, [new URL("https://www.mozilla.org")]);

    soft.equal(viewRows[2].convId, "3");
    soft.equal(viewRows[2].title, "conv 3");
    soft.equal(viewRows[2].createdDate, 168298919);
    soft.equal(viewRows[2].updatedDate, 168298919);
    soft.deepEqual(viewRows[2].urls, [new URL("https://www.firefox.com")]);
  });
});
