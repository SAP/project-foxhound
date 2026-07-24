# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.

import yaml


def main(output, annotations_path):
    with open(annotations_path) as annotations_file:
        annotations = yaml.safe_load(annotations_file)

    names = []

    for name, data in annotations:
        glean = data.get("glean")
        if glean is None:
            continue

        annotation_type = data["type"]
        glean_type = glean["type"]

        namespace, _, metric = glean["metric"].rpartition(".")
        namespace = namespace.replace(".", "_")

        # Treat all numbers the same way
        if annotation_type in ["usize", "u64", "u32"]:
            annotation_type = "u64"

        conversion = None
        unique_conversion = f"convert_to_{namespace}_{metric}"
        custom_convert = glean.get("custom_convert")
        if custom_convert:
            if custom_convert is True:
                conversion = unique_conversion
            else:
                conversion = f"convert_{custom_convert}"

        if conversion is None:
            # Only use a standard conversion when there is no ambiguity
            is_standard = (annotation_type, glean_type) in [
                ("boolean", "boolean"),
                ("string", "string"),
                ("u64", "quantity"),
                ("string", "string_list"),
            ]
            if is_standard:
                conversion = f"convert_{annotation_type}_to_{glean_type}"
            else:
                conversion = unique_conversion

        args = ""
        if glean_type == "string_list":
            args += f', "{glean["delimiter"]}"'

        output.write(
            f'#[allow(non_upper_case_globals)] pub const {name}: Annotation = convert!({namespace}::{metric} = {conversion}("{name}"{args}));\n'
        )
        names.append(name)

    names = ",".join(names)

    output.write(f"pub const ANNOTATIONS: &[Annotation] = &[{names}];\n")
