/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/TestReportGenerator.h"

#include "mozilla/dom/Document.h"
#include "mozilla/dom/ReportingBinding.h"
#include "mozilla/dom/ReportingUtils.h"
#include "mozilla/dom/TestReportBody.h"

namespace mozilla::dom {

/* static */
already_AddRefed<Promise> TestReportGenerator::GenerateReport(
    const GlobalObject& aGlobal, const GenerateTestReportParameters& aParams,
    ErrorResult& aRv) {
  nsCOMPtr<nsIGlobalObject> global = do_QueryInterface(aGlobal.GetAsSupports());
  MOZ_ASSERT(global);

  RefPtr<Promise> promise = Promise::Create(global, aRv);
  if (NS_WARN_IF(aRv.Failed())) {
    return nullptr;
  }
  MOZ_ASSERT(promise);

  nsString messageBody = aParams.mMessage;
  if (messageBody.IsEmpty()) {
    promise->MaybeRejectWithNotSupportedError(
        "Report must have a message string");
    return promise.forget();
  }

  nsString reportGroup = aParams.mGroup;

  nsPIDOMWindowInner* window = global->GetAsInnerWindow();
  if (NS_WARN_IF(!window)) {
    promise->MaybeRejectWithNotSupportedError(
        "Failed to convert global object to window");
    return promise.forget();
  }

  RefPtr<TestReportBody> reportBody = new TestReportBody(global, messageBody);

  nsCOMPtr<nsIURI> docURI = window->GetDocumentURI();
  nsAutoCString spec;
  if (!docURI || NS_FAILED(docURI->GetSpec(spec))) {
    promise->MaybeRejectWithNotSupportedError(
        "Failed to retrieve active document's URI from window");
    return promise.forget();
  }

  NS_ConvertUTF8toUTF16 docURIString(spec);

  ReportingUtils::Report(global, nsGkAtoms::test, reportGroup, docURIString,
                         reportBody);

  AutoJSAPI jsapi;
  if (!jsapi.Init(global)) {
    promise->MaybeRejectWithNotSupportedError(
        "Failed to initialize JS context");
    return promise.forget();
  }

  promise->MaybeResolveWithUndefined();
  return promise.forget();
}

}  // namespace mozilla::dom
