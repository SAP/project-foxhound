/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_ipc_URIUtils_h
#define mozilla_ipc_URIUtils_h

#include "ipc/IPCMessageUtilsSpecializations.h"
#include "mozilla/ipc/URIParams.h"
#include "nsCOMPtr.h"
#include "nsIURI.h"

namespace mozilla {
namespace ipc {

void SerializeURI(nsIURI* aURI, URIParams& aParams);

void SerializeURI(nsIURI* aURI, Maybe<URIParams>& aParams);

already_AddRefed<nsIURI> DeserializeURI(const URIParams& aParams);

already_AddRefed<nsIURI> DeserializeURI(const Maybe<URIParams>& aParams);

}  // namespace ipc
}  // namespace mozilla

namespace IPC {

template <>
struct ParamTraits<nsIURI*> {
  static void Write(IPC::MessageWriter* aWriter, nsIURI* aParam) {
    mozilla::Maybe<mozilla::ipc::URIParams> params;
    mozilla::ipc::SerializeURI(aParam, params);
    WriteParam(aWriter, params);
  }

  static bool Read(IPC::MessageReader* aReader, RefPtr<nsIURI>* aResult) {
    mozilla::Maybe<mozilla::ipc::URIParams> params;
    if (!ReadParam(aReader, &params)) {
      return false;
    }
    *aResult = mozilla::ipc::DeserializeURI(params);
    return true;
  }
};

}  // namespace IPC

#endif  // mozilla_ipc_URIUtils_h
