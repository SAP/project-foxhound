/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "mozilla/media/DesktopCaptureInterface.h"

#ifndef DOM_MEDIA_SYSTEMSERVICES_EMPTYDESKTOPCAPTURER_H_
#  define DOM_MEDIA_SYSTEMSERVICES_EMPTYDESKTOPCAPTURER_H_

namespace mozilla {
class EmptyDesktopCapturer : public DesktopCaptureInterface {
 public:
  MediaEventSource<void>* CaptureEndedEvent() override { return nullptr; }
};
}  // namespace mozilla

#endif  // DOM_MEDIA_SYSTEMSERVICES_EMPTYDESKTOPCAPTURER_H_
