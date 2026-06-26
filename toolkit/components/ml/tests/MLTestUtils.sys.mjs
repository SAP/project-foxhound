/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * @import { EngineResponses, EngineRequests, ChunkResponse, EngineFeatureIds } from "../ml.d.ts"
 */

/**
 * @typedef {string | string[] | ChunkResponse | ChunkResponse[] | EngineResponses["chat"]} MockedResponse
 */

/**
 * @typedef {object} MockedRequest
 * @property {EngineRequests["chat"]} request
 * @property {(response: MockedResponse) => void} resolve
 * @property {(reason: any) => void} reject
 */

/**
 * @import { PageExtractorParent } from "../../pageextractor/PageExtractorParent.sys.mjs"
 */

import { BrowserTestUtils } from "resource://testing-common/BrowserTestUtils.sys.mjs";
import { HttpServer } from "resource://testing-common/httpd.sys.mjs";

/**
 * @param {TemplateStringsArray} strings
 * @param {any[]} values
 * @returns {string}
 */
function joinTemplate(strings, values) {
  let result = "";
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      result += values[i];
    }
  }
  return result;
}

const EXTRA_RESPONSE_ARGS = {
  metrics: [],
  resourcesBefore: { cpuTime: null, memory: null },
  resourcesAfter: { cpuTime: null, memory: null },
};

/**
 * Create an HTTP server that serves HTML once.
 *
 * @param {string} markup - The HTML content to serve
 * @param {number} code - HTTP status code
 * @returns {{url: string, cleanup: () => Promise<void>}}
 */
function createServer(markup, code) {
  const server = new HttpServer();

  const { promise, resolve } = Promise.withResolvers();
  const encoder = new TextEncoder();
  const htmlUtf8 = encoder.encode(markup);

  /** @type {nsIHttpRequestHandler} */
  const pageHandler = (request, response) => {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setStatusLine(request.httpVersion, code, "");

    const binaryOutputStream = Cc[
      "@mozilla.org/binaryoutputstream;1"
    ].createInstance(Ci.nsIBinaryOutputStream);

    binaryOutputStream.setOutputStream(response.bodyOutputStream);
    binaryOutputStream.writeByteArray(
      /**
       * @type {any} - The type expects a number[], while we are passing a Uint8Array.
       */ (htmlUtf8)
    );

    resolve(server.stop());
  };

  server.registerPathHandler("/page.html", pageHandler);

  server.start(-1);

  let { primaryHost, primaryPort } = server.identity;
  // eslint-disable-next-line @microsoft/sdl/no-insecure-url
  const url = `http://${primaryHost}:${primaryPort}/page.html`;

  return {
    url,
    cleanup: () => promise,
  };
}

/**
 * Mock an LLM with artificial calls. This is useful for testing various user flows when
 * you want a deterministic response from the language model. Just swap out your chat
 * engine instance with this one.
 *
 * See toolkit/components/ml/tests/browser/browser_ml_mock_llm_engine.js for example usage.
 *
 * @template {EngineFeatureIds} FeatureID
 */
export class MockLLMEngine {
  #nextRequestId = 0;

  /** @type {Map<number, MockedRequest>} */
  #runRequests = new Map();

  get runRequests() {
    if (!Cu.isInAutomation) {
      throw new Error(
        "The MockLLMEngine#runRequests property must only be used in automation."
      );
    }
    return this.#runRequests;
  }

  /**
   * A convenience function get the next request that was sent.
   *
   * @returns {[number, MockedRequest]}
   */
  getNextRequest() {
    const { value, done } = this.#runRequests.entries().next();
    if (done) {
      throw new Error("There is no next request for the MockLLMEngine.");
    }
    return value;
  }

  /**
   * Intentionally reject all requests to clear out anything pending.
   */
  rejectAllRequests() {
    for (const [, { reject }] of this.#runRequests) {
      reject(new Error("Intentionally rejecting requests"));
    }
    this.#runRequests = new Map();
  }

