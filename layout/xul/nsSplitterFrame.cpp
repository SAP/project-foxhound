/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//
// Eric Vaughan
// Netscape Communications
//
// See documentation in associated header file
//

#include "gfxContext.h"
#include "nsSplitterFrame.h"
#include "nsGkAtoms.h"
#include "nsXULElement.h"
#include "nsPresContext.h"
#include "mozilla/dom/Document.h"
#include "nsNameSpaceManager.h"
#include "nsScrollbarButtonFrame.h"
#include "nsIDOMEventListener.h"
#include "nsICSSDeclaration.h"
#include "nsFrameList.h"
#include "nsHTMLParts.h"
#include "mozilla/ComputedStyle.h"
#include "mozilla/CSSOrderAwareFrameIterator.h"
#include "nsBoxLayoutState.h"
#include "nsContainerFrame.h"
#include "nsContentCID.h"
#include "nsLayoutUtils.h"
#include "nsDisplayList.h"
#include "nsContentUtils.h"
#include "nsFlexContainerFrame.h"
#include "mozilla/dom/Element.h"
#include "mozilla/dom/Event.h"
#include "mozilla/dom/MouseEvent.h"
#include "mozilla/MouseEvents.h"
#include "mozilla/PresShell.h"
#include "mozilla/UniquePtr.h"
#include "nsStyledElement.h"

using namespace mozilla;

using mozilla::dom::Element;
using mozilla::dom::Event;

class nsSplitterInfo {
 public:
  nscoord min;
  nscoord max;
  nscoord current;
  nscoord pref;
  nscoord changed;
  nsCOMPtr<nsIContent> childElem;
};

enum class ResizeType {
  // Resize the closest sibling in a given direction.
  Closest,
  // Resize the farthest sibling in a given direction.
  Farthest,
  // Resize only flexible siblings in a given direction.
  Flex,
  // No space should be taken out of any children in that direction.
  // FIXME(emilio): This is a rather odd name...
  Grow,
  // Only resize adjacent siblings.
  Sibling,
  // Don't resize anything in a given direction.
  None,
};
static ResizeType ResizeTypeFromAttribute(const Element& aElement,
                                          nsAtom* aAttribute) {
  static Element::AttrValuesArray strings[] = {
      nsGkAtoms::farthest, nsGkAtoms::flex, nsGkAtoms::grow,
      nsGkAtoms::sibling,  nsGkAtoms::none, nullptr};
  switch (aElement.FindAttrValueIn(kNameSpaceID_None, aAttribute, strings,
                                   eCaseMatters)) {
    case 0:
      return ResizeType::Farthest;
    case 1:
      return ResizeType::Flex;
    case 2:
      // Grow only applies to resizeAfter.
      if (aAttribute == nsGkAtoms::resizeafter) {
        return ResizeType::Grow;
      }
      break;
    case 3:
      return ResizeType::Sibling;
    case 4:
      return ResizeType::None;
    default:
      break;
  }
  return ResizeType::Closest;
}

class nsSplitterFrameInner final : public nsIDOMEventListener {
 protected:
  virtual ~nsSplitterFrameInner();

 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIDOMEVENTLISTENER

  explicit nsSplitterFrameInner(nsSplitterFrame* aSplitter)
      : mOuter(aSplitter) {}

  void Disconnect() { mOuter = nullptr; }

  nsresult MouseDown(Event* aMouseEvent);
  nsresult MouseUp(Event* aMouseEvent);
  nsresult MouseMove(Event* aMouseEvent);

  void MouseDrag(nsPresContext* aPresContext, WidgetGUIEvent* aEvent);
  void MouseUp(nsPresContext* aPresContext, WidgetGUIEvent* aEvent);

  void AdjustChildren(nsPresContext* aPresContext);
  void AdjustChildren(nsPresContext* aPresContext,
                      nsTArray<nsSplitterInfo>& aChildInfos,
                      bool aIsHorizontal);

  void AddRemoveSpace(nscoord aDiff, nsTArray<nsSplitterInfo>& aChildInfos,
                      int32_t& aSpaceLeft);

  void ResizeChildTo(nscoord& aDiff);

  void UpdateState();

  void AddListener();
  void RemoveListener();

  enum class State { Open, CollapsedBefore, CollapsedAfter, Dragging };
  enum CollapseDirection { Before, After };

