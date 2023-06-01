/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/MidiPermissionStatus.h"

#include "mozilla/dom/PermissionStatus.h"
#include "mozilla/Permission.h"

namespace mozilla::dom {

/* static */
already_AddRefed<PermissionStatus> MidiPermissionStatus::Create(
    nsPIDOMWindowInner* aWindow, bool aSysex, ErrorResult& aRv) {
  RefPtr<PermissionStatus> status = new MidiPermissionStatus(aWindow, aSysex);
  aRv = status->Init();
  if (NS_WARN_IF(aRv.Failed())) {
    return nullptr;
  }

  return status.forget();
}

MidiPermissionStatus::MidiPermissionStatus(nsPIDOMWindowInner* aWindow,
                                           bool aSysex)
    : PermissionStatus(aWindow, PermissionName::Midi), mSysex(aSysex) {}

nsLiteralCString MidiPermissionStatus::GetPermissionType() {
  return mSysex ? "midi-sysex"_ns : "midi"_ns;
}

}  // namespace mozilla::dom
