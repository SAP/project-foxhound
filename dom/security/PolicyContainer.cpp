/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "PolicyContainer.h"

#include "mozilla/dom/IntegrityPolicy.h"
#include "mozilla/dom/nsCSPContext.h"
#include "mozilla/ipc/PBackgroundSharedTypes.h"
#include "nsIClassInfoImpl.h"
#include "nsIObjectInputStream.h"
#include "nsIObjectOutputStream.h"

using namespace mozilla;
using namespace mozilla::dom;

PolicyContainer::~PolicyContainer() = default;

constexpr static uint32_t kPolicyContainerSerializationVersion = 1;

NS_IMETHODIMP
PolicyContainer::Read(nsIObjectInputStream* aStream) {
  // Currently, we don't care about the version, but we might in the future.
  uint32_t version = 0;
  nsresult rv = aStream->Read32(&version);
  NS_ENSURE_SUCCESS(rv, rv);

  if (version != kPolicyContainerSerializationVersion) {
    return NS_ERROR_FAILURE;
  }

  auto ReadOptionalCSPObject = [aStream](nsISupports** aOutCSP) {
    bool nonnull = false;
    nsresult rv = aStream->ReadBoolean(&nonnull);
    NS_ENSURE_SUCCESS(rv, rv);

    if (nonnull) {
      nsCID cid;
      rv = aStream->ReadID(&cid);
      NS_ENSURE_SUCCESS(rv, rv);
      MOZ_ASSERT(cid.Equals(nsCSPContext::GetCID()),
                 "Expected nsCSPContext CID");

      nsIID iid;
      rv = aStream->ReadID(&iid);
      NS_ENSURE_SUCCESS(rv, rv);
      MOZ_ASSERT(iid.Equals(NS_GET_IID(nsIContentSecurityPolicy)),
                 "Expected nsIContentSecurityPolicy IID");

      RefPtr<nsCSPContext> csp = new nsCSPContext();
      rv = csp->PolicyContainerRead(aStream);
      NS_ENSURE_SUCCESS(rv, rv);
      csp.forget(aOutCSP);
    }

    return NS_OK;
  };

  nsCOMPtr<nsISupports> csp;
  rv = ReadOptionalCSPObject(getter_AddRefs(csp));
  NS_ENSURE_SUCCESS(rv, rv);
  mCSP = do_QueryInterface(csp);

  nsCOMPtr<nsISupports> integrityPolicy;
  rv = NS_ReadOptionalObject(aStream, true, getter_AddRefs(integrityPolicy));
  NS_ENSURE_SUCCESS(rv, rv);
  mIntegrityPolicy = do_QueryInterface(integrityPolicy);
  return NS_OK;
}

NS_IMETHODIMP
PolicyContainer::Write(nsIObjectOutputStream* aStream) {
  aStream->Write32(kPolicyContainerSerializationVersion);

  nsresult rv = NS_WriteOptionalCompoundObject(
      aStream, mCSP, NS_GET_IID(nsIContentSecurityPolicy), true);
  NS_ENSURE_SUCCESS(rv, rv);

  rv = NS_WriteOptionalCompoundObject(aStream, mIntegrityPolicy,
                                      NS_GET_IID(nsIIntegrityPolicy), true);
  NS_ENSURE_SUCCESS(rv, rv);

  return NS_OK;
}

void PolicyContainer::ToArgs(const PolicyContainer* aPolicy,
                             mozilla::ipc::PolicyContainerArgs& aArgs) {
  if (!aPolicy) {
    return;
  }

  if (aPolicy->mCSP) {
    mozilla::ipc::CSPInfo cspInfo;
    mozilla::ipc::CSPToCSPInfo(aPolicy->mCSP, &cspInfo);
    aArgs.csp() = Some(cspInfo);
  }

  if (aPolicy->mIntegrityPolicy) {
    mozilla::ipc::IntegrityPolicyArgs integrityPolicyArgs;
    IntegrityPolicy::ToArgs(IntegrityPolicy::Cast(aPolicy->mIntegrityPolicy),
                            integrityPolicyArgs);
    aArgs.integrityPolicy() = Some(integrityPolicyArgs);
  }
}

