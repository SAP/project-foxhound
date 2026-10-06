#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with
# this file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""Generic HEVC test fixture generator for tests in this directory.

Encodes a short, redistributable ffmpeg `testsrc` clip as a fragmented HEVC
stream, optionally applies surgeries to the resulting moov, and splits the
file into an init segment plus per-fragment `.m4s` chunks suitable for
`MediaSource.appendBuffer` inputs.

This script is NOT run by CI. It is checked in as documentation and as a
fixture builder for tests in this directory. Run by hand whenever a test
needs new HEVC sample inputs or an existing fixture needs to be
regenerated.

================================================================
Pipeline
================================================================

1. Encode N frames of `testsrc` with libx265 to a fragmented MP4. The
   knobs exposed on the CLI cover the things that affect HEVC config
   shape: sample-entry tag (`hev1` vs `hvc1`), whether VPS/SPS/PPS travel
   in-band on every IDR (`repeat-headers`), GOP layout (`--keyint`),
   fragment cadence (`--frag-duration`), and resolution / framerate /
   duration.
2. Optionally rewrite parts of the moov. Today there is one surgery:
   `--sps-less` zeros byte 22 of the `hvcC` payload (`numOfArrays = 0`),
   producing the spec-valid SPS-less out-of-band record used by hev1
   streams whose parameter sets travel in-band.
3. Split the file: every top-level box before the first `moof` becomes
   `<prefix>init.mp4`; each subsequent `moof+mdat` pair becomes
   `<prefix>chunkN.m4s`.

To support a new HEVC shape that needs more than the encoder knobs above,
add a new surgery in `split_fixture` behind a descriptive CLI flag. Keep
each surgery idempotent.

================================================================
Cookbook
================================================================

Default: conventional hvc1 sample entry with VPS/SPS/PPS only in the
moov's hvcC (out-of-band), single GOP, five CMAF chunks at 25 fps. This
is the shape a generic HEVC mochitest fixture would use.

  python3 generate_hevc_synth_fixtures.py

Bug 2039853 fixtures: SPS-less hev1 with in-band parameter sets. The
explicit flags below, with the script's other defaults unchanged,
reproduce `bug2039853_hevc_init.mp4` and `bug2039853_hevc_chunk{0..4}.m4s`
byte-for-byte against the reference toolchain.

  python3 generate_hevc_synth_fixtures.py \\
      --tag hev1 --in-band-params --sps-less \\
      --name-prefix bug2039853_hevc_

hev1 with in-band parameter sets on every IDR AND a fully populated
out-of-band hvcC (parameter sets in both places):

  python3 generate_hevc_synth_fixtures.py \\
      --tag hev1 --in-band-params \\
      --name-prefix hevc_dup_

Multi-GOP stream (a keyframe inside every fragment):

  python3 generate_hevc_synth_fixtures.py \\
      --duration 4 --keyint 25 --frag-duration 1000000 \\
      --name-prefix hevc_multigop_

Different resolution / framerate / single fragment:

  python3 generate_hevc_synth_fixtures.py \\
      --size 640x360 --fps 30 --duration 1 --frag-duration 1000000 \\
      --name-prefix hevc_360p_

Tip: pass `--keep-raw` to also write the unsplit `raw_frag.mp4` into
`--output-dir` for inspection with `mp4dump` or similar.

================================================================
Reference ffmpeg invocation
================================================================

Default invocation (conventional hvc1, out-of-band parameter sets):

  ffmpeg -y -f lavfi -i "testsrc=size=320x240:rate=25:duration=2" \\
    -c:v libx265 -tag:v hvc1 -pix_fmt yuv420p \\
    -x265-params "keyint=250:min-keyint=250:no-scenecut=1:repeat-headers=0" \\
    -movflags empty_moov+default_base_moof+frag_custom \\
    -frag_duration 400000 \\
    raw_frag.mp4

Then split moof+mdat pairs into chunkN.m4s files (no hvcC surgery).

Bug 2039853 invocation (SPS-less hev1, in-band parameter sets) -- this
is what the cookbook's `--tag hev1 --in-band-params --sps-less` line
expands to:

  ffmpeg -y -f lavfi -i "testsrc=size=320x240:rate=25:duration=2" \\
    -c:v libx265 -tag:v hev1 -pix_fmt yuv420p \\
    -x265-params "keyint=250:min-keyint=250:no-scenecut=1:repeat-headers=1" \\
    -movflags empty_moov+default_base_moof+frag_custom \\
    -frag_duration 400000 \\
    raw_frag.mp4

Then zero byte 22 of the `hvcC` payload (the `--sps-less` surgery) and
split moof+mdat pairs into chunkN.m4s files.

================================================================
Reference toolchain
================================================================

