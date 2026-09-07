/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

requestLongerTimeout(3);

const evalMetadata = {
  owner: "Smart Window",
  name: "Smart Window Chat Eval - gpt-oss-120b",
  description:
    "Sends a user message to MLPA via gpt-oss-120b and uses LLMaaJ to determine if the response is appropriate.",
  test: "mochitest",
  options: {
    default: {
      manifest: "eval.toml",
      manifest_flavor: "browser-chrome",
      evaluations: {
        LlmJudge: { shouldAlert: false },
      },
      perfherder: true,
    },
  },
};

const { runChatEvalForModel } = ChromeUtils.importESModule(
  "chrome://mochitests/content/browser/browser/components/aiwindow/models/tests/browser_eval/tests/basic_quality.sys.mjs"
);

add_task(async function test_chat_basic_quality_gptoss120b() {
  await runChatEvalForModel("gpt-oss-120b", {
    Assert,
    SpecialPowers,
    setupEvaluation,
    collectChatResponse,
    renderPrompt,
    reportEvalResult,
  });
});
