/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_StyleSheetInlines_h
#define mozilla_StyleSheetInlines_h

#include "mozilla/StyleSheet.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/Document.h"

namespace mozilla {

dom::ParentObject StyleSheet::GetParentObject() const {
  if (mConstructorDocument) {
    return dom::ParentObject(mConstructorDocument.get());
  }
  if (mDocumentOrShadowRoot) {
    return dom::ParentObject(&mDocumentOrShadowRoot->AsNode());
  }
  if (mOwningNode) {
    return dom::ParentObject(mOwningNode);
  }
  return dom::ParentObject(mParentSheet);
}

}  // namespace mozilla

#endif  // mozilla_StyleSheetInlines_h
