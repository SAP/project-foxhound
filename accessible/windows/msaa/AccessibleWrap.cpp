/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "AccessibleWrap.h"
#include "MsaaAccessible.h"

using namespace mozilla;
using namespace mozilla::a11y;

/* For documentation of the accessibility architecture,
 * see http://lxr.mozilla.org/seamonkey/source/accessible/accessible-docs.html
 */

////////////////////////////////////////////////////////////////////////////////
// AccessibleWrap
////////////////////////////////////////////////////////////////////////////////
AccessibleWrap::AccessibleWrap(nsIContent* aContent, DocAccessible* aDoc)
    : LocalAccessible(aContent, aDoc) {}

AccessibleWrap::~AccessibleWrap() = default;

NS_IMPL_ISUPPORTS_INHERITED0(AccessibleWrap, LocalAccessible)

void AccessibleWrap::Shutdown() {
  if (mMsaa) {
    mMsaa->MsaaShutdown();
    // Don't release mMsaa here because this will cause its id to be released
    // immediately, which will result in immediate reuse, causing problems
    // for clients. Instead, we release it in the destructor.
  }
  LocalAccessible::Shutdown();
}

MsaaAccessible* AccessibleWrap::GetMsaa() {
  if (!mMsaa) {
    mMsaa = MsaaAccessible::Create(this);
  }
  return mMsaa;
}

void AccessibleWrap::GetNativeInterface(void** aOutAccessible) {
  RefPtr<IAccessible> result = GetMsaa();
  return result.forget(aOutAccessible);
}
