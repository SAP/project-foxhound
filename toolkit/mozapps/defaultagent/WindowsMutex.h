/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DEFAULT_BROWSER_AGENT_DEFAULT_AGENT_MUTEX_H_
#define DEFAULT_BROWSER_AGENT_DEFAULT_AGENT_MUTEX_H_

#include "nsString.h"
#include "nsWindowsHelpers.h"

#include "nsIWindowsMutex.h"

namespace mozilla::default_agent {

class WindowsMutexFactory final : public nsIWindowsMutexFactory {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIWINDOWSMUTEXFACTORY

  WindowsMutexFactory() = default;

 private:
  ~WindowsMutexFactory() = default;
};

class WindowsMutex final : public nsIWindowsMutex {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIWINDOWSMUTEX

  WindowsMutex(const nsString& aName, nsAutoHandle& aMutex);

 private:
  nsAutoHandle mMutex;
  nsCString mName;
  bool mLocked;

  ~WindowsMutex();
};

}  // namespace mozilla::default_agent

#endif  // DEFAULT_BROWSER_AGENT_DEFAULT_AGENT_MUTEX_H_
