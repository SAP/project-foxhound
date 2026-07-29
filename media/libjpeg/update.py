#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import datetime
import os
import re
import subprocess
import sys
from pathlib import Path

VENDOR_DIR = Path(__file__).parent.resolve()

# Arithmetic codec files present in upstream JPEG_SOURCES when built with
# arithmetic support, but disabled in Firefox via jconfig.h.
UPSTREAM_SOURCES_NOT_BUILT = {
    "jaricom.c",
    "jcarith.c",
    "jdarith.c",
}

# These .c files are #included by other .c files and are not compiled directly.
# They do not appear in CMakeLists.txt source lists.
C_FILES_INCLUDED_BY_OTHERS = {
    "jccolext.c",  # included by jccolor.c
    "jdcol565.c",  # included by jdcolor.c
    "jdcolext.c",  # included by jdcolor.c
    "jdmrg565.c",  # included by jdmerge.c
    "jdmrgext.c",  # included by jdmerge.c
    "jstdhuff.c",  # included by jcparam.c
}

JCONFIG_TEMPLATES = [
    "src/jconfig.h.in",
    "src/jconfigint.h.in",
    "src/jversion.h.in",
    "simd/arm/neon-compat.h.in",
]

# Together with the header extension patterns (".h", ".h.in", ".inc", ".inc.h") checked
# in check_vcs_changes(), this set forms the complete allow list for new vendored files
# that are not listed in any moz.build SOURCES. Filenames are matched by basename so
# moves within the tree don't require updating this set. "CMakeLists.txt" matches both
# the root and simd/CMakeLists.txt via basename.
# When upstream adds a new non-compiled file that stays in the tree, add it here.
KNOWN_NON_MOZ_BUILD_FILES = (
    {
        # Build system files (needed by update.py to check source lists)
        "CMakeLists.txt",
        # Metadata and licenses
        "LICENSE.md",
        "README.md",
        "README.ijg",
        "ChangeLog.md",
        # Mozilla-specific files (kept in-tree via moz.yaml keep: or patches:)
        "MOZCHANGES",
        "update.py",
        "mozilla.diff",
    }
    | UPSTREAM_SOURCES_NOT_BUILT
    | C_FILES_INCLUDED_BY_OTHERS
)


def parse_cmake_var(text, var_name):
    """Return the list of literal tokens from the first CMake set() call for var_name.

    Tokens that are cmake variable references (${VAR}) are skipped.
    """
    m = re.search(
        rf"set\(\s*{re.escape(var_name)}\s+(.*?)\)",
        text,
        re.DOTALL,
    )
    if not m:
        return []
    return [tok for tok in m.group(1).split() if not re.fullmatch(r"\$\{(\w+)\}", tok)]


def _collect_list_vars(text):
    """Return a dict mapping variable name to the union of all its list-literal definitions.

    Captures `name = ['...', ...]` patterns. Multiple definitions of the same name are
    unioned so that arch-specific SIMD lists defined in separate if/elif branches are
    all included when that variable is later referenced by a SOURCES += assignment.
    """
    list_vars = {}
    for m in re.finditer(r"(\w+)\s*=\s*\[(.*?)\]", text, re.DOTALL):
        items = re.findall(r"'([^']+)'", m.group(2))
        if items:
            list_vars.setdefault(m.group(1), []).extend(items)
    return list_vars


def _iter_sources_items(text, list_vars):
    """Yield every item from SOURCES += [...] and SOURCES += varname in moz.build text."""
    for m in re.finditer(r"SOURCES\s*\+=\s*(?:\[(.*?)\]|(\w+))", text, re.DOTALL):
        if m.group(1) is not None:
            yield from re.findall(r"'([^']+)'", m.group(1))
        else:
            yield from list_vars.get(m.group(2), [])


def parse_moz_build_sources(path, exclude_prefix=None):
    """Return the set of bare filenames from SOURCES blocks in a moz.build.

    Handles both literal SOURCES += [...] blocks and SOURCES += varname assignments.
    exclude_prefix: if set, skip entries that start with this prefix (e.g. 'simd/' to
    exclude SIMD files from the JPEG_SOURCES comparison).
    """
    text = path.read_text()
    list_vars = _collect_list_vars(text)
    sources = set()
    for item in _iter_sources_items(text, list_vars):
        if exclude_prefix and item.startswith(exclude_prefix):
            continue
        sources.add(Path(item).name)
    return sources


