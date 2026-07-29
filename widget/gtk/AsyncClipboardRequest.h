/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_AsyncClipboardRequest_h
#define mozilla_AsyncClipboardRequest_h

#include "nsClipboard.h"
#include "mozilla/Maybe.h"
#include "mozilla/UniquePtr.h"

namespace mozilla::widget {

// An asynchronous clipboard request that we wait for synchronously by
// spinning the event loop.
struct DataRequest {
  explicit DataRequest(ClipboardDataType aDataType) : mDataType(aDataType) {}
  virtual ~DataRequest() = default;
  const ClipboardDataType mDataType;
  Maybe<ClipboardData> mData;
  bool mFailed = false;
};

class MOZ_STACK_CLASS AsyncClipboardRequest {
 public:
  UniquePtr<DataRequest> mDataRequest;

  // Returns whether the request has been answered already.
  bool HasCompleted() const { return mDataRequest->mData.isSome(); }
  bool HasFailed() const { return mDataRequest->mFailed; }

  // Takes the result from the current request if completed, or a
  // default-constructed data otherwise. The destructor will take care of
  // flagging the request as timed out in that case.
  ClipboardData TakeResult();

  // If completed, frees the request if needed. Otherwise, marks it as a timed
  // out request so that when it completes the Request object is properly
  // freed.
  virtual ~AsyncClipboardRequest();
};

class MOZ_STACK_CLASS AsyncGtkClipboardRequest : public AsyncClipboardRequest {
  // Heap-allocated object that we give GTK as a callback.

  static void OnDataReceived(GtkClipboard*, GtkSelectionData*, gpointer);
  static void OnTextReceived(GtkClipboard*, const gchar*, gpointer);

 public:
  // Launch a request for a particular GTK clipboard. The current status of the
  // request can be observed by calling HasCompleted() and TakeResult().
  AsyncGtkClipboardRequest(ClipboardDataType, int32_t aWhichClipboard,
                           const char* aMimeType = nullptr);
  // If completed, frees the request if needed. Otherwise, marks it as a timed
  // out request so that when it completes the Request object is properly
  // freed.
  virtual ~AsyncGtkClipboardRequest() = default;
};

#ifdef MOZ_WAYLAND
class DataOffer;
class MOZ_STACK_CLASS AsyncWaylandClipboardRequest
    : public AsyncClipboardRequest {
 public:
  AsyncWaylandClipboardRequest(ClipboardDataType aDataType,
                               RefPtr<DataOffer> aDataOffer,
                               const char* aMimeType = nullptr);
  virtual ~AsyncWaylandClipboardRequest() = default;
};
#endif

};  // namespace mozilla::widget

#endif
