======================================
Managing the built-in en-US dictionary
======================================

The en-US build of Firefox includes a built-in Hunspell dictionary based on the
`SCOWL`_ dataset. This document describes the process to add new words to the
dictionary, or update it to the current upstream version.

For more information about Hunspell or the affix file format, you can check
`the Ubuntu man page for hunspell
<https://manpages.ubuntu.com/manpages/bionic/man5/hunspell.5.html>`_.

Requesting to add new words to the en-US dictionary
===================================================

If you’d like to add new words to the dictionary, you can add your request to
`this bug <https://bugzilla.mozilla.org/show_bug.cgi?id=enus-dictionary>`_:

* Include all possible forms, e.g. plural and genitive forms for nouns,
  different tenses for verbs.
* Try to provide information on the terms you want to add, in particular
  references to external sources that confirm the usage of the term (e.g.
  Merriam-Webster or Oxford online dictionaries).

.. note::

  If you’re fixing the existing bug with pending requests, make sure to `file a
  new bug`_ and move the alias ``enus-dictionary`` (in the *Details* section)
  from the old bug to the new one.

Adding new words to the en-US dictionary
========================================

This section describes the process for adding new words to the dictionary:

#. Get a clone of the `firefox repository`_ (see :ref:`Firefox Contributors' Quick
   Reference`), if you don’t already have one, and make sure you can build it
   successfully.
#. Move in the dictionary sources directory using this command:
   ``cd extensions/spellcheck/locales/en-US/hunspell/dictionary-sources``.
#. Identify the current version of SCOWL by checking the file
   ``README_en_US.txt``: near the top of the file there is a line similar to
   ``Version rel-2026.02.25``, where ``rel-2026.02.25`` is the upstream SCOWL
   release tag.
#. Clone the upstream SCOWL repository into the working directory and check out
   the tag matching that version:

   .. code-block:: sh

      git clone https://github.com/en-wl/wordlist scowl
      cd scowl
      git checkout rel-YYYY.MM.DD
      cd ..

   SCOWLv2 requires Python 3.7+ and SQLite 3.33+.
#. There’s a special script used for editing dictionaries. The script
   only works if you have the environment variable ``EDITOR`` set to the
   executable of an editor program; if you don’t have it set, you can use
   ``EDITOR=vim sh edit-dictionary.sh`` to edit using ``vim`` (or you can
   substitute it with another editor), or you can just type
   ``sh edit-dictionary.sh`` if you have an ``EDITOR`` already specified.

   Copy and paste the full list of words, then save and quit the editor. It’s
   not necessary to put the words in alphabetical order, as it will be corrected
   by the script.

   Note: you might need to install ``aspell`` on your system (e.g. via
   ``brew install aspell`` on macOS).
#. Run the script ``sh make-new-dict.sh`` to generate a new dictionary and make
   sure it runs without errors. For more details on this script, see the
   `make-new-dict.sh`_ section.
#. Run ``sh verify-new-dict.sh`` to sanity-check the regenerated dictionary
   (see the `verify-new-dict.sh`_ section). The script must report
   ``Errors: 0`` before proceeding.
#. If everything looks correct, use ``sh install-new-dict.sh`` to copy the
   generated file in the right position.
#. Build Firefox and test your updated dictionary. Once you’re
   satisfied, use the process described in :ref:`write_a_patch` to create a
   patch.

Note that the update script will modify 2 versions of the dictionary, and both
need to be committed:

* ``en-US.dic``: the dictionary actually shipping in the build, it uses
  ISO-8859-1 encoding.
* ``utf8/en-US.dic``: a version of the same dictionary with UTF-8 encoding. This
  is used to work around issues with Phabricator, and it allows to display
  actual changes in the diff.

Exclude words from suggestions
==============================

It’s possible to completely exclude words from suggested alternatives by adding
an affix rule ``!`` at the end of the definition in the ``.dic`` file. For
example:

* ``bum`` would be changed to ``bum/!`` (note the additional forward slash).
* ``bum/MS`` would be changed to ``bum/MS!``.

In order to exclude a word from suggestions, follow the instructions available
in `Adding new words to the en-US dictionary`_. Instead of running the
``edit-dictionary.sh`` script (point 5), use a text editor to edit the file
``en-US.dic`` directly, then proceed with the remaining instructions.

.. warning::

  Make sure to open ``en-US.dic`` with the correct encoding. For example, Visual
  Studio Code will try to open it as ``UTF-8``, and it needs to be reopened with
  encoding ``Western (ISO 8859-1)``.

Upgrading dictionary to a new upstream version of SCOWL
=======================================================

The English dictionary available in the `firefox repository`_ is based on the
`SCOWL`_ dictionary. Some scripts distributed with the SCOWL package are
used to generate the files for the en-US dictionary.

The working directory for this process is
``extensions/spellcheck/locales/en-US/hunspell/dictionary-sources``.

#. Clone the upstream SCOWL repository into the working directory and check out
   the desired release tag (e.g. ``rel-2026.02.25``):

   .. code-block:: sh

      git clone https://github.com/en-wl/wordlist scowl
      cd scowl
      git checkout rel-2026.02.25
      cd ..

   SCOWLv2 requires Python 3.7+ and SQLite 3.33+.
#. Run the script ``sh make-new-dict.sh`` to generate a new dictionary and make
   sure it runs without errors. For more details on this script, see the
   `make-new-dict.sh`_ section.
#. Run ``sh verify-new-dict.sh`` to sanity-check the regenerated dictionary
   (see the `verify-new-dict.sh`_ section). The script must report
   ``Errors: 0`` before proceeding.
#. If everything looks correct, use ``sh install-new-dict.sh`` to copy the
   generated file in the right position and use the process described in
   :ref:`write_a_patch` to create a patch.

Info about the file structure
=============================

mozilla-specific.txt
--------------------

This file contains Mozilla-specific words that should not be submitted
upstream. For example, ``Firefox`` should go in this file (see `bug 237921`_).

Note that the file ``5-mozilla-specific.txt`` is generated by expanding
``mozilla-specific.txt`` and should not be edited directly.

utf8 folder
-----------

``dictionary-sources/utf8`` is used to store a copy with UTF-8 encoding of the
dictionary files. This is used to work around limitations in Phabricator, which
treats ISO-8859-1 files as binary and won’t display a diff when updating them.

Info about the included scripts
===============================

make-new-dict.sh
----------------

The dictionary upgrade script ``make-new-dict.sh`` works by expanding (i.e.
“unmunching”) the affix compression dictionaries to create wordlists and
using those to generate a new dictionary.

The upgrade script expects the current upstream version to be kept in the
directory ``orig``. On first run (or whenever ``scowl/scowl.db`` has been
removed) the script will run ``make scowl.db`` inside ``scowl/`` to build the
SCOWLv2 SQLite database that ``mk-list`` reads from.

The script writes intermediate files to ``dictionary-sources/support_files/``:

* ``0-special.txt`` contains numbers and ordinals expanded from SCOWL
  ``en.dic.supp``.
* ``1-base.txt`` contains words expanded from ``en_US-custom.dic`` in the
  **previous** version of SCOWL (from the ``orig`` folder).
* ``2-mozilla-nosug-munched.txt`` contains the suggestion exclusions (lines
  ending in ``!``) from the current Mozilla dictionary, kept in their
  compressed (munched) form so they can be appended back at the end.
* ``2-mozilla-nosug.txt`` is the expanded form of the same suggestion
  exclusions, used later to filter the ``5-*`` files.
* ``2-mozilla.txt`` contains words expanded from the current Mozilla
  dictionary, with the suggestion exclusions stripped out first.
* ``3-upstream.txt`` contains words expanded from ``en_US-custom.dic`` in the
  **new** version of SCOWL (regenerated under ``scowl/speller/`` by
  ``make-hunspell-dict``).
* ``2-mozilla-removed.txt`` contains words that are only available in the SCOWL
  dictionary, i.e. removed by Mozilla.
* ``2-mozilla-added.txt`` contains words that are only available in the current
  Mozilla dictionary, i.e. added by Mozilla.
* ``4-patched.txt`` contains words from the new SCOWL dictionary
  (``3-upstream.txt``), with words from (``2-mozilla-removed.txt``) removed and
  words (``2-mozilla-added.txt``) added.

In addition, the script writes three files directly to the working directory
(``dictionary-sources/``) so they can be inspected and committed alongside the
generated dictionary:

* ``5-mozilla-specific.txt`` is expanded from ``mozilla-specific.txt`` using
  the current affix rules from the Mozilla dictionary.
* ``5-mozilla-removed.txt`` and ``5-mozilla-added.txt`` contain words that are
  respectively removed and added by Mozilla compared to the **new** SCOWL
  version. These files could be used to submit upstream changes, but words
  included in ``5-mozilla-specific.txt`` should be removed from this list.

The new dictionary is available as ``en_US-mozilla.dic`` and should be copied
over using the ``install-new-dict.sh`` script.

verify-new-dict.sh
------------------

This script runs sanity checks on the dictionary produced by
``make-new-dict.sh`` and must be run before ``install-new-dict.sh``. It reports:

* Whether the regenerated ``.dic`` passes the ISO-8859-1 round-trip that
  ``install-new-dict.sh`` performs (a failure here means upstream introduced
  characters that the legacy ISO-8859-1 path can't represent).
* Whether each entry from ``mozilla-specific.txt`` is still present in the
  regenerated dictionary.
* Whether every previous suggestion exclusion (line ending in ``!``) is
  preserved, and lists any new exclusions introduced upstream.
* The line-count delta against the previous shipped dictionary (producing a
  warning above a 25% change).
* That the upstream ``en_US.txt`` from the `wordlist-diff`_ mirror (fetched
  via ``curl`` from raw.githubusercontent.com at the same release tag as
  ``scowl/``) is a subset of the regenerated wordlist, ignoring words that
  Mozilla intentionally removed (``5-mozilla-removed.txt``). The Mozilla
  dictionary should equal upstream ``en_US.txt`` minus Mozilla removals,
  plus Mozilla additions, variants and accented words. The check is skipped
  (with a warning) when offline, when ``curl`` is unavailable, or when the
  local ``scowl/`` checkout is not on a tagged release.

The script exits with non-zero if any check fails.

install-new-dict.sh
-------------------

The script:

* Creates a copy of ``orig`` as ``support_files/orig-bk`` and copies the new
  upstream version to ``orig``.
* Copies the existing Mozilla dictionary in ``support_files/mozilla-bk``.
* Converts the dictionary (.dic) generated by ``make-new-dict.sh`` from UTF-8 to
  ISO-8859-1 and moves it to the parent folder.
* Saves the SCOWLv2 affix file verbatim to ``utf8/en-US-utf8.aff`` (the
  UTF-8 mirror) and then runs ``convert-aff.py`` (see below) to rewrite
  the affix file in the Mozilla-shipped ISO-8859-1 form.

Python helpers
--------------

A couple of small Python scripts live alongside the shell scripts and handle
encoding-sensitive transformations that are awkward to express portably in
shell. They depend only on the Python standard library and target Python 3.7+,
which is already required by SCOWLv2 itself.

* ``assemble-dic.py`` is invoked at the end of ``make-new-dict.sh``. It takes
  the freshly generated UTF-8 ``en_US-mozilla.dic`` and the munched
  suggestion-exclusion list (``support_files/2-mozilla-nosug-munched.txt``,
  ISO-8859-1) and rewrites the dictionary with both lists merged, sorted, and
  an updated count line on top.
* ``convert-aff.py`` is invoked from ``install-new-dict.sh`` to convert the
  SCOWLv2 UTF-8 affix file to the shipped ``en-US.aff``. It strips
  ``ICONV`` rules, rewrites ``SET UTF-8`` as ``SET ISO8859-1``, drops the
  curly apostrophe (U+2019) that SCOWLv2 adds to ``WORDCHARS`` (since
  ISO-8859-1 can't represent it), and writes the result back as
  ISO-8859-1. The UTF-8 mirror in ``utf8/en-US-utf8.aff`` is a verbatim copy
  of the SCOWLv2 output and does not go through this script.


.. _SCOWL: http://wordlist.aspell.net
.. _file a new bug: https://bugzilla.mozilla.org/show_bug.cgi?id=enus-dictionary
.. _bug 237921: https://bugzilla.mozilla.org/show_bug.cgi?id=237921
.. _firefox repository: https://github.com/mozilla-firefox/firefox
.. _wordlist-diff: https://github.com/en-wl/wordlist-diff