def collect_all_moz_build_sources():
    """Return a set of VENDOR_DIR-relative paths from all moz.build SOURCES blocks.

    Uses full relative paths rather than bare filenames to avoid false matches when
    the same filename appears in multiple simd subdirectories (e.g. jsimd.c exists
    for each architecture). Paths from subdirectory moz.builds (which reference
    parent files via '../') are normalized to be relative to VENDOR_DIR.
    """
    sources = set()
    for mb_path in VENDOR_DIR.rglob("moz.build"):
        mb_dir = mb_path.parent
        text = mb_path.read_text()
        list_vars = _collect_list_vars(text)
        for item in _iter_sources_items(text, list_vars):
            abs_path = Path(os.path.normpath(mb_dir / item))
            try:
                sources.add(abs_path.relative_to(VENDOR_DIR).as_posix())
            except ValueError:
                pass
    return sources


def check_source_lists():
    cmake_path = VENDOR_DIR / "CMakeLists.txt"
    if not cmake_path.exists():
        print("WARNING: CMakeLists.txt not found; skipping source list check.")
        return True

    text = cmake_path.read_text()
    # Use only the first set() call for JPEG_SOURCES; subsequent ones add arithmetic
    # files conditionally. Filter those via UPSTREAM_SOURCES_NOT_BUILT as well.
    base_jpeg = parse_cmake_var(text, "JPEG_SOURCES")
    jpeg_sources = [
        f for f in base_jpeg if Path(f).name not in UPSTREAM_SOURCES_NOT_BUILT
    ]

    # Split into direct src/*.c files and wrapper files.
    # Wrapper files live under src/wrapper/ and have -8/-12/-16 suffixes.
    cmake_direct = set()  # basenames of src/*.c compiled directly
    cmake_wrapper = set()  # basenames of src/wrapper/*.c files

    for f in jpeg_sources:
        name = Path(f).name
        if "wrapper" in f:
            cmake_wrapper.add(name)
        else:
            cmake_direct.add(name)

    moz_main = parse_moz_build_sources(VENDOR_DIR / "moz.build", exclude_prefix="simd/")
    moz_wrapper = parse_moz_build_sources(VENDOR_DIR / "src" / "wrapper" / "moz.build")

    ok = True
    for cmake_set, moz_set, label in [
        (cmake_direct, moz_main, "JPEG direct sources (moz.build)"),
        (cmake_wrapper, moz_wrapper, "JPEG wrapper sources (src/wrapper/moz.build)"),
    ]:
        added = cmake_set - moz_set
        removed = moz_set - cmake_set
        if added or removed:
            ok = False
            print(f"\nSource list mismatch: {label}:")
            for f in sorted(added):
                print(f"  + {f}  (in CMakeLists.txt but not moz.build)")
            for f in sorted(removed):
                print(f"  - {f}  (in moz.build but not CMakeLists.txt)")
    return ok


def find_vcs():
    """Walk up from VENDOR_DIR to find a .hg or .git root. Returns (vcs, root)."""
    d = VENDOR_DIR
    while True:
        if (d / ".hg").is_dir():
            return "hg", d
        if (d / ".git").is_dir():
            return "git", d
        parent = d.parent
        if parent == d:
            return None, None
        d = parent


def _has_vcs_changes(vcs, root, path):
    """Return True if path changed in the tip/HEAD commit or has uncommitted changes."""
    rel = str(path.relative_to(root))
    if vcs == "hg":
        tip = subprocess.run(
            ["hg", "status", "--change", ".", rel],
            capture_output=True,
            text=True,
            cwd=str(root),
        )
        wdir = subprocess.run(
            ["hg", "status", rel],
            capture_output=True,
            text=True,
            cwd=str(root),
        )
        return bool(tip.stdout.strip() or wdir.stdout.strip())
    else:
        tip = subprocess.run(
            [
                "git",
                "diff-tree",
                "--no-commit-id",
                "-r",
                "--name-only",
                "HEAD",
                "--",
                rel,
            ],
            capture_output=True,
            text=True,
            cwd=str(root),
        )
        wdir = subprocess.run(
            ["git", "status", "--porcelain", rel],
            capture_output=True,
            text=True,
            cwd=str(root),
        )
        return bool(tip.stdout.strip() or wdir.stdout.strip())


