/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "DocAccessibleWrap.h"
#include "mozilla/PresShell.h"
#include "nsIWidgetListener.h"
#include "nsTArray.h"
#include "nsWindow.h"

using namespace mozilla;
using namespace mozilla::a11y;

////////////////////////////////////////////////////////////////////////////////
// DocAccessibleWrap
////////////////////////////////////////////////////////////////////////////////

DocAccessibleWrap::DocAccessibleWrap(dom::Document* aDocument,
                                     PresShell* aPresShell)
    : DocAccessible(aDocument, aPresShell) {}

DocAccessibleWrap::~DocAccessibleWrap() = default;

bool DocAccessibleWrap::IsActivated() {
  if (nsWindow* window = nsWindow::GetFocusedWindow()) {
    if (nsIWidgetListener* listener = window->GetWidgetListener()) {
      if (PresShell* presShell = listener->GetPresShell()) {
        return presShell == PresShellPtr();
      }
    }
  }

  return false;
}
