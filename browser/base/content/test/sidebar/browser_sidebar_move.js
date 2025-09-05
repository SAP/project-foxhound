registerCleanupFunction(() => {
  Services.prefs.clearUserPref("sidebar.position_start");
  SidebarController.hide();
});

const EXPECTED_START_ORDINALS = [
  ["sidebar-wrapper", ""],
  ["tabbrowser-tabbox", 6],
];

const EXPECTED_WRAPPER_START_ORDINALS = [
  ["sidebar-main", 1],
  ["sidebar-launcher-splitter", 2],
  ["sidebar-box", 3],
  ["sidebar-splitter", 4],
  ["after-splitter", 5],
];

const EXPECTED_END_ORDINALS = [
  ["sidebar-wrapper", ""],
  ["tabbrowser-tabbox", 1],
];

const EXPECTED_WRAPPER_END_ORDINALS = [
  ["sidebar-main", 6],
  ["sidebar-launcher-splitter", 5],
  ["sidebar-box", 4],
  ["sidebar-splitter", 3],
  ["after-splitter", 2],
];

function getBrowserChildrenWithOrdinals() {
  let browser = document.getElementById("browser");
  return [...browser.children].map(node => {
    return [node.id, node.style.order];
  });
}

function getSidebarWrapperChildrenWithOrdinals() {
  let wrapper = SidebarController.sidebarWrapper;
  return [...wrapper.children].map(node => {
    return [node.id, node.style.order];
  });
}

add_task(async function () {
  await SidebarController.show("viewBookmarksSidebar");
  SidebarController.showSwitcherPanel();

  let reversePositionButton = document.getElementById(
    "sidebar-reverse-position"
  );
  let originalLabel = reversePositionButton.getAttribute("label");
  let box = document.getElementById("sidebar-box");

  // Default (position: left)
  Assert.deepEqual(
    getBrowserChildrenWithOrdinals(),
    EXPECTED_START_ORDINALS,
    "Correct browser ordinal (start)"
  );
  Assert.deepEqual(
    getSidebarWrapperChildrenWithOrdinals(),
    EXPECTED_WRAPPER_START_ORDINALS,
    "Correct wrapper ordinal (start)"
  );
  ok(!box.hasAttribute("positionend"), "Positioned start");

  // Moved to right
  SidebarController.reversePosition();
  SidebarController.showSwitcherPanel();
  Assert.deepEqual(
    getBrowserChildrenWithOrdinals(),
    EXPECTED_END_ORDINALS,
    "Correct browser ordinal (end)"
  );
  Assert.deepEqual(
    getSidebarWrapperChildrenWithOrdinals(),
    EXPECTED_WRAPPER_END_ORDINALS,
    "Correct wrapper ordinal (end)"
  );
  isnot(
    reversePositionButton.getAttribute("label"),
    originalLabel,
    "Label changed"
  );
  ok(box.hasAttribute("positionend"), "Positioned end");

  // Moved to back to left
  SidebarController.reversePosition();
  SidebarController.showSwitcherPanel();
  Assert.deepEqual(
    getBrowserChildrenWithOrdinals(),
    EXPECTED_START_ORDINALS,
    "Correct browser ordinal (start)"
  );
  Assert.deepEqual(
    getSidebarWrapperChildrenWithOrdinals(),
    EXPECTED_WRAPPER_START_ORDINALS,
    "Correct wrapper ordinal (start)"
  );
  ok(!box.hasAttribute("positionend"), "Positioned start");
  is(
    reversePositionButton.getAttribute("label"),
    originalLabel,
    "Label is back to normal"
  );
});
