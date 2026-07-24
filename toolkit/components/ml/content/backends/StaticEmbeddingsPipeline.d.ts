/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export type EmbeddingPooling = "mean" | "sum" | "max";

export type EmbeddingDType = "fp32" | "fp16" | "fp8_e5m2" | "fp8_e4m3";

/**
 * The options that can be passed in for embedding.
 */
export interface EmbeddingOptions {
  pooling: EmbeddingPooling;
  dimensions: EmbeddingDType;
  normalize: boolean;
}

/**
 * The full request for embedding text. Takes a list of embeddings.
 */
export interface EmbeddingRequest {
  args: string[];
  options: EmbeddingOptions;
}

/**
 * This is the tokenenizer.json that is used to configur the PreTrainedTokenizer class
 * in transformers.js.
 */
export interface TokenizerJSON {
  added_tokens: any[]; // Array(5) [ {…}, {…}, {…}, … ]
  decoder: any; // { type: "WordPiece", prefix: "##", cleanup: true }
  model: any; // { type: "WordPiece", unk_token: "[UNK]", continuing_subword_prefix: "##", … }
  normalizer: any; // { type: "BertNormalizer", clean_text: true, handle_chinese_chars: true, … }
  padding: null; //
  post_processor: any; // { type: "TemplateProcessing", single: (3) […], pair: (5) […], … }
  pre_tokenizer: any; // { type: "BertPreTokenizer" }
  version: string; // "1.0"
}

export interface EmbeddingResponse {
  metrics: Array<{ name: string; when: number }>;
  output: Array<Float32Array>;
}

/**
 * The options for configuring the static embeddings engine.
 *
 * @see https://huggingface.co/Mozilla/static-embeddings.
 */
export interface StaticEmbeddingsOptions {
  /**
   * The path to the models in the repo. equivalent to the `subfolder` property
   * in transformers.
   *
   * e.g. "models/minishlab/potion-retrieval-32M"
   *
   * View the available models here:
   * @see https://huggingface.co/Mozilla/static-embeddings/tree/main/models
   */
  subfolder: string;

  /**
   * The precision of the embeddings. Generally fp8_e4m3 is smallest that still
   * performs well. There is almost no quality improvement from fp16 to fp32.
   * See the model cards for more information.
   */
  dtype: "fp32" | "fp16" | "fp8_e5m2" | "fp8_e4m3";
  /**
   * See each model card for what dimensions are available. Generally models are trained
   * with Matroyshka loss so it's best to pick one of the pre-defined dimensions.
   */
  dimensions: number;
  /**
   * Whether or not to use ZST compression. There is a small trade off between the speed
   * of loading the model, and the size on disk and download time.
   */
  compression: boolean;

  /**
   * Mock the buffer data for a url for tests.
   */
  mockedValues?: Record<string, Iterable<number>>;
}

/**
 * Stub type defintion for transfomers.js
 *
 * @see https://huggingface.co/docs/transformers.js/api/tokenizers#module_tokenizers.PreTrainedTokenizer
 */
interface PreTrainedTokenizer {
  model: { vocab: Array<any> };
  encode(text: string): number[];
}
