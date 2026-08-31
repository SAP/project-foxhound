/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/TestTrialInterface.h"

#include "mozilla/dom/TestFunctionsBinding.h"

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE_0(TestTrialInterface)

JSObject* TestTrialInterface::WrapObject(JSContext* aCx,
                                         JS::Handle<JSObject*> aGivenProto) {
  return TestTrialInterface_Binding::Wrap(aCx, this, aGivenProto);
}

already_AddRefed<TestTrialInterface> TestTrialInterface::Constructor(
    const GlobalObject& aGlobalObject) {
  return MakeAndAddRef<TestTrialInterface>();
}

}  // namespace mozilla::dom
