/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsBaseCommandController_h_
#define nsBaseCommandController_h_

#include "nsIController.h"
#include "nsIWeakReferenceUtils.h"

#define NS_BASECOMMANDCONTROLLER_IID \
  {0xd749fad0, 0xccf1, 0x4972, {0xb9, 0xa3, 0xd4, 0x1b, 0xaf, 0xee, 0xf1, 0xb7}}

class nsControllerCommandTable;

// The base editor controller is used for both text widgets, and all other text
// and html editing
class nsBaseCommandController final : public nsIController,
                                      public nsICommandController {
 public:
  explicit nsBaseCommandController(nsControllerCommandTable*);
  void SetContext(nsISupportsWeakReference* aContext) {
    mContext = do_GetWeakReference(aContext);
  }

  NS_DECL_ISUPPORTS
  NS_DECL_NSICONTROLLER
  NS_DECL_NSICOMMANDCONTROLLER
  NS_INLINE_DECL_STATIC_IID(NS_BASECOMMANDCONTROLLER_IID)

  static already_AddRefed<nsBaseCommandController> CreateWindowController();
  static already_AddRefed<nsBaseCommandController> CreateEditorController();
  static already_AddRefed<nsBaseCommandController> CreateEditingController();
  static already_AddRefed<nsBaseCommandController> CreateHTMLEditorController();
  static already_AddRefed<nsBaseCommandController>
  CreateHTMLEditorDocStateController();

 protected:
  virtual ~nsBaseCommandController();

 private:
  nsWeakPtr mContext;

  // Our reference to the command manager
  RefPtr<nsControllerCommandTable> mCommandTable;
};

inline nsISupports* ToSupports(nsBaseCommandController* aController) {
  return static_cast<nsIController*>(aController);
}

#endif /* nsBaseCommandController_h_ */
