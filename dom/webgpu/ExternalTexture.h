/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef ExternalTexture_H_
#define ExternalTexture_H_

#include <array>

#include "ObjectModel.h"
#include "mozilla/HashTable.h"
#include "mozilla/Span.h"
#include "mozilla/WeakPtr.h"
#include "mozilla/gfx/Types.h"
#include "mozilla/webgpu/WebGPUTypes.h"
#include "mozilla/webgpu/ffi/wgpu.h"
#include "nsIGlobalObject.h"
#include "nsTArrayForwardDeclare.h"

namespace mozilla {
namespace dom {
struct GPUExternalTextureDescriptor;
class HTMLVideoElement;
class OwningHTMLVideoElementOrVideoFrame;
enum class PredefinedColorSpace : uint8_t;
class VideoFrame;
}  // namespace dom
namespace layers {
class BufferDescriptor;
class DXGITextureHostD3D11;
class DXGIYCbCrTextureHostD3D11;
class Image;
class MacIOSurfaceTextureHostOGL;
}  // namespace layers

namespace webgpu {

class Device;
class ExternalTextureSourceClient;
class WebGPUParent;

// Implementation of WebGPU's GPUExternalTexture [1].
//
// A GPUExternalTexture is a sampleable 2D texture wrapping an external video
// frame. It is an immutable snapshot; its contents may not change over time,
// either from inside WebGPU (it is only sampleable) or from outside WebGPU
// (e.g. due to video frame advancement).
//
// External textures can be imported from either a HTMLVideoElement or a
// VideoFrame, and they can be bound to bind groups. They can be used in WGSL
// shaders via the `texture_external` type.
//
// Our implementation differentiates between the imported snapshot of
// the video frame (see `ExternalTextureSourceClient`) and the external texture
// itself (this class). This allows us to efficiently create multiple
// `ExternalTexture`s from the same source.
//
// The external texture holds a strong reference to its external texture
// source, ensuring the source's resources remain alive as long as required
// by any external textures.
//
// [1] https://www.w3.org/TR/webgpu/#gpuexternaltexture
class ExternalTexture final : public nsWrapperCache,
                              public ObjectBase,
                              public ChildOf<Device>,
                              public SupportsWeakPtr {
 public:
  GPU_DECL_CYCLE_COLLECTION(ExternalTexture)
  GPU_DECL_JS_WRAP(ExternalTexture)

  static already_AddRefed<ExternalTexture> Create(
      Device* const aParent, const nsString& aLabel,
      const RefPtr<ExternalTextureSourceClient>& aSource,
      dom::PredefinedColorSpace aColorSpace);

  // Sets the external texture's "expired" state to true. This gets called at
  // the end of the task in which the external texture was imported if
  // imported from an HTMLVideoElement, and when the video frame is closed if
  // imported from a VideoFrame. It is an error to submit a command buffer
  // which uses an expired external texture.
  void Expire();
  bool IsExpired() const { return mIsExpired; }
  void Unexpire();
  bool IsDestroyed() const { return mIsDestroyed; }

  void OnSubmit(uint64_t aSubmissionIndex);
  void OnSubmittedWorkDone(uint64_t aSubmissionIndex);

  RefPtr<ExternalTextureSourceClient> Source() { return mSource; }

 private:
  explicit ExternalTexture(Device* const aParent, RawId aId,
                           RefPtr<ExternalTextureSourceClient> aSource);
  virtual ~ExternalTexture();

  // Destroys the external texture if it is no longer required, i.e. all
  // submitted work using the external texture has completed, and the external
  // texture has been expired.
  void MaybeDestroy();

  // Hold a strong reference to the source to ensure it stays alive as long as
  // the external texture may still be used.
  RefPtr<ExternalTextureSourceClient> mSource;
  bool mIsExpired = false;
  bool mIsDestroyed = false;
  uint64_t mLastSubmittedIndex = 0;
  uint64_t mLastSubmittedWorkDoneIndex = 0;
};

// A cache of imported external texture sources. This allows, where possible,
// reusing a previously imported external source rather than importing a new
// one. Each source additionally caches which external textures were created
// from it, meaning where possible we can even reuse the external textures
// themselves.
class ExternalTextureCache : public SupportsWeakPtr {
 public:
  // Get an external texture matching the descriptor. This may reuse an
  // existing external texture or create a new one if required. Returns nullptr
  // on error. Throws security error if the source is not origin-clean.
  RefPtr<ExternalTexture> GetOrCreate(
      Device* aDevice, const dom::GPUExternalTextureDescriptor& aDesc,
      ErrorResult& aRv);

