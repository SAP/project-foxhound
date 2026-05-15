/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  AIWindowUI:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindowUI.sys.mjs",
  AIWindowAccountAuth:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindowAccountAuth.sys.mjs",
  Chat: "moz-src:///browser/components/aiwindow/models/Chat.sys.mjs",
  openAIEngine: "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

const AIWINDOW_URL = "chrome://browser/content/aiwindow/aiWindow.html";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
      ["browser.smartwindow.enabled", true],
      ["browser.smartwindow.firstrun.hasCompleted", true],
    ],
  });
});

/**
 * Opens a new AI Window
 *
 * @returns {Promise<Window>}
 */
async function openAIWindow() {
  const win = await BrowserTestUtils.openNewBrowserWindow({ aiWindow: true });
  await BrowserTestUtils.waitForMutationCondition(
    win.document.documentElement,
    { attributes: true },
    () => win.document.documentElement.hasAttribute("ai-window")
  );
  return win;
}

/**
 * Stubs AIWindowAccountAuth.ensureAIWindowAccess to skip sign-in flow
 * Call the returned restore function to clean up the stub
 *
 * @returns {Function} restore function to clean up the stub
 */
function skipSignIn() {
  const stub = sinon
    .stub(AIWindowAccountAuth, "ensureAIWindowAccess")
    .resolves(true);
  return () => stub.restore();
}

/**
 * Type text into the smartbar and wait for a pending query to complete.
 *
 * @param {MozBrowser} browser - The browser element
 * @param {string} text - Text to type
 */
async function typeInSmartbar(browser, text) {
  await SpecialPowers.spawn(browser, [text], async searchText => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Wait for Smartbar to be rendered"
    );
    const editor = smartbar.querySelector("moz-multiline-editor");
    editor.focus();
    EventUtils.sendString(searchText, content);
    await smartbar.lastQueryContextPromise;
  });
}

/**
 * Waits for the Smartbar suggestions view to open.
 *
 * @param {MozBrowser} browser - The browser element
 * @param {Function} openFn - A function that should trigger the view opening
 * @returns {Promise} A promise that resolves when the view is open
 */
async function promiseSmartbarSuggestionsOpen(browser, openFn) {
  if (!openFn) {
    throw new Error(
      "openFn should be supplied to promiseSmartbarSuggestionsOpen"
    );
  }

  const opened = SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Wait for Smartbar to be rendered"
    );
    if (smartbar.view.isOpen) {
      return;
    }
    await new Promise(resolve => {
      smartbar.controller.addListener({
        onViewOpen() {
          smartbar.controller.removeListener(this);
          resolve();
        },
      });
    });
  });
  await openFn();
  await opened;
}

/**
 * Waits for the Smartbar suggestions view to close.
 *
 * @param {MozBrowser} browser - The browser element
 * @returns {Promise} A promise that resolves when the view is closed
 */
async function promiseSmartbarSuggestionsClose(browser) {
  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Wait for Smartbar to be rendered"
    );
    if (!smartbar.view.isOpen) {
      return;
    }

    await new Promise(resolve => {
      smartbar.controller.addListener({
        onViewClose() {
          smartbar.controller.removeListener(this);
          resolve();
        },
      });
    });
  });
}

/**
 * Asserts the Smartbar suggestions view position and visibility.
 *
 * @param {MozBrowser} browser - The browser element
 * @param {boolean} shouldBeVisible - Whether the suggestions view should be visible
 * @param {string} expectedPosition - The expected position
 */
async function assertSmartbarSuggestionsVisible(
  browser,
  shouldBeVisible,
  expectedPosition = "bottom"
) {
  const aiWindowElement =
    browser.contentWindow.document.querySelector("ai-window");
  const smartbarElement = aiWindowElement.shadowRoot.querySelector(
    "#ai-window-smartbar"
  );
  const urlbarView = smartbarElement.querySelector(".urlbarView");

  Assert.equal(
    BrowserTestUtils.isVisible(urlbarView),
    shouldBeVisible,
    `Suggestions view element should be visible: ${shouldBeVisible}`
  );
  Assert.equal(
    smartbarElement.getAttribute("suggestions-position"),
    expectedPosition,
    `Suggestions position should be: ${expectedPosition}`
  );
}

/**
 * Mock OpenAI server helpers
 */

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

