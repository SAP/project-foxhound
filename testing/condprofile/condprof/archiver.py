# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""Helper to create tarballs."""

import copy
import glob
import os
import tarfile

from condprof import progress
from condprof.util import TASK_CLUSTER


def _tarinfo2mem(tar, tarinfo):
    metadata = copy.copy(tarinfo)
    try:
        data = tar.extractfile(tarinfo)
        if data is not None:
            data = data.read()
    except Exception:
        data = None

    return metadata, data


class Archiver:
    def __init__(self, scenario, profile_dir, archives_dir):
        self.profile_dir = profile_dir
        self.archives_dir = archives_dir
        self.scenario = scenario

    def _strftime(self, date, template="-%Y-%m-%d-hp.tar.gz"):
        return date.strftime(self.scenario + template)

    def _get_archive_path(self, when):
        archive = self._strftime(when)
        return os.path.join(self.archives_dir, archive), archive

    def create_archive(self, when, iterator=None):

        def _filter(tarinfo):
            name = tarinfo.name
            if name.endswith((".dmp", ".extra")) and "minidumps" in name:
                # Inore crash files such as:
                # - minidumps/5b2d4a13-54e6-5ebb-9a6f-913a3451e56a.dmp
                # - minidumps/5b2d4a13-54e6-5ebb-9a6f-913a3451e56a.extra
                # ... because they can cause permafailing tests (bug 2007615).
                #
                # We are excluding them here instead of removing the crash dump
                # from the filesystem before archival, in case anyone wants to
                # inspect these files.
                return None
            return tarinfo

        if iterator is None:

            def _files(tar):
                files = glob.glob(os.path.join(self.profile_dir, "*"))
                yield len(files)
                for filename in files:
                    try:
                        tar.add(filename, os.path.basename(filename), filter=_filter)
                        yield filename
                    except FileNotFoundError:  # NOQA
                        # locks and such
                        pass

            iterator = _files

        if isinstance(when, str):
            archive = when
        else:
            archive, __ = self._get_archive_path(when)

        with tarfile.open(archive, "w:gz", dereference=True) as tar:
            it = iterator(tar)
            size = next(it)
            with progress.Bar(expected_size=size) as bar:
                for filename in it:
                    if not TASK_CLUSTER:
                        bar.show(bar.last_progress + 1)

        return archive

    def _read_tar(self, filename):
        files = {}
        with tarfile.open(filename, "r:gz") as tar:
            for tarinfo in tar:
                files[tarinfo.name] = _tarinfo2mem(tar, tarinfo)
        return files
