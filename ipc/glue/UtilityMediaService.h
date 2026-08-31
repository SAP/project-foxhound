/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef _include_ipc_glue_UtilityMediaService_h_
#define _include_ipc_glue_UtilityMediaService_h_

#include "mozilla/dom/ChromeUtilsBinding.h"
#include "mozilla/ipc/UtilityProcessSandboxing.h"

namespace mozilla::ipc {

using UtilityActorName = mozilla::dom::WebIDLUtilityActorName;

UtilityActorName GetAudioActorName(const SandboxingKind aSandbox);
nsCString GetChildAudioActorName();

}  // namespace mozilla::ipc

#endif  // _include_ipc_glue_UtilityMediaService_h_
