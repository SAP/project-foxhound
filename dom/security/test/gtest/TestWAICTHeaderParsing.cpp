/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "mozilla/dom/IntegrityPolicyWAICT.h"
#include "mozilla/gtest/MozAssertions.h"
#include "nsString.h"

using namespace mozilla::dom;

// Tests for IntegrityPolicyWAICT::ParseHeader, which parses the value of the
// Integrity-Policy-WAICT-v1 HTTP response header.
//
// Websites signal that they want user-agents to enforce WAICT through the use
// of the HTTP response header: Integrity-Policy-WAICT-v1.
//
// The header is a structured response header (Dictionary type per RFC 9651).
// The following key-value pairs MUST be present:
//   max-age - An sf-integer that MUST be >= 0. How long (in seconds)
//     user-agents MUST enforce WAICT after seeing this header.
//   mode - An sf-token containing either "enforce" or "report". In enforce
//     mode, subresources that fail integrity checks are blocked. In report
//     mode, failures are reported but resources are still loaded.
//   manifest - An sf-string containing a URL where the user-agent can fetch
//     the WAICT manifest. The URL MAY be relative.
//   blocked-destinations - An sf-inner-list of one or more sf-tokens
//     indicating the destination types (e.g., script, style) to which
//     integrity checks apply. Unrecognized tokens MUST be ignored.
//
// If one or more mandatory keys is missing or invalid, the entire header MUST
// be ignored. The following key-value pairs are optional:
//   preload - An sf-boolean. Not used directly by user-agents.
//   endpoints - Indicates endpoint(s) for submitting violations.
//
// Any other keys MUST be ignored.
//
// Example:
//   Integrity-Policy-WAICT-v1: max-age=90, mode=report,
//     blocked-destinations=(script style), preload=?0,
//     endpoints=(foo-reports),
//     manifest="/.well-known/waict/manifests/1.json"
//
// Tests are organized by field. For each field we test valid values, missing
// (required vs optional), and invalid values where applicable.

class WAICTHeaderParsingTest : public ::testing::Test {
 protected:
  nsresult ParseHeader(const nsACString& aHeader) {
    RefPtr<IntegrityPolicyWAICT> policy = new IntegrityPolicyWAICT(nullptr);
    return policy->ParseHeader(aHeader);
  }
};

// Manifest:
// An sf-string containing a URL where the user-agent can fetch the
// WAICT manifest. The URL MAY be relative, in which case it is resolved
// against the origin.

TEST_F(WAICTHeaderParsingTest, Manifest_RelativeURL) {
  EXPECT_NS_SUCCEEDED(
      ParseHeader("manifest=\"waict-manifest.json\", max-age=0, mode=enforce, "
                  "blocked-destinations=(script)"_ns));
}

TEST_F(WAICTHeaderParsingTest, Manifest_AbsoluteURL) {
  EXPECT_NS_SUCCEEDED(ParseHeader(
      "manifest=\"https://example.com/waict-manifest.json\", max-age=0, "
      "mode=enforce, blocked-destinations=(script)"_ns));
}

TEST_F(WAICTHeaderParsingTest, Manifest_Missing) {
  EXPECT_NS_FAILED(ParseHeader(
      "max-age=86400, mode=enforce, blocked-destinations=(script)"_ns));
}

TEST_F(WAICTHeaderParsingTest, Manifest_Empty) {
  EXPECT_NS_FAILED(
      ParseHeader("manifest=\"\", max-age=86400, mode=enforce, "
                  "blocked-destinations=(script)"_ns));
}

TEST_F(WAICTHeaderParsingTest, Manifest_AsToken) {
  EXPECT_NS_FAILED(
      ParseHeader("manifest=waict-manifest.json, max-age=86400, mode=enforce, "
                  "blocked-destinations=(script)"_ns));
}

// max-age - An sf-integer indicating the number of seconds the policy is
// valid. Must be a non-negative integer.

TEST_F(WAICTHeaderParsingTest, MaxAge_Valid) {
  EXPECT_NS_SUCCEEDED(ParseHeader(
      "manifest=\"waict-manifest.json\", max-age=86400, mode=enforce, "
      "blocked-destinations=(script)"_ns));
}

TEST_F(WAICTHeaderParsingTest, MaxAge_Zero) {
  EXPECT_NS_SUCCEEDED(
      ParseHeader("manifest=\"waict-manifest.json\", max-age=0, mode=enforce, "
                  "blocked-destinations=(script)"_ns));
}

TEST_F(WAICTHeaderParsingTest, MaxAge_Missing) {
  EXPECT_NS_FAILED(
      ParseHeader("manifest=\"waict-manifest.json\", mode=enforce, "
                  "blocked-destinations=(script)"_ns));
}

TEST_F(WAICTHeaderParsingTest, MaxAge_Negative) {
  EXPECT_NS_FAILED(
      ParseHeader("manifest=\"waict-manifest.json\", max-age=-1, mode=enforce, "
                  "blocked-destinations=(script)"_ns));
}

// mode - An sf-token with value "enforce" or "report".

