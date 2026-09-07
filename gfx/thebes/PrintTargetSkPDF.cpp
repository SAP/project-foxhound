/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "PrintTargetSkPDF.h"

#include "imgIEncoder.h"
#include "include/codec/SkCodec.h"
#include "include/codec/SkEncodedImageFormat.h"
#include "include/codec/SkEncodedOrigin.h"
#include "include/core/SkStream.h"
#include "include/private/SkEncodedInfo.h"
#include "mozilla/gfx/2D.h"
#include "mozilla/image/SourceBuffer.h"
#include "mozilla/image/ImageUtils.h"
#include "mozilla/StaticPrefs_print.h"
#include "ImageOps.h"
#include "nsJPEGEncoder.h"
#include "nsString.h"
#include "skia/src/pdf/SkPDFUtils.h"

#ifdef ACCESSIBILITY
#  include "mozilla/a11y/PdfStructTreeBuilder.h"
#endif

using namespace mozilla::image;
using namespace mozilla;

namespace {

Maybe<SkEncodedInfo::Color> SurfaceFormatToSkEncodedColor(
    gfx::SurfaceFormat aFormat) {
  switch (aFormat) {
    case gfx::SurfaceFormat::R8G8B8:
      return Some(SkEncodedInfo::Color::kRGB_Color);
    case gfx::SurfaceFormat::R8G8B8A8:
    case gfx::SurfaceFormat::R8G8B8X8:
      return Some(SkEncodedInfo::Color::kRGBA_Color);
    case gfx::SurfaceFormat::B8G8R8:
      return Some(SkEncodedInfo::Color::kBGR_Color);
    case gfx::SurfaceFormat::B8G8R8A8:
    case gfx::SurfaceFormat::B8G8R8X8:
      return Some(SkEncodedInfo::Color::kBGRA_Color);
    case gfx::SurfaceFormat::YUV420:
      return Some(SkEncodedInfo::Color::kYUV_Color);
    default:
      MOZ_DIAGNOSTIC_CRASH("Unhandled JPEG surface format");
      return Nothing();
  }
}

// Minimal SkCodec subclass used to decode jpeg data for skia.
class JpegSkCodec final : public SkCodec {
 public:
  static std::unique_ptr<SkCodec> Make(sk_sp<const SkData> aData) {
    RefPtr<SourceBuffer> buffer = MakeRefPtr<SourceBuffer>();
    buffer->AdoptData(
        const_cast<char*>(reinterpret_cast<const char*>(aData->bytes())),
        aData->size(),
        [](void*, size_t) -> void* {
          MOZ_DIAGNOSTIC_CRASH("Shouldn't need to reallocate data");
          return nullptr;
        },
        [](void*) { /* do nothing for free */ });
    RefPtr<gfx::SourceSurface> surface = ImageOps::DecodeToSurface(
        buffer, DecoderType::JPEG_PDF, imgIContainer::DECODE_FLAGS_DEFAULT);
    if (NS_WARN_IF(!surface)) {
      return nullptr;
    }
    auto size = surface->GetSize();
    auto format = surface->GetFormat();
    auto color = SurfaceFormatToSkEncodedColor(format);
    if (!color) {
      return nullptr;
    }
    auto alpha = SkEncodedInfo::kOpaque_Alpha;  // JPEG is always opaque
    auto info = SkEncodedInfo::Make(size.width, size.height, *color, alpha, 8);
    return std::unique_ptr<JpegSkCodec>(
        new JpegSkCodec(std::move(info), std::move(aData), std::move(surface)));
  }

 protected:
  SkEncodedImageFormat onGetEncodedFormat() const override {
    return SkEncodedImageFormat::kJPEG;
  }
  Result onGetPixels(const SkImageInfo&, void*, size_t, const Options&,
                     int*) override {
    // TODO: When is this reachable?
    MOZ_DIAGNOSTIC_CRASH("Unimplemented JpegSkCodec::onGetPixels");
    return kUnimplemented;
  }

 private:
  JpegSkCodec(SkEncodedInfo&& aInfo, sk_sp<const SkData> aData,
              RefPtr<gfx::SourceSurface> aSurface)
      : SkCodec(std::move(aInfo), skcms_PixelFormat_RGB_888,
                SkMemoryStream::Make(aData), kTopLeft_SkEncodedOrigin),
        mData(std::move(aData)),
        mSurface(std::move(aSurface)) {}

