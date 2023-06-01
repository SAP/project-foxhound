Gecko Logging
=============

A minimal C++ logging framework is provided for use in core Gecko code. It is
enabled for all builds and is thread-safe.

This page covers enabling logging for particular logging module, configuring
the logging output, and how to use the logging facilities in native code.

Enabling and configuring logging
++++++++++++++++++++++++++++++++

Caveat: sandboxing when logging to a file
-----------------------------------------

A sandboxed content process cannot write to ``stderr`` or any file.  The easiest
way to log these processes is to disable the content sandbox by setting the
preference ``security.sandbox.content.level`` to ``0``, or setting the environment
variable ``MOZ_DISABLE_CONTENT_SANDBOX`` to ``1``.

On Windows, you can still see child process messages by using DOS (not the
``MOZ_LOG_FILE`` variable defined below) to redirect output to a file.  For
example: ``MOZ_LOG="CameraChild:5" mach run >& my_log_file.txt`` will include
debug messages from the camera's child actor that lives in a (sandboxed) content
process.

Logging to the Firefox Profiler
-------------------------------

When a log statement is logged on a thread and the `Firefox Profiler
<https://profiler.firefox.com>`_ is profiling that thread, the log statements is
recorded as a profiler marker.

This allows getting logs alongside profiler markers and lots of performance
and contextual information, in a way that doesn't require disabling the
sandbox, and works across all processes.

The profile can be downloaded and shared e.g. via Bugzilla or email, or
uploaded, and the logging statements will be visible either in the marker chart
or the marker table.

While it is possible to manually configure logging module and start the profiler
with the right set of threads to profile, ``about:logging`` makes this task a lot
simpler and error-proof.


The ``MOZ_LOG`` syntax
----------------------

Logging is configured using a special but simple syntax: which module should be
enabled, at which level, and what logging options should be enabled or disabled.

The syntax is a list of terms, separated by commas. There are two types of
terms:

- A log module and its level, separated by a colon (``:``), such as
  ``example_module:5`` to enable the module ``example_module`` at logging level
  ``5`` (verbose). This `searchfox query
  <https://searchfox.org/mozilla-central/search?q=LazyLogModule+.*%5C%28%22&path=&case=true&regexp=true>`_
  returns the complete list of modules available.
- A special string in the following table, to configure the logging behaviour.
  Some configuration switch take an integer parameter, in which case it's
  separated from the string by a colon (``:``). Most switches only apply in a
  specific output context, noted in the **Context** column.

+----------------------+---------+-------------------------------------------------------------------------------------------+
| Special module name  | Context | Action                                                                                    |
+======================+=========+===========================================================================================+
| append               | File    | Append new logs to existing log file.                                                     |
+----------------------+---------+-------------------------------------------------------------------------------------------+
| sync                 | File    | Print each log synchronously, this is useful to check behavior in real time or get logs   |
|                      |         | immediately before crash.                                                                 |
+----------------------+---------+-------------------------------------------------------------------------------------------+
| raw                  | File    | Print exactly what has been specified in the format string, without the                   |
|                      |         | process/thread/timestamp, etc. prefix.                                                    |
+----------------------+---------+-------------------------------------------------------------------------------------------+
| timestamp            | File    | Insert timestamp at start of each log line.                                               |
+----------------------+---------+-------------------------------------------------------------------------------------------+
| rotate:**N**         | File    | | This limits the produced log files' size.  Only most recent **N megabytes** of log data |
|                      |         | | is saved.  We rotate four log files with .0, .1, .2, .3 extensions.  Note: this option  |
|                      |         | | disables 'append' and forces 'timestamp'.                                               |
+----------------------+---------+-------------------------------------------------------------------------------------------+
| maxsize:**N**        | File    | Limit the log to **N** MB. Only work in append mode.                                      |
+----------------------+---------+-------------------------------------------------------------------------------------------+
| prependheader        | File    | Prepend a simple header while distinguishing logging. Useful in append mode.              |
+----------------------+---------+-------------------------------------------------------------------------------------------+
| profilerstacks       | Profiler| | When profiling with the Firefox Profiler and log modules are enabled, capture the call  |
|                      |         | | stack for each log statement.                                                           |
+----------------------+---------+-------------------------------------------------------------------------------------------+

This syntax is used for most methods of enabling logging, with the exception of
settings preferences directly, see :ref:`this section <Enabling logging using preferences>` for directions.


Enabling Logging
----------------

Enabling logging can be done in a variety of ways:

- via environment variables
- via command line switches
- using ``about:config`` preferences
- using ``about:logging``

