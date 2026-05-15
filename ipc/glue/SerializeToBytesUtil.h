/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_ipc_SerializeToBytesUtil_h
#define mozilla_ipc_SerializeToBytesUtil_h

#include "chrome/common/ipc_message_utils.h"
#include "chrome/common/ipc_message.h"

namespace mozilla::ipc {

// This file contains a pair of functions which (ab-)use the IPC::ParamTraits
// serializers with a temporary on-stack IPC::Message to serialize &
// de-serialize a value from a byte span.
//
// NOTE: This is _not_ efficient, and is _not_ guaranteed to work for arbitrary
// types! Many IPC serializers depend on the IPC::Message supporting additional
// information, such as attached endpoints and file handles.

template <typename T>
void SerializeToBytesUtil(T&& aValue, nsTArray<char>& aBytes) {
  IPC::Message tmpMessage(MSG_ROUTING_NONE, -1);

  {
    IPC::MessageWriter writer(tmpMessage);
    IPC::WriteParam(&writer, std::forward<T>(aValue));
  }

  MOZ_RELEASE_ASSERT(!tmpMessage.has_any_attachments(),
                     "Value contains attachments (e.g. endpoints, file "
                     "handles) which cannot be serialized as bytes");

  aBytes.SetLength(tmpMessage.size() - IPC::Message::HeaderSize());

  IPC::MessageReader reader(tmpMessage);
  bool readOk = reader.ReadBytesInto(aBytes.Elements(), aBytes.Length());
  MOZ_RELEASE_ASSERT(readOk);
  // Double-check that the entire Message body was used.
  MOZ_RELEASE_ASSERT(!reader.HasBytesAvailable(1));
}

template <typename T>
IPC::ReadResult<T> DeserializeFromBytesUtil(const Span<char>& aBytes) {
  IPC::Message tmpMessage(MSG_ROUTING_NONE, -1);

  {
    IPC::MessageWriter writer(tmpMessage);
    writer.WriteBytes(aBytes.Elements(), aBytes.Length());
  }

  IPC::MessageReader reader(tmpMessage);
  auto rv = IPC::ReadParam<T>(&reader);
  if (rv.isOk() && reader.HasBytesAvailable(1)) {
    // Unexpected trailing data after deserialization.
    return {};
  }
  return rv;
}

}  // namespace mozilla::ipc

#endif  // mozilla_ipc_SerializeToBytesUtil_h