  ResizeType GetResizeBefore();
  ResizeType GetResizeAfter();
  State GetState();

  bool SupportsCollapseDirection(CollapseDirection aDirection);

  void EnsureOrient();
  void SetPreferredSize(nsBoxLayoutState& aState, nsIFrame* aChildBox,
                        bool aIsHorizontal, nscoord aSize);

  nsSplitterFrame* mOuter;
  bool mDidDrag = false;
  nscoord mDragStart = 0;
  nsIFrame* mParentBox = nullptr;
  bool mPressed = false;
  nsTArray<nsSplitterInfo> mChildInfosBefore;
  nsTArray<nsSplitterInfo> mChildInfosAfter;
  State mState = State::Open;
  nscoord mSplitterPos = 0;
  bool mDragging = false;

  const Element* SplitterElement() const {
    return mOuter->GetContent()->AsElement();
  }
};

NS_IMPL_ISUPPORTS(nsSplitterFrameInner, nsIDOMEventListener)

ResizeType nsSplitterFrameInner::GetResizeBefore() {
  return ResizeTypeFromAttribute(*SplitterElement(), nsGkAtoms::resizebefore);
}

ResizeType nsSplitterFrameInner::GetResizeAfter() {
  return ResizeTypeFromAttribute(*SplitterElement(), nsGkAtoms::resizeafter);
}

nsSplitterFrameInner::~nsSplitterFrameInner() = default;

nsSplitterFrameInner::State nsSplitterFrameInner::GetState() {
  static Element::AttrValuesArray strings[] = {nsGkAtoms::dragging,
                                               nsGkAtoms::collapsed, nullptr};
  static Element::AttrValuesArray strings_substate[] = {
      nsGkAtoms::before, nsGkAtoms::after, nullptr};
  switch (SplitterElement()->FindAttrValueIn(
      kNameSpaceID_None, nsGkAtoms::state, strings, eCaseMatters)) {
    case 0:
      return State::Dragging;
    case 1:
      switch (SplitterElement()->FindAttrValueIn(
          kNameSpaceID_None, nsGkAtoms::substate, strings_substate,
          eCaseMatters)) {
        case 0:
          return State::CollapsedBefore;
        case 1:
          return State::CollapsedAfter;
        default:
          if (SupportsCollapseDirection(After)) {
            return State::CollapsedAfter;
          }
          return State::CollapsedBefore;
      }
  }
  return State::Open;
}

//
// NS_NewSplitterFrame
//
// Creates a new Toolbar frame and returns it
//
nsIFrame* NS_NewSplitterFrame(PresShell* aPresShell, ComputedStyle* aStyle) {
  return new (aPresShell) nsSplitterFrame(aStyle, aPresShell->GetPresContext());
}

NS_IMPL_FRAMEARENA_HELPERS(nsSplitterFrame)

nsSplitterFrame::nsSplitterFrame(ComputedStyle* aStyle,
                                 nsPresContext* aPresContext)
    : nsBoxFrame(aStyle, aPresContext, kClassID) {}

void nsSplitterFrame::DestroyFrom(nsIFrame* aDestructRoot,
                                  PostDestroyData& aPostDestroyData) {
  if (mInner) {
    mInner->RemoveListener();
    mInner->Disconnect();
    mInner = nullptr;
  }
  nsBoxFrame::DestroyFrom(aDestructRoot, aPostDestroyData);
}

nsresult nsSplitterFrame::AttributeChanged(int32_t aNameSpaceID,
                                           nsAtom* aAttribute,
                                           int32_t aModType) {
  nsresult rv =
      nsBoxFrame::AttributeChanged(aNameSpaceID, aAttribute, aModType);
  if (aAttribute == nsGkAtoms::state) {
    mInner->UpdateState();
  }

  return rv;
}

/**
 * Initialize us. If we are in a box get our alignment so we know what direction
 * we are
 */
void nsSplitterFrame::Init(nsIContent* aContent, nsContainerFrame* aParent,
                           nsIFrame* aPrevInFlow) {
  MOZ_ASSERT(!mInner);
  mInner = new nsSplitterFrameInner(this);

  nsBoxFrame::Init(aContent, aParent, aPrevInFlow);

  mInner->AddListener();
  mInner->mParentBox = nullptr;
}