void PolicyContainer::FromArgs(const mozilla::ipc::PolicyContainerArgs& aArgs,
                               mozilla::dom::Document* aRequestingDocument,
                               PolicyContainer** aPolicy) {
  RefPtr<PolicyContainer> policy = new PolicyContainer();

  if (aArgs.csp().isSome()) {
    nsCOMPtr<nsIContentSecurityPolicy> csp =
        mozilla::ipc::CSPInfoToCSP(*aArgs.csp(), aRequestingDocument);
    policy->SetCSP(nsCSPContext::Cast(csp));
  }

  if (aArgs.integrityPolicy().isSome()) {
    RefPtr<dom::IntegrityPolicy> integrityPolicy = new dom::IntegrityPolicy();
    IntegrityPolicy::FromArgs(*aArgs.integrityPolicy(),
                              getter_AddRefs(integrityPolicy));
    policy->SetIntegrityPolicy(integrityPolicy);
  }

  policy.forget(aPolicy);
}

void PolicyContainer::InitFromOther(PolicyContainer* aOther) {
  if (!aOther) {
    return;
  }

  if (aOther->mCSP) {
    RefPtr<nsCSPContext> csp = new nsCSPContext();
    csp = new nsCSPContext();
    csp->InitFromOther(nsCSPContext::Cast(aOther->mCSP));
    mCSP = csp;
  }

  if (aOther->mIntegrityPolicy) {
    RefPtr<dom::IntegrityPolicy> integrityPolicy = new dom::IntegrityPolicy();
    integrityPolicy->InitFromOther(
        IntegrityPolicy::Cast(aOther->mIntegrityPolicy));
    mIntegrityPolicy = integrityPolicy;
  }
}

NS_IMETHODIMP PolicyContainer::InitFromCSP(nsIContentSecurityPolicy* aCSP) {
  SetCSP(aCSP);

  return NS_OK;
}

bool PolicyContainer::Equals(const PolicyContainer* aContainer,
                             const PolicyContainer* aOtherContainer) {
  // Do a quick pointer check first, also checks if both are null.
  if (aContainer == aOtherContainer) {
    return true;
  }

  // We checked if they were null above, so make sure one of them is not null.
  if (!aContainer || !aOtherContainer) {
    return false;
  }

  if (!nsCSPContext::Equals(aContainer->mCSP, aOtherContainer->mCSP)) {
    return false;
  }

  if (!IntegrityPolicy::Equals(
          IntegrityPolicy::Cast(aContainer->mIntegrityPolicy),
          IntegrityPolicy::Cast(aOtherContainer->mIntegrityPolicy))) {
    return false;
  }

  return true;
}

// == CSP ==
void PolicyContainer::SetCSP(nsIContentSecurityPolicy* aPolicy) {
  mCSP = aPolicy;
}

nsIContentSecurityPolicy* PolicyContainer::GetCSP() const { return mCSP; }

nsIContentSecurityPolicy* PolicyContainer::GetCSP(
    const nsIPolicyContainer* aPolicyContainer) {
  if (!aPolicyContainer) {
    return nullptr;
  }
  return PolicyContainer::Cast(aPolicyContainer)->GetCSP();
}

// == Integrity Policy ==
void PolicyContainer::SetIntegrityPolicy(nsIIntegrityPolicy* aPolicy) {
  mIntegrityPolicy = aPolicy;
}

nsIIntegrityPolicy* PolicyContainer::GetIntegrityPolicy() const {
  return mIntegrityPolicy;
}

nsIIntegrityPolicy* PolicyContainer::GetIntegrityPolicy(
    const nsIPolicyContainer* aPolicyContainer) {
  if (!aPolicyContainer) {
    return nullptr;
  }
  return PolicyContainer::Cast(aPolicyContainer)->GetIntegrityPolicy();
}

NS_IMETHODIMP PolicyContainer::GetCsp(nsIContentSecurityPolicy** aCsp) {
  nsCOMPtr<nsIContentSecurityPolicy> csp = mCSP;
  csp.forget(aCsp);
  return NS_OK;
}

NS_IMPL_CLASSINFO(PolicyContainer, nullptr, 0, NS_IPOLICYCONTAINER_IID)
NS_IMPL_ISUPPORTS_CI(PolicyContainer, nsIPolicyContainer, nsISerializable)
