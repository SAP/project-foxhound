FROM $DOCKER_IMAGE_PARENT
MAINTAINER Julien Cristau <jcristau@mozilla.com>

VOLUME /builds/worker/checkouts

ADD setup.sh /setup/setup.sh

RUN cd /setup && ./setup.sh

COPY runme.sh /
COPY --chown=worker:worker scripts/* /home/worker/scripts/

CMD ["/runme.sh"]
