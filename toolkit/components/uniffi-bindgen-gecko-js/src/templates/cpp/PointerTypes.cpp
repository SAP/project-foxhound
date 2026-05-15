/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// Define pointer types
{%- for (preprocessor_condition, pointer_types, preprocessor_condition_end) in pointer_types.iter() %}
{{ preprocessor_condition }}
{%- for pointer_type in pointer_types %}
const static mozilla::uniffi::UniFFIPointerType {{ pointer_type.name }} {
  "{{ pointer_type.label }}"_ns,
  {{ pointer_type.ffi_func_clone.0 }},
  {{ pointer_type.ffi_func_free.0 }},
};

{%- match pointer_type.trait_interface_info %}
{%- when None %}
class {{ pointer_type.ffi_value_class }} {
 private:
  uint64_t mValue = 0;

 public:
  {{ pointer_type.ffi_value_class }}() = default;
  explicit {{ pointer_type.ffi_value_class }}(uint64_t aValue) : mValue(aValue) {}

  // Delete copy constructor and assignment as this type is non-copyable.
  {{ pointer_type.ffi_value_class }}(const {{ pointer_type.ffi_value_class }}&) = delete;
  {{ pointer_type.ffi_value_class }}& operator=(const {{ pointer_type.ffi_value_class }}&) = delete;

  {{ pointer_type.ffi_value_class }}& operator=({{ pointer_type.ffi_value_class }}&& aOther) {
    FreeHandle();
    mValue = aOther.mValue;
    aOther.mValue = 0;
    return *this;
  }

  void Lower(const dom::OwningUniFFIScaffoldingValue& aValue,
             ErrorResult& aError) {
    if (!aValue.IsUniFFIPointer()) {
      aError.ThrowTypeError("Expected UniFFI pointer argument"_ns);
      return;
    }
    dom::UniFFIPointer& value = aValue.GetAsUniFFIPointer();
    if (!value.IsSamePtrType(&{{ pointer_type.name }})) {
      aError.ThrowTypeError("Incorrect UniFFI pointer type"_ns);
      return;
    }
    FreeHandle();
    mValue = value.ClonePtr();
  }

  // LowerReceiver is used for method receivers.  For non-trait interfaces, it works exactly the
  // same as `Lower`
  void LowerReciever(const dom::OwningUniFFIScaffoldingValue& aValue,
             ErrorResult& aError) {
    Lower(aValue, aError);
  }

  void Lift(JSContext* aContext, dom::OwningUniFFIScaffoldingValue* aDest,
            ErrorResult& aError) {
    aDest->SetAsUniFFIPointer() =
        dom::UniFFIPointer::Create(mValue, &{{ pointer_type.name }});
    mValue = 0;
  }

  uint64_t IntoRust() {
    auto temp = mValue;
    mValue = 0;
    return temp;
  }

  static {{ pointer_type.ffi_value_class }} FromRust(uint64_t aValue) {
    return {{ pointer_type.ffi_value_class }}(aValue);
  }

  void FreeHandle() {
    if (mValue) {
      RustCallStatus callStatus{};
      ({{ pointer_type.ffi_func_free.0 }})(mValue, &callStatus);
      // No need to check `RustCallStatus`, it's only part of the API to match
      // other FFI calls.  The free function can never fail.
    }
  }

  ~{{ pointer_type.ffi_value_class }}() {
    // If the pointer is non-null, this means Lift/IntoRust was never called
    // because there was some failure along the way. Free the pointer to avoid a
    // leak
    FreeHandle();
  }
};
{%- when Some(trait_interface_info) %}
// Forward declare the free and clone functions, which are defined later on in `CallbackInterfaces.cpp`
extern "C" void {{ trait_interface_info.free_fn }}(uint64_t uniffiHandle);
extern "C" uint64_t {{ trait_interface_info.clone_fn }}(uint64_t uniffiHandle);

// Trait interface FFI value class.  This is a hybrid between the one for interfaces and callback
// interface version
class {{ pointer_type.ffi_value_class }} {
 private:
  // The raw FFI value is a uint64_t in all cases.
  // For callback interfaces, the uint64_t handle gets casted to a pointer.  Callback interface
  // handles are used as the uint64_t and are incremented by one at a time, so even on a 32-bit system this
  // shouldn't overflow.
  uint64_t mValue = 0;

 public:
  {{ pointer_type.ffi_value_class }}() = default;
  explicit {{ pointer_type.ffi_value_class }}(uint64_t aValue) : mValue(aValue) {}

  // Delete copy constructor and assignment as this type is non-copyable.
  {{ pointer_type.ffi_value_class }}(const {{ pointer_type.ffi_value_class }}&) = delete;
  {{ pointer_type.ffi_value_class }}& operator=(const {{ pointer_type.ffi_value_class }}&) = delete;

