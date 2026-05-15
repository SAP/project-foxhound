.. _searchfox-blame:

=====
Blame
=====

"Blame" (in git, or "annotate" in mercurial) is a feature to show the last revision that modified the line, for each line in a file. The blame information is embedded into the source listing.

.. image:: img/blame.png
    :class: border
    :alt: The blame popup
    :width: 683px


.. _searchfox-blame-strip:

Blame strip
-----------

The blame information is available from the blame strip, which is shown at the left side of the line numbers, as a gray line. Hovering a pointer over the blame strip shows a "blame popup", which shows the blame information for the given chunk of the code.

The first two lines show the commit mssage, usually starts from the bug number, and then the author, and the author date (not the committer/push date).

annotated diff
  Open the annotated diff view of the commit, hosted on Searchfox.

full diff
  Open the full diff view on the repository, e.g. on `hg.mozilla.org`.

Phabricator Revision
  Open the Phabricator revision for the commit.

Show latest version without this line
  Open the revision-specific URL of the last revision before the given commit.

Show earliest version with this line
  Open the revision-specific URL of the revision for the given commit.
