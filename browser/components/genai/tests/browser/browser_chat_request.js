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

/**
 * Check that prompts can be sent with custom query param
 */
add_task(async function test_chat_query_param() {
  const url = "http://mochi.test:8888";
  const sandbox = sinon.createSandbox();
  sandbox
    .stub(GenAI, "chatProviders")
    .value(new Map([[url, { queryParam: "custom" }]]));

  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.ml.chat.provider", url],
      ["browser.ml.chat.prompt.prefix", ""],
      ["browser.ml.chat.sidebar", false],
    ],
  });

  await GenAI.handleAskChat({ value: "hello world?" }, { window });
  await BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);

  Assert.equal(
    gBrowser.selectedBrowser.currentURI.query,
    "custom=hello+world%3F",
    "Prompt passed with custom param"
  );

  gBrowser.removeTab(gBrowser.selectedTab);
  sandbox.restore();
});

/**
 * Check that prompts can be sent with default "q" query param
 */
add_task(async function test_chat_default_query() {
  const url = "http://mochi.test:8888";
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.ml.chat.provider", url],
      ["browser.ml.chat.prompt.prefix", ""],
      ["browser.ml.chat.sidebar", false],
    ],
  });

  await GenAI.handleAskChat({ value: "hello world?" }, { window });
  await BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);

  Assert.equal(
    gBrowser.selectedBrowser.currentURI.query,
    "q=hello+world%3F",
    "Prompt passed with default q= param"
  );

  gBrowser.removeTab(gBrowser.selectedTab);
});

/**
 * Check that the prompt submitted automatically in the certain provider page
 */
add_task(async function test_chat_auto_submit() {
  const ROOT = getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content",
    "https://example.com"
  );
  const TEST_URL = ROOT + "file_chat-autosubmit.html";

  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.ml.chat.provider", TEST_URL],
      ["browser.ml.chat.prompt.prefix", ""],
      ["browser.ml.chat.sidebar", false],
    ],
  });

  await GenAI.handleAskChat({ value: "hello world?" }, { window });
  await BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    await ContentTaskUtils.waitForCondition(
      () => content.wrappedJSObject.submitCount === 1,
      "Prompt form submitted"
    );
    Assert.equal(
      content.wrappedJSObject.submitCount,
      1,
      "Form is triggered by AutoSubmitClick"
    );
  });

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    await ContentTaskUtils.waitForCondition(() => {
      const editable = content.document.querySelector(
        '[contenteditable="true"]'
      );

      return editable && editable.textContent.trim() === "";
    }, "Prompt text was cleared by MutationObserver");
  });

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    const editable = content.document.querySelector('[contenteditable="true"]');
    Assert.equal(
      editable.textContent.trim(),
      "",
      "Prompt text was cleared after auto submission"
    );
  });

  gBrowser.removeTab(gBrowser.selectedTab);
});
