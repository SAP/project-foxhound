/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef jit_IonTypes_h
#define jit_IonTypes_h

#include "mozilla/HashFunctions.h"

#include <algorithm>
#include <initializer_list>
#include <stdint.h>

#include "jstypes.h"

#include "js/ScalarType.h"  // js::Scalar::Type
#include "js/Value.h"

namespace js {

// Each IonScript has a unique compilation id. This is used to sweep/ignore
// constraints for IonScripts that have been invalidated/destroyed.
class IonCompilationId {
  // Use two 32-bit integers instead of uint64_t to avoid 8-byte alignment on
  // some 32-bit platforms.
  uint32_t idLo_;
  uint32_t idHi_;

 public:
  explicit IonCompilationId(uint64_t id)
      : idLo_(id & UINT32_MAX), idHi_(id >> 32) {}
  bool operator==(const IonCompilationId& other) const {
    return idLo_ == other.idLo_ && idHi_ == other.idHi_;
  }
  bool operator!=(const IonCompilationId& other) const {
    return !operator==(other);
  }
};

namespace jit {

using RecoverOffset = uint32_t;
using SnapshotOffset = uint32_t;
using BailoutId = uint32_t;

// The maximum size of any buffer associated with an assembler or code object.
// This is chosen to not overflow a signed integer, leaving room for an extra
// bit on offsets.
static const uint32_t MAX_BUFFER_SIZE = (1 << 30) - 1;

// Maximum number of scripted arg slots.
static const uint32_t SNAPSHOT_MAX_NARGS = 127;

static const SnapshotOffset INVALID_RECOVER_OFFSET = uint32_t(-1);
static const SnapshotOffset INVALID_SNAPSHOT_OFFSET = uint32_t(-1);

// Different kinds of bailouts.
enum class BailoutKind : uint8_t {
  // Normal bailouts, that don't need to be handled specially when restarting
  // in baseline.

  // An inevitable bailout (MBail instruction or type barrier that always bails)
  Inevitable,

  // Bailing out during a VM call. Many possible causes that are hard
  // to distinguish statically at snapshot construction time.
  // We just lump them together.
  DuringVMCall,

  // Too many arguments for apply calls.
  TooManyArguments,

  // Dynamic scope chain lookup produced |undefined|
  DynamicNameNotFound,

  // Bailout on overflow, but don't immediately invalidate.
  // Used for abs, sub and LoadUnboxedScalar (when loading a uint32 that
  // doesn't fit in an int32).
  Overflow,

  // floor, ceiling and round bail if input is NaN, if output would be -0 or
  // doesn't fit in int32 range
  Round,

  // Non-primitive value used as input for ToDouble, ToInt32, ToString, etc.
  // For ToInt32, can also mean that input can't be converted without precision
  // loss (e.g. 5.5).
  NonPrimitiveInput,

  // For ToInt32, would lose precision when converting (e.g. 5.5).
  PrecisionLoss,

  // We tripped a type barrier (object was not in the expected TypeSet)
  TypeBarrierO,
  // We tripped a type barrier (value was not in the expected TypeSet)
  TypeBarrierV,

  // We hit a hole in an array.
  Hole,

  // The object has dense array elements
  NoDenseElementsGuard,

  // Array access with negative index
  NegativeIndex,

  // Pretty specific case:
  //  - need a type barrier on a property write
  //  - all but one of the observed types have property types that reflect
  //    the value
  //  - we need to guard that we're not given an object of that one other type
  //    also used for the unused GuardClass instruction
  ObjectIdentityOrTypeGuard,

  // JSString was not equal to the expected JSAtom
  SpecificAtomGuard,

  // Symbol was not equal the expected JS::Symbol.
  SpecificSymbolGuard,

  // Bailout triggered by MGuardStringToIndex.
  StringToIndexGuard,

  // Bailout triggered by MGuardStringToInt32.
  StringToInt32Guard,

  // Bailout triggered by MGuardStringToDouble.
  StringToDoubleGuard,

  // Unbox expects a given type, bails out if it doesn't get it.
  NonInt32Input,
  NonNumericInput,  // unboxing a double works with int32 too
  NonBooleanInput,
  NonObjectInput,
  NonStringInput,
  NonSymbolInput,
  NonBigIntInput,

  // We hit a |debugger;| statement.
  Debugger,

  // We hit this code for the first time.
  FirstExecution,

  // Array length did not fit in int32.
  NonInt32ArrayLength,

  // Function length not available ("length" property was redefined or function
  // has a lazy script) or did not fit in int32.
  FunctionLength,

  // Function name not available ("name" property was redefined)
  FunctionName,

  // Bailout triggered by MFromCodePoint
  InvalidCodePoint,

  // END Normal bailouts

  // Bailouts caused by invalid assumptions based on Baseline code.
  // Causes immediate invalidation.

  // Like BailoutKind::Overflow, but causes immediate invalidation.
  OverflowInvalidate,

  // Used for integer division, multiplication and modulo.
  // If there's a remainder, bails to return a double.
  // Can also signal overflow or result of -0.
  // Can also signal division by 0 (returns inf, a double).
  DoubleOutput,

