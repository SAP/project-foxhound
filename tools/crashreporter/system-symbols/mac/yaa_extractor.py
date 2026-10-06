# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

#!/usr/bin/env python

import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

TAG_RE = re.compile(b"^[A-Z0-9]{4}$")
YAA_MAGIC = b"YAA1"
TAG_LENGTH = 4
HEADER_LENGTH_BYTES = 2
HEADER_MINIMUM_LENGTH = 6
TYPE_LENGTH_BYTES = 1
PATH_LENGTH_BYTES = 2
DATA_LENGTH_BYTES = 2
DATA_LENGTH_BYTES_LONG = 4
LINK_LENGTH_BYTES = 2
RESYNC_SEARCH_WINDOW = 64 * 1024
ATTRIBUTE_SIZE_MAP = {
    b"UID1": 1,
    b"GID1": 1,
    b"UID2": 2,
    b"GID2": 2,
    b"MOD1": 1,
    b"MOD2": 2,
    b"FLG1": 1,
    b"FLG2": 2,
    b"FLG4": 4,
    b"MTMS": 8,
    b"MTMT": 12,
    b"FLI4": 4,
    b"AFT1": 1,
    b"AFR2": 2,
    b"AFT2": 2,
    b"AFR4": 4,
}


@dataclass
class YAAEntry:
    path: str
    file_type: str
    data_length: int


def read_exact(f, n):
    b = f.read(n)
    if not b or len(b) != n:
        return None
    return b


def read_header_length(f, file_size):
    raw = read_exact(f, HEADER_LENGTH_BYTES)
    if not raw:
        raise SystemExit(
            "Failed to read YAA1 header length (file truncated or invalid)."
        )

    header_len = int.from_bytes(raw, "little")
    if header_len <= HEADER_MINIMUM_LENGTH or header_len > file_size:
        raise SystemExit("Invalid header length")

    return header_len


def parse_attrs_in_header(f, header_end) -> Optional[YAAEntry]:
    path: Optional[str] = None
    file_type: Optional[str] = None
    data_len: Optional[int] = None

    while f.tell() + TAG_LENGTH <= header_end:
        tag = read_exact(f, TAG_LENGTH)
        if not tag or not TAG_RE.match(tag):
            if tag:
                f.seek(f.tell() - len(tag))
            break

        if tag == b"TYP1":
            entry_type = read_exact(f, TYPE_LENGTH_BYTES)
            if not entry_type:
                break
            file_type = entry_type.decode("utf-8")

        elif tag == b"PATP":
            length_bytes = read_exact(f, PATH_LENGTH_BYTES)
            if not length_bytes:
                break
            plen = int.from_bytes(length_bytes, "little")
            path_bytes = read_exact(f, plen) or b""
            try:
                path = path_bytes.decode("utf-8")
            except UnicodeDecodeError:
                path = None

        elif tag == b"DATA":
            length_bytes = read_exact(f, DATA_LENGTH_BYTES)
            if not length_bytes:
                break
            data_len = int.from_bytes(length_bytes, "little")

        elif tag == b"DATB":
            length_bytes = read_exact(f, DATA_LENGTH_BYTES_LONG)
            if not length_bytes:
                break
            data_len = int.from_bytes(length_bytes, "little")

        elif tag == b"LNKP":
            length_bytes = read_exact(f, LINK_LENGTH_BYTES)
            if not length_bytes:
                break
            l = int.from_bytes(length_bytes, "little")
            _ = read_exact(f, l)

        else:
            skip = ATTRIBUTE_SIZE_MAP.get(tag)
            if skip is None:
                f.seek(f.tell() - TAG_LENGTH)
                break
            _ = read_exact(f, skip)

    f.seek(header_end)

    if not path or not file_type or data_len is None:
        return None
    return YAAEntry(path=path, file_type=file_type, data_length=data_len)


def normalize_allowed_prefixes(allowed_prefixes):
    if not allowed_prefixes:
        return None

    normalized = []
    for p in allowed_prefixes:
        rp = Path(p)
        if not rp.is_absolute():
            rp = Path("/") / rp
        normalized.append(rp)
    return normalized


def file_length(f):
    f.seek(0, os.SEEK_END)
    size = f.tell()
    f.seek(0)
    return size


def scan_and_extract(f, outdir, allowed_prefixes=None, file_filter=None):
    norm_allowed = normalize_allowed_prefixes(allowed_prefixes)
    file_size = file_length(f)

    while f.tell() < file_size:
        pos = f.tell()
        magic = read_exact(f, TAG_LENGTH)
        if magic is None:
            break

        # If not YAA1, search forward for next occurrence
        if magic != YAA_MAGIC:
            # Move back to not miss overlapping occurrences
            back_pos = max(0, pos - (len(YAA_MAGIC) - 1))
            f.seek(back_pos)
            window = f.read(RESYNC_SEARCH_WINDOW)
            if not window:
                break
            rel = window.find(YAA_MAGIC)
            if rel == -1:
                break
            new_off = back_pos + rel
            f.seek(new_off + len(YAA_MAGIC))

        try:
            header_len = read_header_length(f, file_size)
        except SystemExit:
            break

        header_start = f.tell()
        header_end = header_start + (header_len - HEADER_MINIMUM_LENGTH)

        if header_end > file_size:
            break

        f.seek(header_start)
        entry = parse_attrs_in_header(f, header_end)
        path = entry.path if entry else None
        ftype = entry.file_type if entry else None
        data_len = entry.data_length if entry else None
        data_start = header_end

        allowed = True
        if path and norm_allowed is not None:
            full_path = Path("/") / path.lstrip("/")
            allowed = any(
                full_path == root or root in full_path.parents for root in norm_allowed
            )

        if (
            allowed
            and path
            and ftype == "F"
            and data_len
            and 0 < data_len <= file_size - data_start
        ):
            rel = Path(path.lstrip("/"))
            out_path = outdir / rel
            out_path.parent.mkdir(parents=True, exist_ok=True)

            f.seek(data_start)
            if file_filter:
                head = read_exact(f, min(4, data_len))
                if head is None:
                    break
                if not file_filter(path, head, data_len):
                    f.seek(data_start + data_len)
                else:
                    remaining = read_exact(f, data_len - len(head)) or b""
                    with out_path.open("wb") as w:
                        w.write(head)
                        w.write(remaining)
            else:
                payload = read_exact(f, data_len)
                if payload is not None:
                    with out_path.open("wb") as w:
                        w.write(payload)

        next_off = header_end + (data_len or 0)
        if next_off <= pos:
            break
        f.seek(next_off)


def expand(archive: Path, outdir: Path, allowed_prefixes=None, file_filter=None):
    outdir.mkdir(parents=True, exist_ok=True)
    with archive.open("rb") as f:
        scan_and_extract(
            f,
            outdir,
            allowed_prefixes=allowed_prefixes,
            file_filter=file_filter,
        )
