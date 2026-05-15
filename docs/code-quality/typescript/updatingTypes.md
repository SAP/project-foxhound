# Updating Gecko Type Definitions

The type definitions live in [tools/@types](https://searchfox.org/firefox-main/source/tools/@types),
with the generation scripts in [tools/ts](https://searchfox.org/firefox-main/source/tools/ts).

## Updating JavaScript Module Paths

The path maps are currently used for locating the sources of files referenced by
the `moz-src://`, `resource://` and `chrome://` uris. When files are added or
removed, these may need to be updated.

```shell
$ ./mach ts paths
```

## Updating Gecko Types

The Gecko types are updated from the source directory and build output.

:::{warning}
A full build is required.
:::

```shell
$ ./mach build && ./mach ts build && ./mach ts update
```
