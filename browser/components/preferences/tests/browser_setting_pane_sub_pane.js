/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

describe("setting-pane", () => {
  let doc, win, testSubPaneButton;

  beforeEach(async function setup() {
    await openPreferencesViaOpenPreferencesAPI("general", { leaveOpen: true });
    doc = gBrowser.selectedBrowser.contentDocument;
    win = doc.ownerGlobal;
    testSubPaneButton = doc.createElement("moz-button");
    testSubPaneButton.hidden = true;
    testSubPaneButton.setAttribute("data-category", "panePrivacy");
    testSubPaneButton.textContent = "Go to test pane";
    testSubPaneButton.addEventListener("click", () =>
      win.gotoPref("paneTestSubPane")
    );
    let privacyHeading = doc.getElementById("browserPrivacyCategory");
    privacyHeading.insertAdjacentElement("afterend", testSubPaneButton);
    win.Preferences.addSetting({
      id: "testSetting",
      get: () => true,
    });
    win.SettingGroupManager.registerGroup("testGroup", {
      l10nId: "downloads-header-2",
      headingLevel: 2,
      items: [
        {
          id: "testSetting",
          controlAttrs: {
            label: "Test setting",
          },
        },
      ],
    });
    win.SettingPaneManager.registerPane("testSubPane", {
      parent: "privacy",
      l10nId: "containers-section-header",
      groupIds: ["testGroup"],
    });
  });

  afterEach(() => BrowserTestUtils.removeTab(gBrowser.selectedTab));

  it("can load/go back sub-pane", async () => {
    let pane = doc.querySelector(
      'setting-pane[data-category="paneTestSubPane"]'
    );
    is_element_hidden(pane, "Sub pane is initially hidden");

    // Load the privacy pane
    let paneLoaded = waitForPaneChange("privacy");
    EventUtils.synthesizeMouseAtCenter(
      doc.getElementById("category-privacy"),
      {},
      win
    );
    await paneLoaded;

    // Load the sub pane
    paneLoaded = waitForPaneChange("testSubPane");
    EventUtils.synthesizeMouseAtCenter(testSubPaneButton, {}, win);
    await paneLoaded;

    is_element_visible(pane, "Page header is visible");
    ok(pane, "There is a setting pane");
    await pane.updateComplete;
    let pageHeader = pane.pageHeaderEl;
    ok(pageHeader, "There is a page header");
    is(
      pageHeader.dataset.l10nId,
      "containers-section-header",
      "Page header has its l10nId"
    );
    let heading = pageHeader.headingEl;
    ok(heading, "There is a heading in the header");
    ok(heading.innerText, "The heading has text");
    is(heading.innerText, pageHeader.heading, "The text is localized");
    let backButton = pageHeader.backButtonEl;
    ok(backButton, "There is a back button");

    doc.dispatchEvent(
      new CustomEvent("paneshown", {
        bubbles: true,
        cancelable: true,
        detail: {
          category: "paneTestSubPane",
        },
      })
    );
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
    paneLoaded = waitForPaneChange("privacy");
    EventUtils.synthesizeMouseAtCenter(backButton, {}, win);
    await paneLoaded;
    is_element_hidden(pane, "Sub pane is hidden again");
  });
});
