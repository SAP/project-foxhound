/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use std::collections::{HashMap, HashSet};

use anyhow::{anyhow, bail};
use heck::{ToSnakeCase, ToUpperCamelCase};

use super::*;

pub fn pass(root: &mut Root) -> Result<()> {
    root.cpp_scaffolding.callback_interfaces =
        CombinedItems::try_new(root, |namespace, ids, items| {
            let module_name = namespace.name.clone();
            let ffi_func_map: HashMap<String, FfiFunctionType> = namespace
                .ffi_definitions
                .iter()
                .filter_map(|def| match def {
                    FfiDefinition::FunctionType(func_type) => Some(func_type),
                    _ => None,
                })
                .map(|func_type| (func_type.name.0.clone(), func_type.clone()))
                .collect();

            namespace.try_visit_mut(|cbi: &mut CallbackInterface| {
                cbi.vtable.callback_interface_id = ids.new_id();
                items.push(generate_cpp_callback_interface(
                    &module_name,
                    &cbi.vtable,
                    &ffi_func_map,
                )?);
                Ok(())
            })?;

            namespace.try_visit_mut(|int: &mut Interface| {
                if let Some(vtable) = &mut int.vtable {
                    vtable.callback_interface_id = ids.new_id();
                    items.push(generate_cpp_callback_interface(
                        &module_name,
                        vtable,
                        &ffi_func_map,
                    )?);
                }
                Ok(())
            })?;
            Ok(())
        })?;

    let mut seen_return_handler_classes = HashSet::new();
    root.cpp_scaffolding.callback_return_handler_classes = root
        .cpp_scaffolding
        .callback_interfaces
        .try_map(|callback_interfaces| {
            let mut return_handler_classes = vec![];
            callback_interfaces.try_visit(|meth: &CppCallbackInterfaceMethod| {
                let name = return_handler_class_name(meth.return_ty.as_ref())?;
                if seen_return_handler_classes.insert(name.clone()) {
                    return_handler_classes.push(CallbackReturnHandlerClass {
                        name,
                        return_ty: meth.return_ty.clone(),
                        ..CallbackReturnHandlerClass::default()
                    });
                };
                Ok(())
            })?;
            Ok(return_handler_classes)
        })?;

    Ok(())
}

fn map_method(
    meth: &VTableMethod,
    ffi_func: FfiFunctionType,
    module_name: &str,
    interface_name: &str,
) -> Result<CppCallbackInterfaceMethod> {
    let (return_ty, out_pointer_ty) = match &meth.callable.return_type.ty {
        Some(ty) => (
            Some(FfiValueReturnType {
                ty: ty.ffi_type.clone(),
                ..FfiValueReturnType::default()
            }),
            FfiType::MutReference(Box::new(ty.ffi_type.ty.clone())),
        ),
        None => (None, FfiType::VoidPointer),
    };
    let kind = match meth.callable.async_data.as_ref() {
        // Callback interface methods defined as sync in the Rust code are either `Sync` or
        // `FireAndForget`, depending on the configuration.
        None => match &meth.callable.concurrency_mode {
            ConcurrencyMode::Sync => CallbackMethodKind::Sync,
            ConcurrencyMode::FireAndForget => CallbackMethodKind::FireAndForget,
            _ => bail!(
                "Invalid concurrency_mode for callback method: {} ({:?})",
                meth.callable.name,
                meth.callable.concurrency_mode,
            ),
        },
        // Callback interface methods defined as async in the Rust code are always `Async`.
        Some(async_data) => CallbackMethodKind::Async(CppCallbackInterfaceMethodAsyncData {
            complete_callback_type_name: async_data.ffi_foreign_future_complete.0.clone(),
            result_type_name: async_data.ffi_foreign_future_result.0.clone(),
        }),
    };

    Ok(CppCallbackInterfaceMethod {
        kind,
        arguments: meth
            .callable
            .arguments
            .iter()
            .map(|a| FfiValueArgument {
                name: a.name.clone(),
                ty: a.ty.ffi_type.clone(),
                ..FfiValueArgument::default()
            })
            .collect(),
        fn_name: format!(
            "callback_interface_{}_{}_{}",
            module_name.to_snake_case(),
            interface_name.to_snake_case(),
            meth.callable.name.to_snake_case(),
        ),
        return_handler_class_name: return_handler_class_name(return_ty.as_ref())?,
        async_handler_class_name: format!(
            "CallbackInterfaceMethod{}{}{}",
            module_name.to_upper_camel_case(),
            interface_name.to_upper_camel_case(),
            meth.callable.name.to_upper_camel_case(),
        ),
        return_ty,
        out_pointer_ty: FfiTypeNode {
            ty: out_pointer_ty,
            ..FfiTypeNode::default()
        },
        ffi_func,
    })
}

