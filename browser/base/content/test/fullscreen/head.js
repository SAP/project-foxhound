const TEST_URL =
  "https://example.com/browser/browser/base/content/test/fullscreen/open_and_focus_helper.html";

const { DOMFullscreenTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/DOMFullscreenTestUtils.sys.mjs"
);
DOMFullscreenTestUtils.init(this, window);

// Keyboard lock long press. Needs a time, because systems may have repeat disabled
const KEYBOARD_LOCK_LONGPRESS_TIME = 100;

async function synthesizeLongPressEsc(browser) {
  EventUtils.synthesizeKey(
    "KEY_Escape",
    { type: "keydown" },
    browser.documentGlobal
  );
  // We by definition require this timeout, no matter the size.
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(r => setTimeout(r, KEYBOARD_LOCK_LONGPRESS_TIME + 50));
  EventUtils.synthesizeKey(
    "KEY_Escape",
    { type: "keyup" },
    browser.documentGlobal
  );
}

async function testExpectFullScreenExit(
  browser,
  leaveFS,
  action,
  actionAfterFSEvent
) {
  let fsPromise = DOMFullscreenTestUtils.waitForFullScreenState(
    browser,
    false,
    actionAfterFSEvent
  );
  if (leaveFS) {
    if (action) {
      await action();
    }
    await fsPromise;
    ok(true, "Should leave full-screen");
  } else {
    if (action) {
      await action();
    }
    let result = await Promise.race([
      fsPromise,
      new Promise(resolve => {
        SimpleTest.requestFlakyTimeout("Wait for failure condition");
        // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
        setTimeout(() => resolve(true), 2500);
      }),
    ]);
    ok(result, "Should not leave full-screen");
  }
}

function jsWindowFocus(browser, iframeId) {
  return SpecialPowers.spawn(browser, [{ iframeId }], async args => {
    let destWin = content;
    if (args.iframeId) {
      let iframe = content.document.getElementById(args.iframeId);
      if (!iframe) {
        throw new Error("iframe not set");
      }
      destWin = iframe.contentWindow;
    }
    await content.wrappedJSObject.sendMessage(destWin, "focus");
  });
}

function jsElementFocus(browser, iframeId) {
  return SpecialPowers.spawn(browser, [{ iframeId }], async args => {
    let destWin = content;
    if (args.iframeId) {
      let iframe = content.document.getElementById(args.iframeId);
      if (!iframe) {
        throw new Error("iframe not set");
      }
      destWin = iframe.contentWindow;
    }
    await content.wrappedJSObject.sendMessage(destWin, "elementfocus");
  });
}

async function jsWindowOpen(browser, isPopup, iframeId) {
  //let windowOpened = BrowserTestUtils.waitForNewWindow();
  let windowOpened = isPopup
    ? BrowserTestUtils.waitForNewWindow({ url: TEST_URL })
    : BrowserTestUtils.waitForNewTab(gBrowser, TEST_URL, true);
  SpecialPowers.spawn(
    browser,

    [{ isPopup, iframeId }],
    async args => {
      let destWin = content;
      if (args.iframeId) {
        // Create a cross origin iframe
        destWin = (
          await content.wrappedJSObject.createIframe(args.iframeId, true)
        ).contentWindow;
      }
      // Send message to either the iframe or the current page to open a popup
      await content.wrappedJSObject.sendMessage(
        destWin,
        args.isPopup ? "openpopup" : "open"
      );
    }
  );
  return windowOpened;
}

async function jsClickLink(browser, isPopup, iframeId) {
  //let windowOpened = BrowserTestUtils.waitForNewWindow();
  let windowOpened = isPopup
    ? BrowserTestUtils.waitForNewWindow({ url: TEST_URL })
    : BrowserTestUtils.waitForNewTab(gBrowser, TEST_URL, true);
  SpecialPowers.spawn(
    browser,

    [{ isPopup, iframeId }],
    async args => {
      let destWin = content;
      if (args.iframeId) {
        // Create a cross origin iframe
        destWin = (
          await content.wrappedJSObject.createIframe(args.iframeId, true)
        ).contentWindow;
      }
      // Send message to either the iframe or the current page to click a link
      await content.wrappedJSObject.sendMessage(destWin, "clicklink");
    }
  );
  return windowOpened;
}

function waitForFocus(...args) {
  return new Promise(resolve => SimpleTest.waitForFocus(resolve, ...args));
}

function waitForBrowserWindowActive(win) {
  return new Promise(resolve => {
    if (Services.focus.activeWindow == win) {
      resolve();
    } else {
      win.addEventListener(
        "activate",
        () => {
          resolve();
        },
        { once: true }
      );
    }
  });
}
