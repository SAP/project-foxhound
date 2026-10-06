/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { parseMarkdown } = ChromeUtils.importESModule(
  "chrome://browser/content/aiwindow/modules/ChatMarkdownParser.mjs"
);

const { createParserState, consumeStreamChunk, flushTokenRemainder } =
  ChromeUtils.importESModule(
    "chrome://browser/content/aiwindow/modules/TokenStreamParser.mjs"
  );

function streamThroughTokenParser(chunks, tokenToUrl = new Map()) {
  const state = createParserState();
  let body = "";
  for (const chunk of chunks) {
    body += consumeStreamChunk(chunk, state, tokenToUrl).plainText;
  }
  body += flushTokenRemainder(state);
  return body;
}

function countAnchors(html) {
  return (html.match(/<a\b/g) || []).length;
}

function getAnchorHref(html) {
  return html.match(/<a [^>]*href="([^"]*)"/)?.[1] ?? null;
}

function getAnchorText(html) {
  return html.match(/<a [^>]*>([^<]*)<\/a>/)?.[1] ?? null;
}

function getOpenTagIndex(result, tag) {
  let index = result.indexOf(`<${tag}>`);
  // The tag can have attributes, fallback to checking the start of the
  // opening tag only.
  if (index === -1) {
    index = result.indexOf(`<${tag} `);
  }
  return index;
}

function assertHasTag(result, tag) {
  Assert.notStrictEqual(
    getOpenTagIndex(result, tag),
    -1,
    `Should contain opening <${tag}>`
  );
  Assert.ok(result.includes(`</${tag}>`), `Should contain closing </${tag}>`);
}

function assertTagsNestedOrder(result, tags) {
  let lastOpenIndex = -1;
  let lastCloseIndex = result.length;
  for (const tag of tags) {
    assertHasTag(result, tag);

    const openIndex = getOpenTagIndex(result, tag);
    const closeIndex = result.indexOf(`</${tag}>`);
    Assert.greater(
      openIndex,
      lastOpenIndex,
      `<${tag}> should be nested inside outer tag`
    );
    Assert.less(
      closeIndex,
      lastCloseIndex,
      `</${tag}> should close before outer tag`
    );

    lastOpenIndex = openIndex;
    lastCloseIndex = closeIndex;
  }
}

add_task(function test_parse_markdown_basic_text() {
  const result = parseMarkdown("Hello world");
  Assert.ok(result.includes("Hello world"), "Should contain the text");
  assertHasTag(result, "p");
});

add_task(function test_parse_markdown_bold() {
  const result = parseMarkdown("**bold text**");
  assertHasTag(result, "strong");
  Assert.ok(result.includes("bold text"), "Should contain the text");
});

add_task(function test_parse_markdown_italic() {
  const result = parseMarkdown("*italic text*");
  assertHasTag(result, "em");
});

add_task(function test_parse_markdown_inline_code() {
  const result = parseMarkdown("`inline code`");
  assertHasTag(result, "code");
});

add_task(function test_parse_markdown_code_block() {
  const result = parseMarkdown("```\ncode block\n```");
  assertHasTag(result, "pre");
  assertHasTag(result, "code");
});

add_task(function test_parse_markdown_link() {
  const result = parseMarkdown("[link text](https://example.com)");
  Assert.ok(result.includes("<a "), "Should contain opening <a>");
  Assert.ok(result.includes("</a>"), "Should contain closing </a>");
  Assert.ok(result.includes('href="https://example.com"'), "Should have href");
});

add_task(function test_parse_markdown_unordered_list() {
  const result = parseMarkdown("- item 1\n- item 2");
  assertHasTag(result, "ul");
  assertHasTag(result, "li");
});

add_task(function test_parse_markdown_ordered_list() {
  const result = parseMarkdown("1. first\n2. second");
  assertHasTag(result, "ol");
});

add_task(function test_parse_markdown_empty_string() {
  const result = parseMarkdown("");
  Assert.equal(result, "", "Empty input should return empty string");
});

