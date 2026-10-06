/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_STREAMS_TRANSFORMSTREAMDEFAULTCONTROLLERABSTRACT_H_
#define DOM_STREAMS_TRANSFORMSTREAMDEFAULTCONTROLLERABSTRACT_H_

#include "TransformStreamDefaultController.h"

namespace mozilla::dom::streams_abstract {

void SetUpTransformStreamDefaultController(
    JSContext* aCx, TransformStream& aStream,
    TransformStreamDefaultController& aController,
    TransformerAlgorithmsBase& aTransformerAlgorithms);

void SetUpTransformStreamDefaultControllerFromTransformer(
    JSContext* aCx, TransformStream& aStream,
    JS::Handle<JSObject*> aTransformer, Transformer& aTransformerDict);

}  // namespace mozilla::dom::streams_abstract

#endif  // DOM_STREAMS_TRANSFORMSTREAMDEFAULTCONTROLLERABSTRACT_H_
