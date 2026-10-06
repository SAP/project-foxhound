/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const evalMetadata = {
  owner: "ML Team",
  name: "Synthetic Translation Eval",
  description:
    "Synthetic translation output to validate the evaluation harness wiring.",
  test: "mochitest",
  options: {
    default: {
      manifest: "eval.toml",
      manifest_flavor: "browser-chrome",
      evaluations: {
        TranslationsBleu: { shouldAlert: false },
        TranslationsChrf: { shouldAlert: false },
        TranslationsLlmJudge: { shouldAlert: false },
      },
      perfherder: true,
    },
  },
};

add_task(async function test_synthetic_translation_eval() {
  const src = "Bonjour le monde";
  const trg = "Hello the world";
  const ref = "Hello world";

  MLTestUtils.reportEvalData({
    langPair: { src: "fr", trg: "en" },
    src,
    trg,
    ref,
  });

  ok(true, "Synthetic eval result recorded.");
});
