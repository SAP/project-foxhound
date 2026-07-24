/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


{%- for (preprocessor_condition, return_handlers, preprocessor_condition_end) in callback_return_handler_classes.iter() %}
{{ preprocessor_condition }}
{%- for return_handler in return_handlers %}

/**
  * Handle callback interface return values for a single return type
  */
class {{ return_handler.name }} {
public:
  /**
    * Lower return values
    *
    * This inputs a UniFFIScaffoldingCallResult from JS and converts it to
    * something that can be passed to Rust.
    *
    * - On success, it returns the FFI return value
    * - On error, it updates the `RustCallStatus` struct and returns a default FFI value.
    */
  static {{ return_handler.return_type_name }}
  Lower(const RootedDictionary<UniFFIScaffoldingCallResult>& aCallResult,
              RustCallStatus* aOutCallStatus,
              ErrorResult& aRv) {
    aOutCallStatus->code = RUST_CALL_INTERNAL_ERROR;
    {% if let Some(return_ty) = return_handler.return_ty -%}
    {{ return_ty.ffi_value_class }} returnValue;
    {% endif -%}

    switch (aCallResult.mCode) {
      case UniFFIScaffoldingCallCode::Success: {
        {% if return_handler.return_ty.is_some() -%}
        if (!aCallResult.mData.WasPassed()) {
          MOZ_LOG(gUniffiLogger, LogLevel::Error, ("[{{ return_handler.name }}] No data passed"));
          break;
        }
        returnValue.Lower(aCallResult.mData.Value(), aRv);
        if (aRv.Failed()) {
          MOZ_LOG(gUniffiLogger, LogLevel::Error, ("[{{ return_handler.name }}] Failed to lower return value"));
          break;
        }
        {% endif -%}
        aOutCallStatus->code = RUST_CALL_SUCCESS;
        break;
      }

      case UniFFIScaffoldingCallCode::Error: {
        if (!aCallResult.mData.WasPassed()) {
          MOZ_LOG(gUniffiLogger, LogLevel::Error, ("[{{ return_handler.name }}] No data passed"));
          break;
        }
        FfiValueRustBuffer errorBuf;
        errorBuf.Lower(aCallResult.mData.Value(), aRv);
        if (aRv.Failed()) {
          MOZ_LOG(gUniffiLogger, LogLevel::Error, ("[{{ return_handler.name }}] Failed to lower error buffer"));
          break;
        }

        aOutCallStatus->error_buf = errorBuf.IntoRust();
        aOutCallStatus->code = RUST_CALL_ERROR;
        break;
      }

      default: {
        break;
      }
    }

    {% if return_handler.return_ty.is_some() -%}
    return returnValue.IntoRust();
    {% endif -%}
  }
};
{%- endfor %}
{{ preprocessor_condition_end }}
{%- endfor %}

// Callback interface method handlers, vtables, etc.
{%- for (preprocessor_condition, callback_interfaces, preprocessor_condition_end) in callback_interfaces.iter() %}
{{ preprocessor_condition }}

{%- for cbi in callback_interfaces %}
static StaticRefPtr<dom::UniFFICallbackHandler> {{ cbi.handler_var }};

{%- for meth in cbi.methods %}
{%- let method_index = loop.index0 %}
{%- let arguments = meth.arguments %}

{%- match meth.kind %}
{%- when CallbackMethodKind::Async(async_data) %}
/**
 * Callback method handler subclass for {{ meth.fn_name }}
 *
 * This handles the specifics of the async call.
 * AsyncCallbackMethodHandlerBase::ScheduleAsyncCall handles the general parts.
 */
class {{ meth.async_handler_class_name }} final : public AsyncCallbackMethodHandlerBase {
private:
  // Rust arguments
  {%- for a in arguments %}
  {{ a.ffi_value_class }} {{ a.field_name }}{};
  {%- endfor %}
  {{ async_data.complete_callback_type_name }} mUniffiCompleteCallback;
  uint64_t mUniffiCallbackData;

public:
  {{ meth.async_handler_class_name }}(
      uint64_t aUniffiHandle,
      {%- for a in arguments %}
      {{ a.ty.type_name }} {{ a.name }},
      {%- endfor %}
      {{ async_data.complete_callback_type_name }} aUniffiCompleteCallback,
      uint64_t aUniffiCallbackData
  ) : AsyncCallbackMethodHandlerBase ("{{ cbi.name }}.{{ meth.fn_name }}", aUniffiHandle),
      {%- for a in arguments %}
      {{ a.field_name }}({{ a.ffi_value_class }}::FromRust({{ a.name }})),
      {%- endfor %}
      mUniffiCompleteCallback(aUniffiCompleteCallback),
      mUniffiCallbackData(aUniffiCallbackData) { }

