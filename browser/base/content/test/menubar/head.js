/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

async function simulateMenuOpen(menu) {
  return new Promise(resolve => {
    menu.addEventListener("popupshown", resolve, { once: true });
    menu.dispatchEvent(new MouseEvent("popupshowing", { bubbles: true }));
    menu.dispatchEvent(new MouseEvent("popupshown", { bubbles: true }));
  });
}

async function simulateMenuClosed(menu) {
  return new Promise(resolve => {
    menu.addEventListener("popuphidden", resolve, { once: true });
    menu.dispatchEvent(new MouseEvent("popuphiding", { bubbles: true }));
    menu.dispatchEvent(new MouseEvent("popuphidden", { bubbles: true }));
  });
}