  sk_sp<const SkData> mData;
  RefPtr<gfx::SourceSurface> mSurface;
};

static std::unique_ptr<SkCodec> DecodeJpeg(sk_sp<const SkData> aData) {
  return JpegSkCodec::Make(std::move(aData));
}

static bool EncodeJpeg(SkWStream* aDst, const SkPixmap& aSrc, int aQuality) {
  uint32_t inputFormat;
  switch (aSrc.colorType()) {
    case kBGRA_8888_SkColorType:
      inputFormat = imgIEncoder::INPUT_FORMAT_HOSTARGB;
      break;
    case kRGBA_8888_SkColorType:
      inputFormat = imgIEncoder::INPUT_FORMAT_RGBA;
      break;
    default:
      MOZ_ASSERT_UNREACHABLE("Unexpected jpeg encoding format");
      return false;
  }

  RefPtr<nsJPEGEncoder> encoder = new nsJPEGEncoder();
  nsAutoString options;
  options.AppendPrintf("quality=%d", aQuality);
  nsresult rv = encoder->InitFromData(
      static_cast<const uint8_t*>(aSrc.addr()), 0, aSrc.width(), aSrc.height(),
      aSrc.rowBytes(), inputFormat, options, ""_ns);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return false;
  }

  char* buf = nullptr;
  uint32_t size = 0;
  encoder->GetImageBuffer(&buf);
  encoder->GetImageBufferUsed(&size);
  return buf && size && aDst->write(buf, size);
}

}  // namespace

namespace mozilla::gfx {

PrintTargetSkPDF::PrintTargetSkPDF(const IntSize& aSize,
                                   UniquePtr<SkWStream> aStream)
    : PrintTarget(/* not using cairo_surface_t */ nullptr, aSize),
      mOStream(std::move(aStream)),
      mPageCanvas(nullptr),
      mRefCanvas(nullptr) {}

PrintTargetSkPDF::~PrintTargetSkPDF() {
  Finish();  // ensure stream is flushed

  // Make sure mPDFDoc and mRefPDFDoc are destroyed before our member streams
  // (which they wrap) are destroyed:
  mPDFDoc = nullptr;
  mRefPDFDoc = nullptr;
}

/* static */
already_AddRefed<PrintTargetSkPDF> PrintTargetSkPDF::CreateOrNull(
    UniquePtr<SkWStream> aStream, const IntSize& aSizeInPoints) {
  return do_AddRef(new PrintTargetSkPDF(aSizeInPoints, std::move(aStream)));
}

class GkSkWStream final : public SkWStream {
 public:
  explicit GkSkWStream(nsIOutputStream* aStream) : mStream(aStream) {
    MOZ_ASSERT(mStream);
  }
  bool write(const void* aBuf, size_t aSize) override {
    const auto* data = reinterpret_cast<const char*>(aBuf);
    do {
      uint32_t wrote = 0;
      if (NS_WARN_IF(NS_FAILED(mStream->Write(data, aSize, &wrote)))) {
        return false;
      }
      mWritten += wrote;
      data += wrote;
      aSize -= wrote;
    } while (aSize);
    NS_ASSERTION(aSize == 0, "not everything was written to the file");
    return true;
  }
  void flush() override { (void)NS_WARN_IF(NS_FAILED(mStream->Flush())); }
  size_t bytesWritten() const override { return mWritten; }

