/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const {
  TOKEN_CHARACTER,
  createParserState,
  parseToken,
  consumeStreamChunk,
  flushTokenRemainder,
} = ChromeUtils.importESModule(
  "chrome://browser/content/aiwindow/modules/TokenStreamParser.mjs"
);

add_setup(async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.suggest.enabled", false],
      ["browser.urlbar.suggest.searches", false],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
    ],
  });
});

add_task(function test_parseToken() {
  Assert.equal(TOKEN_CHARACTER, "§");

  Assert.deepEqual(parseToken("search: cats"), {
    key: "search",
    value: "cats",
  });
  Assert.deepEqual(parseToken("search: https://a:b"), {
    key: "search",
    value: "https://a:b",
  });

  Assert.deepEqual(parseToken("non_approved_key"), null);
  Assert.equal(parseToken(""), null);
  Assert.equal(parseToken("   "), null);
  Assert.equal(parseToken(": value"), null);
});

add_task(function test_consumeStreamChunk_split_across_chunks() {
  const state = createParserState();

  const r1 = consumeStreamChunk("Hello §search: ca", state);
  Assert.equal(r1.plainText, "Hello ");
  Assert.deepEqual(r1.tokens, []);
  Assert.equal(state.inToken, true);
  Assert.equal(state.tokenBuffer, "search: ca");

  const r2 = consumeStreamChunk("ts§ world", state);
  Assert.equal(r2.plainText, " world");
  Assert.deepEqual(r2.tokens, [{ key: "search", value: "cats" }]);
  Assert.equal(state.inToken, false);
  Assert.equal(state.tokenBuffer, "");
});

add_task(function test_consumeStreamChunk_multiple_tokens_one_chunk() {
  const state = createParserState();

  const r = consumeStreamChunk(
    "A §search: dogs§ B §existing_memory: mem1§ C",
    state
  );
  Assert.equal(r.plainText, "A  B  C");
  Assert.deepEqual(r.tokens, [
    { key: "search", value: "dogs" },
    { key: "existing_memory", value: "mem1" },
  ]);
});

add_task(function test_consumeStreamChunk_followup_token() {
  const state = createParserState();

  const r = consumeStreamChunk("Reply §followup: Summarize this§ done.", state);
  Assert.equal(r.plainText, "Reply  done.");
  Assert.deepEqual(r.tokens, [{ key: "followup", value: "Summarize this" }]);
});

add_task(function test_consumeStreamChunk_unknown_key_is_literal_text() {
  const state = createParserState();

  // With allowed-start gating, this should NOT become a token; it should stream as literal text.
  const r = consumeStreamChunk("§flag§", state);
  Assert.deepEqual(r.tokens, []);

  // Because the last '§' can be deferred (pendingOpen), assemble final output like end-of-stream would.
  const out = r.plainText + flushTokenRemainder(state);
  Assert.equal(out, "§flag§");
  Assert.equal(state.inToken, false);
  Assert.equal(state.tokenBuffer, "");
});

add_task(function test_consumeStreamChunk_invalid_token_is_literal_text() {
  const state = createParserState();

  // Invalid token start (":") should not stall and should remain visible.
  const r = consumeStreamChunk("X §: value§ Y", state);
  Assert.deepEqual(r.tokens, []);
  const out = r.plainText + flushTokenRemainder(state);
  Assert.equal(out, "X §: value§ Y");
  Assert.equal(state.inToken, false);
  Assert.equal(state.tokenBuffer, "");
});

add_task(
  function test_consumeStreamChunk_stray_section_symbol_does_not_stall() {
    const state = createParserState();

    const r = consumeStreamChunk("in §123, text …", state);
    Assert.deepEqual(r.tokens, []);
    const out = r.plainText + flushTokenRemainder(state);
    Assert.equal(out, "in §123, text …");
    Assert.equal(state.inToken, false);
    Assert.equal(state.tokenBuffer, "");
  }
);

add_task(function test_flushTokenRemainder_unclosed_valid_token() {
  const state = createParserState();

  consumeStreamChunk("Hi §search: cats", state);
  Assert.equal(state.inToken, true);

  const remainder = flushTokenRemainder(state);
  Assert.equal(remainder, "§search: cats");
  Assert.equal(state.inToken, false);
  Assert.equal(state.tokenBuffer, "");
});
