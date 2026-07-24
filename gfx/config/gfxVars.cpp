/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gfxVars.h"
#include "gfxVarReceiver.h"
#include "mozilla/dom/ContentChild.h"

namespace mozilla {
namespace gfx {

StaticAutoPtr<gfxVars> gfxVars::sInstance;
StaticAutoPtr<nsTArray<gfxVars::VarBase*>> gfxVars::sVarList;

// Used only during initialization to store pending updates if received prior to
// gfxVars::Initialize.
StaticAutoPtr<nsTArray<GfxVarUpdate>> gGfxVarInitUpdates;

// Used only after initialization to store pending updates for
// gfxVarsCollectUpdates that will be dispatched once it goes out of scope. This
// is useful when we are changing multiple gfxVars and wish to only update the
// child processes once.
StaticAutoPtr<nsTArray<GfxVarUpdate>> gGfxVarPendingUpdates;

void gfxVars::SetValuesForInitialize(
    const nsTArray<GfxVarUpdate>& aInitUpdates) {
  // This should only be called once
  MOZ_RELEASE_ASSERT(!gGfxVarInitUpdates);

  // We expect aInitUpdates to be provided before any other gfxVars operation,
  // and for sInstance to be null here, but handle the alternative.
  if (sInstance) {
    // Apply the updates, the object has been created already
    ApplyUpdate(aInitUpdates);
  } else {
    // Save the values for Initialize call
    gGfxVarInitUpdates = new nsTArray<GfxVarUpdate>(aInitUpdates.Clone());
  }
}

void gfxVars::StartCollectingUpdates() {
  MOZ_RELEASE_ASSERT(XRE_IsParentProcess());
  MOZ_RELEASE_ASSERT(sInstance);
  MOZ_RELEASE_ASSERT(!gGfxVarPendingUpdates);
  gGfxVarPendingUpdates = new nsTArray<GfxVarUpdate>();
}

void gfxVars::StopCollectingUpdates() {
  MOZ_RELEASE_ASSERT(XRE_IsParentProcess());
  MOZ_RELEASE_ASSERT(sInstance);
  MOZ_RELEASE_ASSERT(gGfxVarPendingUpdates);
  if (!gGfxVarPendingUpdates->IsEmpty()) {
    for (auto& receiver : sInstance->mReceivers) {
      receiver->OnVarChanged(*gGfxVarPendingUpdates);
    }
  }
  gGfxVarPendingUpdates = nullptr;
}

void gfxVars::Initialize() {
  if (sInstance) {
    MOZ_RELEASE_ASSERT(
        !gGfxVarInitUpdates,
        "Initial updates should not be present after any gfxVars operation");
    return;
  }

  // sVarList must be initialized first since it's used in the constructor for
  // sInstance.
  sVarList = new nsTArray<gfxVars::VarBase*>();
  sInstance = new gfxVars;

  // Content processes should have gotten a call to SetValuesForInitialize,
  // which will have set gGfxVarInitUpdates.
  MOZ_ASSERT_IF(XRE_IsContentProcess(), gGfxVarInitUpdates);

  if (gGfxVarInitUpdates) {
    // Apply any updates from gGfxVarInitUpdates.
    ApplyUpdate(*gGfxVarInitUpdates);
    gGfxVarInitUpdates = nullptr;
  }
}

gfxVars::gfxVars() = default;

void gfxVars::Shutdown() {
  sInstance = nullptr;
  sVarList = nullptr;
  gGfxVarInitUpdates = nullptr;
}

/* static */
void gfxVars::ApplyUpdate(const nsTArray<GfxVarUpdate>& aUpdate) {
  // Only subprocesses receive updates and apply them locally.
  MOZ_ASSERT(!XRE_IsParentProcess());
  MOZ_DIAGNOSTIC_ASSERT(sVarList || gGfxVarInitUpdates);
  if (sVarList) {
    for (auto& i : aUpdate) {
      sVarList->ElementAt(i.index())->SetValue(i.value());
    }
  } else if (gGfxVarInitUpdates) {
    // Too early, we haven't been initialized, so just add to
    // the array waiting for the initialization...
    gGfxVarInitUpdates->AppendElements(aUpdate);
  }
}

/* static */
void gfxVars::AddReceiver(gfxVarReceiver* aReceiver) {
  MOZ_ASSERT(NS_IsMainThread());

  // Don't double-add receivers, in case a broken content process sends two
  // init messages.
  if (!sInstance->mReceivers.Contains(aReceiver)) {
    sInstance->mReceivers.AppendElement(aReceiver);
  }
}

/* static */
void gfxVars::RemoveReceiver(gfxVarReceiver* aReceiver) {
  MOZ_ASSERT(NS_IsMainThread());

  if (sInstance) {
    sInstance->mReceivers.RemoveElement(aReceiver);
  }
}

/* static */
nsTArray<GfxVarUpdate> gfxVars::FetchNonDefaultVars() {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(sVarList);

  nsTArray<GfxVarUpdate> updates;
  for (size_t i = 0; i < sVarList->Length(); i++) {
    VarBase* var = sVarList->ElementAt(i);
    if (var->HasDefaultValue()) {
      continue;
    }

    GfxVarValue value;
    var->GetValue(&value);

    updates.AppendElement(GfxVarUpdate(i, value));
  }

  return updates;
}

gfxVars::VarBase::VarBase() {
  mIndex = gfxVars::sVarList->Length();
  gfxVars::sVarList->AppendElement(this);
}

void gfxVars::NotifyReceivers(VarBase* aVar) {
  MOZ_ASSERT(NS_IsMainThread());

  GfxVarValue value;
  aVar->GetValue(&value);

  if (XRE_IsParentProcess() && gGfxVarPendingUpdates) {
    gGfxVarPendingUpdates->AppendElement(GfxVarUpdate(aVar->Index(), value));
    return;
  }

  AutoTArray<GfxVarUpdate, 1> vars;
  vars.AppendElement(GfxVarUpdate(aVar->Index(), value));

  for (auto& receiver : mReceivers) {
    receiver->OnVarChanged(vars);
  }
}

}  // namespace gfx
}  // namespace mozilla
