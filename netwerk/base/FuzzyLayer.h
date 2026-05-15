/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef FuzzyLayer_h_
#define FuzzyLayer_h_

#include "prerror.h"
#include "nsError.h"
#include "nsIFile.h"

namespace mozilla {
namespace net {

nsresult AttachFuzzyIOLayer(PRFileDesc* fd);

extern Atomic<bool> gFuzzingConnClosed;
bool signalNetworkFuzzingDone();

void addNetworkFuzzingBuffer(const uint8_t* data, size_t size,
                             bool readFirst = false,
                             bool useIsOptional = false);

}  // namespace net
}  // namespace mozilla

#endif  // FuzzyLayer_h_
