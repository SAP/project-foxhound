/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/StringBuffer.h"

#include "jsapi.h"

#include "gc/Zone.h"
#include "js/String.h"
#include "jsapi-tests/tests.h"
#include "util/Text.h"

// Foxhound: the ExternalStringCache must not return a tainted JSString for a
// new conversion of the same characters.
BEGIN_TEST(testStringBufferTaint_CacheSkipsTainted) {
  // Don't purge the ExternalStringCache.
  js::gc::AutoSuppressGC suppress(cx);

  CHECK(checkCacheSkipsTainted(
      "This string is long enough that the JSString shares the StringBuffer",
      true));
  CHECK(checkCacheSkipsTainted("short", false));
  return true;
}

bool checkCacheSkipsTainted(const char* aChars, bool aSharesBuffer) {
  const auto* chars = reinterpret_cast<const JS::Latin1Char*>(aChars);
  size_t len = js_strlen(aChars);

  RefPtr<mozilla::StringBuffer> buffer =
      mozilla::StringBuffer::Create(chars, len);
  CHECK(buffer);

  JS::Rooted<JSString*> tainted(
      cx, JS::NewStringFromKnownLiveLatin1Buffer(cx, buffer, len));
  CHECK(tainted);
  mozilla::StringBuffer* buf;
  CHECK_EQUAL(JS::IsLatin1StringWithStringBuffer(tainted, &buf), aSharesBuffer);
  JS_SetStringTaint(cx, tainted,
                    SafeStringTaint(0, len, TaintOperation("test")));
  CHECK(JS_GetStringTaint(tainted).hasTaint());

  JS::Rooted<JSString*> fresh(
      cx, JS::NewStringFromKnownLiveLatin1Buffer(cx, buffer, len));
  CHECK(fresh);
  CHECK(fresh != tainted);
  CHECK(!JS_GetStringTaint(fresh).hasTaint());

  // Untainted strings are still cached.
  JS::Rooted<JSString*> again(
      cx, JS::NewStringFromKnownLiveLatin1Buffer(cx, buffer, len));
  CHECK_EQUAL(again, fresh);
  return true;
}
END_TEST(testStringBufferTaint_CacheSkipsTainted)
