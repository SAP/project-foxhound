#!/usr/bin/env python3
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#
# Write Mochitest manifests for WebGL conformance test files.

import os
import re
import shutil
from collections import defaultdict
from pathlib import Path

# All paths in this file are based where this file is run.
WRAPPER_TEMPLATE_FILE = "mochi-wrapper.html.template"
MANIFEST_TEMPLATE_FILE = "mochitest.toml.template"
ERRATA_FILE = "mochitest-errata.toml"
DEST_MANIFEST_PREFIX = "generated-mochitest-"
DEST_MANIFEST_SUFFIX = ".toml"

# Tests are bucketed into separate manifests so dynamic chunking has multiple
# units to distribute. MANIFEST_MAX_TESTS caps the size of a single manifest;
# clusters bigger than this are split along the next path component. Tiny
# sibling clusters below MANIFEST_MIN_TESTS are merged into a bucket named
# after their parent prefix instead of creating one-test manifests.
MANIFEST_MAX_TESTS = 300
MANIFEST_MIN_TESTS = 5

BASE_TEST_LIST_PATHSTR = "checkout/00_test_list.txt"
GENERATED_PATHSTR = "generated"
WEBGL2_TEST_MANGLE = "2_"
PATH_SEP_MANGLING = "__"

ACCEPTABLE_ERRATA_KEYS = set([
    "fail-if",
    "prefs",
    "skip-if",
    "tags",
])


def ChooseSubsuite(name):
    # name: generated/test_2_conformance2__vertex_arrays__vertex-array-object.html
    assert " " not in name, name

    split = name.split("__")

    version = "1"
    if "/test_2_" in split[0]:
        version = "2"

    category = "core"

    split[0] = split[0].split("/")[1]
    if "deqp" in split[0]:
        if version == "1":
            # There's few enough that we'll just merge them with webgl1-ext.
            category = "ext"
        else:
            category = "deqp"
    elif "conformance" in split[0]:
        if split[1] in ("glsl", "glsl3", "ogles"):
            category = "ext"
        elif split[1] == "textures" and split[2] != "misc":
            category = "ext"

    return f"webgl{version}-{category}"


########################################################################
# GetTestList


def GetTestList():
    split = BASE_TEST_LIST_PATHSTR.rsplit("/", 1)
    basePath = "."
    testListFile = split[-1]
    if len(split) == 2:
        basePath = split[0]

    allowWebGL1 = True
    allowWebGL2 = True
    alwaysFailEntry = TestEntry("always-fail.html", True, False)
    testList = [alwaysFailEntry]
    AccumTests(basePath, testListFile, allowWebGL1, allowWebGL2, testList)

    for x in testList:
        x.path = os.path.relpath(x.path, basePath).replace(os.sep, "/")
        continue

    return testList


##############################
# Internals


def IsVersionLess(a, b):
    aSplit = [int(x) for x in a.split(".")]
    bSplit = [int(x) for x in b.split(".")]

    while len(aSplit) < len(bSplit):
        aSplit.append(0)

    while len(aSplit) > len(bSplit):
        bSplit.append(0)

    for i in range(len(aSplit)):
        aVal = aSplit[i]
        bVal = bSplit[i]

        if aVal == bVal:
            continue

        return aVal < bVal

    return False


class TestEntry:
    def __init__(self, path, webgl1, webgl2):
        self.path = path
        self.webgl1 = webgl1
        self.webgl2 = webgl2


