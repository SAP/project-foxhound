/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { generateChatTitle } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/TitleGeneration.sys.mjs"
);

add_task(async function test_title_generation_with_mock_server() {
  const { server, port } = startTitleGenerationServer("fake title");
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.endpoint", `http://localhost:${port}/v1`]],
  });

  try {
    const generated = await generateChatTitle("message", null);
    Assert.equal(generated, "fake title", "Should return the generated title");
  } finally {
    await SpecialPowers.popPrefEnv();
    await stopMockOpenAI(server);
  }
});
