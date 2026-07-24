#!/usr/bin/env python

# Copyright 2015 Michael R. Miller.
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

"""
PackageSymbolDumper.py

Dumps Breakpad symbols for the contents of an Apple update installer.  Given a
path to an Apple update installer as a .dmg or a path to a specific package
within the disk image, PackageSymbolDumper mounts, traverses, and dumps symbols
for all applicable frameworks and dylibs found within.

Required tools for Linux:
    pax
    gzip
    tar
    xpwn's dmg (https://github.com/planetbeing/xpwn)

Created on Apr 11, 2012

@author: mrmiller
"""

import argparse
import concurrent.futures
import errno
import logging
import os
import shutil
import stat
import subprocess
import tempfile
import traceback
import zipfile
from pathlib import Path

from mozpack.macpkg import Pbzx, uncpio, unxar
from scrapesymbols.gathersymbols import process_paths
from yaa_extractor import expand as yaa_expand

MACHO_MAGIC = {
    b"\xfe\xed\xfa\xce",
    b"\xce\xfa\xed\xfe",
    b"\xfe\xed\xfa\xcf",
    b"\xcf\xfa\xed\xfe",
    b"\xca\xfe\xba\xbe",
    b"\xbe\xba\xfe\xca",
}


def expand_pkg(pkg_path, out_path):
    """
    Expands the contents of an installer package to some directory.

    @param pkg_path: a path to an installer package (.pkg)
    @param out_path: a path to hold the package contents
    """
    for name, content in unxar(open(pkg_path, "rb")):
        with open(os.path.join(out_path, name), "wb") as fh:
            shutil.copyfileobj(content, fh)


def expand_dmg(dmg_path, out_path):
    """
    Expands the contents of a DMG file to some directory.

    @param dmg_path: a path to a disk image file (.dmg)
    @param out_path: a path to hold the image contents
    """
    # Use 7zip to extract the DMG contents
    os.makedirs(out_path, exist_ok=True)
    subprocess.check_call(
        ["7zz", "-bd", "x", dmg_path, f"-o{out_path}"],
        stdout=subprocess.DEVNULL,
    )


def expand_zip(zip_path, out_path):
    """
    Expands the contents of a ZIP archive to some directory.

    @param zip_path: a path to a ZIP archive (.zip)
    @param out_path: a path to hold the archive contents
    """
    subprocess.check_call(
        ["unzip", "-d", out_path, zip_path], stdout=subprocess.DEVNULL
    )


def filter_files(function, path):
    """
    Yield file paths matching a filter function by walking the
    hierarchy rooted at path.

    @param function: a function taking in a filename that returns true to
        include the path
    @param path: the root path of the hierarchy to traverse
    """
    for root, _dirs, files in os.walk(path):
        for filename in files:
            if function(filename):
                yield os.path.join(root, filename)


def find_packages(path):
    """
    Returns a list of installer packages (as determined by the .pkg extension),
    disk images (as determined by the .dmg extension) or ZIP archives found
    within path.

    @param path: root path to search for .pkg, .dmg and .zip files
    """
    return filter_files(
        lambda filename: os.path.splitext(filename)[1] in (".pkg", ".dmg", ".zip")
        and not filename.startswith("._"),
        path,
    )


def find_all_packages(paths):
    """
    Yield installer package files, disk images and ZIP archives found in all
    of `paths`.

    @param path: list of root paths to search for .pkg & .dmg files
    """
    for path in paths:
        logging.info("find_all_packages: %s", path)
        yield from find_packages(path)


def find_payloads(path):
    """
    Returns a list of possible installer package payload paths.

    @param path: root path for an installer package
    """
    return filter_files(
        lambda filename: "Payload" in filename or ".pax.gz" in filename, path
    )


def extract_payload(payload_path, output_path):
    """
    Extracts the contents of an installer package payload to a given directory.

    @param payload_path: path to an installer package's payload
    @param output_path: output path for the payload's contents
    @return True for success, False for failure.
    """
    header = open(payload_path, "rb").read(2)
    try:
        if header == b"BZ":
            logging.info("Extracting bzip2 payload")
            extract = "bzip2"
            subprocess.check_call(
                f'cd {output_path} && {extract} -dc {payload_path} | pax -r -k -s ":^/::"',
                shell=True,
            )
            return True
        elif header == b"\x1f\x8b":
            logging.info("Extracting gzip payload")
            extract = "gzip"
            subprocess.check_call(
                f'cd {output_path} && {extract} -dc {payload_path} | pax -r -k -s ":^/::"',
                shell=True,
            )
            return True
        elif header == b"pb":
            logging.info("Extracting pbzx payload")

            for path, st, content in uncpio(Pbzx(open(payload_path, "rb"))):
                if not path or not stat.S_ISREG(st.mode):
                    continue
                out = os.path.join(output_path, path.decode())
                os.makedirs(os.path.dirname(out), exist_ok=True)
                with open(out, "wb") as fh:
                    shutil.copyfileobj(content, fh)

            return True
        else:
            # Unsupported format
            logging.error(f"Unknown payload format: 0x{header[0]:x}{header[1]:x}")
            return False

    except Exception:
        return False


