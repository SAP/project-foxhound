# rust_macros.py - Generate rust_macros bindings from IDL.
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""Generate rust bindings information for the IDL file specified"""

from xpidl import rust, xpidl

derive_method_tmpl = """\
Method {{
    name: "{name}",
    params: &[{params}],
    ret: "{ret}",
}}"""


def attrAsMethodStruct(iface, m, getter):
    params = [
        f'Param {{ name: "{name}", ty: "{ty}" }}'
        for name, ty in rust.attributeRawParamList(iface, m, getter)
    ]
    return derive_method_tmpl.format(
        name=rust.attributeNativeName(m, getter),
        params=", ".join(params),
        ret="::nserror::nsresult",
    )


def methodAsMethodStruct(iface, m):
    params = [
        f'Param {{ name: "{name}", ty: "{ty}" }}'
        for name, ty in rust.methodRawParamList(iface, m)
    ]
    return derive_method_tmpl.format(
        name=rust.methodNativeName(m),
        params=", ".join(params),
        ret=rust.methodReturnType(m),
    )


derive_iface_tmpl = """\
Interface {{
    name: "{name}",
    base: {base},
    sync: {sync},
    methods: {methods},
}},
"""


def write_interface(iface, fd):
    if iface.namemap is None:
        raise Exception("Interface was not resolved.")

    assert iface.base or (iface.name == "nsISupports")

    base = f'Some("{iface.base}")' if iface.base is not None else "None"
    try:
        methods = ""
        for member in iface.members:
            if type(member) is xpidl.Attribute:
                methods += f"/* {member.toIDL()} */\n"
                methods += f"{attrAsMethodStruct(iface, member, True)},\n"
                if not member.readonly:
                    methods += f"{attrAsMethodStruct(iface, member, False)},\n"
                methods += "\n"

            elif type(member) is xpidl.Method:
                methods += f"/* {member.toIDL()} */\n"
                methods += f"{methodAsMethodStruct(iface, member)},\n\n"
        fd.write(
            derive_iface_tmpl.format(
                name=iface.name,
                base=base,
                sync="true" if iface.attributes.rust_sync else "false",
                methods=f"Ok(&[\n{methods}])",
            )
        )
    except xpidl.RustNoncompat as reason:
        fd.write(
            derive_iface_tmpl.format(
                name=iface.name,
                base=base,
                sync="false",
                methods=f'Err("{reason}")',
            )
        )


header = """\
//
// DO NOT EDIT.  THIS FILE IS GENERATED FROM $SRCDIR/{relpath}
//

"""


def print_rust_macros_bindings(idl, fd, relpath):
    fd = rust.AutoIndent(fd)

    fd.write(header.format(relpath=relpath))
    fd.write("{static D: &[Interface] = &[\n")

    for p in idl.productions:
        if p.kind == "interface":
            write_interface(p, fd)

    fd.write("]; D}\n")
