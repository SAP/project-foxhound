/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "VisualViewport.h"

#include "DocumentInlines.h"
#include "mozilla/EventDispatcher.h"
#include "mozilla/PresShell.h"
#include "mozilla/ScrollContainerFrame.h"
#include "mozilla/ToString.h"
#include "nsGlobalWindowInner.h"
#include "nsIDocShell.h"
#include "nsPIDOMWindowInlines.h"
#include "nsPresContext.h"
#include "nsRefreshDriver.h"

static mozilla::LazyLogModule sVvpLog("visualviewport");
#define VVP_LOG(...) MOZ_LOG(sVvpLog, LogLevel::Debug, (__VA_ARGS__))

using namespace mozilla;
using namespace mozilla::dom;

class VisualViewport::VisualViewportScrollEndEvent : public Runnable {
 public:
  NS_DECL_NSIRUNNABLE
  VisualViewportScrollEndEvent(VisualViewport* aViewport,
                               nsPresContext* aPresContext);
  bool HasPresContext(nsPresContext* aContext) const;
  void Revoke();

 protected:
  // mViewport will only be assigned to the parent viewport, will be
  // constructed by the parent, will be owned by the parent, and will
  // be reset when the parent viewport is destructed.
  VisualViewport* mViewport;
  WeakPtr<nsPresContext> mPresContext;
};

class VisualViewport::VisualViewportScrollEvent
    : public VisualViewportScrollEndEvent {
 public:
  NS_DECL_NSIRUNNABLE
  VisualViewportScrollEvent(VisualViewport* aViewport,
                            nsPresContext* aPresContext,
                            const nsPoint& aPrevVisualOffset,
                            const nsPoint& aPrevLayoutOffset);
  nsPoint PrevVisualOffset() const { return mPrevVisualOffset; }
  nsPoint PrevLayoutOffset() const { return mPrevLayoutOffset; }

 private:
  // The VisualViewport "scroll" event is supposed to be fired only when the
  // *relative* offset between visual and layout viewport changes. The two
  // viewports are updated independently from each other, though, so the only
  // thing we can do is note the fact that one of the inputs into the relative
  // visual viewport offset changed and then check the offset again at the
  // next refresh driver tick, just before the event is going to fire.
  // Hopefully, at this point both visual and layout viewport positions have
  // been updated, so that we're able to tell whether the relative offset did
  // in fact change or not.
  const nsPoint mPrevVisualOffset;
  const nsPoint mPrevLayoutOffset;
};

VisualViewport::VisualViewport(nsPIDOMWindowInner* aWindow)
    : DOMEventTargetHelper(aWindow) {}

VisualViewport::~VisualViewport() {
  if (mScrollEvent) {
    mScrollEvent->Revoke();
  }

  if (mScrollEndEvent) {
    mScrollEndEvent->Revoke();
  }
}

/* virtual */
JSObject* VisualViewport::WrapObject(JSContext* aCx,
                                     JS::Handle<JSObject*> aGivenProto) {
  return VisualViewport_Binding::Wrap(aCx, this, aGivenProto);
}

/* virtual */
void VisualViewport::GetEventTargetParent(EventChainPreVisitor& aVisitor) {
  EventMessage msg = aVisitor.mEvent->mMessage;

  aVisitor.mCanHandle = true;
  EventTarget* parentTarget = nullptr;
  // Only our special internal events are allowed to escape the
  // Visual Viewport and be dispatched further up the DOM tree.
  if (msg == eMozVisualScroll || msg == eMozVisualResize) {
    if (nsPIDOMWindowInner* win = GetOwnerWindow()) {
      if (Document* doc = win->GetExtantDoc()) {
        parentTarget = doc;
      }
    }
  }
  aVisitor.SetParentTarget(parentTarget, false);
}

CSSSize VisualViewport::VisualViewportSize() const {
  CSSSize size = CSSSize(0, 0);

  // Flush layout, as that may affect the answer below (e.g. scrollbars
  // may have appeared, decreasing the available viewport size).
  RefPtr<const VisualViewport> kungFuDeathGrip(this);
  if (Document* doc = GetDocument()) {
    doc->FlushPendingNotifications(FlushType::Layout);
  }

  // Fetch the pres shell after the layout flush, as it might have destroyed it.
  if (PresShell* presShell = GetPresShell()) {
    if (presShell->IsVisualViewportSizeSet()) {
      size = CSSRect::FromAppUnits(presShell->GetVisualViewportSize());
    } else {
      ScrollContainerFrame* sf = presShell->GetRootScrollContainerFrame();
      if (sf) {
        size = CSSRect::FromAppUnits(sf->GetScrollPortRect().Size());
      }
    }
  }
  return size;
}

double VisualViewport::Width() const {
  CSSSize size = VisualViewportSize();
  return size.width;
}