static bool IsValidParentBox(nsIFrame* aFrame) {
  return aFrame->IsXULBoxFrame() || aFrame->IsFlexContainerFrame();
}

static nsIFrame* GetValidParentBox(nsIFrame* aChild) {
  return aChild->GetParent() && IsValidParentBox(aChild->GetParent())
             ? aChild->GetParent()
             : nullptr;
}

NS_IMETHODIMP
nsSplitterFrame::DoXULLayout(nsBoxLayoutState& aState) {
  if (HasAnyStateBits(NS_FRAME_FIRST_REFLOW)) {
    mInner->mParentBox = GetValidParentBox(this);
    mInner->UpdateState();
  }

  return nsBoxFrame::DoXULLayout(aState);
}

static bool SplitterIsHorizontal(const nsIFrame* aParentBox) {
  // If our parent is horizontal, the splitter is vertical and vice-versa.
  if (aParentBox->IsXULBoxFrame()) {
    return !aParentBox->HasAnyStateBits(NS_STATE_IS_HORIZONTAL);
  }
  MOZ_ASSERT(aParentBox->IsFlexContainerFrame());
  const FlexboxAxisInfo info(aParentBox);
  return !info.mIsRowOriented;
}

void nsSplitterFrame::GetInitialOrientation(bool& aIsHorizontal) {
  if (nsIFrame* parent = GetValidParentBox(this)) {
    aIsHorizontal = SplitterIsHorizontal(parent);
  } else {
    nsBoxFrame::GetInitialOrientation(aIsHorizontal);
  }
}

NS_IMETHODIMP
nsSplitterFrame::HandlePress(nsPresContext* aPresContext,
                             WidgetGUIEvent* aEvent,
                             nsEventStatus* aEventStatus) {
  return NS_OK;
}

NS_IMETHODIMP
nsSplitterFrame::HandleMultiplePress(nsPresContext* aPresContext,
                                     WidgetGUIEvent* aEvent,
                                     nsEventStatus* aEventStatus,
                                     bool aControlHeld) {
  return NS_OK;
}

NS_IMETHODIMP
nsSplitterFrame::HandleDrag(nsPresContext* aPresContext, WidgetGUIEvent* aEvent,
                            nsEventStatus* aEventStatus) {
  return NS_OK;
}

NS_IMETHODIMP
nsSplitterFrame::HandleRelease(nsPresContext* aPresContext,
                               WidgetGUIEvent* aEvent,
                               nsEventStatus* aEventStatus) {
  return NS_OK;
}

void nsSplitterFrame::BuildDisplayList(nsDisplayListBuilder* aBuilder,
                                       const nsDisplayListSet& aLists) {
  nsBoxFrame::BuildDisplayList(aBuilder, aLists);

  // if the mouse is captured always return us as the frame.
  if (mInner->mDragging && aBuilder->IsForEventDelivery()) {
    // XXX It's probably better not to check visibility here, right?
    aLists.Outlines()->AppendNewToTop<nsDisplayEventReceiver>(aBuilder, this);
    return;
  }
}

nsresult nsSplitterFrame::HandleEvent(nsPresContext* aPresContext,
                                      WidgetGUIEvent* aEvent,
                                      nsEventStatus* aEventStatus) {
  NS_ENSURE_ARG_POINTER(aEventStatus);
  if (nsEventStatus_eConsumeNoDefault == *aEventStatus) {
    return NS_OK;
  }

  AutoWeakFrame weakFrame(this);
  RefPtr<nsSplitterFrameInner> inner(mInner);
  switch (aEvent->mMessage) {
    case eMouseMove:
      inner->MouseDrag(aPresContext, aEvent);
      break;

    case eMouseUp:
      if (aEvent->AsMouseEvent()->mButton == MouseButton::ePrimary) {
        inner->MouseUp(aPresContext, aEvent);
      }
      break;

    default:
      break;
  }

  NS_ENSURE_STATE(weakFrame.IsAlive());
  return nsBoxFrame::HandleEvent(aPresContext, aEvent, aEventStatus);
}

