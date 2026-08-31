/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef OSKTabTipManager_h
#define OSKTabTipManager_h

namespace mozilla {
namespace widget {

class OSKTabTipManager final {
 public:
  static void ShowOnScreenKeyboard();
  static void DismissOnScreenKeyboard();
};

}  // namespace widget
}  // namespace mozilla

#endif  // OSKTabTipManager_h