double VisualViewport::Height() const {
  CSSSize size = VisualViewportSize();
  return size.height;
}

double VisualViewport::Scale() const {
  double scale = 1;
  if (PresShell* presShell = GetPresShell()) {
    scale = presShell->GetResolution();
  }
  return scale;
}

CSSPoint VisualViewport::VisualViewportOffset() const {
  CSSPoint offset = CSSPoint(0, 0);

  if (PresShell* presShell = GetPresShell()) {
    offset = CSSPoint::FromAppUnits(presShell->GetVisualViewportOffset());
  }
  return offset;
}

CSSPoint VisualViewport::LayoutViewportOffset() const {
  CSSPoint offset = CSSPoint(0, 0);

  if (PresShell* presShell = GetPresShell()) {
    offset = CSSPoint::FromAppUnits(presShell->GetLayoutViewportOffset());
  }
  return offset;
}

double VisualViewport::PageLeft() const { return VisualViewportOffset().X(); }

double VisualViewport::PageTop() const { return VisualViewportOffset().Y(); }

double VisualViewport::OffsetLeft() const {
  return PageLeft() - LayoutViewportOffset().X();
}

double VisualViewport::OffsetTop() const {
  return PageTop() - LayoutViewportOffset().Y();
}

Document* VisualViewport::GetDocument() const {
  nsCOMPtr<nsPIDOMWindowInner> window = GetOwnerWindow();
  if (!window) {
    return nullptr;
  }

  nsIDocShell* docShell = window->GetDocShell();
  if (!docShell) {
    return nullptr;
  }

  return docShell->GetDocument();
}

PresShell* VisualViewport::GetPresShell() const {
  RefPtr<Document> document = GetDocument();
  return document ? document->GetPresShell() : nullptr;
}

nsPresContext* VisualViewport::GetPresContext() const {
  RefPtr<Document> document = GetDocument();
  return document ? document->GetPresContext() : nullptr;
}

/* ================= Resize event handling ================= */

void VisualViewport::PostResizeEvent() {
  VVP_LOG("%p: PostResizeEvent", this);
  if (PresShell* ps = GetPresShell()) {
    ps->ScheduleResizeEventIfNeeded(PresShell::ResizeEventKind::Visual);
  }
}

void VisualViewport::FireResizeEvent() {
  RefPtr<nsPresContext> presContext = GetPresContext();

  VVP_LOG("%p, FireResizeEvent, fire mozvisualresize\n", this);
  WidgetEvent mozEvent(true, eMozVisualResize);
  mozEvent.mFlags.mOnlySystemGroupDispatch = true;
  EventDispatcher::Dispatch(this, presContext, &mozEvent);

  VVP_LOG("%p, FireResizeEvent, fire VisualViewport resize\n", this);
  WidgetEvent event(true, eResize);
  event.mFlags.mBubbles = false;
  event.mFlags.mCancelable = false;
  EventDispatcher::Dispatch(this, presContext, &event);
}

/* ================= Scroll event handling ================= */

void VisualViewport::PostScrollEvent(const nsPoint& aPrevVisualOffset,
                                     const nsPoint& aPrevLayoutOffset) {
  VVP_LOG("%p: PostScrollEvent, prevRelativeOffset=%s (pre-existing: %d)\n",
          this, ToString(aPrevVisualOffset - aPrevLayoutOffset).c_str(),
          !!mScrollEvent);
  nsPresContext* presContext = GetPresContext();
  if (mScrollEvent && mScrollEvent->HasPresContext(presContext)) {
    return;
  }

  if (mScrollEvent) {
    // prescontext changed, so discard the old scroll event and queue a new one
    mScrollEvent->Revoke();
    mScrollEvent = nullptr;
  }

  // The event constructor will register itself with the refresh driver.
  if (presContext) {
    mScrollEvent = new VisualViewportScrollEvent(
        this, presContext, aPrevVisualOffset, aPrevLayoutOffset);
    VVP_LOG("%p: PostScrollEvent, created new event\n", this);
  }
}

VisualViewport::VisualViewportScrollEvent::VisualViewportScrollEvent(
    VisualViewport* aViewport, nsPresContext* aPresContext,
    const nsPoint& aPrevVisualOffset, const nsPoint& aPrevLayoutOffset)
    : VisualViewportScrollEndEvent(aViewport, aPresContext),
      mPrevVisualOffset(aPrevVisualOffset),
      mPrevLayoutOffset(aPrevLayoutOffset) {
  VVP_LOG("%p: Registering PostScroll on %p %p\n", aViewport, aPresContext,
          aPresContext->RefreshDriver());
  aPresContext->PresShell()->PostScrollEvent(this);
}

// TODO: Convert this to MOZ_CAN_RUN_SCRIPT (bug 1415230, bug 1535398)
MOZ_CAN_RUN_SCRIPT_BOUNDARY NS_IMETHODIMP
VisualViewport::VisualViewportScrollEvent::Run() {
  if (RefPtr<VisualViewport> viewport = mViewport) {
    viewport->FireScrollEvent();
  }
  return NS_OK;
}