function readRequestBody(request) {
  const stream = request.bodyInputStream;
  const available = stream.available();
  return NetUtil.readInputStreamToString(stream, available, {
    charset: "UTF-8",
  });
}

function startMockOpenAI({
  streamChunks = ["Hello from mock."],
  toolCall = null,
  followupChunks = ["Tool complete."],
  onRequest,
} = {}) {
  const server = new HttpServer();

  server.registerPathHandler("/v1/chat/completions", (request, response) => {
    let bodyText = "";
    if (request.method === "POST") {
      try {
        bodyText = readRequestBody(request);
      } catch (_) {}
    }

    let body;
    try {
      body = JSON.parse(bodyText || "{}");
    } catch (_) {
      body = {};
    }

    onRequest?.(body);

    const wantsStream = !!body.stream;
    const tools = Array.isArray(body.tools) ? body.tools : [];
    const askedForTools = tools.length;
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const hasToolResult = messages.some(m => m && m.role === "tool");
    const timestamp = Math.floor(Date.now() / 1000);

    const startSSE = () => {
      response.setStatusLine(request.httpVersion, 200, "OK");
      response.setHeader(
        "Content-Type",
        "text/event-stream; charset=utf-8",
        false
      );
      response.setHeader("Cache-Control", "no-cache", false);
      response.setHeader("Access-Control-Allow-Origin", "*", false);
      response.processAsync();
    };

    const sendSSE = obj => {
      response.write(`data: ${JSON.stringify(obj)}\n\n`);
    };

    if (wantsStream && toolCall && askedForTools && !hasToolResult) {
      startSSE();

      sendSSE({
        id: "chatcmpl-aiwindow-stream-tool-1",
        object: "chat.completion.chunk",
        created: timestamp,
        model: "aiwindow-mock",
        choices: [
          {
            index: 0,
            delta: {
              content: "",
              tool_calls: [
                {
                  index: 0,
                  id: "call_1",
                  type: "function",
                  function: {
                    name: toolCall.name,
                    arguments: toolCall.args ?? "{}",
                  },
                },
              ],
            },
            finish_reason: null,
          },
        ],
      });

      sendSSE({
        id: "chatcmpl-aiwindow-stream-tool-2",
        object: "chat.completion.chunk",
        created: timestamp,
        model: "aiwindow-mock",
        choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
      });

      response.write("data: [DONE]\n\n");
      response.finish();
      return;
    }

    if (wantsStream && toolCall && askedForTools && hasToolResult) {
      startSSE();

      followupChunks.forEach((chunk, index) => {
        sendSSE({
          id: `chatcmpl-aiwindow-stream-tool-followup-${index}`,
          object: "chat.completion.chunk",
          created: timestamp,
          model: "aiwindow-mock",
          choices: [
            {
              index: 0,
              delta: { content: chunk },
              finish_reason:
                index === followupChunks.length - 1 ? "stop" : null,
            },
          ],
        });
      });

      response.write("data: [DONE]\n\n");
      response.finish();
      return;
    }

    if (wantsStream) {
      startSSE();

      streamChunks.forEach((chunk, index) => {
        sendSSE({
          id: `chatcmpl-aiwindow-stream-${index}`,
          object: "chat.completion.chunk",
          created: timestamp,
          model: "aiwindow-mock",
          choices: [
            {
              index: 0,
              delta: { content: chunk },
              finish_reason: index === streamChunks.length - 1 ? "stop" : null,
            },
          ],
        });
      });

      response.write("data: [DONE]\n\n");
      response.finish();
      return;
    }

    // Non-streaming fallback for conversation starters, title generation, etc.
    response.setStatusLine(request.httpVersion, 200, "OK");
    response.setHeader("Content-Type", "application/json", false);
    response.write(
      JSON.stringify({
        id: "chatcmpl-aiwindow-non-stream",
        object: "chat.completion",
        created: timestamp,
        model: "aiwindow-mock",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: "Mock response" },
            finish_reason: "stop",
          },
        ],
      })
    );
  });

  server.start(-1);
  return { server, port: server.identity.primaryPort };
}

function stopMockOpenAI(server) {
  return new Promise(resolve => server.stop(resolve));
}

async function withServer(serverOptions, task) {
  const { server, port } = startMockOpenAI(serverOptions);
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.endpoint", `http://localhost:${port}/v1`]],
  });

  try {
    await task({ port });
  } finally {
    await SpecialPowers.popPrefEnv();
    await stopMockOpenAI(server);
  }
}