add_task(function test_parse_markdown_whitespace_only() {
  const result = parseMarkdown("    ");
  Assert.equal(
    result.trim(),
    "",
    "Whitespace input should return empty string"
  );
});

add_task(function test_parse_markdown_basic_html_not_rendered() {
  const result = parseMarkdown("<script>alert('xss')</script>");
  Assert.ok(!result.includes("<script>"), "Should not contain script tag");
});

add_task(function test_parse_markdown_table_wrapping() {
  const tableMarkdown = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`;

  const result = parseMarkdown(tableMarkdown);

  assertTagsNestedOrder(result, ["ai-chat-table", "table", "thead", "th"]);
  assertTagsNestedOrder(result, ["ai-chat-table", "table", "tbody", "td"]);
  Assert.ok(result.includes("Header 1"), "Should contain Header 1");
  Assert.ok(result.includes("Cell 1"), "Should contain Cell 1");
});

add_task(function test_parse_markdown_multiple_tables() {
  const markdown = `First table:

| A1 | B1 |
|----|----|
| 1  | 2  |

Second table:

| A2 | B2 |
|----|----|
| 3  | 4  |`;

  const result = parseMarkdown(markdown);
  const wrapperCount = result.split("<ai-chat-table").length - 1;
  Assert.equal(wrapperCount, 2, "Should have two table wrappers");
});

// Bug 2017972 - some real URLs contain characters (spaces, stray parens)
// that markdown reads as "end of URL", which broke the surrounding
// [text](url) syntax and leaked brackets into the page. Wrapping the URL
// in <...> tells markdown to take it as-is. These tests lock in that
// behavior.

add_task(function test_parse_markdown_baseline_unbalanced_paren_in_url() {
  const result = parseMarkdown("[Amazon](https://example.com/foo)bar)");
  Assert.equal(getAnchorHref(result), "https://example.com/foo");
  Assert.ok(
    result.includes("bar)"),
    `Trailing chars after the truncated URL render as literal text; got: ${result}`
  );
});

add_task(function test_streaming_url_token_with_unbalanced_paren() {
  const tokenToUrl = new Map([
    ["URL_AMAZON_1", "https://www.amazon.com/dp/B01)abc"],
  ]);
  const body = streamThroughTokenParser(
    ["[Buy on Amazon](§url_token:", "URL_AMAZON_1§)"],
    tokenToUrl
  );
  Assert.ok(
    body.includes("https://www.amazon.com/dp/B01%29abc"),
    `Unbalanced ')' in URL should be percent-encoded; got: ${body}`
  );
  Assert.ok(
    !body.includes("<https://"),
    `URL inside a link destination should not be wrapped in <...>; got: ${body}`
  );

  const result = parseMarkdown(body);
  Assert.equal(
    countAnchors(result),
    1,
    `Expected exactly one anchor in: ${result}`
  );
  Assert.equal(getAnchorText(result), "Buy on Amazon");
  Assert.ok(
    getAnchorHref(result)?.includes("abc"),
    `Anchor href should preserve the trailing portion of the URL; got: ${result}`
  );
  Assert.ok(
    !/\)\s*<\/p>/.test(result),
    `No stray ")" should appear after the anchor; got: ${result}`
  );
});

add_task(function test_streaming_url_token_inside_link_with_appended_text() {
  // The model sometimes appends extra path/query characters after the
  // URL token, e.g. [click](§url§/extra). The expansion must not break
  // the surrounding link syntax.
  const tokenToUrl = new Map([["URL_X_1", "https://example.com"]]);
  const body = streamThroughTokenParser(
    ["[click](§url_token:URL_X_1§/extra?q=1)"],
    tokenToUrl
  );

  const result = parseMarkdown(body);
  Assert.equal(
    countAnchors(result),
    1,
    `Trailing characters after a URL token should still parse as one link; got: ${result}`
  );
  Assert.equal(getAnchorText(result), "click");
  Assert.equal(getAnchorHref(result), "https://example.com/extra?q=1");
});

add_task(function test_streaming_url_token_outside_link_with_whitespace() {
  // A bare URL token whose value contains whitespace must still render
  // as a clickable link. Autolink syntax forbids whitespace, so the
  // expansion percent-encodes spaces inside the <...> wrapper.
  const tokenToUrl = new Map([
    ["URL_X_1", "https://example.com/path with space"],
  ]);
  const body = streamThroughTokenParser(
    ["See §url_token:URL_X_1§ for details."],
    tokenToUrl
  );
  Assert.ok(
    body.includes("<https://example.com/path%20with%20space>"),
    `Whitespace in a bare-token URL should be percent-encoded; got: ${body}`
  );

  const result = parseMarkdown(body);
  Assert.equal(
    countAnchors(result),
    1,
    `Bare URL token with whitespace should still render as one anchor; got: ${result}`
  );
});

add_task(function test_streaming_url_token_with_whitespace_in_url() {
  const tokenToUrl = new Map([
    ["URL_X_1", "https://example.com/path with space"],
  ]);
  const body = streamThroughTokenParser(
    ["[Click here](§url_token:URL_X_1§)"],
    tokenToUrl
  );

  const result = parseMarkdown(body);
  Assert.equal(
    countAnchors(result),
    1,
    `Whitespace in URL should not prevent anchor formation; got: ${result}`
  );
  Assert.equal(getAnchorText(result), "Click here");
});

add_task(function test_streaming_url_token_with_balanced_parens() {
  const tokenToUrl = new Map([
    ["URL_WIKI_1", "https://en.wikipedia.org/wiki/Amazon_(company)"],
  ]);
  const body = streamThroughTokenParser(
    ["[Amazon](§url_token:URL_WIKI_1§)"],
    tokenToUrl
  );
  const result = parseMarkdown(body);
  Assert.equal(
    getAnchorHref(result),
    "https://en.wikipedia.org/wiki/Amazon_(company)",
    `Balanced-paren URL should be preserved; got: ${result}`
  );
});

add_task(function test_streaming_url_token_with_angle_brackets_in_url() {
  // Literal `<` or `>` would terminate the autolink wrapper, so the
  // expansion percent-encodes them.
  const tokenToUrl = new Map([["URL_X_1", "https://example.com/foo<bar>baz"]]);
  const body = streamThroughTokenParser(
    ["[Click](§url_token:URL_X_1§)"],
    tokenToUrl
  );
  Assert.ok(
    body.includes("%3C") && body.includes("%3E"),
    `Angle brackets should be percent-encoded in the wrapped URL; got: ${body}`
  );

  const result = parseMarkdown(body);
  Assert.equal(countAnchors(result), 1);
  Assert.equal(getAnchorText(result), "Click");
});

add_task(function test_streaming_url_token_outside_link_renders_autolink() {
  const tokenToUrl = new Map([["URL_X_1", "https://example.com/page"]]);
  const body = streamThroughTokenParser(
    ["See §url_token:URL_X_1§ for details."],
    tokenToUrl
  );
  Assert.equal(
    body,
    "See <https://example.com/page> for details.",
    `Bare URL token should expand to an autolink; got: ${body}`
  );
  const result = parseMarkdown(body);
  Assert.equal(countAnchors(result), 1);
  Assert.equal(getAnchorHref(result), "https://example.com/page");
});

add_task(function test_parse_markdown_mixed_content() {
  const markdown = `# Heading

Some **bold** text

| Col1 | Col2 |
|------|------|
| A    | B    |

Text after the table`;

  const result = parseMarkdown(markdown);
  assertHasTag(result, "h1");
  assertHasTag(result, "strong");
  assertHasTag(result, "ai-chat-table");
  Assert.ok(
    result.includes("Text after the table"),
    "Should contain trailing text"
  );
});
