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
docker run -v /path/to/taintfox:/usr/local/src/taintfox -it taintfox
```

where `path/to/taintfox` is the path containing a checked-out taintfox source directory. This is mounted inside the container
and built. If you want to debug your build, you need to enable X-forwarding (to get a window) and ptrace permissions (to attach gdb).

```bash
xhost +local:root
docker run -v /path/to/taintfox:/usr/local/src/firefox --env="DISPLAY" --env="QT_X11_NO_MITSHM=1" -v /tmp/.X11-unix:/tmp/.X11-unix:rw  --cap-add=SYS_PTRACE --security-opt seccomp=unconfined -it --entrypoint=/bin/bash taintfox
```

This provides a bash prompt to start taintfox or whatever you like.

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
docker build --target taintfox-build-debug -t taintfox-build-debug .
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
docker run --env="DISPLAY" --env="QT_X11_NO_MITSHM=1" -v /tmp/.X11-unix:/tmp/.X11-unix:rw -it  taintfox-build
```
