#!/usr/bin/env python3

# Copyright (C) 2014 The Android Open Source Project
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
Enforces common Android public API design patterns.  It ignores lint messages from
a previous API level, if provided.

Usage: apilint.py current.txt
Usage: apilint.py current.txt previous.txt

You can also splice in blame details like this:
$ git blame api/current.txt -t -e > /tmp/currentblame.txt
$ apilint.py /tmp/currentblame.txt previous.txt --no-color
"""

import argparse
import collections
import json
import os
import re
import sys

BLACK, RED, GREEN, YELLOW, BLUE, MAGENTA, CYAN, WHITE = range(8)

ALLOW_GOOGLE = False
USE_COLOR = True

DEPRECATED_ANNOTATION = "java.lang.Deprecated"
DEPRECATION_SCHEDULE_ANNOTATION = None
LIBRARY_VERSION = None

PRIMITIVE_TYPES = ["boolean", "byte", "char", "short", "int", "long", "float", "double"]


def format(fg=None, bg=None, bright=False, bold=False, dim=False, reset=False):
    # manually derived from http://en.wikipedia.org/wiki/ANSI_escape_code#Codes
    if not USE_COLOR:
        return ""
    codes = []
    if reset:
        codes.append("0")
    else:
        if not fg is None:
            codes.append("3%d" % (fg))
        if not bg is None:
            if not bright:
                codes.append("4%d" % (bg))
            else:
                codes.append("10%d" % (bg))
        if bold:
            codes.append("1")
        elif dim:
            codes.append("2")
        else:
            codes.append("22")
    return "\033[%sm" % (";".join(codes))


def ident(raw):
    """Strips superficial signature changes, giving us a strong key that
    can be used to identify members across API levels."""
    raw = raw.replace(" deprecated ", " ")
    raw = raw.replace(" synchronized ", " ")
    raw = raw.replace(" final ", " ")
    raw = re.sub("<.+?>", "", raw)
    if " throws " in raw:
        raw = raw[: raw.index(" throws ")]
    return raw


class Annotation:
    def parse_line(self, line):
        line = line.strip()
        arg_begin = line.find("(")
        arg_end = line.find(")")

        if arg_begin == -1 or arg_end == -1:
            return (line, [])

        raw = line[:arg_begin]
        arguments = collect_chunks(line[arg_begin + 1 : arg_end], ",")
        return (raw, arguments)

    def parse_value(self, value):
        # Remove surrounding quotes
        if value.startswith('"'):
            return value[1:-1]
        return value

    def parse_arguments(self, arguments):
        parsed = {}
        for argument in arguments:
            equal_sign = argument.find("=")
            parsed[argument[:equal_sign]] = self.parse_value(argument[equal_sign + 1 :])
        return parsed

    def __init__(self, clazz, source, location, raw, blame, imports):
        self.raw = raw[1:]
        (raw, arguments) = self.parse_line(raw)
        self.clazz = clazz
        self.location = location
        self.typ = Type(clazz, self, raw[1:], location, blame, imports)
        self.blame = blame
        self.source = source
        self.arguments = self.parse_arguments(arguments)
        self.ident = self.typ.name + str(self.arguments)

    def __hash__(self):
        return hash(self.raw)

    def __repr__(self):
        return self.raw


class Field:
    def __init__(self, clazz, location, raw, blame, imports):
        self.clazz = clazz
        self.location = location
        self.raw = raw.strip(" {;")
        self.blame = blame
        self.source = None

        raw = collect_chunks(raw, r"[\s;]")
        self.split = list(raw)

        for r in [
            "field",
            "enum_constant",
            "volatile",
            "transient",
            "public",
            "protected",
            "static",
            "final",
            "deprecated",
        ]:
            while r in raw:
                raw.remove(r)

        self.annotations = [
            Annotation(clazz, self, location, a, blame, imports)
            for a in raw
            if a.startswith("@")
        ]

        raw = [x for x in raw if not x.startswith("@")]

        self.typ = Type(clazz, self, raw[0], location, blame, imports)
        self.name = raw[1].strip(";")
        if len(raw) >= 4 and raw[2] == "=":
            self.value = raw[3].strip(';"')
        else:
            self.value = None

        self.ident = "field %s %s = %s;" % (self.typ.ident(), self.name, self.value)

    def __hash__(self):
        return hash(self.raw)

    def __repr__(self):
        return self.raw


class Argument:
    def __init__(self, clazz, source, raw, location, blame, imports):
        raw = collect_chunks(raw, r"\s")
        self.annotations = [
            Annotation(clazz, self, location, a, blame, imports)
            for a in raw
            if a.startswith("@")
        ]
        raw = [x for x in raw if not x.startswith("@")]

        self.typ = Type(clazz, source, " ".join(raw), location, blame, imports)
        self.location = location
        self.blame = blame
        self.clazz = clazz
        self.source = source

    def __repr__(self):
        return (
            " ".join("@" + repr(x) for x in self.annotations) + " " + repr(self.typ)
        ).strip()


def collect_chunks(line, separator, separator_len=1):
    chunks = []
    unparsed = line.strip()
    while unparsed != "":
        chunk, unparsed = find_next_chunk(unparsed, separator, separator_len)
        unparsed = unparsed.strip()
        chunks.append(chunk.strip())
    return chunks


# Finds the next chunk in line, considers everything between '<' and '>', '('
# and ')' to be part of the same chunk, so e.g.  "TestClass<A extends B>" or
# "function(int a)" is considered one chunk
def find_next_chunk(unparsed, separator, separator_len=1):
    caret = 0
    parens = 0
    for i in range(1, len(unparsed) + 1):
        if unparsed[i - 1] == "<":
            caret += 1
        elif unparsed[i - 1] == ">":
            caret -= 1
        elif unparsed[i - 1] == "(":
            parens += 1
        elif unparsed[i - 1] == ")":
            parens -= 1
        elif (
            i >= separator_len
            and re.match(separator, unparsed[i - separator_len : i])
            and caret == 0
            and parens == 0
        ):
            return (unparsed[0 : i - separator_len], unparsed[i:].strip())
    # only one chunk
    return (unparsed, "")


class Method:
    def arguments(self, raw):
        line = " ".join(raw)
        arg_begin = line.find("(")
        arg_end = line.find(")")

        arguments = collect_chunks(line[arg_begin + 1 : arg_end], ",")
        return arguments

    def __init__(self, clazz, location, raw, blame, imports):
        self.clazz = clazz
        self.location = location
        self.raw = raw.strip(" {;")
        self.blame = blame
        self.source = None

        raw = collect_chunks(raw, r"\s")

        for r in ["", ";"]:
            while r in raw:
                raw.remove(r)
        self.split = list(raw)

        if raw[0] == "method":
            raw = raw[1:]

        for r in [
            "public",
            "protected",
            "static",
            "final",
            "synchronized",
            "deprecated",
            "abstract",
            "default",
        ]:
            while r in raw:
                raw.remove(r)

        self.annotations = [
            Annotation(clazz, self, location, a, blame, imports)
            for a in raw
            if a.startswith("@")
        ]

        raw = [x for x in raw if not x.startswith("@")]

        if raw[0].startswith("<"):
            self.generics = Type(clazz, self, raw[0], location, blame, imports).generics
            raw = raw[1:]
        else:
            self.generics = []

        typ_name = raw[0] if raw[0] != "ctor" else clazz.fullname
        self.typ = Type(clazz, self, typ_name, location, blame, imports)

        self.name = raw[1]
        self.args = []
        self.throws = []

        # TODO: throws
        for r in self.arguments(raw):
            self.args.append(Argument(clazz, self, r, location, blame, imports))

        self.ident = "method %s %s(%s);" % (
            self.typ.ident(),
            self.name,
            ", ".join(x.typ.ident() for x in self.args),
        )

    def __hash__(self):
        return hash(self.raw)

    def __repr__(self):
        return self.raw


class Type:
    def __init__(self, clazz, source, raw, location, blame, imports):
        self.location = location
        self.blame = blame
        self.source = source
        self.raw = raw

        raw = collect_chunks(raw, "extends", len("extends"))
        if len(raw) > 1:
            extends = collect_chunks(raw[1], "&")
            self.extends = [
                Type(clazz, self, e, location, blame, imports) for e in extends
            ]
        else:
            self.extends = []

        raw = raw[0]
        if "<" in raw:
            generics_string = raw[raw.find("<") + 1 : raw.rfind(">")]
            self.generics = [
                Type(clazz, self, x, location, blame, imports)
                for x in collect_chunks(generics_string, ",")
            ]
            raw = raw[: raw.find("<")]
        else:
            self.generics = []

        self.is_array = False
        self.is_var_arg = False
        if raw.endswith("[]"):
            while raw.endswith("[]"):
                raw = raw[:-2]
            self.name = self.resolve(raw, imports)
            self.is_array = True
        elif raw.endswith("..."):
            self.name = self.resolve(raw[:-3], imports)
            self.is_var_arg = True
        else:
            self.name = self.resolve(raw, imports)

    def resolve(self, name, imports):
        # Never resolve primitive types
        if name in PRIMITIVE_TYPES:
            return name

        split = name.split(".")
        if split[0] in imports:
            resolved = ".".join([imports[split[0]]] + split[1:])
            return resolved
        return name

    def ident(self):
        result = self.name
        if self.generics:
            result += "<" + ", ".join(x.ident() for x in self.generics) + ">"
        if self.extends:
            result += " extends " + " & ".join(x.ident() for x in self.extends)
        return result

    def __repr__(self):
        return self.ident()


class Location:
    def __init__(self, fileName, line, column):
        self.fileName = fileName
        self.line = line
        self.column = column

    def __repr__(self):
        return (
            os.path.relpath(self.fileName)
            + ":"
            + str(self.line)
            + ":"
            + str(self.column)
        )


class Class:
    def __init__(self, pkg, location, raw, blame, imports):
        self.pkg = pkg
        self.location = location
        self.raw = raw.strip(" {;")
        self.blame = blame
        self.ctors = []
        self.fields = []
        self.methods = []
        self.source = None

        raw = collect_chunks(self.raw, r"\s")
        self.split = list(raw)
        self.isEnum = False
        if "class" in raw:
            self.fullname = raw[raw.index("class") + 1]
        elif "interface" in raw:
            self.fullname = raw[raw.index("interface") + 1]
        elif "enum" in raw:
            self.fullname = raw[raw.index("enum") + 1]
            self.isEnum = True
        else:
            raise ValueError("Funky class type %s" % (self.raw))

        if "extends" in raw:
            self.extends = Type(
                self, None, raw[raw.index("extends") + 1], location, blame, imports
            )
            self.extends_path = collect_chunks(self.extends.name, r"\.")
        else:
            self.extends = None
            self.extends_path = []

        if "implements" in raw:
            self.implements = [
                Type(self, None, r, location, blame, imports)
                for r in raw[raw.index("implements") + 1 :]
            ]
        else:
            self.implements = []

        self.annotations = [
            Annotation(self, None, location, a, blame, imports)
            for a in raw
            if a.startswith("@")
        ]

        if "<" in self.fullname:
            self.generics = Type(
                self, None, self.fullname, location, blame, imports
            ).generics
            self.fullname = re.sub("<.+?>", "", self.fullname)
        else:
            self.generics = []

        self.fullname = self.pkg.name + "." + self.fullname
        self.fullname_path = self.fullname.split(".")

        self.name = self.fullname[self.fullname.rindex(".") + 1 :]

    def __hash__(self):
        return hash((
            self.raw,
            tuple(self.ctors),
            tuple(self.fields),
            tuple(self.methods),
        ))

    def __repr__(self):
        return self.raw


class Package:
    def __init__(self, location, raw, blame):
        self.location = location
        self.raw = raw.strip(" {;")
        self.blame = blame
        self.source = None

        raw = raw.split()
        self.name = raw[raw.index("package") + 1]
        self.name_path = self.name.split(".")

    def __repr__(self):
        return self.raw


def _parse_stream(f, api_map, clazz_cb=None):
    line = 0
    api = {}
    pkg = None
    clazz = None
    blame = None
    imports = {}

    re_blame = re.compile(r"^([a-z0-9]{7,}) \(<([^>]+)>.+?\) (.+?)$")
    for raw in f:
        line += 1
        raw = raw.rstrip()
        match = re_blame.match(raw)
        if match is not None:
            blame = match.groups()[0:2]
            raw = match.groups()[2]
        else:
            blame = None

        location = read_map(api_map, line)
        if raw.startswith("import"):
            imp = raw[raw.index("import") + 7 : -1]
            imports[imp.split(".")[-1]] = imp
        elif raw.startswith("package"):
            pkg = Package(location, raw, blame)
        elif raw.startswith("  ") and raw.endswith("{"):
            # When provided with class callback, we treat as incremental
            # parse and don't build up entire API
            if clazz and clazz_cb:
                clazz_cb(clazz)
            clazz = Class(pkg, location, raw, blame, imports)
            api[clazz.fullname] = clazz
        elif raw.startswith("    ctor"):
            clazz.ctors.append(Method(clazz, location, raw, blame, imports))
        elif raw.startswith("    method"):
            clazz.methods.append(Method(clazz, location, raw, blame, imports))
        elif raw.startswith("    field"):
            clazz.fields.append(Field(clazz, location, raw, blame, imports))
        elif raw.startswith("    enum_constant"):
            clazz.fields.append(Field(clazz, location, raw, blame, imports))

    # Handle last trailing class
    if clazz and clazz_cb:
        clazz_cb(clazz)

    return api


class Failure:
    def __init__(self, sig, clazz, detail, error, rule, msg):
        self.sig = sig
        self.error = error
        self.rule = rule
        self.msg = msg
        self.clazz = clazz
        self.detail = detail

        if error:
            self.head = "Error %s" % (rule) if rule else "Error"
            dump = "%s%s:%s %s" % (
                format(fg=RED, bg=BLACK, bold=True),
                self.head,
                format(reset=True),
                msg,
            )
        else:
            self.head = "Warning %s" % (rule) if rule else "Warning"
            dump = "%s%s:%s %s" % (
                format(fg=YELLOW, bg=BLACK, bold=True),
                self.head,
                format(reset=True),
                msg,
            )

        self.location = clazz.location
        blame = clazz.blame
        if detail is not None:
            self.location = detail.location
            blame = detail.blame
            while detail is not None:
                dump += "\n    in " + repr(detail)
                detail = detail.source
        dump += "\n    in " + repr(clazz)
        dump += "\n    in " + repr(clazz.pkg)
        dump += "\n    at line " + repr(self.location)
        if blame is not None:
            dump += "\n    last modified by %s in %s" % (blame[1], blame[0])

        self.dump = dump

    def __repr__(self):
        return self.dump

    def json(self):
        return {
            "rule": self.rule,
            "msg": self.msg,
            "error": self.error,
            "detail": repr(self.detail),
            "file": self.location.fileName,
            "line": int(self.location.line),
            "column": int(self.location.column),
            "class": repr(self.clazz),
            "pkg": repr(self.clazz.pkg),
        }


def read_map(api_map, lineNumber):
    if api_map is None or (lineNumber - 1) >= len(api_map):
        return Location("api.txt", lineNumber, 0)
    mapString = api_map[lineNumber - 1].strip()
    if not mapString:
        return Location("api.txt", lineNumber, 0)
    m = re.match(r"(.*?):(\d+):(\d+)$", mapString)
    return Location(m.group(1), m.group(2), m.group(3))


failures = {}


def _fail(clazz, detail, error, rule, msg):
    """Records an API failure to be processed later."""

    sig = "%s-%s-%s" % (clazz.fullname, repr(detail), msg)
    sig = sig.replace(" deprecated ", " ")

    failures[sig] = Failure(sig, clazz, detail, error, rule, msg)


def warn(clazz, detail, rule, msg):
    _fail(clazz, detail, False, rule, msg)


def error(clazz, detail, rule, msg):
    _fail(clazz, detail, True, rule, msg)


noticed = {}


def notice(clazz):

    noticed[clazz.fullname] = clazz


def verify_constants(clazz):
    """All static final constants must be FOO_NAME style."""
    if re.match(r"android\.R\.[a-z]+", clazz.fullname):
        return
    if clazz.fullname.startswith("android.os.Build"):
        return
    if clazz.fullname == "android.system.OsConstants":
        return

    req = [
        "java.lang.String",
        "byte",
        "short",
        "int",
        "long",
        "float",
        "double",
        "boolean",
        "char",
    ]
    for f in clazz.fields:
        if "static" in f.split and "final" in f.split:
            if re.match("[A-Z0-9_]+", f.name) is None:
                error(clazz, f, "C2", "Constant field names must be FOO_NAME")
            if f.typ != "java.lang.String":
                if f.name.startswith("MIN_") or f.name.startswith("MAX_"):
                    warn(
                        clazz,
                        f,
                        "C8",
                        "If min/max could change in future, make them dynamic methods",
                    )
            if f.typ in req and f.value is None:
                error(clazz, f, None, "All constants must be defined at compile time")


def verify_enums(clazz):
    """Enums are bad, mmkay?"""
    if "extends java.lang.Enum" in clazz.raw:
        error(clazz, None, "F5", "Enums are not allowed")


def verify_class_names(clazz):
    """Try catching malformed class names like myMtp or MTPUser."""
    if clazz.fullname.startswith("android.opengl"):
        return
    if clazz.fullname.startswith("android.renderscript"):
        return
    if re.match(r"android\.R\.[a-z]+", clazz.fullname):
        return

    if re.search("[A-Z]{2,}", clazz.name) is not None:
        warn(clazz, None, "S1", "Class names with acronyms should be Mtp not MTP")
    if re.match("[^A-Z]", clazz.name):
        error(clazz, None, "S1", "Class must start with uppercase char")
    if clazz.name.endswith("Impl"):
        error(clazz, None, None, "Don't expose your implementation details")


def verify_method_names(clazz):
    """Try catching malformed method names, like Foo() or getMTU()."""
    if clazz.fullname.startswith("android.opengl"):
        return
    if clazz.fullname.startswith("android.renderscript"):
        return
    if clazz.fullname == "android.system.OsConstants":
        return

    for m in clazz.methods:
        if re.search("[A-Z]{2,}", m.name) is not None:
            warn(
                clazz,
                m,
                "S1",
                "Method names with acronyms should be getMtu() instead of getMTU()",
            )
        if re.match("[^a-z]", m.name):
            error(clazz, m, "S1", "Method name must start with lowercase char")


def verify_callbacks(clazz):
    """Verify Callback classes.
    All callback classes must be abstract.
    All methods must follow onFoo() naming style."""
    if clazz.fullname == "android.speech.tts.SynthesisCallback":
        return

    if clazz.name.endswith("Callbacks"):
        error(clazz, None, "L1", "Callback class names should be singular")
    if clazz.name.endswith("Observer"):
        warn(clazz, None, "L1", "Class should be named FooCallback")

    if clazz.name.endswith("Callback"):
        if "interface" in clazz.split:
            error(
                clazz,
                None,
                "CL3",
                "Callbacks must be abstract class to enable extension in future API levels",
            )

        for m in clazz.methods:
            if not re.match("on[A-Z][a-z]*", m.name):
                error(clazz, m, "L1", "Callback method names must be onFoo() style")


def verify_listeners(clazz):
    """Verify Listener classes.
    All Listener classes must be interface.
    All methods must follow onFoo() naming style.
    If only a single method, it must match class name:
        interface OnFooListener { void onFoo() }"""

    if clazz.name.endswith("Listener"):
        if " abstract class " in clazz.raw:
            error(
                clazz,
                None,
                "L1",
                "Listeners should be an interface, or otherwise renamed Callback",
            )

        for m in clazz.methods:
            if not re.match("on[A-Z][a-z]*", m.name):
                error(clazz, m, "L1", "Listener method names must be onFoo() style")

        if len(clazz.methods) == 1 and clazz.name.startswith("On"):
            m = clazz.methods[0]
            if (m.name + "Listener").lower() != clazz.name.lower():
                error(
                    clazz, m, "L1", "Single listener method name must match class name"
                )


def verify_actions(clazz):
    """Verify intent actions.
    All action names must be named ACTION_FOO.
    All action values must be scoped by package and match name:
        package android.foo {
            String ACTION_BAR = "android.foo.action.BAR";
        }"""
    for f in clazz.fields:
        if f.value is None:
            continue
        if f.name.startswith("EXTRA_"):
            continue
        if f.name in {"SERVICE_INTERFACE", "PROVIDER_INTERFACE"}:
            continue
        if "INTERACTION" in f.name:
            continue

        if (
            "static" in f.split
            and "final" in f.split
            and f.typ.name == "java.lang.String"
        ):
            if (
                "_ACTION" in f.name
                or "ACTION_" in f.name
                or ".action." in f.value.lower()
            ):
                if not f.name.startswith("ACTION_"):
                    error(
                        clazz, f, "C3", "Intent action constant name must be ACTION_FOO"
                    )
                else:
                    if clazz.fullname == "android.content.Intent":
                        prefix = "android.intent.action"
                    elif clazz.fullname == "android.provider.Settings":
                        prefix = "android.settings"
                    elif clazz.fullname in {
                        "android.app.admin.DevicePolicyManager",
                        "android.app.admin.DeviceAdminReceiver",
                    }:
                        prefix = "android.app.action"
                    else:
                        prefix = clazz.pkg.name + ".action"
                    expected = prefix + "." + f.name[7:]
                    if f.value != expected:
                        error(
                            clazz,
                            f,
                            "C4",
                            "Inconsistent action value; expected '%s'" % (expected),
                        )


def verify_extras(clazz):
    """Verify intent extras.
    All extra names must be named EXTRA_FOO.
    All extra values must be scoped by package and match name:
        package android.foo {
            String EXTRA_BAR = "android.foo.extra.BAR";
        }"""
    if clazz.fullname == "android.app.Notification":
        return
    if clazz.fullname == "android.appwidget.AppWidgetManager":
        return

    for f in clazz.fields:
        if f.value is None:
            continue
        if f.name.startswith("ACTION_"):
            continue

        if (
            "static" in f.split
            and "final" in f.split
            and f.typ.name == "java.lang.String"
        ):
            if "_EXTRA" in f.name or "EXTRA_" in f.name or ".extra" in f.value.lower():
                if not f.name.startswith("EXTRA_"):
                    error(clazz, f, "C3", "Intent extra must be EXTRA_FOO")
                else:
                    if clazz.pkg.name == "android.content" and clazz.name == "Intent":
                        prefix = "android.intent.extra"
                    elif clazz.pkg.name == "android.app.admin":
                        prefix = "android.app.extra"
                    else:
                        prefix = clazz.pkg.name + ".extra"
                    expected = prefix + "." + f.name[6:]
                    if f.value != expected:
                        error(
                            clazz,
                            f,
                            "C4",
                            "Inconsistent extra value; expected '%s'" % (expected),
                        )


def verify_equals(clazz):
    """Verify that equals() and hashCode() must be overridden together."""
    eq = False
    hc = False
    for m in clazz.methods:
        if " static " in m.raw:
            continue
        if "boolean equals(java.lang.Object)" in m.raw:
            eq = True
        if "int hashCode()" in m.raw:
            hc = True
    if eq != hc:
        error(clazz, None, "M8", "Must override both equals and hashCode; missing one")


def verify_parcelable(clazz):
    """Verify that Parcelable objects aren't hiding required bits."""
    if "implements android.os.Parcelable" in clazz.raw:
        creator = [i for i in clazz.fields if i.name == "CREATOR"]
        write = [i for i in clazz.methods if i.name == "writeToParcel"]
        describe = [i for i in clazz.methods if i.name == "describeContents"]

        if len(creator) == 0 or len(write) == 0 or len(describe) == 0:
            error(
                clazz,
                None,
                "FW3",
                "Parcelable requires CREATOR, writeToParcel, and describeContents; missing one",
            )

        if (" final class " not in clazz.raw) and (
            " final deprecated class " not in clazz.raw
        ):
            error(clazz, None, "FW8", "Parcelable classes must be final")

        for c in clazz.ctors:
            if len(c.args) == 1 and c.args[0].typ.name == "android.os.Parcel":
                error(
                    clazz,
                    c,
                    "FW3",
                    "Parcelable inflation is exposed through CREATOR, not raw constructors",
                )


