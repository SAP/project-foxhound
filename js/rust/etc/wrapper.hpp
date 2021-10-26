/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 * vim: set ts=8 sts=4 et sw=4 tw=99:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <stdint.h>
#ifndef _MSC_VER
#include <unistd.h>
#endif

typedef uint32_t HashNumber;

#include "jsapi.h"
#include "jsfriendapi.h"
#include "js/Array.h"
#include "js/ArrayBuffer.h"
#include "js/CallArgs.h"
#include "js/CallNonGenericMethod.h"
#include "js/CompilationAndEvaluation.h"
#include "js/CompileOptions.h"
#include "js/ContextOptions.h"
#include "js/Conversions.h"
#include "js/Date.h"
#include "js/experimental/JitInfo.h"
#include "js/experimental/TypedData.h"
#include "js/ForOfIterator.h"
#include "js/friend/ErrorMessages.h"  // JSErrNum
#include "js/friend/WindowProxy.h"
#include "js/Initialization.h"
#include "js/MemoryMetrics.h"
#include "js/PropertySpec.h"
#include "js/shadow/Object.h"
#include "js/shadow/ObjectGroup.h"
#include "js/shadow/Realm.h"
#include "js/shadow/Zone.h"
#include "js/SourceText.h"
#include "js/String.h"
#include "js/StructuredClone.h"
#include "js/ValueArray.h"
#include "js/Warnings.h"

// Replacements for types that are too difficult for rust-bindgen.

/// <div rustbindgen replaces="JS::detail::RootedPtr" />
template <typename T>
using replaces_RootedPtr = T;

/// <div rustbindgen replaces="JS::MutableHandleIdVector" />
struct MutableHandleIdVector_Simple {
    uintptr_t handle_mut;
};
