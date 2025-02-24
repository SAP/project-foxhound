/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsFormFillController.h"

#include "mozilla/ClearOnShutdown.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/EventListenerManager.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/Element.h"
#include "mozilla/dom/Event.h"  // for Event
#include "mozilla/dom/HTMLDataListElement.h"
#include "mozilla/dom/HTMLInputElement.h"
#include "mozilla/dom/KeyboardEvent.h"
#include "mozilla/dom/KeyboardEventBinding.h"
#include "mozilla/dom/MouseEvent.h"
#include "mozilla/dom/PageTransitionEvent.h"
#include "mozilla/Logging.h"
#include "mozilla/PresShell.h"
#include "mozilla/Services.h"
#include "mozilla/StaticPrefs_ui.h"
#include "nsCRT.h"
#include "nsString.h"
#include "nsPIDOMWindow.h"
#include "nsIAutoCompleteResult.h"
#include "nsIContent.h"
#include "nsInterfaceHashtable.h"
#include "nsContentUtils.h"
#include "nsGenericHTMLElement.h"
#include "nsILoadContext.h"
#include "nsIFrame.h"
#include "nsIScriptSecurityManager.h"
#include "nsFocusManager.h"
#include "nsQueryActor.h"
#include "nsQueryObject.h"
#include "nsServiceManagerUtils.h"
#include "xpcpublic.h"

using namespace mozilla;
using namespace mozilla::dom;
using mozilla::ErrorResult;
using mozilla::LogLevel;

static mozilla::LazyLogModule sLogger("satchel");

NS_IMPL_CYCLE_COLLECTION(nsFormFillController, mController, mFocusedPopup,
                         mLastListener)

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(nsFormFillController)
  NS_INTERFACE_MAP_ENTRY_AMBIGUOUS(nsISupports, nsIFormFillController)
  NS_INTERFACE_MAP_ENTRY(nsIFormFillController)
  NS_INTERFACE_MAP_ENTRY(nsIAutoCompleteInput)
  NS_INTERFACE_MAP_ENTRY(nsIAutoCompleteSearch)
  NS_INTERFACE_MAP_ENTRY(nsIFormFillCompleteObserver)
  NS_INTERFACE_MAP_ENTRY(nsIDOMEventListener)
  NS_INTERFACE_MAP_ENTRY(nsIObserver)
  NS_INTERFACE_MAP_ENTRY(nsIMutationObserver)
NS_INTERFACE_MAP_END

NS_IMPL_CYCLE_COLLECTING_ADDREF(nsFormFillController)
NS_IMPL_CYCLE_COLLECTING_RELEASE(nsFormFillController)

nsFormFillController::nsFormFillController()
    : mFocusedInput(nullptr),
      mRestartAfterAttributeChangeTask(nullptr),
      mListNode(nullptr),
      // The amount of time a context menu event supresses showing a
      // popup from a focus event in ms. This matches the threshold in
      // toolkit/components/passwordmgr/LoginManagerChild.sys.mjs.
      mFocusAfterRightClickThreshold(400),
      mTimeout(50),
      mMinResultsForPopup(1),
      mMaxRows(0),
      mDisableAutoComplete(false),
      mCompleteDefaultIndex(false),
      mCompleteSelectedIndex(false),
      mForceComplete(false),
      mSuppressOnInput(false),
      mPasswordPopupAutomaticallyOpened(false) {
  mController = do_GetService("@mozilla.org/autocomplete/controller;1");
  MOZ_ASSERT(mController);

  nsCOMPtr<nsIObserverService> obs = mozilla::services::GetObserverService();
  MOZ_ASSERT(obs);

  obs->AddObserver(this, "chrome-event-target-created", false);
  obs->AddObserver(this, "autofill-fill-starting", false);
  obs->AddObserver(this, "autofill-fill-complete", false);
}

nsFormFillController::~nsFormFillController() {
  if (mListNode) {
    mListNode->RemoveMutationObserver(this);
    mListNode = nullptr;
  }
  if (mFocusedInput) {
    MaybeRemoveMutationObserver(mFocusedInput);
    mFocusedInput = nullptr;
  }
  RemoveForDocument(nullptr);
}

/* static */
already_AddRefed<nsFormFillController> nsFormFillController::GetSingleton() {
  static RefPtr<nsFormFillController> sSingleton;
  if (!sSingleton) {
    sSingleton = new nsFormFillController();
    ClearOnShutdown(&sSingleton);
  }
  return do_AddRef(sSingleton);
}

////////////////////////////////////////////////////////////////////////
//// nsIMutationObserver
//

