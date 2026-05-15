/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_RootedSequence_h_
#define mozilla_dom_RootedSequence_h_

#include "js/RootingAPI.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/BindingUtils.h"

namespace mozilla::dom::binding_detail {

template <typename T>
class MOZ_RAII RootedAutoSequence final : public AutoSequence<T>,
                                          private JS::CustomAutoRooter {
 public:
  template <typename CX>
  explicit RootedAutoSequence(const CX& cx)
      : AutoSequence<T>(), JS::CustomAutoRooter(cx) {}

  virtual void trace(JSTracer* trc) override { DoTraceSequence(trc, *this); }
};

}  // namespace mozilla::dom::binding_detail

#endif /* mozilla_dom_RootedSequence_h_ */
