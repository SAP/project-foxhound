/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { PageAssist } = ChromeUtils.importESModule(
  "moz-src:///browser/components/genai/PageAssist.sys.mjs"
);

/**
 * Test PageAssist fetchAiResponse when no page data is provided
 */
add_task(async function test_fetchAiResponse_no_page_data() {
  const response = await PageAssist.fetchAiResponse("test prompt", null);
  Assert.equal(
    response,
    null,
    "Should return null when no page data is provided"
  );
});

/**
 * Test PageAssist fetchAiResponse with valid page data
 */
add_task(async function test_fetchAiResponse_valid_page_data() {
  // Create mock page data
  const mockPageData = {
    url: "https://example.com/test",
    title: "Test Page Title",
    content: "<h1>Test Content</h1>",
    textContent: "Test Content",
    excerpt: "This is a test excerpt",
    isReaderable: true,
  };

  const userPrompt = "What is this page about?";
  const response = await PageAssist.fetchAiResponse(userPrompt, mockPageData);

  // Validate response format - TODO: when response shape is finalized update this
  Assert.ok(response, "Should return a response");
});
