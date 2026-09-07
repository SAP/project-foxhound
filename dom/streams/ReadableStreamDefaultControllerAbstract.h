/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_STREAMS_READABLESTREAMDEFAULTCONTROLLERABSTRACT_H_
#define DOM_STREAMS_READABLESTREAMDEFAULTCONTROLLERABSTRACT_H_

#include "ReadableStreamDefaultController.h"

namespace mozilla::dom::streams_abstract {

MOZ_CAN_RUN_SCRIPT void SetUpReadableStreamDefaultController(
    JSContext* aCx, ReadableStream* aStream,
    ReadableStreamDefaultController* aController,
    UnderlyingSourceAlgorithmsBase* aAlgorithms, double aHighWaterMark,
    QueuingStrategySize* aSizeAlgorithm, ErrorResult& aRv);

MOZ_CAN_RUN_SCRIPT void
SetupReadableStreamDefaultControllerFromUnderlyingSource(
    JSContext* aCx, ReadableStream* aStream,
    JS::Handle<JSObject*> aUnderlyingSource,
    UnderlyingSource& aUnderlyingSourceDict, double aHighWaterMark,
    QueuingStrategySize* aSizeAlgorithm, ErrorResult& aRv);

MOZ_CAN_RUN_SCRIPT void ReadableStreamDefaultControllerEnqueue(
    JSContext* aCx, ReadableStreamDefaultController* aController,
    JS::Handle<JS::Value> aChunk, ErrorResult& aRv);

MOZ_CAN_RUN_SCRIPT void ReadableStreamDefaultControllerClose(
    JSContext* aCx, ReadableStreamDefaultController* aController,
    ErrorResult& aRv);

void ReadableStreamDefaultControllerError(
    JSContext* aCx, ReadableStreamDefaultController* aController,
    JS::Handle<JS::Value> aValue, ErrorResult& aRv);

Nullable<double> ReadableStreamDefaultControllerGetDesiredSize(
    ReadableStreamDefaultController* aController);

enum class CloseOrEnqueue { Close, Enqueue };

bool ReadableStreamDefaultControllerCanCloseOrEnqueueAndThrow(
    ReadableStreamDefaultController* aController,
    CloseOrEnqueue aCloseOrEnqueue, ErrorResult& aRv);

bool ReadableStreamDefaultControllerShouldCallPull(
    ReadableStreamDefaultController* aController);

}  // namespace mozilla::dom::streams_abstract

#endif  // DOM_STREAMS_READABLESTREAMDEFAULTCONTROLLERABSTRACT_H_
