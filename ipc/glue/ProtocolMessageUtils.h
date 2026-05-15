/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef IPC_GLUE_PROTOCOLMESSAGEUTILS_H
#define IPC_GLUE_PROTOCOLMESSAGEUTILS_H

#include "base/string_util.h"
#include "chrome/common/ipc_channel.h"
#include "chrome/common/ipc_message_utils.h"
#include "ipc/EnumSerializer.h"
#include "mozilla/ipc/Endpoint.h"
#include "mozilla/ipc/ProtocolUtils.h"

class PickleIterator;

namespace mozilla::ipc {
class FileDescriptor;
template <class PFooSide>
class Endpoint;
template <class PFooSide>
class ManagedEndpoint;
}  // namespace mozilla::ipc

namespace IPC {

class Message;
class MessageReader;
class MessageWriter;

template <>
struct ParamTraits<IPCMessageStart>
    : ContiguousEnumSerializer<IPCMessageStart, IPCMessageStart(0),
                               LastMsgIndex> {};

template <>
struct ParamTraits<mozilla::ipc::IProtocol*> {
  using paramType = mozilla::ipc::IProtocol*;

  static void Write(MessageWriter* aWriter, const paramType& aParam);

  static bool Read(MessageReader* aReader, paramType* aResult);
};

template <>
struct ParamTraits<mozilla::ipc::UntypedEndpoint> {
  using paramType = mozilla::ipc::UntypedEndpoint;

  static void Write(MessageWriter* aWriter, paramType&& aParam);

  static bool Read(MessageReader* aReader, paramType* aResult);
};

template <class PFooSide>
struct ParamTraits<mozilla::ipc::Endpoint<PFooSide>>
    : ParamTraits<mozilla::ipc::UntypedEndpoint> {};

template <>
struct ParamTraits<mozilla::ipc::EndpointProcInfo> {
  using paramType = mozilla::ipc::EndpointProcInfo;

  static void Write(MessageWriter* aWriter, const paramType& aParam) {
    IPC::WriteParam(aWriter, aParam.mPid);
    IPC::WriteParam(aWriter, aParam.mChildID);
  }

  static bool Read(MessageReader* aReader, paramType* aResult) {
    return IPC::ReadParam(aReader, &aResult->mPid) &&
           IPC::ReadParam(aReader, &aResult->mChildID);
  }
};

template <>
struct ParamTraits<mozilla::ipc::UntypedManagedEndpoint> {
  using paramType = mozilla::ipc::UntypedManagedEndpoint;

  static void Write(MessageWriter* aWriter, paramType&& aParam);
  static bool Read(MessageReader* aReader, paramType* aResult);
};

template <class PFooSide>
struct ParamTraits<mozilla::ipc::ManagedEndpoint<PFooSide>> {
  using paramType = mozilla::ipc::ManagedEndpoint<PFooSide>;

  static void Write(IPC::MessageWriter* aWriter, paramType&& aParam) {
    ParamTraits<mozilla::ipc::UntypedManagedEndpoint>::Write(aWriter,
                                                             std::move(aParam));
  }

  static bool Read(IPC::MessageReader* aReader, paramType* aResult) {
    return ParamTraits<mozilla::ipc::UntypedManagedEndpoint>::Read(aReader,
                                                                   aResult) &&
           aResult->IsForProtocol(PFooSide::kProtocolId);
  }
};

template <>
struct ParamTraits<mozilla::ipc::FileDescriptor> {
  using paramType = mozilla::ipc::FileDescriptor;

  static void Write(MessageWriter* aWriter, const paramType& aParam);
  static bool Read(MessageReader* aReader, paramType* aResult);
};

}  // namespace IPC

#endif  // IPC_GLUE_PROTOCOLMESSAGEUTILS_H
