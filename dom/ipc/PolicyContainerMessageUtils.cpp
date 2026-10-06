/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/PolicyContainerMessageUtils.h"

#include "mozilla/dom/PolicyContainer.h"
#include "mozilla/ipc/PBackgroundSharedTypes.h"

namespace IPC {

using namespace mozilla::ipc;

void ParamTraits<nsIPolicyContainer*>::Write(MessageWriter* aWriter,
                                             nsIPolicyContainer* aParam) {
  bool isNull = !aParam;
  WriteParam(aWriter, isNull);
  if (isNull) {
    return;
  }

  mozilla::ipc::PolicyContainerArgs args;
  PolicyContainer::ToArgs(PolicyContainer::Cast(aParam), args);

  WriteParam(aWriter, args);
}

bool ParamTraits<nsIPolicyContainer*>::Read(
    MessageReader* aReader, RefPtr<nsIPolicyContainer>* aResult) {
  bool isNull;
  if (!ReadParam(aReader, &isNull)) {
    return false;
  }

  if (isNull) {
    *aResult = nullptr;
    return true;
  }

  mozilla::ipc::PolicyContainerArgs args;
  if (!ReadParam(aReader, &args)) {
    return false;
  }

  RefPtr<PolicyContainer> policyContainer;
  PolicyContainer::FromArgs(args, nullptr, getter_AddRefs(policyContainer));
  NS_ENSURE_TRUE(policyContainer, false);

  *aResult = policyContainer.forget();

  return true;
}

}  // namespace IPC