def AccumTests(pathStr, listFile, allowWebGL1, allowWebGL2, out_testList):
    listPathStr = pathStr + "/" + listFile

    listPath = listPathStr.replace("/", os.sep)
    assert os.path.exists(listPath), "Bad `listPath`: " + listPath

    with open(listPath) as fIn:
        lineNum = 0
        for line in fIn:
            lineNum += 1

            curLine = line.strip()
            if not curLine:
                continue
            if curLine.startswith("//"):
                continue
            if curLine.startswith("#"):
                continue

            webgl1 = allowWebGL1
            webgl2 = allowWebGL2
            parts = curLine.split()
            while parts[0].startswith("--"):  # '--min-version 1.0.2 foo.html'
                flag = parts.pop(0)
                if flag == "--min-version":
                    minVersion = parts.pop(0)
                    if not IsVersionLess(minVersion, "2.0.0"):  # >= 2.0.0
                        webgl1 = False
                        break
                elif flag == "--max-version":
                    maxVersion = parts.pop(0)
                    if IsVersionLess(maxVersion, "2.0.0"):
                        webgl2 = False
                        break
                elif flag == "--slow":
                    continue  # TODO
                else:
                    text = f"Unknown flag '{flag}': {listPath}:{lineNum}: {line}"
                    assert False, text
                continue

            assert webgl1 or webgl2
            assert len(parts) == 1, parts
            testOrManifest = parts[0]

            split = testOrManifest.rsplit(".", 1)
            assert len(split) == 2, "Bad split for `line`: " + line
            (name, ext) = split

            if ext == "html":
                newTestFilePathStr = pathStr + "/" + testOrManifest
                entry = TestEntry(newTestFilePathStr, webgl1, webgl2)
                out_testList.append(entry)
                continue

            assert ext == "txt", "Bad `ext` on `line`: " + line

            split = testOrManifest.rsplit("/", 1)
            nextListFile = split[-1]
            nextPathStr = ""
            if len(split) != 1:
                nextPathStr = split[0]

            nextPathStr = pathStr + "/" + nextPathStr
            AccumTests(nextPathStr, nextListFile, webgl1, webgl2, out_testList)
            continue


########################################################################
# Templates


def ImportTemplate(inFilePath):
    with open(inFilePath) as f:
        return TemplateShell(f)


def OutputFilledTemplate(templateShell, templateDict, outFilePath):
    spanStrList = templateShell.Fill(templateDict)

    with open(outFilePath, "w", newline="\n") as f:
        f.writelines(spanStrList)


##############################
# Internals


def WrapWithIndent(lines, indentLen):
    split = lines.split("\n")
    if len(split) == 1:
        return lines

    ret = [split[0]]
    indentSpaces = " " * indentLen
    for line in split[1:]:
        ret.append(indentSpaces + line)

    return "\n".join(ret)


templateRE = re.compile("(%%.*?%%)")
assert templateRE.split("  foo = %%BAR%%;") == ["  foo = ", "%%BAR%%", ";"]


class TemplateShellSpan:
    def __init__(self, span):
        self.span = span

        self.isLiteralSpan = True
        if self.span.startswith("%%") and self.span.endswith("%%"):
            self.isLiteralSpan = False
            self.span = self.span[2:-2]

    def Fill(self, templateDict, indentLen):
        if self.isLiteralSpan:
            return self.span

        assert self.span in templateDict, "'" + self.span + "' not in dict!"

        filling = templateDict[self.span]

        return WrapWithIndent(filling, indentLen)


class TemplateShell:
    def __init__(self, iterableLines):
        spanList = []
        curLiteralSpan = []
        for line in iterableLines:
            split = templateRE.split(line)

            for cur in split:
                isTemplateSpan = cur.startswith("%%") and cur.endswith("%%")
                if not isTemplateSpan:
                    curLiteralSpan.append(cur)
                    continue

                if curLiteralSpan:
                    span = "".join(curLiteralSpan)
                    span = TemplateShellSpan(span)
                    spanList.append(span)
                    curLiteralSpan = []

                assert len(cur) >= 4

                span = TemplateShellSpan(cur)
                spanList.append(span)
                continue
            continue

        if curLiteralSpan:
            span = "".join(curLiteralSpan)
            span = TemplateShellSpan(span)
            spanList.append(span)

        self.spanList = spanList

    # Returns spanStrList.

    def Fill(self, templateDict):
        indentLen = 0
        ret = []
        for span_ in self.spanList:
            span = span_.Fill(templateDict, indentLen)
            ret.append(span)

            # Get next `indentLen`.
            try:
                lineStartPos = span.rindex("\n") + 1

                # let span = 'foo\nbar'
                # len(span) is 7
                # lineStartPos is 4
                indentLen = len(span) - lineStartPos
            except ValueError:
                indentLen += len(span)
            continue

        return ret