  MOZ_CAN_RUN_SCRIPT
  already_AddRefed<dom::Promise>
  MakeCall(JSContext* aCx, dom::UniFFICallbackHandler* aJsHandler, ErrorResult& aError) override {
    // Convert arguments
    nsTArray<dom::OwningUniFFIScaffoldingValue> uniffiArgs;
    if (!uniffiArgs.AppendElements({{ arguments.len()  }}, mozilla::fallible)) {
      aError.Throw(NS_ERROR_OUT_OF_MEMORY);
      return nullptr;
    }
    {%- for a in arguments %}
    {{ a.field_name }}.Lift(aCx, &uniffiArgs[{{ loop.index0 }}], aError);
    if (aError.Failed()) {
      return nullptr;
    }
    {%- endfor %}

    RefPtr<dom::Promise> result = aJsHandler->CallAsync(mUniffiHandle.IntoRust(), {{ method_index }}, uniffiArgs, aError);
    return result.forget();
  }

  void HandleReturn(const RootedDictionary<UniFFIScaffoldingCallResult>& aCallResult,
                    ErrorResult& aRv) override {
    if (!mUniffiCompleteCallback) {
      MOZ_ASSERT_UNREACHABLE("HandleReturn called multiple times");
      return;
    }

    {{ async_data.result_type_name }} result{};
    {%- if meth.return_ty.is_some() %}
    result.return_value  = {{ meth.return_handler_class_name }}::Lower(aCallResult, &result.call_status, aRv);
    {%- else %}
    {{ meth.return_handler_class_name }}::Lower(aCallResult, &result.call_status, aRv);
    {%- endif %}
    mUniffiCompleteCallback(mUniffiCallbackData, result);
    mUniffiCompleteCallback = nullptr;
  }

  ~{{ meth.async_handler_class_name }}() {
    if (mUniffiCompleteCallback) {
      MOZ_LOG(gUniffiLogger, LogLevel::Error, ("[{{ meth.return_handler_class_name }}] promise never completed"));
      {{ async_data.result_type_name }} result{};
      result.call_status.code = RUST_CALL_INTERNAL_ERROR;
      mUniffiCompleteCallback(mUniffiCallbackData, result);
    }
  }
};

/**
 * {{ meth.fn_name }} -- C function to handle the callback method
 *
 * This is what Rust calls when it invokes a callback method.
 */
extern "C" void {{ meth.fn_name }}(
  uint64_t aUniffiHandle,
  {%- for a in meth.arguments %}
  {{ a.ty.type_name }} {{ a.name }},
  {%- endfor %}
  {{ async_data.complete_callback_type_name }} aUniffiForeignFutureCallback,
  uint64_t aUniffiForeignFutureCallbackData,
  // This can be used to detected when the future is dropped from the Rust side and cancel the
  // async task on the foreign side.  However, there's no way to do that in JS, so we just ignore
  // it.
  ForeignFutureDroppedCallbackStruct *aUniffiOutForeignFuture
) {
  UniquePtr<AsyncCallbackMethodHandlerBase> handler = MakeUnique<{{ meth.async_handler_class_name }}>(
        aUniffiHandle,
        {% for a in arguments -%}
        {{ a.name }},
        {% endfor -%}
        aUniffiForeignFutureCallback,
        aUniffiForeignFutureCallbackData);
  // Now that everything is set up, schedule the call in the JS main thread.
  AsyncCallbackMethodHandlerBase::ScheduleAsyncCall(std::move(handler), &{{ cbi.handler_var }});
}

{%- when CallbackMethodKind::FireAndForget %}
/**
 * Callback method handler subclass for {{ meth.fn_name }}
 *
 * This is like the handler for an async function except:
 *
 * - It doesn't input the complete callback function/data
 * - It doesn't override HandleReturn and returns `nullptr` from MakeCall.
 *   This means ScheduleAsyncCall will schedule `MakeCall` and not do anything
 *   with the result, which is what we want.
 */
