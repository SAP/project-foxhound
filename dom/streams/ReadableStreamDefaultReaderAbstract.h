/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_STREAMS_READABLESTREAMDEFAULTREADERABSTRACT_H_
#define DOM_STREAMS_READABLESTREAMDEFAULTREADERABSTRACT_H_

#include "ReadableStreamDefaultReader.h"

namespace mozilla::dom::streams_abstract {

void SetUpReadableStreamDefaultReader(ReadableStreamDefaultReader* aReader,
                                      ReadableStream* aStream,
                                      ErrorResult& aRv);

MOZ_CAN_RUN_SCRIPT void ReadableStreamDefaultReaderRead(
    JSContext* aCx, ReadableStreamGenericReader* reader, ReadRequest* aRequest,
    ErrorResult& aRv);

void ReadableStreamDefaultReaderErrorReadRequests(
    JSContext* aCx, ReadableStreamDefaultReader* aReader,
    JS::Handle<JS::Value> aError, ErrorResult& aRv);

void ReadableStreamDefaultReaderRelease(JSContext* aCx,
                                        ReadableStreamDefaultReader* aReader,
                                        ErrorResult& aRv);

}  // namespace mozilla::dom::streams_abstract

#endif  // DOM_STREAMS_READABLESTREAMDEFAULTREADERABSTRACT_H_
