/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const isMac = AppConstants.platform == "macosx";
const isLinux = AppConstants.platform == "linux";

const consts = {
  // The following constants specify the default key combinations for various
  // commands. They must be updated if these change in future.
  // key_gotoHistory
  historyDisplay: isMac ? "⇧⌘H" : "Ctrl+H",
  historyModifiers: isMac ? "accel,shift" : "accel",
  historyOptions: { accelKey: true, shiftKey: isMac },
  // key_openDownloads
  downloadsDisplay: (isMac && "⌘J") || (isLinux && "Ctrl+Shift+Y") || "Ctrl+J",
  // key_newNavigator
  newWindowDisplay: isMac ? "⌘N" : "Ctrl+N",
  // goBackKb
  backDisplay: isMac ? "⌘←" : "Alt+Left Arrow",
  backArgs: ["KEY_ArrowLeft", { accelKey: isMac, altKey: !isMac }],

  // The following unused* constants specify a key combination which is unused by
  // default. This will need to be updated if this key combination is assigned to
  // something by default in future.
  unusedModifiers: "accel,shift",
  unusedOptions: { accelKey: true, shiftKey: true },
  unusedKey: isLinux ? "Q" : "Y",
  unusedModifiersDisplay: isMac ? "⇧⌘" : "Ctrl+Shift+",
  unusedModifiersArgs: ["KEY_Shift", { accelKey: true }],
};
consts.unusedDisplay = `${consts.unusedModifiersDisplay}${consts.unusedKey}`;
