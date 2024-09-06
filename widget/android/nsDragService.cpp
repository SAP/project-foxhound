/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsDragService.h"

#include "AndroidGraphics.h"
#include "AndroidWidgetUtils.h"
#include "mozilla/dom/Document.h"
#include "mozilla/java/GeckoDragAndDropWrappers.h"
#include "mozilla/PresShell.h"
#include "mozilla/ScopeExit.h"
#include "nsArrayUtils.h"
#include "nsClipboard.h"
#include "nsComponentManagerUtils.h"
#include "nsIArray.h"
#include "nsITransferable.h"
#include "nsPrimitiveHelpers.h"
#include "nsViewManager.h"
#include "nsWindow.h"

NS_IMPL_ISUPPORTS_INHERITED0(nsDragService, nsBaseDragService)

using namespace mozilla;
using namespace mozilla::widget;

StaticRefPtr<nsDragService> sDragServiceInstance;

/* static */
already_AddRefed<nsDragService> nsDragService::GetInstance() {
  if (!sDragServiceInstance) {
    sDragServiceInstance = new nsDragService();
    ClearOnShutdown(&sDragServiceInstance);
  }

  RefPtr<nsDragService> service = sDragServiceInstance.get();
  return service.forget();
}

static nsWindow* GetWindow(dom::Document* aDocument) {
  if (!aDocument) {
    return nullptr;
  }

  PresShell* presShell = aDocument->GetPresShell();
  if (!presShell) {
    return nullptr;
  }

  RefPtr<nsViewManager> vm = presShell->GetViewManager();
  if (!vm) {
    return nullptr;
  }

  nsCOMPtr<nsIWidget> widget = vm->GetRootWidget();
  if (!widget) {
    return nullptr;
  }

  RefPtr<nsWindow> window = nsWindow::From(widget);
  return window.get();
}

nsresult nsDragService::InvokeDragSessionImpl(
    nsIArray* aTransferableArray, const Maybe<CSSIntRegion>& aRegion,
    uint32_t aActionType) {
  if (jni::GetAPIVersion() < 24) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  uint32_t count = 0;
  aTransferableArray->GetLength(&count);
  if (count != 1) {
    return NS_ERROR_FAILURE;
  }

  nsCOMPtr<nsITransferable> transferable =
      do_QueryElementAt(aTransferableArray, 0);

  nsAutoString html;
  nsAutoString text;
  nsresult rv = nsClipboard::GetTextFromTransferable(transferable, text, html);
  if (NS_FAILED(rv)) {
    return rv;
  }
  java::GeckoDragAndDrop::SetDragData(text, html);

  if (nsWindow* window = GetWindow(mSourceDocument)) {
    mTransferable = transferable;

    nsBaseDragService::StartDragSession();
    nsBaseDragService::OpenDragPopup();

    auto bitmap = CreateDragImage(mSourceNode, aRegion);
    window->StartDragAndDrop(bitmap);

    return NS_OK;
  }

  return NS_ERROR_FAILURE;
}

NS_IMETHODIMP
nsDragService::GetData(nsITransferable* aTransferable, uint32_t aItem) {
  if (!aTransferable) {
    return NS_ERROR_INVALID_ARG;
  }

  nsTArray<nsCString> flavors;
  nsresult rv = aTransferable->FlavorsTransferableCanImport(flavors);
  if (NS_FAILED(rv)) {
    return NS_ERROR_FAILURE;
  }

  for (const auto& flavor : flavors) {
    nsCOMPtr<nsISupports> data;
    rv = mTransferable->GetTransferData(flavor.get(), getter_AddRefs(data));
    if (NS_FAILED(rv)) {
      continue;
    }
    rv = aTransferable->SetTransferData(flavor.get(), data);
    if (NS_SUCCEEDED(rv)) {
      return rv;
    }
  }

  return NS_ERROR_FAILURE;
}

NS_IMETHODIMP
nsDragService::GetNumDropItems(uint32_t* aNumItems) {
  if (mTransferable) {
    *aNumItems = 1;
    return NS_OK;
  }
  *aNumItems = 0;
  return NS_OK;
}