  // END Invalid assumptions bailouts

  // A bailout at the very start of a function indicates that there may be
  // a type mismatch in the arguments that necessitates a reflow.
  ArgumentCheck,

  // A bailout triggered by a bounds-check failure.
  BoundsCheck,

  // A shape guard based on TI information failed.
  // (We saw an object whose shape does not match that / any of those observed
  // by the baseline IC.)
  ShapeGuard,

  // Bailout triggered by MGuardProto or MGuardNullProto.
  ProtoGuard,

  // Bailout triggered by MGuardIsProxy.
  ProxyGuard,

  // Bailout triggered by MGuardIsNotProxy.
  NotProxyGuard,

  // Bailout triggered by MGuardIsNotDOMProxy.
  NotDOMProxyGuard,

  // Bailout triggered by MGuardIsNotArrayBufferMaybeShared.
  NotArrayBufferMaybeSharedGuard,

  // Bailout triggered by MGuardIsTypedArray.
  TypedArrayGuard,

  // Bailout triggered by a megamorphic load or store.
  MegamorphicAccess,

  // Bailout triggered by MLoadArgumentsObjectArg and MArgumentsObjectLength.
  ArgumentsObjectAccess,

  // Bailout triggered by MArrayPopShift.
  ArrayPopShift,

  // Bailout triggered by MArraySlice.
  ArraySlice,

  // Bailout triggered by MGuardValue.
  ValueGuard,

  // Bailout triggered by MGuardNotOptimizedArguments.
  NotOptimizedArgumentsGuard,

  // Bailout triggered by MGuardNullOrUndefined.
  NullOrUndefinedGuard,

  // Bailout triggered by MGuardTagNotEqual.
  TagNotEqualGuard,

  // Bailout triggered by MGuardFunctionFlags.
  FunctionFlagsGuard,

  // Bailout triggered by MGuardFunctionIsNonBuiltinCtor.
  FunctionIsNonBuiltinCtorGuard,

  // Bailout triggered by MGuardFunctionKind.
  FunctionKindGuard,

  // Bailout triggered by MGuardFunctionScript.
  FunctionScriptGuard,

  // Bailout triggered by MGuardArrayIsPacked
  PackedArrayGuard,

  // Bailout triggered by MGuardHasGetterSetter
  HasGetterSetterGuard,

  // Bailout triggered by MLoadDOMExpandoValueGuardGeneration
  DOMExpandoValueGenerationGuard,

  // Bailout triggered by MGuardDOMExpandoMissingOrGuardShape
  DOMExpandoMissingOrShapeGuard,

  // When we're trying to use an uninitialized lexical.
  UninitializedLexical,

  // A bailout to baseline from Ion on exception to handle Debugger hooks.
  IonExceptionDebugMode,