 private:
  nsCOMPtr<nsIOutputStream> mStream;
  size_t mWritten = 0;
};

already_AddRefed<PrintTargetSkPDF> PrintTargetSkPDF::CreateOrNull(
    nsIOutputStream* aStream, const IntSize& aSizeInPoints) {
  return CreateOrNull(MakeUnique<GkSkWStream>(aStream), aSizeInPoints);
}

static SkPDF::Metadata GetDefaultMetadata() {
  SkPDF::Metadata metadata;
  metadata.fEncodingQuality = StaticPrefs::print_skpdf_image_encoding_quality();
  // XXX Chromium sets fRasterDPI to 300, should we do the same? But we'd need
  // to deal with it on the caller too, since otherwise the page ends up tiny.
  metadata.jpegDecoder = DecodeJpeg;
  metadata.jpegEncoder = EncodeJpeg;
  return metadata;
}

nsresult PrintTargetSkPDF::BeginPrinting(const nsAString& aTitle,
                                         const nsAString& aPrintToFileName,
                                         uint64_t aBrowsingContextId,
                                         int32_t aStartPage, int32_t aEndPage) {
  // We need to create the SkPDFDocument here rather than in CreateOrNull
  // because it's only now that we are given aTitle which we want for the
  // PDF metadata.

  NS_ConvertUTF16toUTF8 title(aTitle);
  SkPDF::Metadata metadata = GetDefaultMetadata();
  metadata.fTitle = SkString(title.get(), title.Length());
  metadata.fCreator = "Firefox";
  SkPDF::DateTime now = {0};
  SkPDFUtils::GetDateTime(&now);
  metadata.fCreation = now;
  metadata.fModified = now;

  metadata.jpegDecoder = DecodeJpeg;
  metadata.jpegEncoder = EncodeJpeg;

#ifdef ACCESSIBILITY
  // structRoot needs to survive until SkPDF::MakeDocument returns.
  SkPDF::StructureElementNode structRoot = {};
  if (auto* builder =
          mozilla::a11y::PdfStructTreeBuilder::Get(aBrowsingContextId)) {
    if (builder->BuildStructTree(structRoot)) {
      metadata.fStructureElementTreeRoot = &structRoot;
      metadata.fOutline = SkPDF::Metadata::Outline::StructureElementHeaders;
    }
  }
#endif

  // SkDocument stores a non-owning raw pointer to aStream
  mPDFDoc = SkPDF::MakeDocument(mOStream.get(), metadata);

  return mPDFDoc ? NS_OK : NS_ERROR_FAILURE;
}

nsresult PrintTargetSkPDF::BeginPage(const IntSize& aSizeInPoints) {
  mPageCanvas = mPDFDoc->beginPage(mSize.width, mSize.height);

  return !mPageCanvas ? NS_ERROR_FAILURE
                      : PrintTarget::BeginPage(aSizeInPoints);
}

nsresult PrintTargetSkPDF::EndPage() {
  mPageCanvas = nullptr;
  mPageDT = nullptr;
  return PrintTarget::EndPage();
}

nsresult PrintTargetSkPDF::EndPrinting() {
  mPDFDoc->close();
  if (mRefPDFDoc) {
    mRefPDFDoc->close();
  }
  mPageCanvas = nullptr;
  mPageDT = nullptr;
  return NS_OK;
}

void PrintTargetSkPDF::Finish() {
  if (mIsFinished) {
    return;
  }
  mOStream->flush();
  PrintTarget::Finish();
}

already_AddRefed<DrawTarget> PrintTargetSkPDF::MakeDrawTarget(
    const IntSize& aSize, DrawEventRecorder* aRecorder) {
  if (aRecorder) {
    return PrintTarget::MakeDrawTarget(aSize, aRecorder);
  }
  // MOZ_ASSERT(aSize == mSize, "Should mPageCanvas size match?");
  if (!mPageCanvas) {
    return nullptr;
  }
  mPageDT = Factory::CreateDrawTargetWithSkCanvas(mPageCanvas);
  if (!mPageDT) {
    mPageCanvas = nullptr;
    return nullptr;
  }
  return do_AddRef(mPageDT);
}

already_AddRefed<DrawTarget> PrintTargetSkPDF::GetReferenceDrawTarget() {
  if (!mRefDT) {
    // SkDocument stores a non-owning raw pointer to aStream
    mRefPDFDoc = SkPDF::MakeDocument(&mRefOStream, GetDefaultMetadata());
    if (!mRefPDFDoc) {
      return nullptr;
    }
    mRefCanvas = mRefPDFDoc->beginPage(mSize.width, mSize.height);
    if (!mRefCanvas) {
      return nullptr;
    }
    RefPtr<DrawTarget> dt = Factory::CreateDrawTargetWithSkCanvas(mRefCanvas);
    if (!dt) {
      return nullptr;
    }
    mRefDT = std::move(dt);
  }

  return do_AddRef(mRefDT);
}

}  // namespace mozilla::gfx
