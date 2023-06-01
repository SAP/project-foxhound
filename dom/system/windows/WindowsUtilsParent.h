/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_WindowsUtilsParent_h__
#define mozilla_dom_WindowsUtilsParent_h__

#include "mozilla/dom/PWindowsUtilsParent.h"
#include "mozilla/ProcInfo.h"
#include "mozilla/ipc/Endpoint.h"
#include "mozilla/ipc/UtilityProcessParent.h"

namespace mozilla::dom {

// Main-process manager for utilities in the WindowsUtils utility process.
class WindowsUtilsParent final : public PWindowsUtilsParent {
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(WindowsUtilsParent, override);

  nsresult BindToUtilityProcess(
      RefPtr<mozilla::ipc::UtilityProcessParent> aUtilityParent) {
    Endpoint<PWindowsUtilsParent> parentEnd;
    Endpoint<PWindowsUtilsChild> childEnd;
    nsresult rv = PWindowsUtils::CreateEndpoints(base::GetCurrentProcId(),
                                                 aUtilityParent->OtherPid(),
                                                 &parentEnd, &childEnd);

    if (NS_FAILED(rv)) {
      MOZ_ASSERT(false, "Protocol endpoints failure");
      return NS_ERROR_FAILURE;
    }

    if (!aUtilityParent->SendStartWindowsUtilsService(std::move(childEnd))) {
      MOZ_ASSERT(false, "SendStartWindowsUtilsService failed");
      return NS_ERROR_FAILURE;
    }

    DebugOnly<bool> ok = parentEnd.Bind(this);
    MOZ_ASSERT(ok);
    return NS_OK;
  }

  UtilityActorName GetActorName() { return UtilityActorName::WindowsUtils; }

 protected:
  ~WindowsUtilsParent() = default;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_WindowsUtilsParent_h__
