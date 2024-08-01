/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef vm_NumberObject_h
#define vm_NumberObject_h

#include <iostream>

#include "jsnum.h"
#include "Taint.h"

#include "vm/NativeObject.h"

namespace js {

// TaintFox: Number objects can be tainted.
class NumberObject : public NativeObject {
  /* Stores this Number object's [[PrimitiveValue]]. */
  static const unsigned PRIMITIVE_VALUE_SLOT = 0;

  /* Taintfox: Stores the Number object's taint information */
  static const unsigned TAINT_SLOT = 1;

  static const ClassSpec classSpec_;

 public:
  static const unsigned RESERVED_SLOTS = 2;

  static const JSClass class_;

  /*
   * Creates a new Number object boxing the given number.
   * If proto is nullptr, then Number.prototype will be used instead.
   */
  static inline NumberObject* create(JSContext* cx, double d,
                                     HandleObject proto = nullptr);

  double unbox() const { return getFixedSlot(PRIMITIVE_VALUE_SLOT).toNumber(); }

  static inline NumberObject* createTainted(JSContext* cx, double d,
                                            const TaintFlow& taint,
                                            HandleObject proto = nullptr);

  void finalize(JS::GCContext* gcx) {
    NumberObject::finalize(gcx, this);
    JSObject::finalize(gcx);
  }

  // TaintFox: A finalizer is required for correct memory handling.
  static void finalize(JS::GCContext* gcx, JSObject* obj);

  static void sweepAfterMinorGC(JS::GCContext* gcx, NumberObject* numobj);

  const TaintFlow& taint() const {
    TaintFlow* flow = getTaintFlow();
    if (flow) {
      // head->addref();
      return *flow;
    }
    return TaintFlow::getEmptyTaintFlow();
  }

  void setTaint(const TaintFlow& taint) {
    // TaintNode* current = getTaintNode();
    // if (current) {
    //   current->release();
    // }
    // TaintNode* head = taint.head();
    // if (head) {
    //   head->addref();
    // }
    TaintFlow* flow = getTaintFlow();
    if (flow) {
      delete flow;
    }
    setTaintFlow(taint);
  }

  bool isTainted() const {
    return !!getTaintFlow();
  }

  inline TaintFlow* getTaintFlow() const {
    TaintFlow* n = maybePtrFromReservedSlot<TaintFlow>(TAINT_SLOT);
    return n;
  }

  void setPrimitiveValue(JS::Value value) { setFixedSlot(PRIMITIVE_VALUE_SLOT, value);}

private:
  static JSObject* createPrototype(JSContext* cx, JSProtoKey key);

  inline void setPrimitiveValue(double d) {
    setFixedSlot(PRIMITIVE_VALUE_SLOT, NumberValue(d));
  }

  inline void setTaintFlow(const TaintFlow& flow) {
    setReservedSlot(TAINT_SLOT, PrivateValue(new TaintFlow(flow)));
  }

};

}  // namespace js

#endif /* vm_NumberObject_h */
