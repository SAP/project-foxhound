/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LNAPermissionRequest_h_
#define LNAPermissionRequest_h_
#include "nsContentPermissionHelper.h"
#include "nsISupports.h"
#include "nsPIDOMWindow.h"

namespace mozilla::net {
static constexpr nsLiteralCString LOOPBACK_NETWORK_PERMISSION_KEY =
    "loopback-network"_ns;
static constexpr nsLiteralCString LOCAL_NETWORK_PERMISSION_KEY =
    "local-network"_ns;

using PermissionPromptCallback =
    std::function<void(bool granted, const nsACString& type, bool promptShown)>;

/**
 * Handles permission dialog management for local network accesses
 */
class LNAPermissionRequest final : public dom::ContentPermissionRequestBase {
 public:
  LNAPermissionRequest(PermissionPromptCallback&& aCallback,
                       nsILoadInfo* aLoadInfo, const nsACString& aType);

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(LNAPermissionRequest,
                                           ContentPermissionRequestBase)

  // nsIContentPermissionRequest
  NS_IMETHOD
  Cancel(void) override;
  NS_IMETHOD Allow(JS::Handle<JS::Value> choices) override;
  NS_IMETHOD NotifyShown(void) override;
  NS_IMETHOD GetElement(mozilla::dom::Element** aElement) override;

  nsresult RequestPermission();

 private:
  ~LNAPermissionRequest() = default;
  nsCOMPtr<nsILoadInfo> mLoadInfo;
  RefPtr<mozilla::dom::BrowsingContext> mBrowsingContext;
  PermissionPromptCallback mPermissionPromptCallback;
  bool mPromptWasShown = false;
};

}  // namespace mozilla::net

#endif  // LNAPermissionRequest_h