TEST_F(WAICTHeaderParsingTest, Mode_Enforce) {
  EXPECT_NS_SUCCEEDED(
      ParseHeader("manifest=\"waict-manifest.json\", max-age=0, mode=enforce, "
                  "blocked-destinations=(script)"_ns));
}

TEST_F(WAICTHeaderParsingTest, Mode_Report) {
  EXPECT_NS_SUCCEEDED(
      ParseHeader("manifest=\"waict-manifest.json\", max-age=0, mode=report, "
                  "blocked-destinations=(script)"_ns));
}

TEST_F(WAICTHeaderParsingTest, Mode_Missing) {
  EXPECT_NS_FAILED(
      ParseHeader("manifest=\"waict-manifest.json\", max-age=86400, "
                  "blocked-destinations=(script)"_ns));
}

TEST_F(WAICTHeaderParsingTest, Mode_Invalid) {
  EXPECT_NS_FAILED(ParseHeader(
      "manifest=\"waict-manifest.json\", max-age=86400, mode=block, "
      "blocked-destinations=(script)"_ns));
}

// mode must be an SFV token (unquoted), not a string.
TEST_F(WAICTHeaderParsingTest, Mode_AsString) {
  EXPECT_NS_FAILED(ParseHeader(
      "manifest=\"waict-manifest.json\", max-age=86400, mode=\"enforce\", "
      "blocked-destinations=(script)"_ns));
}

// blocked-destinations - An sf-inner-list of one or more sf-tokens indicating
// the destination types to which integrity checks apply. Unrecognised tokens
// MUST be ignored.

TEST_F(WAICTHeaderParsingTest, BlockedDestinations_Script) {
  EXPECT_NS_SUCCEEDED(
      ParseHeader("manifest=\"waict-manifest.json\", max-age=0, mode=enforce, "
                  "blocked-destinations=(script)"_ns));
}

TEST_F(WAICTHeaderParsingTest, BlockedDestinations_Multiple) {
  EXPECT_NS_SUCCEEDED(
      ParseHeader("manifest=\"waict-manifest.json\", max-age=0, mode=enforce, "
                  "blocked-destinations=(script image)"_ns));
}

TEST_F(WAICTHeaderParsingTest, BlockedDestinations_ScriptAndUnrecognised) {
  EXPECT_NS_SUCCEEDED(
      ParseHeader("manifest=\"waict-manifest.json\", max-age=0, mode=enforce, "
                  "blocked-destinations=(script cat)"_ns));
}

TEST_F(WAICTHeaderParsingTest, BlockedDestinations_Empty) {
  EXPECT_NS_SUCCEEDED(ParseHeader(
      "manifest=\"waict-manifest.json\", max-age=86400, mode=enforce, "
      "blocked-destinations=()"_ns));
}

TEST_F(WAICTHeaderParsingTest, BlockedDestinations_Missing) {
  EXPECT_NS_FAILED(ParseHeader(
      "manifest=\"waict-manifest.json\", max-age=86400, mode=enforce"_ns));
}

// endpoints - Optional. Indicates endpoint(s) for submitting violations.

TEST_F(WAICTHeaderParsingTest, Endpoints_Present) {
  EXPECT_NS_SUCCEEDED(
      ParseHeader("manifest=\"waict-manifest.json\", max-age=0, mode=enforce, "
                  "blocked-destinations=(script), endpoints=(default)"_ns));
}

TEST_F(WAICTHeaderParsingTest, Endpoints_Multiple) {
  EXPECT_NS_SUCCEEDED(ParseHeader(
      "manifest=\"waict-manifest.json\", max-age=0, mode=enforce, "
      "blocked-destinations=(script), endpoints=(default other)"_ns));
}

TEST_F(WAICTHeaderParsingTest, Endpoints_Zero) {
  EXPECT_NS_SUCCEEDED(
      ParseHeader("manifest=\"waict-manifest.json\", max-age=0, mode=enforce, "
                  "blocked-destinations=(script), endpoints=()"_ns));
}

TEST_F(WAICTHeaderParsingTest, Endpoints_Missing) {
  EXPECT_NS_SUCCEEDED(
      ParseHeader("manifest=\"waict-manifest.json\", max-age=0, mode=enforce, "
                  "blocked-destinations=(script)"_ns));
}

// preload - Optional. An sf-boolean indicating the site wants to enforce WAICT
// via a preload list. Not used directly by user-agents.

TEST_F(WAICTHeaderParsingTest, Preload_Missing) {
  EXPECT_NS_SUCCEEDED(
      ParseHeader("manifest=\"waict-manifest.json\", max-age=0, mode=enforce, "
                  "blocked-destinations=(script)"_ns));
}

// General

// The entire header must be rejected if it is not valid SFV.
TEST_F(WAICTHeaderParsingTest, MalformedSFV) {
  EXPECT_NS_FAILED(ParseHeader("not valid sfv !!!"_ns));
}

TEST_F(WAICTHeaderParsingTest, EmptyHeader) {
  EXPECT_NS_FAILED(ParseHeader(""_ns));
}
