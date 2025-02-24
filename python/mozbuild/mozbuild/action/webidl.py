# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import sys

from mozwebidlcodegen import create_build_system_manager


def main(argv):
    """Perform WebIDL code generation required by the build system."""
    manager = create_build_system_manager()
    manager.generate_build_files()


if __name__ == "__main__":
    # When run from the CLI, we know we have a rather short duration so it's
    # fine to disable gc in order to shave a few milliseconds.
    import gc

    gc.disable()

    sys.exit(main(sys.argv[1:]))