  // Removes a previously imported external texture source from the cache. This
  // *must* be called by the source when it is destroyed.
  void RemoveSource(const ExternalTextureSourceClient* aSource);

 private:
  // Gets the external texture source previously imported from an
  // HTMLVideoElement or a VideoFrame if still valid, otherwise imports a new
  // one. Returns nullptr on failure. Throws security error if the source is not
  // origin-clean.
  RefPtr<ExternalTextureSourceClient> GetOrCreateSource(
      Device* aDevice, const dom::OwningHTMLVideoElementOrVideoFrame& aSource,
      ErrorResult& aRv);

  // Map of previously imported external texture sources. Keyed by the value of
  // `GetSerial()` for the `layers::Image` they were imported from. We store a
  // raw pointer to the source to avoid keeping the source alive unnecessarily.
  // As a consequence, the source *must* remove itself from the cache when it is
  // destroyed.
  HashMap<uint32_t, ExternalTextureSourceClient*> mSources;
};

// The client side of an imported external texture source. This gets imported
// from either an HTMLVideoElement or a VideoFrame. ExternalTextures can then
// be created from a source. It is important to separate the source from the
// external texture as multiple external textures can be created from the same
// source.
// The client side is responsible for creating and destroying the host side.
// Any external texture created from this source must ensure the source remains
// alive as long as it is required by the external texture, by holding a strong
// reference. The source itself retains a strong reference to the layers::Image
// it was imported from, which ensures that the decoder does not attempt to
// reuse the image's underlying resources while the source is still in use.
class ExternalTextureSourceClient final : public ObjectBase {
  NS_INLINE_DECL_REFCOUNTING(ExternalTextureSourceClient)

 public:
  // Creates an ExternalTextureSourceClient from a video element or video frame.
  // Returns nullptr on failure. Throws security error if the source is not
  // origin-clean.
  static already_AddRefed<ExternalTextureSourceClient> Create(
      Device* aDevice, ExternalTextureCache* aCache,
      const dom::OwningHTMLVideoElementOrVideoFrame& aSource, ErrorResult& aRv);

  // Hold a strong reference to the image as long as we are alive. If the
  // SurfaceDescriptor sent to the host was a SurfaceDescriptorGPUVideo, this
  // ensures the remote TextureHost is kept alive until we have imported the
  // textures into wgpu. Additionally this prevents the decoder from recycling
  // the underlying resource whilst still in use, e.g. decoding a future video
  // frame into a texture that is currently being rendered by wgpu. When all
  // external textures created from this source have been destroyed the final
  // reference to the source will be released, causing this reference to be
  // released, indicating to the decoder that it can reuse the resources.
  const RefPtr<layers::Image> mImage;

  // External texture sources can consist of up to 3 planes of texture data, but
  // on the client side we do not know how many planes will actually be
  // required. We therefore unconditionally make IDs for 3 textures and 3
  // texture views, and the host side will only use the IDs that it requires.
  const std::array<RawId, 3> mTextureIds;
  const std::array<RawId, 3> mViewIds;

  // Get an external texture from this source matching the descriptor. This may
  // reuse an existing external texture or create a new one if required.
  RefPtr<ExternalTexture> GetOrCreateExternalTexture(
      Device* aDevice, const dom::GPUExternalTextureDescriptor& aDesc);

 private:
  ExternalTextureSourceClient(WebGPUChild* aChild, RawId aId,
                              ExternalTextureCache* aCache,
                              const RefPtr<layers::Image>& aImage,
                              const std::array<RawId, 3>& aTextureIds,
                              const std::array<RawId, 3>& aViewIds);
  virtual ~ExternalTextureSourceClient();

  // Pointer to the cache this source is stored in. If the cache is still
  // valid then the source *must* remove itself from the cache when it is
  // destroyed.
  const WeakPtr<ExternalTextureCache> mCache;

