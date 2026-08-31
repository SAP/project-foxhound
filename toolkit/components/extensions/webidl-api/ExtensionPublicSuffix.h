/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_extensions_ExtensionPublicSuffix_h
#define mozilla_extensions_ExtensionPublicSuffix_h

#include "js/TypeDecls.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "nsCycleCollectionParticipant.h"
#include "nsCOMPtr.h"
#include "nsISupports.h"
#include "nsWrapperCache.h"

#include "ExtensionAPIBase.h"
#include "ExtensionBrowser.h"

class nsIGlobalObject;

namespace mozilla::extensions {

class ExtensionPublicSuffix final : public nsISupports,
                                    public nsWrapperCache,
                                    public ExtensionAPINamespace {
 public:
  ExtensionPublicSuffix(nsIGlobalObject* aGlobal,
                        ExtensionBrowser* aExtensionBrowser);

  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_WRAPPERCACHE_CLASS(ExtensionPublicSuffix)

  // ExtensionAPIBase methods
  nsIGlobalObject* GetGlobalObject() const override { return mGlobal; }

  ExtensionBrowser* GetExtensionBrowser() const override {
    return mExtensionBrowser;
  }

  nsString GetAPINamespace() const override { return u"publicSuffix"_ns; }

  // nsWrapperCache interface methods
  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // DOM bindings methods
  static bool IsAllowed(JSContext* aCx, JSObject* aGlobal);

  nsIGlobalObject* GetParentObject() const;

 private:
  ~ExtensionPublicSuffix() = default;

  nsCOMPtr<nsIGlobalObject> mGlobal;
  RefPtr<ExtensionBrowser> mExtensionBrowser;
};

}  // namespace mozilla::extensions

#endif  // mozilla_extensions_ExtensionPublicSuffix_h
