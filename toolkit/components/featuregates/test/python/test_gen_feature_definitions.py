import json
import sys
import unittest
from os import path
from textwrap import dedent

import mozunit
import toml
import voluptuous
from io import StringIO


FEATURE_GATES_ROOT_PATH = path.abspath(
    path.join(path.dirname(__file__), path.pardir, path.pardir)
)
sys.path.append(FEATURE_GATES_ROOT_PATH)
from gen_feature_definitions import (
    ExceptionGroup,
    expand_feature,
    feature_schema,
    FeatureGateException,
    hyphens_to_camel_case,
    main,
    process_files,
)


def make_test_file_path(name):
    return path.join(FEATURE_GATES_ROOT_PATH, "test", "python", "data", name + ".toml")


def minimal_definition(**kwargs):
    defaults = {
        "id": "test-feature",
        "title": "Test Feature",
        "group": "Test Feature Group",
        "description": "A feature for testing things",
        "bug-numbers": [1479127],
        "restart-required": False,
        "type": "boolean",
    }
    defaults.update(dict([(k.replace("_", "-"), v) for k, v in kwargs.items()]))
    return defaults


class TestHyphensToCamelCase(unittest.TestCase):
    simple_cases = [
        ("", ""),
        ("singleword", "singleword"),
        ("more-than-one-word", "moreThanOneWord"),
    ]

    def test_simple_cases(self):
        for in_string, out_string in self.simple_cases:
            assert hyphens_to_camel_case(in_string) == out_string


class TestExceptionGroup(unittest.TestCase):
    def test_str_indentation_of_grouped_lines(self):
        errors = [
            Exception("single line error 1"),
            Exception("single line error 2"),
            Exception("multiline\nerror 1"),
            Exception("multiline\nerror 2"),
        ]

        assert str(ExceptionGroup(errors)) == dedent(
            """\
        There were errors while processing feature definitions:
          * single line error 1
          * single line error 2
          * multiline
            error 1
          * multiline
            error 2"""
        )


class TestFeatureGateException(unittest.TestCase):
    def test_str_no_file(self):
        error = FeatureGateException("oops")
        assert str(error) == "In unknown file: oops"

    def test_str_with_file(self):
        error = FeatureGateException("oops", filename="some/bad/file.txt")
        assert str(error) == 'In file "some/bad/file.txt":\n oops'

    def test_repr_no_file(self):
        error = FeatureGateException("oops")
        assert repr(error) == "FeatureGateException('oops', filename=None)"

    def test_repr_with_file(self):
        error = FeatureGateException("oops", filename="some/bad/file.txt")
        assert (
            repr(error) == "FeatureGateException('oops', filename='some/bad/file.txt')"
        )


class TestProcessFiles(unittest.TestCase):
    def test_valid_file(self):
        filename = make_test_file_path("good")
        result = process_files([filename])
        assert result == {
            "demo-feature": {
                "id": "demo-feature",
                "title": "demo-feature-title",
                "group": "demo-feature-group",
                "description": "demo-feature-description",
                "restartRequired": False,
                "preference": "foo.bar.baz",
                "type": "boolean",
                "bugNumbers": [1479127],
                "isPublicJexl": "true",
                "defaultValueJexl": "false",
            },
            "minimal-feature": {
                "id": "minimal-feature",
                "title": "minimal-feature-title",
                "group": "minimal-feature-group",
                "description": "minimal-feature-description",
                "restartRequired": True,
                "preference": "features.minimal-feature.enabled",
                "type": "boolean",
                "bugNumbers": [1479127],
                "isPublicJexl": "false",
                "defaultValueJexl": None,
            },
        }

    def test_invalid_toml(self):
        filename = make_test_file_path("invalid_toml")
        with self.assertRaises(ExceptionGroup) as context:
            process_files([filename])
        error_group = context.exception
        assert len(error_group.errors) == 1
        assert type(error_group.errors[0]) == FeatureGateException

    def test_empty_feature(self):
        filename = make_test_file_path("empty_feature")
        with self.assertRaises(ExceptionGroup) as context:
            process_files([filename])
        error_group = context.exception
        assert len(error_group.errors) == 1
        assert type(error_group.errors[0]) == FeatureGateException
        assert "required key not provided" in str(error_group.errors[0])

    def test_missing_file(self):
        filename = make_test_file_path("file_does_not_exist")
        with self.assertRaises(ExceptionGroup) as context:
            process_files([filename])
        error_group = context.exception
        assert len(error_group.errors) == 1
        assert type(error_group.errors[0]) == FeatureGateException
        assert "No such file or directory" in str(error_group.errors[0])


