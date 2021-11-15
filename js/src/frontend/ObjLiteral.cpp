/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sw=2 et tw=0 ft=c:
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "frontend/ObjLiteral.h"

#include "mozilla/DebugOnly.h"

#include "frontend/CompilationInfo.h"  // frontend::CompilationAtomCache
#include "frontend/ParserAtom.h"  // frontend::ParserAtom, frontend::ParserAtomTable
#include "js/RootingAPI.h"
#include "vm/JSAtom.h"
#include "vm/JSObject.h"
#include "vm/JSONPrinter.h"  // js::JSONPrinter
#include "vm/ObjectGroup.h"
#include "vm/Printer.h"  // js::Fprinter

#include "gc/ObjectKind-inl.h"
#include "vm/JSAtom-inl.h"
#include "vm/JSObject-inl.h"

namespace js {

static void InterpretObjLiteralValue(JSContext* cx,
                                     const ObjLiteralAtomVector& atoms,
                                     frontend::CompilationAtomCache& atomCache,
                                     const ObjLiteralInsn& insn,
                                     JS::Value* valOut) {
  switch (insn.getOp()) {
    case ObjLiteralOpcode::ConstValue:
      *valOut = insn.getConstValue();
      return;
    case ObjLiteralOpcode::ConstAtom: {
      uint32_t index = insn.getAtomIndex();
      JSAtom* jsatom = atomCache.getExistingAtomAt(cx, atoms[index]);
      MOZ_ASSERT(jsatom);
      *valOut = StringValue(jsatom);
      return;
    }
    case ObjLiteralOpcode::Null:
      *valOut = NullValue();
      return;
    case ObjLiteralOpcode::Undefined:
      *valOut = UndefinedValue();
      return;
    case ObjLiteralOpcode::True:
      *valOut = BooleanValue(true);
      return;
    case ObjLiteralOpcode::False:
      *valOut = BooleanValue(false);
      return;
    default:
      MOZ_CRASH("Unexpected object-literal instruction opcode");
  }
}

static JSObject* InterpretObjLiteralObj(
    JSContext* cx, frontend::CompilationAtomCache& atomCache,
    const ObjLiteralAtomVector& atoms,
    const mozilla::Span<const uint8_t> literalInsns, ObjLiteralFlags flags) {
  bool specificGroup = flags.contains(ObjLiteralFlag::SpecificGroup);
  bool singleton = flags.contains(ObjLiteralFlag::Singleton);
  bool noValues = flags.contains(ObjLiteralFlag::NoValues);

  ObjLiteralReader reader(literalInsns);
  ObjLiteralInsn insn;

  Rooted<IdValueVector> properties(cx, IdValueVector(cx));

  // Compute property values and build the key/value-pair list.
  while (reader.readInsn(&insn)) {
    MOZ_ASSERT(insn.isValid());

    jsid propId;
    if (insn.getKey().isArrayIndex()) {
      propId = INT_TO_JSID(insn.getKey().getArrayIndex());
    } else {
      JSAtom* jsatom =
          atomCache.getExistingAtomAt(cx, atoms[insn.getKey().getAtomIndex()]);
      MOZ_ASSERT(jsatom);
      propId = AtomToId(jsatom);
    }

    JS::Value propVal;
    if (!noValues) {
      InterpretObjLiteralValue(cx, atoms, atomCache, insn, &propVal);
    }

    if (!properties.emplaceBack(propId, propVal)) {
      return nullptr;
    }
  }

  if (specificGroup) {
    return ObjectGroup::newPlainObject(
        cx, properties.begin(), properties.length(),
        singleton ? SingletonObject : TenuredObject);
  }

  return NewPlainObjectWithProperties(cx, properties.begin(),
                                      properties.length(), TenuredObject);
}

static JSObject* InterpretObjLiteralArray(
    JSContext* cx, frontend::CompilationAtomCache& atomCache,
    const ObjLiteralAtomVector& atoms,
    const mozilla::Span<const uint8_t> literalInsns, ObjLiteralFlags flags) {
  bool isCow = flags.contains(ObjLiteralFlag::ArrayCOW);
  ObjLiteralReader reader(literalInsns);
  ObjLiteralInsn insn;

  Rooted<ValueVector> elements(cx, ValueVector(cx));

  while (reader.readInsn(&insn)) {
    MOZ_ASSERT(insn.isValid());

    JS::Value propVal;
    InterpretObjLiteralValue(cx, atoms, atomCache, insn, &propVal);
    if (!elements.append(propVal)) {
      return nullptr;
    }
  }

  ObjectGroup::NewArrayKind arrayKind =
      isCow ? ObjectGroup::NewArrayKind::CopyOnWrite
            : ObjectGroup::NewArrayKind::Normal;
  RootedObject result(
      cx, ObjectGroup::newArrayObject(cx, elements.begin(), elements.length(),
                                      NewObjectKind::TenuredObject, arrayKind));
  if (!result) {
    return nullptr;
  }

  return result;
}

JSObject* InterpretObjLiteral(JSContext* cx,
                              frontend::CompilationAtomCache& atomCache,
                              const ObjLiteralAtomVector& atoms,
                              const mozilla::Span<const uint8_t> literalInsns,
                              ObjLiteralFlags flags) {
  return flags.contains(ObjLiteralFlag::Array)
             ? InterpretObjLiteralArray(cx, atomCache, atoms, literalInsns,
                                        flags)
             : InterpretObjLiteralObj(cx, atomCache, atoms, literalInsns,
                                      flags);
}

#if defined(DEBUG) || defined(JS_JITSPEW)

static void DumpObjLiteralFlagsItems(js::JSONPrinter& json,
                                     ObjLiteralFlags flags) {
  if (flags.contains(ObjLiteralFlag::Array)) {
    json.value("Array");
    flags -= ObjLiteralFlag::Array;
  }
  if (flags.contains(ObjLiteralFlag::SpecificGroup)) {
    json.value("SpecificGroup");
    flags -= ObjLiteralFlag::SpecificGroup;
  }
  if (flags.contains(ObjLiteralFlag::Singleton)) {
    json.value("Singleton");
    flags -= ObjLiteralFlag::Singleton;
  }
  if (flags.contains(ObjLiteralFlag::ArrayCOW)) {
    json.value("ArrayCOW");
    flags -= ObjLiteralFlag::ArrayCOW;
  }
  if (flags.contains(ObjLiteralFlag::NoValues)) {
    json.value("NoValues");
    flags -= ObjLiteralFlag::NoValues;
  }
  if (flags.contains(ObjLiteralFlag::IsInnerSingleton)) {
    json.value("IsInnerSingleton");
    flags -= ObjLiteralFlag::IsInnerSingleton;
  }

  if (!flags.isEmpty()) {
    json.value("Unknown(%x)", flags.serialize());
  }
}

void ObjLiteralWriter::dump() {
  js::Fprinter out(stderr);
  js::JSONPrinter json(out);
  dump(json);
}

void ObjLiteralWriter::dump(js::JSONPrinter& json) {
  json.beginObject();
  dumpFields(json);
  json.endObject();
}

void ObjLiteralWriter::dumpFields(js::JSONPrinter& json) {
  json.beginListProperty("flags");
  DumpObjLiteralFlagsItems(json, flags_);
  json.endList();

  json.beginListProperty("code");
  ObjLiteralReader reader(getCode());
  ObjLiteralInsn insn;
  while (reader.readInsn(&insn)) {
    json.beginObject();

    if (insn.getKey().isNone()) {
      json.nullProperty("key");
    } else if (insn.getKey().isAtomIndex()) {
      uint32_t index = insn.getKey().getAtomIndex();
      json.formatProperty("key", "ConstAtom(%u)", index);
    } else if (insn.getKey().isArrayIndex()) {
      uint32_t index = insn.getKey().getArrayIndex();
      json.formatProperty("key", "ArrayIndex(%u)", index);
    }

    switch (insn.getOp()) {
      case ObjLiteralOpcode::ConstValue: {
        const Value& v = insn.getConstValue();
        json.formatProperty("op", "ConstValue(%f)", v.toNumber());
        break;
      }
      case ObjLiteralOpcode::ConstAtom: {
        uint32_t index = insn.getAtomIndex();
        json.formatProperty("op", "ConstAtom(%u)", index);
        break;
      }
      case ObjLiteralOpcode::Null:
        json.property("op", "Null");
        break;
      case ObjLiteralOpcode::Undefined:
        json.property("op", "Undefined");
        break;
      case ObjLiteralOpcode::True:
        json.property("op", "True");
        break;
      case ObjLiteralOpcode::False:
        json.property("op", "False");
        break;
      default:
        json.formatProperty("op", "Invalid(%x)", uint8_t(insn.getOp()));
        break;
    }

    json.endObject();
  }
  json.endList();
}

void ObjLiteralStencil::dump() {
  js::Fprinter out(stderr);
  js::JSONPrinter json(out);
  dump(json, nullptr);
}

void ObjLiteralStencil::dump(js::JSONPrinter& json,
                             frontend::CompilationStencil* compilationStencil) {
  json.beginObject();
  dumpFields(json, compilationStencil);
  json.endObject();
}

void ObjLiteralStencil::dumpFields(
    js::JSONPrinter& json, frontend::CompilationStencil* compilationStencil) {
  writer_.dumpFields(json);

  json.beginListProperty("atoms");
  for (auto& atom : atoms_) {
    json.beginObject();
    frontend::DumpTaggedParserAtomIndex(json, atom, compilationStencil);
    json.endObject();
  }
  json.endList();
}

#endif  // defined(DEBUG) || defined(JS_JITSPEW)

}  // namespace js
