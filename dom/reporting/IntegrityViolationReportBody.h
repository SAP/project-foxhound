/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_IntegrityViolationReportBody_h
#define mozilla_dom_IntegrityViolationReportBody_h

#include "mozilla/dom/Nullable.h"
#include "mozilla/dom/ReportBody.h"
#include "mozilla/dom/SecurityPolicyViolationEvent.h"

namespace mozilla::dom {

class IntegrityViolationReportBody final : public ReportBody {
 public:
  IntegrityViolationReportBody(nsIGlobalObject* aGlobal,
                               const nsACString& aDocumentURL,
                               const nsACString& aBlockedURL,
                               const nsACString& aDestination,
                               const bool aReportOnly);

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  void GetDocumentURL(nsACString& aURL) const;

  void GetBlockedURL(nsACString& aURL) const;

  void GetDestination(nsACString& aDestination) const;

  bool ReportOnly() const;

 protected:
  void ToJSON(JSONWriter& aJSONWriter) const override;

 private:
  ~IntegrityViolationReportBody();

  const nsCString mDocumentURL;
  const nsCString mBlockedURL;
  const nsCString mDestination;
  const bool mReportOnly;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_IntegrityViolationReportBody_h
