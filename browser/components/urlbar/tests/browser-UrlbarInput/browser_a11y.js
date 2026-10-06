/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_combobox_controls_listbox() {
  let ariaControlsElements = gURLBar.inputField.ariaControlsElements;
  is(
    ariaControlsElements.length,
    1,
    "The urlbar input controls one other element"
  );
  is(
    ariaControlsElements[0].id,
    "urlbar-results",
    "The urlbar input controls the results combobox"
  );
  is(
    ariaControlsElements[0],
    document.querySelector("#urlbar .urlbarView-results"),
    "The results combobox controlled by the urlbar input is a descendent of the urlbar"
  );
});
