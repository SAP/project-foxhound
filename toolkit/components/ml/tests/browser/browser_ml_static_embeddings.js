/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * @import { Request as EngineRequest, MLEngine as MLEngineClass } from "../../actors/MLEngineParent.sys.mjs"
 * @import { StaticEmbeddingsOptions } from "../../content/backends/StaticEmbeddingsPipeline.d.ts"
 */

const { parseNpy } = ChromeUtils.importESModule(
  "chrome://global/content/ml/Utils.sys.mjs"
);

const vocabSize = 9;
const dimensions = 8;

/**
 * Mock out the URL requests with a small bad embeddings model.
 */
function getMockedValues() {
  const { encoding } = generateFloat16Numpy(vocabSize, dimensions);
  const tokenizer =
    // prettier-ignore
    {
      version: "1.0",
      truncation: null,
      padding: null,
      added_tokens: [{ id: 0, content: "[UNK]", single_word: false, lstrip: false, rstrip: false, normalized: false, special: true }],
      normalizer: { type: "BertNormalizer", clean_text: true, handle_chinese_chars: true, strip_accents: null, lowercase: true },
      pre_tokenizer: { type: "BertPreTokenizer" },
      post_processor: {
        type: "TemplateProcessing",
        single: [
          { SpecialToken: { id: "[CLS]", type_id: 0 } },
          { Sequence: { id: "A", type_id: 0 } },
          { SpecialToken: { id: "[SEP]", type_id: 0 } },
        ],
        pair: [],
        special_tokens: {},
      },
      decoder: { type: "WordPiece", prefix: "##", cleanup: true },
      model: {
        type: "WordPiece", unk_token: "[UNK]", continuing_subword_prefix: "##", max_input_chars_per_word: 100,
        vocab: { "[UNK]": 0, the: 1, quick: 2, brown: 3, dog: 4, jumped: 5, over: 6, lazy: 7, fox: 8 },
      },
    };

  return {
    "https://model-hub.mozilla.org/mozilla/static-embeddings/v1.0.0/models/minishlab/potion-retrieval-32M/tokenizer.json":
      tokenizer,
    [`https://model-hub.mozilla.org/mozilla/static-embeddings/v1.0.0/models/minishlab/potion-retrieval-32M/fp16.d${dimensions}.npy`]:
      encoding,
  };
}

add_task(async function test_static_embeddings() {
  /** @type {StaticEmbeddingsOptions} */
  const staticEmbeddingsOptions = {
    dtype: "fp16",
    subfolder: "models/minishlab/potion-retrieval-32M",
    dimensions,
    mockedValues: getMockedValues(),
    compression: false,
  };

  /** @type {MLEngineClass} */
  const engine = await createEngine(
    new PipelineOptions({
      featureId: "simple-text-embedder",
      engineId: "test-static-embeddings",

      modelId: "mozilla/static-embeddings",
      modelRevision: "v1.0.0",
      taskName: "static-embeddings",
      modelHub: "mozilla",
      backend: "static-embeddings",

      staticEmbeddingsOptions,
    })
  );

  const { output } = await engine.run({
    args: ["The quick brown fox jumped over the lazy fox"],
    options: {
      pooling: "mean",
      normalize: true,
    },
  });

  is(output.length, 1, "One embedding was returned");
  const [embedding] = output;
  is(embedding.length, dimensions, "The dimensions match");
  is(
    embedding.constructor.name,
    "Float32Array",
    "The embedding was returned as a Float32Array"
  );

  assertFloatArraysMatch(
    embedding,
    [
      0.3156551122, 0.3262447714, 0.3368626534, 0.3474076688, 0.3580137789,
      0.3685869872, 0.3791790008, 0.3898085951,
    ],
    "The embeddings were computed as expected.",
    0.00001 // epsilon
  );
});
