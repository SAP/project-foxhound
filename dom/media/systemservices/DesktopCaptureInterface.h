/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_SYSTEMSERVICES_DESKTOPCAPTUREINTERFACE_H_
#define DOM_MEDIA_SYSTEMSERVICES_DESKTOPCAPTUREINTERFACE_H_

#include "mozilla/media/MediaUtils.h"

namespace mozilla {
class DesktopCaptureInterface {
 public:
  virtual mozilla::MediaEventSource<void>* CaptureEndedEvent() = 0;
};
}  // namespace mozilla

#endif  // DOM_MEDIA_SYSTEMSERVICES_DESKTOPCAPTUREINTERFACE_H_
