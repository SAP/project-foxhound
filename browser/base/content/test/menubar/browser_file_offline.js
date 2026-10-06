/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

// Test that the "Work Offline" menu item reflects the actual offline state
// (bug 2024273).
add_task(async function test_offline_menuitem_checked_state() {
  let menuitem = document.getElementById("goOfflineMenuitem");
  ok(!!menuitem, "goOfflineMenuitem exists");

  ok(
    !menuitem.hasAttribute("checked"),
    "Menu item should not be checked when online"
  );

  // Go offline.
  Services.io.offline = true;
  ok(
    menuitem.hasAttribute("checked"),
    "Menu item should be checked when offline"
  );

  // Go back online.
  Services.io.offline = false;
  ok(
    !menuitem.hasAttribute("checked"),
    "Menu item should not be checked after going back online"
  );
});