  Limit
};

inline const char* BailoutKindString(BailoutKind kind) {
  switch (kind) {
    // Normal bailouts.
    case BailoutKind::Inevitable:
      return "Inevitable";
    case BailoutKind::DuringVMCall:
      return "DuringVMCall";
    case BailoutKind::TooManyArguments:
      return "TooManyArguments";
    case BailoutKind::DynamicNameNotFound:
      return "DynamicNameNotFound";
    case BailoutKind::Overflow:
      return "Overflow";
    case BailoutKind::Round:
      return "Round";
    case BailoutKind::NonPrimitiveInput:
      return "NonPrimitiveInput";
    case BailoutKind::PrecisionLoss:
      return "PrecisionLoss";
    case BailoutKind::TypeBarrierO:
      return "TypeBarrierO";
    case BailoutKind::TypeBarrierV:
      return "TypeBarrierV";
    case BailoutKind::Hole:
      return "Hole";
    case BailoutKind::NoDenseElementsGuard:
      return "NoDenseElementsGuard";
    case BailoutKind::NegativeIndex:
      return "NegativeIndex";
    case BailoutKind::ObjectIdentityOrTypeGuard:
      return "ObjectIdentityOrTypeGuard";
    case BailoutKind::SpecificAtomGuard:
      return "SpecifcAtomGuard";
    case BailoutKind::SpecificSymbolGuard:
      return "SpecificSymbolGuard";
    case BailoutKind::StringToIndexGuard:
      return "StringToIndexGuard";
    case BailoutKind::StringToInt32Guard:
      return "StringToInt32Guard";
    case BailoutKind::StringToDoubleGuard:
      return "StringToDoubleGuard";
    case BailoutKind::NonInt32Input:
      return "NonInt32Input";
    case BailoutKind::NonNumericInput:
      return "NonNumericInput";
    case BailoutKind::NonBooleanInput:
      return "NonBooleanInput";
    case BailoutKind::NonObjectInput:
      return "NonObjectInput";
    case BailoutKind::NonStringInput:
      return "NonStringInput";
    case BailoutKind::NonSymbolInput:
      return "NonSymbolInput";
    case BailoutKind::NonBigIntInput:
      return "NonBigIntInput";
    case BailoutKind::Debugger:
      return "Debugger";
    case BailoutKind::FirstExecution:
      return "FirstExecution";
    case BailoutKind::NonInt32ArrayLength:
      return "NonInt32ArrayLength";
    case BailoutKind::FunctionLength:
      return "FunctionLength";
    case BailoutKind::FunctionName:
      return "FunctionName";
    case BailoutKind::InvalidCodePoint:
      return "InvalidCodePoint";

    // Bailouts caused by invalid assumptions.
    case BailoutKind::OverflowInvalidate:
      return "OverflowInvalidate";
    case BailoutKind::DoubleOutput:
      return "DoubleOutput";

    // Other bailouts.
    case BailoutKind::ArgumentCheck:
      return "ArgumentCheck";
    case BailoutKind::BoundsCheck:
      return "BoundsCheck";
    case BailoutKind::ShapeGuard:
      return "ShapeGuard";
    case BailoutKind::ProtoGuard:
      return "ProtoGuard";
    case BailoutKind::ProxyGuard:
      return "ProxyGuard";
    case BailoutKind::NotProxyGuard:
      return "NotProxyGuard";
    case BailoutKind::NotDOMProxyGuard:
      return "NotDOMProxyGuard";
    case BailoutKind::NotArrayBufferMaybeSharedGuard:
      return "NotArrayBufferMaybeSharedGuard";
    case BailoutKind::TypedArrayGuard:
      return "TypedArrayGuard";
    case BailoutKind::MegamorphicAccess:
      return "MegamorphicAccess";
    case BailoutKind::ArgumentsObjectAccess:
      return "ArgumentsObjectAccess";
    case BailoutKind::ArrayPopShift:
      return "ArrayPopShift";
    case BailoutKind::ArraySlice:
      return "ArraySlice";
    case BailoutKind::ValueGuard:
      return "ValueGuard";
    case BailoutKind::NotOptimizedArgumentsGuard:
      return "NotOptimizedArgumentsGuard";
    case BailoutKind::NullOrUndefinedGuard:
      return "NullOrUndefinedGuard";
    case BailoutKind::TagNotEqualGuard:
      return "TagNotEqualGuard";
    case BailoutKind::FunctionFlagsGuard:
      return "FunctionFlagsGuard";
    case BailoutKind::FunctionIsNonBuiltinCtorGuard:
      return "FunctionIsNonBuiltinCtorGuard";
    case BailoutKind::FunctionKindGuard:
      return "FunctionKindGuard";
    case BailoutKind::FunctionScriptGuard:
      return "FunctionScriptGuard";
    case BailoutKind::PackedArrayGuard:
      return "PackedArrayGuard";
    case BailoutKind::HasGetterSetterGuard:
      return "HasGetterSetterGuard";
    case BailoutKind::DOMExpandoValueGenerationGuard:
      return "DOMExpandoValueGenerationGuard";
    case BailoutKind::DOMExpandoMissingOrShapeGuard:
      return "DOMExpandoMissingOrShapeGuard";
    case BailoutKind::UninitializedLexical:
      return "UninitializedLexical";
    case BailoutKind::IonExceptionDebugMode:
      return "IonExceptionDebugMode";

    case BailoutKind::Limit:
      break;
  }

  MOZ_CRASH("Invalid BailoutKind");
}

static const uint32_t ELEMENT_TYPE_BITS = 5;
static const uint32_t ELEMENT_TYPE_SHIFT = 0;
static const uint32_t ELEMENT_TYPE_MASK = (1 << ELEMENT_TYPE_BITS) - 1;
static const uint32_t VECTOR_TYPE_BITS = 1;
static const uint32_t VECTOR_TYPE_SHIFT =
    ELEMENT_TYPE_BITS + ELEMENT_TYPE_SHIFT;
static const uint32_t VECTOR_TYPE_MASK = (1 << VECTOR_TYPE_BITS) - 1;

// The integer SIMD types have a lot of operations that do the exact same thing
// for signed and unsigned integer types. Sometimes it is simpler to treat
// signed and unsigned integer SIMD types as the same type, using a SimdSign to
// distinguish the few cases where there is a difference.
enum class SimdSign {
  // Signedness is not applicable to this type. (i.e., Float or Bool).
  NotApplicable,
  // Treat as an unsigned integer with a range 0 .. 2^N-1.
  Unsigned,
  // Treat as a signed integer in two's complement encoding.
  Signed,
};

class SimdConstant {
 public:
  enum Type {
    Int8x16,
    Int16x8,
    Int32x4,
    Int64x2,
    Float32x4,
    Float64x2,
    Undefined = -1
  };

  typedef int8_t I8x16[16];
  typedef int16_t I16x8[8];
  typedef int32_t I32x4[4];
  typedef int64_t I64x2[2];
  typedef float F32x4[4];
  typedef double F64x2[2];

 private:
  Type type_;
  union {
    I8x16 i8x16;
    I16x8 i16x8;
    I32x4 i32x4;
    I64x2 i64x2;
    F32x4 f32x4;
    F64x2 f64x2;
  } u;

  bool defined() const { return type_ != Undefined; }

 public:
  // Doesn't have a default constructor, as it would prevent it from being
  // included in unions.

