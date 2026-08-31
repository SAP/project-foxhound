/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_PrivateAttributionIPCUtils_h
#define mozilla_dom_PrivateAttributionIPCUtils_h

#include "mozilla/dom/BindingIPCUtils.h"
#include "mozilla/dom/PrivateAttributionBinding.h"

namespace IPC {

template <>
struct ParamTraits<mozilla::dom::PrivateAttributionImpressionType>
    : public mozilla::dom::WebIDLEnumSerializer<
          mozilla::dom::PrivateAttributionImpressionType> {};

}  // namespace IPC

#endif
