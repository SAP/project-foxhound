/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ScriptResponseHeaderProcessor.h"
#include "mozilla/Try.h"
#include "mozilla/dom/WorkerRef.h"
#include "mozilla/dom/WorkerScope.h"

namespace mozilla {
namespace dom {

namespace workerinternals {

namespace loader {

NS_IMPL_ISUPPORTS(ScriptResponseHeaderProcessor, nsIRequestObserver);

nsresult ScriptResponseHeaderProcessor::ProcessCrossOriginEmbedderPolicyHeader(
    WorkerPrivate* aWorkerPrivate,
    nsILoadInfo::CrossOriginEmbedderPolicy aPolicy, bool aIsMainScript) {
  MOZ_ASSERT(aWorkerPrivate);

  if (aIsMainScript) {
    MOZ_TRY(aWorkerPrivate->SetEmbedderPolicy(aPolicy));
  } else {
    // NOTE: Spec doesn't mention non-main scripts must match COEP header with
    // the main script, but it must pass CORP checking.
    // see: wpt window-simple-success.https.html, the worker import script
    // test-incrementer.js without coep header.
    Unused << NS_WARN_IF(!aWorkerPrivate->MatchEmbedderPolicy(aPolicy));
  }

  return NS_OK;
}

// Enforce strict MIME type checks for worker-imported scripts
// https://github.com/whatwg/html/pull/4001
nsresult ScriptResponseHeaderProcessor::EnsureJavaScriptMimeType(
    nsIRequest* aRequest) {
  nsCOMPtr<nsIChannel> channel = do_QueryInterface(aRequest);
  MOZ_ASSERT(channel);
  nsAutoCString mimeType;
  channel->GetContentType(mimeType);
  if (!nsContentUtils::IsJavascriptMIMEType(NS_ConvertUTF8toUTF16(mimeType))) {
    return NS_ERROR_DOM_NETWORK_ERR;
  }
  return NS_OK;
}

nsresult ScriptResponseHeaderProcessor::ProcessCrossOriginEmbedderPolicyHeader(
    nsIRequest* aRequest) {
  nsCOMPtr<nsIHttpChannelInternal> httpChannel = do_QueryInterface(aRequest);

  MOZ_ASSERT(mWorkerRef);
  // NOTE: the spec doesn't say what to do with non-HTTP workers.
  // See: https://github.com/whatwg/html/issues/4916
  if (!httpChannel) {
    if (mIsMainScript) {
      mWorkerRef->Private()->InheritOwnerEmbedderPolicyOrNull(aRequest);
    }

    return NS_OK;
  }

  nsILoadInfo::CrossOriginEmbedderPolicy coep;
  MOZ_TRY(httpChannel->GetResponseEmbedderPolicy(
      mWorkerRef->Private()->Trials().IsEnabled(
          OriginTrial::CoepCredentialless),
      &coep));

  return ProcessCrossOriginEmbedderPolicyHeader(mWorkerRef->Private(), coep,
                                                mIsMainScript);
}

}  // namespace loader
}  // namespace workerinternals

}  // namespace dom
}  // namespace mozilla