NS_IMETHODIMP
nsDragService::IsDataFlavorSupported(const char* aDataFlavor, bool* _retval) {
  *_retval = false;

  nsDependentCString dataFlavor(aDataFlavor);
  auto logging = MakeScopeExit([&] {
    MOZ_DRAGSERVICE_LOG("IsDataFlavorSupported: %s is%s found", aDataFlavor,
                        *_retval ? "" : " not");
  });

  nsTArray<nsCString> flavors;
  nsresult rv = mTransferable->FlavorsTransferableCanImport(flavors);
  if (NS_FAILED(rv)) {
    return NS_OK;
  }

  for (const auto& flavor : flavors) {
    if (dataFlavor.Equals(flavor)) {
      *_retval = true;
      return NS_OK;
    }
  }

  return NS_OK;
}

NS_IMETHODIMP
nsDragService::EndDragSession(bool aDoneDrag, uint32_t aKeyModifiers) {
  java::GeckoDragAndDrop::EndDragSession();

  nsresult rv = nsBaseDragService::EndDragSession(aDoneDrag, aKeyModifiers);
  mTransferable = nullptr;
  return rv;
}

NS_IMETHODIMP
nsDragService::UpdateDragImage(nsINode* aImage, int32_t aImageX,
                               int32_t aImageY) {
  nsBaseDragService::UpdateDragImage(aImage, aImageX, aImageY);
  auto bitmap = CreateDragImage(mSourceNode, Nothing());

  if (nsWindow* window = GetWindow(mSourceDocument)) {
    window->UpdateDragImage(bitmap);
  }

  return NS_OK;
}

bool nsDragService::MustUpdateDataTransfer(EventMessage aMessage) {
  // Android's drag and drop API sets drop item in drop event.
  // So we have to invalidate data transfer cache on drop event.
  return aMessage == eDrop;
}

java::sdk::Bitmap::LocalRef nsDragService::CreateDragImage(
    nsINode* aNode, const Maybe<CSSIntRegion>& aRegion) {
  LayoutDeviceIntRect dragRect;
  RefPtr<SourceSurface> surface;
  nsPresContext* pc;
  DrawDrag(aNode, aRegion, mScreenPosition, &dragRect, &surface, &pc);
  if (!surface) {
    return nullptr;
  }

  RefPtr<DataSourceSurface> destDataSurface =
      AndroidWidgetUtils::GetDataSourceSurfaceForAndroidBitmap(
          surface, &dragRect, dragRect.width * 4);
  if (!destDataSurface) {
    return nullptr;
  }

  DataSourceSurface::ScopedMap destMap(destDataSurface,
                                       DataSourceSurface::READ);

  java::sdk::Bitmap::LocalRef bitmap;
  auto pixels = mozilla::jni::ByteBuffer::New(
      reinterpret_cast<int8_t*>(destMap.GetData()),
      destMap.GetStride() * destDataSurface->GetSize().height);
  bitmap = java::sdk::Bitmap::CreateBitmap(
      dragRect.width, dragRect.height, java::sdk::Bitmap::Config::ARGB_8888());
  bitmap->CopyPixelsFromBuffer(pixels);
  return bitmap;
}

void nsDragService::SetData(nsITransferable* aTransferable) {
  mTransferable = aTransferable;
  // Reset DataTransfer
  mDataTransfer = nullptr;
}

// static
void nsDragService::SetDropData(
    mozilla::java::GeckoDragAndDrop::DropData::Param aDropData) {
  MOZ_ASSERT(NS_IsMainThread());

  RefPtr<nsDragService> dragService = nsDragService::GetInstance();
  if (!dragService) {
    return;
  }

  if (!aDropData) {
    dragService->SetData(nullptr);
    return;
  }

  nsCString mime(aDropData->MimeType()->ToCString());

  if (mime.EqualsLiteral("application/x-moz-draganddrop")) {
    // The drop data isn't changed.
    return;
  }

  if (!mime.EqualsLiteral("text/plain") && !mime.EqualsLiteral("text/html")) {
    // Not supported data.
    dragService->SetData(nullptr);
    return;
  }

  nsString buffer(aDropData->Text()->ToString());
  nsCOMPtr<nsISupports> wrapper;
  nsPrimitiveHelpers::CreatePrimitiveForData(
      mime, buffer.get(), buffer.Length() * 2, getter_AddRefs(wrapper));
  if (!wrapper) {
    dragService->SetData(nullptr);
    return;
  }
  nsCOMPtr<nsITransferable> transferable =
      do_CreateInstance("@mozilla.org/widget/transferable;1");
  transferable->Init(nullptr);
  transferable->SetTransferData(mime.get(), wrapper);
  dragService->SetData(transferable);
}