  /**
   * Provide a deterministic artificial response from the language model. This
   * is only available from tests. If an array of strings is passed then the
   * response will simulate chunking behavior.
   *
   * @param {number} requestId
   * @param {MockedResponse} response
   */
  respond(requestId, response) {
    if (!Cu.isInAutomation) {
      throw new Error(
        "The MockLLMEngine#respond method must only be used in automation."
      );
    }

    const runRequest = this.#runRequests.get(requestId);
    this.#runRequests.delete(requestId);
    if (!runRequest) {
      throw new Error("Could not find a request with that id");
    }
    runRequest.resolve(response);
  }

  /**
   * Run the inference request with a MockedResponse. If the mocked response is a string
   * then the it is transformed into a structured response. If the mocked response is
   * an array of strings the response is concatenated. The array of strings gets turned
   * into a chunks only in the runWithGenerator method.
   *
   * @param {EngineRequests[FeatureID]} request
   * @returns {Promise<EngineResponses["chat"]>}
   */
  async run(request) {
    const requestId = this.#nextRequestId++;

    /**
     * The MockedResponse can take the multiple shapes. The actual returned
     * response will be modified in this utility to return the correct API response.
     *
     * @type {PromiseWithResolvers<MockedResponse>}
     */
    const { promise, resolve, reject } = Promise.withResolvers();
    this.#runRequests.set(requestId, { request, resolve, reject });
    const response = await promise;

    if (typeof response === "string") {
      return { finalOutput: response, ...EXTRA_RESPONSE_ARGS };
    }

    if (Array.isArray(response)) {
      let finalOutput = "";
      for (const text of response) {
        if (typeof text !== "string") {
          throw new Error(
            "Expected the mocked response to be a list of strings"
          );
        }
        finalOutput += text;
      }
      return { finalOutput, ...EXTRA_RESPONSE_ARGS };
    }

    if ("text" in response) {
      throw new Error(
        "The MockLLMEngine received a mocked ChunkResponse in the non-chunked API"
      );
    }

    return response;
  }

  /**
   * Run the inference request. If the mocked response is a string then a single chunk
   * is yielded, and the method returns. If the mocked response is an array of strings
   * then each string is yielded as chunk. An actual array of ChunkResponses can also
   * be provided.
   *
   * @param {EngineRequests[FeatureID]} request
   * @returns {AsyncGenerator<ChunkResponse>}
   */
  async *runWithGenerator(request) {
    const requestId = this.#nextRequestId++;

    // For manual testing without mockResponse, store the request and wait for respond()
    const { resolve, reject, promise } = Promise.withResolvers();
    this.#runRequests.set(requestId, { request, resolve, reject });

    // Wait for respond() to be called with a response
    const response = await promise;

    if (typeof response === "string") {
      yield {
        text: response,
        tokens: null,
        isPrompt: false,
        toolCalls: [],
      };
      return;
    }

    if (Array.isArray(response)) {
      for (const chunk of response) {
        // Wait a micro-tick to make this really async.
        await Promise.resolve();

        if (typeof chunk === "string") {
          // The chunk is just a string, wrap it in a ChunkResponse.
          yield {
            text: chunk,
            tokens: null,
            isPrompt: false,
            toolCalls: [],
          };
        } else {
          // This is already a ChunkResponse object.
          yield chunk;
        }
      }
      return;
    }

    if (!response) {
      throw new Error("No response was received for the MockLLMEngine.");
    }

    if (typeof response.text !== "string") {
      throw new Error(
        'Expected the MockedLLMEngine response to include a "text" property.'
      );
    }

    yield response;
  }
}

/**
 * Utilities for ML component and evaluation testing.
 */
