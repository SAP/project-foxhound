/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_UnderlyingSourceCallbackHelpers_h
#define mozilla_dom_UnderlyingSourceCallbackHelpers_h

#include "mozilla/HoldDropJSObjects.h"
#include "mozilla/dom/Promise.h"
#include "mozilla/dom/UnderlyingSourceBinding.h"
#include "nsISupports.h"
#include "nsISupportsImpl.h"

/* Since the streams specification has native descriptions of some callbacks
 * (i.e. described in prose, rather than provided by user code), we need to be
 * able to pass around native callbacks. To handle this, we define polymorphic
 * classes That cover the difference between native callback and user-provided.
 *
 * The Streams specification wants us to invoke these callbacks, run through
 * WebIDL as if they were methods. So we have to preserve the underlying object
 * to use as the This value on invocation.
 */
namespace mozilla::dom {

class BodyStreamHolder;
class ReadableStreamController;

class UnderlyingSourceAlgorithmsBase : public nsISupports {
 public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_CLASS(UnderlyingSourceAlgorithmsBase)

  MOZ_CAN_RUN_SCRIPT virtual void StartCallback(
      JSContext* aCx, ReadableStreamController& aController,
      JS::MutableHandle<JS::Value> aRetVal, ErrorResult& aRv) = 0;

  // A promise-returning algorithm that pulls data from the underlying byte
  // source
  MOZ_CAN_RUN_SCRIPT virtual already_AddRefed<Promise> PullCallback(
      JSContext* aCx, ReadableStreamController& aController,
      ErrorResult& aRv) = 0;

  // A promise-returning algorithm, taking one argument (the cancel reason),
  // which communicates a requested cancelation to the underlying byte source
  MOZ_CAN_RUN_SCRIPT virtual already_AddRefed<Promise> CancelCallback(
      JSContext* aCx, const Optional<JS::Handle<JS::Value>>& aReason,
      ErrorResult& aRv) = 0;

  // Implement this when you need to release underlying resources immediately
  // from closed(canceled)/errored streams, without waiting for GC.
  virtual void ReleaseObjects() {}

  // Fetch wants to special-case BodyStream-based streams
  virtual BodyStreamHolder* GetBodyStreamHolder() { return nullptr; }

  // https://streams.spec.whatwg.org/#other-specs-rs-create
  // By "native" we mean "instances initialized via the above set up or set up
  // with byte reading support algorithms (not, e.g., on web-developer-created
  // instances)"
  virtual bool IsNative() { return true; }

 protected:
  virtual ~UnderlyingSourceAlgorithmsBase() = default;
};

class UnderlyingSourceAlgorithms final : public UnderlyingSourceAlgorithmsBase {
 public:
  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS_INHERITED(
      UnderlyingSourceAlgorithms, UnderlyingSourceAlgorithmsBase)

  UnderlyingSourceAlgorithms(nsIGlobalObject* aGlobal,
                             JS::Handle<JSObject*> aUnderlyingSource,
                             UnderlyingSource& aUnderlyingSourceDict)
      : mGlobal(aGlobal), mUnderlyingSource(aUnderlyingSource) {
    // Step 6. (implicit Step 2.)
    if (aUnderlyingSourceDict.mStart.WasPassed()) {
      mStartCallback = aUnderlyingSourceDict.mStart.Value();
    }

    // Step 7. (implicit Step 3.)
    if (aUnderlyingSourceDict.mPull.WasPassed()) {
      mPullCallback = aUnderlyingSourceDict.mPull.Value();
    }

    // Step 8. (implicit Step 4.)
    if (aUnderlyingSourceDict.mCancel.WasPassed()) {
      mCancelCallback = aUnderlyingSourceDict.mCancel.Value();
    }

    mozilla::HoldJSObjects(this);
  };

  MOZ_CAN_RUN_SCRIPT void StartCallback(JSContext* aCx,
                                        ReadableStreamController& aController,
                                        JS::MutableHandle<JS::Value> aRetVal,
                                        ErrorResult& aRv) override;

  MOZ_CAN_RUN_SCRIPT already_AddRefed<Promise> PullCallback(
      JSContext* aCx, ReadableStreamController& aController,
      ErrorResult& aRv) override;

  MOZ_CAN_RUN_SCRIPT already_AddRefed<Promise> CancelCallback(
      JSContext* aCx, const Optional<JS::Handle<JS::Value>>& aReason,
      ErrorResult& aRv) override;

  bool IsNative() override { return false; }

 protected:
  ~UnderlyingSourceAlgorithms() override { mozilla::DropJSObjects(this); };

 private:
  // Virtually const, but are cycle collected
  nsCOMPtr<nsIGlobalObject> mGlobal;
  JS::Heap<JSObject*> mUnderlyingSource;
  MOZ_KNOWN_LIVE RefPtr<UnderlyingSourceStartCallback> mStartCallback;
  MOZ_KNOWN_LIVE RefPtr<UnderlyingSourcePullCallback> mPullCallback;
  MOZ_KNOWN_LIVE RefPtr<UnderlyingSourceCancelCallback> mCancelCallback;
};

// https://streams.spec.whatwg.org/#readablestream-set-up
// https://streams.spec.whatwg.org/#readablestream-set-up-with-byte-reading-support
// Wrappers defined by the "Set up" methods in the spec. This helps you just
// return nullptr when an error occurred as this wrapper converts it to a
// rejected promise.
// Note that StartCallback is only for JS consumers to access
// the controller, and thus is no-op here since native consumers can call
// `EnqueueNative()` etc. without direct controller access.
class UnderlyingSourceAlgorithmsWrapper
    : public UnderlyingSourceAlgorithmsBase {
  void StartCallback(JSContext*, ReadableStreamController&,
                     JS::MutableHandle<JS::Value> aRetVal, ErrorResult&) final;

  MOZ_CAN_RUN_SCRIPT already_AddRefed<Promise> PullCallback(
      JSContext* aCx, ReadableStreamController& aController,
      ErrorResult& aRv) final;

  MOZ_CAN_RUN_SCRIPT already_AddRefed<Promise> CancelCallback(
      JSContext* aCx, const Optional<JS::Handle<JS::Value>>& aReason,
      ErrorResult& aRv) final;

  virtual already_AddRefed<Promise> PullCallbackImpl(
      JSContext* aCx, ReadableStreamController& aController, ErrorResult& aRv) {
    // pullAlgorithm is optional, return null by default
    return nullptr;
  }

  virtual already_AddRefed<Promise> CancelCallbackImpl(
      JSContext* aCx, const Optional<JS::Handle<JS::Value>>& aReason,
      ErrorResult& aRv) {
    // cancelAlgorithm is optional, return null by default
    return nullptr;
  }
};

}  // namespace mozilla::dom

#endif
