/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
 * Modifications Copyright SAP SE. 2019-2021.  All rights reserved.
 */

#include <stdlib.h>
#include "mozilla/Logging.h"

#include "mozilla/Maybe.h"
#include "mozilla/Mutex.h"
#include "mozilla/Attributes.h"
#include "mozilla/IntegerPrintfMacros.h"
#include "nsIInputStreamTee.h"
#include "nsIInputStream.h"
#include "nsIOutputStream.h"
#include "nsCOMPtr.h"
#include "nsIEventTarget.h"
#include "nsThreadUtils.h"
#include "nsITaintawareInputStream.h"

using namespace mozilla;

#ifdef LOG
#  undef LOG
#endif

static LazyLogModule sTeeLog("nsInputStreamTee");
#define LOG(args) MOZ_LOG(sTeeLog, mozilla::LogLevel::Debug, args)

// Foxhound: Tee input streams need to be taint aware since the underlying input
// stream might contain taint information.
class nsInputStreamTee final : public nsIInputStreamTee
                             , public nsITaintawareInputStream
{
 public:
  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSIINPUTSTREAM
  NS_DECL_NSIINPUTSTREAMTEE
  NS_DECL_NSITAINTAWAREINPUTSTREAM

  nsInputStreamTee();
  bool SinkIsValid();
  void InvalidateSink();

 private:
  ~nsInputStreamTee() = default;

  nsresult TeeSegment(const char* aBuf, const StringTaint& aTaint, uint32_t aCount);

  static nsresult WriteSegmentFun(nsIInputStream*, void*, const char*, uint32_t,
                                  uint32_t, uint32_t*);

  static nsresult WriteTaintedSegmentFun(nsITaintawareInputStream*, void*, const char*,
                                          uint32_t, uint32_t, const StringTaint&, uint32_t*);

  bool SourceIsTaintAware() const;

 private:
  nsCOMPtr<nsIInputStream> mSource;
  nsCOMPtr<nsIOutputStream> mSink;
  nsCOMPtr<nsIEventTarget> mEventTarget;
  nsWriteSegmentFun mWriter;  // for implementing ReadSegments
  nsWriteTaintedSegmentFun  mTaintWriter;  // for implementing TaintedReadSegments
  void* mClosure;             // for implementing ReadSegments
  Maybe<Mutex> mLock;         // synchronize access to mSinkIsValid
  bool mSinkIsValid;          // False if TeeWriteEvent fails
};

class nsInputStreamTeeWriteEvent : public Runnable {
 public:
  // aTee's lock is held across construction of this object
  nsInputStreamTeeWriteEvent(const char* aBuf, uint32_t aCount,
                             nsIOutputStream* aSink, nsInputStreamTee* aTee)
      : mozilla::Runnable("nsInputStreamTeeWriteEvent") {
    // copy the buffer - will be free'd by dtor
    mBuf = (char*)malloc(aCount);
    if (mBuf) {
      memcpy(mBuf, (char*)aBuf, aCount);
    }
    mCount = aCount;
    mSink = aSink;
    bool isNonBlocking;
    mSink->IsNonBlocking(&isNonBlocking);
    NS_ASSERTION(isNonBlocking == false, "mSink is nonblocking");
    mTee = aTee;
  }

  NS_IMETHOD Run() override {
    if (!mBuf) {
      NS_WARNING(
          "nsInputStreamTeeWriteEvent::Run() "
          "memory not allocated\n");
      return NS_OK;
    }
    MOZ_ASSERT(mSink, "mSink is null!");

    //  The output stream could have been invalidated between when
    //  this event was dispatched and now, so check before writing.
    if (!mTee->SinkIsValid()) {
      return NS_OK;
    }

    LOG(
        ("nsInputStreamTeeWriteEvent::Run() [%p]"
         "will write %u bytes to %p\n",
         this, mCount, mSink.get()));

    uint32_t totalBytesWritten = 0;
    while (mCount) {
      nsresult rv;
      uint32_t bytesWritten = 0;
      rv = mSink->Write(mBuf + totalBytesWritten, mCount, &bytesWritten);
      if (NS_FAILED(rv)) {
        LOG(("nsInputStreamTeeWriteEvent::Run[%p] error %" PRIx32 " in writing",
             this, static_cast<uint32_t>(rv)));
        mTee->InvalidateSink();
        break;
      }
      totalBytesWritten += bytesWritten;
      NS_ASSERTION(bytesWritten <= mCount, "wrote too much");
      mCount -= bytesWritten;
    }
    return NS_OK;
  }

