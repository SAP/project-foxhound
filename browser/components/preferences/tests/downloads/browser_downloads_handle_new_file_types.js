/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Bug 2036014 - the "What should Firefox do with other files?" label is
 * rendered as the <legend> of a <moz-fieldset> that lives inside the shadow
 * DOM of a <moz-radio-group>. The preferences in-page search must recurse
 * into nested shadow roots to highlight that text.
 */
add_task(async function highlight_handle_new_file_types_legend() {
  await openPreferencesViaOpenPreferencesAPI("downloads", { leaveOpen: true });

  let doc = gBrowser.contentDocument;
  let win = gBrowser.contentWindow;
  await doc.l10n.ready;

  let group = doc.querySelector(
    "moz-radio-group[data-l10n-id='applications-setting-new-file-types']"
  );
  ok(group, "Found the handleNewFileTypes moz-radio-group");

  let mozFieldset = group.shadowRoot.querySelector("moz-fieldset");
  ok(mozFieldset, "moz-radio-group renders a nested moz-fieldset");
  let legend = mozFieldset.shadowRoot.querySelector("legend");
  ok(legend, "moz-fieldset renders a legend in its shadow root");

  let query = "what should";
  let searchInput = doc.getElementById("searchInput");
  searchInput.focus();

  let searchCompletedPromise = BrowserTestUtils.waitForEvent(
    win,
    "PreferencesSearchCompleted",
    evt => evt.detail == query
  );
  EventUtils.sendString(query);
  await searchCompletedPromise;

  ok(
    !group.classList.contains("visually-hidden") && !group.hidden,
    "moz-radio-group is visible in the search results"
  );

  let controller = win.docShell
    .QueryInterface(Ci.nsIInterfaceRequestor)
    .getInterface(Ci.nsISelectionDisplay)
    .QueryInterface(Ci.nsISelectionController);
  let findSelection = controller.getSelection(
    Ci.nsISelectionController.SELECTION_FIND
  );

  let legendHighlighted = false;
  for (let i = 0; i < findSelection.rangeCount; i++) {
    let range = findSelection.getRangeAt(i);
    if (legend.contains(range.startContainer)) {
      legendHighlighted = true;
      break;
    }
  }
  ok(
    legendHighlighted,
    "The legend text inside the nested shadow DOM is part of the find-highlight selection"
  );

  let clearedPromise = BrowserTestUtils.waitForEvent(
    win,
    "PreferencesSearchCompleted",
    evt => evt.detail == ""
  );
  let count = query.length;
  while (count--) {
    EventUtils.sendKey("BACK_SPACE");
  }
  await clearedPromise;

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
