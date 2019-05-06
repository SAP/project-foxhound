FROM ubuntu:16.04 as taintfox-dev

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
	    ccache \
	    libnspr4-dev \
	    software-properties-common

RUN cargo install cbindgen

# Install NVM
RUN wget -q https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh -O /tmp/install.sh && \
    bash /tmp/install.sh && \
    rm /tmp/install.sh

ENV NVM_DIR="/root/.nvm"

RUN [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && \
    nvm install node

# Update clang (not needed for Ubuntu 18.04)
RUN wget -O /tmp/llvm-snapshot.gpg.key https://apt.llvm.org/llvm-snapshot.gpg.key && \
    apt-key add /tmp/llvm-snapshot.gpg.key && \
    apt-add-repository "deb http://apt.llvm.org/xenial/ llvm-toolchain-xenial-6.0 main" && \
    apt-get update && \
    apt-get install -y clang-6.0 && \
    apt-get remove -y clang && \
    update-alternatives --install /usr/bin/clang++ clang++ /usr/bin/clang++-6.0 1000 && \
    update-alternatives --install /usr/bin/clang clang /usr/bin/clang-6.0 1000 && \
    update-alternatives --config clang && \
    update-alternatives --config clang++

# Update NASM (not needed for Ubuntu 18.04)
RUN apt-get remove -y nasm && \
    mkdir -p /tmp/nasm && \
    cd /tmp/nasm && \
    wget -O /tmp/nasm/nasm.tar.gz https://www.nasm.us/pub/nasm/releasebuilds/2.14.02/nasm-2.14.02.tar.gz && \
    tar -xzvf /tmp/nasm/nasm.tar.gz && \
    cd /tmp/nasm/nasm-2.14.02 && \
    ./configure --prefix=/usr && \
    make install && \
    rm -rf /tmp/nasm

# Download other dependencies
RUN wget -q https://hg.mozilla.org/mozilla-central/raw-file/default/python/mozboot/bin/bootstrap.py -O /tmp/bootstrap.py && \
    python /tmp/bootstrap.py --application-choice=browser --no-interactive || true && \
    rm /tmp/bootstrap.py

RUN mkdir -p /usr/local/src/taintfox

WORKDIR /usr/local/src/taintfox

# Run the build command when starting the container
CMD  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && \
    ./mach build

# To run the build
# docker run -v /path/to/taintfox:/usr/local/src/taint -it taintfox

# To run the container with a bash terminal and X sharing
# See more here: http://wiki.ros.org/docker/Tutorials/GUI
#  docker run -v /path/to/taintfox:/usr/local/src/taintfox --env="DISPLAY" --env="QT_X11_NO_MITSHM=1" -v /tmp/.X11-unix:/tmp/.X11-unix:rw -it --entrypoint=/bin/bash taintfox

# Enable X sharing and allow gdb to work (ptrace)
# docker run -v /path/to/taintfox:/usr/local/src/firefox --env="DISPLAY" --env="QT_X11_NO_MITSHM=1" -v /tmp/.X11-unix:/tmp/.X11-unix:rw  --cap-add=SYS_PTRACE --security-opt seccomp=unconfined -it --entrypoint=/bin/bash taintfox


from taintfox-dev as taintfox-source

# Could also use a git clone here, but we don't need all the history for a build
RUN echo "Downloading Taintfox sourcery..." && \
    wget -q --no-check-certificate https://github.wdf.sap.corp/i505600/taintfox/archive/master.zip -o /usr/local/src/master.zip && \
    echo "Extracting Taintfox source files..." && \
    unzip -q -d /usr/local/src master.zip && \
    echo "Cleaning up..." && \
    rm /usr/local/src/master.zip && \
    echo "Done!"

WORKDIR /usr/local/src/taintfox-master

# Run the build command when starting the container
CMD  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && \
    ./mach build

from taintfox-source as taintfox-build

# This is such a long step, keep it a single RUN
RUN \. "$NVM_DIR/nvm.sh" && \
    cp taintfox_mozconfig_ubuntu .mozconfig && \
    ./mach build

RUN \. "$NVM_DIR/nvm.sh" && \
    ./mach package

# Run taintfox when starting the container
CMD  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && \
    ./mach run

from ubuntu:16.04 as taintfox

WORKDIR /opt/taintfox

# A lazy way to get all the taintfox dependencies
RUN apt-get update &&    \
    apt-get install -y   \
    firefox

# Get the install package from the build container
COPY --from=taintfox-build /usr/local/src/taintfox-master/obj-tf-release/dist/taintfox-66.0.3.en-US.linux-x86_64.tar.bz2 /tmp/

RUN tar -xjvf /tmp/taintfox-66.0.3.en-US.linux-x86_64.tar.bz2 -C /opt && \
    rm -rf /tmp/*.tar.bz && \
    ln -s /opt/taintfox/taintfox /usr/bin/taintfox

CMD /usr/bin/taintfox

from owasp/zap2docker-weekly as taintfox-zap

USER root

COPY --from=taintfox-build /usr/local/src/taintfox-master/obj-tf-release/dist/taintfox-66.0.3.en-US.linux-x86_64.tar.bz2 /tmp/

RUN tar -xjvf /tmp/taintfox-66.0.3.en-US.linux-x86_64.tar.bz2 -C /opt && \
    rm -rf /tmp/*.tar.bz && \
    ln -s /opt/taintfox/taintfox /usr/bin/taintfox


