Using The Mozilla Source Server
===============================

The Mozilla Source Server allows debuggers to automatically fetch the exact
source files that correspond to a Firefox build you're debugging on Windows.
This is particularly useful when debugging crash dumps, Nightly builds, or
Release builds where you don't have the matching source code locally. Without
the source server, you would need to either build Firefox yourself or to point
your debugger to a local checkout at the exact source revision matching the
binary you're debugging.

The Mozilla Source Server works by embedding a SrcSrv stream into PDB files
served by the :ref:`Mozilla Symbol Server <Using The Mozilla Symbol Server>`.
This stream contains instructions that tell your debugger where to fetch source
files from Mozilla's HTTP servers. When you step into code during debugging, or
when you click an entry of the call stack in a crash dump, your debugger
automatically downloads the corresponding source file and displays it. This
also works when debugging a try build once you have uploaded its symbols to the
Mozilla Symbol Server (see :ref:`uploading-symbols-for-a-try-build`).

Within the source tree, the script that adds the SrcSrv stream to PDB files is
``toolkit/crashreporter/tools/symbolstore.py``, called from the ``./mach
buildsymbols`` command (see :ref:`Building with Debug Symbols` for details on
this command).

`SrcSrv version 1
<https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/language-specification-1>`_
relied on executing arbitrary commands derived from the PDB file's SrcSrv
stream. This is not desirable security-wise and is no longer supported by
debuggers in their default configurations. `SrcSrv version 2
<https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/language-specification-2>`_
later added a safe URL-based source fetching feature that debuggers support out
of the box. Mozilla's PDBs exclusively rely on the safe URL-based fetching
feature added by SrcSrv version 2.

.. _source-server-setup:

Windows Debuggers Setup
-----------------------

Visual Studio
~~~~~~~~~~~~~

Fetching source code should mostly work :ref:`once the symbol server is
correctly setup <Using The Mozilla Symbol Server>`. If needed, you will find
the options that interact with the Source Server feature under **Tools**,
**Options**, **Debugging**, **General**:

- **Enable Source Link support**: this option is enabled by default and should
  be enough to get things working with Mozilla's PDB files.

- **Enable source server support**: this option is disabled by default and
  controls legacy SrcSrv support, which should not be required.

WinDbg
~~~~~~

The first step here is also to make sure that :ref:`the symbol server is
correctly setup <Using The Mozilla Symbol Server>`. Then, unfortunately, SrcSrv
support is broken in WinDbg starting with app version 1.2402.24001.0 (see
:ref:`source-server-known-issues` for workaround suggestions).

If you need extra logs from WinDbg when it loads source files, consider using:

.. code-block:: bat

    !sym noisy
    .srcnoisy 3

Historically, SrcSrv support in WinDbg required adding ``SRV*`` to your source
path. To the best of our knowledge, this isn't required at all anymore, but you
can still check your current source path with:

.. code-block:: bat

    .srcpath

And set your source path to ``SRV*`` with:

.. code-block:: bat

    .srcfix

.. _source-server-known-issues:

Known Issues
------------

There currently are a few known issues with source server support in Microsoft
debuggers:

**WinDbg app versions 1.2402.24001.0+ cannot load source files** (`Bug 2006283
<https://bugzilla.mozilla.org/show_bug.cgi?id=2006283>`_)

Recent versions of the WinDbg app starting with version 1.2402.24001.0 have a
regression that prevents source files from being loaded from Mozilla PDBs. This
issue has been `reported to Microsoft
<https://github.com/microsoft/WinDbg-Feedback/issues/334>`_. Older versions
(1.2308.2002.0 and below) and WinDbg Classic are not affected.

The workaround for the gzip issue described below works around both issues at
the same time. Otherwise, a simpler workaround (that will run into the gzip
issue) is to install the most recent version known to be compatible. From a
Powershell window, run:

.. code-block:: bat

    winget uninstall Microsoft.WinDbg
    winget install Microsoft.WinDbg --version 1.2308.2002.0

