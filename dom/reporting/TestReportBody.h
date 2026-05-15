/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_TestReportBody_h
#define mozilla_dom_TestReportBody_h

#include "mozilla/dom/Nullable.h"
#include "mozilla/dom/ReportBody.h"
#include "mozilla/dom/SecurityPolicyViolationEvent.h"

namespace mozilla::dom {

class TestReportBody final : public ReportBody {
 public:
  TestReportBody(nsIGlobalObject* aGlobal, const nsString& aBody);

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  void GetMessage(nsAString& aMessage) const;

 protected:
  void ToJSON(JSONWriter& aJSONWriter) const override;

 private:
  ~TestReportBody();

  const nsString mMessage;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_TestReportBody_h
