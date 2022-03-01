FROM ubuntu:20.04 as foxhound-dev

ENV SHELL /bin/bash
ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update &&    \
    apt-get install -y   \
    	    wget         \
	    python       \
	    python3      \
	    python3-distutils \
   	    python3-pip \	
	    autoconf2.13 \
	    ccache \
	    libnspr4-dev \
	    software-properties-common \
	    git 

WORKDIR /usr/local/src/foxhound-build

RUN GIT_SSL_NO_VERIFY=true git clone --depth=1 https://github.com/SAP/project-foxhound -b main .

RUN ./mach bootstrap --application-choice=browser

FROM foxhound-dev as foxhound-build

RUN cp taintfox_mozconfig_ubuntu .mozconfig && \
    ./mach build

RUN ./mach package

FROM ubuntu:20.04 AS foxhound

WORKDIR /opt/taintfox

# A lazy way to get all the dependencies
RUN apt-get update &&    \
    apt-get install -y   \
    firefox

# Get the install package from the build container
COPY --from=foxhound-build /usr/local/src/foxhound-build/obj-tf-release/dist/*.en-US.linux-x86_64.tar.bz2 /tmp/

RUN mkdir -p /opt/foxhound && \
    tar -xjvf /tmp/*.en-US.linux-x86_64.tar.bz2 -C /opt/foxhound && \
    rm -rf /tmp/*.tar.bz && \
    ln -s /opt/foxhound/firefox/firefox /usr/bin/foxhound

CMD /usr/bin/foxhound

