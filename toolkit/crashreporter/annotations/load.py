# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this file,
# You can obtain one at http://mozilla.org/MPL/2.0/.

import sys
from os import path

import yaml

__all__ = ["annotations_filename", "read_annotations"]

annotations_filename = path.normpath(
    path.join(path.dirname(__file__), "..", "CrashAnnotations.yaml")
)


def sort_annotations(annotations):
    """Return annotations in ascending alphabetical order ignoring case"""

    return sorted(annotations.items(), key=lambda annotation: str.lower(annotation[0]))


# Convert CamelCase to snake_case. Also supports CAPCamelCase. Numbers are
# grouped with the prior word.
def camel_to_snake(s):
    if s.islower():
        return s
    lowers = [c.islower() or c.isnumeric() for c in s] + [False]
    words = []
    last = 0
    for i in range(1, len(s)):
        if not lowers[i] and (lowers[i - 1] or lowers[i + 1]):
            words.append(s[last:i])
            last = i
    words.append(s[last:])
    return "_".join(words).lower()


class AnnotationValidator:
    def __init__(self, name):
        self._name = name
        self.passed = True

    def validate(self, data):
        """
        Ensure that the annotation has all the required fields, and elaborate
        default values.
        """
        if "description" not in data:
            self._error("does not have a description")
        annotation_type = data.get("type")
        if annotation_type is None:
            self._error("does not have a type")

        valid_types = ["string", "boolean", "u32", "u64", "usize", "object"]
        if annotation_type and annotation_type not in valid_types:
            self._error(f"has an unknown type: {annotation_type}")
            annotation_type = None

        annotation_scope = data.setdefault("scope", "client")
        valid_scopes = ["client", "report", "ping", "ping-only"]
        if annotation_scope not in valid_scopes:
            self._error(f"has an unknown scope: {annotation_scope}")
            annotation_scope = None

        is_ping = annotation_scope and annotation_scope in ["ping", "ping-only"]

        if annotation_scope and "glean" in data and not is_ping:
            self._error("has a glean metric specification but does not have ping scope")

        if annotation_type and is_ping:
            self._glean(annotation_type, data.setdefault("glean", {}))

    def _error(self, message):
        print(
            f"{annotations_filename}: Annotation {self._name} {message}.",
            file=sys.stderr,
        )
        self.passed = False

    def _glean(self, annotation_type, glean):
        if not isinstance(glean, dict):
            self._error("has invalid glean metric specification (expected a map)")
            return

        glean_metric_name = glean.setdefault("metric", "crash")
        # If only a category is given, derive the metric name from the annotation name.
        if "." not in glean_metric_name:
            glean_metric_name = glean["metric"] = (
                f"{glean_metric_name}.{camel_to_snake(self._name)}"
            )

        glean_default_type = (
            annotation_type if annotation_type in ["string", "boolean"] else None
        )
        glean_type = glean.setdefault("type", glean_default_type)
        if glean_type is None:
            self._error("must have a glean metric type specified")

        glean_types = [
            "boolean",
            "datetime",
            "timespan",
            "string",
            "string_list",
            "quantity",
            "object",
        ]
        if glean_type and glean_type not in glean_types:
            self._error(f"has an invalid glean metric type ({glean_type})")
            glean_type = None

        metric_required_fields = {
            "datetime": ["time_unit"],
            "timespan": ["time_unit"],
            "quantity": ["unit"],
            "string_list": ["delimiter"],
            "object": ["structure"],
        }

        required_fields = metric_required_fields.get(glean_type, [])
        for field in required_fields:
            if field not in glean:
                self._error(f"requires a `{field}` field for glean {glean_type} metric")


def read_annotations():
    """Read the annotations from the YAML file.
    If an error is encountered quit the program."""

    try:
        with open(annotations_filename) as annotations_file:
            annotations = sort_annotations(yaml.safe_load(annotations_file))
    except (OSError, ValueError) as e:
        sys.exit("Error parsing " + annotations_filename + ":\n" + str(e) + "\n")

    valid = True
    for name, data in annotations:
        validator = AnnotationValidator(name)
        validator.validate(data)
        valid &= validator.passed

    if not valid:
        sys.exit(1)

    return annotations


def main(output):
    yaml.safe_dump(read_annotations(), stream=output)
    return {annotations_filename}