########################################################################
# Output


def IsWrapperWebGL2(wrapperPath):
    return wrapperPath.startswith(GENERATED_PATHSTR + "/test_" + WEBGL2_TEST_MANGLE)


def WriteWrapper(entryPath, webgl2, templateShell, wrapperPathAccum):
    mangledPath = entryPath.replace("/", PATH_SEP_MANGLING)
    maybeWebGL2Mangle = ""
    if webgl2:
        maybeWebGL2Mangle = WEBGL2_TEST_MANGLE

    # Mochitests must start with 'test_' or similar, or the test
    # runner will ignore our tests.
    # The error text is "is not a valid test".
    wrapperFileName = "test_" + maybeWebGL2Mangle + mangledPath

    wrapperPath = GENERATED_PATHSTR + "/" + wrapperFileName
    print("Adding wrapper: " + wrapperPath)

    args = ""
    if webgl2:
        args = "?webglVersion=2"

    templateDict = {
        "TEST_PATH": entryPath,
        "ARGS": args,
    }

    OutputFilledTemplate(templateShell, templateDict, wrapperPath)

    if webgl2:
        assert IsWrapperWebGL2(wrapperPath)

    wrapperPathAccum.append(wrapperPath)


def WriteWrappers(testEntryList):
    templateShell = ImportTemplate(WRAPPER_TEMPLATE_FILE)

    generatedDirPath = GENERATED_PATHSTR.replace("/", os.sep)
    if not os.path.exists(generatedDirPath):
        os.mkdir(generatedDirPath)
    assert os.path.isdir(generatedDirPath)

    wrapperPathList = []
    for entry in testEntryList:
        if entry.webgl1:
            WriteWrapper(entry.path, False, templateShell, wrapperPathList)
        if entry.webgl2:
            WriteWrapper(entry.path, True, templateShell, wrapperPathList)
        continue

    print(f"{len(wrapperPathList)} wrappers written.\n")
    return wrapperPathList


def ManifestPathStr(pathStr):
    # Rewrites a wrapper path (relative to the webgl-conf root) to be relative
    # to GENERATED_PATHSTR/, where the manifests live.
    rel = os.path.relpath(pathStr, GENERATED_PATHSTR)
    return rel.replace(os.sep, "/")


def WrapperPathParts(wrapperPathStr):
    base = wrapperPathStr.split("/", 1)[1]
    base = re.sub(r"^test_(2_)?", "", base)
    return base.split(PATH_SEP_MANGLING)


def TreeSplit(items, pathPrefix):
    """Recursively partition (parts, payload) items into clusters.

    `items` is a list of (remainingParts, payload). At each level, items are
    grouped by their next path component; subtrees exceeding MANIFEST_MAX_TESTS
    are recursed into, and sibling subtrees below MANIFEST_MIN_TESTS are merged
    into a bucket labeled with the current prefix to avoid one-test manifests.
    Returns a list of (label, [payload, ...]) pairs.
    """
    if len(items) <= MANIFEST_MAX_TESTS:
        return [(pathPrefix, [payload for _, payload in items])]

    byChild = defaultdict(list)
    for parts, payload in items:
        byChild[parts[0]].append((parts[1:], payload))

    out = []
    smallBucket = []
    for k in sorted(byChild):
        gitems = byChild[k]
        childPrefix = (pathPrefix + "/" + k) if pathPrefix else k
        if len(gitems) > MANIFEST_MAX_TESTS:
            out.extend(TreeSplit(gitems, childPrefix))
        elif len(gitems) < MANIFEST_MIN_TESTS:
            smallBucket.extend(payload for _, payload in gitems)
        else:
            out.append((childPrefix, [payload for _, payload in gitems]))

    if smallBucket:
        out.append((pathPrefix, smallBucket))

    return out


def ManifestFileName(subsuite, label):
    sanitized = label.replace("/", "-")
    suffix = f"-{sanitized}" if sanitized else ""
    return f"{DEST_MANIFEST_PREFIX}{subsuite}{suffix}{DEST_MANIFEST_SUFFIX}"