  static SimdConstant CreateX16(const int8_t* array) {
    SimdConstant cst;
    cst.type_ = Int8x16;
    memcpy(cst.u.i8x16, array, sizeof(cst.u));
    return cst;
  }
  static SimdConstant SplatX16(int8_t v) {
    SimdConstant cst;
    cst.type_ = Int8x16;
    std::fill_n(cst.u.i8x16, 16, v);
    return cst;
  }
  static SimdConstant CreateX8(const int16_t* array) {
    SimdConstant cst;
    cst.type_ = Int16x8;
    memcpy(cst.u.i16x8, array, sizeof(cst.u));
    return cst;
  }
  static SimdConstant SplatX8(int16_t v) {
    SimdConstant cst;
    cst.type_ = Int16x8;
    std::fill_n(cst.u.i16x8, 8, v);
    return cst;
  }
  static SimdConstant CreateX4(const int32_t* array) {
    SimdConstant cst;
    cst.type_ = Int32x4;
    memcpy(cst.u.i32x4, array, sizeof(cst.u));
    return cst;
  }
  static SimdConstant SplatX4(int32_t v) {
    SimdConstant cst;
    cst.type_ = Int32x4;
    std::fill_n(cst.u.i32x4, 4, v);
    return cst;
  }
  static SimdConstant CreateX2(const int64_t* array) {
    SimdConstant cst;
    cst.type_ = Int64x2;
    memcpy(cst.u.i64x2, array, sizeof(cst.u));
    return cst;
  }
  static SimdConstant SplatX2(int64_t v) {
    SimdConstant cst;
    cst.type_ = Int64x2;
    std::fill_n(cst.u.i64x2, 2, v);
    return cst;
  }
  static SimdConstant CreateX4(const float* array) {
    SimdConstant cst;
    cst.type_ = Float32x4;
    memcpy(cst.u.f32x4, array, sizeof(cst.u));
    return cst;
  }
  static SimdConstant SplatX4(float v) {
    SimdConstant cst;
    cst.type_ = Float32x4;
    std::fill_n(cst.u.f32x4, 4, v);
    return cst;
  }
  static SimdConstant CreateX2(const double* array) {
    SimdConstant cst;
    cst.type_ = Float64x2;
    memcpy(cst.u.f64x2, array, sizeof(cst.u));
    return cst;
  }
  static SimdConstant SplatX2(double v) {
    SimdConstant cst;
    cst.type_ = Float64x2;
    std::fill_n(cst.u.f64x2, 2, v);
    return cst;
  }

  // Overloads for use by templates.
  static SimdConstant CreateSimd128(const int8_t* array) {
    return CreateX16(array);
  }
  static SimdConstant CreateSimd128(const int16_t* array) {
    return CreateX8(array);
  }
  static SimdConstant CreateSimd128(const int32_t* array) {
    return CreateX4(array);
  }
  static SimdConstant CreateSimd128(const int64_t* array) {
    return CreateX2(array);
  }
  static SimdConstant CreateSimd128(const float* array) {
    return CreateX4(array);
  }
  static SimdConstant CreateSimd128(const double* array) {
    return CreateX2(array);
  }

  Type type() const {
    MOZ_ASSERT(defined());
    return type_;
  }

  bool isFloatingType() const {
    MOZ_ASSERT(defined());
    return type_ >= Float32x4;
  }

  bool isIntegerType() const {
    MOZ_ASSERT(defined());
    return type_ <= Int64x2;
  }

  // Get the raw bytes of the constant.
  const void* bytes() const { return u.i8x16; }

  const I8x16& asInt8x16() const {
    MOZ_ASSERT(defined() && type_ == Int8x16);
    return u.i8x16;
  }

  const I16x8& asInt16x8() const {
    MOZ_ASSERT(defined() && type_ == Int16x8);
    return u.i16x8;
  }

  const I32x4& asInt32x4() const {
    MOZ_ASSERT(defined() && type_ == Int32x4);
    return u.i32x4;
  }

  const I64x2& asInt64x2() const {
    MOZ_ASSERT(defined() && type_ == Int64x2);
    return u.i64x2;
  }

  const F32x4& asFloat32x4() const {
    MOZ_ASSERT(defined() && type_ == Float32x4);
    return u.f32x4;
  }

  const F64x2& asFloat64x2() const {
    MOZ_ASSERT(defined() && type_ == Float64x2);
    return u.f64x2;
  }

  bool bitwiseEqual(const SimdConstant& rhs) const {
    MOZ_ASSERT(defined() && rhs.defined());
    return memcmp(&u, &rhs.u, sizeof(u)) == 0;
  }

  bool isZeroBits() const {
    MOZ_ASSERT(defined());
    return u.i64x2[0] == 0 && u.i64x2[1] == 0;
  }

  bool isOneBits() const {
    MOZ_ASSERT(defined());
    return ~u.i64x2[0] == 0 && ~u.i64x2[1] == 0;
  }

  // SimdConstant is a HashPolicy.  Currently we discriminate by type, but it
  // may be that we should only be discriminating by int vs float.
  using Lookup = SimdConstant;

