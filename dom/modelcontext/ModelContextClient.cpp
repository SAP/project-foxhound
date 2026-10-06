/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/ModelContextClient.h"

#include "mozilla/StaticPrefs_dom.h"
#include "mozilla/dom/ModelContextBinding.h"
#include "mozilla/dom/Promise.h"
#include "nsPIDOMWindow.h"

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION_CLASS(ModelContextClient)

NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN(ModelContextClient)
  NS_IMPL_CYCLE_COLLECTION_UNLINK_PRESERVED_WRAPPER
  NS_IMPL_CYCLE_COLLECTION_UNLINK(mWindow)
NS_IMPL_CYCLE_COLLECTION_UNLINK_END

NS_IMPL_CYCLE_COLLECTION_TRAVERSE_BEGIN(ModelContextClient)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE(mWindow)
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_END

NS_IMPL_CYCLE_COLLECTION_TRACE_BEGIN(ModelContextClient)
  NS_IMPL_CYCLE_COLLECTION_TRACE_PRESERVED_WRAPPER
NS_IMPL_CYCLE_COLLECTION_TRACE_END

NS_IMPL_CYCLE_COLLECTING_ADDREF(ModelContextClient)
NS_IMPL_CYCLE_COLLECTING_RELEASE(ModelContextClient)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(ModelContextClient)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

ModelContextClient::ModelContextClient(nsPIDOMWindowInner* aWindow)
    : mWindow(aWindow) {
  MOZ_ASSERT(aWindow);
}

JSObject* ModelContextClient::WrapObject(JSContext* aCx,
                                         JS::Handle<JSObject*> aGivenProto) {
  return ModelContextClient_Binding::Wrap(aCx, this, aGivenProto);
}

already_AddRefed<Promise> ModelContextClient::RequestUserInteraction(
    UserInteractionCallback& aCallback, ErrorResult& aRv) {
  if (StaticPrefs::dom_modelcontext_testing_enabled()) {
    return aCallback.Call(aRv);
  }

  nsCOMPtr<nsIGlobalObject> global = do_QueryInterface(mWindow);
  RefPtr<Promise> promise = Promise::Create(global, aRv);
  if (aRv.Failed()) {
    return nullptr;
  }
  promise->MaybeRejectWithNotSupportedError(
      "requestUserInteraction is not yet supported"_ns);
  return promise.forget();
}

}  // namespace mozilla::dom
