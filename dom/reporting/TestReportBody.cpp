/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/TestReportBody.h"

#include "mozilla/JSONWriter.h"
#include "mozilla/dom/ReportingBinding.h"

namespace mozilla::dom {

TestReportBody::TestReportBody(nsIGlobalObject* aGlobal,
                               const nsString& aMessage)
    : ReportBody(aGlobal), mMessage(aMessage) {}

JSObject* TestReportBody::WrapObject(JSContext* aCx,
                                     JS::Handle<JSObject*> aGivenProto) {
  return TestReportBody_Binding::Wrap(aCx, this, aGivenProto);
}

TestReportBody::~TestReportBody() = default;

void TestReportBody::GetMessage(nsAString& aMessage) const {
  aMessage = mMessage;
}

void TestReportBody::ToJSON(JSONWriter& aJSONWriter) const {
  if (mMessage.IsEmpty()) {
    aJSONWriter.NullProperty("message");
  } else {
    aJSONWriter.StringProperty("message", NS_ConvertUTF16toUTF8(mMessage));
  }
}
}  // namespace mozilla::dom
