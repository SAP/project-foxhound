/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_cache_BoundStorageKeyParent_h
#define mozilla_dom_cache_BoundStorageKeyParent_h

#include "mozilla/dom/cache/PBoundStorageKeyParent.h"

namespace mozilla {
namespace ipc {
class PBackgroundParent;
}  // namespace ipc

namespace dom::cache {
class PCacheOpParent;
class PCacheParent;
class PCacheStorageParent;
class ManagerId;

class BoundStorageKeyParent final : public PBoundStorageKeyParent {
  friend class PBoundStorageKeyParent;

 public:
  explicit BoundStorageKeyParent(
      mozilla::ipc::PBackgroundParent* aBackgroundParent);

  NS_INLINE_DECL_REFCOUNTING(BoundStorageKeyParent, override)

 private:
  ~BoundStorageKeyParent() override;

  already_AddRefed<PCacheStorageParent> AllocPCacheStorageParent(
      const Namespace& aNamespace, const PrincipalInfo& aPrincipalInfo);

  RefPtr<mozilla::ipc::PBackgroundParent> mBackgroundParent;
};

}  // namespace dom::cache
}  // namespace mozilla

#endif  // mozilla_dom_cache_BoundStorageKeyParent_h
