/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests for the single-row Top Sites shown below the Smartbar in the AI Window
 * fullpage (New Tab) mode.
 *
 * These verify that:
 * - Top Sites render (capped at MAX_TOP_SITES) once starter prompts resolve, so
 *   the prompts row and Top Sites paint together instead of shifting.
 * - The browser.smartwindow.hideTopSites pref hides Top Sites live.
 * - Background (hidden) tabs reveal Top Sites without waiting on starters,
 *   which never load for a non-selected tab.
 * - The smartwindow-topsites component renders tiles, falls back through the
 *   icon sources, and dispatches a selection event.
 */

"use strict";

const { TopSites } = ChromeUtils.importESModule(
  "resource:///modules/topsites/TopSites.sys.mjs"
);

const HIDE_TOP_SITES_PREF = "browser.smartwindow.hideTopSites";
const MAX_TOP_SITES = 8;

const SAMPLE_SITES = [
  { url: "https://example.com/", label: "Example" },
  { url: "https://example.org/", label: "Example Org" },
];

function getAiWindow(browser) {
  return browser.contentDocument?.querySelector("ai-window");
}

function getTopSiteTiles(aiWindow) {
  const el = aiWindow?.shadowRoot?.querySelector("smartwindow-topsites");
  if (!el) {
    return [];
  }
  return Array.from(el.shadowRoot.querySelectorAll(".sw-topsite"));
}

async function getResolvedAiWindow(browser) {
  const aiWindow = await TestUtils.waitForCondition(
    () => getAiWindow(browser),
    "ai-window element should connect"
  );
  // Let the natural starter flow settle so it cannot asynchronously flip
  // startersResolved out from under the assertions below.
  await TestUtils.waitForCondition(
    () => aiWindow.startersResolved,
    "starter prompts should resolve for the selected tab"
  );
  return aiWindow;
}

add_task(async function test_topsites_render_after_starters_resolve() {
  const sb = sinon.createSandbox();
  sb.stub(TopSites, "getSites").resolves(SAMPLE_SITES);

  const win = await openAIWindow();
  try {
    const aiWindow = await getResolvedAiWindow(win.gBrowser.selectedBrowser);

    const tiles = await TestUtils.waitForCondition(() => {
      const t = getTopSiteTiles(aiWindow);
      return t.length === SAMPLE_SITES.length ? t : false;
    }, "Top Sites tiles should render once starters have resolved");

    Assert.deepEqual(
      tiles.map(t => t.querySelector(".sw-topsite-title").textContent.trim()),
      ["Example", "Example Org"],
      "Tile titles should match the provided sites"
    );
    Assert.deepEqual(
      tiles.map(t => t.getAttribute("href")),
      ["https://example.com/", "https://example.org/"],
      "Tile hrefs should match the provided sites"
    );
  } finally {
    await BrowserTestUtils.closeWindow(win);
    sb.restore();
  }
});

add_task(async function test_topsites_capped_at_max() {
  const manySites = Array.from({ length: MAX_TOP_SITES + 4 }, (_, i) => ({
    url: `https://site${i}.example/`,
    label: `Site ${i}`,
  }));
  const sb = sinon.createSandbox();
  sb.stub(TopSites, "getSites").resolves(manySites);

  const win = await openAIWindow();
  try {
    const aiWindow = await getResolvedAiWindow(win.gBrowser.selectedBrowser);

    await TestUtils.waitForCondition(
      () => getTopSiteTiles(aiWindow).length,
      "Top Sites tiles should render"
    );

    Assert.equal(
      getTopSiteTiles(aiWindow).length,
      MAX_TOP_SITES,
      "Only the first MAX_TOP_SITES tiles should render in a single row"
    );
  } finally {
    await BrowserTestUtils.closeWindow(win);
    sb.restore();
  }
});

add_task(async function test_topsites_gated_on_starter_resolution() {
  const sb = sinon.createSandbox();
  sb.stub(TopSites, "getSites").resolves(SAMPLE_SITES);

  const win = await openAIWindow();
  try {
    const aiWindow = await getResolvedAiWindow(win.gBrowser.selectedBrowser);
    await TestUtils.waitForCondition(
      () => getTopSiteTiles(aiWindow).length === SAMPLE_SITES.length,
      "Top Sites should render once starters resolve"
    );

    // Reproduce the pre-resolution state to confirm Top Sites stay hidden,
    // which is what keeps them from painting before the prompts row and jumping.
    aiWindow.startersResolved = false;
    await aiWindow.updateComplete;

    Assert.equal(
      getTopSiteTiles(aiWindow).length,
      0,
      "Top Sites should not render before starters resolve"
    );

    aiWindow.startersResolved = true;
    await aiWindow.updateComplete;

    await TestUtils.waitForCondition(
      () => getTopSiteTiles(aiWindow).length === SAMPLE_SITES.length,
      "Top Sites should render again once starters resolve"
    );
  } finally {
    await BrowserTestUtils.closeWindow(win);
    sb.restore();
  }
});

