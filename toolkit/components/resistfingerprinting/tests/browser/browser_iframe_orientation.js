const testPage =
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content",
    "https://example.com"
  ) + "iframe_orientation.html";

async function runTest(width, height, expectedOrientation) {
  if (width && height) {
    info(`Running test with window size = [${width}, ${height}]`);
    let { promise, resolve } = Promise.withResolvers();
    window.onresize = () => resolve();
    window.resizeTo(width, height);
    await promise;
  }
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, testPage);
  const [reference, iframes] = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [],
    () => {
      const win = content.wrappedJSObject;
      const scr = win.screen;
      const reference = {
        mozOrientation: scr.mozOrientation,
        "orientation.angle": scr.orientation.angle,
        "orientation.type": scr.orientation.type,
      };
      const iframes = {};
      for (const target of win.document.getElementsByTagName("iframe")) {
        const targetScr = target.contentWindow.screen;
        iframes[target.id] = {
          mozOrientation: targetScr.mozOrientation,
          "orientation.angle": targetScr.orientation.angle,
          "orientation.type": targetScr.orientation.type,
        };
      }
      return [reference, iframes];
    }
  );
  for (const [key, value] of Object.entries(reference)) {
    info(`Reference ${key} = ${value}`);
  }
  if (expectedOrientation) {
    is(
      reference["orientation.type"],
      expectedOrientation,
      "We are spoofing the orientation correctly for the main document."
    );
  }
  for (const [target, values] of Object.entries(iframes)) {
    for (const [key, value] of Object.entries(values)) {
      is(
        value,
        reference[key],
        `${key} on ${target} matches the embedder document.`
      );
    }
  }
  await BrowserTestUtils.removeTab(tab);
}

add_setup(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [["privacy.resistFingerprinting", true]],
  });
});

add_task(async () => {
  if (AppConstants.platform === "android") {
    await runTest();
  } else {
    await runTest(1000, 600, "landscape-primary");
    await runTest(400, 800, "portrait-primary");
  }
});
