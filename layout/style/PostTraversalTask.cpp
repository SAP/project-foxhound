/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "PostTraversalTask.h"

#include "mozilla/dom/FontFace.h"
#include "mozilla/dom/FontFaceSet.h"
#include "mozilla/dom/FontFaceSetImpl.h"
#include "nsPresContext.h"

namespace mozilla {

using namespace dom;

PostTraversalTask::~PostTraversalTask() {
  if (!mTarget) {
    return;
  }
  switch (mType) {
    case Type::DispatchLoadingEventAndReplaceReadyPromise:
      static_cast<dom::FontFaceSetImpl*>(mTarget)->Release();
      break;
    case Type::LoadFontEntry:
      static_cast<gfxUserFontEntry*>(mTarget)->Release();
      break;
  }
}

void PostTraversalTask::Run() {
  switch (mType) {
    case Type::DispatchLoadingEventAndReplaceReadyPromise:
      static_cast<dom::FontFaceSetImpl*>(mTarget)
          ->DispatchLoadingEventAndReplaceReadyPromise();
      break;
    case Type::LoadFontEntry:
      static_cast<gfxUserFontEntry*>(mTarget)->ContinueLoad();
      break;
  }
}

}  // namespace mozilla
