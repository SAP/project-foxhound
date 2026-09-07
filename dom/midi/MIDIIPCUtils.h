/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_MIDIIPCUtils_h
#define mozilla_dom_MIDIIPCUtils_h

#include "mozilla/dom/BindingIPCUtils.h"
#include "mozilla/dom/MIDIPortBinding.h"

namespace IPC {

template <>
struct ParamTraits<mozilla::dom::MIDIPortType>
    : public mozilla::dom::WebIDLEnumSerializer<mozilla::dom::MIDIPortType> {};

template <>
struct ParamTraits<mozilla::dom::MIDIPortDeviceState>
    : public mozilla::dom::WebIDLEnumSerializer<
          mozilla::dom::MIDIPortDeviceState> {};

template <>
struct ParamTraits<mozilla::dom::MIDIPortConnectionState>
    : public mozilla::dom::WebIDLEnumSerializer<
          mozilla::dom::MIDIPortConnectionState> {};

}  // namespace IPC

#endif  // mozilla_dom_MIDIIPCUtils_h
