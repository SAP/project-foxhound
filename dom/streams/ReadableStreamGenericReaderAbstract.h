/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_STREAMS_READABLESTREAMGENERICREADERABSTRACT_H_
#define DOM_STREAMS_READABLESTREAMGENERICREADERABSTRACT_H_

#include "ReadableStreamGenericReader.h"

namespace mozilla::dom::streams_abstract {

bool ReadableStreamReaderGenericInitialize(ReadableStreamGenericReader* aReader,
                                           ReadableStream* aStream);

void ReadableStreamReaderGenericRelease(ReadableStreamGenericReader* aReader,
                                        ErrorResult& aRv);

}  // namespace mozilla::dom::streams_abstract

#endif  // DOM_STREAMS_READABLESTREAMGENERICREADERABSTRACT_H_