  {{ pointer_type.ffi_value_class }}& operator=({{ pointer_type.ffi_value_class }}&& aOther) {
    FreeHandle();
    mValue = aOther.mValue;
    aOther.mValue = 0;
    return *this;
  }

  // Lower a trait interface, `aValue` can either be a Rust or JS handle
  void Lower(const dom::OwningUniFFIScaffoldingValue& aValue,
             ErrorResult& aError) {
    FreeHandle();
    if (aValue.IsUniFFIPointer()) {
      // Rust handle.  Clone the handle and return it.
      dom::UniFFIPointer& value = aValue.GetAsUniFFIPointer();
      if (!value.IsSamePtrType(&{{ pointer_type.name }})) {
        aError.ThrowTypeError("Incorrect UniFFI pointer type"_ns);
        return;
      }
      mValue = value.ClonePtr();
    } else if (aValue.IsDouble()) {
      // JS handle.  Just return it, the JS code has already incremented the
      // refcount
      double floatValue = aValue.GetAsDouble();
      uint64_t intValue = static_cast<uint64_t>(floatValue);
      if (intValue != floatValue) {
        aError.ThrowTypeError("Not an integer"_ns);
        return;
      }
      mValue = intValue;
    } else {
      aError.ThrowTypeError("Bad argument type"_ns);
      return;
    }
  }

  // Lift a trait interface.  `mValue` can either by a Rust or JS handle
  void Lift(JSContext* aContext, dom::OwningUniFFIScaffoldingValue* aDest,
            ErrorResult& aError) {
    if ((mValue & 1) == 0) {
      // Rust handle
      aDest->SetAsUniFFIPointer() =
          dom::UniFFIPointer::Create(mValue, &{{ pointer_type.name }});
    } else {
      // JS handle
      aDest->SetAsDouble() = mValue;
    }
    mValue = 0;
  }

  uint64_t IntoRust() {
    auto temp = mValue;
    mValue = 0;
    return temp;
  }

  static {{ pointer_type.ffi_value_class }} FromRust(uint64_t aValue) {
    return {{ pointer_type.ffi_value_class }}(aValue);
  }

  void FreeHandle() {
    // If we're storing a handle, call the free function for it. The function to
    // call depends on if we're holding a JS or Rust implementation of the
    // interface. We can tell that by looking at the lowest bit of the handle
    if (mValue == 0) {
      // 0 indicates we're not storing a handle.
    } else if ((mValue & 1) == 0) {
      // Rust implementation
      RustCallStatus callStatus{};
      ({{ pointer_type.ffi_func_free.0 }})(mValue, &callStatus);
      // No need to check `RustCallStatus`, it's only part of the API to match
      // other FFI calls.  The free function can never fail.
    } else {
      // JS implementation
      {{ trait_interface_info.free_fn }}(mValue);
    }
    mValue = 0;
  }

  ~{{ pointer_type.ffi_value_class }}() {
    // If the pointer is non-null, this means Lift/IntoRust was never called
    // because there was some failure along the way. Free the pointer to avoid a
    // leak
    FreeHandle();
  }
};
{%- endmatch %}

{%- endfor %}
{{ preprocessor_condition_end }}
{%- endfor %}

Maybe<already_AddRefed<UniFFIPointer>> ReadPointer(const GlobalObject& aGlobal, uint64_t aId, const ArrayBuffer& aArrayBuff, long aPosition, ErrorResult& aError) {
  const UniFFIPointerType* type;
  switch (aId) {
    {%- for (preprocessor_condition, pointer_types, preprocessor_condition_end) in pointer_types.iter() %}
{{ preprocessor_condition }}
    {%- for pointer_type in pointer_types %}
    case {{ pointer_type.id }}: {
      type = &{{ pointer_type.name }};
      break;
    }
    {%- endfor %}
{{ preprocessor_condition_end }}
    {%- endfor %}
    default:
      return Nothing();
  }
  return Some(UniFFIPointer::Read(aArrayBuff, aPosition, type, aError));
}

bool WritePointer(const GlobalObject& aGlobal, uint64_t aId, const UniFFIPointer& aPtr, const ArrayBuffer& aArrayBuff, long aPosition, ErrorResult& aError) {
  const UniFFIPointerType* type;
  switch (aId) {
    {%- for (preprocessor_condition, pointer_types, preprocessor_condition_end) in pointer_types.iter() %}
{{ preprocessor_condition }}
    {%- for pointer_type in pointer_types %}
    case {{ pointer_type.id }}: {
      type = &{{ pointer_type.name }};
      break;
    }
    {%- endfor %}
{{ preprocessor_condition_end }}
    {%- endfor %}
    default:
      return false;
  }
  aPtr.Write(aArrayBuff, aPosition, type, aError);
  return true;
}