  static HashNumber hash(const SimdConstant& val) {
    uint32_t hash = mozilla::HashBytes(&val.u, sizeof(val.u));
    return mozilla::AddToHash(hash, val.type_);
  }

  static bool match(const SimdConstant& lhs, const SimdConstant& rhs) {
    return lhs.type() == rhs.type() && lhs.bitwiseEqual(rhs);
  }
};

enum class IntConversionBehavior {
  // These two try to convert the input to an int32 using ToNumber and
  // will fail if the resulting int32 isn't strictly equal to the input.
  Normal,             // Succeeds on -0: converts to 0.
  NegativeZeroCheck,  // Fails on -0.
  // These three will convert the input to an int32 with loss of precision.
  Truncate,
  TruncateNoWrap,
  ClampToUint8,
};

enum class IntConversionInputKind { NumbersOnly, NumbersOrBoolsOnly, Any };

// The ordering of this enumeration is important: Anything < Value is a
// specialized type. Furthermore, anything < String has trivial conversion to
// a number.
enum class MIRType : uint8_t {
  Undefined,
  Null,
  Boolean,
  Int32,
  Int64,
  Double,
  Float32,
  // Types above have trivial conversion to a number.
  String,
  Symbol,
  BigInt,
  Simd128,
  // Types above are primitive (including undefined and null).
  Object,
  MagicOptimizedArguments,    // JS_OPTIMIZED_ARGUMENTS magic value.
  MagicOptimizedOut,          // JS_OPTIMIZED_OUT magic value.
  MagicHole,                  // JS_ELEMENTS_HOLE magic value.
  MagicIsConstructing,        // JS_IS_CONSTRUCTING magic value.
  MagicUninitializedLexical,  // JS_UNINITIALIZED_LEXICAL magic value.
  // Types above are specialized.
  Value,
  ObjectOrNull,
  None,          // Invalid, used as a placeholder.
  Slots,         // A slots vector
  Elements,      // An elements vector
  Pointer,       // An opaque pointer that receives no special treatment
  RefOrNull,     // Wasm Ref/AnyRef/NullRef: a raw JSObject* or a raw (void*)0
  StackResults,  // Wasm multi-value stack result area, which may contain refs
  Shape,         // A Shape pointer.
  ObjectGroup,   // An ObjectGroup pointer.
  Last = ObjectGroup
};

static inline MIRType MIRTypeFromValueType(JSValueType type) {
  // This function does not deal with magic types. Magic constants should be
  // filtered out in MIRTypeFromValue.
  switch (type) {
    case JSVAL_TYPE_DOUBLE:
      return MIRType::Double;
    case JSVAL_TYPE_INT32:
      return MIRType::Int32;
    case JSVAL_TYPE_UNDEFINED:
      return MIRType::Undefined;
    case JSVAL_TYPE_STRING:
      return MIRType::String;
    case JSVAL_TYPE_SYMBOL:
      return MIRType::Symbol;
    case JSVAL_TYPE_BIGINT:
      return MIRType::BigInt;
    case JSVAL_TYPE_BOOLEAN:
      return MIRType::Boolean;
    case JSVAL_TYPE_NULL:
      return MIRType::Null;
    case JSVAL_TYPE_OBJECT:
      return MIRType::Object;
    case JSVAL_TYPE_UNKNOWN:
      return MIRType::Value;
    default:
      MOZ_CRASH("unexpected jsval type");
  }
}

static inline JSValueType ValueTypeFromMIRType(MIRType type) {
  switch (type) {
    case MIRType::Undefined:
      return JSVAL_TYPE_UNDEFINED;
    case MIRType::Null:
      return JSVAL_TYPE_NULL;
    case MIRType::Boolean:
      return JSVAL_TYPE_BOOLEAN;
    case MIRType::Int32:
      return JSVAL_TYPE_INT32;
    case MIRType::Float32:  // Fall through, there's no JSVAL for Float32
    case MIRType::Double:
      return JSVAL_TYPE_DOUBLE;
    case MIRType::String:
      return JSVAL_TYPE_STRING;
    case MIRType::Symbol:
      return JSVAL_TYPE_SYMBOL;
    case MIRType::BigInt:
      return JSVAL_TYPE_BIGINT;
    case MIRType::MagicOptimizedArguments:
    case MIRType::MagicOptimizedOut:
    case MIRType::MagicHole:
    case MIRType::MagicIsConstructing:
    case MIRType::MagicUninitializedLexical:
      return JSVAL_TYPE_MAGIC;
    default:
      MOZ_ASSERT(type == MIRType::Object);
      return JSVAL_TYPE_OBJECT;
  }
}

static inline JSValueTag MIRTypeToTag(MIRType type) {
  return JSVAL_TYPE_TO_TAG(ValueTypeFromMIRType(type));
}

static inline size_t MIRTypeToSize(MIRType type) {
  switch (type) {
    case MIRType::Int32:
      return 4;
    case MIRType::Int64:
      return 8;
    case MIRType::Float32:
      return 4;
    case MIRType::Double:
      return 8;
    case MIRType::Simd128:
      return 16;
    case MIRType::Pointer:
    case MIRType::RefOrNull:
      return sizeof(uintptr_t);
    default:
      MOZ_CRASH("MIRTypeToSize - unhandled case");
  }
}

static inline const char* StringFromMIRType(MIRType type) {
  switch (type) {
    case MIRType::Undefined:
      return "Undefined";
    case MIRType::Null:
      return "Null";
    case MIRType::Boolean:
      return "Bool";
    case MIRType::Int32:
      return "Int32";
    case MIRType::Int64:
      return "Int64";
    case MIRType::Double:
      return "Double";
    case MIRType::Float32:
      return "Float32";
    case MIRType::String:
      return "String";
    case MIRType::Symbol:
      return "Symbol";
    case MIRType::BigInt:
      return "BigInt";
    case MIRType::Object:
      return "Object";
    case MIRType::MagicOptimizedArguments:
      return "MagicOptimizedArguments";
    case MIRType::MagicOptimizedOut:
      return "MagicOptimizedOut";
    case MIRType::MagicHole:
      return "MagicHole";
    case MIRType::MagicIsConstructing:
      return "MagicIsConstructing";
    case MIRType::MagicUninitializedLexical:
      return "MagicUninitializedLexical";
    case MIRType::Value:
      return "Value";
    case MIRType::ObjectOrNull:
      return "ObjectOrNull";
    case MIRType::None:
      return "None";
    case MIRType::Slots:
      return "Slots";
    case MIRType::Elements:
      return "Elements";
    case MIRType::Pointer:
      return "Pointer";
    case MIRType::RefOrNull:
      return "RefOrNull";
    case MIRType::StackResults:
      return "StackResults";
    case MIRType::Shape:
      return "Shape";
    case MIRType::ObjectGroup:
      return "ObjectGroup";
    case MIRType::Simd128:
      return "Simd128";
  }
  MOZ_CRASH("Unknown MIRType.");
}

static inline bool IsIntType(MIRType type) {
  return type == MIRType::Int32 || type == MIRType::Int64;
}

static inline bool IsNumberType(MIRType type) {
  return type == MIRType::Int32 || type == MIRType::Double ||
         type == MIRType::Float32 || type == MIRType::Int64;
}

static inline bool IsNumericType(MIRType type) {
  return IsNumberType(type) || type == MIRType::BigInt;
}

static inline bool IsTypeRepresentableAsDouble(MIRType type) {
  return type == MIRType::Int32 || type == MIRType::Double ||
         type == MIRType::Float32;
}

static inline bool IsFloatType(MIRType type) {
  return type == MIRType::Int32 || type == MIRType::Float32;
}

static inline bool IsFloatingPointType(MIRType type) {
  return type == MIRType::Double || type == MIRType::Float32;
}

static inline bool IsNullOrUndefined(MIRType type) {
  return type == MIRType::Null || type == MIRType::Undefined;
}

static inline bool IsMagicType(MIRType type) {
  return type == MIRType::MagicHole || type == MIRType::MagicOptimizedOut ||
         type == MIRType::MagicIsConstructing ||
         type == MIRType::MagicOptimizedArguments ||
         type == MIRType::MagicUninitializedLexical;
}

static inline MIRType ScalarTypeToMIRType(Scalar::Type type) {
  switch (type) {
    case Scalar::Int8:
    case Scalar::Uint8:
    case Scalar::Int16:
    case Scalar::Uint16:
    case Scalar::Int32:
    case Scalar::Uint32:
    case Scalar::Uint8Clamped:
      return MIRType::Int32;
    case Scalar::Int64:
      return MIRType::Int64;
    case Scalar::Float32:
      return MIRType::Float32;
    case Scalar::Float64:
      return MIRType::Double;
    case Scalar::BigInt64:
    case Scalar::BigUint64:
      MOZ_CRASH("NYI");
    case Scalar::Simd128:
      return MIRType::Simd128;
    case Scalar::MaxTypedArrayViewType:
      break;
  }
  MOZ_CRASH("unexpected kind");
}

static constexpr bool NeedsPostBarrier(MIRType type) {
  MOZ_ASSERT(type != MIRType::Value);
  MOZ_ASSERT(type != MIRType::ObjectOrNull);
  return type == MIRType::Object || type == MIRType::String ||
         type == MIRType::BigInt;
}

#ifdef DEBUG

// Track the pipeline of opcodes which has produced a snapshot.
#  define TRACK_SNAPSHOTS 1

// Make sure registers are not modified between an instruction and
// its OsiPoint.
#  define CHECK_OSIPOINT_REGISTERS 1

#endif  // DEBUG

enum ABIArgType {
  // A pointer sized integer
  ArgType_General = 0x1,
  // A 32-bit integer
  ArgType_Int32 = 0x2,
  // A 64-bit integer
  ArgType_Int64 = 0x3,
  // A 32-bit floating point number
  ArgType_Float32 = 0x4,
  // A 64-bit floating point number
  ArgType_Float64 = 0x5,

