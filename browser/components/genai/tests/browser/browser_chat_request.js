/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { GenAI } = ChromeUtils.importESModule(
  "resource:///modules/GenAI.sys.mjs"
);
const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);
const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

/**
 * Check that prompts can be sent with header
 */
add_task(async function test_chat_header() {
  const server = new HttpServer();
  const requestPromise = new Promise(resolve => {
    server.registerPathHandler("/", resolve);
  });
  server.start(-1);
  const url = `http://localhost:${server.identity.primaryPort}`;

  const sandbox = sinon.createSandbox();
  sandbox
    .stub(GenAI, "chatProviders")
    .value(new Map([[url, { header: "X-Prompt" }]]));

  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.ml.chat.provider", url],
      ["browser.ml.chat.prompt.prefix", ""],
      ["browser.ml.chat.sidebar", false],
    ],
  });

  await GenAI.handleAskChat({ value: "hello world?" }, { window });
  const request = await requestPromise;
  Assert.equal(
    request.getHeader("x-prompt"),
    "hello%20world%3F",
    "Prompt passed via header"
  );
  Assert.equal(request.queryString, "", "Prompt not passed via ?q");

  gBrowser.removeTab(gBrowser.selectedTab);
  sandbox.restore();
  server.stop();
});
