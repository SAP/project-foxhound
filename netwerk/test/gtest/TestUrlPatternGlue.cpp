/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "gtest/MozGTestBench.h"  // For MOZ_GTEST_BENCH
#include "mozilla/dom/ScriptSettings.h"
#include "mozilla/net/URLPatternGlue.h"
#include "mozilla/net/urlpattern_glue.h"

using namespace mozilla::net;

template <typename T>
using Optional = mozilla::Maybe<T>;

UrlPatternInit CreateInit(const nsCString& protocol, const nsCString& username,
                          const nsCString& password, const nsCString& hostname,
                          const nsCString& port, const nsCString& pathname,
                          const nsCString& search, const nsCString& hash,
                          const nsCString& baseUrl) {
  return UrlPatternInit{
      .protocol = CreateMaybeString(protocol, !protocol.IsEmpty()),
      .username = CreateMaybeString(username, !username.IsEmpty()),
      .password = CreateMaybeString(password, !password.IsEmpty()),
      .hostname = CreateMaybeString(hostname, !hostname.IsEmpty()),
      .port = CreateMaybeString(port, !port.IsEmpty()),
      .pathname = CreateMaybeString(pathname, !pathname.IsEmpty()),
      .search = CreateMaybeString(search, !search.IsEmpty()),
      .hash = CreateMaybeString(hash, !hash.IsEmpty()),
      .base_url = CreateMaybeString(baseUrl, !baseUrl.IsEmpty()),
  };
}

UrlPatternInit CreateSimpleInit(const nsCString& protocol,
                                const nsCString& hostname,
                                const nsCString& pathname) {
  return CreateInit(protocol, ""_ns, ""_ns, hostname, ""_ns, pathname, ""_ns,
                    ""_ns, ""_ns);
}

UrlPatternInit CreateInit(const char* protocol, const char* username,
                          const char* password, const char* hostname,
                          const char* port, const char* pathname,
                          const char* search, const char* hash,
                          const char* base = "") {
  return CreateInit(nsCString(protocol), nsCString(username),
                    nsCString(password), nsCString(hostname), nsCString(port),
                    nsCString(pathname), nsCString(search), nsCString(hash),
                    nsCString(base));
}

TEST(TestUrlPatternGlue, PatternFromStringOnlyPathname)
{
  nsCString str("/foo/thing");
  UrlPatternGlue pattern{};
  UrlPatternOptions options = {.ignore_case = false};
  bool res =
      urlpattern_parse_pattern_from_string(&str, nullptr, options, &pattern);
  ASSERT_FALSE(res);
  ASSERT_FALSE(pattern);
}

TEST(TestUrlPatternGlue, PatternFromString)
{
  nsCString str(":café://:foo");
  UrlPatternGlue pattern{};
  UrlPatternOptions options = {.ignore_case = false};
  bool res =
      urlpattern_parse_pattern_from_string(&str, nullptr, options, &pattern);
  ASSERT_TRUE(res);
  ASSERT_TRUE(pattern);
}

// pattern construction from init
TEST(TestUrlPatternGlue, PatternFromInit)
{
  UrlPatternGlue pattern{};
  UrlPatternOptions options = {.ignore_case = false};
  UrlPatternInit init = CreateSimpleInit("https"_ns, "example.com"_ns, "/"_ns);
  bool res = urlpattern_parse_pattern_from_init(&init, options, &pattern);
  ASSERT_TRUE(res);
  ASSERT_TRUE(pattern);

  auto proto = UrlPatternGetProtocol(pattern);
  ASSERT_EQ(proto, "https"_ns);
}

TEST(TestUrlPatternGlue, PatternFromInitOnlyPathname)
{
  UrlPatternGlue pattern{};
  UrlPatternOptions options = {.ignore_case = false};
  UrlPatternInit init = CreateSimpleInit(""_ns, ""_ns, "/foo/thing"_ns);
  bool res = urlpattern_parse_pattern_from_init(&init, options, &pattern);
  ASSERT_TRUE(res);
  ASSERT_TRUE(pattern);

  auto proto = UrlPatternGetProtocol(pattern);
  ASSERT_EQ(proto, nsCString("*"));
  auto host = UrlPatternGetHostname(pattern);
  ASSERT_EQ(host, nsCString("*"));
  auto path = UrlPatternGetPathname(pattern);
  ASSERT_EQ(path, nsCString("/foo/thing"));

  Optional<nsAutoCString> execBaseUrl;  // None
  UrlPatternInput input = CreateUrlPatternInput(init);
  Optional<UrlPatternResult> r = UrlPatternExec(pattern, input, execBaseUrl);
  ASSERT_TRUE(r.isSome());
  ASSERT_TRUE(r->mProtocol.isSome());
  ASSERT_EQ(r->mProtocol.value().mInput, nsCString(""));
  ASSERT_TRUE(r->mPathname.isSome());
  ASSERT_EQ(r->mPathname.value().mInput, "/foo/thing"_ns);
}

