/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef nsPrintObject_h___
#define nsPrintObject_h___

#include "mozilla/Attributes.h"
#include "mozilla/UniquePtr.h"

// Interfaces
#include "nsCOMPtr.h"
#include "nsViewManager.h"
#include "nsIDocShell.h"
#include "nsIDocShellTreeOwner.h"

class nsIContent;
class nsPresContext;

namespace mozilla {
class PresShell;
}  // namespace mozilla

//---------------------------------------------------
//-- nsPrintObject Class
//---------------------------------------------------
class nsPrintObject final {
 public:
  /**
   * If aParent is nullptr (default), then this instance will be initialized as
   * a "root" nsPrintObject.  Otherwise, this will be a "nested" nsPrintObject.
   */
  nsPrintObject(nsIDocShell& aDocShell, mozilla::dom::Document& aDoc,
                nsPrintObject* aParent = nullptr);
  ~nsPrintObject();

  void DestroyPresentation();

  /**
   * Recursively sets all the PO items to be printed
   * from the given item down into the tree
   */
  void EnablePrinting(bool aEnable);

  /**
   * Recursively sets all the PO items to be printed if they have a selection.
   */
  void EnablePrintingSelectionOnly();

  bool PrintingIsEnabled() const { return mPrintingIsEnabled; }

  bool HasSelection() const;

  // Data Members
  nsCOMPtr<nsIDocShell> mDocShell;
  nsCOMPtr<nsIDocShellTreeOwner> mTreeOwner;
  RefPtr<mozilla::dom::Document> mDocument;

  RefPtr<nsPresContext> mPresContext;
  RefPtr<mozilla::PresShell> mPresShell;
  RefPtr<nsViewManager> mViewManager;

  nsCOMPtr<nsIContent> mContent;

  nsTArray<mozilla::UniquePtr<nsPrintObject>> mKids;
  const nsPrintObject* mParent;  // This is a non-owning pointer.
  bool mHasBeenPrinted = false;
  bool mInvisible = false;  // Indicates PO is set to not visible by CSS

  // The scale factor that sheets should be scaled by. This is either the
  // explicit scale chosen by the user or else the shrink-to-fit scale factor
  // if the user selects shrink-to-fit. Only set on the top-level nsPrintObject
  // since this is only used by nsPageFrame (via nsPresContext::GetPageScale()).
  float mZoomRatio = 1.0;

  // If the user selects the shrink-to-fit option, the shrink-to-fit scale
  // factor is calculated and stored here. Only set on the top-level
  // nsPrintObject.
  float mShrinkRatio = 1.0;

 private:
  nsPrintObject& operator=(const nsPrintObject& aOther) = delete;

  bool mPrintingIsEnabled = false;
};

#endif /* nsPrintObject_h___ */
