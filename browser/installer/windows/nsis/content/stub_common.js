// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

window.attachEvent("onload", function () {
  if (parseInt(external.getIsHighContrast())) {
    document.body.className += " high-contrast";
  }

  document.body.style.fontFamily = external.getFontName() + ", sans-serif";

  // Disallow dragging of the "background" image.
  document.getElementById("background").attachEvent("ondragstart", function () {
    return false;
  });
});
