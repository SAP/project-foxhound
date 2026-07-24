/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_toolkit_system_nsWindowsSystemProxySettings_h
#define mozilla_toolkit_system_nsWindowsSystemProxySettings_h

#include "nsISystemProxySettings.h"
#include "nsStringFwd.h"

class nsWindowsSystemProxySettings final : public nsISystemProxySettings {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSISYSTEMPROXYSETTINGS

  nsWindowsSystemProxySettings();

 private:
  ~nsWindowsSystemProxySettings();

  bool MatchOverride(const nsACString& aHost);
  bool PatternMatch(const nsACString& aHost, const nsACString& aOverride);
};

#endif  // mozilla_toolkit_system_nsWindowsSystemProxySettings_h
