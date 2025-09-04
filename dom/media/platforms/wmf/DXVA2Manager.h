/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#if !defined(DXVA2Manager_h_)
#  define DXVA2Manager_h_

#  include "MediaInfo.h"
#  include "WMF.h"
#  include "mozilla/Mutex.h"
#  include "mozilla/gfx/Rect.h"
#  include "d3d11.h"
#  include "D3D11TextureWrapper.h"

namespace mozilla {

namespace layers {
class Image;
class ImageContainer;
class KnowsCompositor;
}  // namespace layers

enum class DXVA2Usage { Playback, ColorConversionOnly };

class DXVA2Manager {
 public:
  // Creates and initializes a DXVA2Manager. We can use DXVA2 via D3D11.
  static DXVA2Manager* CreateD3D11DXVA(
      layers::KnowsCompositor* aKnowsCompositor, nsACString& aFailureReason,
      ID3D11Device* aDevice = nullptr,
      DXVA2Usage aUsage = DXVA2Usage::Playback);

  // Returns a pointer to the D3D device manager responsible for managing the
  // device we're using for hardware accelerated video decoding. For D3D11 this
  // is an IMFDXGIDeviceManager. It is safe to call this on any thread.
  virtual IUnknown* GetDXVADeviceManager() = 0;

  // Copy the video frame into a share handle image.
  virtual HRESULT CopyToImage(IMFSample* aVideoSample,
                              const gfx::IntRect& aRegion,
                              layers::Image** aOutImage) = 0;
  virtual HRESULT CopyToImage(ID3D11Texture2D* aInputTexture,
                              UINT aSurfaceIndex, const gfx::IntRect& aRegion,
                              layers::Image** aOutImage) = 0;

  virtual HRESULT WrapTextureWithImage(IMFSample* aVideoSample,
                                       const gfx::IntRect& aRegion,
                                       layers::Image** aOutImage) {
    // Not implemented!
    MOZ_CRASH("WrapTextureWithImage not implemented on this manager.");
    return E_FAIL;
  }

  virtual HRESULT WrapTextureWithImage(D3D11TextureWrapper* aTextureWrapper,
                                       const gfx::IntRect& aRegion,
                                       layers::Image** aOutImage) {
    // Not implemented!
    MOZ_CRASH("WrapTextureWithImage not implemented on this manager.");
    return E_FAIL;
  }

  virtual HRESULT ConfigureForSize(IMFMediaType* aInputType,
                                   gfx::YUVColorSpace aColorSpace,
                                   gfx::ColorRange aColorRange,
                                   gfx::ColorDepth aColorDepth, uint32_t aWidth,
                                   uint32_t aHeight) {
    return S_OK;
  }
  virtual HRESULT ConfigureForSize(gfx::SurfaceFormat aSurfaceFormat,
                                   gfx::YUVColorSpace aColorSpace,
                                   gfx::ColorRange aColorRange,
                                   gfx::ColorDepth aColorDepth, uint32_t aWidth,
                                   uint32_t aHeight) {
    // Not implemented!
    MOZ_CRASH("ConfigureForSize not implemented on this manager.");
    return E_FAIL;
  }

  virtual bool IsD3D11() { return false; }

  virtual ~DXVA2Manager();

  virtual bool SupportsConfig(const VideoInfo& aInfo, IMFMediaType* aInputType,
                              IMFMediaType* aOutputType) = 0;

  // Called before shutdown video MFTDecoder.
  virtual void BeforeShutdownVideoMFTDecoder() {}

  virtual bool SupportsZeroCopyNV12Texture() { return false; }

  static bool IsNV12Supported(uint32_t aVendorID, uint32_t aDeviceID,
                              const nsAString& aDriverVersionString);

  virtual ID3D11Device* GetD3D11Device() { return nullptr; }

 protected:
  Mutex mLock MOZ_UNANNOTATED;
  DXVA2Manager();

  bool IsUnsupportedResolution(const uint32_t& aWidth, const uint32_t& aHeight,
                               const float& aFramerate) const;

  bool mIsAMDPreUVD4 = false;
};

}  // namespace mozilla

#endif  // DXVA2Manager_h_
