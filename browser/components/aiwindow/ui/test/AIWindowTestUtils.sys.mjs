/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * @import { MockLLMEngine, MockedResponse } from "../../../../toolkit/components/ml/tests/MLTestUtils.sys.mjs"
 * @import { ModelFeature } from "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs"
 */

import { BrowserTestUtils } from "resource://testing-common/BrowserTestUtils.sys.mjs";
import { sinon } from "resource://testing-common/Sinon.sys.mjs";
import { MLTestUtils } from "resource://testing-common/MLTestUtils.sys.mjs";

import { TestUtils } from "resource://testing-common/TestUtils.sys.mjs";
import { openAIEngine } from "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs";

/**
 * This class manages the MockLLMEngine for Smart Window. Smart Window instantiates
 * multiple engines, each with a different "purpose". This class allows for
 * deterministically testing the behavior of a language model. For instance, this can be
 * used to test application behavior, or assert what happens when a language model has
 * been prompt injected by untrusted content.
 *
 * See browser/components/aiwindow/ui/test/browser/browser_security_chat.js for example usage.
 */
export class MockEngineManager {
  /** @type {Map<ModelFeature, MockLLMEngine>} */
  engines = new Map();
  /** @type {any[]} */
  mocks;

  /**
   * Install the mocks.
   */
  constructor() {
    this.mocks = [
      sinon.stub(openAIEngine, "_createEngine").callsFake(options =>
        // When a new engine is requested create the mock one and track it in
        // the engines map.
        this.engines.getOrInsertComputed(
          options.purpose ?? "unknown",
          () => new MLTestUtils.MockLLMEngine(options)
        )
      ),
      sinon.stub(openAIEngine, "getFxAccountToken").resolves("mock-fxa-token"),
    ];
  }

  /**
   * Provide the response for an engine. The engine purpose is the "purpose" provided
   * to the PipelineOptions when creating an engine. The MockedResponse can be
   * a simple string or the actual response values provided by the engine.
   *
   * @param {object} options
   * @param {ModelFeature} options.purpose
   * @param {MockedResponse} options.response
   * @returns {void}
   */
  async respondTo({ purpose, response }) {
    dump(`[MockEngineManager] Getting the engine with purpose "${purpose}"\n`);
    /** @type {MockLLMEngine} */
    const engine = await TestUtils.waitForCondition(
      () => this.engines.get(purpose),
      `Couldn't find the engine "${purpose}"`
    );
    dump(
      `[MockEngineManager] Waiting for the run request for the engine with purpose "${purpose}"\n`
    );
    await TestUtils.waitForCondition(
      () => engine.runRequests.size,
      `[MockEngineManager] Failed to find a request for the engine with purpose "${purpose}"`
    );
    const [requestId] = engine.getNextRequest();
    if (typeof response === "string") {
      dump(
        `[MockEngineManager] Responding to "${purpose}" engine: ${response}\n`
      );
    } else {
      dump(`[MockEngineManager] Responding to "${purpose}" engine:\n`);
      console.log(response);
    }
    engine.respond(requestId, response);
  }

  /**
   * Reject all outstanding engine requests. This can help ensure that a test
   * run is clean before asserting specific behavior.
   */
  rejectAllRequests() {
    for (const [purpose, engine] of this.engines) {
      if (engine.runRequests.size) {
        dump(
          `[MockEngineManager] Intentionally rejecting any pending requests for engine "${purpose}"\n`
        );
        engine.rejectAllRequests();
      }
    }
  }

  /**
   * Restore all of the mocks.
   */
  cleanupMocks() {
    for (const mock of this.mocks) {
      mock.restore();
    }
  }

  /**
   * Log all of the outstanding engine requests. This is useful for debugging a test.
   *
   * @param {bool} truncateRequest By default truncate the request object as they can
   *   be quite large.
   */
  logAllOutstandingRequests(truncateRequest = true) {
    if (!this.engines.size) {
      console.log("No engines were mocked");
      return;
    }
    for (const [purpose, engine] of this.engines) {
      console.log(`Outstanding requests for engine with purpose "${purpose}"`);
      if (!engine.runRequests.size) {
        console.log(" - No outstanding requests");
      }
      for (const runRequest of engine.runRequests) {
        if (truncateRequest) {
          let request = JSON.stringify(runRequest);
          if (request.length > 100) {
            request =
              request.slice(0, 100) + " … " + request[request.length - 1];
          }
          console.log(` - Request for "${purpose}":`, request);
        } else {
          console.log(` - Request for "${purpose}":`, runRequest);
        }
      }
    }
  }

  /**
   * Nicely assert that all requests to the engine were handled. When a request
   * is not handled it will be output to the console for easier debugging.
   */
  assertAllRequestsHandled() {
    let foundRequest = false;
    for (const [purpose, engine] of this.engines) {
      for (const runRequest of engine.runRequests) {
        foundRequest = true;
        console.error(
          `A run request was not handled for the engine with purpose ${purpose}`,
          runRequest
        );
      }
    }
    if (foundRequest) {
      throw new Error("A request was not handled for an engine.");
    }
  }
}

export const AIWindowTestUtils = {
  async toggleAIWindowPref(SpecialPowers, enabled) {
    await SpecialPowers.pushPrefEnv({
      set: [["browser.smartwindow.enabled", enabled]],
    });
  },

  isAIWindow(win) {
    return win.document.documentElement.hasAttribute("ai-window");
  },

  async openAIWindow(aiWindow = true) {
    return BrowserTestUtils.openNewBrowserWindow({
      openerWindow: null,
      aiWindow,
    });
  },
};
