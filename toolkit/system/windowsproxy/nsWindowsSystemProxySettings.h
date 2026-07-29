/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_toolkit_system_nsWindowsSystemProxySettings_h
#define mozilla_toolkit_system_nsWindowsSystemProxySettings_h

#include "nsISystemProxySettings.h"
#include "nsStringFwd.h"
#include "WindowsInternetFunctionsWrapper.h"
#include "mozilla/RefPtr.h"

class nsWindowsSystemProxySettings final : public nsISystemProxySettings {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSISYSTEMPROXYSETTINGS

  explicit nsWindowsSystemProxySettings(
      mozilla::toolkit::system::WindowsInternetFunctionsWrapper* aFunctions =
          new mozilla::toolkit::system::WindowsInternetFunctionsWrapper());

 private:
  ~nsWindowsSystemProxySettings();

  bool MatchOverride(const nsACString& aHost);
  bool PatternMatch(const nsACString& aHost, const nsACString& aOverride);

  RefPtr<mozilla::toolkit::system::WindowsInternetFunctionsWrapper> mFunctions;
};

#endif  // mozilla_toolkit_system_nsWindowsSystemProxySettings_h
