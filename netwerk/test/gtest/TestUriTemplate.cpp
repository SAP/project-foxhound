/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "mozilla/RefPtr.h"
#include "mozilla/net/UriTemplate.h"

using namespace mozilla;
using namespace mozilla::net;

TEST(UriTemplate, Basic)
{
  RefPtr<UriTemplateWrapper> builder;
  nsCString pathTemplate(
      "/.well-known/masque/udp/{target_host}/{target_port}/");
  UriTemplateWrapper::Init(pathTemplate, getter_AddRefs(builder));
  ASSERT_TRUE(builder);
  nsresult rv = builder->Set("target_host"_ns, "example.com"_ns);
  ASSERT_EQ(rv, NS_OK);
  rv = builder->Set("target_port"_ns, 4433);
  ASSERT_EQ(rv, NS_OK);
  nsCString result;
  builder->Build(&result);
  ASSERT_TRUE(result.Equals("/.well-known/masque/udp/example.com/4433/"_ns));
}

TEST(UriTemplate, EmptyValueIsAllowed)
{
  RefPtr<UriTemplateWrapper> builder;
  nsCString tmpl("/x/{v}/");
  UriTemplateWrapper::Init(tmpl, getter_AddRefs(builder));
  ASSERT_TRUE(builder);

  ASSERT_EQ(builder->Set("v"_ns, ""_ns), NS_OK);

  nsCString result;
  builder->Build(&result);
  ASSERT_EQ(result, "/x//");
}

TEST(UriTemplate, BuildIsIdempotent)
{
  RefPtr<UriTemplateWrapper> builder;
  nsCString tmpl("/{x}/");
  UriTemplateWrapper::Init(tmpl, getter_AddRefs(builder));
  ASSERT_TRUE(builder);

  ASSERT_EQ(builder->Set("x"_ns, "val"_ns), NS_OK);

  nsCString first, second;
  builder->Build(&first);
  builder->Build(&second);
  ASSERT_EQ(first, "/val/");
  ASSERT_EQ(second, "/val/");  // multiple builds should not mutate state
}

TEST(UriTemplate, NoVariablesTemplateIsReturnedAsIs)
{
  RefPtr<UriTemplateWrapper> builder;
  nsCString tmpl("/static/path/with/no/vars");
  UriTemplateWrapper::Init(tmpl, getter_AddRefs(builder));
  ASSERT_TRUE(builder);

  nsCString result;
  builder->Build(&result);
  ASSERT_EQ(result, "/static/path/with/no/vars");
}

TEST(UriTemplate, UnicodeIsUTF8PercentEncoded)
{
  RefPtr<UriTemplateWrapper> builder;
  nsCString tmpl("/city/{name}/");
  UriTemplateWrapper::Init(tmpl, getter_AddRefs(builder));
  ASSERT_TRUE(builder);

  // "München" contains 'ü' (U+00FC) -> UTF-8 0xC3 0xBC -> %C3%BC
  ASSERT_EQ(builder->Set("name"_ns, "München"_ns), NS_OK);

  nsCString result;
  builder->Build(&result);
  ASSERT_EQ(result, "/city/M%C3%BCnchen/");
}

TEST(UriTemplate, OverwriteVariable)
{
  RefPtr<UriTemplateWrapper> builder;
  nsCString tmpl("/h/{host}/");
  UriTemplateWrapper::Init(tmpl, getter_AddRefs(builder));
  ASSERT_TRUE(builder);

  ASSERT_EQ(builder->Set("host"_ns, "old.example"_ns), NS_OK);
  ASSERT_EQ(builder->Set("host"_ns, "new.example"_ns), NS_OK);

  nsCString result;
  builder->Build(&result);
  ASSERT_EQ(result, "/h/new.example/");
}

TEST(UriTemplate, SetOrderDoesNotMatter)
{
  RefPtr<UriTemplateWrapper> builder;
  nsCString tmpl("/.well-known/masque/udp/{target_host}/{target_port}/");
  UriTemplateWrapper::Init(tmpl, getter_AddRefs(builder));
  ASSERT_TRUE(builder);

  // Set in reverse order
  ASSERT_EQ(builder->Set("target_port"_ns, "4433"_ns), NS_OK);
  ASSERT_EQ(builder->Set("target_host"_ns, "example.com"_ns), NS_OK);

  nsCString result;
  builder->Build(&result);
  ASSERT_EQ(result, "/.well-known/masque/udp/example.com/4433/");
}
