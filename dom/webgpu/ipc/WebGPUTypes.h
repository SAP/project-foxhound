/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef WEBGPU_TYPES_H_
#define WEBGPU_TYPES_H_

#include <cstdint>

#include "mozilla/GfxMessageUtils.h"
#include "mozilla/Maybe.h"
#include "mozilla/ParamTraits_STL.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/layers/LayersSurfaces.h"
#include "nsString.h"

namespace mozilla::dom {
enum class GPUErrorFilter : uint8_t;
}  // namespace mozilla::dom

namespace mozilla::webgpu {

using RawId = uint64_t;
using BufferAddress = uint64_t;

struct ErrorScope {
  dom::GPUErrorFilter filter;
  Maybe<nsCString> firstMessage;
};

enum class PopErrorScopeResultType : uint8_t {
  NoError,
  ThrowOperationError,
  ValidationError,
  OutOfMemory,
  InternalError,
  DeviceLost,
  _LAST = DeviceLost,
};

struct PopErrorScopeResult {
  PopErrorScopeResultType resultType;
  nsCString message;
};

enum class WebGPUCompilationMessageType { Error, Warning, Info };

// TODO: Better name? CompilationMessage alread taken by the dom object.
/// The serializable counterpart of the dom object CompilationMessage.
struct WebGPUCompilationMessage {
  nsString message;
  uint64_t lineNum = 0;
  uint64_t linePos = 0;
  // In utf16 code units.
  uint64_t offset = 0;
  // In utf16 code units.
  uint64_t length = 0;
  WebGPUCompilationMessageType messageType =
      WebGPUCompilationMessageType::Error;
};

/// A helper to reduce the boiler plate of turning the many Optional<nsAString>
/// we get from the dom to the nullable nsACString* we pass to the wgpu ffi.
class StringHelper {
 public:
  explicit StringHelper(const nsString& aWide) {
    if (!aWide.IsEmpty()) {
      mNarrow = Some(NS_ConvertUTF16toUTF8(aWide));
    }
  }

  const nsACString* Get() const {
    if (mNarrow.isSome()) {
      return mNarrow.ptr();
    }
    return nullptr;
  }

 private:
  Maybe<NS_ConvertUTF16toUTF8> mNarrow;
};

// Used to create an ExternalTextureSourceHost.
struct ExternalTextureSourceDescriptor {
  std::array<RawId, 3> mTextureIds;
  std::array<RawId, 3> mViewIds;
  layers::SurfaceDescriptor mSurfaceDescriptor;
  gfx::IntSize mSize;
  std::array<float, 6> mSampleTransform;
  std::array<float, 6> mLoadTransform;
};

}  // namespace mozilla::webgpu

namespace IPC {
template <>
struct ParamTraits<mozilla::webgpu::ExternalTextureSourceDescriptor> {
  using ParamType = mozilla::webgpu::ExternalTextureSourceDescriptor;

  static void Write(MessageWriter* aWriter, const ParamType& aParam) {
    WriteParam(aWriter, aParam.mTextureIds);
    WriteParam(aWriter, aParam.mViewIds);
    WriteParam(aWriter, aParam.mSurfaceDescriptor);
    WriteParam(aWriter, aParam.mSize);
    WriteParam(aWriter, aParam.mSampleTransform);
    WriteParam(aWriter, aParam.mLoadTransform);
  }

  static bool Read(MessageReader* aReader, ParamType* aResult) {
    return ReadParam(aReader, &aResult->mTextureIds) &&
           ReadParam(aReader, &aResult->mViewIds) &&
           ReadParam(aReader, &aResult->mSurfaceDescriptor) &&
           ReadParam(aReader, &aResult->mSize) &&
           ReadParam(aReader, &aResult->mSampleTransform) &&
           ReadParam(aReader, &aResult->mLoadTransform);
  }
};

}  // namespace IPC

#endif  // WEBGPU_TYPES_H_
