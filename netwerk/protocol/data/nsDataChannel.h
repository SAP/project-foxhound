/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// data implementation header

#ifndef nsDataChannel_h___
#define nsDataChannel_h___

#include "nsBaseChannel.h"
#include "nsIDataChannel.h"

class nsIInputStream;

class nsDataChannel : public nsBaseChannel, public nsIDataChannel {
 public:
  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_NSIDATACHANNEL

  explicit nsDataChannel(nsIURI* uri) { SetURI(uri); };

 protected:
  virtual ~nsDataChannel() = default;
  [[nodiscard]] virtual nsresult OpenContentStream(
      bool async, nsIInputStream** result, nsIChannel** channel) override;
  virtual nsresult NotifyListeners();

 private:
  nsresult MaybeSendDataChannelOpenNotification();
};

#endif /* nsDataChannel_h___ */