  RetType_Shift = 0x0,
  ArgType_Shift = 0x3,
  ArgType_Mask = 0x7
};

namespace detail {

static constexpr int MakeABIFunctionType(
    ABIArgType ret, std::initializer_list<ABIArgType> args) {
  int abiType = ret << RetType_Shift;
  int i = 1;
  for (auto arg : args) {
    abiType |= (arg << (ArgType_Shift * i));
    i++;
  }
  return abiType;
}

}  // namespace detail

enum ABIFunctionType : uint32_t {
  // The enum must be explicitly typed to avoid UB: some validly constructed
  // members are larger than any explicitly declared members.

  // VM functions that take 0-9 non-double arguments
  // and return a non-double value.
  Args_General0 = ArgType_General << RetType_Shift,
  Args_General1 = Args_General0 | (ArgType_General << (ArgType_Shift * 1)),
  Args_General2 = Args_General1 | (ArgType_General << (ArgType_Shift * 2)),
  Args_General3 = Args_General2 | (ArgType_General << (ArgType_Shift * 3)),
  Args_General4 = Args_General3 | (ArgType_General << (ArgType_Shift * 4)),
  Args_General5 = Args_General4 | (ArgType_General << (ArgType_Shift * 5)),
  Args_General6 = Args_General5 | (ArgType_General << (ArgType_Shift * 6)),
  Args_General7 = Args_General6 | (ArgType_General << (ArgType_Shift * 7)),
  Args_General8 = Args_General7 | (ArgType_General << (ArgType_Shift * 8)),

