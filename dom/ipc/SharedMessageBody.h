/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_SharedMessageBody_h
#define mozilla_dom_SharedMessageBody_h

#include "mozilla/Maybe.h"
#include "mozilla/dom/ipc/StructuredCloneData.h"

namespace mozilla {

namespace ipc {
class PBackgroundChild;
}

namespace dom {

class MessagePort;
class RefMessageBody;
class RefMessageBodyService;

class SharedMessageBody final {
 public:
  NS_INLINE_DECL_REFCOUNTING(SharedMessageBody)

  SharedMessageBody(
      StructuredCloneHolder::TransferringSupport aSupportsTransferring,
      const Maybe<nsID>& aAgentClusterId);

  enum ReadMethod {
    StealRefMessageBody,
    KeepRefMessageBody,
  };

  void Read(JSContext* aCx, JS::MutableHandle<JS::Value> aValue,
            RefMessageBodyService* aRefMessageBodyService,
            ReadMethod aReadMethod, ErrorResult& aRv);

  void Write(JSContext* aCx, JS::Handle<JS::Value> aValue,
             JS::Handle<JS::Value> aTransfers, nsID& aPortID,
             RefMessageBodyService* aRefMessageBodyService, ErrorResult& aRv);

  bool TakeTransferredPortsAsSequence(
      Sequence<OwningNonNull<mozilla::dom::MessagePort>>& aPorts);

  const Maybe<nsID>& GetRefDataId() const { return mRefDataId; }

 private:
  friend struct IPC::ParamTraits<mozilla::dom::SharedMessageBody*>;

  ~SharedMessageBody();

  RefPtr<ipc::StructuredCloneData> mCloneData;

  RefPtr<RefMessageBody> mRefData;
  Maybe<nsID> mRefDataId;

  const StructuredCloneHolder::TransferringSupport mSupportsTransferring;
  const Maybe<nsID> mAgentClusterId;
};

}  // namespace dom
}  // namespace mozilla

namespace IPC {

template <>
struct ParamTraits<mozilla::dom::SharedMessageBody*> {
  using paramType = mozilla::dom::SharedMessageBody;
  static void Write(MessageWriter* aWriter, paramType* aParam);
  static bool Read(MessageReader* aReader, RefPtr<paramType>* aResult);
};

}  // namespace IPC

#endif  // mozilla_dom_SharedMessageBody_h
