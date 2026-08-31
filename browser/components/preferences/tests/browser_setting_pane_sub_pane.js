/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

describe("setting-pane", () => {
  let doc, win;

  beforeEach(async function setup() {
    ({ doc, win } = await setupTestSubPane());
  });

  afterEach(() => BrowserTestUtils.removeTab(gBrowser.selectedTab));

  it("can load/go back sub-pane", async () => {
    let pane = doc.querySelector(
      'setting-pane[data-category="paneTestSubPane"]'
    );
    is_element_hidden(pane, "Sub pane is initially hidden");

    // Load the sub pane
    let paneLoaded = waitForPaneChange("testSubPane");
    EventUtils.synthesizeMouseAtCenter(
      getSettingControl("testLoadSubPane"),
      {},
      win
    );
    await paneLoaded;

    is_element_visible(pane, "Page header is visible");
    ok(pane, "There is a setting pane");
    await pane.updateComplete;
    let pageHeader = pane.pageHeaderEl;
    ok(pageHeader, "There is a page header");
    is(
      pageHeader.dataset.l10nId,
      "containers-section-header2",
      "Page header has its l10nId"
    );
    let heading = pageHeader.headingEl;
    ok(heading, "There is a heading in the header");
    ok(heading.innerText, "The heading has text");
    is(heading.innerText, pageHeader.heading, "The text is localized");
    let backButton = pageHeader.backButtonEl;
    ok(backButton, "There is a back button");

    is(
      doc.activeElement,
      pageHeader,
      "Page header should have focus after pane is shown"
    );
    is(
      pageHeader.shadowRoot.activeElement,
      backButton,
      "Back button should be focused after pane is shown"
    );

    // Go back
    paneLoaded = waitForPaneChange("testTopLevel");
    EventUtils.synthesizeMouseAtCenter(backButton, {}, win);
    await paneLoaded;
    is_element_hidden(pane, "Sub pane is hidden again");
  });

  it("shows breadcrumbs on sub-pane", async () => {
    let pane = doc.querySelector(
      'setting-pane[data-category="paneTestSubPane"]'
    );

    let paneLoaded = waitForPaneChange("testSubPane");
    EventUtils.synthesizeMouseAtCenter(
      getSettingControl("testLoadSubPane"),
      {},
      win
    );
    await paneLoaded;
    await pane.updateComplete;

    let pageHeader = pane.pageHeaderEl;
    let breadcrumbGroup = pageHeader.querySelector("moz-breadcrumb-group");
    ok(breadcrumbGroup, "There is a breadcrumb group");

    let breadcrumbs = breadcrumbGroup.querySelectorAll("moz-breadcrumb");
    is(breadcrumbs.length, 2, "There are two breadcrumbs");

    is(
      breadcrumbs[0].dataset.l10nId,
      "home-section",
      "First breadcrumb has the parent l10nId"
    );
    is(
      breadcrumbs[0].href,
      "#testTopLevel",
      "First breadcrumb links to parent pane"
    );

    is(
      breadcrumbs[1].dataset.l10nId,
      "containers-section-header2",
      "Second breadcrumb has the sub-pane l10nId"
    );
    is(
      breadcrumbs[1].href,
      "#testSubPane",
      "Second breadcrumb links to current pane"
    );
    is(
      breadcrumbs[1].getAttribute("aria-current"),
      "page",
      "Last breadcrumb has aria-current=page"
    );
  });

  it("does not show breadcrumbs on top-level pane", async () => {
    let pane = doc.querySelector(
      'setting-pane[data-category="paneTestTopLevel"]'
    );
    ok(pane, "Top-level setting-pane exists");

    let pageHeader = pane.pageHeaderEl;
    let breadcrumbGroup = pageHeader.querySelector("moz-breadcrumb-group");
    ok(!breadcrumbGroup, "No breadcrumbs on top-level pane");
  });

  it("breadcrumb navigates to parent pane", async () => {
    let pane = doc.querySelector(
      'setting-pane[data-category="paneTestSubPane"]'
    );

    let paneLoaded = waitForPaneChange("testSubPane");
    EventUtils.synthesizeMouseAtCenter(
      getSettingControl("testLoadSubPane"),
      {},
      win
    );
    await paneLoaded;
    await pane.updateComplete;

    let pageHeader = pane.pageHeaderEl;
    let breadcrumbs = pageHeader.querySelectorAll("moz-breadcrumb");
    let parentBreadcrumb = breadcrumbs[0];
    let link = parentBreadcrumb.shadowRoot.querySelector("a");
    ok(link, "Parent breadcrumb has a link");

    paneLoaded = waitForPaneChange("testTopLevel");
    EventUtils.synthesizeMouseAtCenter(link, {}, win);
    await paneLoaded;
  });
});
