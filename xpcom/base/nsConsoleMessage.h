/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef _nsconsolemessage_h_
#define _nsconsolemessage_h_

#include "nsIConsoleMessage.h"
#include "nsString.h"

class nsConsoleMessage final : public nsIConsoleMessage {
 public:
  nsConsoleMessage();
  explicit nsConsoleMessage(const nsAString& aMessage);

  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSICONSOLEMESSAGE

 private:
  ~nsConsoleMessage() = default;

  int64_t mMicroSecondTimeStamp = 0;
  nsString mMessage;
  bool mIsForwardedFromContentProcess = false;
};

#endif /* _nsconsolemessage_h_ */
