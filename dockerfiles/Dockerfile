FROM ubuntu:16.04 as taintfox-dev

ENV SHELL /bin/bash

RUN apt-get update &&    \
    apt-get install -y   \
    	    wget         \
	    python       \
	    autoconf2.13 \
	    ccache \
	    libnspr4-dev \
	    software-properties-common \
	    git 

WORKDIR /usr/local/src/taintfox-build

RUN GIT_SSL_NO_VERIFY=true git clone --depth=1 https://github.wdf.sap.corp/WebSecResearch/taintfox -b master . && \
    ./mach bootstrap --application-choice=browser --no-interactive && \

RUN apt-get remove -y nasm

WORKDIR /usr/local/src/taintfox

FROM taintfox-dev as taintfox-build

RUN \. "$NVM_DIR/nvm.sh" && \
    cp taintfox_mozconfig_ubuntu .mozconfig && \
    ./mach build

RUN \. "$NVM_DIR/nvm.sh" && \
    ./mach package

FROM ubuntu:16.04 AS taintfox

WORKDIR /opt/taintfox

# A lazy way to get all the taintfox dependencies
RUN apt-get update &&    \
    apt-get install -y   \
    firefox

# Get the install package from the build container
COPY --from=taintfox-build /usr/local/src/taintfox-master/obj-tf-release/dist/taintfox-*.en-US.linux-x86_64.tar.bz2 /tmp/

RUN tar -xjvf /tmp/taintfox-*.en-US.linux-x86_64.tar.bz2 -C /opt && \
    rm -rf /tmp/*.tar.bz && \
    ln -s /opt/taintfox/taintfox /usr/bin/taintfox

CMD /usr/bin/taintfox

