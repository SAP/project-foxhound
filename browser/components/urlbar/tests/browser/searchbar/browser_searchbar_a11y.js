/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_combobox_controls_listbox() {
  let ariaControlsElements =
    document.getElementById("searchbar-new").inputField.ariaControlsElements;
  is(
    ariaControlsElements.length,
    1,
    "The searchbar input controls one other element"
  );
  is(
    ariaControlsElements[0].id,
    "searchbar-results",
    "The searchbar input controls the results combobox"
  );
  is(
    ariaControlsElements[0],
    document.querySelector("#searchbar-new .urlbarView-results"),
    "The results combobox controlled by the searchbar input is a descendent of the searchbar"
  );
});
