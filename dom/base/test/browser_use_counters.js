/* -*- Mode: javascript; tab-width: 2; indent-tabs-mode: nil; js-indent-level: 2 -*- */

requestLongerTimeout(2);

const gHttpTestRoot = "https://example.com/browser/dom/base/test/";

add_setup(async function test_initialize() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["layout.css.use-counters.enabled", true],
      ["layout.css.use-counters-unimplemented.enabled", true],
    ],
  });
});

async function grabCounters(counters, before) {
  let result = { sentinel: await ensureData(before?.sentinel) };
  await Services.fog.testFlushAllChildren();
  result.gleanPage = Object.fromEntries(
    counters.map(c => [
      c.name,
      Glean[`useCounter${c.glean[0]}Page`][c.glean[1]].testGetValue() ?? 0,
    ])
  );
  result.gleanDoc = Object.fromEntries(
    counters.map(c => [
      c.name,
      Glean[`useCounter${c.glean[0]}Doc`][c.glean[1]].testGetValue() ?? 0,
    ])
  );
  result.glean_docs_destroyed =
    Glean.useCounter.contentDocumentsDestroyed.testGetValue();
  result.glean_toplevel_destroyed =
    Glean.useCounter.topLevelContentDocumentsDestroyed.testGetValue();
  return result;
}

function assertRange(before, after, key, range) {
  before = before[key];
  after = after[key];
  let desc = key + " are correct";
  if (Array.isArray(range)) {
    let [min, max] = range;
    Assert.greaterOrEqual(after, before + min, desc);
    Assert.lessOrEqual(after, before + max, desc);
  } else {
    Assert.equal(after, before + range, desc);
  }
}

async function test_once(
  { counters, toplevel_docs, docs, ignore_sentinel },
  callback
) {
  // Hold on to the current values of the data we're interested in.
  // Opening an about:blank tab shouldn't change those.
  let before = await grabCounters(counters);

  await callback();

  let after = await grabCounters(counters, ignore_sentinel ? null : before);

  // Compare before and after.
  for (let counter of counters) {
    let name = counter.name;
    let value = counter.value ?? 1;
    if (!counter.xfail) {
      is(
        after.gleanPage[name],
        before.gleanPage[name] + value,
        `Glean page counts for ${name} are correct`
      );
      is(
        after.gleanDoc[name],
        before.gleanDoc[name] + value,
        `Glean document counts for ${name} are correct`
      );
    }
  }

  assertRange(before, after, "glean_toplevel_destroyed", toplevel_docs);
  assertRange(before, after, "glean_docs_destroyed", docs);
}

