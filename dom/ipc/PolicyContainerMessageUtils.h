/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_policy_container_message_utils_h_
#define mozilla_dom_policy_container_message_utils_h_

#include "ipc/IPCMessageUtils.h"
#include "nsCOMPtr.h"

class nsIPolicyContainer;

namespace IPC {

template <>
struct ParamTraits<nsIPolicyContainer*> {
  static void Write(MessageWriter* aWriter, nsIPolicyContainer* aParam);
  static bool Read(MessageReader* aReader, RefPtr<nsIPolicyContainer>* aResult);
};

}  // namespace IPC

#endif  // mozilla_policy_container_message_utils_h__
