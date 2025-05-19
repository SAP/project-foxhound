/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSPViolationData.h"

#include "nsCharTraits.h"
#include "nsContentUtils.h"
#include "mozilla/dom/Element.h"
#include "mozilla/dom/nsCSPContext.h"

#include <utility>

namespace mozilla::dom {

static nsString MaybeTruncateSample(const nsAString& aSample) {
  nsString sample{aSample};
  // Truncate sample string.
  uint32_t length = sample.Length();
  if (length > nsCSPContext::ScriptSampleMaxLength()) {
    uint32_t desiredLength = nsCSPContext::ScriptSampleMaxLength();
    // Don't cut off right before a low surrogate. Just include it.
    if (NS_IS_LOW_SURROGATE(sample[desiredLength])) {
      desiredLength++;
    }
    sample.Replace(nsCSPContext::ScriptSampleMaxLength(),
                   length - desiredLength,
                   nsContentUtils::GetLocalizedEllipsis());
  }
  return sample;
}

CSPViolationData::CSPViolationData(uint32_t aViolatedPolicyIndex,
                                   Resource&& aResource,
                                   const CSPDirective aEffectiveDirective,
                                   const nsACString& aSourceFile,
                                   uint32_t aLineNumber, uint32_t aColumnNumber,
                                   Element* aElement, const nsAString& aSample)
    : mViolatedPolicyIndex{aViolatedPolicyIndex},
      mResource{std::move(aResource)},
      mEffectiveDirective{aEffectiveDirective},
      mSourceFile{aSourceFile},
      mLineNumber{aLineNumber},
      mColumnNumber{aColumnNumber},
      mElement{aElement},
      mSample{MaybeTruncateSample(aSample)} {}

// Required for `mElement`, since its destructor requires a definition of
// `Element`.
CSPViolationData::~CSPViolationData() = default;

auto CSPViolationData::BlockedContentSourceOrUnknown() const
    -> BlockedContentSource {
  return mResource.is<CSPViolationData::BlockedContentSource>()
             ? mResource.as<CSPViolationData::BlockedContentSource>()
             : CSPViolationData::BlockedContentSource::Unknown;
}
}  // namespace mozilla::dom
