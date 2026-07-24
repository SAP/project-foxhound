/* -*- Mode: C++; tab-width: 20; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "PrintTargetSkPDF.h"

#include "include/core/SkStream.h"
#include "mozilla/gfx/2D.h"
#include "nsString.h"

#include "skia/src/pdf/SkPDFUtils.h"

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

nsresult PrintTargetSkPDF::BeginPrinting(const nsAString& aTitle,
                                         const nsAString& aPrintToFileName,
                                         int32_t aStartPage, int32_t aEndPage) {
  // We need to create the SkPDFDocument here rather than in CreateOrNull
  // because it's only now that we are given aTitle which we want for the
  // PDF metadata.

  NS_ConvertUTF16toUTF8 title(aTitle);
  SkPDF::Metadata metadata;
  metadata.fTitle = SkString(title.get(), title.Length());
  metadata.fCreator = "Firefox";
  SkPDF::DateTime now = {0};
  SkPDFUtils::GetDateTime(&now);
  metadata.fCreation = now;
  metadata.fModified = now;

  // TODO(emilio, bug 2001912): Provide jpeg decoder / encoders for SkPdf?
  metadata.allowNoJpegs = true;

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
    SkPDF::Metadata metadata;
    metadata.allowNoJpegs = true;
    // SkDocument stores a non-owning raw pointer to aStream
    mRefPDFDoc = SkPDF::MakeDocument(&mRefOStream, metadata);
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
