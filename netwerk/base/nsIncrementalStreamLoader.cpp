/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
 * Modifications Copyright SAP SE. 2019-2021.  All rights reserved.
 */

#include "nsIncrementalStreamLoader.h"
#include "nsIInputStream.h"
#include "nsIChannel.h"
#include "nsError.h"
#include "mozilla/ProfilerLabels.h"

#include <limits>

nsIncrementalStreamLoader::nsIncrementalStreamLoader() = default;

NS_IMETHODIMP
nsIncrementalStreamLoader::Init(nsIIncrementalStreamLoaderObserver* observer) {
  NS_ENSURE_ARG_POINTER(observer);
  mObserver = observer;
  return NS_OK;
}

nsresult nsIncrementalStreamLoader::Create(REFNSIID aIID, void** aResult) {
  RefPtr<nsIncrementalStreamLoader> it = new nsIncrementalStreamLoader();
  return it->QueryInterface(aIID, aResult);
}

NS_IMPL_ISUPPORTS(nsIncrementalStreamLoader, nsIIncrementalStreamLoader,
                  nsIRequestObserver, nsIStreamListener,
                  nsIThreadRetargetableStreamListener)

NS_IMETHODIMP
nsIncrementalStreamLoader::GetNumBytesRead(uint32_t* aNumBytes) {
  *aNumBytes = mBytesRead;
  return NS_OK;
}

/* readonly attribute nsIRequest request; */
NS_IMETHODIMP
nsIncrementalStreamLoader::GetRequest(nsIRequest** aRequest) {
  *aRequest = do_AddRef(mRequest).take();
  return NS_OK;
}

NS_IMETHODIMP
nsIncrementalStreamLoader::OnStartRequest(nsIRequest* request) {
  nsCOMPtr<nsIChannel> chan(do_QueryInterface(request));
  if (chan) {
    int64_t contentLength = -1;
    chan->GetContentLength(&contentLength);
    if (contentLength >= 0) {
      // On 64bit platforms size of uint64_t coincides with the size of size_t,
      // so we want to compare with the minimum from size_t and int64_t.
      if (static_cast<uint64_t>(contentLength) >
          std::min(std::numeric_limits<size_t>::max(),
                   static_cast<size_t>(std::numeric_limits<int64_t>::max()))) {
        // Too big to fit into size_t, so let's bail.
        return NS_ERROR_OUT_OF_MEMORY;
      }

      // preallocate buffer
      if (!mData.initCapacity(contentLength)) {
        return NS_ERROR_OUT_OF_MEMORY;
      }
    }
  }
  return NS_OK;
}

NS_IMETHODIMP
nsIncrementalStreamLoader::OnStopRequest(nsIRequest* request,
                                         nsresult aStatus) {
  AUTO_PROFILER_LABEL("nsIncrementalStreamLoader::OnStopRequest", NETWORK);

  if (mObserver) {
    // provide nsIIncrementalStreamLoader::request during call to
    // OnStreamComplete
    mRequest = request;
    size_t length = mData.length();
    uint8_t* elems = mData.extractOrCopyRawBuffer();
    nsresult rv =
        mObserver->OnStreamComplete(this, mContext, aStatus, length, elems, mTaint);
    if (rv != NS_SUCCESS_ADOPTED_DATA) {
      // The observer didn't take ownership of the extracted data buffer, so
      // put it back into mData.
      mData.replaceRawBuffer(elems, length);
    } else {
        mTaint.clear();
    }
    // done.. cleanup
    ReleaseData();
    mRequest = nullptr;
    mObserver = nullptr;
  }
  return NS_OK;
}

