/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_SECURITY_CSPVIOLATION_H_
#define DOM_SECURITY_CSPVIOLATION_H_

#include <cstdint>

#include "mozilla/RefPtr.h"
#include "mozilla/Variant.h"
#include "nsCOMPtr.h"
#include "nsIContentSecurityPolicy.h"
#include "nsIURI.h"
#include "nsString.h"

class nsIURI;

namespace mozilla::dom {
class Element;

// Represents parts of <https://w3c.github.io/webappsec-csp/#violation>.
// The remaining parts can be deduced from the corresponding nsCSPContext.
struct CSPViolationData {
  enum class BlockedContentSource {
    Unknown,
    Inline,
    Eval,
    Self,
    WasmEval,
    TrustedTypesPolicy,
    TrustedTypesSink,
  };

  using Resource = mozilla::Variant<nsCOMPtr<nsIURI>, BlockedContentSource>;

  // According to https://github.com/w3c/webappsec-csp/issues/442 column- and
  // line-numbers are expected to be 1-origin.
  //
  // @param aSample Will be truncated if necessary.
  // @param aHashSHA256 The source code sha256 hash (encoded as base64) for
  // inline scripts and styles.
  //                    https://w3c.github.io/webappsec-csp/#grammardef-hash-source
  CSPViolationData(uint32_t aViolatedPolicyIndex, Resource&& aResource,
                   const CSPDirective aEffectiveDirective,
                   const nsACString& aSourceFile, uint32_t aLineNumber,
                   uint32_t aColumnNumber, Element* aElement,
                   const nsAString& aSample,
                   const nsACString& aHashSHA256 = ""_ns);

  ~CSPViolationData();

  static const nsDependentSubstring MaybeTruncateSample(
      const nsAString& aSample);
  BlockedContentSource BlockedContentSourceOrUnknown() const;

  uint32_t mViolatedPolicyIndex;
  Resource mResource;
  CSPDirective mEffectiveDirective;
  // String representation of the URL. The empty string represents a null-URL.
  nsCString mSourceFile;
  uint32_t mLineNumber;
  uint32_t mColumnNumber;
  RefPtr<Element> mElement;
  nsString mSample;
  nsCString mHashSHA256;
};
}  // namespace mozilla::dom

#endif  // DOM_SECURITY_CSPVIOLATION_H_
