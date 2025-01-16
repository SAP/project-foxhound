{%- if !ci.callback_interface_definitions().is_empty() %}
{%- include "CallbackInterfaceRuntime.sys.mjs" %}

{% endif %}

{%- for type_ in ci.iter_types() %}
{%- let ffi_converter = type_.ffi_converter() %}
{%- match type_ %}

{%- when Type::Boolean %}
{%- include "Boolean.sys.mjs" %}

{%- when Type::UInt8 %}
{%- include "UInt8.sys.mjs" %}

{%- when Type::UInt16 %}
{%- include "UInt16.sys.mjs" %}

{%- when Type::UInt32 %}
{%- include "UInt32.sys.mjs" %}

{%- when Type::UInt64 %}
{%- include "UInt64.sys.mjs" %}

{%- when Type::Int8 %}
{%- include "Int8.sys.mjs" %}

{%- when Type::Int16 %}
{%- include "Int16.sys.mjs" %}

{%- when Type::Int32 %}
{%- include "Int32.sys.mjs" %}

{%- when Type::Int64 %}
{%- include "Int64.sys.mjs" %}

{%- when Type::Float32 %}
{%- include "Float32.sys.mjs" %}

{%- when Type::Float64 %}
{%- include "Float64.sys.mjs" %}

{%- when Type::Record { name, module_path } %}
{%- include "Record.sys.mjs" %}

{%- when Type::Optional { inner_type } %}
{%- include "Optional.sys.mjs" %}

{%- when Type::String %}
{%- include "String.sys.mjs" %}

{%- when Type::Sequence { inner_type } %}
{%- include "Sequence.sys.mjs" %}

{%- when Type::Map { key_type, value_type } %}
{%- include "Map.sys.mjs" %}

{%- when Type::Enum { name, module_path } %}
{%- let e = ci.get_enum_definition(name).unwrap() %}
{# For enums, there are either an error *or* an enum, they can't be both. #}
{%- if ci.is_name_used_as_error(name) %}
{%- let error = e %}
{%- include "Error.sys.mjs" %}
{%- else %}
{%- let enum_ = e %}
{%- include "Enum.sys.mjs" %}
{% endif %}

{%- when Type::Object { name, imp, module_path } %}
{%- include "Object.sys.mjs" %}

{%- when Type::Custom { name, builtin, module_path } %}
{%- include "CustomType.sys.mjs" %}

{%- when Type::External { name, module_path, kind, namespace, tagged } %}
{%- include "ExternalType.sys.mjs" %}

{%- when Type::CallbackInterface { name, module_path } %}
{%- include "CallbackInterface.sys.mjs" %}

{%- else %}
{#- TODO implement the other types #}

{%- endmatch %}

{% endfor %}

{%- if !ci.callback_interface_definitions().is_empty() %}
// Define callback interface handlers, this must come after the type loop since they reference the FfiConverters defined above.

{% for cbi in ci.callback_interface_definitions() %}
{%- include "CallbackInterfaceHandler.sys.mjs" %}
{% endfor %}
{% endif %}