void nsSplitterFrameInner::MouseUp(nsPresContext* aPresContext,
                                   WidgetGUIEvent* aEvent) {
  if (mDragging && mOuter) {
    AdjustChildren(aPresContext);
    AddListener();
    PresShell::ReleaseCapturingContent();  // XXXndeakin is this needed?
    mDragging = false;
    State newState = GetState();
    // if the state is dragging then make it Open.
    if (newState == State::Dragging) {
      mOuter->mContent->AsElement()->SetAttr(kNameSpaceID_None,
                                             nsGkAtoms::state, u""_ns, true);
    }

    mPressed = false;

    // if we dragged then fire a command event.
    if (mDidDrag) {
      RefPtr<nsXULElement> element =
          nsXULElement::FromNode(mOuter->GetContent());
      element->DoCommand();
    }

    // printf("MouseUp\n");
  }

  mChildInfosBefore.Clear();
  mChildInfosAfter.Clear();
}

void nsSplitterFrameInner::MouseDrag(nsPresContext* aPresContext,
                                     WidgetGUIEvent* aEvent) {
  if (!mDragging || !mOuter) {
    return;
  }

  const bool isHorizontal = !mOuter->IsXULHorizontal();
  nsPoint pt = nsLayoutUtils::GetEventCoordinatesRelativeTo(
      aEvent, RelativeTo{mParentBox});
  nscoord pos = isHorizontal ? pt.x : pt.y;

  // take our current position and subtract the start location,
  // mDragStart is in parent-box relative coordinates already.
  pos -= mDragStart;

  for (auto& info : mChildInfosBefore) {
    info.changed = info.current;
  }

  for (auto& info : mChildInfosAfter) {
    info.changed = info.current;
  }
  nscoord oldPos = pos;

  ResizeChildTo(pos);

  State currentState = GetState();
  bool supportsBefore = SupportsCollapseDirection(Before);
  bool supportsAfter = SupportsCollapseDirection(After);

  const bool isRTL =
      mOuter->StyleVisibility()->mDirection == StyleDirection::Rtl;
  bool pastEnd = oldPos > 0 && oldPos > pos;
  bool pastBegin = oldPos < 0 && oldPos < pos;
  if (isRTL) {
    // Swap the boundary checks in RTL mode
    std::swap(pastEnd, pastBegin);
  }
  const bool isCollapsedBefore = pastBegin && supportsBefore;
  const bool isCollapsedAfter = pastEnd && supportsAfter;

  // if we are in a collapsed position
  if (isCollapsedBefore || isCollapsedAfter) {
    // and we are not collapsed then collapse
    if (currentState == State::Dragging) {
      if (pastEnd) {
        // printf("Collapse right\n");
        if (supportsAfter) {
          RefPtr<Element> outer = mOuter->mContent->AsElement();
          outer->SetAttr(kNameSpaceID_None, nsGkAtoms::substate, u"after"_ns,
                         true);
          outer->SetAttr(kNameSpaceID_None, nsGkAtoms::state, u"collapsed"_ns,
                         true);
        }

      } else if (pastBegin) {
        // printf("Collapse left\n");
        if (supportsBefore) {
          RefPtr<Element> outer = mOuter->mContent->AsElement();
          outer->SetAttr(kNameSpaceID_None, nsGkAtoms::substate, u"before"_ns,
                         true);
          outer->SetAttr(kNameSpaceID_None, nsGkAtoms::state, u"collapsed"_ns,
                         true);
        }
      }
    }
  } else {
    // if we are not in a collapsed position and we are not dragging make sure
    // we are dragging.
    if (currentState != State::Dragging) {
      mOuter->mContent->AsElement()->SetAttr(
          kNameSpaceID_None, nsGkAtoms::state, u"dragging"_ns, true);
    }
    AdjustChildren(aPresContext);
  }

  mDidDrag = true;
}

void nsSplitterFrameInner::AddListener() {
  mOuter->GetContent()->AddEventListener(u"mouseup"_ns, this, false, false);
  mOuter->GetContent()->AddEventListener(u"mousedown"_ns, this, false, false);
  mOuter->GetContent()->AddEventListener(u"mousemove"_ns, this, false, false);
  mOuter->GetContent()->AddEventListener(u"mouseout"_ns, this, false, false);
}

void nsSplitterFrameInner::RemoveListener() {
  NS_ENSURE_TRUE_VOID(mOuter);
  mOuter->GetContent()->RemoveEventListener(u"mouseup"_ns, this, false);
  mOuter->GetContent()->RemoveEventListener(u"mousedown"_ns, this, false);
  mOuter->GetContent()->RemoveEventListener(u"mousemove"_ns, this, false);
  mOuter->GetContent()->RemoveEventListener(u"mouseout"_ns, this, false);
}