nsresult nsIncrementalStreamLoader::WriteSegmentFun(
    void* closure, const char* fromSegment,
    uint32_t toOffset, uint32_t count, const StringTaint& taint, uint32_t* writeCount) {
  nsIncrementalStreamLoader* self = (nsIncrementalStreamLoader*)closure;

  const uint8_t* data = reinterpret_cast<const uint8_t*>(fromSegment);
  uint32_t consumedCount = 0;
  nsresult rv;
  if (self->mData.empty()) {
    // Shortcut when observer wants to keep the listener's buffer empty.
    rv = self->mObserver->OnIncrementalData(self, self->mContext, count, data,
                                            taint, &consumedCount);

    if (rv != NS_OK) {
      return rv;
    }

    if (consumedCount > count) {
      return NS_ERROR_INVALID_ARG;
    }

    if (consumedCount < count) {
      self->mTaint.concat(taint.safeSubTaint(consumedCount, count), self->mData.length());
      if (!self->mData.append(fromSegment + consumedCount,
                              count - consumedCount)) {
        self->mData.clearAndFree();
        return NS_ERROR_OUT_OF_MEMORY;
      }
    }
  } else {
    // We have some non-consumed data from previous OnIncrementalData call,
    // appending new data and reporting combined data.
    self->mTaint.concat(taint, self->mData.length());
    if (!self->mData.append(fromSegment, count)) {
      self->mData.clearAndFree();
      return NS_ERROR_OUT_OF_MEMORY;
    }
    size_t length = self->mData.length();
    uint32_t reportCount = length > UINT32_MAX ? UINT32_MAX : (uint32_t)length;
    uint8_t* elems = self->mData.extractOrCopyRawBuffer();

    rv = self->mObserver->OnIncrementalData(self, self->mContext, reportCount,
                                            elems, self->mTaint, &consumedCount);

    // We still own elems, freeing its memory when exiting scope.
    if (rv != NS_OK) {
      free(elems);
      return rv;
    }

    if (consumedCount > reportCount) {
      free(elems);
      return NS_ERROR_INVALID_ARG;
    }

    if (consumedCount == length) {
      free(elems);  // good case -- fully consumed data
    } else {
      // Adopting elems back (at least its portion).
      self->mData.replaceRawBuffer(elems, length);
      if (consumedCount > 0) {
        self->mData.erase(self->mData.begin() + consumedCount);
      }
      self->mTaint = self->mTaint.safeSubTaint(consumedCount, length);
    }
  }

  *writeCount = count;
  return NS_OK;
}

nsresult
nsIncrementalStreamLoader::WriteSegmentFunTaint(nsITaintawareInputStream *inStr,
                                                void *closure,
                                                const char *fromSegment,
                                                uint32_t toOffset,
                                                uint32_t count,
                                                const StringTaint& taint,
                                                uint32_t *writeCount)
{
    return WriteSegmentFun(closure, fromSegment, toOffset, count, taint, writeCount);
}

nsresult
nsIncrementalStreamLoader::WriteSegmentFunNoTaint(nsIInputStream *inStr,
                                                  void *closure,
                                                  const char *fromSegment,
                                                  uint32_t toOffset,
                                                  uint32_t count,
                                                  uint32_t *writeCount)
{
    return WriteSegmentFun(closure, fromSegment, toOffset, count, EmptyTaint, writeCount);
}

NS_IMETHODIMP
nsIncrementalStreamLoader::OnDataAvailable(nsIRequest* request,
                                           nsIInputStream* inStr,
                                           uint64_t sourceOffset,
                                           uint32_t count) {
  if (mObserver) {
    // provide nsIIncrementalStreamLoader::request during call to
    // OnStreamComplete
    mRequest = request;
  }

  // TaintFox: see if there's taint information available.
  nsCOMPtr<nsITaintawareInputStream> taintInputStream(do_QueryInterface(inStr));

#if (DEBUG_E2E_TAINTING)
  if (!taintInputStream)
    puts("!!!!! NO taint-aware input stream available in nsIncrementalStreamLoader::OnDataAvailable !!!!!");
  else
    puts("+++++ Taint-aware input stream available in nsIncrementalStreamLoader::OnDataAvailable +++++");
#endif

  uint32_t countRead;
  nsresult rv;
  if (taintInputStream) {
    rv = taintInputStream->TaintedReadSegments(WriteSegmentFunTaint, this, count, &countRead);
  } else {
    rv = inStr->ReadSegments(WriteSegmentFunNoTaint, this, count, &countRead);
  }
  mRequest = nullptr;
  NS_ENSURE_SUCCESS(rv, rv);
  mBytesRead += countRead;
  return rv;
}

void nsIncrementalStreamLoader::ReleaseData() { mData.clearAndFree(); }

NS_IMETHODIMP
nsIncrementalStreamLoader::CheckListenerChain() { return NS_OK; }

NS_IMETHODIMP
nsIncrementalStreamLoader::OnDataFinished(nsresult aStatus) { return NS_OK; }