def write_symbol_file(dest, filename, contents):
    full_path = os.path.join(dest, filename)
    try:
        os.makedirs(os.path.dirname(full_path))
        with open(full_path, "wb") as sym_file:
            sym_file.write(contents)
    except OSError as e:
        if e.errno != errno.EEXIST:
            raise


def is_macho_from_yaa(path, head, data_len):
    if data_len < 4:
        return False
    return head in MACHO_MAGIC


def process_mobileasset_zip(zip_path: str, dest: str, dump_syms: str, executor) -> bool:
    """
    This handles the MobileAsset update payloads that store their contents
    in PBZX-compressed YAA archives under AssetData/payloadv2/.

    @param zip_path: path to the MobileAsset ZIP package
    @param dest: output path for symbols
    @param dump_syms: path to dump_syms
    @param executor: concurrent.futures executor used for parallel symbol dumping
    @return True on success, False on failure
    """
    try:
        with zipfile.ZipFile(zip_path, "r") as z:
            has_payloadv2 = any(
                name.startswith("AssetData/payloadv2/") for name in z.namelist()
            )
    except Exception as e:
        logging.error("Could not inspect ZIP: %s", e)
        return False

    if not has_payloadv2:
        logging.info("No AssetData/payloadv2/ in ZIP %s", zip_path)
        return True

    logging.info("MobileAsset ZIP detected (PBZX -> YAA concat path): %s", zip_path)
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            subprocess.check_call([
                "7zz",
                "-bb0",
                "-bd",
                f"-o{temp_dir}",
                "x",
                zip_path,
                "AssetData/payloadv2/*",
            ])

            payload_dir = Path(temp_dir) / "AssetData" / "payloadv2"
            if not payload_dir.exists():
                logging.error(
                    "Expected payloadv2 directory missing after unzip: %s", zip_path
                )
                return False

            indexed_parts = []
            # find payload.* parts, sorted by index, excluding .ecc files
            for part in payload_dir.glob("payload.*"):
                if not part.is_file() or part.name.endswith(".ecc"):
                    continue
                suffix = part.name.split(".")[-1]
                indexed_parts.append((int(suffix), part))
            parts = [p for _, p in sorted(indexed_parts)]
            if not parts:
                logging.error("No payload.* parts found in %s", payload_dir)
                return False

            logging.info("Found %d payload parts", len(parts))

            # PBZX-decompress each part and concatenate
            yaa_combined = payload_dir / "full_payload.yaa"
            with yaa_combined.open("wb") as out_yaa:
                for idx, part in enumerate(parts):
                    with part.open("rb") as f_in:
                        pbzx_stream = Pbzx(f_in)
                        shutil.copyfileobj(pbzx_stream, out_yaa)

            with tempfile.TemporaryDirectory(prefix="yaa_expanded_") as expanded_dir:
                logging.info("Expanding concatenated YAA into %s", expanded_dir)

                yaa_expand(
                    yaa_combined,
                    Path(expanded_dir),
                    file_filter=is_macho_from_yaa,
                )

                logging.info("Running dump_syms on expanded MobileAsset tree")
                dump_symbols(executor, dump_syms, expanded_dir, dest, all_paths=True)
            return True

    except subprocess.CalledProcessError as e:
        logging.error("MobileAsset unzip/decompress failed: %s", e)
        return False
    except Exception as e:
        logging.error("MobileAsset processing exception: %s", e)
        traceback.print_exc()
        return False


def dump_symbols(executor, dump_syms, path, dest, all_paths=False):
    if all_paths:
        existing_paths = [path]
    else:
        system_library = os.path.join("System", "Library")
        subdirectories = [
            os.path.join(system_library, "Frameworks"),
            os.path.join(system_library, "PrivateFrameworks"),
            os.path.join(system_library, "Extensions"),
            os.path.join("usr", "lib"),
        ]

        paths_to_dump = [os.path.join(path, d) for d in subdirectories]
        existing_paths = [path for path in paths_to_dump if os.path.exists(path)]

    for filename, contents in process_paths(
        paths=existing_paths,
        executor=executor,
        dump_syms=dump_syms,
        verbose=True,
        write_all=True,
        platform="darwin",
    ):
        if filename and contents:
            logging.info("Added symbol file " + str(filename, "utf-8"))
            write_symbol_file(dest, str(filename, "utf-8"), contents)


