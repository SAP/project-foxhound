ChromeUtils.defineESModuleGetters(this, {
  FormHistory: "resource://gre/modules/FormHistory.sys.mjs",
  SearchTestUtils: "resource://testing-common/SearchTestUtils.sys.mjs",
});

SearchTestUtils.init(this);

function getCertChainAsString(certBase64Array) {
  let certChain = "";
  for (let cert of certBase64Array) {
    certChain += getPEMString(cert);
  }
  return certChain;
}

function getPEMString(derb64) {
  // Wrap the Base64 string into lines of 64 characters,
  // with CRLF line breaks (as specified in RFC 1421).
  var wrapped = derb64.replace(/(\S{64}(?!$))/g, "$1\r\n");
  return (
    "-----BEGIN CERTIFICATE-----\r\n" +
    wrapped +
    "\r\n-----END CERTIFICATE-----\r\n"
  );
}

async function injectErrorPageFrame(tab, src, sandboxed) {
  let loadedPromise = BrowserTestUtils.browserLoaded(
    tab.linkedBrowser,
    true,
    null,
    true
  );

  await SpecialPowers.spawn(
    tab.linkedBrowser,
    [src, sandboxed],
    async function (frameSrc, frameSandboxed) {
      let iframe = content.document.createElement("iframe");
      iframe.src = frameSrc;
      if (frameSandboxed) {
        iframe.setAttribute("sandbox", "allow-scripts");
      }
      content.document.body.appendChild(iframe);
    }
  );

  await loadedPromise;
}

async function openErrorPage(src, useFrame, sandboxed) {
  let dummyPage =
    getRootDirectory(gTestPath).replace(
      "chrome://mochitests/content",
      "https://example.com"
    ) + "dummy_page.html";

  let tab;
  if (useFrame) {
    info("Loading cert error page in an iframe");
    tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, dummyPage);
    await injectErrorPageFrame(tab, src, sandboxed);
  } else {
    let certErrorLoaded;
    tab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      () => {
        gBrowser.selectedTab = BrowserTestUtils.addTab(gBrowser, src);
        let browser = gBrowser.selectedBrowser;
        certErrorLoaded = BrowserTestUtils.waitForErrorPage(browser);
      },
      false
    );
    info("Loading and waiting for the cert error");
    await certErrorLoaded;
  }

  return tab;
}

function waitForCondition(condition, nextTest, errorMsg, retryTimes) {
  retryTimes = typeof retryTimes !== "undefined" ? retryTimes : 30;
  var tries = 0;
  var interval = setInterval(function () {
    if (tries >= retryTimes) {
      ok(false, errorMsg);
      moveOn();
    }
    var conditionPassed;
    try {
      conditionPassed = condition();
    } catch (e) {
      ok(false, e + "\n" + e.stack);
      conditionPassed = false;
    }
    if (conditionPassed) {
      moveOn();
    }
    tries++;
  }, 100);
  var moveOn = function () {
    clearInterval(interval);
    nextTest();
  };
}

async function waitForBookmarksToolbarVisibility({
  win = window,
  visible,
  message,
}) {
  let result = await TestUtils.waitForCondition(
    () => {
      let toolbar = win.document.getElementById("PersonalToolbar");
      return toolbar && (visible ? !toolbar.collapsed : toolbar.collapsed);
    },
    message ||
      "waiting for toolbar to become " + (visible ? "visible" : "hidden")
  );
  ok(result, message);
  return result;
}

function isBookmarksToolbarVisible(win = window) {
  let toolbar = win.document.getElementById("PersonalToolbar");
  return !toolbar.collapsed;
}

const setSecurityCertErrorsFeltPrivacyToTrue = async () =>
  await SpecialPowers.pushPrefEnv({
    set: [["security.certerrors.felt-privacy-v1", true]],
  });
const setSecurityCertErrorsFeltPrivacyToFalse = async () =>
  await SpecialPowers.pushPrefEnv({
    set: [["security.certerrors.felt-privacy-v1", false]],
  });