 protected:
  virtual ~nsInputStreamTeeWriteEvent() {
    if (mBuf) {
      free(mBuf);
    }
    mBuf = nullptr;
  }

 private:
  char* mBuf;
  uint32_t mCount;
  nsCOMPtr<nsIOutputStream> mSink;
  // back pointer to the tee that created this runnable
  RefPtr<nsInputStreamTee> mTee;
};

nsInputStreamTee::nsInputStreamTee()
    : mWriter(nullptr), mClosure(nullptr), mSinkIsValid(true) {}

bool nsInputStreamTee::SinkIsValid() {
  MutexAutoLock lock(*mLock);
  return mSinkIsValid;
}

void nsInputStreamTee::InvalidateSink() {
  MutexAutoLock lock(*mLock);
  mSinkIsValid = false;
}

nsresult nsInputStreamTee::TeeSegment(const char* aBuf, const StringTaint& aTaint, uint32_t aCount) {
  // Foxhound: TODO propagate taint here
  if (!mSink) {
    return NS_OK;  // nothing to do
  }
  if (mLock) {  // asynchronous case
    NS_ASSERTION(mEventTarget, "mEventTarget is null, mLock is not null.");
    if (!SinkIsValid()) {
      return NS_OK;  // nothing to do
    }
    nsCOMPtr<nsIRunnable> event =
        new nsInputStreamTeeWriteEvent(aBuf, aCount, mSink, this);
    LOG(("nsInputStreamTee::TeeSegment [%p] dispatching write %u bytes\n", this,
         aCount));
    return mEventTarget->Dispatch(event, NS_DISPATCH_NORMAL);
  } else {  // synchronous case
    NS_ASSERTION(!mEventTarget, "mEventTarget is not null, mLock is null.");
    nsresult rv;
    uint32_t totalBytesWritten = 0;
    while (aCount) {
      uint32_t bytesWritten = 0;
      rv = mSink->Write(aBuf + totalBytesWritten, aCount, &bytesWritten);
      if (NS_FAILED(rv)) {
        // ok, this is not a fatal error... just drop our reference to mSink
        // and continue on as if nothing happened.
        NS_WARNING("Write failed (non-fatal)");
        // catch possible misuse of the input stream tee
        NS_ASSERTION(rv != NS_BASE_STREAM_WOULD_BLOCK,
                     "sink must be a blocking stream");
        mSink = nullptr;
        break;
      }
      totalBytesWritten += bytesWritten;
      NS_ASSERTION(bytesWritten <= aCount, "wrote too much");
      aCount -= bytesWritten;
    }
    return NS_OK;
  }
}

nsresult nsInputStreamTee::WriteSegmentFun(nsIInputStream* aIn, void* aClosure,
                                           const char* aFromSegment,
                                           uint32_t aOffset, uint32_t aCount,
                                           uint32_t* aWriteCount) {
  nsInputStreamTee* tee = reinterpret_cast<nsInputStreamTee*>(aClosure);
  nsresult rv = tee->mWriter(aIn, tee->mClosure, aFromSegment, aOffset, aCount,
                             aWriteCount);
  if (NS_FAILED(rv) || (*aWriteCount == 0)) {
    NS_ASSERTION((NS_FAILED(rv) ? (*aWriteCount == 0) : true),
                 "writer returned an error with non-zero writeCount");
    return rv;
  }

  return tee->TeeSegment(aFromSegment, EmptyTaint, *aWriteCount);
}