MOZ_CAN_RUN_SCRIPT_BOUNDARY
void nsFormFillController::AttributeChanged(mozilla::dom::Element* aElement,
                                            int32_t aNameSpaceID,
                                            nsAtom* aAttribute,
                                            int32_t aModType,
                                            const nsAttrValue* aOldValue) {
  if ((aAttribute == nsGkAtoms::type || aAttribute == nsGkAtoms::readonly ||
       aAttribute == nsGkAtoms::autocomplete) &&
      aNameSpaceID == kNameSpaceID_None) {
    RefPtr<HTMLInputElement> focusedInput(mFocusedInput);
    // Reset the current state of the controller, unconditionally.
    StopControllingInput();
    // Then restart based on the new values.  We have to delay this
    // to avoid ending up in an endless loop due to re-registering our
    // mutation observer (which would notify us again for *this* event).
    // If there already is a delayed task to restart the controller after an
    // attribute change, cancel it.
    MaybeCancelAttributeChangeTask();
    mRestartAfterAttributeChangeTask =
        mozilla::NewCancelableRunnableMethod<RefPtr<HTMLInputElement>>(
            "nsFormFillController::MaybeStartControllingInput", this,
            &nsFormFillController::MaybeStartControllingInputScheduled,
            focusedInput);
    RefPtr<Runnable> addrefedRunnable = mRestartAfterAttributeChangeTask;
    aElement->OwnerDoc()->Dispatch(addrefedRunnable.forget());
  }

  if (mListNode && mListNode->Contains(aElement)) {
    RevalidateDataList();
  }
}

MOZ_CAN_RUN_SCRIPT_BOUNDARY
void nsFormFillController::MaybeStartControllingInputScheduled(
    HTMLInputElement* aInput) {
  mRestartAfterAttributeChangeTask = nullptr;
  MaybeStartControllingInput(aInput);
}

MOZ_CAN_RUN_SCRIPT_BOUNDARY
void nsFormFillController::MaybeCancelAttributeChangeTask() {
  if (mRestartAfterAttributeChangeTask) {
    mRestartAfterAttributeChangeTask->Cancel();
    mRestartAfterAttributeChangeTask = nullptr;
  }
}

MOZ_CAN_RUN_SCRIPT_BOUNDARY
void nsFormFillController::ContentAppended(nsIContent* aChild) {
  if (mListNode && mListNode->Contains(aChild->GetParent())) {
    RevalidateDataList();
  }
}

MOZ_CAN_RUN_SCRIPT_BOUNDARY
void nsFormFillController::ContentInserted(nsIContent* aChild) {
  if (mListNode && mListNode->Contains(aChild->GetParent())) {
    RevalidateDataList();
  }
}

MOZ_CAN_RUN_SCRIPT_BOUNDARY
void nsFormFillController::ContentRemoved(nsIContent* aChild,
                                          nsIContent* aPreviousSibling) {
  if (mListNode && mListNode->Contains(aChild->GetParent())) {
    RevalidateDataList();
  }
}

void nsFormFillController::CharacterDataWillChange(
    nsIContent* aContent, const CharacterDataChangeInfo&) {}

void nsFormFillController::CharacterDataChanged(
    nsIContent* aContent, const CharacterDataChangeInfo&) {}

void nsFormFillController::AttributeWillChange(mozilla::dom::Element* aElement,
                                               int32_t aNameSpaceID,
                                               nsAtom* aAttribute,
                                               int32_t aModType) {}

void nsFormFillController::ParentChainChanged(nsIContent* aContent) {}

void nsFormFillController::ARIAAttributeDefaultWillChange(
    mozilla::dom::Element* aElement, nsAtom* aAttribute, int32_t aModType) {}

void nsFormFillController::ARIAAttributeDefaultChanged(
    mozilla::dom::Element* aElement, nsAtom* aAttribute, int32_t aModType) {}

MOZ_CAN_RUN_SCRIPT_BOUNDARY
void nsFormFillController::NodeWillBeDestroyed(nsINode* aNode) {
  MOZ_LOG(sLogger, LogLevel::Verbose, ("NodeWillBeDestroyed: %p", aNode));
  mAutoCompleteInputs.Remove(aNode);
  MaybeRemoveMutationObserver(aNode);
  if (aNode == mListNode) {
    mListNode = nullptr;
    RevalidateDataList();
  } else if (aNode == mFocusedInput) {
    mFocusedInput = nullptr;
  }
}

void nsFormFillController::MaybeRemoveMutationObserver(nsINode* aNode) {
  // Nodes being tracked in mAutoCompleteInputs will have their observers
  // removed when they stop being tracked.
  if (!mAutoCompleteInputs.Get(aNode)) {
    aNode->RemoveMutationObserver(this);
  }
}

////////////////////////////////////////////////////////////////////////
//// nsIFormFillController

