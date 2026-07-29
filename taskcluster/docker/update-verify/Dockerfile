FROM $DOCKER_IMAGE_PARENT

MAINTAINER release@mozilla.com

# We do want to install recommended packages.
RUN sed -i /APT::Install-Recommends/d /etc/apt/apt.conf.d/99taskcluster

# TODO: Remove this volume once we remove the sparse profile from update-verify-config
VOLUME /builds/worker/checkouts
VOLUME /builds/worker/workspace

RUN mkdir /build
ADD system-setup.sh /tmp/system-setup.sh
RUN bash /tmp/system-setup.sh

RUN chown -R worker:worker /builds/worker/bin && chmod 755 /builds/worker/bin/*
ENV PATH $PATH:/builds/worker/bin

# Add update-verify scripts and their Python dependencies directly into the
# image so the job does not need to checkout the repository.
# %include tools/update-verify
COPY topsrcdir/tools/update-verify /builds/worker/tools
# %include python/mozrelease
COPY topsrcdir/python/mozrelease /builds/worker/python/mozrelease
# %include third_party/python/redo
COPY topsrcdir/third_party/python/redo /builds/worker/python/redo
RUN chown -R worker:worker /builds/worker/tools /builds/worker/python
ENV PYTHONPATH=/builds/worker/python/mozrelease:/builds/worker/python/redo

ENV           LANG          C.UTF-8
ENV           LC_ALL        C.UTF-8

# Set a default command useful for debugging
CMD ["/bin/bash", "--login"]