def update_version_strings():
    """Auto-update version fields in jconfig.h and jconfigint.h from CMakeLists.txt.

    Returns True on success, False if anything fails or expected substitutions are missing.
    All substitutions are validated before any file is written.
    """
    cmake_path = VENDOR_DIR / "CMakeLists.txt"
    if not cmake_path.exists():
        print("ERROR: CMakeLists.txt not found; cannot update version strings.")
        return False

    cmake_text = cmake_path.read_text()
    m = re.search(r"^set\(VERSION\s+(\S+)\)", cmake_text, re.MULTILINE)
    if not m:
        print("ERROR: Could not find VERSION in CMakeLists.txt.")
        return False
    version = m.group(1)

    parts = version.split(".")
    if len(parts) < 3 or not all(p.isdigit() for p in parts):
        print(f"ERROR: Unexpected VERSION format: {version!r}")
        return False
    major, minor, revision = int(parts[0]), int(parts[1]), int(parts[2])
    version_number = f"{major}{minor:03d}{revision:03d}"

    # Use the mtime of CMakeLists.txt as the build date. mach vendor sets this to
    # the time of the vendor operation when it copies the file into the tree.
    cmake_mtime = datetime.datetime.fromtimestamp(cmake_path.stat().st_mtime)
    build = cmake_mtime.strftime("%Y%m%d")

    ok = True

    # Prepare jconfig.h substitutions
    jconfig_path = VENDOR_DIR / "jconfig.h"
    if not jconfig_path.exists():
        print("ERROR: jconfig.h not found.")
        return False
    jconfig = jconfig_path.read_text()
    jconfig, n1 = re.subn(
        r"(#define LIBJPEG_TURBO_VERSION\s+)\S+",
        rf"\g<1>{version}",
        jconfig,
    )
    jconfig, n2 = re.subn(
        r"(#define LIBJPEG_TURBO_VERSION_NUMBER\s+)\S+",
        rf"\g<1>{version_number}",
        jconfig,
    )
    if n1 != 1 or n2 != 1:
        print(
            f"ERROR: Unexpected substitution counts in jconfig.h "
            f"(LIBJPEG_TURBO_VERSION: {n1}, LIBJPEG_TURBO_VERSION_NUMBER: {n2}; expected 1 each)."
        )
        ok = False

    # Prepare jconfigint.h substitutions
    jconfigint_path = VENDOR_DIR / "jconfigint.h"
    if not jconfigint_path.exists():
        print("ERROR: jconfigint.h not found.")
        return False
    jconfigint = jconfigint_path.read_text()
    jconfigint, n3 = re.subn(
        r'(#define VERSION\s+)"[^"]*"',
        rf'\g<1>"{version}"',
        jconfigint,
    )
    jconfigint, n4 = re.subn(
        r'(#define BUILD\s+)"[^"]*"',
        rf'\g<1>"{build}"',
        jconfigint,
    )
    if n3 != 1 or n4 != 1:
        print(
            f"ERROR: Unexpected substitution counts in jconfigint.h "
            f"(VERSION: {n3}, BUILD: {n4}; expected 1 each)."
        )
        ok = False

    # Sync moz.yaml revision to the current version if mach vendor left it stale.
    moz_yaml_path = VENDOR_DIR / "moz.yaml"
    if not moz_yaml_path.exists():
        print("ERROR: moz.yaml not found.")
        return False
    moz_yaml = moz_yaml_path.read_text()
    yaml_m = re.search(r'revision:\s*"([^"]*)"', moz_yaml)
    if not yaml_m:
        print("ERROR: Could not find revision field in moz.yaml.")
        ok = False
    elif yaml_m.group(1) != version:
        moz_yaml, n5 = re.subn(
            r'(revision:\s*)"[^"]*"',
            rf'\g<1>"{version}"',
            moz_yaml,
        )
        if n5 != 1:
            print(
                f"ERROR: Unexpected substitution count in moz.yaml "
                f"(revision: {n5}; expected 1)."
            )
            ok = False

    if ok:
        jconfig_path.write_text(jconfig)
        jconfigint_path.write_text(jconfigint)
        if yaml_m and yaml_m.group(1) != version:
            moz_yaml_path.write_text(moz_yaml)

    return ok


