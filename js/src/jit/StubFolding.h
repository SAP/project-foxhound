/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef jit_StubFolding_h
#define jit_StubFolding_h

#include "js/TypeDecls.h"

namespace js::jit {

class CacheIRWriter;
class ICFallbackStub;
class ICScript;

bool TryFoldingStubs(JSContext* cx, ICFallbackStub* fallback, JSScript* script,
                     ICScript* icScript);

bool AddToFoldedStub(JSContext* cx, const CacheIRWriter& writer,
                     ICScript* icScript, ICFallbackStub* fallback);

}  // namespace js::jit

#endif  // jit_StubFolding_h
