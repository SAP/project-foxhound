/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-nocheck - TODO - Remove this to type check this file.

/**
 * @import {ProgressAndStatusCallbackParams} from "../../content/Utils.sys.mjs"
 */

// The following globals are defined in dom/webidl/LlamaRunner.webidl
/* global LlamaRunner,  */

/* eslint-disable mozilla/reject-import-system-module-from-non-system */
import {
  createFileUrl,
  Progress,
} from "chrome://global/content/ml/Utils.sys.mjs";

import { OPFS } from "chrome://global/content/ml/OPFS.sys.mjs";

/**
 * Log level set by the pipeline.
 *
 * @type {string}
 */
let _logLevel = "Error";

/**
 * Lazy initialization container.
 *
 * @type {object}
 */
const lazy = {};

ChromeUtils.defineLazyGetter(lazy, "console", () => {
  return console.createInstance({
    maxLogLevel: _logLevel, // we can't use maxLogLevelPref in workers.
    prefix: "ML:LlamaCppPipeline",
  });
});

/**
 * Initializes the LlamaPipeline with the specified model and runtime configuration.
 *
 * @param {object} mlEngineWorker - The machine learning engine worker responsible for execution.
 * @param {ArrayBuffer} wasm - The buffer to the WebAssembly (WASM) binary required for execution.
 * @param {object} options - Configuration options for the pipeline.
 * @param {string} [options.modelHubUrlTemplate] - URL template for fetching models.
 * @param {string} [options.modelHubRootUrl] - Root URL for the model hub.
 * @param {string} [options.modelId] - Identifier of the model to be loaded.
 * @param {string} [options.modelRevision] - Specific revision of the model to be used.
 * @param {string} [options.modelFile] - Name of the model file to load.
 * @param {number} [options.numContext=700] - Number of context tokens to use for inference.
 * @param {number} [options.numBatch=700] - Number of tokens to process in a batch.
 * @param {number} [options.numUbatch=700] - Number of micro-batches to split inference into.
 * @param {number} [options.numThreads=0] - Number of CPU threads to use (default: auto).
 * @param {boolean} [options.flashAttn=false] - Whether to enable Flash Attention for optimization.
 * @param {boolean} [options.useMmap=false] - Whether to use memory-mapped file loading.
 * @param {boolean} [options.useMlock=true] - Whether to lock model files in memory to prevent swapping.
 * @param {string} [options.kvCacheDtype="q8_0"] - Data type of the model weights (e.g., "q8_0" for 8-bit quantization).
 * @param {number} [options.numThreadsDecoding=0] - Number of threads to use for decoding (default: auto).
 *
 * @returns {Promise<LlamaCppPipeline>} A promise that resolves to an initialized LlamaPipeline instance.
 */
export class LlamaCppPipeline {
  generator = null;
  #options = {};
  #errorFactory = null;

  constructor(generator, options, errorFactory) {
    /** @type {LlamaRunner} */
    this.generator = generator;
    this.#errorFactory = errorFactory;
    this.#options = options;
  }

  static async initialize(
    mlEngineWorker,
    wasm,
    {
      modelHubUrlTemplate,
      modelHubRootUrl,
      modelId,
      modelRevision,
      modelFile,
      numContext = 700,
      numBatch = 700,
      numUbatch = 700,
      numThreads = 0,
      flashAttn = false,
      useMmap = false,
      useMlock = true,
      kvCacheDtype = "q8_0",
      numThreadsDecoding = 0,
    } = {},
    errorFactory
  ) {
    let startInitTime = ChromeUtils.now();

    const modelFilePath = (
      await mlEngineWorker.getModelFile({
        url: createFileUrl({
          model: modelId,
          revision: modelRevision,
          file: modelFile,
          urlTemplate: modelHubUrlTemplate,
          rootUrl: modelHubRootUrl,
        }),
      })
    ).ok[2];

    lazy.console.debug("Model local path is", { modelFilePath });

    let options = {};

    let cacheType = "f32";

    if (flashAttn) {
      cacheType = "f16";

      if (kvCacheDtype) {
        cacheType = kvCacheDtype.replace("fp", "f");
      }
    }

    if (numThreadsDecoding <= 0) {
      numThreadsDecoding = numThreads;
    }

    if (numThreads >= 1) {
      options.n_threads = numThreads;
    }

    if (numThreadsDecoding >= 1) {
      options.n_threads_decoding = numThreadsDecoding;
    }

    options = {
      n_ctx: numContext,
      useCache: false,
      n_gpu_layers: 0,
      offload_kqv: false,
      n_batch: numBatch,
      n_ubatch: numUbatch,
      use_mmap: useMmap,
      use_mlock: useMlock,
      flash_attn: flashAttn,
      cache_type_k: cacheType,
      cache_type_v: cacheType,
      ...options,
      modelFilePath,
    };

    let opfsStart = ChromeUtils.now();
    const modelBlob = await (await OPFS.getFileHandle(modelFilePath)).getFile();
    ChromeUtils.addProfilerMarker(
      "MLEngine:llama.cpp",
      { startTime: opfsStart },
      `Retrieve model file from OPFS`
    );

    const generator = new LlamaRunner();

    await generator.initialize(
      {
        useMmap,
        useMlock,
        context: {
          nThreads: options.n_threads,
          nThreadsBatch: options.n_threads_decoding,
          nCtx: numContext,
        },
      },
      modelBlob
    );

    lazy.console.debug("Init time", ChromeUtils.now() - startInitTime);

    ChromeUtils.addProfilerMarker(
      "MLEngine:llama.cpp",
      { startTime: startInitTime },
      `Initialize: ${modelId}, ctx=${numContext}, threads=${options.n_threads}/${options.n_threads_decoding}`
    );

    return new LlamaCppPipeline(generator, options, errorFactory);
  }