# Support files that every wrapper needs regardless of its checkout path:
# the wrapper's iframe host page plus the shared JS test framework and assets.
# Non-glob support-files that resolve outside the manifest's directory get
# flattened to their basename by mozbuild's test installer (see
# `SupportFilesConverter.convert_support_files` in python/mozbuild/mozbuild/
# testing.py); glob patterns instead go through `pattern_installs` and keep
# their relative layout. Since these manifests live in `generated/`, anything
# under `../` has to be expressed as a glob to land at the right path.
SHARED_SUPPORT_FILES = [
    "../*.html",
    "../*.css",
    "../checkout/js/**",
    "../checkout/resources/**",
]


def ClusterSupportFiles(wrapperPathStrList):
    """Compute the support-files entries needed for one cluster.

    Tests live in `checkout/<top>/...` where `<top>` is `conformance`,
    `conformance2`, or `deqp`. Cross-references stay within `<top>/<2nd>` for
    the GLES suites (e.g. `conformance/ogles/ogles-utils.js` reached via
    `../../ogles-utils.js`), so 2nd-level scoping is the tightest safe glob.
    Deqp tests additionally depend on `deqp/deqp-deps.js` at the deqp root and
    on the closure library, so for deqp clusters we widen to the full deqp
    tree.
    """
    scopes = set()
    needsClosure = False
    for wrapperPathStr in wrapperPathStrList:
        parts = WrapperPathParts(wrapperPathStr)
        top = parts[0]
        if top == "..":
            # The always-fail wrapper lives outside checkout/; covered by
            # SHARED_SUPPORT_FILES.
            continue
        if top == "deqp":
            scopes.add("../checkout/deqp/**")
            needsClosure = True
        elif len(parts) >= 2:
            scopes.add(f"../checkout/{top}/{parts[1]}/**")
        else:
            scopes.add(f"../checkout/{top}/**")
    if needsClosure:
        scopes.add("../checkout/closure-library/**")
    return sorted(set(SHARED_SUPPORT_FILES) | scopes)


def FormatSupportFiles(paths):
    return "\n".join(f'  "{p}",' for p in paths)


def WriteManifests(wrapperPathStrList):
    errataMap = LoadErrata()

    # DEFAULT_ERRATA
    defaultSectionName = "DEFAULT"
    defaultSectionLines = []
    if defaultSectionName in errataMap:
        defaultSectionLines = errataMap[defaultSectionName]
        del errataMap[defaultSectionName]
    defaultSectionStr = "\n".join(defaultSectionLines)

    # Bucket wrappers by subsuite, then tree-split each subsuite by path.
    wrapperPathStrList = sorted(wrapperPathStrList)
    bySubsuite = defaultdict(list)
    for wrapperPathStr in wrapperPathStrList:
        subsuite = ChooseSubsuite(wrapperPathStr)
        bySubsuite[subsuite].append(wrapperPathStr)

    templateShell = ImportTemplate(MANIFEST_TEMPLATE_FILE)

    writtenManifests = []
    for subsuite in sorted(bySubsuite):
        items = [(WrapperPathParts(p), p) for p in bySubsuite[subsuite]]
        clusters = TreeSplit(items, "")
        for label, wrapperPaths in clusters:
            manifestFileName = ManifestFileName(subsuite, label)

            manifestTestLineList = []
            for wrapperPathStr in sorted(wrapperPaths):
                wrapperManifestPathStr = ManifestPathStr(wrapperPathStr)
                manifestTestLineList.append('\n["' + wrapperManifestPathStr + '"]')
                if wrapperPathStr in errataMap:
                    manifestTestLineList += errataMap[wrapperPathStr]
                    del errataMap[wrapperPathStr]

            supportFilesStr = FormatSupportFiles(ClusterSupportFiles(wrapperPaths))
            templateDict = {
                "SUBSUITE": subsuite,
                "DEFAULT_ERRATA": defaultSectionStr,
                "SUPPORT_FILES": supportFilesStr,
                "MANIFEST_TESTS": "\n".join(manifestTestLineList),
            }
            destPath = os.path.join(GENERATED_PATHSTR, manifestFileName)
            OutputFilledTemplate(templateShell, templateDict, destPath)
            writtenManifests.append((manifestFileName, len(wrapperPaths)))

    if errataMap:
        print("Errata left in map:")
        for x in errataMap.keys():
            print(" " * 4 + x)
        assert False

    WriteGeneratedMozBuild([name for name, _ in writtenManifests])

    print(f"\nGenerated {len(writtenManifests)} manifests:")
    for name, count in writtenManifests:
        print(f"  {count:5d}  {name}")
    return [name for name, _ in writtenManifests]


