"use strict";

Services.prefs.setBoolPref("dom.manifest.enabled", true);

const { ManifestIcons } = ChromeUtils.importESModule(
  "resource://gre/modules/ManifestIcons.sys.mjs"
);
const { ManifestObtainer } = ChromeUtils.importESModule(
  "resource://gre/modules/ManifestObtainer.sys.mjs"
);

const defaultURL = new URL(
  "https://example.org/browser/dom/manifest/test/resource.sjs"
);
defaultURL.searchParams.set("Content-Type", "application/manifest+json");

function makeTestURL(mock) {
  const url = new URL(defaultURL);
  const body = `<link rel="manifest" href='${defaultURL}&body=${mock}'>`;
  url.searchParams.set("Content-Type", "text/html; charset=utf-8");
  url.searchParams.set("body", encodeURIComponent(body));
  return url.href;
}

function getIconColor(icon) {
  return new Promise((resolve, reject) => {
    const canvas = content.document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const image = new content.Image();
    image.onload = function () {
      ctx.drawImage(image, 0, 0);
      resolve(ctx.getImageData(1, 1, 1, 1).data);
    };
    image.onerror = function () {
      reject(new Error("could not create image"));
    };
    image.src = icon;
  });
}

add_task(async function test_picksCorrectSize() {
  const manifestMock = JSON.stringify({
    icons: [
      {
        sizes: "50x50",
        src: "red-50.png?Content-type=image/png",
      },
      {
        sizes: "150x150",
        src: "blue-150.png?Content-type=image/png",
      },
    ],
  });
  const tabOptions = { gBrowser, url: makeTestURL(manifestMock) };
  await BrowserTestUtils.withNewTab(tabOptions, async function (browser) {
    const manifest = await ManifestObtainer.browserObtainManifest(browser);
    let icon = await ManifestIcons.browserFetchIcon(browser, manifest, 25);
    let color = await SpecialPowers.spawn(browser, [icon], getIconColor);
    is(color[0], 255, "Fetched red icon");

    icon = await ManifestIcons.browserFetchIcon(browser, manifest, 500);
    color = await SpecialPowers.spawn(browser, [icon], getIconColor);
    is(color[2], 255, "Fetched blue icon");
  });
});

add_task(async function test_missingSizesKey() {
  const manifestMock = JSON.stringify({
    icons: [
      {
        sizes: "50x50",
        src: "red-50.png?Content-type=image/png",
      },
      {
        src: "blue-150.png?Content-type=image/png",
      },
    ],
  });
  const tabOptions = { gBrowser, url: makeTestURL(manifestMock) };
  await BrowserTestUtils.withNewTab(tabOptions, async function (browser) {
    const manifest = await ManifestObtainer.browserObtainManifest(browser);
    let icon = await ManifestIcons.browserFetchIcon(browser, manifest, 49);
    let color = await SpecialPowers.spawn(browser, [icon], getIconColor);
    is(color[0], 255, "Fetched red icon for a smaller size");

    icon = await ManifestIcons.browserFetchIcon(browser, manifest, 51);
    color = await SpecialPowers.spawn(browser, [icon], getIconColor);
    is(color[2], 255, "Fetched blue icon for a larger size");

    icon = await ManifestIcons.browserFetchIcon(browser, manifest, "any");
    color = await SpecialPowers.spawn(browser, [icon], getIconColor);
    is(color[2], 255, "Fetched blue icon for the largest size");
  });
});

add_task(async function test_iconPurposes() {
  const manifestMock = JSON.stringify({
    icons: [
      {
        // purpose is implied "any"
        src: "red-50.png?Content-type=image/png",
        sizes: "50x50",
      },
      {
        purpose: "monochrome",
        src: "blue-150.png?Content-type=image/png",
        sizes: "150x150",
      },
    ],
  });
  const tabOptions = { gBrowser, url: makeTestURL(manifestMock) };
  await BrowserTestUtils.withNewTab(tabOptions, async function (browser) {
    const manifest = await ManifestObtainer.browserObtainManifest(browser);
    let icon = await ManifestIcons.browserFetchIcon(browser, manifest, 1, [
      "any",
    ]);
    let color = await SpecialPowers.spawn(browser, [icon], getIconColor);
    is(color[0], 255, "Fetched red icon for purpose 'any'");

    icon = await ManifestIcons.browserFetchIcon(browser, manifest, 51, ["any"]);
    color = await SpecialPowers.spawn(browser, [icon], getIconColor);
    is(color[0], 255, "Fetched red icon for purpose 'any' even if larger");

    icon = await ManifestIcons.browserFetchIcon(browser, manifest, 1, [
      "monochrome",
    ]);
    color = await SpecialPowers.spawn(browser, [icon], getIconColor);
    is(color[2], 255, "Fetched blue icon for 'monochrome'");
  });
});

add_task(async function test_multiplePurposes() {
  const manifestMock = JSON.stringify({
    icons: [
      {
        purpose: "monochrome maskable",
        src: "red-50.png?Content-type=image/png",
        sizes: "50x50",
      },
      {
        purpose: "any",
        src: "blue-150.png?Content-type=image/png",
        sizes: "150x150",
      },
    ],
  });
  const tabOptions = { gBrowser, url: makeTestURL(manifestMock) };
  await BrowserTestUtils.withNewTab(tabOptions, async function (browser) {
    const manifest = await ManifestObtainer.browserObtainManifest(browser);
    let icon = await ManifestIcons.browserFetchIcon(browser, manifest, "any", [
      "monochrome",
    ]);
    let color = await SpecialPowers.spawn(browser, [icon], getIconColor);
    is(color[0], 255, "Fetched red icon for purpose 'monochrome'");

    icon = await ManifestIcons.browserFetchIcon(browser, manifest, "any", [
      "maskable",
    ]);
    color = await SpecialPowers.spawn(browser, [icon], getIconColor);
    is(color[0], 255, "Fetched red icon for purpose 'maskable'");

    icon = await ManifestIcons.browserFetchIcon(browser, manifest, "any", [
      "any",
    ]);
    color = await SpecialPowers.spawn(browser, [icon], getIconColor);
    is(color[2], 255, "Fetched blue icon for 'any'");
  });
});
