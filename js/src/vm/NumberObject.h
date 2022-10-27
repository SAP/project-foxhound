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

  // TaintFox: A finalizer is required for correct memory handling.
  static void Finalize(JSFreeOp* fop, JSObject* obj) {
    NumberObject& number = obj->as<NumberObject>();
    delete number.maybePtrFromReservedSlot<TaintFlow>(TAINT_SLOT);
    // TaintNode* head = number.getTaintNode();
    // if (head) {
    //   head->release();
    // }
  }

  TaintFlow taint() const {
    TaintFlow* flow = getTaintFlow();
    if (flow) {
      // head->addref();
      return *flow;
    }
    return TaintFlow();
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
    setTaintFlow(taint);
  }

  bool isTainted() const {
    return !!getTaintFlow();
  }

private:
  static JSObject* createPrototype(JSContext* cx, JSProtoKey key);

  inline void setPrimitiveValue(double d) {
    setFixedSlot(PRIMITIVE_VALUE_SLOT, NumberValue(d));
  }

  inline TaintFlow* getTaintFlow() const {
    TaintFlow* n = maybePtrFromReservedSlot<TaintFlow>(TAINT_SLOT);
    return n;
  }

  inline void setTaintFlow(TaintFlow flow) {
    setReservedSlot(TAINT_SLOT, PrivateValue(new TaintFlow(flow)));
  }
  
};

}  // namespace js

#endif /* vm_NumberObject_h */
