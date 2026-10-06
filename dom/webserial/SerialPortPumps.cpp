/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SerialPortPumps.h"

#include "SerialLogging.h"

namespace mozilla::dom::webserial {

NS_IMPL_ISUPPORTS(SerialPortWritePump, nsIInputStreamCallback)

SerialPortWritePump::SerialPortWritePump(const nsString& aPortId,
                                         nsIAsyncInputStream* aInput)
    : mPortId(aPortId), mInput(aInput) {}

void SerialPortWritePump::Start() {
  RefPtr<SerialPlatformService> service = SerialPlatformService::GetInstance();
  if (service && mInput) {
    mInput->AsyncWait(this, 0, 0, service->IOThread());
  }
}

void SerialPortWritePump::Stop() {
  MOZ_LOG(gWebSerialLog, LogLevel::Debug,
          ("SerialPortWritePump::Stop for port '%s'",
           NS_ConvertUTF16toUTF8(mPortId).get()));
  mStopped = true;
}

NS_IMETHODIMP SerialPortWritePump::OnInputStreamReady(
    nsIAsyncInputStream* aStream) {
  if (mStopped) {
    return NS_OK;
  }

  RefPtr<SerialPlatformService> service = SerialPlatformService::GetInstance();
  if (!service) {
    return NS_OK;
  }

  service->AssertIsOnIOThread();

  // Read available data from the DataPipeReceiver.
  char buf[4096];
  uint32_t bytesRead = 0;
  nsresult rv = mInput->Read(buf, sizeof(buf), &bytesRead);

  if (rv == NS_BASE_STREAM_WOULD_BLOCK) {
    // No data yet, wait again.
    mInput->AsyncWait(this, 0, 0, service->IOThread());
    return NS_OK;
  }

  // NS_OK with 0 bytes is the nsIInputStream EOF convention. DataPipe
  // returns this when the peer (sender) has closed and no data remains.
  if (NS_FAILED(rv) || (NS_SUCCEEDED(rv) && bytesRead == 0)) {
    MOZ_LOG(gWebSerialLog, LogLevel::Debug,
            ("SerialPortWritePump pipe closed/error for port '%s': 0x%08x",
             NS_ConvertUTF16toUTF8(mPortId).get(), static_cast<uint32_t>(rv)));
    mPipeClosed = true;
    if (nsCOMPtr<nsIRunnable> cb = mClosedCallback.forget()) {
      cb->Run();
    }
    return NS_OK;
  }

  if (bytesRead > 0) {
    MOZ_LOG(gWebSerialLog, LogLevel::Verbose,
            ("SerialPortWritePump writing %u bytes to port '%s'", bytesRead,
             NS_ConvertUTF16toUTF8(mPortId).get()));

    nsTArray<uint8_t> data;
    data.AppendElements(reinterpret_cast<const uint8_t*>(buf), bytesRead);
    rv = service->Write(mPortId, data);
    if (NS_FAILED(rv)) {
      MOZ_LOG(
          gWebSerialLog, LogLevel::Error,
          ("SerialPortWritePump device write failed for port '%s': 0x%08x",
           NS_ConvertUTF16toUTF8(mPortId).get(), static_cast<uint32_t>(rv)));
      // Close the pipe to signal the error back to the child.
      mInput->CloseWithStatus(rv);
      return NS_OK;
    }
  }

  // Wait for more data.
  if (!mStopped) {
    mInput->AsyncWait(this, 0, 0, service->IOThread());
  }

  return NS_OK;
}

void SerialPortWritePump::OnPipeClosed(nsCOMPtr<nsIRunnable>&& aCallback) {
  RefPtr<SerialPlatformService> service = SerialPlatformService::GetInstance();
  MOZ_DIAGNOSTIC_ASSERT(service && service->IOThread()->IsOnCurrentThread());
  if (mPipeClosed) {
    aCallback->Run();
    return;
  }
  mClosedCallback = std::move(aCallback);
}

}  // namespace mozilla::dom::webserial
