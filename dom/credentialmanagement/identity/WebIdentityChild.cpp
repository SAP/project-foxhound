/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/WebIdentityChild.h"

#include "mozilla/dom/BrowsingContext.h"
#include "mozilla/dom/WebIdentityHandler.h"
#include "mozilla/dom/WindowContext.h"
#include "nsGlobalWindowOuter.h"

namespace mozilla::dom {

void WebIdentityChild::ActorDestroy(ActorDestroyReason why) {
  if (mHandler) {
    mHandler->ActorDestroyed();
    mHandler = nullptr;
  }
}

void WebIdentityChild::SetHandler(WebIdentityHandler* aHandler) {
  mHandler = aHandler;
}

mozilla::ipc::IPCResult WebIdentityChild::RecvOpenContinuationWindow(
    nsIURI* aContinueURI, const OpenContinuationWindowResolver& aResolver) {
  MOZ_ASSERT(mHandler);
  nsPIDOMWindowInner* window = mHandler->GetWindow();
  MOZ_ASSERT(window);
  MOZ_ASSERT(window->GetWindowContext());

  // Open a popup via the window opening this to the provided URL, resolving
  // with the new browsing context if we can get one.
  nsGlobalWindowOuter* outer = nsGlobalWindowOuter::GetOuterWindowWithId(
      window->GetWindowContext()->OuterWindowId());
  RefPtr<BrowsingContext> newBC;
  nsresult rv = outer->OpenJS(aContinueURI->GetSpecOrDefault(), u"_blank"_ns,
                              u"popup"_ns, getter_AddRefs(newBC));
  if (NS_FAILED(rv)) {
    aResolver(rv);
  } else if (!newBC) {
    aResolver(NS_ERROR_UNEXPECTED);
  } else {
    aResolver(MaybeDiscardedBrowsingContext(newBC));
  }
  return IPC_OK();
}

}  // namespace mozilla::dom