def verify_protected(clazz):
    """Verify that no protected methods or fields are allowed."""
    for m in clazz.methods:
        if "protected" in m.split:
            error(clazz, m, "M7", "Protected methods not allowed; must be public")
    for f in clazz.fields:
        if "protected" in f.split:
            error(clazz, f, "M7", "Protected fields not allowed; must be public")


def verify_final_fields_only_class(clazz):
    if clazz.methods or not clazz.fields:
        # Not a final field-only class
        return

    for f in clazz.fields:
        if "final" not in f.split:
            # Not a final field-only class
            return

    if not clazz.ctors:
        error(
            clazz,
            None,
            "GV1",
            "Field-only classes need at least one constructor for mocking.",
        )

    if "final" in clazz.split:
        error(clazz, None, "GV2", "Field-only classes should not be final for mocking.")


def verify_threading_annotations(clazz):
    THREADING_ANNOTATIONS = [
        "android.support.annotation.MainThread",
        "android.support.annotation.UiThread",
        "android.support.annotation.WorkerThread",
        "android.support.annotation.BinderThread",
        "android.support.annotation.AnyThread",
        "androidx.annotation.MainThread",
        "androidx.annotation.UiThread",
        "androidx.annotation.WorkerThread",
        "androidx.annotation.BinderThread",
        "androidx.annotation.AnyThread",
        "org.mozilla.geckoview.HandlerThread",
    ]

    # If the annotation is on the class than it applies to every method
    for a in clazz.annotations:
        if a.typ.name in THREADING_ANNOTATIONS:
            return []

    # Otherwise check all methods
    for f in clazz.methods:
        has_annotation = False
        for a in f.annotations:
            if a.typ.name in THREADING_ANNOTATIONS:
                has_annotation = True
        if not has_annotation:
            error(
                clazz,
                f,
                "GV3",
                "Method missing threading annotation. Needs "
                "one of: @MainThread, @UiThread, @WorkerThread, "
                "@BinderThread, @AnyThread, @HandlerThread.",
            )