nsresult nsSplitterFrameInner::HandleEvent(dom::Event* aEvent) {
  nsAutoString eventType;
  aEvent->GetType(eventType);
  if (eventType.EqualsLiteral("mouseup")) return MouseUp(aEvent);
  if (eventType.EqualsLiteral("mousedown")) return MouseDown(aEvent);
  if (eventType.EqualsLiteral("mousemove") ||
      eventType.EqualsLiteral("mouseout"))
    return MouseMove(aEvent);

  MOZ_ASSERT_UNREACHABLE("Unexpected eventType");
  return NS_OK;
}

nsresult nsSplitterFrameInner::MouseUp(Event* aMouseEvent) {
  NS_ENSURE_TRUE(mOuter, NS_OK);
  mPressed = false;

  PresShell::ReleaseCapturingContent();

  return NS_OK;
}

template <typename LengthLike>
static nscoord ToLengthWithFallback(const LengthLike& aLengthLike,
                                    nscoord aFallback) {
  if (aLengthLike.ConvertsToLength()) {
    return aLengthLike.ToLength();
  }
  return aFallback;
}

template <typename LengthLike>
static nsSize ToLengthWithFallback(const LengthLike& aWidth,
                                   const LengthLike& aHeight,
                                   nscoord aFallback = 0) {
  return {ToLengthWithFallback(aWidth, aFallback),
          ToLengthWithFallback(aHeight, aFallback)};
}

