/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_STREAMS_READABLESTREAMABSTRACT_H_
#define DOM_STREAMS_READABLESTREAMABSTRACT_H_

#include "ReadableStream.h"

namespace mozilla::dom::streams_abstract {

bool IsReadableStreamLocked(ReadableStream* aStream);

double ReadableStreamGetNumReadRequests(ReadableStream* aStream);

void ReadableStreamError(JSContext* aCx, ReadableStream* aStream,
                         JS::Handle<JS::Value> aValue, ErrorResult& aRv);

MOZ_CAN_RUN_SCRIPT void ReadableStreamClose(JSContext* aCx,
                                            ReadableStream* aStream,
                                            ErrorResult& aRv);

MOZ_CAN_RUN_SCRIPT void ReadableStreamFulfillReadRequest(
    JSContext* aCx, ReadableStream* aStream, JS::Handle<JS::Value> aChunk,
    bool done, ErrorResult& aRv);

void ReadableStreamAddReadRequest(ReadableStream* aStream,
                                  ReadRequest* aReadRequest);
void ReadableStreamAddReadIntoRequest(ReadableStream* aStream,
                                      ReadIntoRequest* aReadIntoRequest);

MOZ_CAN_RUN_SCRIPT already_AddRefed<Promise> ReadableStreamCancel(
    JSContext* aCx, ReadableStream* aStream, JS::Handle<JS::Value> aError,
    ErrorResult& aRv);

already_AddRefed<ReadableStreamDefaultReader>
AcquireReadableStreamDefaultReader(ReadableStream* aStream, ErrorResult& aRv);

bool ReadableStreamHasBYOBReader(ReadableStream* aStream);
bool ReadableStreamHasDefaultReader(ReadableStream* aStream);

}  // namespace mozilla::dom::streams_abstract

#endif  // DOM_STREAMS_READABLESTREAMABSTRACT_H_
