# MAR Files

MAR files, short for Mozilla ARchive files, are integral to Firefox Application
Update, so this page will document what they are and go into their structure in
some detail.

## Overview

A MAR file consists of headers, signatures, multiple files including at least
one manifest, and an index. Only one manifest, of the newest supported version,
will be used; others will be ignored.

The manifest must be a complete file, but others may be patch files. Patch files
are used to transform the old version of the file to the new version. Currently
supported patch algorithms are bspatch and Zucchini.

Files are optionally compressed. Currently supported compression algorithms are
bzip2 and xz.

## Types of MARs

There are two types of MAR files: partial MARs and complete MARs.

A complete MAR contains an entire installation. It does not require any
particular files to be on disk in order to update. Theoretically, it can be used
to update from any version, but
[Watershed Updates](../../../../update-infrastructure/index.md#watershed-updates)
complicate this somewhat.

A partial MAR contains only the changes between one version and another. While
they may contain some files in their entirety, they mostly have binary patches
that can be used to update an existing file to the new version. The advantage of
this is that partial MARs can be much smaller than complete MARs. But the
disadvantage is that a partial MAR must target a specific version of Firefox so
that we can provide the correct patches to update that version of the files. And
we just cannot provide a partial targeting every version of Firefox. We
currently generate partials for the previous four versions released (including
point versions). When Firefox is more out-of-date than that, a complete MAR must
be used. Another limitation is that the files on the disk must not have been
changed. We verify this by including headers in the patch file with the expected
size and CRC of the existing file. If these do not match the file on disk, the
update fails and we fall back to using a complete MAR.

## Manifest

The manifest is a special file included in the MAR that describes the contents
of the MAR and how to install it. It is identified by its filename:
`updatev3.manifest`.

Empty lines and `#`-prefixed comment lines are allowed. Otherwise, each line of
the manifest will consist of a method name followed by variable number of quoted
parameters. These are separated by an arbitrary amount of space (`0x20`) and/or
tab (`0x09`) characters. The lines must end with a Windows/CRLF newline
(`0x0D0A`).

Here is an example manifest containing each of the possible method types:

```
type "partial"
add "2/20/20text0"
add-if "distribution/extensions/extensions0" "distribution/extensions/extensions0/extensions0text0"
add-if-not "defaults/pref/channel-prefs.js" "defaults/pref/channel-prefs.js"
patch "0/0exe0.exe.patch" "0/0exe0.exe"
patch-if "distribution/extensions/extensions1" "distribution/extensions/extensions1/extensions1png1.png.patch" "distribution/extensions/extensions1/extensions1png1.png"
remove "1/10/10text0"
rmdir "9/99/"
rmrfdir "9/98/"
```

`type` is special method that should be `partial` or `complete` depending on
[what kind of MAR this is](#types-of-mars). If included, it must be the first
method specified. The rest are implemented by classes deriving from `Action` in
`/toolkit/mozapps/update/updater/updater.cpp`.

## Manipulation

The recommended way to manually manipulate (create, extract, sign, etc) MAR
files is with the tool located
[here](https://github.com/mozilla-releng/build-mar).

## MAR Structure

This section was almost directly copied from
[the wiki](https://wiki.mozilla.org/Software_Update:MAR) in order to consolidate
our documentation into a place where it is more likely to be updated. This
document should be considered more up-to-date than that one.

### Why the bespoke structure?

This question was given a fair amount of consideration. Ultimately, we decided
to go with a custom file format because using libjar would have required a fair
bit of hacking. Writing custom code was a simpler option, and it resulted in
less code (mar_read.c is less than 300 lines of code). Moreover, the update
system does not need a standard file format. The elements stored in the archive
are bzip2 compressed binary diffs, generated using a variation of bsdiff. So,
being able to unpack the archive file using standard tools wouldn't be very
useful in and of itself.

### Byte Ordering

All fields are in big-endian format. The signatures are in
NSS / OpenSSL / big-endian order and not CryptoAPI order. If CryptoAPI is used
to check a signature, the bytes of the signature must be reversed before
verifying the signature using CryptVerifySignature.

### Constraints

To protect against invalid inputs the following constraints are in place:

- There are at most 8 signatures.
- The file size of the MAR file is at most 500MB.
- No signature is more than 2048 bytes long.

### File Layout

The following sections, in the given order, make up the structure of a MAR
file. Some of these sections have been added over time and thus may not be
present in sufficiently old MAR files. Old parsers will completely ignore these
sections as they will simply appear to be unaddressed space in the "Files"
section. Modern updater binaries will, however, reject MAR files without
signatures.

#### Header

1. (4 bytes) MAR identifier which must be `MAR1`.
2. (4 bytes) Byte offset of the file index header relative to the start of the
   file.
3. (8 bytes) Size in bytes of the entire MAR file.
4. (4 bytes) Number of signatures (minimum of 0, maximum of 8).

#### Signatures

This section will be repeated as many times as indicated by the relevant header.
Note that these signatures must sign all bytes of the MAR file excluding the
signatures themselves.

1. (4 bytes) ID representing the type of signature algorithm.
2. (4 bytes) Size in bytes of the signature that follows.
3. The signature itself.

#### Additional Sections Header

This consists of 4 bytes representing the number of additional sections.

#### Additional Sections

There will be as many of these sections as indicated in the Additional Sections
Header, immediately prior.

1. (4 bytes) Section size, in bytes. Note that, unlike the signature size, this
   is the size of the section and its metadata (the size and identifier).
2. (4 bytes) Section identifier.
3. The rest of the section. Consists of 8 bytes fewer than the section size
   given above.

#### Files

All file data. Must be addressed by the index, below. The length will be the sum
of content sizes of all files in the index.

#### Index header

This consists of 4 bytes representing the size of the index in bytes.

#### Index entry

This section will be repeated to fill the size indicated by the index header,
describing all files contained in the MAR.

1. (4 bytes) Byte offset of the file, relative to the start of the MAR.
2. (4 bytes) The content size in bytes.
3. (4 bytes) File permission bits, in standard unix-style format.
4. Variable length filename
5. (1 byte) Null terminator

### Additional Sections

These are meant to be flexible, so more could potentially be added later.

#### Product Information

The product information section identifies the product and channel this MAR file
applies to. It also includes the new version number to avoid downgrades.

This section has this structure:

1. (4 bytes) The size of the product information block.
2. (4 bytes) The section ID, `1` in this case.
3. (<64 bytes) The product and channel (such as from MAR_CHANNEL_ID).
   Example: mozilla-central
4. (1 byte) Null terminator.
5. (<32 bytes) The product version string (such as from MOZ_APP_VERSION)
   Examples: 12.0.1.5371, 12.0a1
6. (1 byte) Null terminator.

## Modifying Test MARs

Occasionally we need to modify a MAR file that we use in testing. These are some
modifications that have been needed before and the steps to accomplish them.

### Rename Files

In this example, we will rename some of the files in `partial_mac.mar`.

Regarding signing, note the following useful things: (a) The test MAR signatures
successfully verify against
`toolkit/mozapps/update/updater/xpcshellCertificate.der` and (b) according to
[this comment](https://searchfox.org/mozilla-central/rev/fc00627e34639ef1014e87d9fa24091905e9dc5d/toolkit/mozapps/update/updater/moz.build#41-43),
that certificate was generated from `mycert` in
`modules/libmar/tests/unit/data`.

1.  `./mach build` so that `<obj>/dist/bin/signmar` is available.
2.  Install the MAR manipulation utility, if necessary: `pip install mar`.
3.  Make a temporary working directory:
    `cd /path/to/mozilla/repo && mkdir temp && cd temp`
4.  Extracted the MAR to be changed:
    `mar -J -x ../toolkit/mozapps/update/tests/data/partial_mac.mar`.
    The `-J` specifies a compression type of `xz`. You can instead specify
    `--auto` to automatically detect the compression type (though you may want
    to know the original compression later for recompression). You can check
    the compression type by running
    `mar -T ../toolkit/mozapps/update/tests/data/partial_mac.mar` and looking for
    the `Compression type:` line.
5.  Rename extracted files, as necessary.
6.  Edit `updatev2.manifest` and `updatev3.manifest` to update the changed paths.
7.  Run `mar -T ../toolkit/mozapps/update/tests/data/partial_mac.mar` to get a
    complete list of the files originally in that MAR as well as the
    product/version and channel strings (in this case `xpcshell-test` and `*`
    respectively).
8.  Create the new MAR:
    `mar -J -c partial_mac_unsigned.mar -V '*' -H xpcshell-test <file1> <file2> ...`,
    individually specifying each file path listed in by `mar -T`, substituting
    with renamed paths as necessary.
9.  Sign the MAR:
    `../<obj>/dist/bin/signmar -d ../modules/libmar/tests/unit/data -n mycert -s partial_mac_unsigned.mar partial_mac.mar`.
10. To verify signing:
    `../<obj>/dist/bin/signmar -D ../toolkit/mozapps/update/updater/xpcshellCertificate.der -v partial_mac.mar`.
    This appears to output nothing on success, but it's probably good to check
    to make sure `echo $?` displays `0`. I also compared the output of
    `mar -T partial_mac.mar` to that of the original.
11. To verify files: Extract the new MAR with
    `mkdir cmp && cd cmp && mar -J -x ../partial_mac.mar && cd ..` and verify
    the files match the originals.
12. Overwrite the original MAR with the new one and remove the `temp`
    directory:
    `cd .. && mv -f temp/partial_mac.mar toolkit/mozapps/update/tests/data/partial_mac.mar && rm -rf temp`

### Generate Zucchini Partials

In this example, we will generate partial MARs using Zucchini rather than
bspatch.

First, note that in `partial.mar`, all exe patches are the same patch (turning
`complete.exe` into `partial.exe`), and all png patches are the same patch
(turning `complete.png` into `partial.png`):

```
$ mar -J -x ../partial.mar

$ grep -r MBDIFF10 .
Binary file ./0/00/00png0.png.patch matches
Binary file ./0/0exe0.exe.patch matches
Binary file ./distribution/extensions/extensions0/extensions0png0.png.patch matches
Binary file ./distribution/extensions/extensions0/extensions0png1.png.patch matches
Binary file ./distribution/extensions/extensions1/extensions1png0.png.patch matches
Binary file ./distribution/extensions/extensions1/extensions1png1.png.patch matches
Binary file ./exe0.exe.patch matches
Binary file ./searchplugins/searchpluginspng0.png.patch matches
Binary file ./searchplugins/searchpluginspng1.png.patch matches

$ md5sum ./0/00/00png0.png.patch ./distribution/extensions/extensions0/extensions0png0.png.patch ./distribution/extensions/extensions0/extensions0png1.png.patch ./distribution/extensions/extensions1/extensions1png0.png.patch ./distribution/extensions/extensions1/extensions1png1.png.patch ./searchplugins/searchpluginspng0.png.patch ./searchplugins/searchpluginspng1.png.patch
69ab8dc8614e6bb154c029b12ca8e3e9 *./0/00/00png0.png.patch
69ab8dc8614e6bb154c029b12ca8e3e9 *./distribution/extensions/extensions0/extensions0png0.png.patch
69ab8dc8614e6bb154c029b12ca8e3e9 *./distribution/extensions/extensions0/extensions0png1.png.patch
69ab8dc8614e6bb154c029b12ca8e3e9 *./distribution/extensions/extensions1/extensions1png0.png.patch
69ab8dc8614e6bb154c029b12ca8e3e9 *./distribution/extensions/extensions1/extensions1png1.png.patch
69ab8dc8614e6bb154c029b12ca8e3e9 *./searchplugins/searchpluginspng0.png.patch
69ab8dc8614e6bb154c029b12ca8e3e9 *./searchplugins/searchpluginspng1.png.patch

$ md5sum ./0/0exe0.exe.patch ./exe0.exe.patch
bd6e413d3248cfbeff65e104b6c4cd39 *./0/0exe0.exe.patch
bd6e413d3248cfbeff65e104b6c4cd39 *./exe0.exe.patch
```

Generate the equivalent zucchini patches:

```
$ ./obj-x86_64-pc-windows-msvc/dist/bin/zucchini.exe -gen toolkit/mozapps/update/tests/data/complete.exe toolkit/mozapps/update/tests/data/partial.exe exe0.exe.patch -keep
$ ./obj-x86_64-pc-windows-msvc/dist/bin/zucchini.exe -gen toolkit/mozapps/update/tests/data/complete.png toolkit/mozapps/update/tests/data/partial.png 00png0.png.patch -keep
```

Replace all patch files on disk by their Zucchini equivalent, then double check
by rerunning the `md5sum` commands:

```
$ grep -r Zucc .
Binary file ./0/00/00png0.png.patch matches
Binary file ./0/0exe0.exe.patch matches
Binary file ./distribution/extensions/extensions0/extensions0png0.png.patch matches
Binary file ./distribution/extensions/extensions0/extensions0png1.png.patch matches
Binary file ./distribution/extensions/extensions1/extensions1png0.png.patch matches
Binary file ./distribution/extensions/extensions1/extensions1png1.png.patch matches
Binary file ./exe0.exe.patch matches
Binary file ./searchplugins/searchpluginspng0.png.patch matches
Binary file ./searchplugins/searchpluginspng1.png.patch matches

$ md5sum ./0/00/00png0.png.patch ./distribution/extensions/extensions0/extensions0png0.png.patch ./distribution/extensions/extensions0/extensions0png1.png.patch ./distribution/extensions/extensions1/extensions1png0.png.patch ./distribution/extensions/extensions1/extensions1png1.png.patch ./searchplugins/searchpluginspng0.png.patch ./searchplugins/searchpluginspng1.png.patch
958bae1b40904145959ba45f988a7156 *./0/00/00png0.png.patch
958bae1b40904145959ba45f988a7156 *./distribution/extensions/extensions0/extensions0png0.png.patch
958bae1b40904145959ba45f988a7156 *./distribution/extensions/extensions0/extensions0png1.png.patch
958bae1b40904145959ba45f988a7156 *./distribution/extensions/extensions1/extensions1png0.png.patch
958bae1b40904145959ba45f988a7156 *./distribution/extensions/extensions1/extensions1png1.png.patch
958bae1b40904145959ba45f988a7156 *./searchplugins/searchpluginspng0.png.patch
958bae1b40904145959ba45f988a7156 *./searchplugins/searchpluginspng1.png.patch

$ md5sum ./0/0exe0.exe.patch ./exe0.exe.patch
7750e88e0c1d006710abbd625710748b *./0/0exe0.exe.patch
7750e88e0c1d006710abbd625710748b *./exe0.exe.patch
```

Generate an unsigned mar file. Unfortunately on Windows this doesn't preserve
the permissions from the original mar. The simplest solution is to do this part
on a UNIX (file)system.

```
$ mar -J -c ../partial_zucchini_unsigned.mar -H xpcshell-test -V '*' 2/20/20png0.png 0/0exe0.exe.patch 0/00/00text2 distribution/extensions/extensions0/extensions0text0 distribution/extensions/extensions0/extensions0png1.png.patch 0/00/00text0 distribution/extensions/extensions0/extensions0png0.png.patch searchplugins/searchpluginspng1.png.patch distribution/extensions/extensions1/extensions1png0.png.patch distribution/extensions/extensions1/extensions1text0 searchplugins/searchpluginstext0 distribution/extensions/extensions1/extensions1png1.png.patch defaults/pref/channel-prefs.js update-settings.ini updatev2.manifest searchplugins/searchpluginspng0.png.patch precomplete 0/00/00png0.png.patch updatev3.manifest exe0.exe.patch 2/20/20text0
```

Generate a signed mar from the unsigned mar:

```
$ /d/mozilla-source/firefox/obj-x86_64-pc-windows-msvc/dist/bin/signmar.exe -d /d/mozilla-source/firefox/modules/libmar/tests/unit/data/ -n mycert -s ../partial_zucchini_unsigned.mar ../partial_zucchini.mar
```
