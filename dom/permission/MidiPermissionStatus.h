/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_MidiPermissionStatus_h_
#define mozilla_dom_MidiPermissionStatus_h_

#include "mozilla/dom/PermissionStatus.h"

namespace mozilla::dom {

class MidiPermissionStatus final : public PermissionStatus {
 public:
  MidiPermissionStatus(nsIGlobalObject* aGlobal, bool aSysex);

 private:
  ~MidiPermissionStatus() = default;

  nsLiteralCString GetPermissionType() const override;

  bool mSysex;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_MidiPermissionStatus_h_
