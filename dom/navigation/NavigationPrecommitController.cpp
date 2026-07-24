/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "NavigationPrecommitController.h"

#include "Navigation.h"
#include "NavigationUtils.h"
#include "mozilla/dom/NavigateEvent.h"
#include "mozilla/dom/NavigationPrecommitControllerBinding.h"
#include "nsNetUtil.h"

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE(NavigationPrecommitController,
                                      mGlobalObject, mEvent)
NS_IMPL_CYCLE_COLLECTING_ADDREF(NavigationPrecommitController)
NS_IMPL_CYCLE_COLLECTING_RELEASE(NavigationPrecommitController)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(NavigationPrecommitController)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

NavigationPrecommitController::NavigationPrecommitController(
    NavigateEvent* aEvent, nsIGlobalObject* aGlobalObject)
    : mGlobalObject(aGlobalObject), mEvent(aEvent) {
  MOZ_DIAGNOSTIC_ASSERT(mEvent);
}

NavigationPrecommitController::~NavigationPrecommitController() {}

JSObject* NavigationPrecommitController::WrapObject(
    JSContext* aCx, JS::Handle<JSObject*> aGivenProto) {
  return NavigationPrecommitController_Binding::Wrap(aCx, this, aGivenProto);
}

nsIGlobalObject* NavigationPrecommitController::GetParentObject() const {
  return mGlobalObject;
}

// https://html.spec.whatwg.org/#dom-navigationprecommitcontroller-redirect
void NavigationPrecommitController::Redirect(
    JSContext* aCx, const nsAString& aUrl,
    const NavigationNavigateOptions& aOptions, ErrorResult& aRv) {
  // The redirect(url, options) method steps are:

  // 1. Assert: this's event's interception state is not "none".
  MOZ_DIAGNOSTIC_ASSERT(mEvent->InterceptionState() !=
                        NavigateEvent::InterceptionState::None);

  // 2. Perform shared checks given this's event.
  mEvent->PerformSharedChecks(aRv);
  if (aRv.Failed()) {
    return;
  }

  // 3. If this's event's interception state is not "intercepted", then throw an
  //    "InvalidStateError" DOMException.
  if (mEvent->InterceptionState() !=
      NavigateEvent::InterceptionState::Intercepted) {
    aRv.ThrowInvalidStateError(
        "Expected interception state to be 'intercepted'");
    return;
  }

  // 4. If this's event's navigationType is neither "push" nor "replace", then
  //    throw an "InvalidStateError" DOMException.
  if (mEvent->NavigationType() != NavigationType::Push &&
      mEvent->NavigationType() != NavigationType::Replace) {
    aRv.ThrowInvalidStateError(
        "Expected navigation type to be 'push' or 'replace'");
    return;
  }

  // 5. Let document be this's relevant global object's associated Document.
  RefPtr<Document> document = mEvent->GetDocument();
  if (!document) {
    aRv.ThrowInvalidStateError("Document is not available");
    return;
  }
  // 6. Let destinationURL be the result of parsing url given document.
  RefPtr<nsIURI> destinationURL;
  nsresult res = NS_NewURI(getter_AddRefs(destinationURL), aUrl, nullptr,
                           document->GetDocBaseURI());

  // 7. If destinationURL is failure, then throw a "SyntaxError" DOMException.
  if (NS_FAILED(res)) {
    aRv.ThrowSyntaxError("URL given to navigate() is invalid");
    return;
  }

  // 8. If document cannot have its URL rewritten to destinationURL, then throw
  //    a "SecurityError" DOMException.
  if (!document->CanRewriteURL(destinationURL)) {
    aRv.ThrowSecurityError("Cannot rewrite URL to the given destination URL");
    return;
  }

  // 9. If options["history"] is "push" or "replace", then set this's event's
  //    navigationType to options["history"].
  if (aOptions.mHistory == NavigationHistoryBehavior::Push ||
      aOptions.mHistory == NavigationHistoryBehavior::Replace) {
    mEvent->SetNavigationType(
        *NavigationUtils::NavigationTypeFromNavigationHistoryBehavior(
            aOptions.mHistory));
  }
  RefPtr destination = mEvent->Destination();

  // 10. If options["state"] exists, then:
  if (!aOptions.mState.isUndefined()) {
    // 10.1 Let serializedState be the result of calling
    //      StructuredSerializeForStorage(options["state"]). This may throw an
    //      exception.
    RefPtr<nsIStructuredCloneContainer> serializedState =
        new nsStructuredCloneContainer();
    JS::Rooted<JS::Value> state(aCx, aOptions.mState);

    const nsresult rv = serializedState->InitFromJSVal(state, aCx);
    if (NS_FAILED(rv)) {
      JS::Rooted<JS::Value> exception(aCx);
      if (JS_GetPendingException(aCx, &exception)) {
        JS_ClearPendingException(aCx);
        aRv.ThrowJSException(aCx, exception);
      } else {
        // The spec only mentions that this might throw, but the tests expect
        // the DataCloneError.
        aRv.ThrowDataCloneError("Failed to serialize value for redirect().");
      }
      return;
    }

    // 10.2 Set this's event's destination's state to serializedState.
    destination->SetState(serializedState);

    // 10.3 Set this's event's target's ongoing API method tracker's serialized
    //      state to serializedState.
    if (Navigation* target =
            Navigation::FromEventTargetOrNull(mEvent->GetTarget())) {
      target->SetSerializedStateIntoOngoingAPIMethodTracker(serializedState);
    }
  }

  // 11. Set this's event's destination's URL to destinationURL.
  destination->SetURL(destinationURL);
  // 12. If options["info"] exists, then set this's event's info to
  //     options["info"].
  if (!aOptions.mInfo.isUndefined()) {
    mEvent->SetInfo(aOptions.mInfo);
  }
}

// https://html.spec.whatwg.org/#dom-navigationprecommitcontroller-addhandler
void NavigationPrecommitController::AddHandler(
    NavigationInterceptHandler& aHandler, ErrorResult& aRv) {
  // 1. Assert: this's event's interception state is not "none".
  MOZ_DIAGNOSTIC_ASSERT(mEvent->InterceptionState() !=
                        NavigateEvent::InterceptionState::None);

  // 2. Perform shared checks given this's event.
  mEvent->PerformSharedChecks(aRv);
  if (aRv.Failed()) {
    return;
  }

  // 3. If this's event's interception state is not "intercepted", then throw
  //    an "InvalidStateError" DOMException.
  if (mEvent->InterceptionState() !=
      NavigateEvent::InterceptionState::Intercepted) {
    aRv.ThrowInvalidStateError(
        "Cannot add handler after navigation has committed");
    return;
  }

  // 4. Append handler to this's event's navigation handler list.
  mEvent->NavigationHandlerList().AppendElement(&aHandler);
}

}  // namespace mozilla::dom