def dump_symbols_from_payload(executor, dump_syms, payload_path, dest):
    """
    Dumps all the symbols found inside the payload of an installer package.

    @param dump_syms: path to the dump_syms executable
    @param payload_path: path to an installer package's payload
    @param dest: output path for symbols
    """
    logging.info("Dumping symbols from payload: " + payload_path)
    with tempfile.TemporaryDirectory() as temp_dir:
        logging.info(f"Extracting payload to {temp_dir}.")
        if not extract_payload(payload_path, temp_dir):
            logging.error("Could not extract payload: " + payload_path)
            return False

        dump_symbols(executor, dump_syms, temp_dir, dest)

    return True


def dump_symbols_from_package(executor, dump_syms, pkg, dest):
    """
    Dumps all the symbols found inside an installer package.

    @param dump_syms: path to the dump_syms executable
    @param pkg: path to an installer package
    @param dest: output path for symbols
    """
    successful = True
    logging.info("Dumping symbols from package: " + pkg)
    try:
        ext = os.path.splitext(pkg)[1].lower()
        if ext == ".zip" and "com_apple_MobileAsset" in pkg:
            ok = process_mobileasset_zip(pkg, dest, dump_syms, executor)
            if not ok:
                logging.error("Error while dumping MobileAsset ZIP: " + pkg)
                successful = False
            return successful

        with tempfile.TemporaryDirectory() as temp_dir:
            if ext == ".pkg":
                expand_pkg(pkg, temp_dir)
            elif ext == ".zip":
                expand_zip(pkg, temp_dir)
            else:
                expand_dmg(pkg, temp_dir)

            # check for any subpackages
            for subpackage in find_packages(temp_dir):
                logging.info("Found subpackage at: " + subpackage)
                res = dump_symbols_from_package(executor, dump_syms, subpackage, dest)
                if not res:
                    logging.error("Error while dumping subpackage: " + subpackage)

            # dump symbols from any payloads (only expecting one) in the package
            for payload in find_payloads(temp_dir):
                res = dump_symbols_from_payload(executor, dump_syms, payload, dest)
                if not res:
                    successful = False

            # dump symbols directly extracted from the package
            dump_symbols(executor, dump_syms, temp_dir, dest)

    except Exception as e:
        traceback.print_exc()
        logging.error(f"Exception while dumping symbols from package: {e}")
        successful = False

    return successful


def read_processed_packages(tracking_file):
    if tracking_file is None or not os.path.exists(tracking_file):
        return set()
    logging.info(f"Reading processed packages from {tracking_file}")
    return set(open(tracking_file).read().splitlines())


def write_processed_packages(tracking_file, processed_packages):
    if tracking_file is None:
        return
    logging.info(
        f"Writing {len(processed_packages)} processed packages to {tracking_file}"
    )
    open(tracking_file, "w").write("\n".join(processed_packages))


def process_packages(package_finder, to, tracking_file, dump_syms):
    processed_packages = read_processed_packages(tracking_file)
    with concurrent.futures.ProcessPoolExecutor() as executor:
        for pkg in package_finder():
            if pkg in processed_packages:
                logging.info(f"Skipping already-processed package: {pkg}")
            else:
                dump_symbols_from_package(executor, dump_syms, pkg, to)
                processed_packages.add(pkg)
                write_processed_packages(tracking_file, processed_packages)


def main():
    parser = argparse.ArgumentParser(
        description="Extracts Breakpad symbols from a Mac OS X support update."
    )
    parser.add_argument(
        "--dump_syms",
        default="dump_syms",
        type=str,
        help="path to the Breakpad dump_syms executable",
    )
    parser.add_argument(
        "--tracking-file",
        type=str,
        help="Path to a file in which to store information "
        + "about already-processed packages",
    )
    parser.add_argument(
        "search", nargs="+", help="Paths to search recursively for packages"
    )
    parser.add_argument("to", type=str, help="destination path for the symbols")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    for p in ("requests.packages.urllib3.connectionpool", "urllib3"):
        urllib3_logger = logging.getLogger(p)
        urllib3_logger.setLevel(logging.ERROR)

    if not args.search or not all(os.path.exists(p) for p in args.search):
        logging.error("Invalid search path")
        return
    if not os.path.exists(args.to):
        logging.error("Invalid path to destination")
        return

    def finder():
        return find_all_packages(args.search)

    process_packages(finder, args.to, args.tracking_file, args.dump_syms)


if __name__ == "__main__":
    main()
