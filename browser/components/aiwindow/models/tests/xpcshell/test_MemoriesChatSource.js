/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

do_get_profile();

const {
  getRecentChats,
  computeFreshnessScore,
  _setBlockListManagerForTesting,
} = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/memories/MemoriesChatSource.sys.mjs"
);
const { ChatStore, ChatMessage, MESSAGE_ROLE } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatStore.sys.mjs"
);
const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function normalizeToMs(value) {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "number") {
    return value;
  }
  // assume string (e.g. ISO date)
  return Date.parse(value);
}

let sandbox;

add_setup(function () {
  sandbox = sinon.createSandbox();
  registerCleanupFunction(() => {
    sandbox.restore();
  });
});

// past date check
add_task(function test_computeFreshnessScore_past_date_check() {
  const createdDate = new Date(Date.now() - 10 * MS_PER_DAY);
  const score = computeFreshnessScore(createdDate, 7);

  Assert.less(score, 0.5, "Freshness score should be < 0.5");
});

// future date check
add_task(function test_computeFreshnessScore_future_date_check() {
  const createdDate = new Date(Date.now() + 1 * MS_PER_DAY);
  const score = computeFreshnessScore(createdDate, 7);
  Assert.equal(score, 1, "Freshness score should be 1");
});

// current date check
add_task(function test_computeFreshnessScore_current_date_check() {
  const createdDate = new Date();
  const score = computeFreshnessScore(createdDate, 7);
  // allow tiny floating point / timing jitter
  Assert.greaterOrEqual(score, 0.9999, "Freshness score should be ≈ 1");
  Assert.lessOrEqual(score, 1, "Freshness score must be <= 1");
});

// approx halflife check
add_task(function test_computeFreshnessScore_halflife_approx_check() {
  const createdDate = new Date(Date.now() - 7 * MS_PER_DAY);
  const score = computeFreshnessScore(createdDate, 7);
  // making sure that score in between 0.49 & 0.51 (closer to halflife)
  Assert.less(score, 0.51, "Freshness score should be < 0.51");
  Assert.greater(score, 0.49, "Freshness score should be > 0.49");
});

// older vs recent score check
add_task(function test_computeFreshnessScore_older_vs_recent_check() {
  const olderDate = new Date(Date.now() - 30 * MS_PER_DAY);
  const recentDate = new Date(Date.now() - 1 * MS_PER_DAY);
  const olderScore = computeFreshnessScore(olderDate, 7);
  const recentScore = computeFreshnessScore(recentDate, 7);
  Assert.less(olderScore, recentScore, "Older score should be < recent score");
});

add_task(async function test_getRecentChats_basic_mapping_and_limit() {
  const fixedNow = 1_700_000_000_000;

  const clock = sandbox.useFakeTimers({ now: fixedNow });

  const messages = [
    new ChatMessage({
      createdDate: fixedNow - 1_000,
      ordinal: 1,
      role: MESSAGE_ROLE.USER,
      content: { type: "text", body: "msg1" },
      pageUrl: "https://example.com/1",
      turnIndex: 0,
    }),
    new ChatMessage({
      createdDate: fixedNow - 10_000,
      ordinal: 2,
      role: MESSAGE_ROLE.USER,
      content: { type: "text", body: "msg2" },
      pageUrl: "https://example.com/2",
      turnIndex: 0,
    }),
    new ChatMessage({
      createdDate: fixedNow - 100_000,
      ordinal: 3,
      role: MESSAGE_ROLE.USER,
      content: { type: "text", body: "msg3" },
      pageUrl: "https://example.com/3",
      turnIndex: 0,
    }),
  ];

  messages.forEach(msg => {
    Assert.ok(
      "createdDate" in msg,
      "Test stub message should have createdDate (camelCase)"
    );
    Assert.ok(
      msg.content &&
        typeof msg.content === "object" &&
        !Array.isArray(msg.content),
      "msg.content should be an object, not an array"
    );
    Assert.ok("body" in msg.content, "msg.content should have a body field");
  });

  const maxResults = 3;
  const halfLifeDays = 7;
  const startTime = fixedNow - 1_000_000;

  // Stub the method
  const stub = sandbox
    .stub(ChatStore, "findMessagesByDate")
    .callsFake(async (startTimeArg, endTimeArg, roleArg, limitArg) => {
      Assert.equal(
        roleArg,
        MESSAGE_ROLE.USER,
        "Role passed to findMessagesByDate should be USER"
      );
      const startMs = normalizeToMs(startTimeArg);
      const endMs = normalizeToMs(endTimeArg);
      Assert.greaterOrEqual(endMs, startMs, "endTime should be >= startTime");
      Assert.equal(limitArg, maxResults, "limit should match maxResults");
      return messages;
    });

  try {
    const result = await getRecentChats(startTime, maxResults, halfLifeDays);

    // Assert stub was actually called
    Assert.equal(stub.callCount, 1, "findMessagesByDate should be called once");

    const [startTimeArg, , roleArg] = stub.firstCall.args;
    Assert.equal(roleArg, MESSAGE_ROLE.USER, "Role should be USER");
    const startMs = normalizeToMs(startTimeArg);

    Assert.equal(
      startMs,
      fixedNow - 1_000_000,
      "startTime should be fixedNow - 1_000_000 in ms"
    );

    Assert.equal(result.length, maxResults, "Should respect maxResults");

    const first = result[0];
    const second = result[1];

    Assert.equal(first.content, "msg1");
    Assert.equal(second.content, "msg2");

    Assert.ok("freshness_score" in first);
    Assert.greater(
      first.freshness_score,
      second.freshness_score,
      "More recent message should have higher freshness_score"
    );
  } finally {
    stub.restore();
    clock.restore?.();
  }
});

