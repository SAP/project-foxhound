/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_workers_ScriptResponseHeaderProcessor_h__
#define mozilla_dom_workers_ScriptResponseHeaderProcessor_h__

#include "mozilla/dom/WorkerCommon.h"

#include "nsIHttpChannel.h"
#include "nsIHttpChannelInternal.h"
#include "nsIStreamLoader.h"
#include "nsStreamUtils.h"
#include "mozilla/StaticPrefs_browser.h"
#include "mozilla/StaticPrefs_dom.h"

namespace mozilla::dom {

class ThreadSafeWorkerRef;

namespace workerinternals::loader {

/* ScriptResponseHeaderProcessor
 *
 * This class handles Policy headers. It can be used as a RequestObserver in a
 * Tee, as it is for NetworkLoadHandler in WorkerScriptLoader, or the static
 * method can be called directly, as it is in CacheLoadHandler.
 *
 */

class ScriptResponseHeaderProcessor final : public nsIRequestObserver {
 public:
  NS_DECL_ISUPPORTS

  ScriptResponseHeaderProcessor(RefPtr<ThreadSafeWorkerRef>& aWorkerRef,
                                bool aIsMainScript, bool aIsImportScript)
      : mWorkerRef(aWorkerRef),
        mIsMainScript(aIsMainScript),
        mIsImportScript(aIsImportScript) {
    AssertIsOnMainThread();
  }

  NS_IMETHOD OnStartRequest(nsIRequest* aRequest) override {
    nsresult rv = NS_OK;
    if (mIsImportScript &&
        StaticPrefs::dom_workers_importScripts_enforceStrictMimeType()) {
      rv = EnsureJavaScriptMimeType(aRequest);
      if (NS_WARN_IF(NS_FAILED(rv))) {
        aRequest->Cancel(rv);
        return NS_OK;
      }
    }

    if (!StaticPrefs::browser_tabs_remote_useCrossOriginEmbedderPolicy()) {
      return NS_OK;
    }

    rv = ProcessCrossOriginEmbedderPolicyHeader(aRequest);

    if (NS_WARN_IF(NS_FAILED(rv))) {
      aRequest->Cancel(rv);
    }

    return rv;
  }

  NS_IMETHOD OnStopRequest(nsIRequest* aRequest,
                           nsresult aStatusCode) override {
    return NS_OK;
  }

  static nsresult ProcessCrossOriginEmbedderPolicyHeader(
      WorkerPrivate* aWorkerPrivate,
      nsILoadInfo::CrossOriginEmbedderPolicy aPolicy, bool aIsMainScript);

 private:
  ~ScriptResponseHeaderProcessor() = default;

  nsresult EnsureJavaScriptMimeType(nsIRequest* aRequest);

  nsresult ProcessCrossOriginEmbedderPolicyHeader(nsIRequest* aRequest);

  // The owner of ScriptResponseHeaderProcessor should give the WorkerRef to
  // ensure ScriptResponseHeaderProcessor works with an valid WorkerPrivate.
  RefPtr<ThreadSafeWorkerRef> mWorkerRef;
  const bool mIsMainScript;
  const bool mIsImportScript;
};

}  // namespace workerinternals::loader

}  // namespace mozilla::dom

#endif /* mozilla_dom_workers_ScriptResponseHeaderProcessor_h__ */
