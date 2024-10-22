/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "CompositableTransactionParent.h"
#include "CompositableHost.h"        // for CompositableParent, etc
#include "CompositorBridgeParent.h"  // for CompositorBridgeParent
#include "mozilla/Assertions.h"      // for MOZ_ASSERT, etc
#include "mozilla/RefPtr.h"          // for RefPtr
#include "mozilla/layers/CompositorTypes.h"
#include "mozilla/layers/ImageBridgeParent.h"  // for ImageBridgeParent
#include "mozilla/layers/LayersSurfaces.h"     // for SurfaceDescriptor
#include "mozilla/layers/LayersTypes.h"        // for MOZ_LAYERS_LOG
#include "mozilla/layers/TextureHost.h"        // for TextureHost
#include "mozilla/layers/WebRenderImageHost.h"
#include "mozilla/mozalloc.h"  // for operator delete
#include "mozilla/Unused.h"
#include "nsDebug.h"   // for NS_WARNING, NS_ASSERTION
#include "nsRegion.h"  // for nsIntRegion

namespace mozilla {
namespace layers {

bool CompositableParentManager::ReceiveCompositableUpdate(
    const CompositableOperation& aEdit) {
  // Ignore all operations on compositables created on stale compositors. We
  // return true because the child is unable to handle errors.
  RefPtr<CompositableHost> compositable =
      FindCompositable(aEdit.compositable());
  if (!compositable) {
    return false;
  }
  return ReceiveCompositableUpdate(aEdit.detail(), WrapNotNull(compositable),
                                   aEdit.compositable());
}

bool CompositableParentManager::ReceiveCompositableUpdate(
    const CompositableOperationDetail& aDetail,
    NotNull<CompositableHost*> aCompositable,
    const CompositableHandle& aHandle) {
  switch (aDetail.type()) {
    case CompositableOperationDetail::TOpRemoveTexture: {
      const OpRemoveTexture& op = aDetail.get_OpRemoveTexture();

      RefPtr<TextureHost> tex =
          TextureHost::AsTextureHost(op.texture().AsParent());

      MOZ_ASSERT(tex.get());
      aCompositable->RemoveTextureHost(tex);
      break;
    }
    case CompositableOperationDetail::TOpUseTexture: {
      const OpUseTexture& op = aDetail.get_OpUseTexture();

      AutoTArray<CompositableHost::TimedTexture, 4> textures;
      for (auto& timedTexture : op.textures()) {
        CompositableHost::TimedTexture* t = textures.AppendElement();
        t->mTexture =
            TextureHost::AsTextureHost(timedTexture.texture().AsParent());
        MOZ_ASSERT(t->mTexture);
        t->mTimeStamp = timedTexture.timeStamp();
        t->mPictureRect = timedTexture.picture();
        t->mFrameID = timedTexture.frameID();
        t->mProducerID = timedTexture.producerID();
        if (timedTexture.readLocked()) {
          t->mTexture->SetReadLocked();
        }
      }
      if (textures.Length() > 0) {
        aCompositable->UseTextureHost(textures);

        for (auto& timedTexture : op.textures()) {
          RefPtr<TextureHost> texture =
              TextureHost::AsTextureHost(timedTexture.texture().AsParent());
          if (texture) {
            texture->SetLastFwdTransactionId(mFwdTransactionId);
            // Make sure that each texture was handled by the compositable
            // because the recycling logic depends on it.
            MOZ_ASSERT(texture->NumCompositableRefs() > 0);
          }
        }
      }
      break;
    }
    case CompositableOperationDetail::TOpUseRemoteTexture: {
      const OpUseRemoteTexture& op = aDetail.get_OpUseRemoteTexture();
      auto* host = aCompositable->AsWebRenderImageHost();
      MOZ_ASSERT(host);

      host->PushPendingRemoteTexture(op.textureId(), op.ownerId(),
                                     GetChildProcessId(), op.size(),
                                     op.textureFlags());
      host->UseRemoteTexture();
      break;
    }
    default: {
      MOZ_ASSERT(false, "bad type");
    }
  }

  return true;
}

void CompositableParentManager::DestroyActor(const OpDestroy& aOp) {
  switch (aOp.type()) {
    case OpDestroy::TPTexture: {
      auto actor = aOp.get_PTexture().AsParent();
      TextureHost::ReceivedDestroy(actor);
      break;
    }
    case OpDestroy::TCompositableHandle: {
      ReleaseCompositable(aOp.get_CompositableHandle());
      break;
    }
    default: {
      MOZ_ASSERT(false, "unsupported type");
    }
  }
}

RefPtr<CompositableHost> CompositableParentManager::AddCompositable(
    const CompositableHandle& aHandle, const TextureInfo& aInfo) {
  if (mCompositables.find(aHandle.Value()) != mCompositables.end()) {
    NS_ERROR("Client should not allocate duplicate handles");
    return nullptr;
  }
  if (!aHandle) {
    NS_ERROR("Client should not allocate 0 as a handle");
    return nullptr;
  }

  RefPtr<CompositableHost> host = CompositableHost::Create(aInfo);
  if (!host) {
    return nullptr;
  }

  mCompositables[aHandle.Value()] = host;
  return host;
}

RefPtr<CompositableHost> CompositableParentManager::FindCompositable(
    const CompositableHandle& aHandle) {
  auto iter = mCompositables.find(aHandle.Value());
  if (iter == mCompositables.end()) {
    return nullptr;
  }

  return iter->second;
}

void CompositableParentManager::ReleaseCompositable(
    const CompositableHandle& aHandle) {
  auto iter = mCompositables.find(aHandle.Value());
  if (iter == mCompositables.end()) {
    return;
  }
  iter->second->OnReleased();
  mCompositables.erase(iter);
}

}  // namespace layers
}  // namespace mozilla