// pattern getters
TEST(TestUrlPatternGlue, UrlPatternGetters)
{
  UrlPatternGlue pattern{};
  UrlPatternOptions options = {.ignore_case = false};

  UrlPatternInit init =
      CreateInit("https"_ns, "user"_ns, "passw"_ns, "example.com"_ns, "66"_ns,
                 "/"_ns, "find"_ns, "anchor"_ns, ""_ns);
  bool rv = urlpattern_parse_pattern_from_init(&init, options, &pattern);
  ASSERT_TRUE(rv);
  ASSERT_TRUE(pattern);

  nsAutoCString res;
  res = UrlPatternGetProtocol(pattern);
  ASSERT_EQ(res, nsCString("https"));
  res = UrlPatternGetUsername(pattern);
  ASSERT_EQ(res, nsCString("user"));
  res = UrlPatternGetPassword(pattern);
  ASSERT_EQ(res, nsCString("passw"));
  res = UrlPatternGetHostname(pattern);
  ASSERT_EQ(res, nsCString("example.com"));
  res = UrlPatternGetPort(pattern);
  ASSERT_EQ(res, nsCString("66"));
  res = UrlPatternGetPathname(pattern);
  ASSERT_EQ(res, nsCString("/"));
  res = UrlPatternGetSearch(pattern);
  ASSERT_EQ(res, nsCString("find"));
  res = UrlPatternGetHash(pattern);
  ASSERT_EQ(res, nsCString("anchor"));
  // neither lib or quirks URLPattern has base_url so nothing to check
}

