/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef IPC_PropertyBagUtils_h
#define IPC_PropertyBagUtils_h

#include "chrome/common/ipc_message_utils.h"
#include "nsIPropertyBag2.h"
#include "nsIVariant.h"

namespace IPC {

/**
 * Limited nsIVariant support. Not all types are implemented and only
 * nsIURI is implemented with nsIVariant::GetAsInterface.
 */
template <>
struct ParamTraits<nsIVariant*> {
  static void Write(MessageWriter* aWriter, nsIVariant* aParam);
  static bool Read(MessageReader* aReader, RefPtr<nsIVariant>* aResult);
};

template <>
struct ParamTraits<nsIPropertyBag2*> {
  static void Write(MessageWriter* aWriter, nsIPropertyBag2* aParam);
  static bool Read(MessageReader* aReader, RefPtr<nsIPropertyBag2>* aResult);
};

}  // namespace IPC

#endif  // mozilla_ipc_URIUtils_h
