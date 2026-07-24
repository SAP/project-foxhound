/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "RenderRootTypes.h"
#include "mozilla/layers/WebRenderMessageUtils.h"
#include "mozilla/layers/WebRenderBridgeChild.h"

using namespace mozilla::layers;

namespace IPC {

void ParamTraits<DisplayListData>::Write(IPC::MessageWriter* aWriter,
                                         paramType&& aParam) {
  WriteParam(aWriter, aParam.mIdNamespace);
  WriteParam(aWriter, aParam.mRect);
  WriteParam(aWriter, aParam.mCommands);
  WriteParam(aWriter, std::move(aParam.mDLItems));
  WriteParam(aWriter, std::move(aParam.mDLCache));
  WriteParam(aWriter, std::move(aParam.mDLSpatialTree));
  WriteParam(aWriter, aParam.mDLDesc);
  WriteParam(aWriter, aParam.mResourceUpdates);
  WriteParam(aWriter, aParam.mSmallShmems);
  WriteParam(aWriter, std::move(aParam.mLargeShmems));
  WriteParam(aWriter, aParam.mScrollData);
}

bool ParamTraits<DisplayListData>::Read(IPC::MessageReader* aReader,
                                        paramType* aResult) {
  return ReadParam(aReader, &aResult->mIdNamespace) &&
         ReadParam(aReader, &aResult->mRect) &&
         ReadParam(aReader, &aResult->mCommands) &&
         ReadParam(aReader, &aResult->mDLItems) &&
         ReadParam(aReader, &aResult->mDLCache) &&
         ReadParam(aReader, &aResult->mDLSpatialTree) &&
         ReadParam(aReader, &aResult->mDLDesc) &&
         ReadParam(aReader, &aResult->mResourceUpdates) &&
         ReadParam(aReader, &aResult->mSmallShmems) &&
         ReadParam(aReader, &aResult->mLargeShmems) &&
         ReadParam(aReader, &aResult->mScrollData);
}

static void WriteScrollUpdates(IPC::MessageWriter* aWriter,
                               ScrollUpdatesMap& aParam) {
  // ICK: we need to manually serialize this map because
  // nsTHashMap doesn't support it (and other maps cause other issues)
  WriteParam(aWriter, aParam.Count());
  for (auto it = aParam.ConstIter(); !it.Done(); it.Next()) {
    WriteParam(aWriter, it.Key());
    WriteParam(aWriter, it.Data());
  }
}

static bool ReadScrollUpdates(IPC::MessageReader* aReader,
                              ScrollUpdatesMap* aResult) {
  // Manually deserialize mScrollUpdates as a stream of K,V pairs
  uint32_t count;
  if (!ReadParam(aReader, &count)) {
    return false;
  }

  ScrollUpdatesMap map(count);
  for (size_t i = 0; i < count; ++i) {
    ScrollableLayerGuid::ViewID key;
    nsTArray<mozilla::ScrollPositionUpdate> data;
    if (!ReadParam(aReader, &key) || !ReadParam(aReader, &data)) {
      return false;
    }
    map.InsertOrUpdate(key, std::move(data));
  }

  MOZ_RELEASE_ASSERT(map.Count() == count);
  *aResult = std::move(map);
  return true;
}

void ParamTraits<TransactionData>::Write(IPC::MessageWriter* aWriter,
                                         paramType&& aParam) {
  WriteParam(aWriter, aParam.mIdNamespace);
  WriteParam(aWriter, aParam.mCommands);
  WriteParam(aWriter, aParam.mResourceUpdates);
  WriteParam(aWriter, aParam.mSmallShmems);
  WriteParam(aWriter, std::move(aParam.mLargeShmems));
  WriteScrollUpdates(aWriter, aParam.mScrollUpdates);
  WriteParam(aWriter, aParam.mPaintSequenceNumber);
}

bool ParamTraits<TransactionData>::Read(IPC::MessageReader* aReader,
                                        paramType* aResult) {
  return ReadParam(aReader, &aResult->mIdNamespace) &&
         ReadParam(aReader, &aResult->mCommands) &&
         ReadParam(aReader, &aResult->mResourceUpdates) &&
         ReadParam(aReader, &aResult->mSmallShmems) &&
         ReadParam(aReader, &aResult->mLargeShmems) &&
         ReadScrollUpdates(aReader, &aResult->mScrollUpdates) &&
         ReadParam(aReader, &aResult->mPaintSequenceNumber);
}

}  // namespace IPC
