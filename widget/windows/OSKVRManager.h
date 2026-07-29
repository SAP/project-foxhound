/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef OSKVRManager_h
#define OSKVRManager_h

namespace mozilla {
namespace widget {

class OSKVRManager final {
 public:
  static void ShowOnScreenKeyboard();
  static void DismissOnScreenKeyboard();
};

}  // namespace widget
}  // namespace mozilla

#endif  // OSKVRManager_h
