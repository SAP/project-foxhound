/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_EME_EMEORIGINID_H_
#define DOM_MEDIA_EME_EMEORIGINID_H_

#include "mozilla/StaticPrefs_media.h"
#include "mozilla/media/MediaChild.h"
#include "nsIPrincipal.h"

namespace mozilla {

// Returns a per-origin ID using the shared OriginKeyStore infrastructure.
// The returned promise resolves to an ID string or an empty string if origin
// ID is disabled or unavailable. The underlying GetPrincipalKey call
// may also reject the promise; callers should proceed without an Origin ID in
// either case. Private browsing principals automatically receive temporary
// IDs that are cleared when the PB session ends.
inline RefPtr<media::PrincipalKeyPromise> GetEMEOriginID(
    nsIPrincipal* aPrincipal) {
  MOZ_ASSERT(NS_IsMainThread());

  if (!StaticPrefs::media_eme_mediadrm_origin_id_enabled() || !aPrincipal) {
    return media::PrincipalKeyPromise::CreateAndResolve(""_ns, __func__);
  }

  ipc::PrincipalInfo principalInfo;
  nsresult rv = ipc::PrincipalToPrincipalInfo(aPrincipal, &principalInfo);
  if (NS_FAILED(rv)) {
    return media::PrincipalKeyPromise::CreateAndResolve(""_ns, __func__);
  }

  // The OriginKeyStore infrastructure already routes private browsing
  // principals to a separate in-memory-only table, so the persist flag is
  // irrelevant for private browsing.
  return media::GetPrincipalKey(principalInfo, /*aPersist*/ true);
}

}  // namespace mozilla

#endif  // DOM_MEDIA_EME_EMEORIGINID_H_