// UrlPattern.test() from_init
TEST(TestUrlPatternGlue, UrlPatternTestInit)
{
  // check basic literal matching (minimal fields)
  {
    UrlPatternGlue pattern{};
    UrlPatternOptions options = {.ignore_case = false};
    UrlPatternInit init =
        CreateSimpleInit("https"_ns, "example.com"_ns, "/"_ns);
    bool res = urlpattern_parse_pattern_from_init(&init, options, &pattern);
    ASSERT_TRUE(res);

    Optional<nsCString> base;
    {  // path not fixed up (?)
      auto test = CreateUrlPatternInput(
          CreateSimpleInit("https"_ns, "example.com"_ns, ""_ns));
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {
      auto test = CreateUrlPatternInput(
          CreateSimpleInit("https"_ns, "example.com"_ns, "/"_ns));
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {  // unspecified user and password is fine
      auto test = CreateUrlPatternInput(
          CreateInit("https", "user", "pass", "example.com", "", "/", "", ""));
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {  // unspecified port is fine
      auto test = CreateUrlPatternInput(
          CreateInit("https", "", "", "example.com", "444", "/", "", ""));
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {  // unspecified search is fine
      auto test = CreateUrlPatternInput(
          CreateInit("https", "", "", "example.com", "", "/", "thisok", ""));
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {  // unspecified hash is fine
      auto test = CreateUrlPatternInput(
          CreateInit("https", "", "", "example.com", "", "/", "", "thisok"));
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {  // pathname different
      auto test = CreateUrlPatternInput(
          CreateSimpleInit("https"_ns, "example.com"_ns, "/a"_ns));
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {  // scheme different
      auto test = CreateUrlPatternInput(
          CreateSimpleInit("http"_ns, "example.com"_ns, "/"_ns));
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {  // domain different
      auto test = CreateUrlPatternInput(
          CreateSimpleInit("https"_ns, "example.org"_ns, "/"_ns));
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
  }

  // check basic literal matching
  {
    UrlPatternGlue pattern{};
    UrlPatternOptions options = {.ignore_case = false};
    auto init =
        CreateInit("https"_ns, "user"_ns, "anything"_ns, "example.com"_ns,
                   "444"_ns, "/"_ns, "query"_ns, "frag"_ns, ""_ns);
    bool res = urlpattern_parse_pattern_from_init(&init, options, &pattern);
    ASSERT_TRUE(res);

    nsCString anything("anything");
    Optional<nsCString> base;
    {  // exact match
      auto test = CreateUrlPatternInput(init);
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {  // missing protocol
      auto test = CreateUrlPatternInput(CreateInit("", "user", anything.get(),
                                                   "example.com", "444", "/",
                                                   "query", "frag"));
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {  // missing user
      auto test = CreateUrlPatternInput(CreateInit("https", "", anything.get(),
                                                   "example.com", "444", "/",
                                                   "query", "frag"));
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {  // missing password
      auto test = CreateUrlPatternInput(CreateInit(
          "https", "user", "", "example.com", "444", "/", "query", "frag"));
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {  // missing hostname
      auto test = CreateUrlPatternInput(CreateInit(
          "https", "user", anything.get(), "", "444", "/", "query", "frag"));
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {  // missing port
      auto test = CreateUrlPatternInput(
          CreateInit("https", "user", anything.get(), "example.com", "", "/",
                     "query", "frag"));
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {  // missing query
      auto test = CreateUrlPatternInput(
          CreateInit("https", "user", anything.get(), "example.com", "444", "/",
                     "", "frag"));
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {  // missing frag
      auto test = CreateUrlPatternInput(
          CreateInit("https", "user", anything.get(), "example.com", "444", "/",
                     "query", ""));
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
  }

  // check basic url with wildcard
  {
    UrlPatternGlue pattern{};
    UrlPatternOptions options = {.ignore_case = false};
    auto init = CreateSimpleInit("https"_ns, "example.com"_ns, "/*"_ns);
    bool res = urlpattern_parse_pattern_from_init(&init, options, &pattern);
    ASSERT_TRUE(res);

    Optional<nsCString> base;
    {  // root path matches wildcard
      auto test = CreateUrlPatternInput(
          CreateSimpleInit("https"_ns, "example.com"_ns, "/"_ns));
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {  // filename matches wildcard
      auto test = CreateUrlPatternInput(
          CreateSimpleInit("https"_ns, "example.com"_ns, "/thing"_ns));
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {  // dir/filename matches wildcard
      auto test = CreateUrlPatternInput(
          CreateSimpleInit("https"_ns, "example.com"_ns, "/dir/thing"_ns));
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
  }

  // check matching in pathname (needs to be at least two slashes)
  {
    UrlPatternGlue pattern{};
    UrlPatternOptions options = {.ignore_case = false};
    auto init =
        CreateSimpleInit("https"_ns, "example.com"_ns, "/:category/*"_ns);
    bool res = urlpattern_parse_pattern_from_init(&init, options, &pattern);
    ASSERT_TRUE(res);

    Optional<nsCString> base;
    {  // no directory and not enough slashes
      auto test = CreateUrlPatternInput(
          CreateSimpleInit("https"_ns, "example.com"_ns, "/"_ns));
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {  // no directory
      auto test = CreateUrlPatternInput(
          CreateSimpleInit("https"_ns, "example.com"_ns, "//"_ns));
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {  // not enough slashes
      auto test = CreateUrlPatternInput(
          CreateSimpleInit("https"_ns, "example.com"_ns, "/products"_ns));
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {  // dir/ works
      auto test = CreateUrlPatternInput(
          CreateSimpleInit("https"_ns, "example.com"_ns, "/products/"_ns));
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {  // diretory/filename
      auto test = CreateUrlPatternInput(
          CreateSimpleInit("https"_ns, "example.com"_ns, "/blog/thing"_ns));
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {  // nested directory
      auto test = CreateUrlPatternInput(
          CreateSimpleInit("https"_ns, "example.com"_ns, "/blog/thing/"_ns));
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
  }

  // check optional `s` in protocol
  {
    UrlPatternGlue pattern{};
    UrlPatternOptions options = {.ignore_case = false};
    auto init = CreateSimpleInit("http{s}?"_ns, "example.com"_ns, "/"_ns);
    bool res = urlpattern_parse_pattern_from_init(&init, options, &pattern);
    ASSERT_TRUE(res);

    Optional<nsCString> base;
    {  // insecure matches
      auto test = CreateUrlPatternInput(
          CreateSimpleInit("http"_ns, "example.com"_ns, "/"_ns));
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {  // secure matches
      auto test = CreateUrlPatternInput(
          CreateSimpleInit("https"_ns, "example.com"_ns, "/"_ns));
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
  }

  // basic relative wildcard path with base domain
  {
    UrlPatternGlue pattern{};
    UrlPatternOptions options = {.ignore_case = false};
    auto init = CreateInit(""_ns, ""_ns, ""_ns, ""_ns, ""_ns, "/admin/*"_ns,
                           ""_ns, ""_ns, "https://example.com"_ns);
    bool res = urlpattern_parse_pattern_from_init(&init, options, &pattern);
    ASSERT_TRUE(res);

    Optional<nsCString> base;
    {
      auto test = CreateUrlPatternInput(
          CreateSimpleInit("https"_ns, "example.com"_ns, "/admin/"_ns));
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {
      auto test = CreateUrlPatternInput(
          CreateSimpleInit("https"_ns, "example.com"_ns, "/admin/thing"_ns));
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {  // incorrect relative path doesn't match
      //
      auto test = CreateUrlPatternInput(
          CreateSimpleInit("https"_ns, "example.com"_ns, "/nonadmin/"_ns));
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {  // root path not matching relative path doesn't match
      auto test = CreateUrlPatternInput(
          CreateSimpleInit("https"_ns, "example.com"_ns, "/"_ns));
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
  }
}

// UrlPattern.test() from_string
TEST(TestUrlPatternGlue, UrlPatternTestString)
{
  // check basic literal matching (minimal fields)
  {
    nsCString str("https://example.com/");
    UrlPatternGlue pattern{};
    UrlPatternOptions options = {.ignore_case = false};
    bool res =
        urlpattern_parse_pattern_from_string(&str, nullptr, options, &pattern);
    ASSERT_TRUE(res);

    Optional<nsCString> base;
    {  // path fixed up "/"
      auto test = CreateUrlPatternInput("https://example.com"_ns);
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {
      auto test = CreateUrlPatternInput("https://example.com/"_ns);
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {  // unspecified user and password is fine
      auto test = CreateUrlPatternInput("https://user:passw@example.com"_ns);
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {  // unspecified port is empty so 444 doesn't match
      auto test = CreateUrlPatternInput("https://example.com:444/"_ns);
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {  // unspecified search is fine
      auto test = CreateUrlPatternInput("https://example.com/?thisok"_ns);
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {  // unspecified hash is fine
      auto test = CreateUrlPatternInput("https://example.com/#thisok"_ns);
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {  // pathname different
      auto test = CreateUrlPatternInput("https://example.com/a"_ns);
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {  // scheme different
      auto test = CreateUrlPatternInput("http://example.com/"_ns);
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {  // domain different
      auto test = CreateUrlPatternInput("http://example.org"_ns);
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
  }

  // check basic literal matching (all fields, except password)
  // because user:pass is parsed as: `username: user:pass, password: *`
  // when pattern is from_string
  {
    nsCString str("https://user:*@example.com:444/?query#frag");
    UrlPatternGlue pattern{};
    UrlPatternOptions options = {.ignore_case = false};
    nsCString baseUrl("");
    bool res =
        urlpattern_parse_pattern_from_string(&str, &baseUrl, options, &pattern);
    ASSERT_TRUE(res);

    Optional<nsCString> base;
    {  // exact match, except password
      auto test = CreateUrlPatternInput(
          "https://user:anything@example.com:444/?query#frag"_ns);
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {  // missing protocol
      auto test =
          CreateUrlPatternInput("user:anything@example.com:444/?query#frag"_ns);
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {  // missing user
      auto test = CreateUrlPatternInput(
          "https://:anything@example.com:444/?query#frag"_ns);
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {  // missing password is fine
      auto test =
          CreateUrlPatternInput("https://user@example.com:444/?query#frag"_ns);
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {  // missing password is fine
      auto test =
          CreateUrlPatternInput("https://user@example.com:444/?query#frag"_ns);
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {  // missing hostname
      auto test =
          CreateUrlPatternInput("https://user:anything@:444/?query#frag"_ns);
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {  // missing port
      auto test = CreateUrlPatternInput(
          "https://user:anything@example.com/?query#frag"_ns);
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {  // missing query
      auto test = CreateUrlPatternInput(
          "https://user:anything@example.com:444/#frag"_ns);
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {  // missing frag
      auto test = CreateUrlPatternInput(
          "https://user:anything@example.com:444/?query"_ns);
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
  }

  // check basic url with wildcard
  {
    nsCString str("https://example.com/*");
    UrlPatternGlue pattern{};
    UrlPatternOptions options = {.ignore_case = false};
    nsCString baseUrl("");
    bool res =
        urlpattern_parse_pattern_from_string(&str, &baseUrl, options, &pattern);
    ASSERT_TRUE(res);

    Optional<nsCString> base;
    {
      auto test = CreateUrlPatternInput("https://example.com/"_ns);
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {
      auto test = CreateUrlPatternInput("https://example.com/thing"_ns);
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {
      auto test = CreateUrlPatternInput("https://example.com/dir/thing"_ns);
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
  }

  // check matching in pathname (needs to be at least two slashes)
  {
    nsCString str("https://example.com/:category/*");
    UrlPatternGlue pattern{};
    UrlPatternOptions options = {.ignore_case = false};
    nsCString baseUrl("");
    bool res =
        urlpattern_parse_pattern_from_string(&str, &baseUrl, options, &pattern);
    ASSERT_TRUE(res);

    Optional<nsCString> base;
    {
      auto test = CreateUrlPatternInput("https://example.com/"_ns);
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {  // not enough slashes
      auto test = CreateUrlPatternInput("https://example.com/products"_ns);
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {
      auto test = CreateUrlPatternInput("https://example.com/products/"_ns);
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {
      auto test = CreateUrlPatternInput("https://example.com/blog/thing"_ns);
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {  // 3 slashes
      auto test = CreateUrlPatternInput("https://example.com/blog/thing/"_ns);
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
  }

  // check optional `s` in protocol
  {
    nsCString str("http{s}?://example.com/");
    UrlPatternGlue pattern{};
    UrlPatternOptions options = {.ignore_case = false};
    nsCString baseUrl("");
    bool res =
        urlpattern_parse_pattern_from_string(&str, &baseUrl, options, &pattern);
    ASSERT_TRUE(res);

    Optional<nsCString> base;
    {
      auto test = CreateUrlPatternInput("http://example.com/"_ns);
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {
      auto test = CreateUrlPatternInput("https://example.com/"_ns);
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
  }

  // basic relative wildcard path with base domain
  {
    nsCString str("../admin/*");
    UrlPatternGlue pattern{};
    UrlPatternOptions options = {.ignore_case = false};
    nsCString baseUrl("https://example.com/forum");
    // MaybeString baseUrl {.string = "https://example.com/forum"_ns, .valid =
    // true };
    bool res =
        urlpattern_parse_pattern_from_string(&str, &baseUrl, options, &pattern);
    ASSERT_TRUE(res);

    Optional<nsCString> base;
    {
      auto test = CreateUrlPatternInput("https://example.com/admin/"_ns);
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {
      auto test = CreateUrlPatternInput("https://example.com/admin/thing"_ns);
      ASSERT_TRUE(UrlPatternTest(pattern, test, base));
    }
    {
      auto test = CreateUrlPatternInput("https://example.com/nonadmin/"_ns);
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
    {
      auto test = CreateUrlPatternInput("https://example.com/"_ns);
      ASSERT_FALSE(UrlPatternTest(pattern, test, base));
    }
  }
}

TEST(TestUrlPatternGlue, MatchInputFromString)
{
  {
    nsCString url("https://example.com/");
    UrlPatternMatchInputAndInputs matchInputAndInputs;
    bool res = urlpattern_process_match_input_from_string(&url, nullptr,
                                                          &matchInputAndInputs);
    ASSERT_TRUE(res);
    ASSERT_EQ(matchInputAndInputs.input.protocol, "https"_ns);
    ASSERT_EQ(matchInputAndInputs.input.hostname, "example.com"_ns);
    ASSERT_EQ(matchInputAndInputs.input.pathname, "/"_ns);
    ASSERT_EQ(matchInputAndInputs.input.username, "");
    ASSERT_EQ(matchInputAndInputs.input.password, "");
    ASSERT_EQ(matchInputAndInputs.input.port, "");
    ASSERT_EQ(matchInputAndInputs.input.search, "");
    ASSERT_EQ(matchInputAndInputs.input.hash, "");
    ASSERT_EQ(matchInputAndInputs.inputs.string_or_init_type,
              UrlPatternStringOrInitType::String);
    ASSERT_EQ(matchInputAndInputs.inputs.str, url);
    ASSERT_EQ(matchInputAndInputs.inputs.base.valid, false);
  }
  {
    nsCString expected("https://example.com/some/dir");
    nsCString base_url("https://example.com");
    nsCString relative_url("/some/dir");
    UrlPatternMatchInputAndInputs matchInputAndInputs;
    bool res = urlpattern_process_match_input_from_string(
        &relative_url, &base_url, &matchInputAndInputs);
    ASSERT_TRUE(res);
    ASSERT_EQ(matchInputAndInputs.input.protocol, "https"_ns);
    ASSERT_EQ(matchInputAndInputs.input.hostname, "example.com"_ns);
    ASSERT_EQ(matchInputAndInputs.input.pathname, "/some/dir"_ns);
    ASSERT_EQ(matchInputAndInputs.input.username, "");
    ASSERT_EQ(matchInputAndInputs.input.password, "");
    ASSERT_EQ(matchInputAndInputs.input.port, "");
    ASSERT_EQ(matchInputAndInputs.input.search, "");
    ASSERT_EQ(matchInputAndInputs.input.hash, "");
    ASSERT_EQ(matchInputAndInputs.inputs.string_or_init_type,
              UrlPatternStringOrInitType::String);
    ASSERT_EQ(matchInputAndInputs.inputs.str, relative_url);
    ASSERT_EQ(matchInputAndInputs.inputs.base.string, base_url);
  }
}

void assert_maybe_string_same(const MaybeString& s1, const MaybeString& s2) {
  ASSERT_EQ(s1.valid, s2.valid);
  if (s1.valid) {
    ASSERT_EQ(s1.string, s2.string);
  }
}

void assert_inits_same(const UrlPatternInit& i1, const UrlPatternInit& i2) {
  assert_maybe_string_same(i1.protocol, i2.protocol);
  assert_maybe_string_same(i1.username, i2.username);
  assert_maybe_string_same(i1.password, i2.password);
  assert_maybe_string_same(i1.hostname, i2.hostname);
  assert_maybe_string_same(i1.port, i2.port);
  assert_maybe_string_same(i1.pathname, i2.pathname);
  assert_maybe_string_same(i1.search, i2.search);
  assert_maybe_string_same(i1.hash, i2.hash);
  assert_maybe_string_same(i1.base_url, i2.base_url);
}

void assert_match_inputs_same(const UrlPatternMatchInput& input,
                              const UrlPatternMatchInput& expected) {
  ASSERT_EQ(input.protocol, expected.protocol);
  ASSERT_EQ(input.hostname, expected.hostname);
  ASSERT_EQ(input.pathname, expected.pathname);
  ASSERT_EQ(input.username, expected.username);
  ASSERT_EQ(input.password, expected.password);
  ASSERT_EQ(input.port, expected.port);
  ASSERT_EQ(input.search, expected.search);
  ASSERT_EQ(input.hash, expected.hash);
}

UrlPatternMatchInput createMatchInputHelper(const nsCString& proto,
                                            const nsCString& host,
                                            const nsCString& path) {
  return {
      .protocol = proto,
      .username = ""_ns,
      .password = ""_ns,
      .hostname = host,
      .port = ""_ns,
      .pathname = path,
      .search = ""_ns,
      .hash = ""_ns,
  };
}

TEST(TestUrlPatternGlue, MatchInputFromInit)
{
  {  // no base init
    UrlPatternMatchInputAndInputs matchInputAndInputs;
    auto init = CreateSimpleInit("https"_ns, "example.com"_ns, "/"_ns);
    auto expected = CreateSimpleInit("https"_ns, "example.com"_ns, "/"_ns);
    bool res = urlpattern_process_match_input_from_init(&init, nullptr,
                                                        &matchInputAndInputs);
    ASSERT_TRUE(res);

    UrlPatternMatchInput expected_match_input =
        createMatchInputHelper("https"_ns, "example.com"_ns, "/"_ns);
    assert_match_inputs_same(matchInputAndInputs.input, expected_match_input);
    ASSERT_EQ(matchInputAndInputs.inputs.string_or_init_type,
              UrlPatternStringOrInitType::Init);
    assert_inits_same(matchInputAndInputs.inputs.init, init);
    ASSERT_EQ(matchInputAndInputs.inputs.str, ""_ns);
    ASSERT_EQ(matchInputAndInputs.inputs.base.valid, false);
  }
  {  // base + relative url produces expected match input
    nsCString expected_base_url("https://example.com");

    auto init = CreateInit("", "", "", "", "", "/some/dir", "", "",
                           "https://example.com");
    UrlPatternMatchInputAndInputs matchInputAndInputs;
    bool res = urlpattern_process_match_input_from_init(&init, nullptr,
                                                        &matchInputAndInputs);
    ASSERT_TRUE(res);

    UrlPatternMatchInput expected_match_input =
        createMatchInputHelper("https"_ns, "example.com"_ns, "/some/dir"_ns);
    assert_match_inputs_same(matchInputAndInputs.input, expected_match_input);
    ASSERT_EQ(matchInputAndInputs.inputs.string_or_init_type,
              UrlPatternStringOrInitType::Init);
    assert_inits_same(matchInputAndInputs.inputs.init, init);
    ASSERT_EQ(matchInputAndInputs.inputs.str, ""_ns);
    ASSERT_EQ(matchInputAndInputs.inputs.base.valid, false);
  }
}

TEST(TestUrlPatternGlue, UrlPatternExecFromString)
{
  nsCString str(":café://:foo");
  UrlPatternOptions options = {.ignore_case = false};
  UrlPatternGlue pattern{};
  bool res =
      urlpattern_parse_pattern_from_string(&str, nullptr, options, &pattern);
  ASSERT_TRUE(res);
  ASSERT_TRUE(pattern);

  nsCString inputString("https://example.com/");
  UrlPatternInput input = CreateUrlPatternInput(inputString);
  Optional<nsAutoCString> execBaseUrl;
  Optional<UrlPatternResult> res2 = UrlPatternExec(pattern, input, execBaseUrl);

  ASSERT_TRUE(res2.isNothing());
}

void assert_pattern_result(UrlPatternResult& res) {
  ASSERT_TRUE(res.mProtocol.isSome());
  ASSERT_TRUE(res.mUsername.isSome());
  ASSERT_TRUE(res.mPassword.isSome());
  ASSERT_TRUE(res.mHostname.isSome());
  ASSERT_TRUE(res.mPort.isSome());
  ASSERT_TRUE(res.mPathname.isSome());
  ASSERT_TRUE(res.mSearch.isSome());
  ASSERT_TRUE(res.mHash.isSome());
  ASSERT_TRUE(res.mInputs.Length() == 1);
}

TEST(TestUrlPatternGlue, UrlPatternExecFromInit)
{
  UrlPatternGlue pattern{};
  auto init = CreateSimpleInit("https"_ns, "example.com"_ns, "/"_ns);
  UrlPatternOptions options = {.ignore_case = false};
  bool res = urlpattern_parse_pattern_from_init(&init, options, &pattern);
  ASSERT_TRUE(res);
  ASSERT_TRUE(pattern);

  UrlPatternInput input = CreateUrlPatternInput(init);
  Optional<nsAutoCString> execBaseUrl;
  Optional<UrlPatternResult> res2 = UrlPatternExec(pattern, input, execBaseUrl);
  ASSERT_TRUE(res2.isSome());
  assert_pattern_result(*res2);
  ASSERT_EQ(res2->mProtocol->mInput, "https");
  ASSERT_EQ(res2->mUsername->mInput, ""_ns);
  ASSERT_EQ(res2->mPassword->mInput, ""_ns);
  ASSERT_EQ(res2->mHostname->mInput, "example.com");
  ASSERT_EQ(res2->mPort->mInput, ""_ns);
  ASSERT_EQ(res2->mPathname->mInput, "/"_ns);
  ASSERT_EQ(res2->mSearch->mInput, ""_ns);
  ASSERT_EQ(res2->mHash->mInput, ""_ns);
}