fn generate_cpp_callback_interface(
    module_name: &str,
    vtable: &VTable,
    ffi_func_map: &HashMap<String, FfiFunctionType>,
) -> Result<CppCallbackInterface> {
    let interface_name = &vtable.interface_name;
    Ok(CppCallbackInterface {
        id: vtable.callback_interface_id,
        name: interface_name.to_string(),
        // Only generate FFI value class for callback interfaces.  For trait
        // interfaces, we're going to generate one `PointerTypes.cpp` instead.
        ffi_value_class: vtable.callback_interface.then(|| {
            format!(
                "FfiValueObjectHandle{}{}",
                module_name.to_upper_camel_case(),
                interface_name.to_upper_camel_case()
            )
        }),
        handler_var: format!(
            "gUniffiCallbackHandler{}{}",
            module_name.to_upper_camel_case(),
            interface_name.to_upper_camel_case()
        ),
        vtable_var: format!(
            "kUniffiVtable{}{}",
            module_name.to_upper_camel_case(),
            interface_name.to_upper_camel_case()
        ),
        vtable_struct_type: vtable.struct_type.clone(),
        init_fn: vtable.init_fn.clone(),
        free_fn: format!(
            "callback_free_{}_{}",
            module_name.to_snake_case(),
            interface_name.to_snake_case()
        ),
        clone_fn: format!(
            "callback_clone_{}_{}",
            module_name.to_snake_case(),
            interface_name.to_snake_case()
        ),
        methods: vtable
            .methods
            .iter()
            .map(|vtable_meth| {
                let FfiType::Function(FfiFunctionTypeName(name)) = &vtable_meth.ffi_type.ty else {
                    bail!(
                        "Invalid FFI TYPE for VTable method {:?}",
                        vtable_meth.ffi_type.ty
                    );
                };
                let ffi_func = ffi_func_map
                    .get(name)
                    .cloned()
                    .ok_or_else(|| anyhow!("Callback interface method not found: {name}"))?;
                map_method(vtable_meth, ffi_func, module_name, interface_name)
            })
            .collect::<Result<Vec<_>>>()?,
    })
}

pub fn return_handler_class_name(return_ty: Option<&FfiValueReturnType>) -> Result<String> {
    Ok(match return_ty {
        None => "CallbackLowerReturnVoid".to_string(),
        Some(return_ty) => match &return_ty.ty.ty {
            FfiType::UInt8 => "CallbackLowerReturnUInt8".to_string(),
            FfiType::Int8 => "CallbackLowerReturnInt8".to_string(),
            FfiType::UInt16 => "CallbackLowerReturnUInt16".to_string(),
            FfiType::Int16 => "CallbackLowerReturnInt16".to_string(),
            FfiType::UInt32 => "CallbackLowerReturnUInt32".to_string(),
            FfiType::Int32 => "CallbackLowerReturnInt32".to_string(),
            FfiType::UInt64 => "CallbackLowerReturnUInt64".to_string(),
            FfiType::Int64 => "CallbackLowerReturnInt64".to_string(),
            FfiType::Float32 => "CallbackLowerReturnFloat32".to_string(),
            FfiType::Float64 => "CallbackLowerReturnFloat64".to_string(),
            FfiType::RustBuffer(_) => "CallbackLowerReturnRustBuffer".to_string(),
            FfiType::Handle(HandleKind::TraitInterface {
                namespace,
                interface_name,
            }) => {
                format!("CallbackLowerReturnCallbackInterface{namespace}_{interface_name}")
            }
            FfiType::Handle(HandleKind::StructInterface { .. }) => {
                "CallbackLowerReturnUInt8".to_string()
            }
            ty => bail!("Invalid callback return FFI type: {ty:?}"),
        },
    })
}
