/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/PermissionStatus.h"

#include "PermissionStatusSink.h"
#include "PermissionUtils.h"
#include "mozilla/AsyncEventDispatcher.h"
#include "mozilla/Permission.h"
#include "mozilla/Services.h"
#include "nsGlobalWindowInner.h"
#include "nsIPermissionManager.h"

namespace mozilla::dom {

PermissionStatus::PermissionStatus(nsIGlobalObject* aGlobal,
                                   PermissionName aName)
    : DOMEventTargetHelper(aGlobal), mName(aName) {
  KeepAliveIfHasListenersFor(nsGkAtoms::onchange);
}

// https://w3c.github.io/permissions/#onchange-attribute and
// https://w3c.github.io/permissions/#query-method
RefPtr<PermissionStatus::SimplePromise> PermissionStatus::Init() {
  mSink = CreateSink();
  MOZ_ASSERT(mSink);

  return mSink->Init()->Then(
      GetCurrentSerialEventTarget(), __func__,
      [self = RefPtr(this)](
          const PermissionStatusSink::InternalPermissionStatesPromise::
              ResolveOrRejectValue& aResult) {
        if (aResult.IsResolve()) {
          PermissionStatusSink::InternalPermissionStates states =
              aResult.ResolveValue();
          self->mState = self->ComputeStateFromAction(states.mBrowser);
          self->mSystemState = states.mSystem;
          return SimplePromise::CreateAndResolve(NS_OK, __func__);
        }

        return SimplePromise::CreateAndReject(aResult.RejectValue(), __func__);
      });
}

PermissionStatus::~PermissionStatus() {
  if (mSink) {
    mSink->Disentangle();
    mSink = nullptr;
  }
}

JSObject* PermissionStatus::WrapObject(JSContext* aCx,
                                       JS::Handle<JSObject*> aGivenProto) {
  return PermissionStatus_Binding::Wrap(aCx, this, aGivenProto);
}

nsLiteralCString PermissionStatus::GetPermissionType() const {
  return PermissionNameToType(mName);
}

// https://w3c.github.io/permissions/#dfn-permissionstatus-update-steps
void PermissionStatus::PermissionChanged(uint32_t aAction) {
  const PermissionState oldEffective = State();
  mState = ComputeStateFromAction(aAction);
  const PermissionState newEffective = State();

  if (oldEffective == newEffective) {
    return;
  }

  // Step 4: Queue a task on the permissions task source to fire an
  // event named change at status.
  RefPtr eventDispatcher =
      MakeRefPtr<AsyncEventDispatcher>(this, u"change"_ns, CanBubble::eNo);
  eventDispatcher->PostDOMEvent();
}

void PermissionStatus::SystemPermissionChanged(
    PermissionState aNewSystemState) {
  const PermissionState oldEffective = State();
  mSystemState = aNewSystemState;
  const PermissionState newEffective = State();

  if (oldEffective == newEffective) {
    return;
  }

  RefPtr eventDispatcher =
      MakeRefPtr<AsyncEventDispatcher>(this, u"change"_ns, CanBubble::eNo);
  eventDispatcher->PostDOMEvent();
}

void PermissionStatus::DisconnectFromOwner() {
  IgnoreKeepAliveIfHasListenersFor(nsGkAtoms::onchange);

  if (mSink) {
    mSink->Disentangle();
    mSink = nullptr;
  }

  DOMEventTargetHelper::DisconnectFromOwner();
}

void PermissionStatus::GetType(nsACString& aName) const {
  aName.Assign(GetPermissionType());
}

already_AddRefed<PermissionStatusSink> PermissionStatus::CreateSink() {
  return MakeAndAddRef<PermissionStatusSink>(this, mName, GetPermissionType());
}

PermissionState PermissionStatus::ComputeStateFromAction(uint32_t aAction) {
  nsCOMPtr<nsIGlobalObject> global = GetRelevantGlobal();
  if (NS_WARN_IF(!global)) {
    return PermissionState::Denied;
  }

  return ActionToPermissionState(aAction, mName, global);
}

}  // namespace mozilla::dom
