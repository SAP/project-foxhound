/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 * vim: set ts=8 sts=4 et sw=4 tw=99:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef vm_NumberObject_h
#define vm_NumberObject_h

#include "Taint.h"

#include "jsnum.h"

namespace js {

// TaintFox: Number objects can be tainted.
class NumberObject : public NativeObject
{
    /* Stores this Number object's [[PrimitiveValue]]. */
    static const unsigned PRIMITIVE_VALUE_SLOT = 0;

  public:
    static const unsigned RESERVED_SLOTS = 1;

    static const Class class_;

    /*
     * Creates a new Number object boxing the given number.
     * If proto is nullptr, then Number.prototype will be used instead.
     */
    static inline NumberObject* create(JSContext* cx, double d,
                                       HandleObject proto = nullptr);

    static inline NumberObject* createTainted(JSContext* cx, double d,
                                              const TaintFlow& taint,
                                              HandleObject proto = nullptr);

    // TaintFox: A finalizer is required for correct memory handling.
    static void Finalize(FreeOp* fop, JSObject* obj) {
        NumberObject& number = obj->as<NumberObject>();
        TaintNode* head = (TaintNode*)number.getPrivate();
        if (head)
            head->release();
    }

    double unbox() const {
        return getFixedSlot(PRIMITIVE_VALUE_SLOT).toNumber();
    }


    TaintFlow taint() const {
        TaintNode* head = (TaintNode*)getPrivate();
        if (head)
            head->addref();
        return TaintFlow(head);
    }

    void setTaint(const TaintFlow& taint) {
        TaintNode* current = (TaintNode*)getPrivate();
        if (current)
            current->release();

        TaintNode* head = taint.head();
        if (head)
            head->addref();

        setPrivate(head);
    }

    bool isTainted() const {
        return !!getPrivate();
    }

  private:
    inline void setPrimitiveValue(double d) {
        setFixedSlot(PRIMITIVE_VALUE_SLOT, NumberValue(d));
    }

    /* For access to init, as Number.prototype is special. */
    friend JSObject*
    js::InitNumberClass(JSContext* cx, HandleObject global);
};

} // namespace js

#endif /* vm_NumberObject_h */