def check_jconfig_changes():
    """Alert if jconfig template files changed, indicating jconfig.h/jconfigint.h may need review."""
    vcs, root = find_vcs()
    if vcs is None:
        return True

    changed = [
        fname
        for fname in JCONFIG_TEMPLATES
        if _has_vcs_changes(vcs, root, VENDOR_DIR / fname)
    ]

    if not changed:
        return True

    print("\nConfig template files changed:")
    for f in changed:
        print(f"  {f}")
    print()
    print("  Version strings in jconfig.h and jconfigint.h have been auto-updated.")
    print("  Review any remaining structural changes in the templates and update")
    print("  the corresponding in-tree files (jconfig.h, jconfigint.h,")
    print("  jversion.h, simd/arm/neon-compat.h) accordingly if needed.")
    return False


def _get_vcs_changes(vcs, root, rel_vendor, *, committed):
    """Return (new_files, removed_files) for rel_vendor.

    If committed is True, inspects the tip/HEAD commit; otherwise inspects the
    working directory. Paths are relative to the repo root.
    """
    if vcs == "hg":
        # hg status --change . shows files changed in the working directory's
        # parent revision (the most recently committed revision).
        flags = (
            ["--change", ".", "--added", "--removed"]
            if committed
            else ["--added", "--removed", "--deleted", "--unknown"]
        )
        result = subprocess.run(
            ["hg", "status"] + flags + [rel_vendor],
            capture_output=True,
            text=True,
            cwd=str(root),
        )
        new_files, removed_files = [], []
        for line in result.stdout.splitlines():
            status, path = line[0], line[2:]
            if status in ("A", "?"):
                new_files.append(path)
            elif status in ("R", "!"):
                removed_files.append(path)
    else:
        if committed:
            result = subprocess.run(
                [
                    "git",
                    "diff-tree",
                    "--no-commit-id",
                    "-r",
                    "--name-status",
                    "--diff-filter=AD",
                    "HEAD",
                    "--",
                    rel_vendor,
                ],
                capture_output=True,
                text=True,
                cwd=str(root),
            )
            new_files, removed_files = [], []
            for line in result.stdout.splitlines():
                status, path = line[0], line.split("\t", 1)[1]
                if status == "A":
                    new_files.append(path)
                elif status == "D":
                    removed_files.append(path)
        else:
            result = subprocess.run(
                ["git", "status", "--porcelain", rel_vendor],
                capture_output=True,
                text=True,
                cwd=str(root),
            )
            new_files, removed_files = [], []
            for line in result.stdout.splitlines():
                xy, path = line[:2], line[3:]
                if "?" in xy or xy[0] == "A":
                    new_files.append(path)
                elif "D" in xy:
                    removed_files.append(path)
    return new_files, removed_files


def _get_tip_changes(vcs, root, rel_vendor):
    return _get_vcs_changes(vcs, root, rel_vendor, committed=True)


def _get_uncommitted_changes(vcs, root, rel_vendor):
    return _get_vcs_changes(vcs, root, rel_vendor, committed=False)


