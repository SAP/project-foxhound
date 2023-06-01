/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsDragServiceProxy.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/BrowserChild.h"
#include "mozilla/gfx/2D.h"
#include "mozilla/net/CookieJarSettings.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/Unused.h"
#include "nsContentUtils.h"

using mozilla::CSSIntRegion;
using mozilla::LayoutDeviceIntRect;
using mozilla::Maybe;
using mozilla::Nothing;
using mozilla::Some;
using mozilla::dom::BrowserChild;
using mozilla::gfx::DataSourceSurface;
using mozilla::gfx::SourceSurface;
using mozilla::gfx::SurfaceFormat;
using mozilla::ipc::Shmem;

nsDragServiceProxy::nsDragServiceProxy() = default;

nsDragServiceProxy::~nsDragServiceProxy() = default;

nsresult nsDragServiceProxy::InvokeDragSessionImpl(
    nsIArray* aArrayTransferables, const Maybe<CSSIntRegion>& aRegion,
    uint32_t aActionType) {
  NS_ENSURE_STATE(mSourceDocument->GetDocShell());
  BrowserChild* child = BrowserChild::GetFrom(mSourceDocument->GetDocShell());
  NS_ENSURE_STATE(child);
  nsTArray<mozilla::dom::IPCDataTransfer> dataTransfers;
  nsContentUtils::TransferablesToIPCTransferables(
      aArrayTransferables, dataTransfers, false, child->Manager(), nullptr);

  nsCOMPtr<nsIPrincipal> principal;
  if (mSourceNode) {
    principal = mSourceNode->NodePrincipal();
  }

  nsCOMPtr<nsIContentSecurityPolicy> csp;
  if (mSourceDocument) {
    csp = mSourceDocument->GetCsp();
    // XXX why do we need this here? Shouldn't they be set properly in
    // nsBaseDragService already?
    mSourceWindowContext = mSourceDocument->GetWindowContext();
    mSourceTopWindowContext = mSourceWindowContext
                                  ? mSourceWindowContext->TopWindowContext()
                                  : nullptr;
  }

  nsCOMPtr<nsICookieJarSettings> cookieJarSettings;
  cookieJarSettings = mSourceDocument->CookieJarSettings();
  mozilla::net::CookieJarSettingsArgs csArgs;
  mozilla::net::CookieJarSettings::Cast(cookieJarSettings)->Serialize(csArgs);

  LayoutDeviceIntRect dragRect;
  if (mHasImage || mSelection) {
    nsPresContext* pc;
    RefPtr<SourceSurface> surface;
    DrawDrag(mSourceNode, aRegion, mScreenPosition, &dragRect, &surface, &pc);

    if (surface) {
      RefPtr<DataSourceSurface> dataSurface = surface->GetDataSurface();
      if (dataSurface) {
        size_t length;
        int32_t stride;
        auto surfaceData =
            nsContentUtils::GetSurfaceData(*dataSurface, &length, &stride);
        if (surfaceData.isNothing()) {
          NS_WARNING("Failed to create shared memory for drag session.");
          return NS_ERROR_FAILURE;
        }

        mozilla::Unused << child->SendInvokeDragSession(
            std::move(dataTransfers), aActionType, std::move(surfaceData),
            stride, dataSurface->GetFormat(), dragRect, principal, csp, csArgs,
            mSourceWindowContext, mSourceTopWindowContext);
        StartDragSession();
        return NS_OK;
      }
    }
  }

  mozilla::Unused << child->SendInvokeDragSession(
      std::move(dataTransfers), aActionType, Nothing(), 0,
      static_cast<SurfaceFormat>(0), dragRect, principal, csp, csArgs,
      mSourceWindowContext, mSourceTopWindowContext);
  StartDragSession();
  return NS_OK;
}
