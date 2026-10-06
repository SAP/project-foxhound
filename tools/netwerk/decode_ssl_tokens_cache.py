#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = ["brotli", "cryptography", "darkdetect", "humanize", "rich"]
# ///
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""Decode and display the contents of an ssl_tokens_cache.bin file.

File format:
  magic:   4 bytes  b"STCF"
  version: 1 byte

Version 2:
  body:    zlib-compressed bincode-1.3 Vec<PersistedRecord>
  PersistedRecord contains separate token and cert-chain fields with raw DER.

Version 3:
  body:    bincode-1.3 Vec<PersistedRecord>
  checksum: 4-byte little-endian Adler-32 of body
  PersistedRecord contains a single compressed_payload field
  (token + cert info packed together and compressed).

Run with ``uv run decode_ssl_tokens_cache.py`` for automatic dependency
installation, or ``pip install brotli cryptography darkdetect humanize rich``
for plain Python.
"""

import argparse
import datetime
import io
import struct
import sys
import warnings
import zlib
from collections.abc import Callable
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import NamedTuple, TypeVar, cast

try:
    import darkdetect
    import humanize
    from rich import box as rich_box
    from rich.console import Console
    from rich.panel import Panel
    from rich.table import Table
    from rich.text import Text
    from rich.theme import Theme
except ImportError as e:
    sys.exit(
        f"Missing dependency: {e.name}\n"
        f"Run with: uv run {sys.argv[0]}\n"
        f"Or install manually: pip install darkdetect humanize rich"
    )

_DARK_THEME = Theme({"label": "dim", "cert": "cyan", "live": "green"})
_LIGHT_THEME = Theme({"label": "italic", "cert": "dark_cyan", "live": "dark_green"})

try:
    from cryptography import x509 as _x509
except ImportError:
    _x509 = None  # type: ignore[assignment]

try:
    import brotli as _brotli
except ImportError:
    _brotli = None  # type: ignore[assignment]

MAGIC = b"STCF"
SUPPORTED_VERSIONS = (2, 3)

T = TypeVar("T")


def _adler32_le(data: bytes) -> bytes:
    return struct.pack("<I", zlib.adler32(data))


class DecodeError(Exception):
    pass


@dataclass
class Record:
    key: str
    expires: datetime.datetime
    token: bytes
    ev_status: int
    ct_status: int
    overridable_error: int
    server_cert: bytes
    succeeded_cert_chain: list[bytes] | None
    handshake_certs: list[bytes] | None
    built_in_root: bool | None
    size: int = 0


class _ParsedPayload(NamedTuple):
    token: bytes
    ev: int
    ct: int
    builtin_root: bool | None
    server_cert: bytes
    succeeded: list[bytes] | None
    handshake: list[bytes] | None


_EMPTY_PAYLOAD = _ParsedPayload(b"", 0, 0, None, b"", None, None)


def _decompress_payload(data: bytes) -> bytes | None:
    """Decompress a record payload (4-byte LE original-size prefix + compressed body)."""
    if len(data) < 4:
        return None
    if _brotli is None:
        return None
    try:
        return _brotli.decompress(data[4:])
    except Exception:  # pylint: disable=broad-exception-caught
        return None


def _parse_payload(payload: bytes) -> _ParsedPayload:
    buf = io.BytesIO(payload)

    def read(n: int) -> bytes:
        chunk = buf.read(n)
        if len(chunk) != n:
            raise DecodeError("truncated payload")
        return chunk

    def u8() -> int:
        return struct.unpack_from("<B", read(1))[0]

    def u16() -> int:
        return struct.unpack_from("<H", read(2))[0]

    def u32() -> int:
        return struct.unpack_from("<I", read(4))[0]

    def read_bytes() -> bytes:
        return read(u32())

    def read_chain() -> list[bytes] | None:
        if not u8():
            return None
        return [read_bytes() for _ in range(u8())]

    token = read_bytes()
    ev = u8()
    ct = u16()
    u8()  # overridable_error — also stored at the PersistedRecord level; use that value
    builtin_tag = u8()
    builtin_root: bool | None = None if builtin_tag == 0 else (builtin_tag == 2)
    server_cert = read_bytes()
    succeeded = read_chain()
    handshake = read_chain()
    if buf.read(1):
        raise DecodeError("trailing bytes in payload")
    return _ParsedPayload(
        token, ev, ct, builtin_root, server_cert, succeeded, handshake
    )


class Reader:
    """Minimal bincode-1.3 (little-endian, u64 lengths) stream reader."""

    _U8 = struct.Struct("<B")
    _U16 = struct.Struct("<H")
    _U64 = struct.Struct("<Q")
    _I64 = struct.Struct("<q")

    def __init__(self, data: bytes, version: int = 2):
        self._buf = io.BytesIO(data)
        self._len = len(data)
        self._version = version

    def remaining(self) -> int:
        return self._len - self._buf.tell()

    def _read(self, n: int) -> bytes:
        chunk = self._buf.read(n)
        if len(chunk) != n:
            raise DecodeError(
                f"truncated: need {n} bytes at offset {self._buf.tell()}, "
                f"only {len(chunk)} available"
            )
        return chunk

    def _unpack(self, fmt: struct.Struct) -> int:
        (value,) = fmt.unpack(self._read(fmt.size))
        return cast(int, value)

    def u8(self) -> int:
        return self._unpack(self._U8)

    def u16(self) -> int:
        return self._unpack(self._U16)

    def u64(self) -> int:
        return self._unpack(self._U64)

    def i64(self) -> int:
        return self._unpack(self._I64)

    def read_bool(self) -> bool:
        return bool(self.u8())

    def bytes_vec(self) -> bytes:
        return self._read(self.u64())

    def vec_of_bytes(self) -> list[bytes]:
        return [self.bytes_vec() for _ in range(self.u64())]

    def option(self, f: Callable[[], T]) -> T | None:
        tag = self.u8()
        if not tag:
            return None
        if tag == 1:
            return f()
        raise DecodeError(f"invalid Option discriminant {tag}")

    @staticmethod
    def _make_record(
        key: str, expires: datetime.datetime, p: _ParsedPayload, overridable: int
    ) -> Record:
        return Record(
            key=key,
            expires=expires,
            token=p.token,
            ev_status=p.ev,
            ct_status=p.ct,
            overridable_error=overridable,
            server_cert=p.server_cert,
            succeeded_cert_chain=p.succeeded,
            handshake_certs=p.handshake,
            built_in_root=p.builtin_root,
        )

    def _record_v2(self, key: str, expires: datetime.datetime) -> Record:
        token = self.bytes_vec()
        ev = self.u8()
        ct = self.u16()
        overridable = self.u8()
        server_cert = self.bytes_vec()
        succeeded = self.option(self.vec_of_bytes)
        handshake = self.option(self.vec_of_bytes)
        builtin_root = self.option(self.read_bool)
        return self._make_record(
            key,
            expires,
            _ParsedPayload(
                token, ev, ct, builtin_root, server_cert, succeeded, handshake
            ),
            overridable,
        )

    def _record_v3(self, key: str, expires: datetime.datetime) -> Record:
        overridable = self.u8()
        raw_payload = self.bytes_vec()
        p = _EMPTY_PAYLOAD
        payload = _decompress_payload(raw_payload)
        if payload is not None:
            try:
                p = _parse_payload(payload)
            except DecodeError:
                pass
        return self._make_record(key, expires, p, overridable)

    def record(self) -> Record:
        start = self._buf.tell()
        self.u64()  # session-internal id, re-assigned on load; not displayed
        key = self.bytes_vec().decode("utf-8", errors="replace")
        prtime = self.i64()
        expires = datetime.datetime.fromtimestamp(
            prtime / 1e6, tz=datetime.timezone.utc
        )
        rec = (self._record_v3 if self._version >= 3 else self._record_v2)(key, expires)
        rec.size = self._buf.tell() - start
        return rec

    def records(self) -> list[Record]:
        return [self.record() for _ in range(self.u64())]


@lru_cache(maxsize=256)
def cert_subject(der: bytes) -> str:
    if _x509 is not None:
        try:
            return str(_x509.load_der_x509_certificate(der).subject.rfc4514_string())
        except Exception:  # pylint: disable=broad-exception-caught
            pass
    return f"<{len(der)} bytes DER>"


def _hexdump_text(data: bytes) -> Text:
    t = Text()
    for off in range(0, len(data), 16):
        chunk = data[off : off + 16]
        hex_part = " ".join(f"{b:02x}" for b in chunk)
        asc_part = "".join(chr(b) if 0x20 <= b < 0x7F else "." for b in chunk)
        t.append(f"{off:04x}", style="dim")
        t.append(f"  {hex_part:<47}  ")
        t.append(asc_part, style="dim")
        t.append("\n")
    return t


def _chain_text(chain: list[bytes], verbose: int) -> str:
    count = f"{len(chain)} cert(s)"
    if verbose >= 1:
        subjects = "  ".join(cert_subject(c) for c in chain)
        return f"{count}  {subjects}"
    return count


def print_record(
    idx: int, rec: Record, verbose: int, now: datetime.datetime, console: Console
) -> None:
    expired = rec.expires < now

    tbl = Table(box=None, show_header=False, show_edge=False, padding=(0, 1, 0, 0))
    tbl.add_column(style="label", min_width=11, no_wrap=True)
    tbl.add_column()

    rel = humanize.naturaltime(rec.expires, when=now)
    status = (
        Text("EXPIRED", style="bold red") if expired else Text("live", style="live")
    )
    tbl.add_row(
        "expires",
        Text.assemble(
            rec.expires.strftime("%Y-%m-%d %H:%M:%S UTC"),
            ("  ", ""),
            (f"({rel})", "dim"),
            "  ",
            status,
        ),
    )
    tbl.add_row("token", humanize.naturalsize(len(rec.token)))
    if verbose >= 2:
        tbl.add_row("", _hexdump_text(rec.token))

    flag_parts = [
        f"ev={rec.ev_status}",
        f"ct={rec.ct_status}",
        f"ovr_error={rec.overridable_error}",
        *([] if rec.built_in_root is None else [f"built_in_root={rec.built_in_root}"]),
    ]
    tbl.add_row("flags", "  ".join(flag_parts))

    if rec.server_cert:
        tbl.add_row("server cert", Text(cert_subject(rec.server_cert), style="cert"))
    for label, chain in [
        ("chain", rec.succeeded_cert_chain),
        ("hs certs", rec.handshake_certs),
    ]:
        if chain is not None:
            tbl.add_row(label, _chain_text(chain, verbose))

    console.print(
        Panel(
            tbl,
            title=f"[bold][{idx}][/] {rec.key}  [dim]{humanize.naturalsize(rec.size)}[/]",
            title_align="left",
            box=rich_box.ROUNDED,
            border_style="red" if expired else "default",
        )
    )


def decode(path: str, verbose: int, console: Console) -> None:
    data = Path(path).read_bytes()

    if len(data) < 5:
        raise DecodeError("file too short to contain header")
    magic, version = data[:4], data[4]
    if magic != MAGIC:
        raise DecodeError(f"bad magic: expected {MAGIC!r}, got {magic!r}")
    if version not in SUPPORTED_VERSIONS:
        raise DecodeError(
            f"unsupported version {version} "
            f"(this script handles versions {SUPPORTED_VERSIONS})"
        )

    if version >= 3 and _brotli is None:
        warnings.warn(
            "brotli package not found; cert info will be unavailable for v3 records",
            stacklevel=2,
        )

    if version >= 3:
        if len(data) < 5 + 4:
            raise DecodeError("file too short to contain checksum")
        payload, stored_checksum = data[5:-4], data[-4:]
        computed = _adler32_le(payload)
        if computed != stored_checksum:
            raise DecodeError(
                f"checksum mismatch: file may be corrupt "
                f"(stored {stored_checksum.hex()}, computed {computed.hex()})"
            )
    else:
        try:
            payload = zlib.decompress(data[5:])
        except zlib.error as e:
            raise DecodeError(f"zlib decompression failed: {e}") from e

    reader = Reader(payload, version)
    records = reader.records()

    if reader.remaining():
        warnings.warn(
            f"{reader.remaining()} trailing bytes after records", stacklevel=2
        )

    now = datetime.datetime.now(datetime.timezone.utc)
    n_expired = sum(r.expires < now for r in records)

    summary = Table(box=None, show_header=False, show_edge=False, padding=(0, 1, 0, 0))
    summary.add_column(style="label")
    summary.add_column()
    summary.add_row("version", str(version))
    summary.add_row("records", f"{len(records)} [dim]({n_expired} expired)[/dim]")
    summary.add_row("body", humanize.naturalsize(len(payload)))
    console.print(
        Panel(
            summary, title=f"[bold]{path}[/]", title_align="left", box=rich_box.ROUNDED
        )
    )
    console.print()

    for i, rec in enumerate(records):
        print_record(i, rec, verbose, now, console)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Decode an ssl_tokens_cache.bin file from a Firefox profile."
    )
    parser.add_argument("file", help="path to ssl_tokens_cache.bin")
    parser.add_argument(
        "-v",
        "--verbose",
        action="count",
        default=0,
        help="-v: show cert chain subjects; -vv: also hexdump token bytes",
    )
    parser.add_argument(
        "--no-color",
        action="store_true",
        help="disable color output",
    )
    args = parser.parse_args()

    con = (
        Console(no_color=True, theme=_LIGHT_THEME)
        if args.no_color
        else Console(theme=_DARK_THEME if darkdetect.isDark() else _LIGHT_THEME)
    )

    try:
        decode(args.file, args.verbose, con)
    except (DecodeError, OSError) as e:
        Console(stderr=True).print(f"[bold red]error:[/] {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
