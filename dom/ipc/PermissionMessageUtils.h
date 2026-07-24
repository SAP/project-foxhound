/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_permission_message_utils_h_
#define mozilla_dom_permission_message_utils_h_

#include "ipc/IPCMessageUtils.h"
#include "nsCOMPtr.h"
#include "nsIPrincipal.h"

namespace IPC {

template <>
struct ParamTraits<nsIPrincipal*> {
  static void Write(IPC::MessageWriter* aWriter, nsIPrincipal* aParam);
  static bool Read(IPC::MessageReader* aReader, RefPtr<nsIPrincipal>* aResult);

  // Overload to support deserializing nsCOMPtr<nsIPrincipal> directly.
  static bool Read(IPC::MessageReader* aReader,
                   nsCOMPtr<nsIPrincipal>* aResult) {
    RefPtr<nsIPrincipal> result;
    if (!Read(aReader, &result)) {
      return false;
    }
    *aResult = std::move(result);
    return true;
  }
};

}  // namespace IPC

#endif  // mozilla_dom_permission_message_utils_h_
