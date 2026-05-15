/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/IntegrityViolationReportBody.h"

#include "mozilla/JSONWriter.h"
#include "mozilla/dom/ReportingBinding.h"

namespace mozilla::dom {

IntegrityViolationReportBody::IntegrityViolationReportBody(
    nsIGlobalObject* aGlobal, const nsACString& aDocumentURL,
    const nsACString& aBlockedURL, const nsACString& aDestination,
    const bool aReportOnly)
    : ReportBody(aGlobal),
      mDocumentURL(aDocumentURL),
      mBlockedURL(aBlockedURL),
      mDestination(aDestination),
      mReportOnly(aReportOnly) {}

IntegrityViolationReportBody::~IntegrityViolationReportBody() = default;

JSObject* IntegrityViolationReportBody::WrapObject(
    JSContext* aCx, JS::Handle<JSObject*> aGivenProto) {
  return IntegrityViolationReportBody_Binding::Wrap(aCx, this, aGivenProto);
}

void IntegrityViolationReportBody::GetDocumentURL(nsACString& aURL) const {
  aURL = mDocumentURL;
}

void IntegrityViolationReportBody::GetBlockedURL(nsACString& aURL) const {
  aURL = mBlockedURL;
}

void IntegrityViolationReportBody::GetDestination(
    nsACString& aDestination) const {
  aDestination = mDestination;
}

bool IntegrityViolationReportBody::ReportOnly() const { return mReportOnly; }

void IntegrityViolationReportBody::ToJSON(JSONWriter& aJSONWriter) const {
  aJSONWriter.StringProperty("documentURL", mDocumentURL);
  aJSONWriter.StringProperty("blockedURL", mBlockedURL);
  aJSONWriter.StringProperty("destination", mDestination);
  aJSONWriter.BoolProperty("reportOnly", mReportOnly);
}

}  // namespace mozilla::dom