The first two allow logging from the start of the application and are also
useful in case of a crash (when ``sync`` output is requested, this can also be
done with ``about:config`` as well to a certain extent). The last two
allow enabling and disabling logging at runtime and don't require using the
command-line.

By default all logging output is disabled.

Enabling logging using ``about:logging``
''''''''''''''''''''''''''''''''''''''''

``about:logging`` allows enabling logging by entering a ``MOZ_LOG`` string in the
text input, and validating.

Options allow logging to a file or using the Firefox Profiler, that can be
started and stopped right from the page.

Logging presets for common scenarios are available in a drop-down. They can be
associated with a profiler preset.

It is possible, via URL parameters, to select a particular logging
configuration, or to override certain parameters in a preset. This is useful to
ask a user to gather logs efficiently without having to fiddle with prefs and/or
environment variable.

URL parameters are described in the following table:

+---------------------+---------------------------------------------------------------------------------------------+
| Parameter           | Description                                                                                 |
+=====================+=============================================================================================+
| ``preset``          |  a `logging preset <https://searchfox.org/mozilla-central/search?q=gLoggingPresets>`_       |
+---------------------+---------------------------------------------------------------------------------------------+
| ``logging-preset``  |  alias for ``preset``                                                                       |
+---------------------+---------------------------------------------------------------------------------------------+
| ``modules``         |  a string in ``MOZ_LOG`` syntax                                                             |
+---------------------+---------------------------------------------------------------------------------------------+
| ``module``          |  alias for ``modules``                                                                      |
+---------------------+---------------------------------------------------------------------------------------------+
| ``threads``         |  a list of threads to profile, overrides what a profiler preset would have picked           |
+---------------------+---------------------------------------------------------------------------------------------+
| ``thread``          |  alias for ``threads``                                                                      |
+---------------------+---------------------------------------------------------------------------------------------+
| ``output``          |  either ``profiler`` or ``file``                                                            |
+---------------------+---------------------------------------------------------------------------------------------+
| ``output-type``     |  alias for ``output``                                                                       |
+---------------------+---------------------------------------------------------------------------------------------+
| ``profiler-preset`` |  a `profiler preset <https://searchfox.org/mozilla-central/search?q=%40type+{Presets}>`_    |
+---------------------+---------------------------------------------------------------------------------------------+

If a preset is selected, then ``threads`` or ``modules`` can be used to override the
profiled threads or logging modules enabled, but keeping other aspects of the
preset. If no preset is selected, then a generic profiling preset is used,
``firefox-platform``. For example:

::

  about:logging?output=profiler&preset=media-playback&modules=cubeb:4,AudioSinkWrapper:4:AudioSink:4

will profile the threads in the ``Media`` profiler preset, but will only log
specific log modules (instead of the `long list
<https://searchfox.org/mozilla-central/search?q="media-playback"&path=toolkit%2Fcontent%2FaboutLogging.js>`_
in the ``media-playback`` preset). In addition, it disallows logging to a file.

Enabling logging using environment variables
''''''''''''''''''''''''''''''''''''''''''''

On UNIX, setting and environment variable can be done in a variety of ways

::

  set MOZ_LOG="example_logger:3"
  export MOZ_LOG="example_logger:3"
  MOZ_LOG="example_logger:3" ./mach run

In the Windows Command Prompt (``cmd.exe``), don't use quotes:

::

  set MOZ_LOG=example_logger:3

If you want this on GeckoView example, use the following adb command to launch process:

::

  adb shell am start -n org.mozilla.geckoview_example/.GeckoViewActivity --es env0 "MOZ_LOG=example_logger:3"

There are special module names to change logging behavior. You can specify one or more special module names without logging level.

For example, if you want to specify ``sync``, ``timestamp`` and ``rotate``:

::

  set MOZ_LOG="example_logger:3,timestamp,sync,rotate:10"

Enabling logging usually outputs the logging statements to the terminal. To
have the logs written to a file instead (one file per process), the environment
variable ``MOZ_LOG_FILE`` can be used. Logs will be written at this path
(either relative or absolute), suffixed by a process type and its PID.
``MOZ_LOG`` files are text files and have the extension ``.moz_log``.

For example, setting:

::

  set MOZ_LOG_FILE="firefox-logs"

can create a number of files like so:

::

  firefox-log-main.96353.moz_log
  firefox-log-child.96354.moz_log

respectively for a parent process of PID 96353 and a child process of PID
96354.

Enabling logging using command-line flags
'''''''''''''''''''''''''''''''''''''''''

