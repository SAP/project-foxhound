/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_ipc_StructuredCloneData_h
#define mozilla_dom_ipc_StructuredCloneData_h

#include "mozilla/dom/StructuredCloneHolder.h"
#include "nsISupportsImpl.h"

namespace IPC {
class MessageReader;
class MessageWriter;
template <typename T>
struct ParamTypes;
}  // namespace IPC

namespace mozilla::dom::ipc {

/**
 * IPC-aware reference-counted StructuredCloneHolder subclass that is usable as
 * an IPDL data-type. If your use-case does not (potentially) involve IPC, then
 * you should use StructuredCloneHolder or one of its other subclasses instead.
 *
 * A newly created StructuredCloneData is created in an uninitialized state, and
 * can be initialized either by writing into it (e.g. by using
 * StructuredCloneHolder::Write), or by deserializing into it (e.g. by using
 * ReadIPCParams).
 */
class StructuredCloneData : public StructuredCloneHolder {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(StructuredCloneData);

  // Construct a new StructuredCloneData in an uninitialized state, using the
  // DifferentProcess scope.
  StructuredCloneData();

  // Only DifferentProcess and UnknownDestination scopes are supported.
  StructuredCloneData(StructuredCloneScope aScope,
                      TransferringSupport aSupportsTransferring);

  // Initialize this instance by copying the given data that probably came from
  // nsStructuredClone doing a base64 decode.  Don't use this.
  bool CopyExternalData(const char* aData, size_t aDataLength,
                        uint32_t aVersion = JS_STRUCTURED_CLONE_VERSION);

  bool SupportsTransferring() { return mSupportsTransferring; }

  // For IPC serialization
  void WriteIPCParams(IPC::MessageWriter* aWriter);
  bool ReadIPCParams(IPC::MessageReader* aReader);

 protected:
  ~StructuredCloneData();
};

}  // namespace mozilla::dom::ipc

namespace IPC {

template <>
struct ParamTraits<mozilla::dom::ipc::StructuredCloneData*> {
  using paramType = mozilla::dom::ipc::StructuredCloneData;
  static void Write(MessageWriter* aWriter, paramType* aParam);
  static bool Read(MessageReader* aReader, RefPtr<paramType>* aResult);
};

}  // namespace IPC

#endif  // mozilla_dom_ipc_StructuredCloneData_h
