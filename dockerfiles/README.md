# Taintfox Docker Files

The Dockerfile in this directory provides a number of containers for developing, building and
deploying taintfox for Ubuntu.

The file uses the multi-stage build pattern detailed here: https://docs.docker.com/develop/develop-images/multistage-build/.

## Prerequisites

You need to first set up Docker on your machine as detailed here: https://docs.docker.com/install/

## Development Environment

The `taintfox-dev` container just installs all of the necessary package needed to build taintfox, but does not checkout
the source itself. The source directory is located somewhere else on the host and is shared between the host and
container, allowing editing on the host (in whatever IDE you like) and running in Docker.

To create the container:

```bash
docker build --target taintfox-dev -t taintfox-dev .
```

To run (ie compile) taintfox using the container:

```bash
docker run -v /path/to/taintfox:/usr/local/src/taintfox -it taintfox-dev
```

where `path/to/taintfox` is the path containing a checked-out taintfox source directory. This is mounted inside the container
and built. If you want to debug your build, you need to enable X-forwarding (to get a window) and ptrace permissions (to attach gdb).

```bash
xhost +local:root
docker run -v /path/to/taintfox:/usr/local/src/firefox --env="DISPLAY" --env="QT_X11_NO_MITSHM=1" -v /tmp/.X11-unix:/tmp/.X11-unix:rw --cap-add=SYS_PTRACE --security-opt seccomp=unconfined -it --rm --entrypoint=/bin/bash taintfox
```

This provides a bash prompt to start taintfox or whatever you like.

### Build Commands

#### Building

```bash
./mach build
```

#### Running

```bash
./mach run
```

#### Packaging

```bash
./mach package
```

#### Debugging

To run GDB, wait for taintfox to crash and then it will tell you which command to run. For example:

```bash
gdb /usr/local/src/taintfox/obj-tf-dbg/dist/bin/taintfox 11257
```

To run with the JIT spewer enabled, make sure the line:

```bash
ac_add_options --enable-jitspew
```

is present in your .mozconfig file for the build. Then run with the ```IONFLAGS``` variable to get more information from the JIT:

```bash
IONFLAGS=help /usr/local/src/taintfox/obj-tf-dbg/dist/bin/taintfox -no-remote -profile /usr/local/src/taintfox/obj-tf-dbg/tmp/profile-default
```

The complete list of options:

```bash
usage: IONFLAGS=option,option,option,... where options can be:

  aborts        Compilation abort messages
  scripts       Compiled scripts
  mir           MIR information
  prune         Prune unused branches
  escape        Escape analysis
  alias         Alias analysis
  alias-sum     Alias analysis: shows summaries for every block
  gvn           Global Value Numbering
  licm          Loop invariant code motion
  flac          Fold linear arithmetic constants
  eaa           Effective address analysis
  sincos        Replace sin/cos by sincos
  sink          Sink transformation
  regalloc      Register allocation
  inline        Inlining
  snapshots     Snapshot information
  codegen       Native code generation
  bailouts      Bailouts
  caches        Inline caches
  osi           Invalidation
  safepoints    Safepoints
  pools         Literal Pools (ARM only for now)
  cacheflush    Instruction Cache flushes (ARM only for now)
  range         Range Analysis
  logs          JSON visualization logging
  logs-sync     Same as logs, but flushes between each pass (sync. compiled functions only).
  profiling     Profiling-related information
  trackopts     Optimization tracking information gathered by the Gecko profiler. (Note: call enableGeckoProfiling() in your script to enable it).
  trackopts-ext Encoding information about optimization tracking
  dump-mir-expr Dump the MIR expressions
  cfg           Control flow graph generation
  all           Everything

  bl-aborts     Baseline compiler abort messages
  bl-scripts    Baseline script-compilation
  bl-op         Baseline compiler detailed op-specific messages
  bl-ic         Baseline inline-cache messages
  bl-ic-fb      Baseline IC fallback stub messages
  bl-osr        Baseline IC OSR messages
  bl-bails      Baseline bailouts
  bl-dbg-osr    Baseline debug mode on stack recompile messages
  bl-all        All baseline spew
```




## Source Containers

The `taintfox-source` container downloads the head of the master branch as a zip file on top of `taintfox-dev`. It is
provided as an intermediate container for building (see below).

## Build Containers

There are two build containers provided to build Taintfox within Docker:

### Release Build

The `taintfox-build` container compiles the source from `taintfox-source` using the release configuration.

```bash
docker build --target taintfox-build -t taintfox-build .
```

This container is set up to run Taintfox by default:

```bash
docker run --env="DISPLAY" --env="QT_X11_NO_MITSHM=1" -v /tmp/.X11-unix:/tmp/.X11-unix:rw -it  taintfox-build
```

### Debug Build

The `taintfox-debug` container compiles the source from `taintfox-source` using the debug configuration.
Debug symbols are provided and optimization is disabled.

```bash
docker build --target taintfox-build -t taintfox-build .
```
This container can be run with the same command as the release build. To allow debugging and get a terminal:

```bash
docker run --env="DISPLAY" --env="QT_X11_NO_MITSHM=1" -v /tmp/.X11-unix:/tmp/.X11-unix:rw -it --entrypoint=/bin/bash --cap-add=SYS_PTRACE --security-opt seccomp=unconfined taintfox-build-debug
```

## Binary Containers

The binary containers provide a minimal Ubuntu baseline plus the taintfox binaries for running.

### Release build

```bash
docker build --target taintfox -t taintfox .
```
to run:

```bash
docker run --env="DISPLAY" --env="QT_X11_NO_MITSHM=1" -v /tmp/.X11-unix:/tmp/.X11-unix:rw -it  taintfox
```