class {{ meth.async_handler_class_name }} final : public AsyncCallbackMethodHandlerBase {
private:
  // Rust arguments
  {%- for a in arguments %}
  {{ a.ffi_value_class }} {{ a.field_name }}{};
  {%- endfor %}

public:
  {{ meth.async_handler_class_name }}(
      {%- filter remove_trailing_comma %}
      uint64_t aUniffiHandle,
      {%- for a in arguments %}
      {{ a.ty.type_name }} {{ a.name }},
      {%- endfor %}
      {%- endfilter %}
  ) {% filter remove_trailing_comma -%}
    : AsyncCallbackMethodHandlerBase ("{{ cbi.name }}.{{ meth.fn_name }}", aUniffiHandle),
      {% for a in arguments -%}
      {{ a.field_name }}({{ a.ffi_value_class }}::FromRust({{ a.name }})),
      {% endfor -%}
    {% endfilter -%}
  { }

  MOZ_CAN_RUN_SCRIPT
  already_AddRefed<dom::Promise>
  MakeCall(JSContext* aCx, dom::UniFFICallbackHandler* aJsHandler, ErrorResult& aError) override {
    // Convert arguments
    nsTArray<dom::OwningUniFFIScaffoldingValue> uniffiArgs;
    if (!uniffiArgs.AppendElements({{ arguments.len()  }}, mozilla::fallible)) {
      aError.Throw(NS_ERROR_OUT_OF_MEMORY);
      return nullptr;
    }
    {%- for a in arguments %}
    {{ a.field_name }}.Lift(aCx, &uniffiArgs[{{ loop.index0 }}], aError);
    if (aError.Failed()) {
      return nullptr;
    }
    {%- endfor %}

    RefPtr<dom::Promise> result = aJsHandler->CallAsync(mUniffiHandle.IntoRust(), {{ method_index }}, uniffiArgs, aError);
    return nullptr;
  }
};

/**
 * {{ meth.fn_name }} -- C function to handle the callback method
 *
 * This is what Rust calls when it invokes a callback method.
 */
extern "C" void {{ meth.fn_name }}(
  uint64_t aUniffiHandle,
  {%- for a in meth.arguments %}
  {{ a.ty.type_name }} {{ a.name }},
  {%- endfor %}
  {{ meth.out_pointer_ty.type_name }} aUniffiOutReturn,
  RustCallStatus* uniffiOutStatus
) {
  UniquePtr<AsyncCallbackMethodHandlerBase> handler = MakeUnique<{{ meth.async_handler_class_name }}>(aUniffiHandle{% for a in arguments %}, {{ a.name }}{%- endfor %});
  AsyncCallbackMethodHandlerBase::ScheduleAsyncCall(std::move(handler), &{{ cbi.handler_var }});
}

{%- when CallbackMethodKind::Sync %}
/**
 * {{ meth.fn_name }} -- C function to handle the callback method
 *
 * This is what Rust calls when it invokes a callback method.
 */
extern "C" void {{ meth.fn_name }}(
  uint64_t aUniffiHandle,
  {%- for a in meth.arguments %}
  {{ a.ty.type_name }} {{ a.name }},
  {%- endfor %}
  {{ meth.out_pointer_ty.type_name }} aUniffiOutReturn,
  RustCallStatus* aUniffiOutStatus
) {
  MOZ_RELEASE_ASSERT(NS_IsMainThread());
  // Take our own reference to the callback handler to ensure that it
  // stays alive for the duration of this call
  RefPtr<dom::UniFFICallbackHandler> jsHandler = {{ cbi.handler_var }};
  // Create a JS context for the call
  JSObject* global = jsHandler->CallbackGlobalOrNull();
  if (!global) {
    MOZ_LOG(gUniffiLogger, LogLevel::Error, ("[{{ meth.fn_name }}] JS handler has null global"));
    return;
  }
  dom::AutoEntryScript aes(global, "{{ meth.fn_name }}");

  // Convert arguments
  nsTArray<dom::OwningUniFFIScaffoldingValue> uniffiArgs;
  if (!uniffiArgs.AppendElements({{ arguments.len()  }}, mozilla::fallible)) {
    MOZ_LOG(gUniffiLogger, LogLevel::Error, ("[{{ meth.fn_name }}] Failed to allocate arguments"));
    return;
  }
  IgnoredErrorResult error;
  {%- for a in arguments %}
  {{ a.ffi_value_class }} {{ a.var_name }} = {{ a.ffi_value_class }}::FromRust({{ a.name }});
  {{ a.var_name }}.Lift(aes.cx(), &uniffiArgs[{{ loop.index0 }}], error);
  if (error.Failed()) {
    MOZ_LOG(
        gUniffiLogger, LogLevel::Error,
        ("[{{ meth.fn_name }}] Failed to lift {{ a.name }}"));
    return;
  }
  {%- endfor %}

  RootedDictionary<UniFFIScaffoldingCallResult> callResult(aes.cx());
  jsHandler->CallSync(aUniffiHandle, {{ method_index }}, uniffiArgs, callResult, error);
  if (error.Failed()) {
    MOZ_LOG(
        gUniffiLogger, LogLevel::Error,
        ("[{{ meth.fn_name }}] Error invoking JS handler"));
    return;
  }
  {% if meth.return_ty.is_some() -%}
  *aUniffiOutReturn = {{ meth.return_handler_class_name}}::Lower(callResult, aUniffiOutStatus, error);
  {% else -%}
  {{ meth.return_handler_class_name}}::Lower(callResult, aUniffiOutStatus, error);
  {% endif -%}
}
{%- endmatch %}
{%- endfor %}