**Generated source files display as garbled/gzipped data** (`Bug 2006338
<https://bugzilla.mozilla.org/show_bug.cgi?id=2006338>`_)

Build-generated source files (such as IPDL-generated files) are hosted on
Amazon S3 with gzip compression. Microsoft debuggers (Visual Studio and WinDbg)
do not expect compression when fetching these files, resulting in garbled
output or refusal to display the file contents.

Regular (non-generated) source files from Mercurial and GitHub repositories are
not affected by this issue. A possible workaround is to configure your debugger
to use ``curl.exe`` with the ``--compressed`` flag to retrieve source files.
See example 2 in :ref:`source-server-advanced-usage` for full details.

.. _source-server-advanced-usage:

Advanced Usage: Customizing Source Retrieval
--------------------------------------------

You can customize how debuggers fetch source files by creating a ``srcsrv.ini``
configuration file somewhere on your disk and pointing the ``SRCSRV_INI_FILE``
environment variable to it. This should at least work in WinDbg.

At the time of writing this documentation, all our attempts to get Visual
Studio to load a custom ``srcsrv.ini`` have failed. This might be `a regression
on Microsoft's side
<https://developercommunity.visualstudio.com/t/srcsrv.iniOverrideNotAppliedWhenDebuggingDumpFiles/11003456>`_.
Please update this documentation if you get this working with Visual Studio.

The variable definitions in ``srcsrv.ini`` will take precedence over those in
every loaded PDB file's SrcSrv stream, allowing you to redirect source file
URLs or to change how files are fetched. This is very powerful, though it
requires understanding how SrcSrv streams work. Refer to `the Microsoft
documentation for SrcSrv version 1
<https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/language-specification-1>`_
for more details. `Version 2
<https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/language-specification-2>`_
is a simple extension that says that if the variable ``SRCSRVCMD`` is empty or
absent, then the variable ``SRCSRVTRG`` should be interpreted as a URL from
which to retrieve the source file.

Example 1: Redirecting GitHub repository URLs
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Suppose that at some point in the future, Firefox's GitHub repository moves. We
then want to debug an old Firefox build, but the PDB files point to the old
repository and there is no automatic redirection, so debuggers are unable to
find the source files. By looking at the SrcSrv stream for one of the old PDB
files we would see that the variable that specifies the GitHub repository was
defined as:

.. code-block:: ini

    FIREFOX_GITHUB_TARGET=https://github.com/mozilla-firefox/firefox/raw/%var4%/%var3%

We can just override this variable in our local ``srcsrv.ini`` to solve our
problem, without having to alter any PDB file. The following would work:

.. code-block:: ini

    [variables]
    FIREFOX_GITHUB_TARGET=https://github.com/new-mozilla-org/new-firefox-repo/raw/%var4%/%var3%

This overrides the ``FIREFOX_GITHUB_TARGET`` variable in all PDB files' SrcSrv
streams, redirecting all GitHub source file requests to the new repository
location while preserving the revision (``%var4%``) and file path (``%var3%``)
defined by the original indexing.

Example 2: Working around the gzip compression issue
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

As described in the known issues section, generated source files served from S3
are gzip-compressed and unlikely to display correctly in Microsoft debuggers.
This is something that we can work around, by forcing the debugger to use
``curl.exe`` with the ``--compressed`` flag:

.. code-block:: ini

    [variables]
    SRCSRVTRG=%targ%\mozilla-src\%var2%\%var4%\%fnbksl%(%var3%)
    SRCSRVCMD=curl.exe --location --compressed --output %srcsrvtrg% --silent %fnvar%(%var2%)

The ``SRCSRVTRG`` variable defines where downloaded files will be cached
locally, and the ``SRCSRVCMD`` variable specifies the command to fetch files.
The ``--compressed`` flag ensures curl properly handles gzip-encoded responses.

Because this solution relies on command execution and not just on the URL
fetching feature provided by SrcSrv version 2, your debugger will prompt you
for a manual validation of every command that it will run. While there exist
ways to avoid this prompting, we recommend that you stick to manual validation
for security reasons.