void VisualViewport::FireScrollEvent() {
  MOZ_ASSERT(mScrollEvent);
  nsPoint prevVisualOffset = mScrollEvent->PrevVisualOffset();
  nsPoint prevLayoutOffset = mScrollEvent->PrevLayoutOffset();
  mScrollEvent->Revoke();
  mScrollEvent = nullptr;

  if (RefPtr<PresShell> presShell = GetPresShell()) {
    RefPtr<nsPresContext> presContext = GetPresContext();

    if (presShell->GetVisualViewportOffset() != prevVisualOffset) {
      // The internal event will be fired whenever the visual viewport's
      // *absolute* offset changed, i.e. relative to the page.
      VVP_LOG("%p: FireScrollEvent, fire mozvisualscroll\n", this);
      WidgetEvent mozEvent(true, eMozVisualScroll);
      mozEvent.mFlags.mOnlySystemGroupDispatch = true;
      EventDispatcher::Dispatch(this, presContext, &mozEvent);
    }

    // Check whether the relative visual viewport offset actually changed -
    // maybe both visual and layout viewport scrolled together and there was no
    // change after all.
    nsPoint curRelativeOffset =
        presShell->GetVisualViewportOffsetRelativeToLayoutViewport();
    nsPoint prevRelativeOffset = prevVisualOffset - prevLayoutOffset;
    VVP_LOG(
        "%p: FireScrollEvent, curRelativeOffset %s, "
        "prevRelativeOffset %s\n",
        this, ToString(curRelativeOffset).c_str(),
        ToString(prevRelativeOffset).c_str());
    if (curRelativeOffset != prevRelativeOffset) {
      VVP_LOG("%p, FireScrollEvent, fire VisualViewport scroll\n", this);
      WidgetGUIEvent event(true, eScroll, nullptr);
      event.mFlags.mBubbles = false;
      event.mFlags.mCancelable = false;
      EventDispatcher::Dispatch(this, presContext, &event);
    }
  }
}

/* ================= ScrollEnd event handling ================= */

void VisualViewport::PostScrollEndEvent() {
  VVP_LOG("%p: PostScrollEndEvent (pre-existing: %d)\n", this,
          !!mScrollEndEvent);
  nsPresContext* presContext = GetPresContext();
  if (mScrollEndEvent && mScrollEndEvent->HasPresContext(presContext)) {
    return;
  }
  if (mScrollEndEvent) {
    // prescontext changed, so discard the old scrollend event and queue a new
    // one
    mScrollEndEvent->Revoke();
    mScrollEndEvent = nullptr;
  }

  // The event constructor will register itself with the refresh driver.
  if (presContext) {
    mScrollEndEvent = new VisualViewportScrollEndEvent(this, presContext);
    VVP_LOG("%p: PostScrollEndEvent, created new event\n", this);
  }
}

VisualViewport::VisualViewportScrollEndEvent::VisualViewportScrollEndEvent(
    VisualViewport* aViewport, nsPresContext* aPresContext)
    : Runnable("VisualViewport::VisualViewportScrollEvent"),
      mViewport(aViewport),
      mPresContext(aPresContext) {
  VVP_LOG("%p: Registering PostScrollEnd on %p %p\n", aViewport, aPresContext,
          aPresContext->RefreshDriver());
  aPresContext->PresShell()->PostScrollEvent(this);
}

bool VisualViewport::VisualViewportScrollEndEvent::HasPresContext(
    nsPresContext* aContext) const {
  return mPresContext.get() == aContext;
}

void VisualViewport::VisualViewportScrollEndEvent::Revoke() {
  mViewport = nullptr;
  mPresContext = nullptr;
}

// TODO: Convert this to MOZ_CAN_RUN_SCRIPT (bug 1415230, bug 1535398)
MOZ_CAN_RUN_SCRIPT_BOUNDARY NS_IMETHODIMP
VisualViewport::VisualViewportScrollEndEvent::Run() {
  if (RefPtr<VisualViewport> viewport = mViewport) {
    viewport->FireScrollEndEvent();
  }
  return NS_OK;
}

void VisualViewport::FireScrollEndEvent() {
  MOZ_ASSERT(mScrollEndEvent);
  mScrollEndEvent->Revoke();
  mScrollEndEvent = nullptr;

  RefPtr<nsPresContext> presContext = GetPresContext();

  VVP_LOG("%p, FireScrollEndEvent, fire VisualViewport scrollend\n", this);
  WidgetEvent event(true, eScrollend);
  event.mFlags.mBubbles = false;
  event.mFlags.mCancelable = false;
  EventDispatcher::Dispatch(this, presContext, &event);
}