extern "C" void {{ cbi.free_fn }}(uint64_t aUniffiHandle) {
  if (CallbackHandleRelease(aUniffiHandle) == 0) {
   // Callback object handles are keys in a map stored in the JS handler. To
   // handle the free call, schedule a fire-and-forget JS call to remove the key.
   AsyncCallbackMethodHandlerBase::ScheduleAsyncCall(
      MakeUnique<CallbackFreeHandler>("{{ cbi.name }}.uniffi_free", aUniffiHandle),
      &{{ cbi.handler_var }});
  }
}

extern "C" uint64_t {{ cbi.clone_fn }}(uint64_t aUniffiHandle) {
  CallbackHandleAddRef(aUniffiHandle);
  return aUniffiHandle;
}

static {{ cbi.vtable_struct_type.type_name }} {{ cbi.vtable_var }} {
  {{ cbi.free_fn }},
  {{ cbi.clone_fn }},
  {%- for meth in cbi.methods %}
  {{ meth.fn_name }},
  {%- endfor %}
};

{%- endfor %}
{{ preprocessor_condition_end }}
{%- endfor %}

void RegisterCallbackHandler(uint64_t aInterfaceId, UniFFICallbackHandler& aCallbackHandler, ErrorResult& aError) {
  switch (aInterfaceId) {
    {%- for (preprocessor_condition, callback_interfaces, preprocessor_condition_end) in callback_interfaces.iter() %}
    {{ preprocessor_condition }}

    {%- for cbi in callback_interfaces %}
    case {{ cbi.id }}: {
      if ({{ cbi.handler_var }}) {
        aError.ThrowUnknownError("[UniFFI] Callback handler already registered for {{ cbi.name }}"_ns);
        return;
      }

      {{ cbi.handler_var }} = &aCallbackHandler;
      {{ cbi.init_fn.0 }}(&{{ cbi.vtable_var }});
      break;
    }


    {%- endfor %}
    {{ preprocessor_condition_end }}
    {%- endfor %}

    default:
      aError.ThrowUnknownError(nsPrintfCString("RegisterCallbackHandler: Unknown callback interface id (%" PRIu64 ")", aInterfaceId));
      return;
  }
}

void DeregisterCallbackHandler(uint64_t aInterfaceId, ErrorResult& aError) {
  switch (aInterfaceId) {
    {%- for (preprocessor_condition, callback_interfaces, preprocessor_condition_end) in callback_interfaces.iter() %}
    {{ preprocessor_condition }}

    {%- for cbi in callback_interfaces %}
    case {{ cbi.id }}: {
      if (!{{ cbi.handler_var }}) {
        aError.ThrowUnknownError("[UniFFI] Callback handler not registered for {{ cbi.name }}"_ns);
        return;
      }

      {{ cbi.handler_var }} = nullptr;
      break;
    }


    {%- endfor %}
    {{ preprocessor_condition_end }}
    {%- endfor %}

    default:
      aError.ThrowUnknownError(nsPrintfCString("DeregisterCallbackHandler: Unknown callback interface id (%" PRIu64 ")", aInterfaceId));
      return;
  }
}
