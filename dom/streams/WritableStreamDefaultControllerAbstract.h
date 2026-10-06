/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_STREAMS_WRITABLESTREAMDEFAULTCONTROLLERABSTRACT_H_
#define DOM_STREAMS_WRITABLESTREAMDEFAULTCONTROLLERABSTRACT_H_

#include "WritableStreamDefaultController.h"

namespace mozilla::dom::streams_abstract {

MOZ_CAN_RUN_SCRIPT void SetUpWritableStreamDefaultController(
    JSContext* aCx, WritableStream* aStream,
    WritableStreamDefaultController* aController,
    UnderlyingSinkAlgorithmsBase* aAlgorithms, double aHighWaterMark,
    QueuingStrategySize* aSizeAlgorithm, ErrorResult& aRv);

MOZ_CAN_RUN_SCRIPT void SetUpWritableStreamDefaultControllerFromUnderlyingSink(
    JSContext* aCx, WritableStream* aStream,
    JS::Handle<JSObject*> aUnderlyingSink, UnderlyingSink& aUnderlyingSinkDict,
    double aHighWaterMark, QueuingStrategySize* aSizeAlgorithm,
    ErrorResult& aRv);

MOZ_CAN_RUN_SCRIPT void WritableStreamDefaultControllerClose(
    JSContext* aCx, WritableStreamDefaultController* aController,
    ErrorResult& aRv);

MOZ_CAN_RUN_SCRIPT void WritableStreamDefaultControllerWrite(
    JSContext* aCx, WritableStreamDefaultController* aController,
    JS::Handle<JS::Value> aChunk, double chunkSize, ErrorResult& aRv);

MOZ_CAN_RUN_SCRIPT void WritableStreamDefaultControllerError(
    JSContext* aCx, WritableStreamDefaultController* aController,
    JS::Handle<JS::Value> aError, ErrorResult& aRv);

MOZ_CAN_RUN_SCRIPT void WritableStreamDefaultControllerErrorIfNeeded(
    JSContext* aCx, WritableStreamDefaultController* aController,
    JS::Handle<JS::Value> aError, ErrorResult& aRv);

MOZ_CAN_RUN_SCRIPT double WritableStreamDefaultControllerGetChunkSize(
    JSContext* aCx, WritableStreamDefaultController* aController,
    JS::Handle<JS::Value> aChunk, ErrorResult& aRv);

}  // namespace mozilla::dom::streams_abstract

#endif  // DOM_STREAMS_WRITABLESTREAMDEFAULTCONTROLLERABSTRACT_H_