add_task(async function test_getRecentChats_filters_blocked_messages() {
  const fixedNow = 1_700_000_000_000;
  const clock = sandbox.useFakeTimers({ now: fixedNow });

  // stub to lock any message containing the token "kmeOCKME" as a whole word.
  _setBlockListManagerForTesting({
    matchAtWordBoundary: ({ text }) => /\bblockme\b/.test(text),
  });

  const messages = [
    new ChatMessage({
      createdDate: fixedNow - 1_000,
      ordinal: 1,
      role: MESSAGE_ROLE.USER,
      content: { type: "text", body: "hello blockme world" }, // should be filtered
      pageUrl: "https://example.com/blocked",
      turnIndex: 0,
    }),
    new ChatMessage({
      createdDate: fixedNow - 2_000,
      ordinal: 2,
      role: MESSAGE_ROLE.USER,
      content: { type: "text", body: "hello normal world" }, // should remain
      pageUrl: "https://example.com/ok",
      turnIndex: 0,
    }),
  ];

  const maxResults = 50;
  const halfLifeDays = 7;
  const startTime = fixedNow - 1_000_000;

  const stub = sandbox.stub(ChatStore, "findMessagesByDate").resolves(messages);

  try {
    const result = await getRecentChats(startTime, maxResults, halfLifeDays);

    Assert.equal(stub.callCount, 1, "findMessagesByDate should be called once");

    Assert.equal(result.length, 1, "Should filter out blocked message(s)");
    Assert.equal(
      result[0].content,
      "hello normal world",
      "Should keep unblocked message"
    );
    Assert.equal(
      result[0].pageUrl,
      "https://example.com/ok",
      "Should preserve pageUrl for unblocked message"
    );
    Assert.strictEqual(
      typeof result[0].freshness_score,
      "number",
      "Should include freshness_score"
    );

    // Restore default behavior for any later tests
    _setBlockListManagerForTesting({
      matchAtWordBoundary: () => false,
    });
  } finally {
    stub.restore();
    clock.restore?.();
  }
});

add_task(async function test_getRecentChats_filters_sensitive_info() {
  const fixedNow = 1_700_000_000_000;
  const clock = sandbox.useFakeTimers({ now: fixedNow });

  _setBlockListManagerForTesting({
    matchAtWordBoundary: () => false,
  });

  const messages = [
    new ChatMessage({
      createdDate: fixedNow - 1_000,
      ordinal: 1,
      role: MESSAGE_ROLE.USER,
      content: { type: "text", body: "Contact me at user@example.com" },
      pageUrl: "https://example.com/contact",
      turnIndex: 0,
    }),
    new ChatMessage({
      createdDate: fixedNow - 2_000,
      ordinal: 2,
      role: MESSAGE_ROLE.USER,
      content: { type: "text", body: "My phone is 555-123-4567" },
      pageUrl: "https://example.com/phone",
      turnIndex: 0,
    }),
    new ChatMessage({
      createdDate: fixedNow - 3_000,
      ordinal: 3,
      role: MESSAGE_ROLE.USER,
      content: { type: "text", body: "Normal message without sensitive info" },
      pageUrl: "https://example.com/normal",
      turnIndex: 0,
    }),
  ];

  const maxResults = 50;
  const halfLifeDays = 7;
  const startTime = fixedNow - 1_000_000;

  const stub = sandbox.stub(ChatStore, "findMessagesByDate").resolves(messages);

  try {
    const result = await getRecentChats(startTime, maxResults, halfLifeDays);

    Assert.equal(stub.callCount, 1, "findMessagesByDate should be called once");

    Assert.equal(
      result.length,
      1,
      "Should filter out all messages with sensitive info"
    );
    Assert.equal(
      result[0].content,
      "Normal message without sensitive info",
      "Should keep only the message without sensitive info"
    );
    Assert.equal(
      result[0].pageUrl,
      "https://example.com/normal",
      "Should preserve pageUrl for clean message"
    );

    const contentTexts = result.map(r => r.content);
    Assert.ok(
      !contentTexts.some(c => c.includes("user@example.com")),
      "Should filter message with email in content"
    );
    Assert.ok(
      !contentTexts.some(c => c.includes("555-123-4567")),
      "Should filter message with phone number in content"
    );
  } finally {
    stub.restore();
    clock.restore?.();
  }
});

