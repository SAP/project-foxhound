function baseURI(host) {
  return `https://${host}/browser/toolkit/components/antitracking/test/browser/empty.html`;
}

async function do_iframe_test({
  tabHost,
  frameHost,
  frameSandbox = false,
  conclusion,
}) {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: baseURI(tabHost) },
    async browser => {
      await SpecialPowers.spawn(
        browser,
        [{ frameURI: baseURI(frameHost), frameSandbox, conclusion }],
        async props => {
          // Create a mediaSource, and wait for it to be opened.
          let mediaSource = new content.MediaSource();
          let openPromise = new Promise(resolve =>
            mediaSource.addEventListener(
              "sourceopen",
              _e => resolve("sourceopen"),
              { once: true }
            )
          );
          let sourceURL = content.URL.createObjectURL(mediaSource);

          let ifr = content.document.createElement("iframe");
          ifr.src = props.frameURI;
          if (props.frameSandbox) {
            ifr.sandbox = props.frameSandbox;
          }
          content.document.body.appendChild(ifr);

          await new Promise(resolve =>
            ifr.addEventListener("load", resolve, { once: true })
          );

          let errorPromise = SpecialPowers.spawn(
            ifr.contentWindow,
            [sourceURL],
            async src => {
              let mediaTag = content.document.createElement("video");
              content.document.body.appendChild(mediaTag);
              let promise = new Promise(resolve =>
                mediaTag.addEventListener("error", _e => resolve("error"), {
                  once: true,
                })
              );
              mediaTag.src = src;
              return promise;
            }
          );

          info(`About to wait for a conclusion, inserted URL: ${sourceURL}`);
          is(
            await Promise.race([openPromise, errorPromise]),
            props.conclusion,
            `expected the ${props.conclusion} conclusion`
          );
        }
      );
    }
  );
}

add_task(async function test_same_site_iframe() {
  await do_iframe_test({
    tabHost: "example.org",
    frameHost: "example.org",
    conclusion: "sourceopen",
  });
});

add_task(async function test_same_site_sandbox_iframe() {
  await do_iframe_test({
    tabHost: "example.org",
    frameHost: "example.org",
    frameSandbox: "allow-scripts allow-same-origin",
    conclusion: "sourceopen",
  });
});

add_task(async function test_cross_site_iframe() {
  await do_iframe_test({
    tabHost: "example.org",
    frameHost: "example.com",
    conclusion: "error",
  });
});

async function do_popup_test({ tabHost, popupHost, conclusion }) {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: baseURI(tabHost) },
    async browser => {
      await SpecialPowers.spawn(
        browser,
        [{ popupURI: baseURI(popupHost), conclusion }],
        async props => {
          // Create a mediaSource, and wait for it to be opened.
          let mediaSource = new content.MediaSource();
          let openPromise = new Promise(resolve =>
            mediaSource.addEventListener(
              "sourceopen",
              _evt => resolve("sourceopen"),
              { once: true }
            )
          );
          let sourceURL = content.URL.createObjectURL(mediaSource);

          let popup = content.open(props.popupURI, "_blank");
          let loadPromise = SpecialPowers.spawnChrome(
            [popup.browsingContext, props.popupURI],
            async (bc, uri) => {
              let { BrowserTestUtils } = ChromeUtils.importESModule(
                "resource://testing-common/BrowserTestUtils.sys.mjs"
              );
              await BrowserTestUtils.browserLoaded(
                bc.embedderElement,
                false,
                uri
              );
            }
          );
          await loadPromise;

          let errorPromise = SpecialPowers.spawn(
            popup,
            [sourceURL, props.popupURI],
            async (src, expectedLocation) => {
              is(content.location.href, expectedLocation);
              let mediaTag = content.document.createElement("video");
              content.document.body.appendChild(mediaTag);
              let promise = new Promise(resolve =>
                mediaTag.addEventListener("error", _evt => resolve("error"), {
                  once: true,
                })
              );
              mediaTag.src = src;
              return promise;
            }
          );

          info(`About to wait for a conclusion, inserted URL: ${sourceURL}`);
          is(
            await Promise.race([openPromise, errorPromise]),
            props.conclusion,
            `expected the ${props.conclusion} conclusion`
          );

          popup.close();
        }
      );
    }
  );
}

add_task(async function test_same_site_popup() {
  await do_popup_test({
    tabHost: "example.org",
    popupHost: "example.org",
    conclusion: "sourceopen",
  });
});

add_task(async function test_cross_site_popup() {
  await do_popup_test({
    tabHost: "example.org",
    popupHost: "example.com",
    conclusion: "error",
  });
});

add_task(async function test_different_tab() {
  let tab1 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    baseURI("example.org")
  );
  let browser1 = gBrowser.getBrowserForTab(tab1);

  let tab2 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    baseURI("example.org")
  );
  let browser2 = gBrowser.getBrowserForTab(tab2);

  let sourceURL = await SpecialPowers.spawn(browser1, [], () => {
    let mediaSource = new content.MediaSource();
    mediaSource.addEventListener(
      "sourceopen",
      _evt => {
        ok(false, "source should not open");
      },
      { once: true }
    );
    return content.URL.createObjectURL(mediaSource);
  });

  await SpecialPowers.spawn(browser2, [sourceURL], async url => {
    let mediaTag = content.document.createElement("video");
    content.document.body.appendChild(mediaTag);

    let { promise, resolve } = Promise.withResolvers();
    mediaTag.addEventListener("error", _evt => {
      resolve("error");
    });
    mediaTag.src = url;

    is(await promise, "error", "source should error");
  });

  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
});