NS_IMETHODIMP
nsFormFillController::MarkAsAutoCompletableField(HTMLInputElement* aInput) {
  /*
   * Support other components implementing form autofill and handle autocomplete
   * for the field.
   */
  NS_ENSURE_STATE(aInput);

  MOZ_LOG(sLogger, LogLevel::Verbose,
          ("MarkAsAutoCompletableField: aInput = %p", aInput));

  if (mAutoCompleteInputs.Get(aInput)) {
    return NS_OK;
  }

  mAutoCompleteInputs.InsertOrUpdate(aInput, true);
  aInput->AddMutationObserverUnlessExists(this);

  aInput->EnablePreview();

  nsFocusManager* fm = nsFocusManager::GetFocusManager();
  if (fm) {
    nsCOMPtr<nsIContent> focusedContent = fm->GetFocusedElement();
    if (focusedContent == aInput) {
      if (!mFocusedInput) {
        MaybeStartControllingInput(aInput);
      } else {
        // See `MarkAsLoginManagerField` for why this is needed.
        nsCOMPtr<nsIAutoCompleteController> controller = mController;
        controller->ResetInternalState();
      }
    }
  }

  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::GetFocusedInput(HTMLInputElement** aInput) {
  *aInput = mFocusedInput;
  NS_IF_ADDREF(*aInput);
  return NS_OK;
}

////////////////////////////////////////////////////////////////////////
//// nsIAutoCompleteInput

NS_IMETHODIMP
nsFormFillController::GetPopup(nsIAutoCompletePopup** aPopup) {
  *aPopup = mFocusedPopup;
  NS_IF_ADDREF(*aPopup);
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::GetPopupElement(Element** aPopup) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
nsFormFillController::GetController(nsIAutoCompleteController** aController) {
  *aController = mController;
  NS_IF_ADDREF(*aController);
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::GetPopupOpen(bool* aPopupOpen) {
  if (mFocusedPopup) {
    mFocusedPopup->GetPopupOpen(aPopupOpen);
  } else {
    *aPopupOpen = false;
  }
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::SetPopupOpen(bool aPopupOpen) {
  if (mFocusedPopup) {
    if (aPopupOpen) {
      // make sure input field is visible before showing popup (bug 320938)
      nsCOMPtr<nsIContent> content = mFocusedInput;
      NS_ENSURE_STATE(content);
      nsCOMPtr<nsIDocShell> docShell = GetDocShellForInput(mFocusedInput);
      NS_ENSURE_STATE(docShell);
      RefPtr<PresShell> presShell = docShell->GetPresShell();
      NS_ENSURE_STATE(presShell);
      presShell->ScrollContentIntoView(
          content,
          ScrollAxis(WhereToScroll::Nearest, WhenToScroll::IfNotVisible),
          ScrollAxis(WhereToScroll::Nearest, WhenToScroll::IfNotVisible),
          ScrollFlags::ScrollOverflowHidden);
      // mFocusedPopup can be destroyed after ScrollContentIntoView, see bug
      // 420089
      if (mFocusedPopup) {
        mFocusedPopup->OpenAutocompletePopup(this, mFocusedInput);
      }
    } else {
      mFocusedPopup->ClosePopup();
      mPasswordPopupAutomaticallyOpened = false;
    }
  }

  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::GetDisableAutoComplete(bool* aDisableAutoComplete) {
  *aDisableAutoComplete = mDisableAutoComplete;
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::SetDisableAutoComplete(bool aDisableAutoComplete) {
  mDisableAutoComplete = aDisableAutoComplete;
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::GetCompleteDefaultIndex(bool* aCompleteDefaultIndex) {
  *aCompleteDefaultIndex = mCompleteDefaultIndex;
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::SetCompleteDefaultIndex(bool aCompleteDefaultIndex) {
  mCompleteDefaultIndex = aCompleteDefaultIndex;
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::GetCompleteSelectedIndex(bool* aCompleteSelectedIndex) {
  *aCompleteSelectedIndex = mCompleteSelectedIndex;
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::SetCompleteSelectedIndex(bool aCompleteSelectedIndex) {
  mCompleteSelectedIndex = aCompleteSelectedIndex;
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::GetForceComplete(bool* aForceComplete) {
  *aForceComplete = mForceComplete;
  return NS_OK;
}

NS_IMETHODIMP nsFormFillController::SetForceComplete(bool aForceComplete) {
  mForceComplete = aForceComplete;
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::GetMinResultsForPopup(uint32_t* aMinResultsForPopup) {
  *aMinResultsForPopup = mMinResultsForPopup;
  return NS_OK;
}

NS_IMETHODIMP nsFormFillController::SetMinResultsForPopup(
    uint32_t aMinResultsForPopup) {
  mMinResultsForPopup = aMinResultsForPopup;
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::GetMaxRows(uint32_t* aMaxRows) {
  *aMaxRows = mMaxRows;
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::SetMaxRows(uint32_t aMaxRows) {
  mMaxRows = aMaxRows;
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::GetTimeout(uint32_t* aTimeout) {
  *aTimeout = mTimeout;
  return NS_OK;
}

NS_IMETHODIMP nsFormFillController::SetTimeout(uint32_t aTimeout) {
  mTimeout = aTimeout;
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::SetSearchParam(const nsAString& aSearchParam) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
nsFormFillController::GetSearchParam(nsAString& aSearchParam) {
  if (!mFocusedInput) {
    NS_WARNING(
        "mFocusedInput is null for some reason! avoiding a crash. should find "
        "out why... - ben");
    return NS_ERROR_FAILURE;  // XXX why? fix me.
  }

  mFocusedInput->GetName(aSearchParam);
  if (aSearchParam.IsEmpty()) {
    mFocusedInput->GetId(aSearchParam);
  }

  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::GetSearchCount(uint32_t* aSearchCount) {
  *aSearchCount = 1;
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::GetSearchAt(uint32_t index, nsACString& _retval) {
  MOZ_LOG(sLogger, LogLevel::Debug,
          ("GetSearchAt: form-fill-controller field"));

  // The better solution should be AutoCompleteController gets the
  // nsIAutoCompleteSearch interface from AutoCompletePopup and invokes the
  // StartSearch without going through FormFillController. Currently
  // FormFillController acts as the proxy to find the AutoCompletePopup for
  // AutoCompleteController.
  _retval.AssignLiteral("form-fill-controller");
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::GetTextValue(nsAString& aTextValue) {
  if (mFocusedInput) {
    mFocusedInput->GetValue(aTextValue, CallerType::System);
  } else {
    aTextValue.Truncate();
  }
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::SetTextValue(const nsAString& aTextValue) {
  if (mFocusedInput) {
    mSuppressOnInput = true;
    mFocusedInput->SetUserInput(aTextValue,
                                *nsContentUtils::GetSystemPrincipal());
    mSuppressOnInput = false;
  }

  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::GetSelectionStart(int32_t* aSelectionStart) {
  if (!mFocusedInput) {
    return NS_ERROR_UNEXPECTED;
  }
  ErrorResult rv;
  *aSelectionStart = mFocusedInput->GetSelectionStartIgnoringType(rv);
  return rv.StealNSResult();
}

NS_IMETHODIMP
nsFormFillController::GetSelectionEnd(int32_t* aSelectionEnd) {
  if (!mFocusedInput) {
    return NS_ERROR_UNEXPECTED;
  }
  ErrorResult rv;
  *aSelectionEnd = mFocusedInput->GetSelectionEndIgnoringType(rv);
  return rv.StealNSResult();
}

MOZ_CAN_RUN_SCRIPT_BOUNDARY NS_IMETHODIMP
nsFormFillController::SelectTextRange(int32_t aStartIndex, int32_t aEndIndex) {
  if (!mFocusedInput) {
    return NS_ERROR_UNEXPECTED;
  }
  RefPtr<HTMLInputElement> focusedInput(mFocusedInput);
  ErrorResult rv;
  focusedInput->SetSelectionRange(aStartIndex, aEndIndex, Optional<nsAString>(),
                                  rv);
  return rv.StealNSResult();
}

NS_IMETHODIMP
nsFormFillController::OnSearchBegin() { return NS_OK; }

NS_IMETHODIMP
nsFormFillController::OnSearchComplete() { return NS_OK; }

NS_IMETHODIMP
nsFormFillController::OnTextEntered(Event* aEvent) {
  NS_ENSURE_TRUE(mFocusedInput, NS_OK);
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::OnTextReverted(bool* _retval) {
  mPasswordPopupAutomaticallyOpened = false;
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::GetConsumeRollupEvent(bool* aConsumeRollupEvent) {
  *aConsumeRollupEvent = false;
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::GetInPrivateContext(bool* aInPrivateContext) {
  if (!mFocusedInput) {
    *aInPrivateContext = false;
    return NS_OK;
  }

  RefPtr<Document> doc = mFocusedInput->OwnerDoc();
  nsCOMPtr<nsILoadContext> loadContext = doc->GetLoadContext();
  *aInPrivateContext = loadContext && loadContext->UsePrivateBrowsing();
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::GetNoRollupOnCaretMove(bool* aNoRollupOnCaretMove) {
  *aNoRollupOnCaretMove = false;
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::GetNoRollupOnEmptySearch(bool* aNoRollupOnEmptySearch) {
  if (mFocusedInput && mFocusedPopup) {
    return mFocusedPopup->GetNoRollupOnEmptySearch(mFocusedInput,
                                                   aNoRollupOnEmptySearch);
  }

  *aNoRollupOnEmptySearch = false;
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::GetUserContextId(uint32_t* aUserContextId) {
  *aUserContextId = nsIScriptSecurityManager::DEFAULT_USER_CONTEXT_ID;
  return NS_OK;
}

NS_IMETHODIMP
nsFormFillController::GetInvalidatePreviousResult(
    bool* aInvalidatePreviousResult) {
  *aInvalidatePreviousResult = mInvalidatePreviousResult;
  return NS_OK;
}

////////////////////////////////////////////////////////////////////////
//// nsIAutoCompleteSearch

NS_IMETHODIMP
nsFormFillController::StartSearch(const nsAString& aSearchString,
                                  const nsAString& aSearchParam,
                                  nsIAutoCompleteResult* aPreviousResult,
                                  nsIAutoCompleteObserver* aListener) {
  MOZ_LOG(sLogger, LogLevel::Debug, ("StartSearch for %p", mFocusedInput));

  mLastListener = aListener;

  if (mFocusedInput && mFocusedPopup) {
    if (mAutoCompleteInputs.Get(mFocusedInput) ||
        mFocusedInput->HasBeenTypePassword()) {
      MOZ_LOG(sLogger, LogLevel::Debug,
              ("StartSearch: formautofill or login field"));

      return mFocusedPopup->StartSearch(aSearchString, mFocusedInput, this);
    }
  }

  MOZ_LOG(sLogger, LogLevel::Debug, ("StartSearch: form history field"));

  bool addDataList = IsTextControl(mFocusedInput);
  if (addDataList) {
    MaybeObserveDataListMutations();
  }

  return mFocusedPopup->StartSearch(aSearchString, mFocusedInput, this);
}

void nsFormFillController::MaybeObserveDataListMutations() {
  // If an <input> is focused, check if it has a list="<datalist>" which can
  // provide the list of suggestions.

  if (mFocusedInput) {
    Element* list = mFocusedInput->GetList();

    // Add a mutation observer to check for changes to the items in the
    // <datalist> and update the suggestions accordingly.
    if (mListNode != list) {
      if (mListNode) {
        mListNode->RemoveMutationObserver(this);
        mListNode = nullptr;
      }
      if (list) {
        list->AddMutationObserverUnlessExists(this);
        mListNode = list;
      }
    }
  }
}

void nsFormFillController::RevalidateDataList() {
  if (!mLastListener) {
    return;
  }

  nsCOMPtr<nsIAutoCompleteController> controller(
      do_QueryInterface(mLastListener));
  if (!controller) {
    return;
  }

  // We cannot use previous result since any items in search target are updated.
  mInvalidatePreviousResult = true;
  controller->StartSearch(mLastSearchString);
}

NS_IMETHODIMP
nsFormFillController::StopSearch() {
  if (mFocusedPopup) {
    mFocusedPopup->StopSearch();
  }

  return NS_OK;
}

////////////////////////////////////////////////////////////////////////
//// nsIFormFillCompleteObserver

NS_IMETHODIMP
nsFormFillController::OnSearchCompletion(nsIAutoCompleteResult* aResult) {
  nsAutoString searchString;
  aResult->GetSearchString(searchString);

  mLastSearchString = searchString;

  if (mLastListener) {
    nsCOMPtr<nsIAutoCompleteObserver> lastListener = mLastListener;
    lastListener->OnSearchResult(this, aResult);
  }

  return NS_OK;
}

////////////////////////////////////////////////////////////////////////
//// nsIObserver

NS_IMETHODIMP
nsFormFillController::Observe(nsISupports* aSubject, const char* aTopic,
                              const char16_t* aData) {
  if (!nsCRT::strcmp(aTopic, "chrome-event-target-created")) {
    if (RefPtr<EventTarget> eventTarget = do_QueryObject(aSubject)) {
      AttachListeners(eventTarget);
    }
  } else if (!nsCRT::strcmp(aTopic, "autofill-fill-starting")) {
    mAutoCompleteActive = true;
  } else if (!nsCRT::strcmp(aTopic, "autofill-fill-complete")) {
    mAutoCompleteActive = false;
  }
  return NS_OK;
}

////////////////////////////////////////////////////////////////////////
//// nsIDOMEventListener

NS_IMETHODIMP
nsFormFillController::HandleEvent(Event* aEvent) {
  EventTarget* target = aEvent->GetOriginalTarget();
  NS_ENSURE_STATE(target);

  mInvalidatePreviousResult = false;

  nsIGlobalObject* global = target->GetOwnerGlobal();
  NS_ENSURE_STATE(global);
  nsPIDOMWindowInner* inner = global->GetAsInnerWindow();
  NS_ENSURE_STATE(inner);

  if (!inner->GetBrowsingContext()->IsContent()) {
    return NS_OK;
  }

  if (aEvent->ShouldIgnoreChromeEventTargetListener()) {
    return NS_OK;
  }

  WidgetEvent* internalEvent = aEvent->WidgetEventPtr();
  NS_ENSURE_STATE(internalEvent);

  switch (internalEvent->mMessage) {
    case eFocus:
      return Focus(aEvent);
    case eMouseDown:
      return MouseDown(aEvent);
    case eKeyDown:
      return KeyDown(aEvent);
    case eEditorInput: {
      if (!(mAutoCompleteActive || mSuppressOnInput)) {
        nsCOMPtr<nsINode> input =
            do_QueryInterface(aEvent->GetComposedTarget());
        if (IsTextControl(input) && IsFocusedInputControlled()) {
          nsCOMPtr<nsIAutoCompleteController> controller = mController;
          bool unused = false;
          return controller->HandleText(&unused);
        }
      }
      return NS_OK;
    }
    case eBlur:
      if (mFocusedInput && !StaticPrefs::ui_popup_disable_autohide()) {
        StopControllingInput();
      }
      return NS_OK;
    case eCompositionStart:
      NS_ASSERTION(mController, "should have a controller!");
      if (IsFocusedInputControlled()) {
        nsCOMPtr<nsIAutoCompleteController> controller = mController;
        controller->HandleStartComposition();
      }
      return NS_OK;
    case eCompositionEnd:
      NS_ASSERTION(mController, "should have a controller!");
      if (IsFocusedInputControlled()) {
        nsCOMPtr<nsIAutoCompleteController> controller = mController;
        controller->HandleEndComposition();
      }
      return NS_OK;
    case eContextMenu:
      if (mFocusedPopup) {
        mFocusedPopup->ClosePopup();
      }
      return NS_OK;
    case ePageHide: {
      nsCOMPtr<Document> doc = do_QueryInterface(aEvent->GetTarget());
      if (!doc) {
        return NS_OK;
      }

      if (mFocusedInput && doc == mFocusedInput->OwnerDoc()) {
        StopControllingInput();
      }

      // Only remove the observer notifications and marked autofill and password
      // manager fields if the page isn't going to be persisted (i.e. it's being
      // unloaded) so that appropriate autocomplete handling works with bfcache.
      bool persisted = aEvent->AsPageTransitionEvent()->Persisted();
      if (!persisted) {
        RemoveForDocument(doc);
      }
    } break;
    default:
      // Handling the default case to shut up stupid -Wswitch warnings.
      // One day compilers will be smarter...
      break;
  }

  return NS_OK;
}

void nsFormFillController::AttachListeners(EventTarget* aEventTarget) {
  EventListenerManager* elm = aEventTarget->GetOrCreateListenerManager();
  NS_ENSURE_TRUE_VOID(elm);

  elm->AddEventListenerByType(this, u"focus"_ns, TrustedEventsAtCapture());
  elm->AddEventListenerByType(this, u"blur"_ns, TrustedEventsAtCapture());
  elm->AddEventListenerByType(this, u"pagehide"_ns, TrustedEventsAtCapture());
  elm->AddEventListenerByType(this, u"mousedown"_ns, TrustedEventsAtCapture());
  elm->AddEventListenerByType(this, u"input"_ns, TrustedEventsAtCapture());
  elm->AddEventListenerByType(this, u"keydown"_ns, TrustedEventsAtCapture());
  elm->AddEventListenerByType(this, u"keypress"_ns,
                              TrustedEventsAtSystemGroupCapture());
  elm->AddEventListenerByType(this, u"compositionstart"_ns,
                              TrustedEventsAtCapture());
  elm->AddEventListenerByType(this, u"compositionend"_ns,
                              TrustedEventsAtCapture());
  elm->AddEventListenerByType(this, u"contextmenu"_ns,
                              TrustedEventsAtCapture());
}

void nsFormFillController::RemoveForDocument(Document* aDoc) {
  MOZ_LOG(sLogger, LogLevel::Verbose, ("RemoveForDocument: %p", aDoc));

  for (auto iter = mAutoCompleteInputs.Iter(); !iter.Done(); iter.Next()) {
    const nsINode* key = iter.Key();
    if (key && (!aDoc || key->OwnerDoc() == aDoc)) {
      // mFocusedInput's observer is tracked separately, so don't remove it
      // here.
      if (key != mFocusedInput) {
        const_cast<nsINode*>(key)->RemoveMutationObserver(this);
      }
      iter.Remove();
    }
  }
}

bool nsFormFillController::IsTextControl(nsINode* aNode) {
  nsCOMPtr<nsIFormControl> formControl = do_QueryInterface(aNode);
  return formControl && formControl->IsSingleLineTextControl(false);
}

void nsFormFillController::MaybeStartControllingInput(
    HTMLInputElement* aInput) {
  MOZ_LOG(sLogger, LogLevel::Verbose,
          ("MaybeStartControllingInput for %p", aInput));
  if (!aInput) {
    return;
  }

  bool hasList = !!aInput->GetList();

  if (!IsTextControl(aInput)) {
    // Even if this is not a text control yet, it can become one in the future
    if (hasList) {
      StartControllingInput(aInput);
    }
    return;
  }

  if (mAutoCompleteInputs.Get(aInput) || aInput->HasBeenTypePassword() ||
      hasList || nsContentUtils::IsAutocompleteEnabled(aInput)) {
    StartControllingInput(aInput);
  }
}

nsresult nsFormFillController::HandleFocus(HTMLInputElement* aInput) {
  MaybeStartControllingInput(aInput);

  // Bail if we didn't start controlling the input.
  if (!mFocusedInput) {
    return NS_OK;
  }

  // if there is a delayed task to restart the controller after an attribute
  // change, cancel it to prevent it overriding the focused input
  MaybeCancelAttributeChangeTask();

  // If this focus doesn't follow a right click within our specified
  // threshold then show the autocomplete popup for all password fields.
  // This is done to avoid showing both the context menu and the popup
  // at the same time.
  // We use a timestamp instead of a bool to avoid complexity when dealing with
  // multiple input forms and the fact that a mousedown into an already focused
  // field does not trigger another focus.

  if (!mFocusedInput->HasBeenTypePassword()) {
    return NS_OK;
  }

  // If we have not seen a right click yet, just show the popup.
  if (mLastRightClickTimeStamp.IsNull()) {
    mPasswordPopupAutomaticallyOpened = true;
    ShowPopup();
    return NS_OK;
  }

  uint64_t timeDiff =
      (TimeStamp::Now() - mLastRightClickTimeStamp).ToMilliseconds();
  if (timeDiff > mFocusAfterRightClickThreshold) {
    mPasswordPopupAutomaticallyOpened = true;
    ShowPopup();
  }

  return NS_OK;
}

nsresult nsFormFillController::Focus(Event* aEvent) {
  nsCOMPtr<nsIContent> input = do_QueryInterface(aEvent->GetComposedTarget());
  return HandleFocus(MOZ_KnownLive(HTMLInputElement::FromNodeOrNull(input)));
}

nsresult nsFormFillController::KeyDown(Event* aEvent) {
  NS_ASSERTION(mController, "should have a controller!");

  mPasswordPopupAutomaticallyOpened = false;

  if (!IsFocusedInputControlled()) {
    return NS_OK;
  }

  RefPtr<KeyboardEvent> keyEvent = aEvent->AsKeyboardEvent();
  if (!keyEvent) {
    return NS_ERROR_FAILURE;
  }

  bool cancel = false;
  bool unused = false;

  uint32_t k = keyEvent->KeyCode();
  switch (k) {
    case KeyboardEvent_Binding::DOM_VK_RETURN: {
      nsCOMPtr<nsIAutoCompleteController> controller = mController;
      controller->HandleEnter(false, aEvent, &cancel);
      break;
    }
    case KeyboardEvent_Binding::DOM_VK_DELETE:
#ifndef XP_MACOSX
    {
      nsCOMPtr<nsIAutoCompleteController> controller = mController;
      controller->HandleDelete(&cancel);
      break;
    }
    case KeyboardEvent_Binding::DOM_VK_BACK_SPACE: {
      nsCOMPtr<nsIAutoCompleteController> controller = mController;
      controller->HandleText(&unused);
      break;
    }
#else
    case KeyboardEvent_Binding::DOM_VK_BACK_SPACE: {
      if (keyEvent->ShiftKey()) {
        nsCOMPtr<nsIAutoCompleteController> controller = mController;
        controller->HandleDelete(&cancel);
      } else {
        nsCOMPtr<nsIAutoCompleteController> controller = mController;
        controller->HandleText(&unused);
      }
      break;
    }
#endif
    case KeyboardEvent_Binding::DOM_VK_PAGE_UP:
    case KeyboardEvent_Binding::DOM_VK_PAGE_DOWN: {
      if (keyEvent->CtrlKey() || keyEvent->AltKey() || keyEvent->MetaKey()) {
        break;
      }
    }
      [[fallthrough]];
    case KeyboardEvent_Binding::DOM_VK_UP:
    case KeyboardEvent_Binding::DOM_VK_DOWN:
    case KeyboardEvent_Binding::DOM_VK_LEFT:
    case KeyboardEvent_Binding::DOM_VK_RIGHT: {
      // Get the writing-mode of the relevant input element,
      // so that we can remap arrow keys if necessary.
      mozilla::WritingMode wm;
      if (mFocusedInput) {
        nsIFrame* frame = mFocusedInput->GetPrimaryFrame();
        if (frame) {
          wm = frame->GetWritingMode();
        }
      }
      if (wm.IsVertical()) {
        switch (k) {
          case KeyboardEvent_Binding::DOM_VK_LEFT:
            k = wm.IsVerticalLR() ? KeyboardEvent_Binding::DOM_VK_UP
                                  : KeyboardEvent_Binding::DOM_VK_DOWN;
            break;
          case KeyboardEvent_Binding::DOM_VK_RIGHT:
            k = wm.IsVerticalLR() ? KeyboardEvent_Binding::DOM_VK_DOWN
                                  : KeyboardEvent_Binding::DOM_VK_UP;
            break;
          case KeyboardEvent_Binding::DOM_VK_UP:
            k = KeyboardEvent_Binding::DOM_VK_LEFT;
            break;
          case KeyboardEvent_Binding::DOM_VK_DOWN:
            k = KeyboardEvent_Binding::DOM_VK_RIGHT;
            break;
        }
      }
      nsCOMPtr<nsIAutoCompleteController> controller = mController;
      controller->HandleKeyNavigation(k, &cancel);
      break;
    }
    case KeyboardEvent_Binding::DOM_VK_ESCAPE: {
      nsCOMPtr<nsIAutoCompleteController> controller = mController;
      controller->HandleEscape(&cancel);
      break;
    }
    case KeyboardEvent_Binding::DOM_VK_TAB: {
      nsCOMPtr<nsIAutoCompleteController> controller = mController;
      controller->HandleTab();
      cancel = false;
      break;
    }
  }

  if (cancel) {
    aEvent->PreventDefault();
    // Don't let the page see the RETURN event when the popup is open
    // (indicated by cancel=true) so sites don't manually submit forms
    // (e.g. via submit.click()) without the autocompleted value being filled.
    // Bug 286933 will fix this for other key events.
    if (k == KeyboardEvent_Binding::DOM_VK_RETURN) {
      aEvent->StopPropagation();
    }
  }

  return NS_OK;
}

nsresult nsFormFillController::MouseDown(Event* aEvent) {
  MouseEvent* mouseEvent = aEvent->AsMouseEvent();
  if (!mouseEvent) {
    return NS_ERROR_FAILURE;
  }

  nsCOMPtr<nsINode> targetNode = do_QueryInterface(aEvent->GetComposedTarget());
  if (!HTMLInputElement::FromNodeOrNull(targetNode)) {
    return NS_OK;
  }

  int16_t button = mouseEvent->Button();

  // In case of a right click we set a timestamp that
  // will be checked in Focus() to avoid showing
  // both contextmenu and popup at the same time.
  if (button == 2) {
    mLastRightClickTimeStamp = TimeStamp::Now();
    return NS_OK;
  }

  if (button != 0) {
    return NS_OK;
  }

  return ShowPopup();
}

NS_IMETHODIMP
nsFormFillController::ShowPopup() {
  bool isOpen = false;
  GetPopupOpen(&isOpen);
  if (isOpen) {
    return SetPopupOpen(false);
  }

  nsCOMPtr<nsIAutoCompleteController> controller = mController;

  nsCOMPtr<nsIAutoCompleteInput> input;
  controller->GetInput(getter_AddRefs(input));
  if (!input) {
    return NS_OK;
  }

  nsAutoString value;
  input->GetTextValue(value);
  if (value.Length() > 0) {
    // Show the popup with a filtered result set
    controller->SetSearchString(u""_ns);
    bool unused = false;
    controller->HandleText(&unused);
  } else {
    // Show the popup with the complete result set.  Can't use HandleText()
    // because it doesn't display the popup if the input is blank.
    bool cancel = false;
    controller->HandleKeyNavigation(KeyboardEvent_Binding::DOM_VK_DOWN,
                                    &cancel);
  }

  return NS_OK;
}

NS_IMETHODIMP nsFormFillController::GetPasswordPopupAutomaticallyOpened(
    bool* _retval) {
  *_retval = mPasswordPopupAutomaticallyOpened;
  return NS_OK;
}

void nsFormFillController::StartControllingInput(HTMLInputElement* aInput) {
  MOZ_LOG(sLogger, LogLevel::Verbose, ("StartControllingInput for %p", aInput));
  // Make sure we're not still attached to an input
  StopControllingInput();

  if (!mController || !aInput) {
    return;
  }

  nsCOMPtr<nsIAutoCompletePopup> popup =
      do_QueryActor("AutoComplete", aInput->OwnerDoc());
  if (!popup) {
    return;
  }

  mFocusedPopup = popup;

  aInput->AddMutationObserverUnlessExists(this);
  mFocusedInput = aInput;

  if (Element* list = mFocusedInput->GetList()) {
    list->AddMutationObserverUnlessExists(this);
    mListNode = list;
  }

  if (!mFocusedInput->ReadOnly()) {
    nsCOMPtr<nsIAutoCompleteController> controller = mController;
    controller->SetInput(this);
  }
}

bool nsFormFillController::IsFocusedInputControlled() const {
  return mFocusedInput && mController && !mFocusedInput->ReadOnly();
}

void nsFormFillController::StopControllingInput() {
  mPasswordPopupAutomaticallyOpened = false;

  if (mListNode) {
    mListNode->RemoveMutationObserver(this);
    mListNode = nullptr;
  }

  if (nsCOMPtr<nsIAutoCompleteController> controller = mController) {
    // Reset the controller's input, but not if it has been switched
    // to another input already, which might happen if the user switches
    // focus by clicking another autocomplete textbox
    nsCOMPtr<nsIAutoCompleteInput> input;
    controller->GetInput(getter_AddRefs(input));
    if (input == this) {
      MOZ_LOG(sLogger, LogLevel::Verbose,
              ("StopControllingInput: Nulled controller input for %p", this));
      controller->SetInput(nullptr);
    }
  }

  MOZ_LOG(sLogger, LogLevel::Verbose,
          ("StopControllingInput: Stopped controlling %p", mFocusedInput));
  if (mFocusedInput) {
    MaybeRemoveMutationObserver(mFocusedInput);
    mFocusedInput = nullptr;
  }

  if (mFocusedPopup) {
    mFocusedPopup->ClosePopup();
  }
  mFocusedPopup = nullptr;
}

nsIDocShell* nsFormFillController::GetDocShellForInput(
    HTMLInputElement* aInput) {
  NS_ENSURE_TRUE(aInput, nullptr);

  nsCOMPtr<nsPIDOMWindowOuter> win = aInput->OwnerDoc()->GetWindow();
  NS_ENSURE_TRUE(win, nullptr);

  return win->GetDocShell();
}
