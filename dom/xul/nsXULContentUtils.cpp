/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*

  A package of routines shared by the XUL content code.

 */

#include "nsXULContentUtils.h"

#include "mozilla/dom/Document.h"
#include "mozilla/dom/Element.h"
#include "mozilla/intl/Collator.h"
#include "mozilla/intl/LocaleService.h"
#include "nsCOMPtr.h"
#include "nsComponentManagerUtils.h"
#include "nsIContent.h"
#include "nsString.h"

using namespace mozilla;

nsresult nsXULContentUtils::FindChildByTag(nsIContent* aElement,
                                           int32_t aNameSpaceID, nsAtom* aTag,
                                           mozilla::dom::Element** aResult) {
  for (nsIContent* child = aElement->GetFirstChild(); child;
       child = child->GetNextSibling()) {
    if (child->IsElement() && child->NodeInfo()->Equals(aTag, aNameSpaceID)) {
      NS_ADDREF(*aResult = child->AsElement());
      return NS_OK;
    }
  }

  *aResult = nullptr;
  return NS_RDF_NO_VALUE;  // not found
}