export const MLTestUtils = {
  MockLLMEngine,

  /**
   * Gather just the text for the chunked response to an LLM call.
   *
   * @param {AsyncGenerator<ChunkResponse>} generator
   * @returns {Promise<string>}
   */
  async gatherText(generator) {
    let fullText = "";
    for await (const chunk of generator) {
      if (chunk.text) {
        fullText += chunk.text;
      }
    }
    return fullText;
  },

  /**
   * Run the the MockLLMEngine's generator and gather the chunks into an array.
   *
   * @param {AsyncGenerator<ChunkResponse>} generator
   * @returns {Promise<ChunkResponse[]>}
   */
  async gatherChunks(generator) {
    /** @type {ChunkResponse[]} */
    const chunks = [];
    for await (const chunk of generator) {
      chunks.push(chunk);
    }
    return chunks;
  },

  /**
   * Report eval data out to stdout, which will be picked up by the mozperftest test
   * harness for analysis and evaluation metrics. This function should only be used from
   * browser_eval tests via `./mach eval`
   *
   * The data is logged in two formats:
   * 1. As a dump with "evalDataPayload |" prefix for parsing
   * 2. As a formatted dump for human readability
   *
   * @param {any} data - JSON serializable data containing evaluation results.
   * @param {boolean} prettyPrint - Optionally print the results in a human readable
   *   format as well.
   */
  reportEvalData(data, prettyPrint = false) {
    const payload = JSON.stringify(data);
    dump("evalDataPayload | " + payload + "\n");
    if (prettyPrint) {
      dump("-------------------------------------\n");
      dump("Eval data:\n");
      dump(JSON.stringify(data, null, 2));
      dump("\n");
    }
  },

  /**
   * Serve HTML content via HTTP server but do not load it in a tab.
   *
   * The server serves the content once and then stops. This is useful for enumerating
   * multiple HTML test cases directly in a mochitest without relying on wiring in
   * support files. The html`` tagged template literal can also be used as a way to
   * provide syntax highlighting and linting support within your editor.
   *
   * Example usage:
   *   const { html } = MLTestUtils.serveHTML({ code: 404 });
   *   const { url, cleanup } = html`<h1>Test</h1>`;
   *   // Use the URL...
   *   await cleanup();
   *
   * @param {object} options - Server configuration
   * @param {number} [options.code] - HTTP status code (default: 200)
   * @returns {{html: Function}}
   */
  serveHTML(options = {}) {
    const { code = 200 } = options;

    /**
     * Define the HTML and spin up a server.
     *
     * @param {TemplateStringsArray} strings - The literal string parts
     * @param {...any} values - The interpolated expressions
     * @returns {{url: string, cleanup: () => Promise<void>}}
     */
    function html(strings, ...values) {
      const markup = `<!DOCTYPE html><body>${joinTemplate(strings, values)}</body>`;
      return createServer(markup, code);
    }

    return { html };
  },

  /**
   * Similar to serveHTML, but loads the HTML automatically in a tab.
   *
   * Example usage:
   *   const { html } = MLTestUtils.serveHTMLInTab({ browser: gBrowser, code: 404 });
   *   const { tab, getPageExtractor, cleanup } = await html`
   *     <h1>Page Not Found</h1>
   *   `;
   *   // Use the tab
   *   await cleanup();
   *
   * @param {object} options - Server configuration
   * @param {object} options.browser - The gBrowser object from test scope
   * @param {number} [options.code] - HTTP status code (default: 200)
   */
  serveHTMLInTab(options) {
    const { browser, code = 200 } = options;

    if (!browser) {
      throw new Error(
        "browser is required. Pass it via serveHTMLInTab({ browser: gBrowser })"
      );
    }

    /**
     * Use a tagged template literal to create an HTML test page. This spins
     * up an HTTP server that serves the markup in a new tab.
     *
     * @param {TemplateStringsArray} strings - The literal string parts
     * @param {...any} values - The interpolated expressions
     */
    async function html(strings, ...values) {
      const markup = `<!DOCTYPE html><body>${joinTemplate(strings, values)}</body>`;
      const { url, cleanup: serverCleanup } = createServer(markup, code);

      const tab = await BrowserTestUtils.openNewForegroundTab(
        browser,
        url,
        true // waitForLoad
      );

      /**
       * Get a new page extractor, which can change when navigating pages.
       *
       * @returns {PageExtractorParent}
       */
      function getPageExtractor() {
        return tab.linkedBrowser.browsingContext.currentWindowGlobal.getActor(
          "PageExtractor"
        );
      }

      return {
        tab,
        url,
        getPageExtractor,
        async cleanup() {
          await serverCleanup();
          BrowserTestUtils.removeTab(tab);
        },
      };
    }

    return { html };
  },

  /**
   * Like serveHTMLInTab, but reuses a single HttpServer across many tabs. This
   * avoids the cost of spinning up an HttpServer per tab when a test needs to
   * open several pages (e.g. tab-list tests).
   *
   * cleanup() stops the HTTP server but does NOT remove the opened tabs. The
   * caller is responsible for tab teardown — usually by closing the window
   * that owns them via BrowserTestUtils.closeWindow(). Tabs opened into a
   * persistent window (e.g. gBrowser) must be removed explicitly with
   * BrowserTestUtils.removeTab().
   *
   * Example usage:
   *   const server = await MLTestUtils.serveSharedHTMLInTab({ browser: gBrowser });
   *   const { tab: t1 } = await server.openTab({ title: "First", body: "<p>1</p>" });
   *   const { tab: t2 } = await server.openTab({ title: "Second", body: "<p>2</p>" });
   *   await server.cleanup();
   *
   * @param {object} options
   * @param {object} options.browser - The gBrowser object from test scope
   * @param {number} [options.code] - HTTP status code (default: 200)
   * @returns {Promise<{
   *   openTab: (opts?: { title?: string, body?: string, browser?: object }) => Promise<{ tab: object, url: string }>,
   *   cleanup: () => Promise<void>,
   *   registerPathHandler: (path: string, handler: (request: object, response: object) => void) => void,
   *   origin: string,
   * }>}
   */
  async serveSharedHTMLInTab(options) {
    const { browser: defaultBrowser, code = 200 } = options;

    if (!defaultBrowser) {
      throw new Error(
        "browser is required. Pass it via serveSharedHTMLInTab({ browser: gBrowser })"
      );
    }

    const server = new HttpServer();
    server.start(-1);
    const { primaryHost, primaryPort } = server.identity;
    const encoder = new TextEncoder();

    let nextPathId = 0;

    async function openTab({
      title = "",
      body = "",
      browser = defaultBrowser,
    } = {}) {
      const pathId = nextPathId++;
      const path = `/page-${pathId}.html`;
      // Assemble through the DOM so the title is inserted via textContent rather
      // than hand-rolled escaping; body is intentional markup, set as innerHTML.
      const doc = new DOMParser().parseFromString(
        "<!DOCTYPE html><html><head><title></title></head><body></body></html>",
        "text/html"
      );
      doc.title = title;
      doc.body.innerHTML = body;
      const markup = `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
      const htmlUtf8 = encoder.encode(markup);

      /** @type {nsIHttpRequestHandler} */
      const pageHandler = (request, response) => {
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.setStatusLine(request.httpVersion, code, "");

        const binaryOutputStream = Cc[
          "@mozilla.org/binaryoutputstream;1"
        ].createInstance(Ci.nsIBinaryOutputStream);

        binaryOutputStream.setOutputStream(response.bodyOutputStream);
        binaryOutputStream.writeByteArray(/** @type {any} */ (htmlUtf8));
      };

      server.registerPathHandler(path, pageHandler);

      // eslint-disable-next-line @microsoft/sdl/no-insecure-url
      const url = `http://${primaryHost}:${primaryPort}${path}`;
      const tab = await BrowserTestUtils.openNewForegroundTab(
        browser,
        url,
        true // waitForLoad
      );

      // openNewForegroundTab resolves once the page has loaded, but the tab's
      // label is derived from the document <title> and updated asynchronously
      // via TabAttrModified, which can fire after load completes. Callers that
      // read tab.label (e.g. the open-tabs metadata) would otherwise race
      // against a stale label, so wait until it reflects the requested title.
      if (title && tab.label !== title) {
        await BrowserTestUtils.waitForEvent(
          tab,
          "TabAttrModified",
          false,
          () => tab.label === title
        );
      }

      return { tab, url };
    }

    async function cleanup() {
      await new Promise(resolve => server.stop(resolve));
    }

    return {
      openTab,
      cleanup,
      /**
       * Register a custom path handler on the shared HttpServer, e.g. to serve
       * a body parameterised by query string.
       *
       * @param {string} path - The path to handle (e.g. "/serp.html").
       * @param {(request: object, response: object) => void} handler
       */
      registerPathHandler(path, handler) {
        server.registerPathHandler(path, handler);
      },
      /**
       * Origin (e.g. http://localhost:PORT) of the shared HttpServer, for
       * building absolute URLs to registered path handlers.
       *
       * @type {string}
       */
      // eslint-disable-next-line @microsoft/sdl/no-insecure-url
      origin: `http://${primaryHost}:${primaryPort}`,
    };
  },
};
