/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const {
  isBrowsingContextCompatible,
  isWebContentProcess,
  isWebdriverSafeNavigationURL,
} = ChromeUtils.importESModule(
  "chrome://remote/content/shared/BrowsingContextUtils.sys.mjs"
);
const TEST_COM_PAGE = "https://example.com/document-builder.sjs?html=com";
const TEST_NET_PAGE = "https://example.net/document-builder.sjs?html=net";

// Test helpers from BrowsingContextUtils in various processes.
add_task(async function () {
  const tab1 = BrowserTestUtils.addTab(gBrowser, TEST_COM_PAGE);
  const contentBrowser1 = tab1.linkedBrowser;
  await BrowserTestUtils.browserLoaded(contentBrowser1);
  const browserId1 = contentBrowser1.browsingContext.browserId;

  const tab2 = BrowserTestUtils.addTab(gBrowser, TEST_NET_PAGE);
  const contentBrowser2 = tab2.linkedBrowser;
  await BrowserTestUtils.browserLoaded(contentBrowser2);
  const browserId2 = contentBrowser2.browsingContext.browserId;

  const { extension, sidebarBrowser } = await installSidebarExtension();

  const tab3 = BrowserTestUtils.addTab(
    gBrowser,
    `moz-extension://${extension.uuid}/tab.html`
  );
  const { bcId } = await extension.awaitMessage("tab-loaded");
  const tabExtensionBrowser = BrowsingContext.get(bcId).top.embedderElement;

  const parentBrowser1 = createParentBrowserElement(tab1, "content");
  const parentBrowser2 = createParentBrowserElement(tab1, "chrome");

  info("Check browsing context compatibility for content browser 1");
  await checkBrowsingContextCompatible(contentBrowser1, undefined, true);
  await checkBrowsingContextCompatible(contentBrowser1, browserId1, true);
  await checkBrowsingContextCompatible(contentBrowser1, browserId2, false);

  info("Check browsing context compatibility for content browser 2");
  await checkBrowsingContextCompatible(contentBrowser2, undefined, true);
  await checkBrowsingContextCompatible(contentBrowser2, browserId1, false);
  await checkBrowsingContextCompatible(contentBrowser2, browserId2, true);

  info("Check browsing context compatibility for parent browser 1");
  await checkBrowsingContextCompatible(parentBrowser1, undefined, false);
  await checkBrowsingContextCompatible(parentBrowser1, browserId1, false);
  await checkBrowsingContextCompatible(parentBrowser1, browserId2, false);

  info("Check browsing context compatibility for parent browser 2");
  await checkBrowsingContextCompatible(parentBrowser2, undefined, false);
  await checkBrowsingContextCompatible(parentBrowser2, browserId1, false);
  await checkBrowsingContextCompatible(parentBrowser2, browserId2, false);

  info("Check browsing context compatibility for extension");
  await checkBrowsingContextCompatible(sidebarBrowser, undefined, false);
  await checkBrowsingContextCompatible(sidebarBrowser, browserId1, false);
  await checkBrowsingContextCompatible(sidebarBrowser, browserId2, false);

  info("Check browsing context compatibility for extension viewed in a tab");
  await checkBrowsingContextCompatible(tabExtensionBrowser, undefined, false);
  await checkBrowsingContextCompatible(tabExtensionBrowser, browserId1, false);
  await checkBrowsingContextCompatible(tabExtensionBrowser, browserId2, false);

  gBrowser.removeTab(tab1);
  gBrowser.removeTab(tab2);
  gBrowser.removeTab(tab3);
  await extension.unload();
});

add_task(async function test_isWebContentProcess() {
  const contentTab = BrowserTestUtils.addTab(gBrowser, TEST_COM_PAGE);
  const contentBrowser = contentTab.linkedBrowser;
  await BrowserTestUtils.browserLoaded(contentBrowser);

  const { extension, sidebarBrowser } = await installSidebarExtension();

  const extensionTab = BrowserTestUtils.addTab(
    gBrowser,
    `moz-extension://${extension.uuid}/tab.html`
  );
  await extension.awaitMessage("tab-loaded");

  const parentBrowser = createParentBrowserElement(contentTab, "chrome");

  info("Web content browsing context should be a web content process");
  is(isWebContentProcess(contentBrowser.browsingContext), true);

  info("Parent process browsing context should not be a web content process");
  is(isWebContentProcess(parentBrowser.browsingContext), false);

  info("Extension browsing context should not be a web content process");
  is(isWebContentProcess(sidebarBrowser.browsingContext), false);

  gBrowser.removeTab(contentTab);
  gBrowser.removeTab(extensionTab);
  await extension.unload();
});

