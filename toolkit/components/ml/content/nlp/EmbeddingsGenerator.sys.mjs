/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-nocheck - TODO - Remove this to type check this file.

/**
 * This module handles the generation of embeddings using a dedicated
 * machine learning (ML) engine.
 * reference -> https://firefox-source-docs.mozilla.org/toolkit/components/ml/
 *
 * An embedding is a n-dimensional numerical representation of text
 * (e.g., mdn documentation). The embedding generation involves converting
 * text data such as title to meaningful vectors. These vectors could be
 * compared using multi-dimensional distance measures such as cosine distance.
 * Each vector is made up of values representing the relationship with
 * features defined by the model.
 *
 * Note: The "engine" referenced in this module is specifically an ML engine
 * used for feature extraction and embedding generation.
 */
import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

XPCOMUtils.defineLazyServiceGetter(
  lazy,
  "mlUtils",
  "@mozilla.org/ml-utils;1",
  Ci.nsIMLUtils
);

ChromeUtils.defineESModuleGetters(lazy, {
  createEngine: "chrome://global/content/ml/EngineProcess.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "console", () => {
  return console.createInstance({
    maxLogLevelPref: "browser.ml.logLevel",
    prefix: "GeckoMLEmbeddingsGenerator",
  });
});

// We set a limit for semantic search to see if device has at least 7 GiB
// Note: 8GB is ~7.48 GiB. So threshold has been set as 7 GiB (i.e 7.518 GB)
const REQUIRED_MEMORY_BYTES = 7 * 1024 * 1024 * 1024;
const REQUIRED_CPU_CORES = 2;

const staticEmbeddingsOptions = {
  // See https://huggingface.co/Mozilla/static-embeddings/blob/main/models/minishlab/potion-retrieval-32M/README.md
  subfolder: "models/minishlab/potion-retrieval-32M",
  // Available: fp32, fp16, fp8_e5m2, fp8_e4m3
  dtype: "fp16",
  // Avalable dimsensions: 32, 64, 128, 256, 512
  dimensions: 256,
  // Use zstd compression, probably set it to true.
  compression: true,
};

/**
 *
 */
