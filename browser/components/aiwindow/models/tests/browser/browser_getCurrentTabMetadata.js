/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { getCurrentTabMetadata, sanitizeUntrustedContent } =
  ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/models/ChatUtils.sys.mjs"
  );

add_task(async function test_getCurrentTabMetadata_basic() {
  const contextMentions = [
    {
      url: "https://example.com",
      label: "Example Domain",
      type: "tab",
      description: "",
    },
    {
      url: "https://example.net",
      label: "Test Page Title",
      type: "currentTab",
      description: "",
    },
  ];
  const metadata = await getCurrentTabMetadata(contextMentions);

  is(metadata.url, "https://example.net", "Should return the correct URL");
  is(
    metadata.title,
    sanitizeUntrustedContent("Test Page Title"),
    "Should return the correct title"
  );
  Assert.strictEqual(
    typeof metadata.description,
    "string",
    "Should return a string description"
  );
});

add_task(async function test_getCurrentTabMetadata_no_current_tab() {
  const contextMentions = [
    {
      url: "https://example.com",
      label: "Example Domain",
      type: "tab",
      description: "",
    },
  ];
  const metadata = await getCurrentTabMetadata(contextMentions);

  is(metadata.url, "", "Should return empty url");
  is(metadata.title, "", "Should return empty title");
  is(metadata.description, "", "Should return empty description");
});
