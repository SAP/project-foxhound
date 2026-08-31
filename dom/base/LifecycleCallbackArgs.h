/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_BASE_LIFECYCLECALLBACKARGS_H_
#define DOM_BASE_LIFECYCLECALLBACKARGS_H_

#include "mozilla/RefPtr.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/ElementInternalsBinding.h"  // for RestoreReason
#include "mozilla/dom/HTMLFormElement.h"
#include "nsAtom.h"
#include "nsString.h"

namespace mozilla::dom {

struct LifecycleCallbackArgs {
  // Used by the attribute changed callback.
  RefPtr<nsAtom> mName;
  nsString mOldValue;
  nsString mNewValue;
  nsString mNamespaceURI;

  // Used by the adopted callback.
  RefPtr<Document> mOldDocument;
  RefPtr<Document> mNewDocument;

  // Used by the form associated callback.
  RefPtr<HTMLFormElement> mForm;

  // Used by the form disabled callback.
  bool mDisabled = false;

  // Used by the form state restore callback.
  Nullable<OwningFileOrUSVStringOrFormData> mState;
  RestoreReason mReason = RestoreReason::Restore;

  size_t SizeOfExcludingThis(MallocSizeOf aMallocSizeOf) const;
};

}  // namespace mozilla::dom

#endif  // DOM_BASE_LIFECYCLECALLBACKARGS_H_