def verify_nullability_annotations(clazz):
    NULLABILITY_ANNOTATIONS = [
        "android.support.annotation.NonNull",
        "android.support.annotation.Nullable",
        "androidx.annotation.NonNull",
        "androidx.annotation.Nullable",
    ]

    if clazz.isEnum:
        # Enum's have methods which are not under the developer control.
        return

    def has_nullability_annotation(subject):
        # We don't need nullability annotations for primitive types or void
        if not subject.typ.is_array and (
            subject.typ.name == "void" or subject.typ.name in PRIMITIVE_TYPES
        ):
            return True
        for a in subject.annotations:
            if a.typ.name in NULLABILITY_ANNOTATIONS:
                return True
        return False

    for f in clazz.methods:
        if not has_nullability_annotation(f):
            error(
                clazz,
                f,
                "GV4",
                "Missing return type nullability "
                "annotation. Needs one of @Nullable, @NonNull.",
            )
        for a in f.args:
            if not has_nullability_annotation(a):
                error(
                    clazz,
                    a,
                    "GV5",
                    "Missing argument type nullability "
                    "annotation. Needs one of @Nullable, @NonNull.",
                )
    for f in clazz.fields:
        if "final" in f.split and "static" in f.split:
            # We don't need nullability annotation if the value can't change
            continue
        if not has_nullability_annotation(f):
            error(
                clazz,
                f,
                "GV4",
                "Missing field type nullability "
                "annotation. Needs one of @Nullable, @NonNull.",
            )


def verify_default_impl(clazz):
    if "interface" not in clazz.split:
        return

    if len(clazz.methods) == 1:
        # Interfaces with just one method are "functional interfaces" and need
        # to be abstract
        return

    for f in clazz.methods:
        if "default" not in f.split and "static" not in f.split:
            error(
                clazz,
                f,
                "GV6",
                "All interface methods should have a default "
                "implementation for backwards compatibility",
            )


def verify_fields(clazz):
    """Verify that all exposed fields are final.
    Exposed fields must follow myName style.
    Catch internal mFoo objects being exposed."""

    for f in clazz.fields:
        if re.match("[ms][A-Z]", f.name):
            error(clazz, f, "F1", "Internal objects must not be exposed")

        if re.match("[A-Z_]+", f.name):
            if "static" not in f.split or "final" not in f.split:
                error(clazz, f, "C2", "Constants must be marked static final")


def verify_register(clazz):
    """Verify parity of registration methods.
    Callback objects use register/unregister methods.
    Listener objects use add/remove methods."""
    methods = [m.name for m in clazz.methods]
    for m in clazz.methods:
        if "Callback" in m.raw:
            if m.name.startswith("register"):
                other = "unregister" + m.name[8:]
                if other not in methods:
                    error(clazz, m, "L2", "Missing unregister method")
            if m.name.startswith("unregister"):
                other = "register" + m.name[10:]
                if other not in methods:
                    error(clazz, m, "L2", "Missing register method")

            if m.name.startswith("add") or m.name.startswith("remove"):
                error(
                    clazz,
                    m,
                    "L3",
                    "Callback methods should be named register/unregister",
                )

        if "Listener" in m.raw:
            if m.name.startswith("add"):
                other = "remove" + m.name[3:]
                if other not in methods:
                    error(clazz, m, "L2", "Missing remove method")
            if m.name.startswith("remove") and not m.name.startswith("removeAll"):
                other = "add" + m.name[6:]
                if other not in methods:
                    error(clazz, m, "L2", "Missing add method")

            if m.name.startswith("register") or m.name.startswith("unregister"):
                error(clazz, m, "L3", "Listener methods should be named add/remove")


def verify_sync(clazz):
    """Verify synchronized methods aren't exposed."""
    for m in clazz.methods:
        if "synchronized" in m.split:
            error(clazz, m, "M5", "Internal locks must not be exposed")


