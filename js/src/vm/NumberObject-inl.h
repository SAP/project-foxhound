/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef vm_NumberObject_inl_h
#define vm_NumberObject_inl_h

#include "vm/NumberObject.h"

#include "vm/JSObject-inl.h"

namespace js {

inline NumberObject* NumberObject::create(JSContext* cx, double d,
                                          HandleObject proto /* = nullptr */) {
  NumberObject* obj = NewObjectWithClassProto<NumberObject>(cx, proto);
  if (!obj) {
    return nullptr;
  }
  obj->setPrimitiveValue(d);

  // Taintfox: initialize the taint slot to null
  obj->initReservedSlot(TAINT_SLOT, PrivateValue(nullptr));

  return obj;
}


  
inline NumberObject*
NumberObject::createTainted(JSContext* cx, double d, const TaintFlow& taint, HandleObject proto /* = nullptr */)
{
  NumberObject* obj = create(cx, d, proto);
  if (!obj) {
    return nullptr;
  }  
  obj->setTaint(taint);
  return obj;
}

} // namespace js

#endif /* vm_NumberObject_inl_h */
