/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Shadow definition of |js::ObjectGroup| innards.  Do not use this directly! */

#ifndef js_shadow_ObjectGroup_h
#define js_shadow_ObjectGroup_h

#include "jstypes.h"  // JS_PUBLIC_API

struct JSClass;
class JS_PUBLIC_API JSObject;

namespace JS {

class JS_PUBLIC_API Realm;

namespace shadow {

struct ObjectGroup {
  const JSClass* clasp;
  JSObject* proto;
  JS::Realm* realm;
};

}  // namespace shadow

}  // namespace JS

#endif  // js_shadow_ObjectGroup_h