  // int64 f(double)
  Args_Int64_Double =
      (ArgType_Int64 << RetType_Shift) | (ArgType_Float64 << ArgType_Shift),

  // double f()
  Args_Double_None = ArgType_Float64 << RetType_Shift,

  // int f(double)
  Args_Int_Double = Args_General0 | (ArgType_Float64 << ArgType_Shift),

  // int f(float32)
  Args_Int_Float32 = Args_General0 | (ArgType_Float32 << ArgType_Shift),

  // float f(float)
  Args_Float32_Float32 =
      (ArgType_Float32 << RetType_Shift) | (ArgType_Float32 << ArgType_Shift),

  // float f(int, int)
  Args_Float32_IntInt = (ArgType_Float32 << RetType_Shift) |
                        (ArgType_General << (ArgType_Shift * 1)) |
                        (ArgType_General << (ArgType_Shift * 2)),

  // double f(double)
  Args_Double_Double = Args_Double_None | (ArgType_Float64 << ArgType_Shift),

  // double f(int)
  Args_Double_Int = Args_Double_None | (ArgType_General << ArgType_Shift),

  // double f(int, int)
  Args_Double_IntInt =
      Args_Double_Int | (ArgType_General << (ArgType_Shift * 2)),

  // double f(double, int)
  Args_Double_DoubleInt = Args_Double_None |
                          (ArgType_General << (ArgType_Shift * 1)) |
                          (ArgType_Float64 << (ArgType_Shift * 2)),

  // double f(double, double)
  Args_Double_DoubleDouble =
      Args_Double_Double | (ArgType_Float64 << (ArgType_Shift * 2)),

  // float f(float, float)
  Args_Float32_Float32Float32 =
      Args_Float32_Float32 | (ArgType_Float32 << (ArgType_Shift * 2)),

  // double f(int, double)
  Args_Double_IntDouble = Args_Double_None |
                          (ArgType_Float64 << (ArgType_Shift * 1)) |
                          (ArgType_General << (ArgType_Shift * 2)),

  // int f(int, double)
  Args_Int_IntDouble = Args_General0 |
                       (ArgType_Float64 << (ArgType_Shift * 1)) |
                       (ArgType_General << (ArgType_Shift * 2)),

  // int f(double, int)
  Args_Int_DoubleInt = Args_General0 |
                       (ArgType_General << (ArgType_Shift * 1)) |
                       (ArgType_Float64 << (ArgType_Shift * 2)),

  // double f(double, double, double)
  Args_Double_DoubleDoubleDouble =
      Args_Double_DoubleDouble | (ArgType_Float64 << (ArgType_Shift * 3)),

  // double f(double, double, double, double)
  Args_Double_DoubleDoubleDoubleDouble =
      Args_Double_DoubleDoubleDouble | (ArgType_Float64 << (ArgType_Shift * 4)),

  // int f(double, int, int)
  Args_Int_DoubleIntInt = Args_General0 |
                          (ArgType_General << (ArgType_Shift * 1)) |
                          (ArgType_General << (ArgType_Shift * 2)) |
                          (ArgType_Float64 << (ArgType_Shift * 3)),

  // int f(int, double, int, int)
  Args_Int_IntDoubleIntInt = Args_General0 |
                             (ArgType_General << (ArgType_Shift * 1)) |
                             (ArgType_General << (ArgType_Shift * 2)) |
                             (ArgType_Float64 << (ArgType_Shift * 3)) |
                             (ArgType_General << (ArgType_Shift * 4)),

  Args_Int_GeneralGeneralGeneralInt64 =
      Args_General0 | (ArgType_General << (ArgType_Shift * 1)) |
      (ArgType_General << (ArgType_Shift * 2)) |
      (ArgType_General << (ArgType_Shift * 3)) |
      (ArgType_Int64 << (ArgType_Shift * 4)),

