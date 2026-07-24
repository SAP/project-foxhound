/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ButtonControlFrame.h"

/* Abstract base class for special button frames (but not <button>) */

using namespace mozilla;

namespace mozilla {

void ButtonControlFrame::EnsureNonEmptyLabel(nsAString& aLabel) {
  if (aLabel.IsEmpty()) {
    // Have to use a space character of some sort for line-block-size
    // calculations to be right. Also, the space character must be zero-width in
    // order for the inline-size calculations to be consistent between
    // size-contained comboboxes vs. empty comboboxes.
    //
    // XXXdholbert Does this space need to be "non-breaking"? I'm not sure if it
    // matters, but we previously had a comment here (added in 2002) saying
    // "Have to use a non-breaking space for line-height calculations to be
    // right". So I'll stick with a non-breaking space for now...
    aLabel = u"\ufeff"_ns;
  }
}

nsresult ButtonControlFrame::HandleEvent(nsPresContext* aPresContext,
                                         WidgetGUIEvent* aEvent,
                                         nsEventStatus* aEventStatus) {
  // Override HandleEvent to prevent the inherited version from being called
  // when disabled.
  if (IsContentDisabled()) {
    return nsBlockFrame::HandleEvent(aPresContext, aEvent, aEventStatus);
  }
  return NS_OK;
}

void ButtonControlFrame::Reflow(nsPresContext* aPc, ReflowOutput& aReflowOutput,
                                const ReflowInput& aReflowInput,
                                nsReflowStatus& aStatus) {
  nsBlockFrame::Reflow(aPc, aReflowOutput, aReflowInput, aStatus);
  // We're always complete and we don't support overflow containers
  // so we shouldn't have a next-in-flow ever.
  aStatus.Reset();
}

}  // namespace mozilla
