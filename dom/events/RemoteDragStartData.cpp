/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "RemoteDragStartData.h"

#include "mozilla/dom/BlobImpl.h"
#include "mozilla/dom/BrowserParent.h"
#include "mozilla/dom/DOMTypes.h"
#include "mozilla/dom/IPCBlobUtils.h"
#include "mozilla/ipc/ProtocolUtils.h"
#include "nsContentAreaDragDrop.h"
#include "nsContentUtils.h"
#include "nsICookieJarSettings.h"
#include "nsVariant.h"

using namespace mozilla::ipc;

namespace mozilla::dom {

RemoteDragStartData::~RemoteDragStartData() = default;

RemoteDragStartData::RemoteDragStartData(
    BrowserParent* aBrowserParent,
    nsTArray<IPCTransferableData>&& aTransferableData,
    const LayoutDeviceIntRect& aRect, nsIPrincipal* aPrincipal,
    nsIPolicyContainer* aPolicyContainer,
    nsICookieJarSettings* aCookieJarSettings,
    WindowContext* aSourceWindowContext, WindowContext* aSourceTopWindowContext)
    : mBrowserParent(aBrowserParent),
      mTransferableData(std::move(aTransferableData)),
      mRect(aRect),
      mPrincipal(aPrincipal),
      mPolicyContainer(aPolicyContainer),
      mCookieJarSettings(aCookieJarSettings),
      mSourceWindowContext(aSourceWindowContext),
      mSourceTopWindowContext(aSourceTopWindowContext) {}

void RemoteDragStartData::AddInitialDnDDataTo(
    DataTransfer* aDataTransfer, nsIPrincipal** aPrincipal,
    nsIPolicyContainer** aPolicyContainer,
    nsICookieJarSettings** aCookieJarSettings) {
  NS_IF_ADDREF(*aPrincipal = mPrincipal);
  NS_IF_ADDREF(*aPolicyContainer = mPolicyContainer);
  NS_IF_ADDREF(*aCookieJarSettings = mCookieJarSettings);

  for (uint32_t i = 0; i < mTransferableData.Length(); ++i) {
    nsTArray<IPCTransferableDataItem>& itemArray = mTransferableData[i].items();
    for (auto& item : itemArray) {
      if (!nsContentUtils::IPCTransferableDataItemHasKnownFlavor(item)) {
        NS_WARNING(
            "Ignoring unknown flavor in "
            "RemoteDragStartData::AddInitialDnDDataTo");
        continue;
      }

      RefPtr<nsVariantCC> variant = new nsVariantCC();
      // Special case kFilePromiseMime so that we get the right
      // nsIFlavorDataProvider for it.
      if (item.flavor().EqualsLiteral(kFilePromiseMime)) {
        RefPtr<nsISupports> flavorDataProvider =
            new nsContentAreaDragDropDataProvider();
        variant->SetAsISupports(flavorDataProvider);
      } else {
        nsresult rv =
            nsContentUtils::IPCTransferableDataItemToVariant(item, variant);
        if (NS_FAILED(rv)) {
          continue;
        }
      }

      // We set aHidden to false, as we don't need to worry about hiding data
      // from content in the parent process where there is no content.
      aDataTransfer->SetDataWithPrincipalFromOtherProcess(
          NS_ConvertUTF8toUTF16(item.flavor()), variant, i, mPrincipal,
          /* aHidden = */ false);
    }
  }

  // Clear things that are no longer needed.
  mTransferableData.Clear();
  mPrincipal = nullptr;
}

}  // namespace mozilla::dom
