# Protobuf vendoring and generated code

Protocol Buffers (protobuf) source is available at:

    https://github.com/protocolbuffers/protobuf

This code is covered under the BSD license (see LICENSE). Documentation is
available at https://developers.google.com/protocol-buffers/.

The tree's current version of the protobuf library is 21.6.

We do not include the protobuf tests or the protoc compiler.

--------------------------------------------------------------------------------

## Upgrading the protobuf library

**WARNING:** The vendoring process may download and execute untrusted code from
the protobuf repository. Only vendor releases from trusted sources and review
the vendored content carefully.

1. Decide the protobuf release version you want to vendor (for example, `v21.6`).

2. From the Gecko top source directory, use the standard moz.yaml vendoring workflow
   to re-vendor protobuf. Options are documented in `toolkit/components/protobuf/moz.yaml`.
   See also the Firefox build docs for common vendoring operations: [Common vendoring operations]
   (https://firefox-source-docs.mozilla.org/mozbuild/vendor/index.html#common-vendoring-operations)

   Run:

```bash
mach vendor toolkit/components/protobuf/moz.yaml -r v21.6 --patch-mode none
```

   and then apply local patches:

```bash
mach vendor toolkit/components/protobuf/moz.yaml --patch-mode only
```

   Where `-r v21.6` specifies the protobuf version.

   Vendoring automatically regenerates all `.pb.cc` and `.pb.h` files specified
   in `scripts/regenerate_cpp_files.py`.

3. Update the moz.build to export the new set of headers and add any new .cc
   files to the unified sources and remove old ones. Note that we only
   need:
   - files contained in the `libprotobuf_lite_srcs` target
     ([file_lists.cmake](https://github.com/protocolbuffers/protobuf/blob/main/src/file_lists.cmake))
   - the header files they need
   - gzip streams (for devtools)

## Adding or updating generated C++ files

When a `.proto` source file is added, moved, or otherwise changed, update
`scripts/generate_files.py` so the generated C++ files are produced in the
correct location with the right include paths.

1. Edit `scripts/generate_files.py` and add or adjust a `run_protoc(...)`
   entry for the affected `.proto` file(s). Set `cpp_out` to the directory
   where the generated files should live, and `includes` to directories that
   contain the `.proto` sources (paths are relative to the top source dir).

2. Regenerate the files using:

```bash
   mach python toolkit/components/protobuf/scripts/generate_files.py
```

3. If new generated files appear in a directory that is not already listing
   them, update the corresponding `moz.build` in that directory to include
   the new files.
