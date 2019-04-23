FROM ubuntu:18.04

ENV SHELL /bin/bash

ENV PATH="/root/.cargo/bin:${PATH}"

RUN apt-get update &&    \
    apt-get install -y   \
    	    wget         \
	    python       \
	    clang        \
	    llvm	 \
	    rustc        \
	    cargo        \
	    autoconf2.13 \
	    libgtk-3-dev \
	    libgconf2-dev \
	    libdbus-glib-1-dev \
	    libpulse-dev \
	    libnotify-bin \
	    yasm \
	    nasm \
	    mercurial \
	    ccache

RUN cargo install cbindgen

RUN wget -q https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh -O /tmp/install.sh && \
    bash /tmp/install.sh && \
    rm /tmp/install.sh

ENV NVM_DIR="/root/.nvm"

RUN [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && \
    nvm install node

RUN wget -q https://hg.mozilla.org/mozilla-central/raw-file/default/python/mozboot/bin/bootstrap.py -O /tmp/bootstrap.py && \
    python /tmp/bootstrap.py --application-choice=browser --no-interactive || true && \
    rm /tmp/bootstrap.py

RUN mkdir -p /usr/local/src/firefox

WORKDIR /usr/local/src/firefox

CMD  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && \
    ./mach build


# To run the build
# docker run -v /sapmnt/home/I505600/workspace/testing/taintfox:/usr/local/src/firefox -it taintfox

# To run the container with a bash terminal and X sharing
# See more here: http://wiki.ros.org/docker/Tutorials/GUI
#  docker run -v /sapmnt/home/I505600/workspace/testing/taintfox:/usr/local/src/firefox --env="DISPLAY" --env="QT_X11_NO_MITSHM=1" -v /tmp/.X11-unix:/tmp/.X11-unix:rw -it --entrypoint=/bin/bash taintfox

# Enable X sharing and allow gdb to work (ptrace)
docker run -v /sapmnt/home/I505600/workspace/testing/taintfox:/usr/local/src/firefox --env="DISPLAY" --env="QT_X11_NO_MITSHM=1" -v /tmp/.X11-unix:/tmp/.X11-unix:rw  --cap-add=SYS_PTRACE --security-opt seccomp=unconfined -it --entrypoint=/bin/bash taintfox
