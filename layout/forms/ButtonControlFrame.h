/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_FORMS_BUTTONCONTROLFRAME_H_
#define LAYOUT_FORMS_BUTTONCONTROLFRAME_H_

#include "nsBlockFrame.h"

class nsTextNode;

namespace mozilla {

// Abstract base class for:
//  * Combobox <select>.
//  * <input> with type={button,reset,submit}
//  * <input> with type=color
// Each of which are basically buttons but with different native-anonymous
// content / shadow tree. Note that this isn't used to implement <button> itself
// (that uses regular frames like nsBlockFrame or nsGridContainerFrame or so,
// depending on the display type).
class ButtonControlFrame : public nsBlockFrame {
 public:
  ButtonControlFrame(ComputedStyle* aStyle, nsPresContext* aPc,
                     ClassID aClassID)
      : nsBlockFrame(aStyle, aPc, aClassID) {
    MOZ_ASSERT(IsReplaced(), "Our subclasses should be replaced elements");
  }
  NS_DECL_ABSTRACT_FRAME(ButtonControlFrame)
  nsContainerFrame* GetContentInsertionFrame() override { return this; }
  nsresult HandleEvent(nsPresContext* aPresContext,
                       mozilla::WidgetGUIEvent* aEvent,
                       nsEventStatus* aEventStatus) override;

  void Reflow(nsPresContext*, ReflowOutput&, const ReflowInput&,
              nsReflowStatus&) override;

  // Given a string of text (for the button label), ensure it's not empty so
  // that line height computations work (inserting a zero-width character if
  // necessary).
  static void EnsureNonEmptyLabel(nsAString&);
};

}  // namespace mozilla

#endif  // LAYOUT_FORMS_BUTTONCONTROLFRAME_H_