export class EmbeddingsGenerator {
  #engine = undefined;
  #promiseEngine;
  #embeddingSize;
  options;
  #optionsByEngine = new Map([
    [
      "onnx-native",
      {
        taskName: "feature-extraction",
        featureId: "simple-text-embedder",
        timeoutMS: -1,
        numThreads: 2,
        backend: "onnx-native",

        supportedDimensions: [384],
        fallbackEngine: "onnx-wasm",
      },
    ],
    [
      "onnx-wasm",
      {
        taskName: "feature-extraction",
        featureId: "simple-text-embedder",
        timeoutMS: -1,
        numThreads: 2,
        backend: "onnx",

        supportedDimensions: [384],
      },
    ],
    [
      "static-embeddings",
      {
        featureId: "simple-text-embedder",
        modelId: "mozilla/static-embeddings",
        modelRevision: "v1.0.0",
        taskName: "static-embeddings",
        modelHub: "mozilla",
        backend: "static-embeddings",
        staticEmbeddingsOptions,

        supportedDimensions: [32, 64, 128, 256, 512],
        setDimensions(embeddingSize) {
          this.staticEmbeddingsOptions.dimensions = embeddingSize;
        },
      },
    ],
  ]);

  constructor({ backend = "static-embeddings", embeddingSize = 256 } = {}) {
    this.#embeddingSize = embeddingSize;
    this.options = this.#optionsByEngine.get(backend);
    if (!this.options) {
      throw new TypeError("Unsupported embedding engine");
    }
    if (!this.options.supportedDimensions.includes(embeddingSize)) {
      throw new TypeError("Unsupported embedding size");
    }
    this.options.setDimensions?.(embeddingSize);
  }

  /**
   * Checks if there is sufficient physical memory available.
   *
   * Compares the system's total physical memory against a defined
   * threshold (REQUIRED_MEMORY_BYTES). It retrieves the total memory
   * using the lazy.mlUtils.totalPhysicalMemory property and returns
   * a boolean indicating whether the available memory meets or exceeds
   * the threshold.
   *
   * @returns {boolean}
   *   - **true** if the total physical memory is equal to or greater
   *     than REQUIRED_MEMORY_BYTES.
   *   - **false** if the total physical memory is less than
   *     REQUIRED_MEMORY_BYTES.
   */
  isEnoughPhysicalMemoryAvailable() {
    lazy.console.debug(
      `totalPhysicalMemory = ${lazy.mlUtils.totalPhysicalMemory}`
    );
    return lazy.mlUtils.totalPhysicalMemory >= REQUIRED_MEMORY_BYTES;
  }

  /**
   * Checks if there are sufficient CPU cores available.
   *
   * Compares the system's optimal CPU concurrency against a defined
   * threshold (REQUIRED_CPU_CORES). It retrieves the number of available
   * CPU cores using the `lazy.mlUtils.getOptimalCPUConcurrency()` method
   * and returns a boolean indicating whether the available cores meet
   * or exceed the threshold.
   *
   * @returns {boolean}
   *   - **true** if the number of CPU cores is equal to or greater
   *     than REQUIRED_CPU_CORES.
   *   - **false** if the number of CPU cores is less than
   *     REQUIRED_CPU_CORES.
   */
  isEnoughCpuCoresAvailable() {
    lazy.console.debug(
      `Number of CPU cores = ${lazy.mlUtils.getOptimalCPUConcurrency()}`
    );
    return lazy.mlUtils.getOptimalCPUConcurrency() >= REQUIRED_CPU_CORES;
  }

  /**
   * Creates an ML engine if it does not already exist.
   *
   * @private
   * @returns {Promise<void>}
   *   Resolves when the engine is created or already exists.
   * @throws {Error}
   *   If the engine cannot be initialized using either primary or fallback options.
   */
  async createEngineIfNotPresent() {
    if (!this.#engine) {
      try {
        this.#engine = await lazy.createEngine(this.options);
      } catch (ex) {
        lazy.console.warn(
          `Engine ${this.options.backend} init failed. Falling back to wasm. Error:` +
            ex
        );

        // Use a fallback engine if available.
        if (this.options.fallbackEngine) {
          let options = this.#optionsByEngine.get(this.options.fallbackEngine);
          options.setDimensions?.(this.#embeddingSize);
          try {
            this.#engine = await lazy.createEngine(options);
          } catch (fallbackEx) {
            lazy.console.error(
              `Fallback engine ${options.backend} also failed. Error:` +
                fallbackEx
            );
            throw new Error(
              "Unable to initialize the ML engine (including fallback).",
              { cause: fallbackEx }
            );
          }
        } else {
          lazy.console.error(
            "Unable to initialize the ML engine and no Fallback was provided. " +
              ex
          );
          throw new Error(
            "Unable to initialize the ML engine and no Fallback was provided. ",
            { cause: ex }
          );
        }
      }
    }
  }

  /**
   * Shuts down the ML engine if it has been initialized.
   *
   * @private
   * @returns {Promise<void>}
   *   Resolves when the engine is successfully terminated, or
   *   immediately if not present.
   */
  async shutdown() {
    await this.#engine.terminate?.();
  }

  /**
   * Embeds a single text using the ML engine.
   *
   * @param {string} text
   *   The input text to be embedded.
   * @returns {Promise<any>}
   *   A promise that resolves with the embedding result from the engine.
   */
  async embed(text) {
    await this.ensureEngine();
    if (typeof text !== "string" || text.trim() === "") {
      throw new Error("Invalid input: text must be a non-empty string");
    }
    const request = {
      args: [text],
      options: { pooling: "mean", normalize: true },
    };
    return this.engineRun(request);
  }

  /**
   * Generates embeddings for multiple texts (batch of text) using the
   * ML engine.
   *
   * This asynchronous method takes an array of input texts and returns
   * an array of corresponding embedding vectors. Each vector is a
   * float array of size `#embeddingSize`, representing the mean-pooled
   * and normalized embedding of the input text.
   *
   * @param {string[]} texts
   *   The array of texts to be embedded.
   * @returns {Promise<number[][]>}
   *   A promise that resolves to an array of embedding vectors,
   *   where each vector is an array of floats with length equal to
   *  `#embeddingSize`.
   */
  async embedMany(texts) {
    await this.ensureEngine();

    if (!Array.isArray(texts)) {
      throw new Error("Expected an array of texts");
    }

    if (texts.length === 0) {
      throw new Error("embedMany received an empty array of texts");
    }

    // call the engine once with the batch of texts.
    let batchTensors = await this.engineRun({
      args: this.options.backend == "static-embeddings" ? texts : [texts],
      options: { pooling: "mean", normalize: true, max_length: 100 },
    });

    // If the result is triple nested, extract the inner array.
    if (
      Array.isArray(batchTensors) &&
      batchTensors.length === 1 &&
      Array.isArray(batchTensors[0])
    ) {
      if (batchTensors[0].length !== this.#embeddingSize) {
        batchTensors = batchTensors[0];
      }
    }
    return batchTensors;
  }

  /**
   * Ensures the ML engine is initialized.
   *
   * @returns {Promise<object>}
   *   A promise resolving to the initialized engine.
   */
  async ensureEngine() {
    if (this.#engine?.engineStatus == "closed") {
      this.#promiseEngine = null;
      this.#engine = null;
    }
    if (this.#promiseEngine) {
      return this.#promiseEngine;
    }
    let { promise, resolve } = Promise.withResolvers();
    this.#promiseEngine = promise;
    // Unset undefined synchronously so caller can use null check to skip.
    await this.createEngineIfNotPresent();
    resolve();
    return this.#engine;
  }

  // for easier testing purpose
  async engineRun(request) {
    return await this.#engine.run(request);
  }

  // Helper to wrap createEngine for testing purpose
  createEngine(args) {
    return lazy.createEngine(args);
  }

  // Helper for test
  setEngine(mockEngine) {
    this.#engine = mockEngine;
  }
}