add_task(async function test_page_counters() {
  const TESTS = [
    // Check that use counters are incremented by SVGs loaded directly in iframes.
    {
      type: "iframe",
      filename: "file_use_counter_svg_getElementById.svg",
      counters: [
        {
          name: "SVGSVGELEMENT_GETELEMENTBYID",
          glean: ["", "svgsvgelementGetelementbyid"],
        },
      ],
    },
    {
      type: "iframe",
      filename: "file_use_counter_svg_currentScale.svg",
      counters: [
        {
          name: "SVGSVGELEMENT_CURRENTSCALE_getter",
          glean: ["", "svgsvgelementCurrentscaleGetter"],
        },
        {
          name: "SVGSVGELEMENT_CURRENTSCALE_setter",
          glean: ["", "svgsvgelementCurrentscaleSetter"],
        },
      ],
    },

    {
      type: "iframe",
      filename: "file_use_counter_style.html",
      counters: [
        // Check for longhands.
        {
          name: "CSS_PROPERTY_BackgroundImage",
          glean: ["Css", "cssBackgroundImage"],
        },
        // Check for shorthands.
        { name: "CSS_PROPERTY_Padding", glean: ["Css", "cssPadding"] },
        // Check for aliases.
        {
          name: "CSS_PROPERTY_MozAppearance",
          glean: ["Css", "cssMozAppearance"],
        },
        // Check for counted unknown properties.
        {
          name: "CSS_PROPERTY_WebkitPaddingStart",
          glean: ["Css", "webkitPaddingStart"],
        },
      ],
    },

    // Check that even loads from the imglib cache update use counters.  The
    // images should still be there, because we just loaded them in the last
    // set of tests.  But we won't get updated counts for the document
    // counters, because we won't be re-parsing the SVG documents.
    {
      type: "iframe",
      filename: "file_use_counter_svg_getElementById.svg",
      counters: [
        {
          name: "SVGSVGELEMENT_GETELEMENTBYID",
          glean: ["", "svgsvgelementGetelementbyid"],
        },
      ],
    },
    {
      type: "iframe",
      filename: "file_use_counter_svg_currentScale.svg",
      counters: [
        {
          name: "SVGSVGELEMENT_CURRENTSCALE_getter",
          glean: ["", "svgsvgelementCurrentscaleGetter"],
        },
        {
          name: "SVGSVGELEMENT_CURRENTSCALE_setter",
          glean: ["", "svgsvgelementCurrentscaleSetter"],
        },
      ],
    },

    // Check that use counters are incremented by SVGs loaded as images.
    // Note that SVG images are not permitted to execute script, so we can only
    // check for properties here.
    {
      type: "img",
      filename: "file_use_counter_svg_getElementById.svg",
      counters: [{ name: "CSS_PROPERTY_Fill", glean: ["Css", "cssFill"] }],
    },
    {
      type: "img",
      filename: "file_use_counter_svg_currentScale.svg",
      counters: [{ name: "CSS_PROPERTY_Fill", glean: ["Css", "cssFill"] }],
    },

    // Check that use counters are incremented by directly loading SVGs
    // that reference patterns defined in another SVG file.
    {
      type: "direct",
      filename: "file_use_counter_svg_fill_pattern.svg",
      counters: [
        {
          name: "CSS_PROPERTY_FillOpacity",
          glean: ["Css", "cssFillOpacity"],
          xfail: true,
        },
      ],
    },

    // Check that use counters are incremented by directly loading SVGs
    // that reference patterns defined in the same file or in data: URLs.
    {
      type: "direct",
      filename: "file_use_counter_svg_fill_pattern_internal.svg",
      counters: [
        { name: "CSS_PROPERTY_FillOpacity", glean: ["Css", "cssFillOpacity"] },
      ],
    },

    // Check that use counters are incremented in a display:none iframe.
    {
      type: "undisplayed-iframe",
      filename: "file_use_counter_svg_currentScale.svg",
      counters: [
        {
          name: "SVGSVGELEMENT_CURRENTSCALE_getter",
          glean: ["", "svgsvgelementCurrentscaleGetter"],
        },
      ],
    },

    // Check that a document that comes out of the bfcache reports any new use
    // counters recorded on it.
    {
      type: "direct",
      filename: "file_use_counter_bfcache.html",
      waitForExplicitFinish: true,
      counters: [
        {
          name: "SVGSVGELEMENT_GETELEMENTBYID",
          glean: ["", "svgsvgelementGetelementbyid"],
        },
      ],
    },

    // // data: URLs don't correctly propagate to their referring document yet.
    // {
    //   type: "direct",
    //   filename: "file_use_counter_svg_fill_pattern_data.svg",
    //   counters: [
    //     { name: "PROPERTY_FILL_OPACITY" },
    //   ],
    // },
  ];

  for (let test of TESTS) {
    let file = test.filename;
    info(`checking ${file} (${test.type})`);

    let options = {
      counters: test.counters,
      // bfcache test navigates a bunch of times and thus creates multiple top
      // level document entries, as expected. Whether the last document is
      // destroyed is a bit racy, see bug 1842800, so for now we allow it
      // with +/- 1.
      toplevel_docs: file == "file_use_counter_bfcache.html" ? [5, 6] : 1,
      docs: [test.type == "img" ? 2 : 1, Infinity],
    };

    await test_once(options, async function () {
      // Load the test file in the new tab, either directly or via
      // file_use_counter_outer{,_display_none}.html, depending on the test type.
      let url, targetElement;
      switch (test.type) {
        case "iframe":
          url = gHttpTestRoot + "file_use_counter_outer.html";
          targetElement = "content";
          break;
        case "undisplayed-iframe":
          url = gHttpTestRoot + "file_use_counter_outer_display_none.html";
          targetElement = "content";
          break;
        case "img":
          url = gHttpTestRoot + "file_use_counter_outer.html";
          targetElement = "display";
          break;
        case "direct":
          url = gHttpTestRoot + file;
          targetElement = null;
          break;
        default:
          throw `unexpected type ${test.type}`;
      }

      let waitForFinish = null;
      if (test.waitForExplicitFinish) {
        is(
          test.type,
          "direct",
          `cannot use waitForExplicitFinish with test type ${test.type}`
        );
        // Wait until the tab changes its hash to indicate it has finished.
        waitForFinish = BrowserTestUtils.waitForLocationChange(
          gBrowser,
          url + "#finished"
        );
      }

      let newTab = await BrowserTestUtils.openNewForegroundTab(gBrowser, url);
      if (waitForFinish) {
        await waitForFinish;
      }

      if (targetElement) {
        // Inject our desired file into the target element of the newly-loaded page.
        await SpecialPowers.spawn(
          gBrowser.selectedBrowser,
          [{ file, targetElement }],
          function (opts) {
            let target = content.document.getElementById(opts.targetElement);
            target.src = opts.file;

            return new Promise(resolve => {
              let listener = event => {
                event.target.removeEventListener("load", listener, true);
                resolve();
              };
              target.addEventListener("load", listener, true);
            });
          }
        );
      }

      // Tear down the page.
      await BrowserTestUtils.removeTab(newTab);
    });
  }
});

