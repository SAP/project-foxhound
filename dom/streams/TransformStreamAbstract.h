/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_STREAMS_TRANSFORMSTREAMABSTRACT_H_
#define DOM_STREAMS_TRANSFORMSTREAMABSTRACT_H_

#include "TransformStream.h"

namespace mozilla::dom::streams_abstract {

MOZ_CAN_RUN_SCRIPT void TransformStreamErrorWritableAndUnblockWrite(
    JSContext* aCx, TransformStream* aStream, JS::Handle<JS::Value> aError,
    ErrorResult& aRv);

MOZ_CAN_RUN_SCRIPT void TransformStreamError(JSContext* aCx,
                                             TransformStream* aStream,
                                             JS::Handle<JS::Value> aError,
                                             ErrorResult& aRv);

}  // namespace mozilla::dom::streams_abstract

#endif  // DOM_STREAMS_TRANSFORMSTREAMABSTRACT_H_
