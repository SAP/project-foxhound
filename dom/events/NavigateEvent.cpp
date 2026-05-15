/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/NavigateEvent.h"

#include "mozilla/HoldDropJSObjects.h"
#include "mozilla/PresShell.h"
#include "mozilla/dom/AbortController.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/ElementBinding.h"
#include "mozilla/dom/NavigateEventBinding.h"
#include "mozilla/dom/Navigation.h"
#include "mozilla/dom/NavigationHistoryEntry.h"
#include "mozilla/dom/SessionHistoryEntry.h"
#include "nsDocShell.h"
#include "nsFocusManager.h"
#include "nsGlobalWindowInner.h"

extern mozilla::LazyLogModule gNavigationAPILog;

#define LOG_FMTI(format, ...) \
  MOZ_LOG_FMT(gNavigationAPILog, LogLevel::Info, format, ##__VA_ARGS__);

#define LOG_FMT(format, ...) \
  MOZ_LOG_FMT(gNavigationAPILog, LogLevel::Debug, format, ##__VA_ARGS__);

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION_INHERITED_WITH_JS_MEMBERS(
    NavigateEvent, Event,
    (mDestination, mSignal, mFormData, mSourceElement, mNavigationHandlerList,
     mAbortController, mNavigationPrecommitHandlerList),
    (mInfo))

NS_IMPL_ADDREF_INHERITED(NavigateEvent, Event)
NS_IMPL_RELEASE_INHERITED(NavigateEvent, Event)

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(NavigateEvent)
NS_INTERFACE_MAP_END_INHERITING(Event)

JSObject* NavigateEvent::WrapObjectInternal(JSContext* aCx,
                                            JS::Handle<JSObject*> aGivenProto) {
  return NavigateEvent_Binding::Wrap(aCx, this, aGivenProto);
}

/* static */
already_AddRefed<NavigateEvent> NavigateEvent::Constructor(
    const GlobalObject& aGlobal, const nsAString& aType,
    const NavigateEventInit& aEventInitDict) {
  nsCOMPtr<mozilla::dom::EventTarget> eventTarget =
      do_QueryInterface(aGlobal.GetAsSupports());
  return Constructor(eventTarget, aType, aEventInitDict);
}

/* static */
already_AddRefed<NavigateEvent> NavigateEvent::Constructor(
    EventTarget* aEventTarget, const nsAString& aType,
    const NavigateEventInit& aEventInitDict) {
  RefPtr<NavigateEvent> event = new NavigateEvent(aEventTarget);
  bool trusted = event->Init(aEventTarget);
  event->InitEvent(
      aType, aEventInitDict.mBubbles ? CanBubble::eYes : CanBubble::eNo,
      aEventInitDict.mCancelable ? Cancelable::eYes : Cancelable::eNo,
      aEventInitDict.mComposed ? Composed::eYes : Composed::eNo);
  event->InitNavigateEvent(aEventInitDict);
  event->SetTrusted(trusted);
  return event.forget();
}

/* static */
already_AddRefed<NavigateEvent> NavigateEvent::Constructor(
    EventTarget* aEventTarget, const nsAString& aType,
    const NavigateEventInit& aEventInitDict,
    nsIStructuredCloneContainer* aClassicHistoryAPIState,
    class AbortController* aAbortController) {
  RefPtr<NavigateEvent> event =
      Constructor(aEventTarget, aType, aEventInitDict);

  event->mAbortController = aAbortController;
  MOZ_DIAGNOSTIC_ASSERT(event->mSignal == aAbortController->Signal());

  event->mClassicHistoryAPIState = aClassicHistoryAPIState;

  return event.forget();
}

NavigationType NavigateEvent::NavigationType() const { return mNavigationType; }

void NavigateEvent::SetNavigationType(enum NavigationType aNavigationType) {
  mNavigationType = aNavigationType;
}

already_AddRefed<NavigationDestination> NavigateEvent::Destination() const {
  return do_AddRef(mDestination);
}

bool NavigateEvent::CanIntercept() const { return mCanIntercept; }

bool NavigateEvent::UserInitiated() const { return mUserInitiated; }

bool NavigateEvent::HashChange() const { return mHashChange; }

AbortSignal* NavigateEvent::Signal() const { return mSignal; }

already_AddRefed<FormData> NavigateEvent::GetFormData() const {
  return do_AddRef(mFormData);
}

void NavigateEvent::GetDownloadRequest(nsAString& aDownloadRequest) const {
  aDownloadRequest = mDownloadRequest;
}

void NavigateEvent::GetInfo(JSContext* aCx,
                            JS::MutableHandle<JS::Value> aInfo) const {
  aInfo.set(mInfo);
}

bool NavigateEvent::HasUAVisualTransition() const {
  return mHasUAVisualTransition;
}

Element* NavigateEvent::GetSourceElement() const { return mSourceElement; }

template <typename OptionEnum>
static void MaybeReportWarningToConsole(Document* aDocument,
                                        const nsString& aOption,
                                        OptionEnum aPrevious, OptionEnum aNew) {
  if (!aDocument) {
    return;
  }

  nsTArray<nsString> params = {aOption,
                               NS_ConvertUTF8toUTF16(GetEnumString(aNew)),
                               NS_ConvertUTF8toUTF16(GetEnumString(aPrevious))};
  nsContentUtils::ReportToConsole(
      nsIScriptError::warningFlag, "DOM"_ns, aDocument,
      nsContentUtils::eDOM_PROPERTIES,
      "PreviousInterceptCallOptionOverriddenWarning", params);
}

// https://html.spec.whatwg.org/#dom-navigateevent-intercept
void NavigateEvent::Intercept(const NavigationInterceptOptions& aOptions,
                              ErrorResult& aRv) {
  LOG_FMTI("Called NavigateEvent.intercept()");

  // Step 1
  if (PerformSharedChecks(aRv); aRv.Failed()) {
    return;
  }

  // Step 2
  if (!mCanIntercept) {
    aRv.ThrowSecurityError("Event's canIntercept was initialized to false");
    return;
  }

  // Step 3
  if (!IsBeingDispatched()) {
    aRv.ThrowInvalidStateError("Event has never been dispatched");
    return;
  }

  // Step 4
  if (aOptions.mPrecommitHandler.WasPassed()) {
    // Step 4.1
    if (!Cancelable()) {
      aRv.ThrowInvalidStateError("Event is not cancelable");
      return;
    }

    // Step 4.2
    mNavigationPrecommitHandlerList.AppendElement(
        aOptions.mPrecommitHandler.InternalValue().get());
  }

  // Step 5
  MOZ_DIAGNOSTIC_ASSERT(mInterceptionState == InterceptionState::None ||
                        mInterceptionState == InterceptionState::Intercepted);

  // Step 6
  mInterceptionState = InterceptionState::Intercepted;

  // Step 7
  if (aOptions.mHandler.WasPassed()) {
    mNavigationHandlerList.AppendElement(
        aOptions.mHandler.InternalValue().get());
  }

  // Step 8
  if (aOptions.mFocusReset.WasPassed()) {
    // Step 8.1
    if (mFocusResetBehavior &&
        *mFocusResetBehavior != aOptions.mFocusReset.Value()) {
      RefPtr<Document> document = GetAssociatedDocument();
      MaybeReportWarningToConsole(document, u"focusReset"_ns,
                                  *mFocusResetBehavior,
                                  aOptions.mFocusReset.Value());
    }

    // Step 8.2
    mFocusResetBehavior = Some(aOptions.mFocusReset.Value());
  }

  // Step 9
  if (aOptions.mScroll.WasPassed()) {
    // Step 9.1
    if (mScrollBehavior && *mScrollBehavior != aOptions.mScroll.Value()) {
      RefPtr<Document> document = GetAssociatedDocument();
      MaybeReportWarningToConsole(document, u"scroll"_ns, *mScrollBehavior,
                                  aOptions.mScroll.Value());
    }

    // Step 9.2
    mScrollBehavior.emplace(aOptions.mScroll.Value());
  }
}

// https://html.spec.whatwg.org/#dom-navigateevent-scroll
void NavigateEvent::Scroll(ErrorResult& aRv) {
  LOG_FMTI("Called NavigateEvent.scroll()");

  // Step 1
  if (PerformSharedChecks(aRv); aRv.Failed()) {
    return;
  }

  // Step 2
  if (mInterceptionState != InterceptionState::Committed) {
    aRv.ThrowInvalidStateError("NavigateEvent was not committed");
    return;
  }

  // Step 3
  ProcessScrollBehavior();
}

NavigateEvent::NavigateEvent(EventTarget* aOwner)
    : Event(aOwner, nullptr, nullptr) {
  mozilla::HoldJSObjects(this);
}

NavigateEvent::~NavigateEvent() { DropJSObjects(this); }

void NavigateEvent::InitNavigateEvent(const NavigateEventInit& aEventInitDict) {
  mNavigationType = aEventInitDict.mNavigationType;
  mDestination = aEventInitDict.mDestination;
  mCanIntercept = aEventInitDict.mCanIntercept;
  mUserInitiated = aEventInitDict.mUserInitiated;
  mHashChange = aEventInitDict.mHashChange;
  mSignal = aEventInitDict.mSignal;
  mFormData = aEventInitDict.mFormData;
  mDownloadRequest = aEventInitDict.mDownloadRequest;
  mInfo = aEventInitDict.mInfo;
  mHasUAVisualTransition = aEventInitDict.mHasUAVisualTransition;
  mSourceElement = aEventInitDict.mSourceElement;
  if (RefPtr document = GetAssociatedDocument()) {
    mLastScrollGeneration = document->LastScrollGeneration();
  }
}

void NavigateEvent::SetCanIntercept(bool aCanIntercept) {
  mCanIntercept = aCanIntercept;
}

enum NavigateEvent::InterceptionState NavigateEvent::InterceptionState() const {
  return mInterceptionState;
}

void NavigateEvent::SetInterceptionState(
    enum InterceptionState aInterceptionState) {
  mInterceptionState = aInterceptionState;
}

nsIStructuredCloneContainer* NavigateEvent::ClassicHistoryAPIState() const {
  return mClassicHistoryAPIState;
}

nsTArray<RefPtr<NavigationInterceptHandler>>&
NavigateEvent::NavigationHandlerList() {
  return mNavigationHandlerList;
}

AbortController* NavigateEvent::AbortController() const {
  return mAbortController;
}

bool NavigateEvent::IsBeingDispatched() const {
  return mEvent->mFlags.mIsBeingDispatched;
}

// https://html.spec.whatwg.org/#navigateevent-finish
void NavigateEvent::Finish(bool aDidFulfill) {
  // Step 1
  MOZ_DIAGNOSTIC_ASSERT(mInterceptionState != InterceptionState::Finished);

  // Step 2
  if (mInterceptionState == InterceptionState::Intercepted) {
    // Step 2.1
    MOZ_DIAGNOSTIC_ASSERT(!aDidFulfill);

    // Step 2.2
    MOZ_DIAGNOSTIC_ASSERT(!mNavigationPrecommitHandlerList.IsEmpty());

    // Step 2.3
    mInterceptionState = InterceptionState::Finished;

    // Step 2.4
    return;
  }

  // Step 3
  if (mInterceptionState == InterceptionState::None) {
    return;
  }

  // Step 4
  PotentiallyResetFocus();

  // Step 5
  if (aDidFulfill) {
    PotentiallyProcessScrollBehavior();
  }

  // Step 6
  mInterceptionState = InterceptionState::Finished;
}

// https://html.spec.whatwg.org/#navigateevent-perform-shared-checks
void NavigateEvent::PerformSharedChecks(ErrorResult& aRv) {
  // Step 1
  if (RefPtr document = GetAssociatedDocument();
      !document || !document->IsFullyActive()) {
    aRv.ThrowInvalidStateError("Document isn't fully active");
    return;
  }

  // Step 2
  if (!IsTrusted()) {
    aRv.ThrowSecurityError("Event is untrusted");
    return;
  }

  // Step 3
  if (DefaultPrevented()) {
    aRv.ThrowInvalidStateError("Event was canceled");
  }
}

// https://html.spec.whatwg.org/#potentially-reset-the-focus
void NavigateEvent::PotentiallyResetFocus() {
  // Step 1
  MOZ_DIAGNOSTIC_ASSERT(mInterceptionState == InterceptionState::Committed ||
                        mInterceptionState == InterceptionState::Scrolled);

  // Step 2
  nsCOMPtr<nsPIDOMWindowInner> window = do_QueryInterface(GetParentObject());

  // If we don't have a window here, there's not much we can do. This could
  // potentially happen in a chrome context, and in the end it's just better to
  // be sure and null check.
  if (NS_WARN_IF(!window)) {
    return;
  }

  Navigation* navigation = window->Navigation();

  // Step 3
  bool focusChanged = navigation->FocusedChangedDuringOngoingNavigation();

  // Step 4
  navigation->SetFocusedChangedDuringOngoingNavigation(false);

  // Step 5
  if (focusChanged) {
    return;
  }

  // Step 6
  if (mFocusResetBehavior &&
      *mFocusResetBehavior == NavigationFocusReset::Manual) {
    return;
  }

  // Step 7
  Document* document = window->GetExtantDoc();

  // If we don't have a document here, there's not much we can do.
  if (NS_WARN_IF(!document)) {
    return;
  }

  // Step 8
  RefPtr<Element> focusTarget = document->GetDocumentElement();
  if (focusTarget) {
    focusTarget =
        focusTarget->GetAutofocusDelegate(mozilla::IsFocusableFlags(0));
  }

  // Step 9
  if (!focusTarget) {
    focusTarget = document->GetBody();
  }

  // Step 10
  if (!focusTarget) {
    focusTarget = document->GetDocumentElement();
  }

  // Step 11, step 12
  FocusOptions options;
  options.mPreventScroll = true;
  focusTarget = nsFocusManager::GetTheFocusableArea(
      focusTarget, nsFocusManager::ProgrammaticFocusFlags(options));

  if (focusTarget) {
    LOG_FMT("Reset focus to {}", *focusTarget->AsNode());
    focusTarget->Focus(options, CallerType::NonSystem, IgnoredErrorResult());
  } else if (RefPtr<nsIFocusManager> focusManager =
                 nsFocusManager::GetFocusManager()) {
    if (nsPIDOMWindowOuter* window = document->GetWindow()) {
      // Now focus the document itself if focus is on an element within it.
      nsCOMPtr<mozIDOMWindowProxy> focusedWindow;
      focusManager->GetFocusedWindow(getter_AddRefs(focusedWindow));
      if (SameCOMIdentity(window, focusedWindow)) {
        LOG_FMT("Reset focus to document viewport");
        focusManager->ClearFocus(focusedWindow);
      }
    }
  }
}

// https://html.spec.whatwg.org/#potentially-process-scroll-behavior
void NavigateEvent::PotentiallyProcessScrollBehavior() {
  // Step 1
  MOZ_DIAGNOSTIC_ASSERT(mInterceptionState == InterceptionState::Committed ||
                        mInterceptionState == InterceptionState::Scrolled);

  // Step 2
  if (mInterceptionState == InterceptionState::Scrolled) {
    return;
  }

  // Step 3
  if (mScrollBehavior && *mScrollBehavior == NavigationScrollBehavior::Manual) {
    return;
  }

  // Process 4
  ProcessScrollBehavior();
}

// Here we want to scroll to the beginning of the document, as described in
// https://drafts.csswg.org/cssom-view/#scroll-to-the-beginning-of-the-document
MOZ_CAN_RUN_SCRIPT
static void ScrollToBeginningOfDocument(Document& aDocument) {
  RefPtr<PresShell> presShell = aDocument.GetPresShell();
  if (!presShell) {
    return;
  }

  RefPtr<Element> rootElement = aDocument.GetRootElement();
  ScrollAxis vertical(WhereToScroll::Start, WhenToScroll::Always);
  presShell->ScrollContentIntoView(rootElement, vertical, ScrollAxis(),
                                   ScrollFlags::TriggeredByScript);
}

// https://html.spec.whatwg.org/#restore-scroll-position-data
static void RestoreScrollPositionData(Document* aDocument,
                                      const uint32_t& aLastScrollGeneration,
                                      SessionHistoryInfo* aHistoryEntry) {
  // 1. Let document be entry's document.
  // 2. If document's has been scrolled by the user is true, then the user agent
  // should return.
  if (!aDocument || aDocument->HasBeenScrolledSince(aLastScrollGeneration)) {
    return;
  }

  RefPtr<nsDocShell> docShell = nsDocShell::Cast(aDocument->GetDocShell());
  if (!docShell) {
    return;
  }

  // 3. The user agent should attempt to use entry's scroll position data to
  // restore the scroll positions of entry's document's restorable scrollable
  // regions. The user agent may continue to attempt to do so periodically,
  // until document's has been scrolled by the user becomes true.
  docShell->RestoreScrollPositionFromTargetSessionHistoryInfo(aHistoryEntry);
}

// https://html.spec.whatwg.org/#process-scroll-behavior
void NavigateEvent::ProcessScrollBehavior() {
  // Step 1
  MOZ_DIAGNOSTIC_ASSERT(mInterceptionState == InterceptionState::Committed);

  // Step 2
  mInterceptionState = InterceptionState::Scrolled;

  // Step 3
  if (mNavigationType == NavigationType::Traverse ||
      mNavigationType == NavigationType::Reload) {
    RefPtr<Document> document = GetAssociatedDocument();
    // SHIP changes the active entry in
    // `nsDocShell::HandleSameDocumentNavigation`, which breaks with Navigation
    // API spec steps as it's too late, and at this point, the actual "active
    // session history entry" will become the target session history entry
    // provided here, which is why we're using this instead of
    // nsDocShell::mActiveEntry
    RestoreScrollPositionData(
        document, mLastScrollGeneration,
        mDestination->GetEntry()
            ? mDestination->GetEntry()->SessionHistoryInfo()
            : nullptr);
    return;
  }

  // Step 4.1
  RefPtr<Document> document = GetAssociatedDocument();
  // If there is no document there's not much to do.
  if (!document) {
    return;
  }

  // Step 4.2
  nsAutoCString ref;
  if (nsIURI* uri = document->GetDocumentURI();
      NS_SUCCEEDED(uri->GetRef(ref)) &&
      !nsContentUtils::GetTargetElement(document, NS_ConvertUTF8toUTF16(ref))) {
    ScrollToBeginningOfDocument(*document);
    return;
  }

  // Step 4.3
  // Here we need to update Document::mScrollToRef, since that is what
  // Document::ScrollToRef will be scrolling to.
  document->SetScrollToRef(document->GetDocumentURI());
  document->ScrollToRef();
}

Document* NavigateEvent::GetAssociatedDocument() const {
  if (nsCOMPtr<nsPIDOMWindowInner> globalWindow =
          do_QueryInterface(GetParentObject())) {
    return globalWindow->GetExtantDoc();
  }
  return nullptr;
}

// https://html.spec.whatwg.org/#ongoing-navigation-tracking:dispatch-flag
void NavigateEvent::Cancel() {
  mEvent->mFlags.mDefaultPrevented = true;
  mEvent->mFlags.mDefaultPreventedByContent = true;
}

}  // namespace mozilla::dom

#undef LOG_FMTI
#undef LOG_FMT
