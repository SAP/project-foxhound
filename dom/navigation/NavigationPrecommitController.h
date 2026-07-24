/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_NAVIGATIONPRECOMMITCONTROLLER_H_
#define DOM_NAVIGATIONPRECOMMITCONTROLLER_H_

#include "js/TypeDecls.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "nsCycleCollectionParticipant.h"
#include "nsWrapperCache.h"

namespace mozilla::dom {

struct NavigationNavigateOptions;
class NavigateEvent;
class NavigationInterceptHandler;
}  // namespace mozilla::dom

class nsIGlobalObject;

namespace mozilla::dom {

class NavigationPrecommitController final : public nsISupports,
                                            public nsWrapperCache {
 public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_WRAPPERCACHE_CLASS(NavigationPrecommitController)

 public:
  NavigationPrecommitController(NavigateEvent* aEvent,
                                nsIGlobalObject* aGlobalObject);

 protected:
  ~NavigationPrecommitController();

 public:
  nsIGlobalObject* GetParentObject() const;

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  void Redirect(JSContext* aCx, const nsAString& aUrl,
                const NavigationNavigateOptions& aOptions, ErrorResult& aRv);

  void AddHandler(NavigationInterceptHandler& aHandler, ErrorResult& aRv);

 private:
  nsCOMPtr<nsIGlobalObject> mGlobalObject;

  RefPtr<NavigateEvent> mEvent;
};

}  // namespace mozilla::dom

#endif  // DOM_NAVIGATIONPRECOMMITCONTROLLER_H_