def verify_intent_builder(clazz):
    """Verify that Intent builders are createFooIntent() style."""
    if clazz.name == "Intent":
        return

    for m in clazz.methods:
        if m.typ.name == "android.content.Intent":
            if m.name.startswith("create") and m.name.endswith("Intent"):
                pass
            else:
                warn(
                    clazz,
                    m,
                    "FW1",
                    "Methods creating an Intent should be named createFooIntent()",
                )


def verify_helper_classes(clazz):
    """Verify that helper classes are named consistently with what they extend.
    All developer extendable methods should be named onFoo()."""
    test_methods = False
    if "extends android.app.Service" in clazz.raw:
        test_methods = True
        if not clazz.name.endswith("Service"):
            error(clazz, None, "CL4", "Inconsistent class name; should be FooService")

        for f in clazz.fields:
            if f.name == "SERVICE_INTERFACE":
                if f.value != clazz.fullname:
                    error(
                        clazz,
                        f,
                        "C4",
                        "Inconsistent interface constant; expected '%s'"
                        % (clazz.fullname),
                    )

    if "extends android.content.ContentProvider" in clazz.raw:
        test_methods = True
        if not clazz.name.endswith("Provider"):
            error(clazz, None, "CL4", "Inconsistent class name; should be FooProvider")

        for f in clazz.fields:
            if f.name == "PROVIDER_INTERFACE":
                if f.value != clazz.fullname:
                    error(
                        clazz,
                        f,
                        "C4",
                        "Inconsistent interface constant; expected '%s'"
                        % (clazz.fullname),
                    )

    if "extends android.content.BroadcastReceiver" in clazz.raw:
        test_methods = True
        if not clazz.name.endswith("Receiver"):
            error(clazz, None, "CL4", "Inconsistent class name; should be FooReceiver")

    if "extends android.app.Activity" in clazz.raw:
        test_methods = True
        if not clazz.name.endswith("Activity"):
            error(clazz, None, "CL4", "Inconsistent class name; should be FooActivity")

    if test_methods:
        for m in clazz.methods:
            if "final" in m.split:
                continue
            if not re.match("on[A-Z]", m.name):
                if "abstract" in m.split:
                    warn(
                        clazz,
                        m,
                        None,
                        "Methods implemented by developers should be named onFoo()",
                    )
                else:
                    warn(
                        clazz,
                        m,
                        None,
                        "If implemented by developer, should be named onFoo(); otherwise consider marking final",
                    )


def verify_builder(clazz):
    """Verify builder classes.
    Methods should return the builder to enable chaining."""
    if " extends " in clazz.raw:
        return
    if not clazz.name.endswith("Builder"):
        return

    if clazz.name != "Builder":
        warn(clazz, None, None, "Builder should be defined as inner class")

    has_build = False
    for m in clazz.methods:
        if m.name == "build":
            has_build = True
            continue

        if m.name.startswith("get"):
            continue
        if m.name.startswith("clear"):
            continue

        if m.name.startswith("with"):
            warn(clazz, m, None, "Builder methods names should use setFoo() style")

        if m.name.startswith("set"):
            if not m.typ.name.endswith(clazz.fullname):
                warn(clazz, m, "M4", "Methods must return the builder object")

    if not has_build:
        warn(clazz, None, None, "Missing build() method")


def verify_aidl(clazz):
    """Catch people exposing raw AIDL."""
    if (
        "extends android.os.Binder" in clazz.raw
        or "implements android.os.IInterface" in clazz.raw
    ):
        error(clazz, None, None, "Raw AIDL interfaces must not be exposed")


def verify_internal(clazz):
    """Catch people exposing internal classes."""
    if clazz.pkg.name.startswith("com.android"):
        error(clazz, None, None, "Internal classes must not be exposed")


def verify_layering(clazz):
    """Catch package layering violations.
    For example, something in android.os depending on android.app."""
    ranking = [
        [
            "android.service",
            "android.accessibilityservice",
            "android.inputmethodservice",
            "android.printservice",
            "android.appwidget",
            "android.webkit",
            "android.preference",
            "android.gesture",
            "android.print",
        ],
        "android.app",
        "android.widget",
        "android.view",
        "android.animation",
        "android.provider",
        ["android.content", "android.graphics.drawable"],
        "android.database",
        "android.graphics",
        "android.text",
        "android.os",
        "android.util",
    ]

    def rank(p):
        for i in range(len(ranking)):
            if isinstance(ranking[i], list):
                for j in ranking[i]:
                    if p.startswith(j):
                        return i
            elif p.startswith(ranking[i]):
                return i

    cr = rank(clazz.pkg.name)
    if cr is None:
        return

    for f in clazz.fields:
        ir = rank(f.typ)
        if ir and ir < cr:
            warn(clazz, f, "FW6", "Field type violates package layering")

    for m in clazz.methods:
        ir = rank(m.typ)
        if ir and ir < cr:
            warn(clazz, m, "FW6", "Method return type violates package layering")
        for arg in m.args:
            ir = rank(arg.typ)
            if ir and ir < cr:
                warn(clazz, m, "FW6", "Method argument type violates package layering")


def verify_boolean(clazz):
    """Verifies that boolean accessors are named correctly.
    For example, hasFoo() and setHasFoo()."""

    def is_get(m):
        return len(m.args) == 0 and m.typ.name == "boolean"

    def is_set(m):
        return len(m.args) == 1 and m.args[0].typ.name == "boolean"

    sets = [m for m in clazz.methods if is_set(m)]

    def error_if_exists(methods, trigger, expected, actual):
        for m in methods:
            if m.name == actual:
                error(
                    clazz,
                    m,
                    "M6",
                    "Symmetric method for %s must be named %s" % (trigger, expected),
                )

    for m in clazz.methods:
        if is_get(m):
            if re.match("is[A-Z]", m.name):
                target = m.name[2:]
                expected = "setIs" + target
                error_if_exists(sets, m.name, expected, "setHas" + target)
            elif re.match("has[A-Z]", m.name):
                target = m.name[3:]
                expected = "setHas" + target
                error_if_exists(sets, m.name, expected, "setIs" + target)
                error_if_exists(sets, m.name, expected, "set" + target)
            elif re.match("get[A-Z]", m.name):
                target = m.name[3:]
                expected = "set" + target
                error_if_exists(sets, m.name, expected, "setIs" + target)
                error_if_exists(sets, m.name, expected, "setHas" + target)

        if is_set(m):
            if re.match("set[A-Z]", m.name):
                target = m.name[3:]
                expected = "get" + target
                error_if_exists(sets, m.name, expected, "is" + target)
                error_if_exists(sets, m.name, expected, "has" + target)


def verify_collections(clazz):
    """Verifies that collection types are interfaces."""
    if clazz.fullname == "android.os.Bundle":
        return

    bad = [
        "java.util.Vector",
        "java.util.LinkedList",
        "java.util.ArrayList",
        "java.util.Stack",
        "java.util.HashMap",
        "java.util.HashSet",
        "android.util.ArraySet",
        "android.util.ArrayMap",
    ]
    for m in clazz.methods:
        if m.typ in bad:
            error(
                clazz,
                m,
                "CL2",
                "Return type is concrete collection; must be higher-level interface",
            )
        for arg in m.args:
            if arg.typ in bad:
                error(
                    clazz,
                    m,
                    "CL2",
                    "Argument is concrete collection; must be higher-level interface",
                )


def verify_flags(clazz):
    """Verifies that flags are non-overlapping."""
    known = collections.defaultdict(int)
    for f in clazz.fields:
        if "FLAG_" in f.name:
            try:
                val = int(f.value)
            except ValueError:
                continue

            scope = f.name[0 : f.name.index("FLAG_")]
            if val & known[scope]:
                warn(clazz, f, "C1", "Found overlapping flag constant value")
            known[scope] |= val


def verify_exception(clazz):
    """Verifies that methods don't throw generic exceptions."""
    for m in clazz.methods:
        for t in m.throws:
            if t in ["java.lang.Exception", "java.lang.Throwable", "java.lang.Error"]:
                error(clazz, m, "S1", "Methods must not throw generic exceptions")

            if t in ["android.os.RemoteException"]:
                if clazz.name == "android.content.ContentProviderClient":
                    continue
                if clazz.name == "android.os.Binder":
                    continue
                if clazz.name == "android.os.IBinder":
                    continue

                error(
                    clazz,
                    m,
                    "FW9",
                    "Methods calling into system server should rethrow RemoteException as RuntimeException",
                )

            if len(m.args) == 0 and t in [
                "java.lang.IllegalArgumentException",
                "java.lang.NullPointerException",
            ]:
                warn(
                    clazz,
                    m,
                    "S1",
                    "Methods taking no arguments should throw IllegalStateException",
                )


def verify_google(clazz):
    """Verifies that APIs never reference Google."""

    if re.search("google", clazz.raw, re.IGNORECASE):
        error(clazz, None, None, "Must never reference Google")

    test = []
    test.extend(clazz.ctors)
    test.extend(clazz.fields)
    test.extend(clazz.methods)

    for t in test:
        if re.search("google", t.raw, re.IGNORECASE):
            error(clazz, t, None, "Must never reference Google")


def verify_bitset(clazz):
    """Verifies that we avoid using heavy BitSet."""

    for f in clazz.fields:
        if f.typ.name == "java.util.BitSet":
            error(clazz, f, None, "Field type must not be heavy BitSet")

    for m in clazz.methods:
        if m.typ.name == "java.util.BitSet":
            error(clazz, m, None, "Return type must not be heavy BitSet")
        for arg in m.args:
            if arg.typ.name == "java.util.BitSet":
                error(clazz, m, None, "Argument type must not be heavy BitSet")


def verify_manager(clazz):
    """Verifies that FooManager is only obtained from Context."""

    if not clazz.name.endswith("Manager"):
        return

    for c in clazz.ctors:
        error(
            clazz,
            c,
            None,
            "Managers must always be obtained from Context; no direct constructors",
        )

    for m in clazz.methods:
        if m.typ.name == clazz.fullname:
            error(clazz, m, None, "Managers must always be obtained from Context")