nsresult
nsInputStreamTee::WriteTaintedSegmentFun(nsITaintawareInputStream* aIn, void* aClosure,
                                         const char* aFromSegment, uint32_t aOffset,
                                         uint32_t aCount, const StringTaint& aTaint, uint32_t* aWriteCount)
{
  nsInputStreamTee* tee = reinterpret_cast<nsInputStreamTee*>(aClosure);
  nsresult rv = tee->mTaintWriter(aIn, tee->mClosure, aFromSegment, aOffset,
                                  aCount, aTaint, aWriteCount);
  if (NS_FAILED(rv) || (*aWriteCount == 0)) {
    NS_ASSERTION((NS_FAILED(rv) ? (*aWriteCount == 0) : true),
                 "writer returned an error with non-zero writeCount");
    return rv;
  }

  return tee->TeeSegment(aFromSegment, aTaint, *aWriteCount);
}

bool nsInputStreamTee::SourceIsTaintAware() const
{
  nsCOMPtr<nsITaintawareInputStream> source(do_QueryInterface(mSource));
  return !!source;
}

//NS_IMPL_ISUPPORTS(nsInputStreamTee, nsIInputStreamTee, nsIInputStream)

// Foxhound: Changed nsISupports implementation to support conditional QI to
// nsITaintawareInputStream only if the source stream is taint aware.
NS_IMPL_ADDREF(nsInputStreamTee)
NS_IMPL_RELEASE(nsInputStreamTee)
NS_INTERFACE_MAP_BEGIN(nsInputStreamTee)
  NS_INTERFACE_MAP_ENTRY_AMBIGUOUS(nsISupports, nsIInputStreamTee)
  NS_INTERFACE_MAP_ENTRY(nsIInputStreamTee)
  NS_INTERFACE_MAP_ENTRY(nsIInputStream)
  NS_INTERFACE_MAP_ENTRY_CONDITIONAL(nsITaintawareInputStream, SourceIsTaintAware())
NS_INTERFACE_MAP_END

NS_IMETHODIMP
nsInputStreamTee::Close() {
  if (NS_WARN_IF(!mSource)) {
    return NS_ERROR_NOT_INITIALIZED;
  }
  nsresult rv = mSource->Close();
  mSource = nullptr;
  mSink = nullptr;
  return rv;
}

NS_IMETHODIMP
nsInputStreamTee::Available(uint64_t* aAvail) {
  if (NS_WARN_IF(!mSource)) {
    return NS_ERROR_NOT_INITIALIZED;
  }
  return mSource->Available(aAvail);
}

NS_IMETHODIMP
nsInputStreamTee::StreamStatus() {
  if (NS_WARN_IF(!mSource)) {
    return NS_ERROR_NOT_INITIALIZED;
  }
  return mSource->StreamStatus();
}

NS_IMETHODIMP
nsInputStreamTee::Read(char* aBuf, uint32_t aCount, uint32_t* aBytesRead) {
  if (NS_WARN_IF(!mSource)) {
    return NS_ERROR_NOT_INITIALIZED;
  }

  nsresult rv = mSource->Read(aBuf, aCount, aBytesRead);
  if (NS_FAILED(rv) || (*aBytesRead == 0)) {
    return rv;
  }

  return TeeSegment(aBuf, EmptyTaint, *aBytesRead);
}

NS_IMETHODIMP
nsInputStreamTee::ReadSegments(nsWriteSegmentFun aWriter, void* aClosure,
                               uint32_t aCount, uint32_t* aBytesRead) {
  if (NS_WARN_IF(!mSource)) {
    return NS_ERROR_NOT_INITIALIZED;
  }

  mWriter = aWriter;
  mClosure = aClosure;

  return mSource->ReadSegments(WriteSegmentFun, this, aCount, aBytesRead);
}

NS_IMETHODIMP
nsInputStreamTee::IsNonBlocking(bool* aResult) {
  if (NS_WARN_IF(!mSource)) {
    return NS_ERROR_NOT_INITIALIZED;
  }
  return mSource->IsNonBlocking(aResult);
}

