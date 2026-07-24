/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use super::*;

pub fn pass(root: &mut Root) -> Result<()> {
    let mut module_docs = vec![];
    root.visit_mut(|namespace: &mut Namespace| {
        if namespace.fixture {
            return;
        }
        let mut docs = ApiModuleDocs {
            filename: format!("{}.md", namespace.name),
            jsdoc_module_name: format!("{}.sys", namespace.js_name),
            module_name: format!("{}.sys.mjs", namespace.js_name),
            classes: vec![],
            functions: vec![],
        };
        namespace.visit(|type_def: &TypeDefinition| {
            match type_def {
                TypeDefinition::Interface(Interface {
                    name, docstring, ..
                })
                | TypeDefinition::Record(Record {
                    name, docstring, ..
                })
                | TypeDefinition::Custom(CustomType {
                    name, docstring, ..
                }) => {
                    if docstring.is_some() {
                        docs.classes.push(name.clone());
                    }
                }
                TypeDefinition::Enum(Enum {
                    name,
                    docstring,
                    variants,
                    self_type,
                    ..
                }) => {
                    if docstring.is_some() {
                        docs.classes.push(name.clone());
                    }
                    if self_type.is_used_as_error {
                        for v in variants {
                            docs.classes.push(v.name.clone());
                        }
                    }
                }
                // TODO: callback interfaces.
                //
                // To implement this, we probably should define a base class with for the interface.
                _ => (),
            }
        });
        namespace.visit(|func: &Function| {
            docs.functions.push(func.name.clone());
        });
        docs.classes.sort();
        docs.functions.sort();
        module_docs.push(docs);
    });
    root.module_docs = module_docs;

    Ok(())
}
