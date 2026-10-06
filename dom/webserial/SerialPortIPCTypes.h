/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_SerialPortIPCTypes_h
#define mozilla_dom_SerialPortIPCTypes_h

#include "ipc/EnumSerializer.h"
#include "mozilla/dom/BindingIPCUtils.h"
#include "mozilla/dom/SerialPortBinding.h"

namespace mozilla::dom {
constexpr uint32_t kMaxSerialBufferSize = 16u * 1024u * 1024u;  // 16 MiB

// Outcome of a parent-driven RequestPort IPC call. The parent drives the
// chooser UI and grant tracking; this is what it reports back to content so
// that Serial::RequestPort can reject the promise with the correct DOM
// exception type.
enum class RequestPortReason : uint8_t {
  Granted,        // User picked a port; the port field is set.
  UserCancelled,  // User dismissed the chooser.
  AddonDenied,    // Site permission addon installation was denied.
  InternalError,  // IPC/prompt setup failed.
  EndGuard_
};
}  // namespace mozilla::dom

namespace IPC {
template <>
struct ParamTraits<mozilla::dom::ParityType>
    : public mozilla::dom::WebIDLEnumSerializer<mozilla::dom::ParityType> {};

template <>
struct ParamTraits<mozilla::dom::FlowControlType>
    : public mozilla::dom::WebIDLEnumSerializer<mozilla::dom::FlowControlType> {
};

template <>
struct ParamTraits<mozilla::dom::RequestPortReason>
    : public ContiguousEnumSerializer<
          mozilla::dom::RequestPortReason,
          mozilla::dom::RequestPortReason::Granted,
          mozilla::dom::RequestPortReason::EndGuard_> {};
}  // namespace IPC

#endif  // mozilla_dom_SerialPortIPCTypes_h
