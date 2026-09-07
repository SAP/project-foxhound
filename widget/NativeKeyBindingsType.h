/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_NativeKeyBindingsType_h
#define mozilla_NativeKeyBindingsType_h

#include <stdint.h>

#include "mozilla/DefineEnum.h"

namespace mozilla {

MOZ_DEFINE_ENUM_CLASS_WITH_BASE(
    NativeKeyBindingsType, uint8_t,
    (SingleLineEditor,  // <input type="text"> etc
     MultiLineEditor,   // <textarea>
     RichTextEditor     // contenteditable or designMode
     ));

}  // namespace mozilla

#endif  // #ifndef mozilla_NativeKeyBindings_h
