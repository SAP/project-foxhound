/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_QUOTA_ORIGINPARSER_H_
#define DOM_QUOTA_ORIGINPARSER_H_

#include "mozilla/Attributes.h"
#include "mozilla/dom/Nullable.h"
#include "nsCharSeparatedTokenizer.h"
#include "nsString.h"
#include "nsTArray.h"

namespace mozilla {

class OriginAttributes;
class OriginAttributesPattern;

namespace dom::quota {

class MOZ_STACK_CLASS OriginParser final {
 public:
  enum ResultType { InvalidOrigin, ObsoleteOrigin, ValidOrigin };

 private:
  using Tokenizer =
      nsCCharSeparatedTokenizerTemplate<NS_TokenizerIgnoreNothing>;

  enum SchemeType { eNone, eFile, eAbout, eChrome };

  enum State {
    eExpectingAppIdOrScheme,
    eExpectingInMozBrowser,
    eExpectingScheme,
    eExpectingEmptyToken1,
    eExpectingEmptyToken2,
    eExpectingEmptyTokenOrUniversalFileOrigin,
    eExpectingHost,
    eExpectingPort,
    eExpectingEmptyTokenOrDriveLetterOrPathnameComponent,
    eExpectingEmptyTokenOrPathnameComponent,
    eExpectingEmptyToken1OrHost,

    // We transit from eExpectingHost to this state when we encounter a host
    // beginning with "[" which indicates an IPv6 literal. Because we mangle the
    // IPv6 ":" delimiter to be a "+", we will receive separate tokens for each
    // portion of the IPv6 address, including a final token that ends with "]".
    // (Note that we do not mangle "[" or "]".) Note that the URL spec
    // explicitly disclaims support for "<zone_id>" and so we don't have to deal
    // with that.
    eExpectingIPV6Token,
    eComplete,
    eHandledTrailingSeparator
  };

  const nsCString mOrigin;
  Tokenizer mTokenizer;

  nsCString mScheme;
  nsCString mHost;
  Nullable<uint32_t> mPort;
  nsTArray<nsCString> mPathnameComponents;
  nsCString mHandledTokens;

  SchemeType mSchemeType;
  State mState;
  bool mUniversalFileOrigin;
  bool mMaybeDriveLetter;
  bool mError;
  bool mMaybeObsolete;

  // Number of group which a IPv6 address has. Should be less than 9.
  uint8_t mIPGroup;

 public:
  explicit OriginParser(const nsACString& aOrigin)
      : mOrigin(aOrigin),
        mTokenizer(aOrigin, '+'),
        mSchemeType(eNone),
        mState(eExpectingAppIdOrScheme),
        mUniversalFileOrigin(false),
        mMaybeDriveLetter(false),
        mError(false),
        mMaybeObsolete(false),
        mIPGroup(0) {}

  static ResultType ParseOrigin(const nsACString& aOrigin, nsCString& aSpec,
                                OriginAttributes* aAttrs,
                                nsCString& aOriginalSuffix);

  ResultType Parse(nsACString& aSpec);

 private:
  void HandleScheme(const nsDependentCSubstring& aToken);

  void HandlePathnameComponent(const nsDependentCSubstring& aToken);

  void HandleToken(const nsDependentCSubstring& aToken);

  void HandleTrailingSeparator();
};

bool IsUUIDOrigin(const nsCString& aOrigin);

/**
 * Checks whether the given origin attributes suffix corresponds to a specific
 * user context, based on the provided `userContextId` value.
 *
 * This function parses the input suffix into an `OriginAttributes` object
 * and evaluates the `userContextId` attribute. If the attribute matches the
 * given `aUserContextId`, the suffix is considered to belong to that user
 * context. Other attributes in the suffix are ignored.
 *
 * @param aSuffix The origin attributes suffix to check. This must be a valid
 *   suffix; otherwise, the code will trigger an assertion failure.
 * @param aUserContextId The `userContextId` value to compare against the
 *   attribute in the suffix.
 *
 * @return `true` if the `userContextId` attribute matches `aUserContextId`,
 * `false` otherwise.
 *
 * @note The input must be a valid suffix. Invalid inputs will cause a
 * diagnostic assertion failure because of `MOZ_ALWAYS_TRUE`.
 */
bool IsUserContextSuffix(const nsACString& aSuffix, uint32_t aUserContextId);

/**
 * Checks whether the given `OriginAttributesPattern` matches a specific
 * user context, based on the provided `userContextId`.
 *
 * This function evaluates the `mUserContextId` attribute of the provided
 * pattern. If the attribute is not set (`WasPassed` returns false), the
 * function returns `false`. If it is set, the function compares its value
 * against the specified `aUserContextId`.
 *
 * @param aPattern The `OriginAttributesPattern` to check.
 * @param aUserContextId The expected `userContextId` to compare against
 *   the `mUserContextId` attribute in the pattern.
 *
 * @return `true` if `mUserContextId` is set and matches `aUserContextId`,
 * `false` otherwise.
 */
bool IsUserContextPattern(const OriginAttributesPattern& aPattern,
                          uint32_t aUserContextId);

}  // namespace dom::quota
}  // namespace mozilla

#endif  // DOM_QUOTA_ORIGINPARSER_H_