def WriteGeneratedMozBuild(manifestFileNames):
    """Emit a moz.build inside GENERATED_PATHSTR/ listing the manifests.

    The hand-written dom/canvas/moz.build pulls this in via
    `DIRS += ["test/webgl-conf/generated"]`, so the set of manifests can grow
    or shrink without touching the hand-written build files.
    """
    destPath = os.path.join(GENERATED_PATHSTR, "moz.build")
    lines = [
        "# This Source Code Form is subject to the terms of the Mozilla Public",
        "# License, v. 2.0. If a copy of the MPL was not distributed with this",
        "# file, You can obtain one at http://mozilla.org/MPL/2.0/.",
        "",
        "# GENERATED FILE. Do not edit. Regenerate by running",
        "# dom/canvas/test/webgl-conf/generate-wrappers-and-manifest.py.",
        "",
        "MOCHITEST_MANIFESTS += [",
    ]
    for name in sorted(manifestFileNames):
        lines.append(f'    "{name}",')
    lines.append("]")
    lines.append("")
    with open(destPath, "w", newline="\n") as f:
        f.write("\n".join(lines))


##############################
# Internals


def LoadTOML(path):
    curSectionName = None
    curSectionMap = {}
    lineNum = 0
    ret = {}
    ret[curSectionName] = (lineNum, curSectionMap)
    multiLineVal = False
    key = ""
    val = ""

    with open(path) as f:
        for rawLine in f:
            lineNum += 1
            if multiLineVal:
                val += "\n" + rawLine.rstrip()
                if rawLine.find("]") >= 0:
                    multiLineVal = False
                    curSectionMap[key] = (lineNum, val)
            else:
                line = rawLine.strip()
                if not line:
                    continue
                if line[0] in [";", "#"]:
                    continue
                if line[0] == "[":
                    assert line[-1] == "]", f"{path}:{lineNum}"
                    curSectionName = line[1:-1].strip('"')
                    assert curSectionName not in ret, (
                        f"Line {lineNum}: Duplicate section: {line}"
                    )
                    curSectionMap = {}
                    ret[curSectionName] = (lineNum, curSectionMap)
                    continue
                split = line.split("=", 1)
                key = split[0].strip()
                val = ""
                if len(split) == 2:
                    val = split[1].strip()
                if val.find("[") >= 0 and val.find("]") < 0:
                    multiLineVal = True
                else:
                    curSectionMap[key] = (lineNum, val)

    return ret


def LoadErrata():
    tomlMap = LoadTOML(ERRATA_FILE)

    ret = {}

    for sectionName, (sectionLineNum, sectionMap) in tomlMap.items():
        curLines = []

        if sectionName is None:
            continue
        elif sectionName != "DEFAULT":
            path = sectionName.replace("/", os.sep)
            assert os.path.exists(path), (
                f"Errata line {sectionLineNum}: Invalid file: {sectionName}"
            )

        for key, (lineNum, val) in sectionMap.items():
            assert key in ACCEPTABLE_ERRATA_KEYS, f"Line {lineNum}: {key}"

            curLine = f"{key} = {val}"
            curLines.append(curLine)
            continue

        ret[sectionName] = curLines
        continue

    return ret


########################################################################


if __name__ == "__main__":
    file_dir = Path(__file__).parent
    os.chdir(str(file_dir))
    shutil.rmtree(file_dir / GENERATED_PATHSTR, True)

    testEntryList = GetTestList()
    wrapperPathStrList = WriteWrappers(testEntryList)

    WriteManifests(wrapperPathStrList)

    print("\nDone!")
