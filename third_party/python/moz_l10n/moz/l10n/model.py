# Copyright Mozilla Foundation
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass, field
from typing import Dict, Generic, List, Literal, Tuple, TypeVar, Union

from .formats import Format

__all__ = [
    "CatchallKey",
    "Comment",
    "Entry",
    "Expression",
    "Id",
    "Markup",
    "Message",
    "Metadata",
    "Pattern",
    "PatternMessage",
    "Resource",
    "Section",
    "SelectMessage",
    "VariableRef",
]


@dataclass
class VariableRef:
    name: str


@dataclass
class Expression:
    """
    A valid Expression must contain a non-None `arg`, `function`, or both.

    An Expression with no `function` and non-empty `options` is not valid.
    """

    arg: str | VariableRef | None
    function: str | None = None
    options: dict[str, str | VariableRef] = field(default_factory=dict)
    attributes: dict[str, str | Literal[True]] = field(default_factory=dict)


@dataclass
class Markup:
    kind: Literal["open", "standalone", "close"]
    name: str
    options: dict[str, str | VariableRef] = field(default_factory=dict)
    attributes: dict[str, str | Literal[True]] = field(default_factory=dict)


Pattern = List[Union[str, Expression, Markup]]
"""
A linear sequence of text and placeholders corresponding to potential output of a message.

String values represent literal text.
String values include all processing of the underlying text values, including escape sequence processing.
"""


@dataclass
class PatternMessage:
    """
    A message without selectors and with a single pattern.
    """

    pattern: Pattern
    declarations: dict[str, Expression] = field(default_factory=dict)

    def is_empty(self) -> bool:
        """
        Is the message's pattern empty, or consists only of empty strings?
        """
        return all(el == "" for el in self.pattern)


@dataclass
class CatchallKey:
    value: str | None = field(default=None, compare=False)
    """
    An optional string identifier for the default/catch-all variant.
    """

    def __hash__(self) -> int:
        """
        Consider all catchall-keys as equivalent to each other
        """
        return 1

    def __str__(self) -> str:
        return self.value or ""


@dataclass
class SelectMessage:
    """
    A message with one or more selectors and a corresponding number of variants.
    """

    declarations: dict[str, Expression]
    selectors: tuple[VariableRef, ...]
    variants: Dict[Tuple[Union[str, CatchallKey], ...], Pattern]

    def is_empty(self) -> bool:
        """
        Are all the message's patterns empty, or consist only of empty strings?
        """
        return all(
            all(el == "" for el in pattern) for pattern in self.variants.values()
        )

    def selector_expressions(self) -> tuple[Expression, ...]:
        return tuple(self.declarations[var.name] for var in self.selectors)


Message = Union[PatternMessage, SelectMessage]


@dataclass
class LinePos:
    """
    The source line position of an entry or section header.
    """

    start: int
    """
    The starting line of the entry or section.
    May be less than `value` if preceded by a comment.
    """

    key: int
    """
    The start line of the entry or section header key or name.
    """

    value: int
    """
    The start line of the entry pattern or section header.
    """

    end: int
    """
    The line one past the end of the entry or section header.
    """


@dataclass
class Metadata:
    """
    Metadata is attached to a resource, section, or a single entry.

    The type parameter defines the metadata value type.
    """

    key: str
    """
    A non-empty string keyword.

    Most likely a sequence of `a-z` characters,
    but may technically contain any characters
    which might require escaping in the syntax.
    """

    value: str
    """
    The metadata contents.

    Values have all their character \\escapes processed.
    """


@dataclass
class Comment:
    comment: str
    """
    A standalone comment.

    May contain multiple lines separated by newline characters.
    Lines should have any comment-start sigil and up to one space trimmed from the start,
    along with any trailing whitespace.

    An empty or whitespace-only comment will be represented by an empty string.
    """

    linepos: LinePos | None = field(default=None, compare=False)
    """
    The parsed position of the comment,
    available for some formats.
    """


V_co = TypeVar("V_co", bound=Union[Message, str], covariant=True)
"""
The Message value type.
"""

Id = Tuple[str, ...]
"""
An entry or section identifier.
"""


