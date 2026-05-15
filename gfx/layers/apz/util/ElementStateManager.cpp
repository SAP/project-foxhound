/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ElementStateManager.h"
#include "mozilla/EventStateManager.h"
#include "mozilla/PresShell.h"
#include "mozilla/StaticPrefs_ui.h"
#include "mozilla/dom/Element.h"
#include "mozilla/dom/Document.h"
#include "mozilla/layers/APZEventState.h"
#include "mozilla/layers/APZUtils.h"
#include "nsITimer.h"

static mozilla::LazyLogModule sApzAemLog("apz.elementstate");
#define ESM_LOG(...) MOZ_LOG(sApzAemLog, LogLevel::Debug, (__VA_ARGS__))

namespace mozilla {
namespace layers {

class DelayedClearElementActivation final : public nsITimerCallback,
                                            public nsINamed {
 private:
  explicit DelayedClearElementActivation(RefPtr<dom::Element>& aTarget,
                                         const nsCOMPtr<nsITimer>& aTimer)
      : mTarget(aTarget)
        // Hold the reference count until we are called back.
        ,
        mTimer(aTimer),
        mProcessedSingleTap(false) {}

 public:
  NS_DECL_ISUPPORTS

  static RefPtr<DelayedClearElementActivation> Create(
      RefPtr<dom::Element>& aTarget);

  NS_IMETHOD Notify(nsITimer*) override;

  NS_IMETHOD GetName(nsACString& aName) override;

  void MarkSingleTapProcessed();

  bool ProcessedSingleTap() const { return mProcessedSingleTap; }

  void StartTimer();

  /**
   * Clear the Event State Manager's global active content.
   */
  void ClearGlobalActiveContent();

  void ClearTimer() {
    if (mTimer) {
      mTimer->Cancel();
      mTimer = nullptr;
    }
  }
  dom::Element* GetTarget() const { return mTarget; }

 private:
  ~DelayedClearElementActivation() = default;

  RefPtr<dom::Element> mTarget;
  nsCOMPtr<nsITimer> mTimer;
  bool mProcessedSingleTap;
};

static nsPresContext* GetPresContextFor(nsIContent* aContent) {
  if (!aContent) {
    return nullptr;
  }
  PresShell* presShell = aContent->OwnerDoc()->GetPresShell();
  if (!presShell) {
    return nullptr;
  }
  return presShell->GetPresContext();
}

RefPtr<DelayedClearElementActivation> DelayedClearElementActivation::Create(
    RefPtr<dom::Element>& aTarget) {
  nsCOMPtr<nsITimer> timer = NS_NewTimer();
  if (!timer) {
    return nullptr;
  }
  RefPtr<DelayedClearElementActivation> event =
      new DelayedClearElementActivation(aTarget, timer);
  return event;
}

NS_IMETHODIMP DelayedClearElementActivation::Notify(nsITimer*) {
  ESM_LOG("DelayedClearElementActivation notification ready=%d",
          mProcessedSingleTap);
  // If the single tap has been processed and the timer has expired,
  // clear the active element state.
  if (mProcessedSingleTap) {
    ESM_LOG("DelayedClearElementActivation clearing active content");
    ClearGlobalActiveContent();
  }
  mTimer = nullptr;
  return NS_OK;
}

NS_IMETHODIMP DelayedClearElementActivation::GetName(nsACString& aName) {
  aName.AssignLiteral("DelayedClearElementActivation");
  return NS_OK;
}

void DelayedClearElementActivation::StartTimer() {
  MOZ_ASSERT(mTimer);
  // If the timer is null, active content state has already been cleared.
  if (!mTimer) {
    return;
  }
  nsresult rv = mTimer->InitWithCallback(
      this, StaticPrefs::ui_touch_activation_duration_ms(),
      nsITimer::TYPE_ONE_SHOT);
  if (NS_FAILED(rv)) {
    ClearTimer();
  }
}

void DelayedClearElementActivation::MarkSingleTapProcessed() {
  mProcessedSingleTap = true;
  if (!mTimer) {
    ESM_LOG("Clear activation immediate!");
    ClearGlobalActiveContent();
  }
}

void DelayedClearElementActivation::ClearGlobalActiveContent() {
  if (nsPresContext* pc = GetPresContextFor(mTarget)) {
    EventStateManager::ClearGlobalActiveContent(pc->EventStateManager());
  }
  mTarget = nullptr;
}

NS_IMPL_ISUPPORTS(DelayedClearElementActivation, nsITimerCallback, nsINamed)

ElementStateManager::ElementStateManager()
    : mCanBePanOrZoom(false),
      mCanBePanOrZoomSet(false),
      mSingleTapBeforeActivation(false),
      mSingleTapState(apz::SingleTapState::NotClick),
      mSetActiveTask(nullptr),
      mSetHoverTask(nullptr) {}

ElementStateManager::~ElementStateManager() = default;

void ElementStateManager::SetTargetElement(
    dom::EventTarget* aTarget, PreventDefault aTouchStartPreventDefault) {
  if (mTarget) {
    // Multiple fingers on screen (since HandleTouchEnd clears mTarget).
    ESM_LOG("Multiple fingers on-screen, clearing target element");
    CancelActiveTask();
    ResetActive();
    ResetTouchBlockState();
    return;
  }

  mTarget = dom::Element::FromEventTargetOrNull(aTarget);
  ESM_LOG("Setting target element to %p", mTarget.get());
  TriggerElementActivation();
  if (mTarget && !bool(aTouchStartPreventDefault)) {
    ScheduleSetHoverTask();
  }
}

void ElementStateManager::HandleTouchStart(bool aCanBePanOrZoom) {
  ESM_LOG("Touch start, aCanBePanOrZoom: %d", aCanBePanOrZoom);
  if (mCanBePanOrZoomSet) {
    // Multiple fingers on screen (since HandleTouchEnd clears mCanBePanSet).
    ESM_LOG("Multiple fingers on-screen, clearing touch block state");
    CancelActiveTask();
    ResetActive();
    ResetTouchBlockState();
    return;
  }

  mCanBePanOrZoom = aCanBePanOrZoom;
  mCanBePanOrZoomSet = true;
  TriggerElementActivation();
}

void ElementStateManager::TriggerElementActivation() {
  // Reset mSingleTapState here either when HandleTouchStart() or
  // SetTargetElement() gets called.
  // NOTE: It's possible that ProcessSingleTap() gets called in between
  // HandleTouchStart() and SetTargetElement() calls. I.e.,
  // mSingleTapBeforeActivation is true, in such cases it doesn't matter that
  // mSingleTapState was reset once and referred it in ProcessSingleTap() and
  // then reset here again because in ProcessSingleTap() `NotYetDetermined` is
  // the only one state we need to care, and it should NOT happen in the
  // scenario. In other words the case where we need to care `NotYetDetermined`
  // is when ProcessSingleTap() gets called later than any other events and
  // notifications.
  mSingleTapState = apz::SingleTapState::NotClick;

  // Both HandleTouchStart() and SetTargetElement() call this. They can be
  // called in either order. One will set mCanBePanOrZoomSet, and the other,
  // mTarget. We want to actually trigger the activation once both are set.
  if (!(mTarget && mCanBePanOrZoomSet)) {
    return;
  }

  RefPtr<DelayedClearElementActivation> delayedEvent =
      DelayedClearElementActivation::Create(mTarget);
  if (mDelayedClearElementActivation) {
    mDelayedClearElementActivation->ClearTimer();
    mDelayedClearElementActivation->ClearGlobalActiveContent();
  }
  mDelayedClearElementActivation = delayedEvent;

  // If the touch cannot be a pan, make mTarget :active right away.
  // Otherwise, wait a bit to see if the user will pan or not.
  if (!mCanBePanOrZoom) {
    SetActive(mTarget);

    if (mDelayedClearElementActivation) {
      if (mSingleTapBeforeActivation) {
        mDelayedClearElementActivation->MarkSingleTapProcessed();
      }
      mDelayedClearElementActivation->StartTimer();
    }
  } else {
    CancelActiveTask();  // this is only needed because of bug 1169802. Fixing
                         // that bug properly should make this unnecessary.
    ScheduleSetActiveTask();
  }
  ESM_LOG(
      "Got both touch-end event and end touch notiication, clearing pan "
      "state");
  mCanBePanOrZoomSet = false;
}

void ElementStateManager::ClearActivation() {
  ESM_LOG("Clearing element activation");
  CancelActiveTask();
  ResetActive();
}

bool ElementStateManager::HandleTouchEndEvent(apz::SingleTapState aState) {
  ESM_LOG("Touch end event, state: %hhu", static_cast<uint8_t>(aState));

  mTouchEndState += TouchEndState::GotTouchEndEvent;
  return MaybeChangeActiveState(aState);
}

bool ElementStateManager::HandleTouchEnd(apz::SingleTapState aState) {
  ESM_LOG("Touch end");

  mTouchEndState += TouchEndState::GotTouchEndNotification;
  return MaybeChangeActiveState(aState);
}

bool ElementStateManager::MaybeChangeActiveState(apz::SingleTapState aState) {
  if (mTouchEndState !=
      TouchEndStates(TouchEndState::GotTouchEndEvent,
                     TouchEndState::GotTouchEndNotification)) {
    return false;
  }

  CancelActiveTask();

  mSingleTapState = aState;

  if (aState == apz::SingleTapState::WasClick) {
    // Scrollbar thumbs use a different mechanism for their active
    // highlight (the "active" attribute), so don't set the active state
    // on them because nothing will clear it.
    if (mCanBePanOrZoom &&
        !(mTarget && mTarget->IsXULElement(nsGkAtoms::thumb))) {
      SetActive(mTarget);
    }
  } else {
    // We might reach here if mCanBePanOrZoom was false on touch-start and
    // so we set the element active right away. Now it turns out the
    // action was not a click so we need to reset the active element.
    ResetActive();
  }

  ResetTouchBlockState();
  return true;
}

void ElementStateManager::ProcessSingleTap() {
  if (!mDelayedClearElementActivation) {
    // We have not received touch-start notification yet. We will have to run
    // MarkSingleTapProcessed() when we receive the touch-start notification.
    mSingleTapBeforeActivation = true;
    return;
  }

  if (mSingleTapState == apz::SingleTapState::NotYetDetermined) {
    // If we got `NotYetDetermined`, which means at the moment we don't know for
    // sure whether double-tapping will be incoming or not, but now we are sure
    // that no double-tapping will happen, thus it's time to activate the target
    // element.
    if (auto* target = mDelayedClearElementActivation->GetTarget()) {
      SetActive(target);
    }
  }
  mDelayedClearElementActivation->MarkSingleTapProcessed();

  if (mCanBePanOrZoom) {
    // In the case that we have not started the delayed reset of the element
    // activation state, start the timer now.
    mDelayedClearElementActivation->StartTimer();
  }

  // We don't need to keep a reference to the element activation
  // clearing, because the event and its timer keep each other alive
  // until the timer expires
  mDelayedClearElementActivation = nullptr;
}

void ElementStateManager::Destroy() {
  if (mDelayedClearElementActivation) {
    mDelayedClearElementActivation->ClearTimer();
    mDelayedClearElementActivation = nullptr;
  }
  CancelActiveTask();
  CancelHoverTask();
}

void ElementStateManager::HandleStartPanning() {
  ESM_LOG("Start panning");
  ClearActivation();
  // Unlike :active we don't need to unset :hover state.
  // We just need to stop the hover task if it hasn't yet been triggered.
  CancelHoverTask();
}

void ElementStateManager::SetActive(dom::Element* aTarget) {
  ESM_LOG("Setting active %p", aTarget);

  if (nsPresContext* pc = GetPresContextFor(aTarget)) {
    pc->EventStateManager()->SetContentState(aTarget,
                                             dom::ElementState::ACTIVE);
  }
}

void ElementStateManager::SetHover(dom::Element* aTarget) {
  ESM_LOG("Setting hover %p", aTarget);

  if (nsPresContext* pc = GetPresContextFor(aTarget)) {
    pc->EventStateManager()->SetContentState(aTarget, dom::ElementState::HOVER);
  }
}

void ElementStateManager::ResetActive() {
  ESM_LOG("Resetting active from %p", mTarget.get());

  // Clear the :active flag from mTarget by setting it on the document root.
  if (mTarget) {
    dom::Element* root = mTarget->OwnerDoc()->GetDocumentElement();
    if (root) {
      ESM_LOG("Found root %p, making active", root);
      SetActive(root);
    }
  }
}

void ElementStateManager::ResetTouchBlockState() {
  mTarget = nullptr;
  mCanBePanOrZoomSet = false;
  mTouchEndState.clear();
  mSingleTapBeforeActivation = false;
  // NOTE: Do not reset mSingleTapState here since it will be necessary in
  // ProcessSingleTap() to tell whether we need to activate the target element
  // because on environments where double-tap is enabled ProcessSingleTap()
  // gets called after both of touch-end event and end touch notiication
  // arrived.
}

void ElementStateManager::ScheduleSetActiveTask() {
  MOZ_ASSERT(mSetActiveTask == nullptr);

  RefPtr<CancelableRunnable> task =
      NewCancelableRunnableMethod<nsCOMPtr<dom::Element>>(
          "layers::ElementStateManager::SetActiveTask", this,
          &ElementStateManager::SetActiveTask, mTarget);
  mSetActiveTask = task;
  NS_GetCurrentThread()->DelayedDispatch(
      task.forget(), StaticPrefs::ui_touch_activation_delay_ms());
  ESM_LOG("Scheduling mSetActiveTask %p\n", mSetActiveTask.get());
}

void ElementStateManager::SetActiveTask(const nsCOMPtr<dom::Element>& aTarget) {
  ESM_LOG("mSetActiveTask %p running", mSetActiveTask.get());

  // This gets called from mSetActiveTask's Run() method. The message loop
  // deletes the task right after running it, so we need to null out
  // mSetActiveTask to make sure we're not left with a dangling pointer.
  mSetActiveTask = nullptr;
  SetActive(aTarget);
}

void ElementStateManager::CancelActiveTask() {
  ESM_LOG("Cancelling active task %p", mSetActiveTask.get());

  if (mSetActiveTask) {
    mSetActiveTask->Cancel();
    mSetActiveTask = nullptr;
  }
}

void ElementStateManager::ScheduleSetHoverTask() {
  // Clobber the previous hover task.
  CancelHoverTask();

  RefPtr<CancelableRunnable> task =
      NewCancelableRunnableMethod<nsCOMPtr<dom::Element>>(
          "layers::ElementStateManager::SetHoverTask", this,
          &ElementStateManager::SetHoverTask, mTarget);
  mSetHoverTask = task;
  int32_t delay = StaticPrefs::ui_touch_hover_delay_ms();
  if (delay) {
    NS_GetCurrentThread()->DelayedDispatch(task.forget(), delay);
  } else {
    NS_GetCurrentThread()->Dispatch(task.forget());
  }
  ESM_LOG("Scheduling mSetHoverTask %p", mSetHoverTask.get());
}

void ElementStateManager::SetHoverTask(const nsCOMPtr<dom::Element>& aTarget) {
  ESM_LOG("mSetHoverTask %p running", mSetHoverTask.get());

  // This gets called from mSetHoverTask's Run() method. The message loop
  // deletes the task right after running it, so we need to null out
  // mSetHoverTask to make sure we're not left with a dangling pointer.
  mSetHoverTask = nullptr;
  SetHover(aTarget);
}

void ElementStateManager::CancelHoverTask() {
  ESM_LOG("Cancelling task %p", mSetHoverTask.get());

  if (mSetHoverTask) {
    mSetHoverTask->Cancel();
    mSetHoverTask = nullptr;
  }
}
}  // namespace layers
}  // namespace mozilla
