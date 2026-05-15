/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <ostream>

#include "gtest/gtest-param-test.h"
#include "gtest/gtest.h"

#include "mozilla/gtest/MozAssertions.h"
#include "nsNetUtil.h"

using namespace mozilla::net;

struct TestData {
  bool mResult;
  const nsCString mHeader;
  // output to match:
  const nsCString mMatchVal;
  const nsCString mMatchIdVal;
  const nsCString mTypeVal;
  // matchDestVal ends with ""_ns
  const nsCString mMatchDestVal[5];
};

TEST(TestUseAsDictionary, Match)
{
  // Note: we're not trying to test Structured Fields
  // (https://datatracker.ietf.org/doc/html/rfc8941) here, but the data within
  // it, so generally we aren't looking for format errors
  const struct TestData gTestArray[] = {
      {true,
       "match=\"/app/*/main.js\""_ns,
       "/app/*/main.js"_ns,
       ""_ns,
       ""_ns,
       {""_ns}},
      {true,
       "match=\"/app/*/main.js\", id=\"some_id\""_ns,
       "/app/*/main.js"_ns,
       "some_id"_ns,
       ""_ns,
       {""_ns}},
      // match= is required
      {false, "id=\"some_id\""_ns, ""_ns, "some_id"_ns, ""_ns, {""_ns}},
      {true,
       "match=\"/app/*/main.js\", id=\"some_id\", type=raw"_ns,
       "/app/*/main.js"_ns,
       "some_id"_ns,
       "raw"_ns,
       {""_ns}},
      // only raw is supported for type
      {false,
       "match=\"/app/*/main.js\", id=\"some_id\", type=not_raw"_ns,
       "/app/*/main.js"_ns,
       "some_id"_ns,
       "raw"_ns,
       {""_ns}},
      {true,
       "match=\"/app/*/main.js\", id=\"some_id\", match-dest=(\"style\")"_ns,
       "/app/*/main.js"_ns,
       "some_id"_ns,
       ""_ns,
       {"style"_ns, ""_ns}},
      {true,
       "match=\"/app/*/main.js\", id=\"some_id\", match-dest=(\"style\"), type=raw"_ns,
       "/app/*/main.js"_ns,
       "some_id"_ns,
       "raw"_ns,
       {"style"_ns, ""_ns}},
      {true,
       "match=\"/app/*/main.js\", id=\"some_id\", match-dest=(\"style\" \"document\"), type=raw"_ns,
       "/app/*/main.js"_ns,
       "some_id"_ns,
       "raw"_ns,
       {"style"_ns, "document"_ns, ""_ns}},
      // adding the comma after style is a syntax error for structured fields
      {false,
       "match=\"/app/*/main.js\", id=\"some_id\", match-dest=(\"style\", \"document\"), type=raw"_ns,
       "/app/*/main.js"_ns,
       "some_id"_ns,
       "raw"_ns,
       {"style"_ns, "document"_ns, ""_ns}},
      // --- Additional tests for spec compliance and edge cases ---
      // 1. Missing quotes around match value
      {false,
       "match=/app/*/main.js, id=\"id1\""_ns,
       ""_ns,
       "id1"_ns,
       ""_ns,
       {""_ns}},
      // 2. Extra unknown parameter
      {true,
       "match=\"/foo.js\", foo=bar"_ns,
       "/foo.js"_ns,
       ""_ns,
       ""_ns,
       {""_ns}},
      // 3. Whitespace variations
      {true,
       "  match=\"/foo.js\" , id=\"id2\"  "_ns,
       "/foo.js"_ns,
       "id2"_ns,
       ""_ns,
       {""_ns}},
      // 4. Empty match value
      {false, "match=\"\""_ns, ""_ns, ""_ns, ""_ns, {""_ns}},
      // 5. Duplicate match parameter (should use the last)
      {true,
       "match=\"/foo.js\", match=\"/bar.js\""_ns,
       "/bar.js"_ns,
       ""_ns,
       ""_ns,
       {""_ns}},
      // 6. Duplicate id parameter (should use the last)
      {true,
       "match=\"/foo.js\", id=\"id1\", id=\"id2\""_ns,
       "/foo.js"_ns,
       "id2"_ns,
       ""_ns,
       {""_ns}},
      // 7. Parameter order: id before match
      {true,
       "id=\"id3\", match=\"/foo.js\""_ns,
       "/foo.js"_ns,
       "id3"_ns,
       ""_ns,
       {""_ns}},
      // 8. Non-raw type (should fail)
      {false,
       "match=\"/foo.js\", type=compressed"_ns,
       "/foo.js"_ns,
       ""_ns,
       "raw"_ns,
       {""_ns}},
      // 9. Empty header
      {false, ""_ns, ""_ns, ""_ns, ""_ns, {""_ns}},
      // 10. match-dest with empty list
      {true,
       "match=\"/foo.js\", match-dest=()"_ns,
       "/foo.js"_ns,
       ""_ns,
       ""_ns,
       {""_ns}},
      // 11. match-dest with whitespace and multiple values
      {true,
       "match=\"/foo.js\", match-dest=( \"a\"  \"b\"  )"_ns,
       "/foo.js"_ns,
       ""_ns,
       ""_ns,
       {"a"_ns, "b"_ns, ""_ns}},
      // 12. match-dest with invalid value (missing quotes)
      {false,
       "match=\"/foo.js\", match-dest=(a)"_ns,
       "/foo.js"_ns,
       ""_ns,
       ""_ns,
       {""_ns}},
      // 13. match-dest with duplicate values
      {true,
       "match=\"/foo.js\", match-dest=(\"a\" \"a\")"_ns,
       "/foo.js"_ns,
       ""_ns,
       ""_ns,
       {"a"_ns, "a"_ns, ""_ns}},
      // 14. Case sensitivity: type=RAW (should fail, only 'raw' allowed)
      {false,
       "match=\"/foo.js\", type=RAW"_ns,
       "/foo.js"_ns,
       ""_ns,
       "raw"_ns,
       {""_ns}},

      // Note: Structured Fields requires all input to be ASCII

      // 18. match-dest with trailing whitespace
      {true,
       "match=\"/foo.js\", match-dest=(\"a\" )"_ns,
       "/foo.js"_ns,
       ""_ns,
       ""_ns,
       {"a"_ns, ""_ns}},
      // 19. match-dest with only whitespace in list (should be empty)
      {true,
       "match=\"/foo.js\", match-dest=(   )"_ns,
       "/foo.js"_ns,
       ""_ns,
       ""_ns,
       {""_ns}},
      // 20. match-dest with comma and whitespace (invalid)
      {false,
       "match=\"/foo.js\", match-dest=(\"a\", \"b\")"_ns,
       "/foo.js"_ns,
       ""_ns,
       ""_ns,
       {"a"_ns, "b"_ns, ""_ns}},
  };

  for (auto& test : gTestArray) {
    nsCString match, matchId, type;
    nsTArray<nsCString> matchDest;
    nsTArray<nsCString> matchDestVal;

    for (auto& dest : test.mMatchDestVal) {
      if (dest.IsEmpty()) {
        break;
      }
      matchDestVal.AppendElement(dest);
    }

    fprintf(stderr, "Testing %s\n", test.mHeader.get());
    ASSERT_EQ(
        NS_ParseUseAsDictionary(test.mHeader, match, matchId, matchDest, type),
        test.mResult);

    if (test.mResult) {
      ASSERT_EQ(match, test.mMatchVal);
      ASSERT_EQ(matchId, test.mMatchIdVal);
      ASSERT_EQ(matchDest.Length(), matchDestVal.Length());
      for (size_t i = 0; i < matchDest.Length(); i++) {
        ASSERT_EQ(matchDest[i], matchDestVal[i]);
      }
      ASSERT_EQ(type, test.mTypeVal);
    }
  }
}