add_task(async function test_topsites_hidden_by_pref() {
  await SpecialPowers.pushPrefEnv({ set: [[HIDE_TOP_SITES_PREF, false]] });
  const sb = sinon.createSandbox();
  sb.stub(TopSites, "getSites").resolves(SAMPLE_SITES);

  const win = await openAIWindow();
  try {
    const aiWindow = await getResolvedAiWindow(win.gBrowser.selectedBrowser);
    await TestUtils.waitForCondition(
      () => getTopSiteTiles(aiWindow).length === SAMPLE_SITES.length,
      "Top Sites should render while the hide pref is false"
    );

    // Flipping the pref on clears Top Sites via the lazy pref observer.
    await SpecialPowers.pushPrefEnv({ set: [[HIDE_TOP_SITES_PREF, true]] });
    await TestUtils.waitForCondition(
      () => getTopSiteTiles(aiWindow).length === 0,
      "Top Sites should hide when the hide pref flips to true"
    );
    await SpecialPowers.popPrefEnv();
  } finally {
    await BrowserTestUtils.closeWindow(win);
    sb.restore();
    await SpecialPowers.popPrefEnv();
  }
});

add_task(async function test_topsites_revealed_in_background_tab() {
  const sb = sinon.createSandbox();
  sb.stub(TopSites, "getSites").resolves(SAMPLE_SITES);

  const win = await openAIWindow();
  let bgTab;
  try {
    // A background tab's loadStarterPrompts early-returns because it is not the
    // selected tab, so its starters never resolve. Top Sites must still reveal
    // because the hidden document cannot exhibit a visible layout shift.
    bgTab = BrowserTestUtils.addTab(win.gBrowser, AIWINDOW_URL);
    await BrowserTestUtils.browserLoaded(bgTab.linkedBrowser);

    const aiWindow = await TestUtils.waitForCondition(
      () => getAiWindow(bgTab.linkedBrowser),
      "background ai-window element should connect"
    );

    Assert.ok(
      bgTab.linkedBrowser.contentDocument.hidden,
      "Background tab document should be hidden"
    );

    await TestUtils.waitForCondition(
      () => getTopSiteTiles(aiWindow).length === SAMPLE_SITES.length,
      "Top Sites should render in a hidden background tab without starters"
    );
    Assert.ok(
      aiWindow.startersResolved,
      "Hidden background tab should resolve Top Sites gating immediately"
    );
  } finally {
    if (bgTab) {
      BrowserTestUtils.removeTab(bgTab);
    }
    await BrowserTestUtils.closeWindow(win);
    sb.restore();
  }
});

add_task(async function test_topsites_component_rendering_and_selection() {
  const win = await openAIWindow();
  try {
    const doc = win.gBrowser.selectedBrowser.contentDocument;

    // Empty sites render nothing.
    const emptyEl = doc.createElement("smartwindow-topsites");
    emptyEl.sites = [];
    doc.body.appendChild(emptyEl);
    await emptyEl.updateComplete;
    Assert.equal(
      emptyEl.shadowRoot.querySelector(".sw-topsites-container"),
      null,
      "No container should render when there are no sites"
    );
    emptyEl.remove();

    // Icon source falls back tippyTopIcon -> favicon -> page-icon.
    const el = doc.createElement("smartwindow-topsites");
    el.sites = [
      {
        url: "https://a.example/",
        label: "A",
        tippyTopIcon: "page-icon:https://a.example/icon",
        favicon: "page-icon:https://a.example/fav",
      },
      {
        url: "https://b.example/",
        label: "B",
        favicon: "page-icon:https://b.example/fav",
      },
      { url: "https://c.example/", label: "C" },
    ];
    doc.body.appendChild(el);
    await el.updateComplete;

    const imgs = el.shadowRoot.querySelectorAll(".sw-topsite-icon img");
    Assert.equal(
      imgs[0].getAttribute("src"),
      "page-icon:https://a.example/icon",
      "tippyTopIcon takes precedence"
    );
    Assert.equal(
      imgs[1].getAttribute("src"),
      "page-icon:https://b.example/fav",
      "favicon is used when there is no tippyTopIcon"
    );
    Assert.equal(
      imgs[2].getAttribute("src"),
      "page-icon:https://c.example/",
      "page-icon is the final fallback"
    );

    // Selecting a tile dispatches the site-selected event with its url and
    // 0-indexed position.
    const selected = new Promise(resolve =>
      el.addEventListener(
        "SmartWindowTopSites:site-selected",
        e => resolve(e.detail),
        { once: true }
      )
    );
    el.shadowRoot.querySelectorAll(".sw-topsite")[2].click();
    const detail = await selected;
    Assert.equal(
      detail.url,
      "https://c.example/",
      "Selection event should carry the selected site url"
    );
    Assert.equal(
      detail.position,
      2,
      "Selection event should carry the 0-indexed tile position"
    );

    el.remove();
  } finally {
    await BrowserTestUtils.closeWindow(win);
  }
});