add_task(async function test_extension_counters() {
  let options = {
    counters: [],
    docs: 0,
    toplevel_docs: 0,
    ignore_sentinel: true,
  };
  await test_once(options, async function () {
    let extension = ExtensionTestUtils.loadExtension({
      manifest: {
        page_action: {
          default_popup: "page.html",
          browser_style: false,
        },
      },
      async background() {
        let [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        await browser.pageAction.show(tab.id);
        browser.test.sendMessage("ready");
      },
      files: {
        "page.html": `<!DOCTYPE html>
          <meta charset="utf-8">
          <!-- Enough to trigger the use counter -->
          <style>:root { opacity: .5 }</style>
        `,
      },
    });

    await extension.startup();
    info("Extension started up");

    await extension.awaitMessage("ready");

    await extension.unload();
    info("Extension unloaded");
  });
});

async function ensureData(prevSentinelValue = null) {
  ok(
    !prevSentinelValue ||
      ("page" in prevSentinelValue && "doc" in prevSentinelValue),
    `Sentinel's valid: ${JSON.stringify(prevSentinelValue)}`
  );
  // Unfortunately, document destruction (when use counter reporting happens)
  // happens at some time later than the removal of the tab.
  // To wait for the use counters to be reported, we repeatedly flush IPC and
  // check for a change in the "sentinel" use counters
  // `use.counter.css.{page|doc}.css_marker_mid`.
  return BrowserTestUtils.waitForCondition(
    async () => {
      await Services.fog.testFlushAllChildren();
      return (
        !prevSentinelValue ||
        (prevSentinelValue?.page !=
          Glean.useCounterCssPage.cssMarkerMid.testGetValue() &&
          prevSentinelValue?.doc !=
            Glean.useCounterCssDoc.cssMarkerMid.testGetValue())
      );
    },
    "ensureData",
    100,
    Infinity
  ).then(
    () => ({
      doc: Glean.useCounterCssPage.cssMarkerMid.testGetValue(),
      page: Glean.useCounterCssDoc.cssMarkerMid.testGetValue(),
    }),
    msg => {
      throw msg;
    }
  );
}