def verify_boxed(clazz):
    """Verifies that methods avoid boxed primitives."""

    boxed = [
        "java.lang.Number",
        "java.lang.Byte",
        "java.lang.Double",
        "java.lang.Float",
        "java.lang.Integer",
        "java.lang.Long",
        "java.lang.Short",
    ]

    for c in clazz.ctors:
        for arg in c.args:
            if arg.typ in boxed:
                error(clazz, c, "M11", "Must avoid boxed primitives")

    for f in clazz.fields:
        if f.typ in boxed:
            error(clazz, f, "M11", "Must avoid boxed primitives")

    for m in clazz.methods:
        if m.typ in boxed:
            error(clazz, m, "M11", "Must avoid boxed primitives")
        for arg in m.args:
            if arg.typ in boxed:
                error(clazz, m, "M11", "Must avoid boxed primitives")


def verify_static_utils(clazz):
    """Verifies that helper classes can't be constructed."""
    if clazz.fullname.startswith("android.opengl"):
        return
    if clazz.fullname.startswith("android.R"):
        return

    # Only care about classes with default constructors
    if len(clazz.ctors) == 1 and len(clazz.ctors[0].args) == 0:
        test = []
        test.extend(clazz.fields)
        test.extend(clazz.methods)

        if len(test) == 0:
            return
        for t in test:
            if "static" not in t.split:
                return

        error(
            clazz, None, None, "Fully-static utility classes must not have constructor"
        )


def verify_overload_args(clazz):
    """Verifies that method overloads add new arguments at the end."""
    if clazz.fullname.startswith("android.opengl"):
        return

    overloads = collections.defaultdict(list)
    for m in clazz.methods:
        if "deprecated" in m.split:
            continue
        overloads[m.name].append(m)

    for name, methods in overloads.items():
        if len(methods) <= 1:
            continue

        # Look for arguments common across all overloads
        def cluster(args):
            count = collections.defaultdict(int)
            res = set()
            for i in range(len(args)):
                a = args[i]
                res.add("%s#%d" % (a, count[a]))
                count[a] += 1
            return res

        common_args = cluster(x.typ for x in methods[0].args)
        for m in methods:
            common_args = common_args & cluster(m.args)

        if len(common_args) == 0:
            continue

        # Require that all common arguments are present at start of signature
        locked_sig = None
        for m in methods:
            sig = (x.typ for x in m.args[0 : len(common_args)])
            if not common_args.issubset(cluster(sig)):
                warn(
                    clazz,
                    m,
                    "M2",
                    "Expected common arguments [%s] at beginning of overloaded method"
                    % (", ".join(common_args)),
                )
            elif not locked_sig:
                locked_sig = sig
            elif locked_sig != sig:
                error(
                    clazz,
                    m,
                    "M2",
                    "Expected consistent argument ordering between overloads: %s..."
                    % (", ".join(locked_sig)),
                )


def verify_callback_handlers(clazz):
    """Verifies that methods adding listener/callback have overload
    for specifying delivery thread."""

    # Ignore UI packages which assume main thread
    skip = [
        "animation",
        "view",
        "graphics",
        "transition",
        "widget",
        "webkit",
    ]
    for s in skip:
        if s in clazz.pkg.name_path:
            return
        if s in clazz.extends_path:
            return

    # Ignore UI classes which assume main thread
    if "app" in clazz.pkg.name_path or "app" in clazz.extends_path:
        for s in [
            "ActionBar",
            "Dialog",
            "Application",
            "Activity",
            "Fragment",
            "Loader",
        ]:
            if s in clazz.fullname:
                return
    if "content" in clazz.pkg.name_path or "content" in clazz.extends_path:
        for s in ["Loader"]:
            if s in clazz.fullname:
                return

    found = {}
    by_name = collections.defaultdict(list)
    examine = clazz.ctors + clazz.methods
    for m in examine:
        if m.name.startswith("unregister"):
            continue
        if m.name.startswith("remove"):
            continue
        if re.match("on[A-Z]+", m.name):
            continue

        by_name[m.name].append(m)

        for a in m.args:
            if (
                a.typ.name.endswith("Listener")
                or a.typ.name.endswith("Callback")
                or a.typ.name.endswith("Callbacks")
            ):
                found[m.name] = m

    for f in found.values():
        takes_exec = False
        for m in by_name[f.name]:
            for a in m.args:
                if "java.util.concurrent.Executor" == a.typ:
                    takes_exec = True
        if not takes_exec:
            warn(
                clazz,
                f,
                "L1",
                "Registration methods should have overload that accepts delivery Executor",
            )


def verify_context_first(clazz):
    """Verifies that methods accepting a Context keep it the first argument."""
    examine = clazz.ctors + clazz.methods
    for m in examine:
        if len(m.args) > 1 and m.args[0].typ != "android.content.Context":
            for a in m.args[1:]:
                if "android.content.Context" == a.typ:
                    error(
                        clazz,
                        m,
                        "M3",
                        "Context is distinct, so it must be the first argument",
                    )
        if len(m.args) > 1 and m.args[0].typ != "android.content.ContentResolver":
            for a in m.args[1:]:
                if "android.content.ContentResolver" == a.typ:
                    error(
                        clazz,
                        m,
                        "M3",
                        "ContentResolver is distinct, so it must be the first argument",
                    )


def verify_listener_last(clazz):
    """Verifies that methods accepting a Listener or Callback keep them as last arguments."""
    examine = clazz.ctors + clazz.methods
    for m in examine:
        if "Listener" in m.name or "Callback" in m.name:
            continue
        found = False
        for a in m.args:
            if (
                a.typ.name.endswith("Callback")
                or a.typ.name.endswith("Callbacks")
                or a.typ.name.endswith("Listener")
            ):
                found = True
            elif found:
                warn(
                    clazz, m, "M3", "Listeners should always be at end of argument list"
                )


def verify_resource_names(clazz):
    """Verifies that resource names have consistent case."""
    if not re.match(r"android\.R\.[a-z]+", clazz.fullname):
        return

    # Resources defined by files are foo_bar_baz
    if clazz.name in [
        "anim",
        "animator",
        "color",
        "dimen",
        "drawable",
        "interpolator",
        "layout",
        "transition",
        "menu",
        "mipmap",
        "string",
        "plurals",
        "raw",
        "xml",
    ]:
        for f in clazz.fields:
            if re.match("[a-z1-9_]+$", f.name):
                continue
            error(
                clazz,
                f,
                None,
                "Expected resource name in this class to be foo_bar_baz style",
            )

    # Resources defined inside files are fooBarBaz
    if clazz.name in ["array", "attr", "id", "bool", "fraction", "integer"]:
        for f in clazz.fields:
            if re.match("config_[a-z][a-zA-Z1-9]*$", f.name):
                continue
            if re.match("layout_[a-z][a-zA-Z1-9]*$", f.name):
                continue
            if re.match("state_[a-z_]*$", f.name):
                continue

            if re.match("[a-z][a-zA-Z1-9]*$", f.name):
                continue
            error(
                clazz,
                f,
                "C7",
                "Expected resource name in this class to be fooBarBaz style",
            )

    # Styles are FooBar_Baz
    if clazz.name in ["style"]:
        for f in clazz.fields:
            if re.match("[A-Z][A-Za-z1-9]+(_[A-Z][A-Za-z1-9]+?)*$", f.name):
                continue
            error(
                clazz,
                f,
                "C7",
                "Expected resource name in this class to be FooBar_Baz style",
            )


def verify_files(clazz):
    """Verifies that methods accepting File also accept streams."""

    has_file = set()
    has_stream = set()

    test = []
    test.extend(clazz.ctors)
    test.extend(clazz.methods)

    for m in test:
        for a in m.args:
            if "java.io.File" == a.typ:
                has_file.add(m)
            if a.typ in {
                "java.io.FileDescriptor",
                "android.os.ParcelFileDescriptor",
                "java.io.InputStream",
                "java.io.OutputStream",
            }:
                has_stream.add(m.name)

    for m in has_file:
        if m.name not in has_stream:
            warn(
                clazz,
                m,
                "M10",
                "Methods accepting File should also accept FileDescriptor or streams",
            )


def verify_manager_list(clazz):
    """Verifies that managers return List<? extends Parcelable> instead of arrays."""

    if not clazz.name.endswith("Manager"):
        return

    for m in clazz.methods:
        if m.typ.name.startswith("android.") and m.typ.is_array:
            warn(
                clazz,
                m,
                None,
                "Methods should return List<? extends Parcelable> instead of Parcelable[] to support ParceledListSlice under the hood",
            )


def verify_abstract_inner(clazz):
    """Verifies that abstract inner classes are static."""

    if re.match(r".+?\.[A-Z][^\.]+\.[A-Z]", clazz.fullname):
        if " abstract " in clazz.raw and " static " not in clazz.raw:
            warn(
                clazz,
                None,
                None,
                "Abstract inner classes should be static to improve testability",
            )


def verify_runtime_exceptions(clazz):
    """Verifies that runtime exceptions aren't listed in throws."""

    banned = [
        "java.lang.NullPointerException",
        "java.lang.ClassCastException",
        "java.lang.IndexOutOfBoundsException",
        "java.lang.reflect.UndeclaredThrowableException",
        "java.lang.reflect.MalformedParametersException",
        "java.lang.reflect.MalformedParameterizedTypeException",
        "java.lang.invoke.WrongMethodTypeException",
        "java.lang.EnumConstantNotPresentException",
        "java.lang.IllegalMonitorStateException",
        "java.lang.SecurityException",
        "java.lang.UnsupportedOperationException",
        "java.lang.annotation.AnnotationTypeMismatchException",
        "java.lang.annotation.IncompleteAnnotationException",
        "java.lang.TypeNotPresentException",
        "java.lang.IllegalStateException",
        "java.lang.ArithmeticException",
        "java.lang.IllegalArgumentException",
        "java.lang.ArrayStoreException",
        "java.lang.NegativeArraySizeException",
        "java.util.MissingResourceException",
        "java.util.EmptyStackException",
        "java.util.concurrent.CompletionException",
        "java.util.concurrent.RejectedExecutionException",
        "java.util.IllformedLocaleException",
        "java.util.ConcurrentModificationException",
        "java.util.NoSuchElementException",
        "java.io.UncheckedIOException",
        "java.time.DateTimeException",
        "java.security.ProviderException",
        "java.nio.BufferUnderflowException",
        "java.nio.BufferOverflowException",
    ]

    examine = clazz.ctors + clazz.methods
    for m in examine:
        for t in m.throws:
            if t in banned:
                error(
                    clazz,
                    m,
                    None,
                    "Methods must not mention RuntimeException subclasses in throws clauses",
                )


