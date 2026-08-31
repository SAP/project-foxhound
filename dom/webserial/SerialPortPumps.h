/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_SerialPortPumps_h
#define mozilla_dom_SerialPortPumps_h

#include "mozilla/dom/SerialPlatformService.h"
#include "nsIAsyncInputStream.h"
#include "nsIAsyncOutputStream.h"
#include "nsThreadUtils.h"

namespace mozilla::dom {
constexpr uint32_t kMinSerialPortPumpSize = 16384;
}  // namespace mozilla::dom

namespace mozilla::dom::webserial {

// Reads data from a DataPipeReceiver (JS writes) and writes it to the serial
// device. Runs on the IO thread. Uses AsyncWait to be notified when data is
// available in the pipe.
class SerialPortWritePump final : public nsIInputStreamCallback {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS

  SerialPortWritePump(const nsString& aPortId, nsIAsyncInputStream* aInput);

  void Start();
  void Stop();

  // Register a runnable to invoke when the input pipe is fully closed (all
  // data consumed and written to the device). If the pipe is already closed
  // the runnable fires synchronously. Only one callback may be registered;
  // a second call replaces the previous one.
  void OnPipeClosed(nsCOMPtr<nsIRunnable>&& aCallback);

  bool IsPipeClosed() const { return mPipeClosed; }

  NS_IMETHOD OnInputStreamReady(nsIAsyncInputStream* aStream) override;

 private:
  ~SerialPortWritePump() = default;

  nsString mPortId;
  nsCOMPtr<nsIAsyncInputStream> mInput;
  Atomic<bool> mStopped{false};
  // Only accessed from the SerialPlatformService's IO thread
  bool mPipeClosed = false;
  nsCOMPtr<nsIRunnable> mClosedCallback;
};

}  // namespace mozilla::dom::webserial

#endif  // mozilla_dom_SerialPortPumps_h
