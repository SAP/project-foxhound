/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/*
 * Struct for holding fullscreen request.
 */

#ifndef mozilla_FullscreenRequest_h
#define mozilla_FullscreenRequest_h

#include "mozilla/LinkedList.h"
#include "mozilla/PendingFullscreenEvent.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/Element.h"
#include "mozilla/dom/ElementBinding.h"
#include "mozilla/dom/Promise.h"
#include "nsIScriptError.h"
#include "nsRefreshDriver.h"

namespace mozilla {

class FullscreenChange : public LinkedListElement<FullscreenChange> {
 public:
  FullscreenChange(const FullscreenChange&) = delete;

  enum ChangeType {
    eEnter,
    eExit,
  };

  ChangeType Type() const { return mType; }
  dom::Document* Document() const { return mDocument; }
  dom::Promise* GetPromise() const { return mPromise; }

  void MayResolvePromise() const {
    if (mPromise) {
      MOZ_ASSERT(mPromise->State() == Promise::PromiseState::Pending);
      mPromise->MaybeResolveWithUndefined();
    }
  }

  void MayRejectPromise(const nsACString& aMessage) {
    if (mPromise) {
      MOZ_ASSERT(mPromise->State() == Promise::PromiseState::Pending);
      mPromise->MaybeRejectWithTypeError(aMessage);
    }
  }
  template <int N>
  void MayRejectPromise(const char (&aMessage)[N]) {
    MayRejectPromise(nsLiteralCString(aMessage));
  }

 protected:
  typedef dom::Promise Promise;

  FullscreenChange(ChangeType aType, dom::Document* aDocument,
                   already_AddRefed<Promise> aPromise)
      : mType(aType), mDocument(aDocument), mPromise(aPromise) {
    MOZ_ASSERT(aDocument);
  }

  ~FullscreenChange() {
    MOZ_ASSERT_IF(mPromise,
                  mPromise->State() != Promise::PromiseState::Pending);
  }

 private:
  ChangeType mType;
  nsCOMPtr<dom::Document> mDocument;
  RefPtr<Promise> mPromise;
};

class FullscreenRequest : public FullscreenChange {
 public:
  static const ChangeType kType = eEnter;

  static UniquePtr<FullscreenRequest> Create(
      dom::Element* aElement,
      dom::FullscreenKeyboardLock aFullscreenKeyboardLock,
      dom::CallerType aCallerType, ErrorResult& aRv) {
    RefPtr<Promise> promise =
        Promise::Create(aElement->GetRelevantGlobal(), aRv);
    return WrapUnique(new FullscreenRequest(aElement, promise.forget(),
                                            aCallerType, true,
                                            aFullscreenKeyboardLock));
  }

  static UniquePtr<FullscreenRequest> CreateForRemote(
      dom::Element* aElement, bool aFullscreenKeyboardLockEnabled) {
    return WrapUnique(new FullscreenRequest(
        aElement, nullptr, dom::CallerType::NonSystem, false,
        aFullscreenKeyboardLockEnabled ? dom::FullscreenKeyboardLock::Browser
                                       : dom::FullscreenKeyboardLock::None));
  }

  MOZ_COUNTED_DTOR(FullscreenRequest)

  dom::Element* Element() const { return mElement; }

  // Reject the fullscreen request with the given reason.
  // It will dispatch the fullscreenerror event.
  void Reject(const char* aReason) {
    Document()->AddPendingFullscreenEvent(MakeUnique<PendingFullscreenEvent>(
        FullscreenEventType::Error, mElement));
    MayRejectPromise("Fullscreen request denied");
    nsContentUtils::ReportToConsole(nsIScriptError::warningFlag, "DOM"_ns,
                                    Document(), PropertiesFile::DOM_PROPERTIES,
                                    aReason);
  }

  void SetShouldDispatchKeyboardLockEvent(bool aValue) {
    mDispatchKeyboardLockEvent = aValue;
  }
  bool ShouldDispatchKeyboardLockEvent() const {
    return mDispatchKeyboardLockEvent;
  }

 private:
  RefPtr<dom::Element> mElement;
  bool mDispatchKeyboardLockEvent = false;

 public:
  // This value should be true if the fullscreen request is
  // originated from system code.
  const dom::CallerType mCallerType;
  // This value denotes whether we should trigger a NewOrigin event if
  // requesting fullscreen in its document causes the origin which is
  // fullscreen to change. We may want *not* to trigger that event if
  // we're calling RequestFullscreen() as part of a continuation of a
  // request in a subdocument in different process, whereupon the caller
  // need to send some notification itself with the real origin.
  const bool mShouldNotifyNewOrigin;

  const dom::FullscreenKeyboardLock mFullscreenKeyboardLock;

 private:
  FullscreenRequest(dom::Element* aElement,
                    already_AddRefed<dom::Promise> aPromise,
                    dom::CallerType aCallerType, bool aShouldNotifyNewOrigin,
                    dom::FullscreenKeyboardLock aFullscreenKeyboardLock)
      : FullscreenChange(kType, aElement->OwnerDoc(), std::move(aPromise)),
        mElement(aElement),
        mCallerType(aCallerType),
        mShouldNotifyNewOrigin(aShouldNotifyNewOrigin),
        mFullscreenKeyboardLock(aFullscreenKeyboardLock) {
    MOZ_COUNT_CTOR(FullscreenRequest);
  }
};

class FullscreenExit : public FullscreenChange {
 public:
  static const ChangeType kType = eExit;

  static UniquePtr<FullscreenExit> Create(dom::Document* aDoc,
                                          ErrorResult& aRv) {
    RefPtr<Promise> promise = Promise::Create(aDoc->GetRelevantGlobal(), aRv);
    return WrapUnique(new FullscreenExit(aDoc, promise.forget()));
  }

  static UniquePtr<FullscreenExit> CreateForRemote(dom::Document* aDoc) {
    return WrapUnique(new FullscreenExit(aDoc, nullptr));
  }

  MOZ_COUNTED_DTOR(FullscreenExit)

 private:
  FullscreenExit(dom::Document* aDoc, already_AddRefed<Promise> aPromise)
      : FullscreenChange(kType, aDoc, std::move(aPromise)) {
    MOZ_COUNT_CTOR(FullscreenExit);
  }
};

}  // namespace mozilla

#endif  // mozilla_FullscreenRequest_h