nsresult nsSplitterFrameInner::MouseDown(Event* aMouseEvent) {
  NS_ENSURE_TRUE(mOuter, NS_OK);
  dom::MouseEvent* mouseEvent = aMouseEvent->AsMouseEvent();
  if (!mouseEvent) {
    return NS_OK;
  }

  // only if left button
  if (mouseEvent->Button() != 0) {
    return NS_OK;
  }

  if (SplitterElement()->AttrValueIs(kNameSpaceID_None, nsGkAtoms::disabled,
                                     nsGkAtoms::_true, eCaseMatters))
    return NS_OK;

  mParentBox = GetValidParentBox(mOuter);
  if (!mParentBox) {
    return NS_OK;
  }

  // get our index
  nsPresContext* outerPresContext = mOuter->PresContext();

  RefPtr<gfxContext> rc =
      outerPresContext->PresShell()->CreateReferenceRenderingContext();
  nsBoxLayoutState state(outerPresContext, rc);

  mDidDrag = false;

  EnsureOrient();
  const bool isHorizontal = !mOuter->IsXULHorizontal();

  const nsIContent* outerContent = mOuter->GetContent();

  const ResizeType resizeBefore = GetResizeBefore();
  const ResizeType resizeAfter = GetResizeAfter();
  const int32_t childCount = mParentBox->PrincipalChildList().GetLength();

  mChildInfosBefore.Clear();
  mChildInfosAfter.Clear();
  int32_t count = 0;

  bool foundOuter = false;
  CSSOrderAwareFrameIterator iter(
      mParentBox, FrameChildListID::Principal,
      CSSOrderAwareFrameIterator::ChildFilter::IncludeAll,
      CSSOrderAwareFrameIterator::OrderState::Unknown,
      CSSOrderAwareFrameIterator::OrderingProperty::BoxOrdinalGroup);
  for (; !iter.AtEnd(); iter.Next()) {
    nsIFrame* childBox = iter.get();
    if (childBox == mOuter) {
      foundOuter = true;
      if (!count) {
        // We're at the beginning, nothing to do.
        return NS_OK;
      }
      if (count == childCount - 1 && resizeAfter != ResizeType::Grow) {
        // If it's the last index then we need to allow for resizeafter="grow"
        return NS_OK;
      }
    }
    count++;

    nsIContent* content = childBox->GetContent();
    const nscoord flex = childBox->GetXULFlex();
    const bool isBefore = !foundOuter;
    const bool isResizable = [&] {
      if (auto* element = nsXULElement::FromNode(content)) {
        if (element->NodeInfo()->NameAtom() == nsGkAtoms::splitter) {
          // skip over any splitters
          return false;
        }

        // We need to check for hidden attribute too, since treecols with
        // the hidden="true" attribute are not really hidden, just collapsed
        if (element->GetXULBoolAttr(nsGkAtoms::fixed) ||
            element->GetXULBoolAttr(nsGkAtoms::hidden)) {
          return false;
        }
      }

      // We need to check this here rather than in the switch before because we
      // want `sibling` to work in the DOM order, not frame tree order.
      if (resizeBefore == ResizeType::Sibling &&
          content->GetNextElementSibling() == outerContent) {
        return true;
      }
      if (resizeAfter == ResizeType::Sibling &&
          content->GetPreviousElementSibling() == outerContent) {
        return true;
      }

      const ResizeType resizeType = isBefore ? resizeBefore : resizeAfter;
      switch (resizeType) {
        case ResizeType::Grow:
        case ResizeType::None:
        case ResizeType::Sibling:
          return false;
        case ResizeType::Flex:
          return flex > 0;
        case ResizeType::Closest:
        case ResizeType::Farthest:
          break;
      }
      return true;
    }();

    if (!isResizable) {
      continue;
    }

    nsSize minSize;
    nsSize prefSize;
    nsSize maxSize(NS_UNCONSTRAINEDSIZE, NS_UNCONSTRAINEDSIZE);
    nsSize curSize = childBox->GetSize();
    if (childBox->IsXULBoxFrame()) {
      minSize = childBox->GetXULMinSize(state);
      maxSize = childBox->GetXULMaxSize(state);
      prefSize = childBox->GetXULPrefSize(state);
    } else {
      const auto& pos = *childBox->StylePosition();
      minSize = ToLengthWithFallback(pos.mMinWidth, pos.mMinHeight);
      maxSize = ToLengthWithFallback(pos.mMaxWidth, pos.mMaxHeight,
                                     NS_UNCONSTRAINEDSIZE);
      prefSize.width = ToLengthWithFallback(pos.mWidth, curSize.width);
      prefSize.height = ToLengthWithFallback(pos.mHeight, curSize.height);
    }

    maxSize = nsIFrame::XULBoundsCheckMinMax(minSize, maxSize);
    prefSize = nsIFrame::XULBoundsCheck(minSize, prefSize, maxSize);

    nsSplitterFrame::AddXULMargin(childBox, minSize);
    nsSplitterFrame::AddXULMargin(childBox, maxSize);
    nsSplitterFrame::AddXULMargin(childBox, prefSize);
    nsSplitterFrame::AddXULMargin(childBox, curSize);

    auto& list = isBefore ? mChildInfosBefore : mChildInfosAfter;
    nsSplitterInfo& info = *list.AppendElement();
    info.childElem = content;
    info.min = isHorizontal ? minSize.width : minSize.height;
    info.max = isHorizontal ? maxSize.width : maxSize.height;
    info.pref = isHorizontal ? prefSize.width : prefSize.height;
    info.current = info.changed = isHorizontal ? curSize.width : curSize.height;
  }

  if (!foundOuter) {
    return NS_OK;
  }

  mPressed = true;

  const bool reverseDirection = [&] {
    if (mParentBox->IsXULBoxFrame()) {
      return !mParentBox->IsXULNormalDirection();
    }
    MOZ_ASSERT(mParentBox->IsFlexContainerFrame());
    const FlexboxAxisInfo info(mParentBox);
    if (!info.mIsRowOriented) {
      return info.mIsMainAxisReversed;
    }
    const bool rtl =
        mParentBox->StyleVisibility()->mDirection == StyleDirection::Rtl;
    return info.mIsMainAxisReversed != rtl;
  }();

  if (reverseDirection) {
    // The before array is really the after array, and the order needs to be
    // reversed. First reverse both arrays.
    mChildInfosBefore.Reverse();
    mChildInfosAfter.Reverse();

    // Now swap the two arrays.
    std::swap(mChildInfosBefore, mChildInfosAfter);
  }

  // if resizebefore is not Farthest, reverse the list because the first child
  // in the list is the farthest, and we want the first child to be the closest.
  if (resizeBefore != ResizeType::Farthest) {
    mChildInfosBefore.Reverse();
  }

  // if the resizeafter is the Farthest we must reverse the list because the
  // first child in the list is the closest we want the first child to be the
  // Farthest.
  if (resizeAfter == ResizeType::Farthest) {
    mChildInfosAfter.Reverse();
  }

  int32_t c;
  nsPoint pt =
      nsLayoutUtils::GetDOMEventCoordinatesRelativeTo(mouseEvent, mParentBox);
  if (isHorizontal) {
    c = pt.x;
    mSplitterPos = mOuter->mRect.x;
  } else {
    c = pt.y;
    mSplitterPos = mOuter->mRect.y;
  }

  mDragStart = c;

  // printf("Pressed mDragStart=%d\n",mDragStart);

  PresShell::SetCapturingContent(mOuter->GetContent(),
                                 CaptureFlags::IgnoreAllowedState);

  return NS_OK;
}

