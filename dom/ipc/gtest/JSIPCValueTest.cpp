/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "js/Value.h"
#include "mozilla/Casting.h"
#include "mozilla/dom/BrowsingContext.h"
#include "mozilla/dom/JSIPCValueUtils.h"
#include "mozilla/dom/ScriptSettings.h"
#include "nsReadableUtils.h"
#include "xpcpublic.h"

using namespace mozilla;
using namespace mozilla::dom;

static bool IsGenericNaN(double aDouble) {
  return BitwiseCast<uint64_t>(JS::GenericNaN()) ==
         BitwiseCast<uint64_t>(aDouble);
}

// Check that a non-canonical NaN value will correctly be serialized to
// canonical NaN.
TEST(JSIPCValueTest, DeserializeNonCanonicalNaN)
{
  AutoJSAPI jsapi;
  ASSERT_TRUE(jsapi.Init(xpc::PrivilegedJunkScope()));
  JSContext* cx = jsapi.cx();
  JS::Rooted<JS::Value> retVal(cx);
  IgnoredErrorResult error;

  // Create and verify a non-canonical NaN.
  double nan1 = BitwiseCast<double>(0xFFFE414141414141);
  ASSERT_TRUE(std::isnan(nan1));
  ASSERT_TRUE(!IsGenericNaN(nan1));

  // Do the deserialization.
  auto ipcValue = JSIPCValue(nan1);
  JSIPCValueUtils::ToJSVal(cx, std::move(ipcValue), &retVal, error);
  ASSERT_TRUE(!error.Failed());

  // The deserialized value should be the canonical NaN.
  ASSERT_TRUE(retVal.isDouble());
  double nan2 = retVal.toDouble();
  ASSERT_TRUE(std::isnan(nan2));
  ASSERT_TRUE(IsGenericNaN(nan2));
}

TEST(JSIPCValueTest, String)
{
  AutoJSAPI jsapi;
  ASSERT_TRUE(jsapi.Init(xpc::PrivilegedJunkScope()));
  JSContext* cx = jsapi.cx();
  JS::Rooted<JS::Value> retVal(cx);
  IgnoredErrorResult error;

  auto ipcValue = JSIPCValue(VoidString());
  JSIPCValueUtils::ToJSVal(cx, std::move(ipcValue), &retVal, error);
  ASSERT_TRUE(!error.Failed());

  ASSERT_TRUE(retVal.isNull());
}

TEST(JSIPCValueTest, MaybeDiscardedBrowsingContext)
{
  AutoJSAPI jsapi;
  ASSERT_TRUE(jsapi.Init(xpc::PrivilegedJunkScope()));
  JSContext* cx = jsapi.cx();
  JS::Rooted<JS::Value> retVal(cx);
  IgnoredErrorResult error;

  auto ipcValue = JSIPCValue(MaybeDiscardedBrowsingContext());
  JSIPCValueUtils::ToJSVal(cx, std::move(ipcValue), &retVal, error);
  ASSERT_TRUE(!error.Failed());

  ASSERT_TRUE(retVal.isNull());
}
