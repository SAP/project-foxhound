/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef PolicyContainer_h_
#define PolicyContainer_h_

#include "nsCOMPtr.h"
#include "nsIContentSecurityPolicy.h"
#include "nsIIntegrityPolicy.h"
#include "nsIPolicyContainer.h"

namespace mozilla::ipc {
class PolicyContainerArgs;
}

namespace mozilla::dom {
class Document;
}

#define NS_POLICYCONTAINER_CONTRACTID "@mozilla.org/policycontainer;1"

class nsIContentSecurityPolicy;
class nsIIntegrityPolicy;

/**
  Implementation of
  https://html.spec.whatwg.org/multipage/browsers.html#policy-containers. Copied
  around the browser in the same way as CSP is copied, in fact, it replaces all
  the CSP inheritance code.
*/
class PolicyContainer : public nsIPolicyContainer {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSISERIALIZABLE
  NS_DECL_NSIPOLICYCONTAINER

  PolicyContainer() = default;

  static void ToArgs(const PolicyContainer* aPolicy,
                     mozilla::ipc::PolicyContainerArgs& aArgs);
  static void FromArgs(const mozilla::ipc::PolicyContainerArgs& aArgs,
                       mozilla::dom::Document* aRequestingDocument,
                       PolicyContainer** aPolicy);

  void InitFromOther(PolicyContainer* aOther);

  static const PolicyContainer* Cast(
      const nsIPolicyContainer* aPolicyContainer) {
    return static_cast<const PolicyContainer*>(aPolicyContainer);
  }

  static PolicyContainer* Cast(nsIPolicyContainer* aPolicyContainer) {
    return static_cast<PolicyContainer*>(aPolicyContainer);
  }

  static bool Equals(const PolicyContainer* aContainer,
                     const PolicyContainer* aOtherContainer);

  // == CSP ==
  nsIContentSecurityPolicy* GetCSP() const;
  void SetCSP(nsIContentSecurityPolicy* aPolicy);
  static nsIContentSecurityPolicy* GetCSP(
      const nsIPolicyContainer* aPolicyContainer);

  // == Integrity Policy ==
  nsIIntegrityPolicy* GetIntegrityPolicy() const;
  void SetIntegrityPolicy(nsIIntegrityPolicy* aPolicy);
  static nsIIntegrityPolicy* GetIntegrityPolicy(
      const nsIPolicyContainer* aPolicyContainer);

 private:
  nsCOMPtr<nsIContentSecurityPolicy> mCSP;
  nsCOMPtr<nsIIntegrityPolicy> mIntegrityPolicy;

 protected:
  virtual ~PolicyContainer();
};

#endif /* PolicyContainer_h_ */
