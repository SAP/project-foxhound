/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { generateConversationStartersSidebar } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/ConversationSuggestions.sys.mjs"
);

add_task(async function test_convo_starter_generation_with_mock_server() {
  const { server, port } = startMockOpenAI({
    streamChunks: ["suggestion 1\nsuggestion 2"],
  });
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.endpoint", `http://localhost:${port}/v1`]],
  });

  try {
    const tabs = [
      {
        url: "https://example.com",
        title: "Example Domain",
      },
    ];
    const generated = await generateConversationStartersSidebar(tabs, 2, true);
    Assert.deepEqual(
      generated,
      [
        { text: "suggestion 1", type: "chat" },
        { text: "suggestion 2", type: "chat" },
      ],
      "Should return two suggestions"
    );
  } finally {
    await SpecialPowers.popPrefEnv();
    await stopMockOpenAI(server);
  }
});