  /**
   * Runs text generation based on the given prompt using the Llama model.
   *
   * @param {object} options - The options for text generation.
   * @param {string | string[]} options.prompt - The input prompt or an array of chat messages.
   * @param {number} [options.nPredict=100] - The number of tokens to generate.
   * @param {boolean} [options.skipPrompt=true] - If true, skips processing the prompt tokens.
   * @param {number} [options.stopTokens=[]] - List of custom token IDs for stopping the generation.
   * @param {object} [options.context] - Generation context
   * @param {object[]} [options.samplers] - List of samplers.
   * @param {boolean} [options.stopOnEndOfGenerationTokens] - Wether to stop generations on model-specific eog tokens.
   * @param {number} [options.minOutputBufferSize] - Buffer size for the generated tokens to be sent.
   * @param {string|null} [requestId=null] - An optional identifier for tracking the request.
   * @param {?function(ProgressAndStatusCallbackParams):void|null} [inferenceProgressCallback=null] - A callback function to track inference progress.
   *        It receives an object containing:
   *        - `{boolean} ok`: Whether the operation succeeded.
   *        - `{Object} metadata`: Additional metadata (text, tokens, requestId, etc.).
   *        - `{Progress.ProgressType} type`: The type of progress event.
   *        - `{Progress.ProgressStatusText} statusText`: The current status.
   * @param {MessagePort|null} [port=null] - An optional MessageChannel port for sending progressive inference updates.
   *
   * @returns {Promise<string>} A promise that resolves to the generated text output.
   *
   * @throws {Error} If an error occurs during inference, it is thrown and also sent via the port or callback.
   */
  async run(
    {
      prompt,
      nPredict,
      skipPrompt = true,
      samplers,
      context,
      stopTokens,
      stopOnEndOfGenerationTokens,
      minOutputBufferSize = 20,
    } = {},
    requestId = null,
    inferenceProgressCallback = null,
    port = null
  ) {
    try {
      let startTime = ChromeUtils.now();
      let endPromptTime = null;
      let startPromptTime = startTime;
      let startDecodingTime = null;

      let output = "";

      lazy.console.error("Running this.generator.createGenerationStream");

      let formattedPrompt = prompt;

      if (Array.isArray(prompt)) {
        lazy.console.error("received prompt", prompt);
        let formatChatStart = ChromeUtils.now();
        formattedPrompt = await this.generator.formatChat({ messages: prompt });
        ChromeUtils.addProfilerMarker(
          "MLEngine:llama.cpp",
          { startTime: formatChatStart },
          `Format chat messages`
        );
        lazy.console.error("formated prompt ", formattedPrompt);
      }

      const stream = this.generator.createGenerationStream({
        prompt: formattedPrompt,
        maxGeneratedTokens: nPredict,
        minOutputBufferSize,
        context: {
          nThreads: this.#options.n_threads,
          nThreadsBatch: this.#options.n_threads_decoding,
          ...(context || {}),
        },
        samplers,
        stopTokens,
        stopOnEndOfGenerationTokens,
      });

      let chunkStartTime = ChromeUtils.now();
      let tokenCount = 0;
      for await (const chunk of stream) {
        const isPrompt = chunk.phase == "prompt";

        if (isPrompt && chunk.isPhaseCompleted) {
          endPromptTime = ChromeUtils.now();
        } else if (!startDecodingTime) {
          startDecodingTime = ChromeUtils.now();
        }

        if (skipPrompt && isPrompt) {
          continue;
        }
        output += chunk;
        port?.postMessage({
          tokens: chunk.tokens,
          ok: true,
          isPrompt,
          text: chunk.piece,
        });

        inferenceProgressCallback?.({
          ok: true,
          metadata: {
            text: chunk.piece,
            tokens: chunk.tokens,
            isPrompt,
            requestId,
          },
          type: Progress.ProgressType.INFERENCE,
          statusText: Progress.ProgressStatusText.IN_PROGRESS,
        });
        tokenCount += chunk.tokens.length;
        ChromeUtils.addProfilerMarker(
          "MLEngine:llama.cpp",
          chunkStartTime,
          `Generate ${chunk.tokens.length} tokens`
        );
        chunkStartTime = ChromeUtils.now();
      }

      const endTime = ChromeUtils.now();
      const promptTime = endPromptTime - startPromptTime;
      const decodingTime = endTime - startDecodingTime;
      lazy.console.debug("Decoding time", decodingTime);
      lazy.console.debug("Prompt time", promptTime);
      lazy.console.debug("Overall time", endTime - startTime);
      lazy.console.debug("Generated", output);

      ChromeUtils.addProfilerMarker(
        "MLEngine:llama.cpp",
        { startTime: startPromptTime },
        `Prompt generation (${tokenCount} tokens generated)`
      );

      port?.postMessage({ done: true, finalOutput: output, ok: true });

      inferenceProgressCallback?.({
        ok: true,
        metadata: {
          text: "",
          requestId,
          tokens: [],
        },
        type: Progress.ProgressType.INFERENCE,
        statusText: Progress.ProgressStatusText.DONE,
      });

      return { done: true, finalOutput: output, ok: true, metrics: [] };
    } catch (error) {
      const backendError = this.#errorFactory(error);
      port?.postMessage({ done: true, ok: false, error: backendError });

      inferenceProgressCallback?.({
        ok: false,
        metadata: {
          text: "",
          requestId,
          tokens: [],
        },
        type: Progress.ProgressType.INFERENCE,
        statusText: Progress.ProgressStatusText.DONE,
      });

      throw backendError;
    }
  }
}