@dataclass
class Entry(Generic[V_co]):
    """
    A message entry.

    The first type parameter defines the Message value type,
    and the second one defines the metadata value type.
    """

    id: Id
    """
    The entry identifier.

    This MUST be a non-empty tuple of non-empty `string` values.

    The entry identifiers are not normalized,
    i.e. they do not include this identifier.

    In a valid resource, each entry has a distinct normalized identifier,
    i.e. the concatenation of its section header identifier (if any) and its own.
    """

    value: V_co
    """
    The value of an entry, i.e. the message.

    String values have all their character escapes processed.
    """

    properties: dict[str, V_co] = field(default_factory=dict)
    """
    Additional values for an entry,
    such as the attributes of a Fluent term or message.

    String values have all their character escapes processed.
    """

    comment: str = ""
    """
    A comment on this entry.

    May contain multiple lines separated by newline characters.
    Lines should have any comment-start sigil and up to one space trimmed from the start,
    along with any trailing whitespace.

    An empty or whitespace-only comment will be represented by an empty string.
    """

    meta: list[Metadata] = field(default_factory=list)
    """
    Metadata attached to this entry.
    """

    linepos: LinePos | None = field(default=None, compare=False)
    """
    The parsed position of the entry,
    available for some formats.
    """

    def get_meta(self, key: str) -> str | None:
        """
        First metadata entry with a matching `key`, if any.
        """
        return next((m.value for m in self.meta if m.key == key), None)


@dataclass
class Section(Generic[V_co]):
    """
    A section of a resource.

    The first type parameter defines the Message value type,
    and the second one defines the metadata value type.
    """

    id: Id
    """
    The section identifier.

    Each `string` part of the identifier MUST be a non-empty string.

    The top-level or anonymous section has an empty `id` array.
    The resource syntax requires this array to be non-empty
    for all sections after the first one,
    but empty identifier arrays MAY be used
    when this data model is used to represent other message resource formats,
    such as Fluent FTL files.

    The entry identifiers are not normalized,
    i.e. they do not include this identifier.
    """

    entries: list[Entry[V_co] | Comment]
    """
    Section entries consist of message entries and comments.

    Empty lines are not included in the data model.
    """

    comment: str = ""
    """
    A comment on the whole section, which applies to all of its entries.

    May contain multiple lines separated by newline characters.
    Lines should have any comment-start sigil and up to one space trimmed from the start,
    along with any trailing whitespace.

    An empty or whitespace-only comment will be represented by an empty string.
    """

    meta: list[Metadata] = field(default_factory=list)
    """
    Metadata attached to this section.
    """

    linepos: LinePos | None = field(default=None, compare=False)
    """
    The parsed position of the section,
    available for some formats.
    """

    def get_meta(self, key: str) -> str | None:
        """
        First metadata entry with a matching `key`, if any.
        """
        return next((m.value for m in self.meta if m.key == key), None)


@dataclass
class Resource(Generic[V_co]):
    """
    A message resource.

    The first type parameter defines the Message value type,
    and the second one defines the metadata value type.
    """

    format: Format | None
    """
    The serialization format for the resource, if any.
    """

    sections: list[Section[V_co]]
    """
    The body of a resource, consisting of an array of sections.

    A valid resource may have an empty sections array.
    """

    comment: str = ""
    """
    A comment on the whole resource, which applies to all of its sections and entries.

    May contain multiple lines separated by newline characters.
    Lines should have any comment-start sigil and up to one space trimmed from the start,
    along with any trailing whitespace.

    An empty or whitespace-only comment will be represented by an empty string.
    """

    meta: list[Metadata] = field(default_factory=list)
    """
    Metadata attached to the whole resource.
    """

    def all_entries(self) -> Iterator[Entry[V_co]]:
        """
        All entries in all resource sections.
        """
        return (
            entry
            for section in self.sections
            for entry in section.entries
            if isinstance(entry, Entry)
        )

    def get_meta(self, key: str) -> str | None:
        """
        First metadata entry with a matching `key`, if any.
        """
        return next((m.value for m in self.meta if m.key == key), None)