The bug 2039853 binary fixtures were produced with:
  - ffmpeg 6.1.1-3ubuntu5 (libavformat 60.16.100, libavcodec 60.31.102)
  - libx265 3.5-2build1 (build 199, 3.5+1-f0c1022b6)

Re-running this script with that toolchain and the bug 2039853 flags
above regenerates every byte. libx265 embeds its build identity and
full parameter dump in an SEI NAL, so any libx265 version change will
yield a binary diff; the fixtures remain functionally equivalent across
libx265 versions but cmp(1) will diverge.
"""

import argparse
import os
import struct
import subprocess
import sys
import tempfile

# Defaults produce a conventional hvc1 / out-of-band-params HEVC fragmented MP4.
# See the docstring's cookbook for explicit invocations that reproduce specific
# test fixtures byte-for-byte (e.g. the bug 2039853 SPS-less hev1 shape).
DEFAULT_SIZE = "320x240"
DEFAULT_FPS = 25
DEFAULT_DURATION = 2.0
DEFAULT_FRAG_DURATION_US = 400000
DEFAULT_KEYINT = 250
DEFAULT_TAG = "hvc1"
DEFAULT_NAME_PREFIX = "hevc_test_"


def parse_boxes(data, off, end):
    out = []
    while off + 8 <= end:
        size = struct.unpack(">I", data[off : off + 4])[0]
        typ = data[off + 4 : off + 8].decode("latin1", errors="replace")
        hdr = 8
        if size == 1:
            size = struct.unpack(">Q", data[off + 8 : off + 16])[0]
            hdr = 16
        elif size == 0:
            size = end - off
        out.append((typ, off, size, hdr))
        off += size
        if size <= 0:
            break
    return out


def find_hvcC_payload(data):
    """Return the absolute offset of the hvcC box payload, or None."""

    def rec(start, end):
        for typ, off, size, hdr in parse_boxes(data, start, end):
            if typ == "hvcC":
                return off + hdr
            if typ in ("moov", "trak", "mdia", "minf", "stbl"):
                r = rec(off + hdr, off + size)
                if r:
                    return r
            elif typ == "stsd":
                # FullBox: skip 4 byte version+flags + 4 byte entry_count.
                r = rec(off + hdr + 8, off + size)
                if r:
                    return r
            elif typ in ("hev1", "hvc1"):
                # VisualSampleEntry: skip 78 byte fixed header.
                r = rec(off + hdr + 78, off + size)
                if r:
                    return r
        return None

    return rec(0, len(data))


def encode_with_ffmpeg(
    out_path, size, fps, duration, keyint, frag_duration_us, tag, in_band, ffmpeg
):
    repeat_headers = 1 if in_band else 0
    x265_params = (
        f"keyint={keyint}:min-keyint={keyint}"
        f":no-scenecut=1:repeat-headers={repeat_headers}"
    )
    cmd = [
        ffmpeg,
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"testsrc=size={size}:rate={fps}:duration={duration}",
        "-c:v",
        "libx265",
        "-tag:v",
        tag,
        "-pix_fmt",
        "yuv420p",
        "-x265-params",
        x265_params,
        "-movflags",
        "empty_moov+default_base_moof+frag_custom",
        "-frag_duration",
        str(frag_duration_us),
        out_path,
    ]
    print("$ " + " ".join(cmd), file=sys.stderr)
    subprocess.check_call(cmd)


def split_fixture(src_path, out_dir, name_prefix, sps_less):
    data = bytearray(open(src_path, "rb").read())

    if sps_less:
        payload = find_hvcC_payload(data)
        if payload is None:
            sys.exit(f"error: no hvcC box found in {src_path}")
        print(
            f"hvcC payload @ {payload}; numOfArrays was "
            f"{data[payload + 22]}, writing 0 (--sps-less)"
        )
        data[payload + 22] = 0

    top = parse_boxes(data, 0, len(data))
    first_moof = next((off for typ, off, _s, _h in top if typ == "moof"), None)
    if first_moof is None:
        sys.exit("error: no moof box in source -- not a fragmented MP4")

    init_path = os.path.join(out_dir, f"{name_prefix}init.mp4")
    open(init_path, "wb").write(bytes(data[:first_moof]))
    print(f"  {os.path.basename(init_path)}: {first_moof} bytes")

    pairs = [
        (typ, off, size) for typ, off, size, _hdr in top if typ in ("moof", "mdat")
    ]
    chunk_idx = 0
    i = 0
    while i < len(pairs):
        if pairs[i][0] != "moof":
            sys.exit(f"error: expected moof at top-level pair {i}, got {pairs[i][0]}")
        start = pairs[i][1]
        end = pairs[i + 2][1] if i + 2 < len(pairs) else len(data)
        chunk_path = os.path.join(out_dir, f"{name_prefix}chunk{chunk_idx}.m4s")
        open(chunk_path, "wb").write(bytes(data[start:end]))
        print(f"  {os.path.basename(chunk_path)}: {end - start} bytes")
        chunk_idx += 1
        i += 2


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--output-dir",
        default=here,
        help="Where to write the fixtures (default: alongside this script).",
    )
    parser.add_argument(
        "--name-prefix",
        default=DEFAULT_NAME_PREFIX,
        help=(
            "Filename prefix. Outputs are <prefix>init.mp4 and "
            f"<prefix>chunkN.m4s (default '{DEFAULT_NAME_PREFIX}')."
        ),
    )

    # Encoder shape.
    parser.add_argument(
        "--tag",
        choices=("hev1", "hvc1"),
        default=DEFAULT_TAG,
        help=(
            "MP4 sample entry type. hev1 allows in-band parameter sets; "
            f"hvc1 forbids them (default '{DEFAULT_TAG}')."
        ),
    )
    parser.add_argument(
        "--in-band-params",
        action="store_true",
        dest="in_band",
        default=False,
        help=(
            "Set libx265 repeat-headers=1 so VPS/SPS/PPS are emitted "
            "in-band on every IDR. Off by default; required only for the "
            "hev1 / in-band-params shape (e.g. CMAF low-latency)."
        ),
    )
    parser.add_argument(
        "--out-of-band-params",
        action="store_false",
        dest="in_band",
        help=(
            "Set libx265 repeat-headers=0; parameter sets travel only "
            "out-of-band in the moov's hvcC (default)."
        ),
    )

    # Clip shape.
    parser.add_argument(
        "--size",
        default=DEFAULT_SIZE,
        help=f"Picture size WIDTHxHEIGHT (default {DEFAULT_SIZE}).",
    )
    parser.add_argument(
        "--fps",
        type=int,
        default=DEFAULT_FPS,
        help=f"Frame rate (default {DEFAULT_FPS}).",
    )
    parser.add_argument(
        "--duration",
        type=float,
        default=DEFAULT_DURATION,
        help=f"Clip duration in seconds (default {DEFAULT_DURATION}).",
    )
    parser.add_argument(
        "--keyint",
        type=int,
        default=DEFAULT_KEYINT,
        help=(
            "libx265 keyint / min-keyint (default "
            f"{DEFAULT_KEYINT}; values >= total frame count force a single GOP)."
        ),
    )
    parser.add_argument(
        "--frag-duration",
        type=int,
        default=DEFAULT_FRAG_DURATION_US,
        help=(
            "ffmpeg -frag_duration in microseconds "
            f"(default {DEFAULT_FRAG_DURATION_US} = "
            f"{DEFAULT_FRAG_DURATION_US / 1e6:g}s)."
        ),
    )

    # Post-processing surgeries (add more as future shapes need them).
    parser.add_argument(
        "--sps-less",
        action="store_true",
        dest="sps_less",
        default=False,
        help=(
            "Zero byte 22 (numOfArrays) of the hvcC payload, making the "
            "out-of-band record SPS-less. Off by default; SPS-less hvcC "
            "is valid but uncommon and only meaningful with in-band "
            "parameter sets."
        ),
    )
    parser.add_argument(
        "--keep-sps",
        action="store_false",
        dest="sps_less",
        help=(
            "Leave the hvcC numOfArrays / parameter set arrays as encoded (default)."
        ),
    )

    # Plumbing.
    parser.add_argument(
        "--ffmpeg",
        default="ffmpeg",
        help="Path to the ffmpeg binary (default: $PATH lookup).",
    )
    parser.add_argument(
        "--keep-raw",
        action="store_true",
        help=(
            "Keep the intermediate raw_frag.mp4 in --output-dir for "
            "inspection (e.g. via mp4dump)."
        ),
    )

    args = parser.parse_args()

    if args.tag == "hvc1" and args.in_band:
        print(
            "warning: --tag hvc1 with --in-band-params is unusual; "
            "hvc1 sample entries forbid in-band parameter sets.",
            file=sys.stderr,
        )

    os.makedirs(args.output_dir, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        raw = os.path.join(tmp, "raw_frag.mp4")
        encode_with_ffmpeg(
            raw,
            args.size,
            args.fps,
            args.duration,
            args.keyint,
            args.frag_duration,
            args.tag,
            args.in_band,
            args.ffmpeg,
        )
        if args.keep_raw:
            kept = os.path.join(args.output_dir, "raw_frag.mp4")
            with open(raw, "rb") as fi, open(kept, "wb") as fo:
                fo.write(fi.read())
            print(f"kept intermediate: {kept}")
        split_fixture(raw, args.output_dir, args.name_prefix, args.sps_less)


if __name__ == "__main__":
    main()