nsresult nsSplitterFrameInner::MouseMove(Event* aMouseEvent) {
  NS_ENSURE_TRUE(mOuter, NS_OK);
  if (!mPressed) {
    return NS_OK;
  }

  if (mDragging) {
    return NS_OK;
  }

  nsCOMPtr<nsIDOMEventListener> kungfuDeathGrip(this);
  mOuter->mContent->AsElement()->SetAttr(kNameSpaceID_None, nsGkAtoms::state,
                                         u"dragging"_ns, true);

  RemoveListener();
  mDragging = true;

  return NS_OK;
}

bool nsSplitterFrameInner::SupportsCollapseDirection(
    nsSplitterFrameInner::CollapseDirection aDirection) {
  static Element::AttrValuesArray strings[] = {
      nsGkAtoms::before, nsGkAtoms::after, nsGkAtoms::both, nullptr};

  switch (SplitterElement()->FindAttrValueIn(
      kNameSpaceID_None, nsGkAtoms::collapse, strings, eCaseMatters)) {
    case 0:
      return (aDirection == Before);
    case 1:
      return (aDirection == After);
    case 2:
      return true;
  }

  return false;
}

void nsSplitterFrameInner::UpdateState() {
  // State Transitions:
  //   Open            -> Dragging
  //   Open            -> CollapsedBefore
  //   Open            -> CollapsedAfter
  //   CollapsedBefore -> Open
  //   CollapsedBefore -> Dragging
  //   CollapsedAfter  -> Open
  //   CollapsedAfter  -> Dragging
  //   Dragging        -> Open
  //   Dragging        -> CollapsedBefore (auto collapse)
  //   Dragging        -> CollapsedAfter (auto collapse)

  State newState = GetState();

  if (newState == mState) {
    // No change.
    return;
  }

  if ((SupportsCollapseDirection(Before) || SupportsCollapseDirection(After)) &&
      IsValidParentBox(mOuter->GetParent())) {
    // Find the splitter's immediate sibling.
    const bool prev =
        newState == State::CollapsedBefore || mState == State::CollapsedBefore;
    nsIFrame* splitterSibling =
        nsBoxFrame::SlowOrdinalGroupAwareSibling(mOuter, !prev);
    if (splitterSibling) {
      nsCOMPtr<nsIContent> sibling = splitterSibling->GetContent();
      if (sibling && sibling->IsElement()) {
        if (mState == State::CollapsedBefore ||
            mState == State::CollapsedAfter) {
          // CollapsedBefore -> Open
          // CollapsedBefore -> Dragging
          // CollapsedAfter -> Open
          // CollapsedAfter -> Dragging
          nsContentUtils::AddScriptRunner(new nsUnsetAttrRunnable(
              sibling->AsElement(), nsGkAtoms::collapsed));
        } else if ((mState == State::Open || mState == State::Dragging) &&
                   (newState == State::CollapsedBefore ||
                    newState == State::CollapsedAfter)) {
          // Open -> CollapsedBefore / CollapsedAfter
          // Dragging -> CollapsedBefore / CollapsedAfter
          nsContentUtils::AddScriptRunner(new nsSetAttrRunnable(
              sibling->AsElement(), nsGkAtoms::collapsed, u"true"_ns));
        }
      }
    }
  }
  mState = newState;
}

void nsSplitterFrameInner::EnsureOrient() {
  if (SplitterIsHorizontal(mParentBox))
    mOuter->AddStateBits(NS_STATE_IS_HORIZONTAL);
  else
    mOuter->RemoveStateBits(NS_STATE_IS_HORIZONTAL);
}