class TestFeatureSchema(unittest.TestCase):
    def make_test_features(self, *overrides):
        if len(overrides) == 0:
            overrides = [{}]
        features = {}
        for override in overrides:
            feature = minimal_definition(**override)
            feature_id = feature.pop("id")
            features[feature_id] = feature
        return features

    def test_minimal_valid(self):
        definition = self.make_test_features()
        # should not raise an exception
        feature_schema(definition)

    def test_extra_keys_not_allowed(self):
        definition = self.make_test_features({"unexpected_key": "oh no!"})
        with self.assertRaises(voluptuous.Error) as context:
            feature_schema(definition)
        assert "extra keys not allowed" in str(context.exception)

    def test_required_fields(self):
        required_keys = [
            "title",
            "description",
            "bug-numbers",
            "restart-required",
            "type",
        ]
        for key in required_keys:
            definition = self.make_test_features({"id": "test-feature"})
            del definition["test-feature"][key]
            with self.assertRaises(voluptuous.Error) as context:
                feature_schema(definition)
            assert "required key not provided" in str(context.exception)
            assert key in str(context.exception)

    def test_nonempty_keys(self):
        test_parameters = [("title", ""), ("description", ""), ("bug-numbers", [])]
        for key, empty in test_parameters:
            definition = self.make_test_features({key: empty})
            with self.assertRaises(voluptuous.Error) as context:
                feature_schema(definition)
            assert "length of value must be at least" in str(context.exception)
            assert "['{}']".format(key) in str(context.exception)


class ExpandFeatureTests(unittest.TestCase):
    def test_hyphenation_to_snake_case(self):
        feature = minimal_definition()
        assert "bug-numbers" in feature
        assert "bugNumbers" in expand_feature(feature)

    def test_default_value_default(self):
        feature = minimal_definition(type="boolean")
        assert "default-value" not in feature
        assert "defaultValue" not in feature
        assert "default-value-jexl" not in feature
        assert "defaultValueJexl" not in feature
        assert expand_feature(feature)["defaultValueJexl"] == None

    def test_default_value_override_constant(self):
        feature = minimal_definition(type="boolean", default_value_jexl="true")
        assert expand_feature(feature)["defaultValueJexl"] == "true"

    def test_default_value_override_configured_value(self):
        feature = minimal_definition(
            type="boolean", default_value_jexl="channel == nightly"
        )
        assert expand_feature(feature)["defaultValueJexl"] == "channel == nightly"

    def test_preference_default(self):
        feature = minimal_definition(type="boolean")
        assert "preference" not in feature
        assert expand_feature(feature)["preference"] == "features.test-feature.enabled"

    def test_preference_override(self):
        feature = minimal_definition(preference="test.feature.a")
        assert expand_feature(feature)["preference"] == "test.feature.a"


class MainTests(unittest.TestCase):
    def test_it_outputs_json(self):
        output = StringIO()
        filename = make_test_file_path("good")
        main(output, filename)
        output.seek(0)
        results = json.load(output)
        assert results == {
            "demo-feature": {
                "id": "demo-feature",
                "title": "demo-feature-title",
                "group": "demo-feature-group",
                "description": "demo-feature-description",
                "restartRequired": False,
                "preference": "foo.bar.baz",
                "type": "boolean",
                "bugNumbers": [1479127],
                "isPublicJexl": "true",
                "defaultValueJexl": "false",
            },
            "minimal-feature": {
                "id": "minimal-feature",
                "title": "minimal-feature-title",
                "group": "minimal-feature-group",
                "description": "minimal-feature-description",
                "restartRequired": True,
                "preference": "features.minimal-feature.enabled",
                "type": "boolean",
                "bugNumbers": [1479127],
                "isPublicJexl": "false",
                "defaultValueJexl": None,
            },
        }

    def test_it_returns_1_for_errors(self):
        output = StringIO()
        filename = make_test_file_path("invalid_toml")
        assert main(output, filename) == 1
        assert output.getvalue() == ""


if __name__ == "__main__":
    mozunit.main(*sys.argv[1:])
