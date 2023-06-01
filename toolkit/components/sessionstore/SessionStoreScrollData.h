/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_SessionStoreScrollData_h
#define mozilla_dom_SessionStoreScrollData_h

#include "js/TypeDecls.h"
#include "mozilla/WeakPtr.h"
#include "nsPoint.h"
#include "nsTArray.h"
#include "nsWrapperCache.h"
#include "mozilla/dom/WindowGlobalParent.h"
#include "mozilla/dom/SessionStoreChangeListener.h"

namespace mozilla::dom {

class BrowsingContext;
class WindowGlobalParent;
class OwningByteStringOrObjectOrNull;
struct SessionStoreZoomData;

using SessionStoreZoom = mozilla::Tuple<float, uint32_t, uint32_t>;
using MaybeSessionStoreZoom =
    mozilla::Maybe<mozilla::Tuple<float, uint32_t, uint32_t>>;

class SessionStoreScrollData final : public nsISupports,
                                     public nsWrapperCache,
                                     public SupportsWeakPtr {
 public:
  using CollectedType = nsPoint;
  using LocationType = WeakPtr<SessionStoreScrollData>;
  using ChildrenArray = nsTArray<RefPtr<SessionStoreScrollData>>;

  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_WRAPPERCACHE_CLASS(SessionStoreScrollData)
  nsISupports* GetParentObject() const;
  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  void GetScroll(nsACString& aScroll) const;

  ChildrenArray& Children();

  void GetChildren(Nullable<ChildrenArray>& aChildren) const;

  void ToJSON(JSContext* aCx, JS::MutableHandle<JSObject*> aRetval);

  void Update(const CollectedType& aUpdate);

  void ClearCachedChildren();

  static bool HasData(const CollectedType& aPoint);

  bool IsEmpty() const;

 private:
  ~SessionStoreScrollData() = default;

  nsPoint mScroll;
  MaybeSessionStoreZoom mZoom;
  nsTArray<RefPtr<SessionStoreScrollData>> mChildren;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_SessionStoreScrollData_h