def verify_error(clazz):
    """Verifies that we always use Exception instead of Error."""
    if not clazz.extends:
        return
    if clazz.extends.name.endswith("Error"):
        error(
            clazz,
            None,
            None,
            "Trouble must be reported through an Exception, not Error",
        )
    if clazz.extends.name.endswith("Exception") and not clazz.name.endswith(
        "Exception"
    ):
        error(clazz, None, None, "Exceptions must be named FooException")


def verify_units(clazz):
    """Verifies that we use consistent naming for units."""

    # If we find K, recommend replacing with V
    bad = {
        "Ns": "Nanos",
        "Ms": "Millis or Micros",
        "Sec": "Seconds",
        "Secs": "Seconds",
        "Hr": "Hours",
        "Hrs": "Hours",
        "Mo": "Months",
        "Mos": "Months",
        "Yr": "Years",
        "Yrs": "Years",
        "Byte": "Bytes",
        "Space": "Bytes",
    }

    for m in clazz.methods:
        if m.typ not in ["short", "int", "long"]:
            continue
        for k, v in bad.items():
            if m.name.endswith(k):
                error(clazz, m, None, "Expected method name units to be " + v)
        if m.name.endswith("Nanos") or m.name.endswith("Micros"):
            warn(
                clazz,
                m,
                None,
                "Returned time values are strongly encouraged to be in milliseconds unless you need the extra precision",
            )
        if m.name.endswith("Seconds"):
            error(clazz, m, None, "Returned time values must be in milliseconds")

    for m in clazz.methods:
        typ = m.typ
        if typ.name == "void":
            if len(m.args) != 1:
                continue
            typ = m.args[0].typ

        if m.name.endswith("Fraction") and typ.name != "float":
            error(clazz, m, None, "Fractions must use floats")
        if m.name.endswith("Percentage") and typ.name != "int":
            error(clazz, m, None, "Percentage must use ints")


def verify_closable(clazz):
    """Verifies that classes are AutoClosable."""
    if "implements java.lang.AutoCloseable" in clazz.raw:
        return
    if "implements java.io.Closeable" in clazz.raw:
        return

    for m in clazz.methods:
        if len(m.args) > 0:
            continue
        if m.name in [
            "close",
            "release",
            "destroy",
            "finish",
            "finalize",
            "disconnect",
            "shutdown",
            "stop",
            "free",
            "quit",
        ]:
            warn(
                clazz,
                m,
                None,
                "Classes that release resources should implement AutoClosable and CloseGuard",
            )
            return


def verify_member_name_not_kotlin_keyword(clazz):
    """Prevent method names which are keywords in Kotlin."""

    # https://kotlinlang.org/docs/reference/keyword-reference.html#hard-keywords
    # This list does not include Java keywords as those are already impossible to use.
    keywords = [
        "as",
        "fun",
        "in",
        "is",
        "object",
        "typealias",
        "val",
        "var",
        "when",
    ]

    for m in clazz.methods:
        if m.name in keywords:
            error(clazz, m, None, "Method name must not be a Kotlin keyword")
    for f in clazz.fields:
        if f.name in keywords:
            error(clazz, f, None, "Field name must not be a Kotlin keyword")


def verify_method_name_not_kotlin_operator(clazz):
    """Warn about method names which become operators in Kotlin."""

    binary = set()

    def unique_binary_op(m, op):
        if op in binary:
            error(
                clazz,
                m,
                None,
                f"Only one of '{op}' and '{op}Assign' methods should be present for Kotlin",
            )
        binary.add(op)

    for m in clazz.methods:
        if "static" in m.split:
            continue

        # https://kotlinlang.org/docs/reference/operator-overloading.html#unary-prefix-operators
        if m.name in ["unaryPlus", "unaryMinus", "not"] and len(m.args) == 0:
            warn(
                clazz, m, None, "Method can be invoked as a unary operator from Kotlin"
            )

        # https://kotlinlang.org/docs/reference/operator-overloading.html#increments-and-decrements
        if m.name in ["inc", "dec"] and len(m.args) == 0 and m.typ.name != "void":
            # This only applies if the return type is the same or a subtype of the enclosing class, but we have no
            # practical way of checking that relationship here.
            warn(
                clazz,
                m,
                None,
                "Method can be invoked as a pre/postfix inc/decrement operator from Kotlin",
            )

        # https://kotlinlang.org/docs/reference/operator-overloading.html#arithmetic
        if (
            m.name in ["plus", "minus", "times", "div", "rem", "mod", "rangeTo"]
            and len(m.args) == 1
        ):
            warn(
                clazz, m, None, "Method can be invoked as a binary operator from Kotlin"
            )
            unique_binary_op(m, m.name)

        # https://kotlinlang.org/docs/reference/operator-overloading.html#in
        if m.name == "contains" and len(m.args) == 1 and m.typ.name == "boolean":
            warn(clazz, m, None, "Method can be invoked as a 'in' operator from Kotlin")

        # https://kotlinlang.org/docs/reference/operator-overloading.html#indexed
        if (m.name == "get" and len(m.args) > 0) or (
            m.name == "set" and len(m.args) > 1
        ):
            warn(
                clazz,
                m,
                None,
                "Method can be invoked with an indexing operator from Kotlin",
            )

        # https://kotlinlang.org/docs/reference/operator-overloading.html#invoke
        if m.name == "invoke":
            warn(
                clazz,
                m,
                None,
                "Method can be invoked with function call syntax from Kotlin",
            )

        # https://kotlinlang.org/docs/reference/operator-overloading.html#assignments
        if (
            m.name
            in [
                "plusAssign",
                "minusAssign",
                "timesAssign",
                "divAssign",
                "remAssign",
                "modAssign",
            ]
            and len(m.args) == 1
            and m.typ.name == "void"
        ):
            warn(
                clazz,
                m,
                None,
                "Method can be invoked as a compound assignment operator from Kotlin",
            )
            unique_binary_op(m, m.name[:-6])  # Remove 'Assign' suffix


def verify_collections_over_arrays(clazz):
    """Warn that [] should be Collections."""

    safe = [
        "java.lang.String",
        "byte",
        "short",
        "int",
        "long",
        "float",
        "double",
        "boolean",
        "char",
    ]
    for m in clazz.methods:
        if m.typ.is_array and m.typ.name not in safe:
            warn(
                clazz,
                m,
                None,
                "Method should return Collection<> (or subclass) instead of raw array",
            )
        for arg in m.args:
            if arg.typ.is_array and arg.typ.name not in safe:
                warn(
                    clazz,
                    m,
                    None,
                    "Method argument should be Collection<> (or subclass) instead of raw array",
                )


def verify_user_handle(clazz):
    """Methods taking UserHandle should be ForUser or AsUser."""
    if (
        clazz.name.endswith("Listener")
        or clazz.name.endswith("Callback")
        or clazz.name.endswith("Callbacks")
    ):
        return
    if clazz.fullname == "android.app.admin.DeviceAdminReceiver":
        return
    if clazz.fullname == "android.content.pm.LauncherApps":
        return
    if clazz.fullname == "android.os.UserHandle":
        return
    if clazz.fullname == "android.os.UserManager":
        return

    for m in clazz.methods:
        if m.name.endswith("AsUser") or m.name.endswith("ForUser"):
            continue
        if re.match("on[A-Z]+", m.name):
            continue
        for a in m.args:
            if "android.os.UserHandle" == a.typ.name:
                warn(
                    clazz,
                    m,
                    None,
                    "Method taking UserHandle should be named 'doFooAsUser' or 'queryFooForUser'",
                )


def verify_params(clazz):
    """Parameter classes should be 'Params'."""
    if clazz.name.endswith("Params"):
        return
    if clazz.fullname == "android.app.ActivityOptions":
        return
    if clazz.fullname == "android.app.BroadcastOptions":
        return
    if clazz.fullname == "android.os.Bundle":
        return
    if clazz.fullname == "android.os.BaseBundle":
        return
    if clazz.fullname == "android.os.PersistableBundle":
        return

    bad = [
        "Param",
        "Parameter",
        "Parameters",
        "Args",
        "Arg",
        "Argument",
        "Arguments",
        "Options",
        "Bundle",
    ]
    for b in bad:
        if clazz.name.endswith(b):
            error(
                clazz,
                None,
                None,
                "Classes holding a set of parameters should be called 'FooParams'",
            )


def verify_services(clazz):
    """Service name should be FOO_BAR_SERVICE = 'foo_bar'."""
    if clazz.fullname != "android.content.Context":
        return

    for f in clazz.fields:
        if f.typ.name != "java.lang.String":
            continue
        found = re.match(r"([A-Z_]+)_SERVICE", f.name)
        if found:
            expected = found.group(1).lower()
            if f.value != expected:
                error(
                    clazz,
                    f,
                    "C4",
                    "Inconsistent service value; expected '%s'" % (expected),
                )


def verify_tense(clazz):
    """Verify tenses of method names."""
    if clazz.fullname.startswith("android.opengl"):
        return

    for m in clazz.methods:
        if m.name.endswith("Enable"):
            warn(clazz, m, None, "Unexpected tense; probably meant 'enabled'")


