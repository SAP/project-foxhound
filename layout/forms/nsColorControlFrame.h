/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsColorControlFrame_h_
#define nsColorControlFrame_h_

#include "ButtonControlFrame.h"
#include "nsCOMPtr.h"
#include "nsIAnonymousContentCreator.h"

namespace mozilla {
class PresShell;
}  // namespace mozilla

// Class which implements the input type=color

class nsColorControlFrame final : public mozilla::ButtonControlFrame,
                                  public nsIAnonymousContentCreator {
  typedef mozilla::dom::Element Element;

 public:
  friend nsIFrame* NS_NewColorControlFrame(mozilla::PresShell* aPresShell,
                                           ComputedStyle* aStyle);

  void Destroy(DestroyContext&) override;

  NS_DECL_QUERYFRAME
  NS_DECL_FRAMEARENA_HELPERS(nsColorControlFrame)

#ifdef DEBUG_FRAME_DUMP
  nsresult GetFrameName(nsAString& aResult) const override {
    return MakeFrameName(u"ColorControl"_ns, aResult);
  }
#endif

  // nsIAnonymousContentCreator
  nsresult CreateAnonymousContent(nsTArray<ContentInfo>& aElements) override;
  void AppendAnonymousContentTo(nsTArray<nsIContent*>& aElements,
                                uint32_t aFilter) override;

  // nsIFrame
  nsresult AttributeChanged(int32_t aNameSpaceID, nsAtom* aAttribute,
                            AttrModType aModType) override;

  // Refresh the color swatch, using associated input's value
  void UpdateColor();

 private:
  nsColorControlFrame(ComputedStyle*, nsPresContext*);

  nsCOMPtr<Element> mColorContent;
};

#endif  // nsColorControlFrame_h_
