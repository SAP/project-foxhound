/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef ExecuteIfOnMainThreadEventTarget_h_
#define ExecuteIfOnMainThreadEventTarget_h_

#include "nsISerialEventTarget.h"

namespace mozilla {
namespace net {

/*
  An event target that will execute the runnable immediately if on the main
  thread, avoiding a dispatch to the end of queue. Otherwise the runnable will
  be dispatched to the main thread.
 */
class ExecuteIfOnMainThreadEventTarget final : public nsISerialEventTarget {
 public:
  ExecuteIfOnMainThreadEventTarget() = default;

  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSIEVENTTARGET
  NS_DECL_NSISERIALEVENTTARGET

  static nsISerialEventTarget* Get();

 private:
  ~ExecuteIfOnMainThreadEventTarget() = default;
};

}  // namespace net
}  // namespace mozilla

#endif