def check_vcs_changes():
    """Alert on file additions or removals in the vendored tree.

    Checks the tip/HEAD commit (the committed fetch step) for new or removed files
    and validates that each change is properly handled:
      - New files must be in a moz.build SOURCES block, be a header/include file
        (extension .h, .h.in, .inc, .inc.h), or be listed in KNOWN_NON_MOZ_BUILD_FILES.
      - Removed files must no longer appear in any moz.build SOURCES block.

    Also checks the working directory for any uncommitted additions or removals as a
    belt-and-suspenders fallback (warns but does not fail on these).
    """
    vcs, root = find_vcs()
    if vcs is None:
        print("WARNING: No VCS root found; skipping file change check.")
        return True

    rel_vendor = str(VENDOR_DIR.relative_to(root))
    rel_vendor_path = Path(rel_vendor)

    all_moz_build_sources = collect_all_moz_build_sources()

    tip_new, tip_removed = _get_tip_changes(vcs, root, rel_vendor)
    uncommitted_new, uncommitted_removed = _get_uncommitted_changes(
        vcs, root, rel_vendor
    )

    ok = True

    if tip_new or tip_removed:
        unhandled_new = []
        for f in tip_new:
            rel_path = Path(f).relative_to(rel_vendor_path).as_posix()
            name = Path(rel_path).name
            if name.endswith((".h", ".h.in", ".inc", ".inc.h")):
                continue
            if rel_path in all_moz_build_sources:
                continue
            if name in KNOWN_NON_MOZ_BUILD_FILES:
                continue
            unhandled_new.append(f)

        still_in_moz_build = [
            f
            for f in tip_removed
            if Path(f).relative_to(rel_vendor_path).as_posix() in all_moz_build_sources
        ]

        if unhandled_new or still_in_moz_build:
            ok = False
            print(
                "\nUnhandled file changes in the vendored tree (from the fetch commit):"
            )
            for f in sorted(unhandled_new):
                print(f"  new (unhandled):              {f}")
            for f in sorted(still_in_moz_build):
                print(f"  removed (still in moz.build): {f}")
            print()
            print("  For unhandled new files:")
            print("    - Add to SOURCES in moz.build if Firefox needs to build it.")
            print("    - Add to 'exclude:' in moz.yaml if Firefox doesn't need it.")
            print("    - Add to KNOWN_NON_MOZ_BUILD_FILES in update.py if it stays in")
            print(
                "      the tree but isn't compiled (e.g. a new metadata or config file)."
            )
            print("  For removed files still in moz.build: remove them from SOURCES.")
        else:
            print(
                "\nFile changes in the vendored tree (from the fetch commit, all handled):"
            )
            for f in sorted(tip_new):
                print(f"  new:     {f}")
            for f in sorted(tip_removed):
                print(f"  removed: {f}")

        print()
        print("  To find renames between upstream tags:")
        print(
            "    git -C /path/to/libjpeg-turbo diff -M50 --diff-filter=R --name-status OLD_TAG..NEW_TAG"
        )
        if vcs == "hg":
            print()
            print("  If files were renamed upstream, record the move with:")
            print("    hg mv --after OLD_NAME NEW_NAME")
            print(
                "  (The file is already at NEW_NAME on disk; --after just records it.)"
            )
        else:
            print()
            print("  If files were renamed upstream, record the rename with:")
            print("    git add NEW_NAME && git rm OLD_NAME")

    if uncommitted_new or uncommitted_removed:
        print("\nUncommitted file changes detected in the vendored tree:")
        for f in sorted(uncommitted_new):
            print(f"  new:     {f}")
        for f in sorted(uncommitted_removed):
            print(f"  removed: {f}")
        print()
        print("  These changes are uncommitted. If they are from the fetch step,")
        print("  commit them (and update moz.build/moz.yaml as needed) before")
        print("  re-running --patch-mode only.")

    return ok


def main():
    # Auto-update version strings in jconfig.h and jconfigint.h from the vendored
    # CMakeLists.txt. This handles the routine per-release version bump.
    if not update_version_strings():
        print(
            "\nFailed to auto-update version strings. Fix the errors above and re-run:\n"
            "  ./mach vendor media/libjpeg/moz.yaml --patch-mode only"
        )
        sys.exit(1)

    ok = True

    # Verify that the upstream CMakeLists.txt source lists still match our moz.build files.
    # If upstream added or removed .c files, moz.build must be updated manually.
    if not check_source_lists():
        ok = False

    # Alert if the jconfig template files changed beyond the version strings, which may
    # require manual updates to jconfig.h / jconfigint.h.
    if not check_jconfig_changes():
        ok = False

    # Alert on file additions or removals from the fetch commit. Validates that
    # each new file is accounted for (in moz.build, a header, or KNOWN_NON_MOZ_BUILD_FILES)
    # and that removed files are no longer referenced in moz.build.
    if not check_vcs_changes():
        ok = False

    if not ok:
        print(
            "\nSee guidance above. After making changes, commit them and re-run:\n"
            "  ./mach vendor media/libjpeg/moz.yaml --patch-mode only"
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
