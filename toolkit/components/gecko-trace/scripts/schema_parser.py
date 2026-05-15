# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.

from dataclasses import dataclass
from pathlib import Path

import yaml
from buildconfig import topsrcdir
from jsonschema import Draft202012Validator


def parse_and_validate(yaml_file_paths: list[str]) -> dict:
    """Parse and validate YAML files containing event definitions."""
    event_definitions = {}

    schema_validator = Draft202012Validator(_load_schema())

    for yaml_file_path in yaml_file_paths:
        with open(yaml_file_path) as f:
            instance = yaml.load(f, SourceTrackingLoader)

        # TODO: Add to list of errors using exception group once the minimum
        # supported python version supports it or we add the exceptiongroup
        # backport package
        for error in schema_validator.iter_errors(instance):
            raise _create_source_aware_exception(
                error, error.instance.__definition_site__
            )

        for event_name in instance.get("events", []):
            if event_name in event_definitions:
                raise _create_source_aware_exception(
                    DuplicateEventError(
                        f"The event '{event_name}' was already defined at "
                        f"{event_definitions[event_name].__definition_site__}. "
                    ),
                    event_name.__definition_site__,
                )

            event_definitions[event_name] = instance["events"][event_name]

    _validate_event_inheritance(event_definitions)

    return event_definitions


class SchemaError(Exception):
    pass


class InheritanceError(SchemaError):
    """Raised when an event tries to inherit from a non-existent event."""

    pass


class DuplicateEventError(SchemaError):
    """Raised when the same event name is defined multiple times."""

    pass


@dataclass(frozen=True)
class SourceLocation:
    """Represents a source location of a parsed YAML object."""

    file_path: Path
    start_line: int
    start_column: int
    end_line: int
    end_column: int

    @classmethod
    def from_node(cls, node) -> "SourceLocation":
        return cls(
            file_path=Path(node.start_mark.name).relative_to(topsrcdir),
            # YAML line numbers are 0-based, we want 1-based for user display
            start_line=node.start_mark.line + 1,
            start_column=node.start_mark.column,
            end_line=node.end_mark.line + 1,
            end_column=node.end_mark.column,
        )

    def __str__(self) -> str:
        return f"{self.file_path.as_posix()}:{self.start_line}:{self.start_column}"


class SourceTrackingLoader(yaml.SafeLoader):
    """A custom YAML loader that tracks the source location of parsed objects."""

    def construct_object(self, node, deep=False):
        # We need to pass `deep=True` so that the `BaseConstructor.construct_object`
        # fully evaluates the returned `data` object instead of returning an
        # empty dict.
        #
        # See: https://github.com/yaml/pyyaml/blob/69c141adcf805c5ebdc9ba519927642ee5c7f639/lib/yaml/constructor.py#L106
        data = super().construct_object(node, deep=True)
        base_class = type(data)
        # TODO: Implement a cache for this
        source_tracked_class = type(
            f"SourceTracking{base_class.__name__.title()}",
            (base_class,),
            {"__definition_site__": SourceLocation.from_node(node)},
        )
        return source_tracked_class(data)


def _load_schema():
    """Load the GeckoTrace schema from the YAML file."""
    schema_path = Path(__file__).parent / "gecko-trace.schema.yaml"

    with open(schema_path) as f:
        schema = yaml.safe_load(f)

    return schema


def _validate_event_inheritance(event_definitions):
    """Verifies that all event inheritance references are valid."""
    for event_name, event in event_definitions.items():
        parent_events = event.get("inherits_from", [])

        for parent_name in parent_events:
            if parent_name not in event_definitions:
                raise _create_source_aware_exception(
                    InheritanceError(
                        f"Event '{event_name}' inherits from '{parent_name}', "
                        "which is not a defined event."
                    ),
                    parent_name.__definition_site__,
                )


def _create_source_aware_exception(
    original_exception: Exception, source_location: SourceLocation
) -> Exception:
    """Enhances a standard exception with rich, user-friendly source location context."""
    base_class = type(original_exception)

    original_exception_str = str(original_exception)

    def __str__(self) -> str:
        """Creates a rich, formatted output with syntax highlighting."""
        # Imported here to keep the startup time of the script low.
        import linecache
        from io import StringIO

        from rich.console import Console
        from rich.constrain import Constrain
        from rich.panel import Panel
        from rich.syntax import Syntax

        buffer = StringIO()
        console = Console(file=buffer, color_system="truecolor")

        console.print(original_exception_str)

        console.print()
        console.print(f" The error occurred in {source_location}")
        console.print()

        # We show a few lines of context around the error to make it easier to
        # understand the surrounding code.
        extra_lines = 3
        code_lines = linecache.getlines(
            str(Path(topsrcdir) / source_location.file_path)
        )
        syntax = Syntax(
            "".join(code_lines),
            "yaml",
            theme="github-dark",
            line_numbers=True,
            line_range=(
                source_location.start_line - extra_lines,
                source_location.start_line + extra_lines,
            ),
            # All lines that are part of the error are highlighted.
            highlight_lines=range(
                source_location.start_line, source_location.end_line + 1
            ),
            word_wrap=False,
            indent_guides=True,
            dedent=False,
        )
        syntax.stylize_range(
            style="traceback.error_range",
            start=(
                source_location.start_line,
                source_location.start_column,
            ),
            end=(
                source_location.end_line,
                source_location.end_column,
            ),
        )
        console.print(
            # The code panel is constrained to a reasonable width, so it doesn't
            # overflow the screen on small terminals.
            Constrain(
                Panel(
                    syntax,
                    border_style="traceback.border.syntax_error",
                    expand=True,
                    padding=(0, 1),
                ),
                80,
            )
        )

        return buffer.getvalue().strip()

    original_exception.__class__ = type(
        f"{base_class.__name__}",
        (base_class,),
        {
            "__str__": __str__,
        },
    )

    return original_exception
