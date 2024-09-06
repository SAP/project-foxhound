/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsAppShell.h"
#include "nsAppShellSingleton.h"
#include "nsLookAndFeel.h"
#include "nsWidgetFactory.h"
#include "mozilla/WidgetUtils.h"

using namespace mozilla::widget;

void nsWidgetUIKitModuleCtor() { nsAppShellInit(); }

void nsWidgetUIKitModuleDtor() {
  WidgetUtils::Shutdown();
  nsLookAndFeel::Shutdown();
  nsAppShellShutdown();
}