  // Cache of external textures created from this source. We can ignore the
  // label when deciding whether to reuse an external texture, and since the
  // cache is owned by the source we can ignore the source field of the
  // descriptor too. This leaves just the color space.
  HashMap<dom::PredefinedColorSpace, WeakPtr<ExternalTexture>>
      mExternalTextures;
};

// Host side of an external texture source. This is responsible for creating
// and managing the lifecycle of the wgpu textures and texture views created
// from the provided SurfaceDescriptor.
class ExternalTextureSourceHost {
 public:
  // Creates an external texture source from a descriptor. If this fails it
  // will create an external texture source in an error state, which will be
  // propagated to any external textures created from it.
  static ExternalTextureSourceHost Create(
      WebGPUParent* aParent, RawId aDeviceId, RawId aQueueId,
      const ExternalTextureSourceDescriptor& aDesc);

  // Texture and TextureView IDs used by the source. These will be a subset of
  // the IDs provided by the client in the descriptor.
  Span<const RawId> TextureIds() const { return mTextureIds; }
  Span<const RawId> ViewIds() const { return mViewIds; }

  // Returns information required to create the wgpu::ExternalTexture that is
  // only available to the host side.
  ffi::WGPUExternalTextureDescriptorFromSource GetExternalTextureDescriptor(
      ffi::WGPUPredefinedColorSpace aDestColorSpace) const;

  // Called prior to submitting commands which read from this external texture
  // source. This can be used to wait on a fence, for example. If this returns
  // false, the commands must *not* be submitted.
  bool OnBeforeQueueSubmit(WebGPUParent* aParent, RawId aDeviceId,
                           RawId aQueueId);

 private:
  ExternalTextureSourceHost(Span<const RawId> aTextureIds,
                            Span<const RawId> aViewIds, gfx::IntSize aSize,
                            gfx::SurfaceFormat aFormat,
                            gfx::YUVRangedColorSpace aColorSpace,
                            const std::array<float, 6>& aSampleTransform,
                            const std::array<float, 6>& aLoadTransform);

  static ExternalTextureSourceHost CreateFromBufferDesc(
      WebGPUParent* aParent, RawId aDeviceId, RawId aQueueId,
      const ExternalTextureSourceDescriptor& aDesc,
      const layers::BufferDescriptor& aBufferDesc, Span<uint8_t> aBuffer);
  static ExternalTextureSourceHost CreateFromDXGITextureHost(
      WebGPUParent* aParent, RawId aDeviceId, RawId aQueueId,
      const ExternalTextureSourceDescriptor& aDesc,
      const layers::DXGITextureHostD3D11* aTextureHost);
  static ExternalTextureSourceHost CreateFromDXGIYCbCrTextureHost(
      WebGPUParent* aParent, RawId aDeviceId, RawId aQueueId,
      const ExternalTextureSourceDescriptor& aDesc,
      const layers::DXGIYCbCrTextureHostD3D11* aTextureHost);
  static ExternalTextureSourceHost CreateFromMacIOSurfaceTextureHost(
      WebGPUParent* aParent, RawId aDeviceId,
      const ExternalTextureSourceDescriptor& aDesc,
      const layers::MacIOSurfaceTextureHostOGL* aTextureHost);

  // Creates an external texture source in an error state that will be
  // propagated to any external textures created from it.
  static ExternalTextureSourceHost CreateError();

  // These should be const but can't be else we wouldn't be move constructible.
  // While we are always provided with 3 texture IDs and 3 view IDs by the
  // client, we only store here the IDs that are actually used. For example an
  // RGBA format source will only require 1 texture and 1 view. NV12 will
  // require 2 views, and either 1 or 2 textures depending on whether the
  // platform natively supports NV12 format textures.
  AutoTArray<RawId, 3> mTextureIds;
  AutoTArray<RawId, 3> mViewIds;
  const gfx::IntSize mSize;
  const gfx::SurfaceFormat mFormat;
  const gfx::YUVRangedColorSpace mColorSpace;
  const std::array<float, 6> mSampleTransform;
  const std::array<float, 6> mLoadTransform;

#ifdef XP_WIN
  // ID used to obtain the texture's write fence from the
  // CompositeProcessD3D11FencesHolderMap. The fence is created by the encoder,
  // which will signal the fence with a value of FenceD3D11::mFenceValue when
  // it has finished writing to the texture. We must therefore ensure we wait
  // for the fence to reach this value prior to reading from the texture. A
  // value of Nothing indicates that we do not need to wait at all.
  Maybe<layers::CompositeProcessFencesHolderId> mFenceId;
#endif
};

}  // namespace webgpu
}  // namespace mozilla

#endif  // GPU_ExternalTexture_H_
