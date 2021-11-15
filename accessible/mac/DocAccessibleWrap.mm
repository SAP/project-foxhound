/* clang-format off */
/* -*- Mode: Objective-C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* clang-format on */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "DocAccessibleWrap.h"

#import "mozAccessible.h"
#import "MOXTextMarkerDelegate.h"

using namespace mozilla;
using namespace mozilla::a11y;

DocAccessibleWrap::DocAccessibleWrap(dom::Document* aDocument,
                                     PresShell* aPresShell)
    : DocAccessible(aDocument, aPresShell) {}

void DocAccessibleWrap::Shutdown() {
  [MOXTextMarkerDelegate destroyForDoc:this];
  DocAccessible::Shutdown();
}

DocAccessibleWrap::~DocAccessibleWrap() {}