add_task(async function test_topsites_telemetry_enabled_and_impression() {
  Services.fog.testResetFOG();
  const sb = sinon.createSandbox();
  sb.stub(TopSites, "getSites").resolves(SAMPLE_SITES);

  const win = await openAIWindow();
  try {
    const aiWindow = await getResolvedAiWindow(win.gBrowser.selectedBrowser);
    await TestUtils.waitForCondition(
      () => getTopSiteTiles(aiWindow).length === SAMPLE_SITES.length,
      "Top Sites tiles should render"
    );
    await Services.fog.testFlushAllChildren();

    Assert.strictEqual(
      Glean.smartWindow.topsitesEnabled.testGetValue(),
      true,
      "topsites_enabled should be true when Top Sites are shown"
    );

    const impressions = Glean.smartWindow.topsitesImpression.testGetValue();
    Assert.equal(
      impressions?.length,
      1,
      "A single topsites_impression event should be recorded per row load"
    );
    Assert.equal(
      impressions[0].extra.visible_topsites,
      String(SAMPLE_SITES.length),
      "Impression should report the number of visible Top Sites"
    );
  } finally {
    await BrowserTestUtils.closeWindow(win);
    sb.restore();
  }
});

add_task(async function test_topsites_telemetry_enabled_false_when_hidden() {
  await SpecialPowers.pushPrefEnv({ set: [[HIDE_TOP_SITES_PREF, true]] });
  Services.fog.testResetFOG();
  const sb = sinon.createSandbox();
  sb.stub(TopSites, "getSites").resolves(SAMPLE_SITES);

  const win = await openAIWindow();
  try {
    await getResolvedAiWindow(win.gBrowser.selectedBrowser);
    await Services.fog.testFlushAllChildren();

    Assert.strictEqual(
      Glean.smartWindow.topsitesEnabled.testGetValue(),
      false,
      "topsites_enabled should be false when the hide pref is set"
    );
    Assert.equal(
      Glean.smartWindow.topsitesImpression.testGetValue(),
      null,
      "No impression should be recorded while Top Sites are hidden"
    );
  } finally {
    await BrowserTestUtils.closeWindow(win);
    sb.restore();
    await SpecialPowers.popPrefEnv();
  }
});

add_task(async function test_topsites_telemetry_click() {
  const sites = [
    { url: "https://example.com/", label: "Example" },
    { url: "https://example.org/", label: "Example Org" },
    { url: "https://example.net/", label: "Example Net" },
  ];
  Services.fog.testResetFOG();
  const sb = sinon.createSandbox();
  sb.stub(TopSites, "getSites").resolves(sites);
  // Stub navigation so clicking a tile records telemetry without loading a page.
  sb.stub(URILoadingHelper, "openTrustedLinkIn");

  const win = await openAIWindow();
  try {
    const aiWindow = await getResolvedAiWindow(win.gBrowser.selectedBrowser);
    const tiles = await TestUtils.waitForCondition(() => {
      const t = getTopSiteTiles(aiWindow);
      return t.length === sites.length ? t : false;
    }, "Top Sites tiles should render");

    // Click the third tile (0-indexed position 2).
    tiles[2].click();

    await TestUtils.waitForCondition(
      () => Glean.smartWindow.topsitesClick.testGetValue()?.length,
      "A topsites_click event should be recorded"
    );
    await Services.fog.testFlushAllChildren();

    const clicks = Glean.smartWindow.topsitesClick.testGetValue();
    Assert.equal(
      clicks.length,
      1,
      "One topsites_click event should be recorded"
    );
    Assert.equal(
      clicks[0].extra.position,
      "2",
      "Click should report the 0-indexed tile position"
    );
    Assert.equal(
      clicks[0].extra.visible_topsites,
      String(sites.length),
      "Click should report the number of visible Top Sites"
    );
    Assert.ok(
      URILoadingHelper.openTrustedLinkIn.calledOnce,
      "Clicking a tile should trigger navigation"
    );
    Assert.equal(
      URILoadingHelper.openTrustedLinkIn.firstCall.args[1],
      "https://example.net/",
      "Navigation should target the clicked site url"
    );
  } finally {
    await BrowserTestUtils.closeWindow(win);
    sb.restore();
  }
});
