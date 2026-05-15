/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

/**
 * Start an HTTP server that serves HTML content.
 *
 * @param {string} html - The HTML content to serve
 * @returns {object} An object containing:
 *   - url: The URL where the content is served
 *   - serverClosed: Promise that resolves when the server stops
 */
function serveHTML(html) {
  const server = new HttpServer();

  server.registerPathHandler("/test-page.html", (_request, response) => {
    response.setHeader("Content-Type", "text/html");
    response.write(html);
  });

  server.start(-1);

  const { primaryHost, primaryPort } = server.identity;
  // eslint-disable-next-line @microsoft/sdl/no-insecure-url
  const url = `http://${primaryHost}:${primaryPort}/test-page.html`;

  return {
    url,
    server,
  };
}

/**
 * Set up a test for the get_page_content tool call by serving HTML and loading it.
 *
 * @param {string} html - The HTML content to serve and test
 * @returns {Promise<object>} An object containing:
 *   - tab: The opened browser tab
 *   - url: The URL of the loaded page
 *   - GetPageContent: The GetPageContent class
 *   - cleanup: Function to clean up the test
 */
async function setupGetPageContentTests(html) {
  const { GetPageContent } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/models/Tools.sys.mjs"
  );

  const { url, server } = serveHTML(html);

  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    url,
    true // waitForLoad
  );

  const url_list = [url];

  return {
    url_list,
    GetPageContent,
    async cleanup() {
      info("Cleaning up test");
      BrowserTestUtils.removeTab(tab);
      await new Promise(resolve => server.stop(resolve));
    },
  };
}

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

      const timestamp = Math.floor(Date.now() / 1000);
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

      const timestamp = Math.floor(Date.now() / 1000);
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

      const timestamp = Math.floor(Date.now() / 1000);
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

    const payload = {
      id: "chatcmpl-aiwindow",
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "aiwindow-mock",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: streamChunks.join(""),
          },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };

    response.setStatusLine(request.httpVersion, 200, "OK");
    response.setHeader(
      "Content-Type",
      "application/json; charset=utf-8",
      false
    );
    response.setHeader("Access-Control-Allow-Origin", "*", false);
    response.write(JSON.stringify(payload));
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

function startTitleGenerationServer(title) {
  return startMockOpenAI({ streamChunks: [title] });
}
