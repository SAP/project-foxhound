/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_STREAMS_READABLESTREAMBYOBREADERABSTRACT_H_
#define DOM_STREAMS_READABLESTREAMBYOBREADERABSTRACT_H_

#include "ReadableStreamBYOBReader.h"

namespace mozilla::dom::streams_abstract {

already_AddRefed<ReadableStreamBYOBReader> AcquireReadableStreamBYOBReader(
    ReadableStream* aStream, ErrorResult& aRv);

MOZ_CAN_RUN_SCRIPT void ReadableStreamBYOBReaderRead(
    JSContext* aCx, ReadableStreamBYOBReader* aReader,
    JS::Handle<JSObject*> aView, uint64_t aMin,
    ReadIntoRequest* aReadIntoRequest, ErrorResult& aRv);

void ReadableStreamBYOBReaderErrorReadIntoRequests(
    JSContext* aCx, ReadableStreamBYOBReader* aReader,
    JS::Handle<JS::Value> aError, ErrorResult& aRv);

void ReadableStreamBYOBReaderRelease(JSContext* aCx,
                                     ReadableStreamBYOBReader* aReader,
                                     ErrorResult& aRv);

}  // namespace mozilla::dom::streams_abstract

#endif  // DOM_STREAMS_READABLESTREAMBYOBREADERABSTRACT_H_
