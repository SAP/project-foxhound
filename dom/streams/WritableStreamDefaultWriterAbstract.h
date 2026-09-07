/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_STREAMS_WRITABLESTREAMDEFAULTWRITERABSTRACT_H_
#define DOM_STREAMS_WRITABLESTREAMDEFAULTWRITERABSTRACT_H_

#include "WritableStreamDefaultWriter.h"

namespace mozilla::dom::streams_abstract {

void SetUpWritableStreamDefaultWriter(WritableStreamDefaultWriter* aWriter,
                                      WritableStream* aStream,
                                      ErrorResult& aRv);

void WritableStreamDefaultWriterEnsureClosedPromiseRejected(
    WritableStreamDefaultWriter* aWriter, JS::Handle<JS::Value> aError);

void WritableStreamDefaultWriterEnsureReadyPromiseRejected(
    WritableStreamDefaultWriter* aWriter, JS::Handle<JS::Value> aError);

Nullable<double> WritableStreamDefaultWriterGetDesiredSize(
    WritableStreamDefaultWriter* aWriter);

void WritableStreamDefaultWriterRelease(JSContext* aCx,
                                        WritableStreamDefaultWriter* aWriter);

MOZ_CAN_RUN_SCRIPT already_AddRefed<Promise> WritableStreamDefaultWriterWrite(
    JSContext* aCx, WritableStreamDefaultWriter* aWriter,
    JS::Handle<JS::Value> aChunk, ErrorResult& aRv);

MOZ_CAN_RUN_SCRIPT already_AddRefed<Promise>
WritableStreamDefaultWriterCloseWithErrorPropagation(
    JSContext* aCx, WritableStreamDefaultWriter* aWriter, ErrorResult& aRv);

}  // namespace mozilla::dom::streams_abstract

#endif  // DOM_STREAMS_WRITABLESTREAMDEFAULTWRITERABSTRACT_H_