def verify_icu(clazz):
    """Verifies that richer ICU replacements are used."""
    better = {
        "java.util.TimeZone": "android.icu.util.TimeZone",
        "java.util.Calendar": "android.icu.util.Calendar",
        "java.util.Locale": "android.icu.util.ULocale",
        "java.util.ResourceBundle": "android.icu.util.UResourceBundle",
        "java.util.SimpleTimeZone": "android.icu.util.SimpleTimeZone",
        "java.util.StringTokenizer": "android.icu.util.StringTokenizer",
        "java.util.GregorianCalendar": "android.icu.util.GregorianCalendar",
        "java.lang.Character": "android.icu.lang.UCharacter",
        "java.text.BreakIterator": "android.icu.text.BreakIterator",
        "java.text.Collator": "android.icu.text.Collator",
        "java.text.DecimalFormatSymbols": "android.icu.text.DecimalFormatSymbols",
        "java.text.NumberFormat": "android.icu.text.NumberFormat",
        "java.text.DateFormatSymbols": "android.icu.text.DateFormatSymbols",
        "java.text.DateFormat": "android.icu.text.DateFormat",
        "java.text.SimpleDateFormat": "android.icu.text.SimpleDateFormat",
        "java.text.MessageFormat": "android.icu.text.MessageFormat",
        "java.text.DecimalFormat": "android.icu.text.DecimalFormat",
    }

    for m in clazz.ctors + clazz.methods:
        types = []
        types.extend(m.typ.name)
        for a in m.args:
            types.append(a.typ.name)
        for arg in types:
            if arg in better:
                warn(
                    clazz,
                    m,
                    None,
                    "Type %s should be replaced with richer ICU type %s"
                    % (arg, better[arg]),
                )


def verify_clone(clazz):
    """Verify that clone() isn't implemented; see EJ page 61."""
    for m in clazz.methods:
        if m.name == "clone":
            error(
                clazz,
                m,
                None,
                "Provide an explicit copy constructor instead of implementing clone()",
            )


def verify_enum_annotations(clazz):
    ENUM_ANNOTATIONS = [
        "android.support.annotation.IntDef",
        "android.support.annotation.LongDef",
        "android.support.annotation.StringDef",
        "androidx.annotation.IntDef",
        "androidx.annotation.LongDef",
        "androidx.annotation.StringDef",
    ]

    for a in clazz.annotations:
        if a.typ.name in ENUM_ANNOTATIONS:
            error(
                clazz,
                a,
                "GV8",
                "@IntDef, @LongDef, @StringDef should not appear in the API, make the @interface package private.",
            )


def get_deprecated_annotation(subject):
    for a in subject.annotations:
        if a.typ.name == DEPRECATED_ANNOTATION:
            return a
    return None


def get_deprecation_schedule_annotation(subject):
    for a in subject.annotations:
        if a.typ.name == DEPRECATION_SCHEDULE_ANNOTATION:
            return a
    return None


def verify_deprecated_annotations(clazz):
    if DEPRECATION_SCHEDULE_ANNOTATION is None:
        # --deprecation-annotation not specified, nothing to check
        return

    def is_deprecated(subject):
        for a in subject.annotations:
            if a.typ.name in {
                DEPRECATED_ANNOTATION,
                DEPRECATION_SCHEDULE_ANNOTATION,
            }:
                return True
        return False

    def check_member(member):
        if not is_deprecated(member):
            return
        if get_deprecated_annotation(member) is None:
            error(
                clazz,
                member if clazz != member else None,
                "GV12",
                "Missing @Deprecated annotation.",
            )
            return
        annotation = get_deprecation_schedule_annotation(member)
        if annotation is None:
            error(
                clazz,
                member if clazz != member else None,
                "GV9",
                "Missing deprecation schedule "
                "annotation. Needs @" + DEPRECATION_SCHEDULE_ANNOTATION,
            )
            return
        if LIBRARY_VERSION is None:
            # No version specified, nothing to check
            return
        version = int(annotation.arguments["version"])
        if version == LIBRARY_VERSION:
            warn(
                clazz,
                member if clazz != member else None,
                "GV11",
                "Deprecated method should be removed in this version",
            )
        if version < LIBRARY_VERSION:
            error(
                clazz,
                member if clazz != member else None,
                "GV10",
                "Deprecated method should be removed. Expected removal version: "
                + str(version)
                + " < current version: "
                + str(LIBRARY_VERSION),
            )

    check_member(clazz)
    for f in clazz.methods:
        check_member(f)
    for f in clazz.ctors:
        check_member(f)
    for f in clazz.fields:
        check_member(f)


def examine_clazz(clazz):
    """Find all style issues in the given class."""

    notice(clazz)

    if clazz.pkg.name.startswith("java"):
        return
    if clazz.pkg.name.startswith("junit"):
        return
    if clazz.pkg.name.startswith("org.apache"):
        return
    if clazz.pkg.name.startswith("org.xml"):
        return
    if clazz.pkg.name.startswith("org.json"):
        return
    if clazz.pkg.name.startswith("org.w3c"):
        return
    if clazz.pkg.name.startswith("android.icu."):
        return

    verify_constants(clazz)
    verify_enums(clazz)
    verify_class_names(clazz)
    verify_method_names(clazz)
    verify_callbacks(clazz)
    verify_listeners(clazz)
    verify_actions(clazz)
    verify_extras(clazz)
    verify_equals(clazz)
    verify_parcelable(clazz)
    verify_protected(clazz)
    verify_fields(clazz)
    verify_register(clazz)
    verify_sync(clazz)
    verify_intent_builder(clazz)
    verify_helper_classes(clazz)
    verify_builder(clazz)
    verify_aidl(clazz)
    verify_internal(clazz)
    verify_layering(clazz)
    verify_boolean(clazz)
    verify_collections(clazz)
    verify_flags(clazz)
    verify_exception(clazz)
    if not ALLOW_GOOGLE:
        verify_google(clazz)
    verify_bitset(clazz)
    verify_manager(clazz)
    verify_boxed(clazz)
    verify_static_utils(clazz)
    # verify_overload_args(clazz)
    verify_callback_handlers(clazz)
    verify_context_first(clazz)
    verify_listener_last(clazz)
    verify_resource_names(clazz)
    verify_files(clazz)
    verify_manager_list(clazz)
    verify_abstract_inner(clazz)
    verify_runtime_exceptions(clazz)
    verify_error(clazz)
    verify_units(clazz)
    verify_closable(clazz)
    verify_member_name_not_kotlin_keyword(clazz)
    verify_method_name_not_kotlin_operator(clazz)
    verify_collections_over_arrays(clazz)
    verify_user_handle(clazz)
    verify_params(clazz)
    verify_services(clazz)
    verify_tense(clazz)
    verify_icu(clazz)
    verify_clone(clazz)
    verify_final_fields_only_class(clazz)
    verify_threading_annotations(clazz)
    verify_nullability_annotations(clazz)
    verify_default_impl(clazz)
    verify_enum_annotations(clazz)
    verify_deprecated_annotations(clazz)


def examine_stream(stream, api_map):
    """Find all style issues in the given API stream."""
    global failures, noticed
    failures = {}
    noticed = {}
    api = _parse_stream(stream, api_map, examine_clazz)
    return (failures, noticed, api)


def examine_api(api):
    """Find all style issues in the given parsed API."""
    global failures
    failures = {}
    for key in sorted(api.keys()):
        examine_clazz(api[key])
    return failures


def verify_packages(api, allowed_packages):
    def is_allowed(typ_name, extra_types):
        if typ_name == "?":
            return True
        if typ_name == "void" or typ_name in PRIMITIVE_TYPES:
            return True
        for p in allowed_packages + extra_types:
            if typ_name == p or typ_name.startswith(p + "."):
                return True
        return False

    def check_type(m, typ, extra_types):
        for g in typ.generics:
            check_type(m, g, extra_types)
        for e in typ.extends:
            check_type(m, e, extra_types)
        if not is_allowed(typ.name, extra_types):
            error(
                clazz,
                m,
                "GV7",
                "Class %s is not allowed. Allowed packages: %s."
                % (typ, ".*, ".join(allowed_packages) + ".*"),
            )

    def check_member(m, extra_types):
        check_type(m, m.typ, extra_types)

    def check_method(m, extra_types):
        check_member(m, extra_types)
        for a in m.annotations:
            check_member(a, [])
        for a in m.args:
            check_member(a, extra_types)
            for an in a.annotations:
                check_member(an, [])

    for key in sorted(api.keys()):
        clazz = api[key]
        extra_types = [x.name for x in clazz.generics]
        if not is_allowed(clazz.fullname, extra_types):
            error(
                clazz,
                None,
                "GV7",
                "Class %s is not allowed. Allowed packages: %s."
                % (clazz.typ, ".*, ".join(allowed_packages) + ".*"),
            )
        if clazz.extends is not None:
            check_type(None, clazz.extends, extra_types)
        for i in clazz.implements:
            check_type(None, i, extra_types)
        for g in clazz.generics:
            check_type(None, g, extra_types)
        for a in clazz.annotations:
            check_member(a, [])
        for f in clazz.fields:
            check_member(f, extra_types)
            for a in f.annotations:
                check_member(a, [])
        for m in clazz.methods:
            check_method(m, extra_types + [x.name for x in m.generics])
        for c in clazz.ctors:
            check_method(c, extra_types)


