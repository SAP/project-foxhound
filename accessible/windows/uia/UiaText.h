/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_a11y_UiaText_h_
#define mozilla_a11y_UiaText_h_

#include "objbase.h"
#include "uiautomation.h"

#include "IUnknownImpl.h"
#include "mozilla/RefPtr.h"

namespace mozilla::a11y {
class Accessible;
class MsaaAccessible;

/**
 * ITextProvider2 implementation.
 */
class UiaText : public ITextProvider2 {
 public:
  explicit UiaText(MsaaAccessible* aMsaa);

  // IUnknown
  DECL_IUNKNOWN

  // ITextProvider
  virtual HRESULT STDMETHODCALLTYPE GetSelection(
      /* [retval][out] */ __RPC__deref_out_opt SAFEARRAY** aRetVal);

  virtual HRESULT STDMETHODCALLTYPE GetVisibleRanges(
      /* [retval][out] */ __RPC__deref_out_opt SAFEARRAY** aRetVal);

  virtual HRESULT STDMETHODCALLTYPE RangeFromChild(
      /* [in] */ __RPC__in_opt IRawElementProviderSimple* aChildElement,
      /* [retval][out] */ __RPC__deref_out_opt ITextRangeProvider** aRetVal);

  virtual HRESULT STDMETHODCALLTYPE RangeFromPoint(
      /* [in] */ struct UiaPoint aPoint,
      /* [retval][out] */ __RPC__deref_out_opt ITextRangeProvider** aRetVal);

  virtual /* [propget] */ HRESULT STDMETHODCALLTYPE get_DocumentRange(
      /* [retval][out] */ __RPC__deref_out_opt ITextRangeProvider** aRetVal);

  virtual /* [propget] */ HRESULT STDMETHODCALLTYPE get_SupportedTextSelection(
      /* [retval][out] */ __RPC__out enum SupportedTextSelection* aRetVal);

  // ITextProvider2
  virtual HRESULT STDMETHODCALLTYPE RangeFromAnnotation(
      /* [in] */ __RPC__in_opt IRawElementProviderSimple* aAnnotationElement,
      /* [retval][out] */ __RPC__deref_out_opt ITextRangeProvider** aRetVal);

  virtual HRESULT STDMETHODCALLTYPE GetCaretRange(
      /* [out] */ __RPC__out BOOL* aIsActive,
      /* [retval][out] */ __RPC__deref_out_opt ITextRangeProvider** aRetVal);

 private:
  virtual ~UiaText() = default;
  Accessible* Acc() const;

  RefPtr<MsaaAccessible> mMsaa;
};

}  // namespace mozilla::a11y

#endif