A generated command that is valid and safe would look as follows:

.. code-block:: bat

    curl.exe --location --compressed --output C:\ProgramData\Dbg\mozilla-src\HG_TARGET\86bb7f6af6312ba3c0161085f854bcdff68f1a91\browser\app\nsBrowserApp.cpp --silent https://hg.mozilla.org/releases/mozilla-release/raw-file/86bb7f6af6312ba3c0161085f854bcdff68f1a91/browser/app/nsBrowserApp.cpp

Debugging Source Server Issues
------------------------------

If you encounter problems with source file loading, you can inspect the SrcSrv
stream embedded in a PDB file to try to diagnose the issue.

Getting the path to the PDB
~~~~~~~~~~~~~~~~~~~~~~~~~~~

PDB files are usually stored in your symbol cache after you debugger downloads
them. By default with WinDbg, this means ``C:\ProgramData\Dbg\sym``.

For example, say we want to double-check ``mozglue``. We can use the ``lm``
command and click on the module name to get the full PDB path.

.. code-block::

    0:000> lm
    start             end                 module name
    [...]
    00007ffb`181c0000 00007ffb`18291000   mozglue    (deferred)
    [...]

By clicking on ``mozglue``, we get:

.. code-block::

    0:000> lmDvmmozglue
    start             end                 module name
    00007ffb`181c0000 00007ffb`18291000   mozglue    (deferred)
        Mapped memory image file: C:\ProgramData\Dbg\sym\mozglue.dll\695C3716d1000\mozglue.dll
        Image path: C:\Program Files\Mozilla Firefox\mozglue.dll
        Image name: mozglue.dll
        [...]

This isn't good, because mozglue is marked as deferred: the symbols for this
specific DLL have not yet been loaded by the debugger. We can force the load to
occur now with:

.. code-block::

    0:000> .reload /f mozglue.dll
    *** WARNING: Unable to verify checksum for mozglue.dll

And by re-issueing the previous command, we now get the local path to our PDB file:

.. code-block::

    0:000> lmDvmmozglue
    start             end                 module name
    00007ffb`181c0000 00007ffb`18291000   mozglue  C (private pdb symbols)  C:\ProgramData\Dbg\sym\mozglue.pdb\D38D21E32E5E8ACD4C4C44205044422E1\mozglue.pdb
        Loaded symbol image file: mozglue.dll
        Mapped memory image file: C:\ProgramData\Dbg\sym\mozglue.dll\695C3716d1000\mozglue.dll
        Image path: C:\Program Files\Mozilla Firefox\mozglue.dll
        Image name: mozglue.dll
        [...]

Viewing the SrcSrv stream
~~~~~~~~~~~~~~~~~~~~~~~~~

You can extract and view the SrcSrv stream from a PDB file using the ``pdbstr``
tool, which is part of Debugging Tools For Windows within the Windows SDK. This
tool is typically located at ``C:\Program Files (x86)\Windows
Kits\10\Debuggers\x64\srcsrv\pdbstr.exe``.

To extract the stream, run:

.. code-block:: bat

    pdbstr -r -p:path\to\file.pdb -s:srcsrv

This will display the source indexing information that tells debuggers where to
fetch each source file.

Checking for unindexed files
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You can list files that are not indexed in the SrcSrv stream using the
``srctool`` utility, also part of Debugging Tools For Windows:

.. code-block:: bat

    srctool.exe -u path\to\file.pdb

Ideally, all source files referenced by a PDB should be indexed. Debuggers can
only automatically load source files that are indexed in the SrcSrv stream. If
a file is not indexed, the debugger will be unable to fetch it automatically.

Reporting issues
~~~~~~~~~~~~~~~~

If you can't get your debugger to load some source files and your case isn't
covered by the known issues listed above, please `file a bug in Bugzilla
<https://bugzilla.mozilla.org/enter_bug.cgi?product=Toolkit&component=Crash%20Reporting>`__
under the **Toolkit :: Crash Reporting** component.