void nsSplitterFrameInner::AdjustChildren(nsPresContext* aPresContext) {
  EnsureOrient();
  const bool isHorizontal = !mOuter->IsXULHorizontal();

  AdjustChildren(aPresContext, mChildInfosBefore, isHorizontal);
  AdjustChildren(aPresContext, mChildInfosAfter, isHorizontal);
}

static nsIFrame* GetChildBoxForContent(nsIFrame* aParentBox,
                                       nsIContent* aContent) {
  // XXX Can this use GetPrimaryFrame?
  for (nsIFrame* f : aParentBox->PrincipalChildList()) {
    if (f->GetContent() == aContent) {
      return f;
    }
  }
  return nullptr;
}

void nsSplitterFrameInner::AdjustChildren(nsPresContext* aPresContext,
                                          nsTArray<nsSplitterInfo>& aChildInfos,
                                          bool aIsHorizontal) {
  /// printf("------- AdjustChildren------\n");

  nsBoxLayoutState state(aPresContext);

  for (auto& info : aChildInfos) {
    nscoord newPref = info.pref + (info.changed - info.current);
    if (nsIFrame* childBox =
            GetChildBoxForContent(mParentBox, info.childElem)) {
      SetPreferredSize(state, childBox, aIsHorizontal, newPref);
    }
  }
}

void nsSplitterFrameInner::SetPreferredSize(nsBoxLayoutState& aState,
                                            nsIFrame* aChildBox,
                                            bool aIsHorizontal, nscoord aSize) {
  nsMargin margin(0, 0, 0, 0);
  aChildBox->GetXULMargin(margin);

  if (aIsHorizontal) {
    aSize -= (margin.left + margin.right);
  } else {
    aSize -= (margin.top + margin.bottom);
  }

  RefPtr element = nsStyledElement::FromNode(aChildBox->GetContent());
  if (!element) {
    return;
  }

  // We set both the attribute and the CSS value, so that XUL persist="" keeps
  // working, see bug 1790712.

  int32_t pixels = aSize / AppUnitsPerCSSPixel();
  nsAutoString attrValue;
  attrValue.AppendInt(pixels);
  element->SetAttr(aIsHorizontal ? nsGkAtoms::width : nsGkAtoms::height,
                   attrValue, IgnoreErrors());

  nsCOMPtr<nsICSSDeclaration> decl = element->Style();

  nsAutoCString cssValue;
  cssValue.AppendInt(pixels);
  cssValue.AppendLiteral("px");
  decl->SetProperty(aIsHorizontal ? "width"_ns : "height"_ns, cssValue, ""_ns,
                    IgnoreErrors());
}

void nsSplitterFrameInner::AddRemoveSpace(nscoord aDiff,
                                          nsTArray<nsSplitterInfo>& aChildInfos,
                                          int32_t& aSpaceLeft) {
  aSpaceLeft = 0;

  for (auto& info : aChildInfos) {
    nscoord min = info.min;
    nscoord max = info.max;
    nscoord& c = info.changed;

    // figure our how much space to add or remove
    if (c + aDiff < min) {
      aDiff += (c - min);
      c = min;
    } else if (c + aDiff > max) {
      aDiff -= (max - c);
      c = max;
    } else {
      c += aDiff;
      aDiff = 0;
    }

    // there is not space left? We are done
    if (aDiff == 0) {
      break;
    }
  }

  aSpaceLeft = aDiff;
}

/**
 * Ok if we want to resize a child we will know the actual size in pixels we
 * want it to be. This is not the preferred size. But the only way we can change
 * a child is by manipulating its preferred size. So give the actual pixel size
 * this method will figure out the preferred size and set it.
 */

void nsSplitterFrameInner::ResizeChildTo(nscoord& aDiff) {
  nscoord spaceLeft = 0;

  if (!mChildInfosBefore.IsEmpty()) {
    AddRemoveSpace(aDiff, mChildInfosBefore, spaceLeft);
    // If there is any space left over remove it from the diff we were
    // originally given.
    aDiff -= spaceLeft;
  }

  AddRemoveSpace(-aDiff, mChildInfosAfter, spaceLeft);

  if (spaceLeft != 0 && !mChildInfosAfter.IsEmpty()) {
    aDiff += spaceLeft;
    AddRemoveSpace(spaceLeft, mChildInfosBefore, spaceLeft);
  }
}
