/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This file exists so that LaunchModernSettingsDialogDefaultApps can be called
 * without linking to libxul.
 */

#ifndef windowsdefaultbrowser_h_
#define windowsdefaultbrowser_h_

#include "mozilla/UniquePtr.h"

bool GetAppRegName(mozilla::UniquePtr<wchar_t[]>& aAppRegName);
bool LaunchControlPanelDefaultPrograms();
bool LaunchModernSettingsDialogDefaultApps();

#endif  // windowsdefaultbrowser_h_
