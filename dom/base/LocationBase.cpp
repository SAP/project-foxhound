/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
 * Modifications Copyright SAP SE. 2019-2021.  All rights reserved.
 */

#include "mozilla/dom/LocationBase.h"

#include "mozilla/NullPrincipal.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/PolicyContainer.h"
#include "mozilla/dom/WindowContext.h"
#include "nsCOMPtr.h"
#include "nsContentUtils.h"
#include "nsDocLoader.h"
#include "nsDocShellLoadState.h"
#include "nsError.h"
#include "nsGlobalWindowInner.h"
#include "nsIClassifiedChannel.h"
#include "nsIScriptContext.h"
#include "nsIScriptSecurityManager.h"
#include "nsIWebNavigation.h"
#include "nsNetUtil.h"

namespace mozilla::dom {

static bool IncumbentGlobalHasTransientActivation() {
  nsGlobalWindowInner* window = nsContentUtils::IncumbentInnerWindow();
  return window && window->GetWindowContext() && window->GetWindowContext() &&
         window->GetWindowContext()->HasValidTransientUserGestureActivation();
}

// https://html.spec.whatwg.org/#location-object-navigate
void LocationBase::Navigate(nsIURI* aURI, nsIPrincipal& aSubjectPrincipal,
                            ErrorResult& aRv,
                            NavigationHistoryBehavior aHistoryHandling) {
  // Step 1
  RefPtr<BrowsingContext> navigable = GetBrowsingContext();
  if (!navigable || navigable->IsDiscarded()) {
    return;
  }

  // Step 2-3, except the check for if document is completely loaded.
  bool needsCompletelyLoadedDocument = !IncumbentGlobalHasTransientActivation();

  // Make the load's referrer reflect changes to the document's URI caused by
  // push/replaceState, if possible.  First, get the document corresponding to
  // fp.  If the document's original URI (i.e. its URI before
  // push/replaceState) matches the principal's URI, use the document's
  // current URI as the referrer.  If they don't match, use the principal's
  // URI.
  //
  // The triggering principal for this load should be the principal of the
  // incumbent document (which matches where the referrer information is
  // coming from) when there is an incumbent document, and the subject
  // principal otherwise.  Note that the URI in the triggering principal
  // may not match the referrer URI in various cases, notably including
  // the cases when the incumbent document's document URI was modified
  // after the document was loaded.

  nsCOMPtr<nsPIDOMWindowInner> incumbent =
      do_QueryInterface(mozilla::dom::GetIncumbentGlobal());
  nsCOMPtr<Document> doc = incumbent ? incumbent->GetDoc() : nullptr;

  // Step 4
  navigable->Navigate(aURI, doc, aSubjectPrincipal, aRv, aHistoryHandling,
                      needsCompletelyLoadedDocument);
}

void LocationBase::SetHref(const nsACString& aHref,
                           nsIPrincipal& aSubjectPrincipal, ErrorResult& aRv) {

  // Foxhound: location.href sink
  ReportTaintSink(aHref, "location.href");

  DoSetHref(aHref, aSubjectPrincipal, false, aRv);
}

void LocationBase::DoSetHref(const nsACString& aHref,
                             nsIPrincipal& aSubjectPrincipal, bool aReplace,
                             ErrorResult& aRv) {
  // Get the source of the caller
  nsCOMPtr<nsIURI> base = GetSourceBaseURL();
  SetHrefWithBase(aHref, base, aSubjectPrincipal, aReplace, aRv);
}

void LocationBase::SetHrefWithBase(const nsACString& aHref, nsIURI* aBase,
                                   nsIPrincipal& aSubjectPrincipal,
                                   bool aReplace, ErrorResult& aRv) {
  nsresult result;
  nsCOMPtr<nsIURI> newUri;

  if (Document* doc = GetEntryDocument()) {
    result = NS_NewURI(getter_AddRefs(newUri), aHref,
                       doc->GetDocumentCharacterSet(), aBase);
  } else {
    result = NS_NewURI(getter_AddRefs(newUri), aHref, nullptr, aBase);
  }

  if (NS_FAILED(result) || !newUri) {
    aRv.ThrowSyntaxError("'"_ns + aHref + "' is not a valid URL."_ns);
    return;
  }

  NavigationHistoryBehavior historyHandling = NavigationHistoryBehavior::Auto;
  if (aReplace) {
    historyHandling = NavigationHistoryBehavior::Replace;
  }

  Navigate(newUri, aSubjectPrincipal, aRv, historyHandling);
}

void LocationBase::Replace(const nsACString& aUrl,
                           nsIPrincipal& aSubjectPrincipal, ErrorResult& aRv) {

  // Foxhound: location.assign sink
  ReportTaintSink(aUrl, "location.replace");

  DoSetHref(aUrl, aSubjectPrincipal, true, aRv);
}

nsIURI* LocationBase::GetSourceBaseURL() {
  Document* doc = GetEntryDocument();

  // If there's no entry document, we either have no Script Entry Point or one
  // that isn't a DOM Window.  This doesn't generally happen with the DOM, but
  // can sometimes happen with extension code in certain IPC configurations.  If
  // this happens, try falling back on the current document associated with the
  // docshell. If that fails, just return null and hope that the caller passed
  // an absolute URI.
  if (!doc) {
    if (nsCOMPtr<nsIDocShell> docShell = GetDocShell()) {
      nsCOMPtr<nsPIDOMWindowOuter> docShellWin =
          do_QueryInterface(docShell->GetScriptGlobalObject());
      if (docShellWin) {
        doc = docShellWin->GetDoc();
      }
    }
  }
  return doc ? doc->GetBaseURI() : nullptr;
}

}  // namespace mozilla::dom