  Args_Int_GeneralGeneralInt64Int64 = Args_General0 |
                                      (ArgType_General << (ArgType_Shift * 1)) |
                                      (ArgType_General << (ArgType_Shift * 2)) |
                                      (ArgType_Int64 << (ArgType_Shift * 3)) |
                                      (ArgType_Int64 << (ArgType_Shift * 4)),

  Args_Int32_General =
      detail::MakeABIFunctionType(ArgType_Int32, {ArgType_General}),
  Args_Int32_GeneralInt32 = detail::MakeABIFunctionType(
      ArgType_Int32, {ArgType_General, ArgType_Int32}),
  Args_Int32_GeneralInt32Int32 = detail::MakeABIFunctionType(
      ArgType_Int32, {ArgType_General, ArgType_Int32, ArgType_Int32}),
  Args_Int32_GeneralInt32Int32Int32Int32 = detail::MakeABIFunctionType(
      ArgType_Int32, {ArgType_General, ArgType_Int32, ArgType_Int32,
                      ArgType_Int32, ArgType_Int32}),
  Args_Int32_GeneralInt32Int32Int32Int32Int32 = detail::MakeABIFunctionType(
      ArgType_Int32, {ArgType_General, ArgType_Int32, ArgType_Int32,
                      ArgType_Int32, ArgType_Int32, ArgType_Int32}),
  Args_Int32_GeneralInt32Int32Int32General = detail::MakeABIFunctionType(
      ArgType_Int32, {ArgType_General, ArgType_Int32, ArgType_Int32,
                      ArgType_Int32, ArgType_General}),
  Args_Int32_GeneralInt32Int32Int64 = detail::MakeABIFunctionType(
      ArgType_Int32,
      {ArgType_General, ArgType_Int32, ArgType_Int32, ArgType_Int64}),
  Args_Int32_GeneralInt32Int32General = detail::MakeABIFunctionType(
      ArgType_Int32,
      {ArgType_General, ArgType_Int32, ArgType_Int32, ArgType_General}),
  Args_Int32_GeneralInt32Int64Int64 = detail::MakeABIFunctionType(
      ArgType_Int32,
      {ArgType_General, ArgType_Int32, ArgType_Int64, ArgType_Int64}),
  Args_Int32_GeneralInt32GeneralInt32 = detail::MakeABIFunctionType(
      ArgType_Int32,
      {ArgType_General, ArgType_Int32, ArgType_General, ArgType_Int32}),
  Args_Int32_GeneralInt32GeneralInt32Int32 = detail::MakeABIFunctionType(
      ArgType_Int32, {ArgType_General, ArgType_Int32, ArgType_General,
                      ArgType_Int32, ArgType_Int32}),
  Args_Int32_GeneralGeneral = detail::MakeABIFunctionType(
      ArgType_Int32, {ArgType_General, ArgType_General}),
  Args_Int32_GeneralGeneralInt32Int32 = detail::MakeABIFunctionType(
      ArgType_Int32,
      {ArgType_General, ArgType_General, ArgType_Int32, ArgType_Int32}),
  Args_General_GeneralInt32 = detail::MakeABIFunctionType(
      ArgType_General, {ArgType_General, ArgType_Int32}),
  Args_General_GeneralInt32Int32 = detail::MakeABIFunctionType(
      ArgType_General, {ArgType_General, ArgType_Int32, ArgType_Int32}),
  Args_General_GeneralInt32General = detail::MakeABIFunctionType(
      ArgType_General, {ArgType_General, ArgType_Int32, ArgType_General}),
};

static constexpr ABIFunctionType MakeABIFunctionType(
    ABIArgType ret, std::initializer_list<ABIArgType> args) {
  return ABIFunctionType(detail::MakeABIFunctionType(ret, args));
}

enum class BarrierKind : uint32_t {
  // No barrier is needed.
  NoBarrier,

  // The barrier only has to check the value's type tag is in the TypeSet.
  // Specific object types don't have to be checked.
  TypeTagOnly,

  // Check if the value is in the TypeSet, including the object type if it's
  // an object.
  TypeSet
};

enum ReprotectCode { Reprotect = true, DontReprotect = false };

// Rounding modes for round instructions.
enum class RoundingMode { Down, Up, NearestTiesToEven, TowardsZero };

// If a function contains no calls, we can assume the caller has checked the
// stack limit up to this maximum frame size. This works because the jit stack
// limit has a generous buffer before the real end of the native stack.
static const uint32_t MAX_UNCHECKED_LEAF_FRAME_SIZE = 64;

// Truncating conversion modifiers.
using TruncFlags = uint32_t;
static const TruncFlags TRUNC_UNSIGNED = TruncFlags(1) << 0;
static const TruncFlags TRUNC_SATURATING = TruncFlags(1) << 1;

enum BranchDirection { FALSE_BRANCH, TRUE_BRANCH };

template <typename T>
constexpr T SplatByteToUInt(uint8_t val, uint8_t x) {
  T splatted = val;
  for (; x > 1; x--) {
    splatted |= splatted << 8;
  }
  return splatted;
}

}  // namespace jit
}  // namespace js

#endif /* jit_IonTypes_h */
