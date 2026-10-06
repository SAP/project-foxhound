/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);

const XPI_URL = `${SECURE_TESTROOT}../xpinstall/amosigned.xpi`;

AddonTestUtils.initMochitest(this);

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["extensions.install.requireBuiltInCerts", false]],
  });

  registerCleanupFunction(async () => {
    await SpecialPowers.popPrefEnv();
  });
});

function testSubframeInstallOnNavigation({
  topFrameURL,
  midFrameURL,
  bottomFrameURL,
  xpiURL,
  assertFn,
}) {
  return BrowserTestUtils.withNewTab(topFrameURL, async browser => {
    await SpecialPowers.pushPrefEnv({
      // Relax the user input requirements while running this test.
      set: [["xpinstall.userActivation.required", false]],
    });
    const extension = ExtensionTestUtils.loadExtension({
      manifest: {
        content_scripts: [
          {
            matches: [`${midFrameURL}*`],
            js: ["createFrame.js"],
            all_frames: true,
          },
          {
            matches: [`${bottomFrameURL}*`],
            js: ["installByNavigatingToXPIURL.js"],
            all_frames: true,
          },
        ],
      },
      files: {
        "createFrame.js": `(function(frameURL) {
            browser.test.log("Executing createFrame.js on " + window.location.href);
            const frame = document.createElement("iframe");
            frame.src = frameURL;
            document.body.appendChild(frame);
          })("${bottomFrameURL}")`,

        "installByNavigatingToXPIURL.js": `
            browser.test.log("Navigating to XPI url from " + window.location.href);
            const link = document.createElement("a");
            link.id = "xpi-link";
            link.href = "${xpiURL}";
            link.textContent = "Link to XPI file";
            document.body.appendChild(link);
            link.click();
          `,
      },
    });

    await extension.startup();

    await SpecialPowers.spawn(browser, [midFrameURL], async frameURL => {
      const frame = content.document.createElement("iframe");
      frame.src = frameURL;
      content.document.body.appendChild(frame);
    });

    await assertFn({ browser });

    await extension.unload();
    await SpecialPowers.popPrefEnv();
  });
}

add_task(async function testInstallBlockedOnNavigationFromCrossOriginFrame() {
  const promiseOriginBlocked = TestUtils.topicObserved(
    "addon-install-origin-blocked"
  );

  await testSubframeInstallOnNavigation({
    topFrameURL: "https://test1.example.com/",
    midFrameURL: "https://example.org/",
    bottomFrameURL: "https://test1.example.com/installTrigger",
    xpiURL: XPI_URL,
    assertFn: async () => {
      await promiseOriginBlocked;
      Assert.deepEqual(
        await AddonManager.getAllInstalls(),
        [],
        "Expects no pending addon install"
      );
    },
  });
});

add_task(async function testInstallPromptedOnNavigationFromSameOriginFrame() {
  const promisePromptedInstallFromThirdParty = TestUtils.topicObserved(
    "addon-install-blocked"
  );

  await testSubframeInstallOnNavigation({
    topFrameURL: "https://test2.example.com/",
    midFrameURL: "https://test1.example.com/",
    bottomFrameURL: "https://test2.example.com/installTrigger",
    xpiURL: XPI_URL,
    assertFn: async () => {
      const [subject] = await promisePromptedInstallFromThirdParty;
      let installInfo = subject.wrappedJSObject;
      ok(installInfo, "Got a blocked addon install pending");
      installInfo.cancel();
    },
  });
});
