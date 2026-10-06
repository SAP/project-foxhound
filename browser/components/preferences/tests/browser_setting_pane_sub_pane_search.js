/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const SUB_PANE_ONLY_KEYWORD = "subpaneuniqueterm";

describe("setting-pane sub-pane search", () => {
  let doc, win;

  beforeEach(async function setup() {
    ({ doc, win } = await setupTestSubPane({
      subPaneItems: [
        {
          id: "testSetting",
          controlAttrs: {
            label: "Test setting",
            searchkeywords: SUB_PANE_ONLY_KEYWORD,
          },
        },
      ],
    }));
  });

  afterEach(() => BrowserTestUtils.removeTab(gBrowser.selectedTab));

  it("renders data-load-pane attribute for the loadPane config", async () => {
    let topLevelPane = doc.querySelector(
      'setting-pane[data-category="paneTestTopLevel"]'
    );
    await topLevelPane.updateComplete;

    let loadPaneControl = getSettingControl("testLoadSubPane", win);
    ok(loadPaneControl, "The data-load-pane control was rendered");
    let buttonEl = loadPaneControl.querySelector("moz-box-button");
    ok(buttonEl, "The moz-box-button control is present");
    is(
      buttonEl.getAttribute("data-load-pane"),
      "paneTestSubPane",
      "data-load-pane is set to the friendly name expanded to the internal name"
    );
  });

  it("surfaces the parent control when the sub-pane matches the query", async () => {
    let topLevelGroup = doc.querySelector(
      "setting-group[groupid='testTopLevelGroup']"
    );
    let topLevelPane = doc.querySelector(
      'setting-pane[data-category="paneTestTopLevel"]'
    );

    await runSearchInput(SUB_PANE_ONLY_KEYWORD);

    is_element_visible(
      topLevelPane,
      "Top-level pane is visible after search match in sub-pane"
    );
    is_element_visible(
      topLevelGroup,
      "Group containing the data-load-pane control is shown"
    );

    let loadPaneControl = getSettingControl("testLoadSubPane", win);
    let buttonEl = loadPaneControl.querySelector("moz-box-button");
    ok(
      buttonEl.parentElement.classList.contains("search-tooltip-parent"),
      "The button parent gets the search tooltip class when the sub-pane matches"
    );
  });

  it("does not surface the parent control when nothing matches", async () => {
    let topLevelPane = doc.querySelector(
      'setting-pane[data-category="paneTestTopLevel"]'
    );

    await runSearchInput("nomatchingkeywordanywhere");

    ok(
      topLevelPane.classList.contains("visually-hidden"),
      "Top-level pane is hidden when nothing matches"
    );

    let loadPaneControl = getSettingControl("testLoadSubPane", win);
    let buttonEl = loadPaneControl.querySelector("moz-box-button");
    ok(
      !buttonEl.parentElement.classList.contains("search-tooltip-parent"),
      "The button parent does not get the search tooltip class"
    );
  });

  it("does not search the sub-pane when the parent control already matches", async () => {
    // The setting label already contains "top level setting"; we shouldn't
    // need anything from the sub-pane to surface the control. This guards
    // against accidentally extending the recursive sub-pane search beyond
    // the data-load-pane shortcut.
    let topLevelPane = doc.querySelector(
      'setting-pane[data-category="paneTestTopLevel"]'
    );

    await runSearchInput("Top level setting");

    is_element_visible(
      topLevelPane,
      "Top-level pane is visible when the parent label matches directly"
    );
  });
});