The ``MOZ_LOG`` syntax can be used with the command line switch on the same
name, and specifying a file with ``MOZ_LOG_FILE`` works in the same way:

::

  ./mach run -MOZ_LOG=timestamp,rotate:200,example_module:5 -MOZ_LOG_FILE=%TEMP%\firefox-logs

will enable verbose (``5``) logging for the module ``example_module``, with
timestamp prepended to each line, rotate the logs with 4 files of each 50MB
(for a total of 200MB), and write the output to the temporary directory on
Windows, with name starting with ``firefox-logs``.

.. _Enabling logging using preferences:

Enabling logging using preferences
''''''''''''''''''''''''''''''''''

To adjust the logging after Firefox has started, you can set prefs under the
`logging.` prefix. For example, setting `logging.foo` to `3` will set the log
module `foo` to start logging at level 3. A number of special prefs can be set,
described in the table below:

+-------------------------------------+------------+-------------------------------+--------------------------------------------------------+
|         Preference name             | Preference |   Preference value            |                  Description                           |
+=====================================+============+===============================+========================================================+
| ``logging.config.clear_on_startup`` |    bool    | --                            | Whether to clear all prefs under ``logging.``          |
+-------------------------------------+------------+-------------------------------+--------------------------------------------------------+
| ``logging.config.LOG_FILE``         |   string   | A path (relative or absolute) | The path to which the log files will be written.       |
+-------------------------------------+------------+-------------------------------+--------------------------------------------------------+
| ``logging.config.add_timestamp``    |   bool     | --                            | Whether to prefix all lines by a timestamp.            |
+-------------------------------------+------------+-------------------------------+--------------------------------------------------------+
| ``logging.config.sync``             |   bool     | --                            | Whether to flush the stream after each log statements. |
+-------------------------------------+------------+-------------------------------+--------------------------------------------------------+
| ``logging.config.profilerstacks``   |   bool     | --                            | | When logging to the Firefox Profiler, whether to     |
|                                     |            |                               | | include the call stack in each logging statement.    |
+-------------------------------------+------------+-------------------------------+--------------------------------------------------------+

Enabling logging in Rust code
-----------------------------

We're gradually adding more Rust code to Gecko, and Rust crates typically use a
different approach to logging. Many Rust libraries use the `log
<https://docs.rs/log>`_ crate to log messages, which works together with
`env_logger <https://docs.rs/env_logger>`_ at the application level to control
what's actually printed via `RUST_LOG`.

You can set an overall logging level, though it could be quite verbose:

::

  set RUST_LOG="debug"

You can also target individual modules by path:

::

  set RUST_LOG="style::style_resolver=debug"

.. note::
  For Linux/MacOS users, you need to use `export` rather than `set`.

.. note::
  Sometimes it can be useful to only log child processes and ignore the parent
   process. In Firefox 57 and later, you can use `RUST_LOG_CHILD` instead of
   `RUST_LOG` to specify log settings that will only apply to child processes.

The `log` crate lists the available `log levels <https://docs.rs/log/0.3.8/log/enum.LogLevel.html>`_:

+-----------+---------------------------------------------------------------------------------------------------------+
| Log Level | Purpose                                                                                                 |
+===========+=========================================================================================================+
| error     | Designates very serious errors.                                                                         |
+-----------+---------------------------------------------------------------------------------------------------------+
| warn      | Designates hazardous situations.                                                                        |
+-----------+---------------------------------------------------------------------------------------------------------+
| info      | Designates useful information.                                                                          |
+-----------+---------------------------------------------------------------------------------------------------------+
| debug     | Designates lower priority information.                                                                  |
+-----------+---------------------------------------------------------------------------------------------------------+
| trace     | Designates very low priority, often extremely verbose, information.                                     |
+-----------+---------------------------------------------------------------------------------------------------------+

It is common for debug and trace to be disabled at compile time in release builds, so you may need a debug build if you want logs from those levels.

Check the `env_logger <https://docs.rs/env_logger>`_ docs for more details on logging options.

Additionally, a mapping from `RUST_LOG` is available. When using the `MOZ_LOG`
syntax, it is possible to enable logging in rust crate using a similar syntax:

::

  MOZ_LOG=rust_crate_name::*:4

will enable `debug` logging for all log statements in the crate
``rust_crate_name``.

`*` can be replaced by a series of modules if more specificity is needed:

::

  MOZ_LOG=rust_crate_name::module::submodule:4

will enable `debug` logging for all log statements in the sub-module
``submodule`` of the module ``module`` of the crate ``rust_crate_name``.


A table mapping Rust log levels to `MOZ_LOG` log level is available below:

+----------------+---------------+-----------------+
| Rust log level | MOZ_LOG level | Numerical value |
+================+===============+=================+
|      off       |     Disabled  |        0        |
+----------------+---------------+-----------------+
|      error     |     Error     |        1        |
+----------------+---------------+-----------------+
|      warn      |     Warning   |        2        |
+----------------+---------------+-----------------+
|      info      |     Info      |        3        |
+----------------+---------------+-----------------+
|      debug     |     Debug     |        4        |
+----------------+---------------+-----------------+
|      trace     |     Verbose   |        5        |
+----------------+---------------+-----------------+

Working with ``MOZ_LOG`` in the code
++++++++++++++++++++++++++++++++++++

Declaring a Log Module
----------------------

``LazyLogModule`` defers the creation the backing ``LogModule`` in a thread-safe manner and is the preferred method to declare a log module. Multiple ``LazyLogModules`` with the same name can be declared, all will share the same backing ``LogModule``. This makes it much simpler to share a log module across multiple translation units. ``LazyLogLodule`` provides a conversion operator to ``LogModule*`` and is suitable for passing into the logging macros detailed below.

Note: Log module names can only contain specific characters. The first character must be a lowercase or uppercase ASCII char, underscore, dash, or dot. Subsequent characters may be any of those, or an ASCII digit.

.. code-block:: c++

  #include "mozilla/Logging.h"

  static mozilla::LazyLogModule sFooLog("foo");


Logging interface
-----------------

A basic interface is provided in the form of 2 macros and an enum class.

+----------------------------------------+----------------------------------------------------------------------------+
| MOZ_LOG(module, level, message)        | Outputs the given message if the module has the given log level enabled:   |
|                                        |                                                                            |
|                                        | *   module: The log module to use.                                         |
|                                        | *   level: The log level of the message.                                   |
|                                        | *   message: A printf-style message to output. Must be enclosed in         |
|                                        |     parentheses.                                                           |
+----------------------------------------+----------------------------------------------------------------------------+
| MOZ_LOG_TEST(module, level)            | Checks if the module has the given level enabled:                          |
|                                        |                                                                            |
|                                        | *    module: The log module to use.                                        |
|                                        | *    level: The output level of the message.                               |
+----------------------------------------+----------------------------------------------------------------------------+


+-----------+---------------+-----------------------------------------------------------------------------------------+
| Log Level | Numeric Value | Purpose                                                                                 |
+===========+===============+=========================================================================================+
| Disabled  |      0        | Indicates logging is disabled. This should not be used directly in code.                |
+-----------+---------------+-----------------------------------------------------------------------------------------+
| Error     |      1        | An error occurred, generally something you would consider asserting in a debug build.   |
+-----------+---------------+-----------------------------------------------------------------------------------------+
| Warning   |      2        | A warning often indicates an unexpected state.                                          |
+-----------+---------------+-----------------------------------------------------------------------------------------+
| Info      |      3        | An informational message, often indicates the current program state.                    |
+-----------+---------------+-----------------------------------------------------------------------------------------+
| Debug     |      4        | A debug message, useful for debugging but too verbose to be turned on normally.         |
+-----------+---------------+-----------------------------------------------------------------------------------------+
| Verbose   |      5        | A message that will be printed a lot, useful for debugging program flow and will        |
|           |               | probably impact performance.                                                            |
+-----------+---------------+-----------------------------------------------------------------------------------------+

Example Usage
-------------

.. code-block:: c++

  #include "mozilla/Logging.h"

  using mozilla::LogLevel;

  static mozilla::LazyLogModule sLogger("example_logger");

  static void DoStuff()
  {
    MOZ_LOG(sLogger, LogLevel::Info, ("Doing stuff."));

    int i = 0;
    int start = Time::NowMS();
    MOZ_LOG(sLogger, LogLevel::Debug, ("Starting loop."));
    while (i++ &lt; 10) {
      MOZ_LOG(sLogger, LogLevel::Verbose, ("i = %d", i));
    }

    // Only calculate the elapsed time if the Warning level is enabled.
    if (MOZ_LOG_TEST(sLogger, LogLevel::Warning)) {
      int elapsed = Time::NowMS() - start;
      if (elapsed &gt; 1000) {
        MOZ_LOG(sLogger, LogLevel::Warning, ("Loop took %dms!", elapsed));
      }
    }

    if (i != 10) {
      MOZ_LOG(sLogger, LogLevel::Error, ("i should be 10!"));
    }
  }
