/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "AnimationTimeline.h"
#include "mozilla/dom/Animation.h"

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE_CLASS(AnimationTimeline)

NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN(AnimationTimeline)
  tmp->mAnimationOrder.clear();
  NS_IMPL_CYCLE_COLLECTION_UNLINK(mWindow, mAnimations)
  NS_IMPL_CYCLE_COLLECTION_UNLINK_PRESERVED_WRAPPER
NS_IMPL_CYCLE_COLLECTION_UNLINK_END

NS_IMPL_CYCLE_COLLECTION_TRAVERSE_BEGIN(AnimationTimeline)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE(mWindow, mAnimations)
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_END

NS_IMPL_CYCLE_COLLECTING_ADDREF(AnimationTimeline)
NS_IMPL_CYCLE_COLLECTING_RELEASE(AnimationTimeline)

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(AnimationTimeline)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

AnimationTimeline::AnimationTimeline(nsIGlobalObject* aWindow,
                                     RTPCallerType aRTPCallerType)
    : mWindow(aWindow), mRTPCallerType(aRTPCallerType) {
  MOZ_ASSERT(mWindow);
}

AnimationTimeline::~AnimationTimeline() { mAnimationOrder.clear(); }

bool AnimationTimeline::Tick(TickState& aState) {
  bool needsTicks = false;

#ifdef DEBUG
  for (Animation* animation : mAnimationOrder) {
    MOZ_ASSERT(mAnimations.Contains(animation),
               "The sampling order list should be a subset of the hashset");
    MOZ_ASSERT(!animation->IsHiddenByContentVisibility(),
               "The sampling order list should not contain any animations "
               "that are hidden by content-visibility");
  }
#endif

  for (Animation* animation :
       ToTArray<AutoTArray<RefPtr<Animation>, 32>>(mAnimationOrder)) {
    // Skip any animations that are longer need associated with this timeline.
    if (animation->GetTimeline() != this) {
      RemoveAnimation(animation);
      continue;
    }

    needsTicks |= animation->NeedsTicks();
    // Even if |animation| doesn't need future ticks, we should still Tick it
    // this time around since it might just need a one-off tick in order to
    // queue events.
    animation->Tick(aState);
    if (!animation->NeedsTicks()) {
      RemoveAnimation(animation);
    }
  }

  return needsTicks;
}

void AnimationTimeline::NotifyAnimationUpdated(Animation& aAnimation) {
  if (mAnimations.EnsureInserted(&aAnimation)) {
    if (aAnimation.GetTimeline() && aAnimation.GetTimeline() != this) {
      aAnimation.GetTimeline()->RemoveAnimation(&aAnimation);
    }
    if (!aAnimation.IsHiddenByContentVisibility()) {
      mAnimationOrder.insertBack(&aAnimation);
    }
  }
}

void AnimationTimeline::RemoveAnimation(Animation* aAnimation) {
  if (static_cast<LinkedListElement<Animation>*>(aAnimation)->isInList() &&
      MOZ_LIKELY(!aAnimation->GetTimeline() ||
                 aAnimation->GetTimeline() == this)) {
    static_cast<LinkedListElement<Animation>*>(aAnimation)->remove();
    MOZ_ASSERT(mAnimations.Contains(aAnimation),
               "The sampling order list should be a subset of the hashset");
  }
  mAnimations.Remove(aAnimation);
}

void AnimationTimeline::NotifyAnimationContentVisibilityChanged(
    Animation* aAnimation, bool aIsVisible) {
  bool inList =
      static_cast<LinkedListElement<Animation>*>(aAnimation)->isInList();
  MOZ_ASSERT(!inList || mAnimations.Contains(aAnimation),
             "The sampling order list should be a subset of the hashset");
  if (aIsVisible && !inList && mAnimations.Contains(aAnimation)) {
    mAnimationOrder.insertBack(aAnimation);
  } else if (!aIsVisible && inList) {
    static_cast<LinkedListElement<Animation>*>(aAnimation)->remove();
  }
}

void AnimationTimeline::UpdateHiddenByContentVisibility() {
  for (Animation* animation : mAnimations) {
    animation->UpdateHiddenByContentVisibility();
  }
}

}  // namespace mozilla::dom
