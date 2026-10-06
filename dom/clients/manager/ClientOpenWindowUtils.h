/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef _mozilla_dom_ClientOpenWindowUtils_h
#define _mozilla_dom_ClientOpenWindowUtils_h

#include "ClientOpPromise.h"
#include "mozilla/dom/ClientIPCTypes.h"

namespace mozilla::dom {

class ThreadsafeContentParentHandle;

using BrowsingContextCallbackReceivedPromise =
    MozPromise<RefPtr<BrowsingContext>, CopyableErrorResult, false>;

[[nodiscard]] RefPtr<ClientOpPromise> ClientOpenWindow(
    ThreadsafeContentParentHandle* aOriginContent,
    const ClientOpenWindowArgs& aArgs);

}  // namespace mozilla::dom

#endif  // _mozilla_dom_ClientOpenWindowUtils_h
