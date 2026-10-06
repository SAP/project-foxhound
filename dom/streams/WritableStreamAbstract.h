/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_STREAMS_WRITABLESTREAMABSTRACT_H_
#define DOM_STREAMS_WRITABLESTREAMABSTRACT_H_

#include "WritableStream.h"

namespace mozilla::dom::streams_abstract {

inline bool IsWritableStreamLocked(WritableStream* aStream) {
  return aStream->Locked();
}

MOZ_CAN_RUN_SCRIPT already_AddRefed<Promise> WritableStreamAbort(
    JSContext* aCx, WritableStream* aStream, JS::Handle<JS::Value> aReason,
    ErrorResult& aRv);

MOZ_CAN_RUN_SCRIPT already_AddRefed<Promise> WritableStreamClose(
    JSContext* aCx, WritableStream* aStream, ErrorResult& aRv);

already_AddRefed<Promise> WritableStreamAddWriteRequest(
    WritableStream* aStream);

already_AddRefed<WritableStreamDefaultWriter>
AcquireWritableStreamDefaultWriter(WritableStream* aStream, ErrorResult& aRv);

}  // namespace mozilla::dom::streams_abstract

#endif  // DOM_STREAMS_WRITABLESTREAMABSTRACT_H_