def verify_compat(cur, prev):
    """Find any incompatible API changes between two levels."""
    global failures

    def class_exists(api, test):
        return test.fullname in api

    def find_ctor(api, clazz, test):
        for m in clazz.ctors:
            if m.ident == test.ident:
                return m
        return None

    def all_methods(api, clazz):
        methods = list(clazz.methods)
        if clazz.extends is not None and clazz.extends.name in api:
            methods.extend(all_methods(api, api[clazz.extends.name]))
        return methods

    def find_method(api, clazz, test):
        methods = all_methods(api, clazz)
        for m in methods:
            if m.ident == test.ident:
                return m
        return None

    def field_exists(api, clazz, test):
        for f in clazz.fields:
            if f.ident == test.ident:
                return True
        return False

    def annotation_exists(api, clazz, test):
        for a in clazz.annotations:
            if a.ident == test.ident:
                return True
        return False

    def deprecated_version_matches(test):
        annotation = get_deprecation_schedule_annotation(test)
        if annotation is None:
            return False
        return int(annotation.arguments["version"]) == LIBRARY_VERSION

    failures = {}
    for key in sorted(prev.keys()):
        prev_clazz = prev[key]

        if not class_exists(cur, prev_clazz):
            if deprecated_version_matches(prev_clazz):
                continue
            error(prev_clazz, None, None, "Class removed or incompatible change")
            continue

        cur_clazz = cur[key]

        for test in prev_clazz.annotations:
            if not annotation_exists(cur, cur_clazz, test):
                error(
                    prev_clazz, test, None, "Annotation removed or incompatible change"
                )

        for test in prev_clazz.ctors:
            cur_ctor = find_ctor(cur, cur_clazz, test)
            if not cur_ctor:
                if deprecated_version_matches(test):
                    break
                error(
                    prev_clazz, test, None, "Constructor removed or incompatible change"
                )
                break
            for prev_annotation in test.annotations:
                if not annotation_exists(cur, cur_ctor, prev_annotation):
                    error(
                        prev_clazz,
                        prev_annotation,
                        None,
                        "Annotation removed or incompatible change",
                    )

        methods = all_methods(prev, prev_clazz)
        for test in methods:
            cur_method = find_method(cur, cur_clazz, test)
            if not cur_method:
                if deprecated_version_matches(test):
                    break
                error(prev_clazz, test, None, "Method removed or incompatible change")
                break
            for prev_annotation in test.annotations:
                if not annotation_exists(cur, cur_method, prev_annotation):
                    error(
                        prev_clazz,
                        prev_annotation,
                        None,
                        "Annotation removed or incompatible change",
                    )

        for test in prev_clazz.fields:
            if not field_exists(cur, cur_clazz, test):
                if deprecated_version_matches(test):
                    break
                error(prev_clazz, test, None, "Field removed or incompatible change")

    return failures


def show_deprecations_at_birth(cur, prev):
    """Show API deprecations at birth."""

    # Remove all existing things so we're left with new
    for prev_clazz in prev.values():
        cur_clazz = cur[prev_clazz.fullname]

        sigs = {i.ident: i for i in prev_clazz.ctors}
        cur_clazz.ctors = [i for i in cur_clazz.ctors if i.ident not in sigs]
        sigs = {i.ident: i for i in prev_clazz.methods}
        cur_clazz.methods = [i for i in cur_clazz.methods if i.ident not in sigs]
        sigs = {i.ident: i for i in prev_clazz.fields}
        cur_clazz.fields = [i for i in cur_clazz.fields if i.ident not in sigs]

        # Forget about class entirely when nothing new
        if (
            len(cur_clazz.ctors) == 0
            and len(cur_clazz.methods) == 0
            and len(cur_clazz.fields) == 0
        ):
            del cur[prev_clazz.fullname]

    for clazz in cur.values():
        if " deprecated " in clazz.raw and not clazz.fullname in prev:
            error(clazz, None, None, "Found API deprecation at birth")

        for i in clazz.ctors + clazz.methods + clazz.fields:
            if " deprecated " in i.raw:
                error(clazz, i, None, "Found API deprecation at birth")

    print(
        "%s Deprecated at birth %s\n"
        % ((format(fg=WHITE, bg=BLUE, bold=True), format(reset=True)))
    )
    for f in sorted(failures):
        print(failures[f])
        print("")


def readResultsJson(jsonFile):
    results = {}
    jsonString = jsonFile.read()
    if len(jsonString) > 0:
        results = json.loads(jsonString)

    return results


def dump_result_json(args, compat_fail, api_changes, api_removed, failures, api_map):
    if not "result_json" in args or not args["result_json"]:
        return

    if args["append_json"]:
        results = readResultsJson(args["result_json"])
    else:
        results = {}

    for key in ["failures", "compat_failures", "api_changes", "api_removed"]:
        if key not in results:
            results[key] = []

    api_changes = [
        {
            "file": api_changes[x].location.fileName,
            "column": int(api_changes[x].location.column),
            "line": int(api_changes[x].location.line),
        }
        for x in api_changes
    ]

    api_removed = [
        {
            "file": api_removed[x].location.fileName,
            "column": int(api_removed[x].location.column),
            "line": int(api_removed[x].location.line),
        }
        for x in api_removed
    ]

    results["compat_failures"] += [compat_fail[x].json() for x in compat_fail]
    results["api_changes"] += api_changes
    results["api_removed"] += api_removed
    results["failures"] += [failures[x].json() for x in failures]

    # Make sure ordering is consistent (helps with tests)
    results["failures"].sort(key=lambda f: f["rule"])

    results["failure"] = (
        (len(results["compat_failures"]) != 0)
        or (len(results["api_changes"]) != 0)
        or (len(results["api_removed"]) != 0)
        or (any(f["error"] for f in results["failures"]))
    )

    args["result_json"].seek(0)
    args["result_json"].truncate(0)
    json.dump(results, args["result_json"])


def matches_filter(filter_, failure):
    for f in filter_:
        if failure.rule is not None and failure.rule.startswith(f):
            return True
    return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Enforces common Android public API design \
            patterns. It ignores lint messages from a previous API level, if provided."
    )
    parser.add_argument(
        "current.txt", type=argparse.FileType("r", encoding="UTF-8"), help="current.txt"
    )
    parser.add_argument(
        "previous.txt",
        nargs="?",
        type=argparse.FileType("r", encoding="UTF-8"),
        default=None,
        help="previous.txt",
    )
    parser.add_argument(
        "--no-color", action="store_const", const=True, help="Disable terminal colors"
    )
    parser.add_argument(
        "--allow-google",
        action="store_const",
        const=True,
        help="Allow references to Google",
    )
    parser.add_argument(
        "--show-noticed",
        action="store_const",
        const=True,
        help="Show API changes noticed",
    )
    parser.add_argument(
        "--show-deprecations-at-birth",
        action="store_const",
        const=True,
        help="Show API deprecations at birth",
    )
    parser.add_argument(
        "--filter-errors",
        nargs="*",
        help="Provide a list of erorr codes to consider. Filter will "
        "select only error codes that starts with the codes specified.",
    )
    parser.add_argument(
        "--allowed-packages",
        nargs="*",
        help="Restrict API to the packages specified in this argument.",
    )
    parser.add_argument(
        "--deprecation-annotation",
        nargs="?",
        help="Additional annotation that needs to be present with a deprecated member.",
    )
    parser.add_argument(
        "--library-version",
        nargs="?",
        help="Integer representing the current library version",
    )
    parser.add_argument(
        "--result-json",
        help="Put result in JSON file.",
        type=argparse.FileType("a+", encoding="UTF-8"),
    )
    parser.add_argument(
        "--append-json",
        help="Append results to the JSON file instead of truncating it.",
        action="store_const",
        const=True,
    )
    parser.add_argument(
        "--api-map",
        help="File containing a map from the api.txt file to the source files.",
        type=argparse.FileType("r"),
    )
    args = vars(parser.parse_args())

    if args["no_color"]:
        USE_COLOR = False

    if args["deprecation_annotation"]:
        DEPRECATION_SCHEDULE_ANNOTATION = args["deprecation_annotation"]

    if args["library_version"]:
        LIBRARY_VERSION = int(args["library_version"])

    if args["allow_google"]:
        ALLOW_GOOGLE = True

    current_file = args["current.txt"]
    previous_file = args["previous.txt"]

    api_map = None
    if args["api_map"]:
        api_map = args["api_map"].readlines()

    if args["show_deprecations_at_birth"]:
        with current_file as f:
            cur = _parse_stream(f, api_map)
        with previous_file as f:
            prev = _parse_stream(f, api_map)
        show_deprecations_at_birth(cur, prev)
        sys.exit()

    compat_fail = []
    removed = {}

    with current_file as f:
        cur_fail, cur_noticed, cur = examine_stream(f, api_map)
    if not previous_file is None:
        with previous_file as f:
            prev_fail, prev_noticed, prev = examine_stream(f, api_map)

        removed = prev_noticed.copy()

        # ignore errors from previous API level
        for p in prev_fail:
            if p in cur_fail:
                del cur_fail[p]

        # ignore classes unchanged from previous API level
        for k, v in prev_noticed.items():
            if k in cur_noticed and hash(v) == hash(cur_noticed[k]):
                del cur_noticed[k]
                del removed[k]

        # look for compatibility issues
        compat_fail = verify_compat(cur, prev)

    # Removed duplicates
    for k, v in cur_noticed.items():
        if k in removed:
            del removed[k]

    if args["allowed_packages"] is not None:
        verify_packages(cur, args["allowed_packages"])

    # filter errors if filter was specified
    if args["filter_errors"] is not None:
        filtered_fail = {}
        for p in cur_fail:
            if matches_filter(args["filter_errors"], cur_fail[p]):
                filtered_fail[p] = cur_fail[p]
        cur_fail = filtered_fail

    dump_result_json(
        args,
        compat_fail,
        cur_noticed if args["show_noticed"] else [],
        removed if args["show_noticed"] else [],
        cur_fail,
        api_map,
    )

    has_error = any(cur_fail[x].error for x in cur_fail)

    if compat_fail and len(compat_fail) != 0:
        print(
            "%s API compatibility issues %s\n"
            % ((format(fg=WHITE, bg=BLUE, bold=True), format(reset=True)))
        )
        failures = []
        for f in sorted(compat_fail):
            print(compat_fail[f])
            print("")
        sys.exit(131)

    if len(cur_fail) != 0:
        print(
            "%s API style issues %s\n"
            % ((format(fg=WHITE, bg=BLUE, bold=True), format(reset=True)))
        )
        for f in sorted(cur_fail):
            print(cur_fail[f])
            print("")
        if has_error:
            sys.exit(77)
        else:
            sys.exit(0)

    if args["show_noticed"] and (len(cur_noticed) != 0 or len(removed) != 0):
        print(
            "%s API changes noticed %s\n"
            % ((format(fg=WHITE, bg=BLUE, bold=True), format(reset=True)))
        )
        for f in sorted(cur_noticed.keys()):
            print(f)
        for f in sorted(removed.keys()):
            print("%s removed API" % f)
        print("")
        sys.exit(10)