add_task(async function test_getRecentChats_filters_sensitive_keywords() {
  const fixedNow = 1_700_000_000_000;
  const clock = sandbox.useFakeTimers({ now: fixedNow });

  _setBlockListManagerForTesting({
    matchAtWordBoundary: () => false,
  });

  const messages = [
    new ChatMessage({
      createdDate: fixedNow - 1_000,
      ordinal: 1,
      role: MESSAGE_ROLE.USER,
      content: { type: "text", body: "Looking for cancer treatment options" },
      pageUrl: "https://example.com/medical",
      turnIndex: 0,
    }),
    new ChatMessage({
      createdDate: fixedNow - 2_000,
      ordinal: 2,
      role: MESSAGE_ROLE.USER,
      content: {
        type: "text",
        body: "How to improve my credit score quickly",
      },
      pageUrl: "https://example.com/finance",
      turnIndex: 0,
    }),
    new ChatMessage({
      createdDate: fixedNow - 3_000,
      ordinal: 3,
      role: MESSAGE_ROLE.USER,
      content: { type: "text", body: "Finding a divorce attorney nearby" },
      pageUrl: "https://example.com/legal",
      turnIndex: 0,
    }),
    new ChatMessage({
      createdDate: fixedNow - 4_000,
      ordinal: 4,
      role: MESSAGE_ROLE.USER,
      content: { type: "text", body: "Best restaurants in San Francisco" },
      pageUrl: "https://example.com/food",
      turnIndex: 0,
    }),
    new ChatMessage({
      createdDate: fixedNow - 5_000,
      ordinal: 5,
      role: MESSAGE_ROLE.USER,
      content: { type: "text", body: "Democrat vs Republican tax policies" },
      pageUrl: "https://example.com/politics",
      turnIndex: 0,
    }),
    new ChatMessage({
      createdDate: fixedNow - 6_000,
      ordinal: 6,
      role: MESSAGE_ROLE.USER,
      content: { type: "text", body: "Pregnancy symptoms and early signs" },
      pageUrl: "https://example.com/health",
      turnIndex: 0,
    }),
  ];

  const maxResults = 50;
  const halfLifeDays = 7;
  const startTime = fixedNow - 1_000_000;

  const stub = sandbox.stub(ChatStore, "findMessagesByDate").resolves(messages);

  try {
    const result = await getRecentChats(startTime, maxResults, halfLifeDays);

    Assert.equal(stub.callCount, 1, "findMessagesByDate should be called once");

    Assert.equal(
      result.length,
      1,
      "Should filter out all messages with sensitive keywords"
    );

    Assert.equal(
      result[0].content,
      "Best restaurants in San Francisco",
      "Should keep only the message without sensitive keywords"
    );

    const contentTexts = result.map(r => r.content);

    Assert.ok(
      !contentTexts.some(c => c.toLowerCase().includes("cancer")),
      "Should filter message with medical keyword (cancer)"
    );

    Assert.ok(
      !contentTexts.some(c => c.toLowerCase().includes("credit score")),
      "Should filter message with finance keyword (credit score)"
    );

    Assert.ok(
      !contentTexts.some(c => c.toLowerCase().includes("divorce")),
      "Should filter message with legal keyword (divorce)"
    );

    Assert.ok(
      !contentTexts.some(c => c.toLowerCase().includes("democrat")),
      "Should filter message with political keyword (democrat)"
    );

    Assert.ok(
      !contentTexts.some(c => c.toLowerCase().includes("pregnancy")),
      "Should filter message with medical keyword (pregnancy)"
    );
  } finally {
    stub.restore();
    clock.restore?.();
  }
});