NS_IMETHODIMP
nsInputStreamTee::SetSource(nsIInputStream* aSource) {
  mSource = aSource;
  return NS_OK;
}

NS_IMETHODIMP
nsInputStreamTee::GetSource(nsIInputStream** aSource) {
  NS_IF_ADDREF(*aSource = mSource);
  return NS_OK;
}

NS_IMETHODIMP
nsInputStreamTee::SetSink(nsIOutputStream* aSink) {
#ifdef DEBUG
  if (aSink) {
    bool nonBlocking;
    nsresult rv = aSink->IsNonBlocking(&nonBlocking);
    if (NS_FAILED(rv) || nonBlocking) {
      NS_ERROR("aSink should be a blocking stream");
    }
  }
#endif
  mSink = aSink;
  return NS_OK;
}

NS_IMETHODIMP
nsInputStreamTee::GetSink(nsIOutputStream** aSink) {
  NS_IF_ADDREF(*aSink = mSink);
  return NS_OK;
}

NS_IMETHODIMP
nsInputStreamTee::SetEventTarget(nsIEventTarget* aEventTarget) {
  mEventTarget = aEventTarget;
  if (mEventTarget) {
    // Only need synchronization if this is an async tee
    mLock.emplace("nsInputStreamTee.mLock");
  }
  return NS_OK;
}

NS_IMETHODIMP
nsInputStreamTee::GetEventTarget(nsIEventTarget** aEventTarget) {
  NS_IF_ADDREF(*aEventTarget = mEventTarget);
  return NS_OK;
}

NS_IMETHODIMP
nsInputStreamTee::TaintedReadSegments(nsWriteTaintedSegmentFun aWriter,
                                      void* aClosure,
                                      uint32_t aCount,
                                      uint32_t* aBytesRead)
{
  if (NS_WARN_IF(!mSource)) {
    return NS_ERROR_NOT_INITIALIZED;
  }

  nsCOMPtr<nsITaintawareInputStream> source(do_QueryInterface(mSource));
  MOZ_ASSERT(source, "must have a valid taint-aware source here");

  mTaintWriter = aWriter;
  mClosure = aClosure;

  return source->TaintedReadSegments(WriteTaintedSegmentFun, this, aCount, aBytesRead);
}

// Foxhound
NS_IMETHODIMP
nsInputStreamTee::TaintedRead(char* aBuf, uint32_t aCount, StringTaint* aTaint, uint32_t* aBytesRead)
{
  if (NS_WARN_IF(!mSource)) {
    return NS_ERROR_NOT_INITIALIZED;
  }

  nsCOMPtr<nsITaintawareInputStream> source(do_QueryInterface(mSource));
  MOZ_ASSERT(source, "must have a valid taint-aware source here");

  nsresult rv = source->TaintedRead(aBuf, aCount, aTaint, aBytesRead);
  if (NS_FAILED(rv) || (*aBytesRead == 0)) {
    return rv;
  }

  return TeeSegment(aBuf, *aTaint, *aBytesRead);
}

nsresult NS_NewInputStreamTeeAsync(nsIInputStream** aResult,
                                   nsIInputStream* aSource,
                                   nsIOutputStream* aSink,
                                   nsIEventTarget* aEventTarget) {
  nsresult rv;

  nsCOMPtr<nsIInputStreamTee> tee = new nsInputStreamTee();
  rv = tee->SetSource(aSource);
  if (NS_FAILED(rv)) {
    return rv;
  }

  rv = tee->SetSink(aSink);
  if (NS_FAILED(rv)) {
    return rv;
  }

  rv = tee->SetEventTarget(aEventTarget);
  if (NS_FAILED(rv)) {
    return rv;
  }

  tee.forget(aResult);
  return rv;
}

nsresult NS_NewInputStreamTee(nsIInputStream** aResult, nsIInputStream* aSource,
                              nsIOutputStream* aSink) {
  return NS_NewInputStreamTeeAsync(aResult, aSource, aSink, nullptr);
}

#undef LOG