add_task(async function test_isWebdriverSafeNavigationURL() {
  const contentTab = BrowserTestUtils.addTab(gBrowser, TEST_COM_PAGE);
  const contentBrowser = contentTab.linkedBrowser;
  await BrowserTestUtils.browserLoaded(contentBrowser);

  const { extension, sidebarBrowser } = await installSidebarExtension();

  const extensionTab = BrowserTestUtils.addTab(
    gBrowser,
    `moz-extension://${extension.uuid}/tab.html`
  );
  await extension.awaitMessage("tab-loaded");

  const parentBrowser = createParentBrowserElement(contentTab, "chrome");

  const httpURI = Services.io.newURI("https://example.com/");
  const dataURI = Services.io.newURI("data:text/html,<h1>test</h1>");
  const aboutBlankURI = Services.io.newURI("about:blank");
  const aboutAboutURI = Services.io.newURI("about:about");
  const chromeURI = Services.io.newURI(
    "chrome://browser/content/browser.xhtml"
  );

  info("Check webdriver safe schemes are always allowed");
  is(
    isWebdriverSafeNavigationURL(httpURI, contentBrowser.browsingContext),
    true
  );
  is(
    isWebdriverSafeNavigationURL(httpURI, parentBrowser.browsingContext),
    true
  );
  is(
    isWebdriverSafeNavigationURL(httpURI, sidebarBrowser.browsingContext),
    true
  );

  info("Check about:blank is always allowed");
  is(
    isWebdriverSafeNavigationURL(aboutBlankURI, contentBrowser.browsingContext),
    true
  );
  is(
    isWebdriverSafeNavigationURL(aboutBlankURI, parentBrowser.browsingContext),
    true
  );

  info("Check privileged schemes are not allowed");
  is(
    isWebdriverSafeNavigationURL(aboutAboutURI, contentBrowser.browsingContext),
    false
  );
  is(
    isWebdriverSafeNavigationURL(chromeURI, contentBrowser.browsingContext),
    false
  );

  info("Check data: URL is only allowed in web content process");
  is(
    isWebdriverSafeNavigationURL(dataURI, contentBrowser.browsingContext),
    true
  );
  is(
    isWebdriverSafeNavigationURL(dataURI, parentBrowser.browsingContext),
    false
  );
  is(
    isWebdriverSafeNavigationURL(dataURI, sidebarBrowser.browsingContext),
    false
  );

  gBrowser.removeTab(contentTab);
  gBrowser.removeTab(extensionTab);
  await extension.unload();
});

async function checkBrowsingContextCompatible(browser, browserId, expected) {
  const options = { browserId };
  info("Check browsing context compatibility from the parent process");
  is(isBrowsingContextCompatible(browser.browsingContext, options), expected);

  info(
    "Check browsing context compatibility from the browsing context's process"
  );
  await SpecialPowers.spawn(
    browser,
    [browserId, expected],
    (_browserId, _expected) => {
      const BrowsingContextUtils = ChromeUtils.importESModule(
        "chrome://remote/content/shared/BrowsingContextUtils.sys.mjs"
      );
      is(
        BrowsingContextUtils.isBrowsingContextCompatible(
          content.browsingContext,
          {
            browserId: _browserId,
          }
        ),
        _expected
      );
    }
  );
}

/**
 * Create a XUL browser element in the provided XUL tab, with the provided type.
 *
 * @param {XULTab} tab
 *     The XUL tab in which the browser element should be inserted.
 * @param {string} type
 *     The type attribute of the browser element, "chrome" or "content".
 * @returns {XULBrowser}
 *     The created browser element.
 */
function createParentBrowserElement(tab, type) {
  const parentBrowser = gBrowser.ownerDocument.createXULElement("browser");
  parentBrowser.setAttribute("type", type);
  const container = gBrowser.getBrowserContainer(tab.linkedBrowser);
  container.appendChild(parentBrowser);

  return parentBrowser;
}

/**
 * Install a sidebar extension.
 *
 * @returns {object}
 *     Return value with two properties:
 *     - extension: test wrapper as returned by SpecialPowers.loadExtension.
 *       Make sure to explicitly call extension.unload() before the end of the test.
 *     - sidebarBrowser: the browser element containing the extension sidebar.
 */
async function installSidebarExtension() {
  info("Load the test extension");
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      sidebar_action: {
        default_panel: "sidebar.html",
      },
    },
    useAddonManager: "temporary",

    files: {
      "sidebar.html": `
        <!DOCTYPE html>
        <html>
          Test extension
          <script src="sidebar.js"></script>
        </html>
      `,
      "sidebar.js": function () {
        const { browser } = this;
        browser.test.sendMessage("sidebar-loaded", {
          bcId: SpecialPowers.wrap(window).browsingContext.id,
        });
      },
      "tab.html": `
        <!DOCTYPE html>
        <html>
          Test extension (tab)
          <script src="tab.js"></script>
        </html>
      `,
      "tab.js": function () {
        const { browser } = this;
        browser.test.sendMessage("tab-loaded", {
          bcId: SpecialPowers.wrap(window).browsingContext.id,
        });
      },
    },
  });

  info("Wait for the extension to start");
  await extension.startup();

  info("Wait for the extension browsing context");
  const { bcId } = await extension.awaitMessage("sidebar-loaded");
  const sidebarBrowser = BrowsingContext.get(bcId).top.embedderElement;
  ok(sidebarBrowser, "Got a browser element for the extension sidebar");

  return {
    extension,
    sidebarBrowser,
  };
}
