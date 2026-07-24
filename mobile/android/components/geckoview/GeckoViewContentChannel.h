/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cin: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef GeckoViewContentChannel_h_
#define GeckoViewContentChannel_h_

#include "nsBaseChannel.h"

class GeckoViewContentChannel : public nsBaseChannel {
 public:
  explicit GeckoViewContentChannel(nsIURI* aUri);

 protected:
  virtual ~GeckoViewContentChannel() = default;

  nsresult OpenContentStream(bool async, nsIInputStream** result,
                             nsIChannel** channel) override;
};

#endif  // !GeckoViewContentChannel_h_
