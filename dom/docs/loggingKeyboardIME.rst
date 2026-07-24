Logging native keyboard and IME event handler behavior
======================================================

If you're using 3rd party's IME or keyboard layout and you reported a bug which is reproducible with the IME or keyboard layout,
you may be requested to attach a log file of that how Firefox/Gecko handled the native events coming from your IME or keyboard layout.

Steps to log the behavior
+++++++++++++++++++++++++
1-1. Logging from startup
-------------------------
If you or contributors in bugzilla request the IME information (mainly on Linux),
you need to enable the logging at launching Firefox.  You need to set 2 environment variables,
one is ``MOZ_LOG``, set it to ``KeyboardHandler:4,IMEHandler:4,sync``, the other is ``MOZ_LOG_FILE``,
set it to a full path to a logging file. With or after setting the environment variables,
launch Firefox normally.

If you need to reproduce the bug in a specific web site,
you should open the tab and make Firefox restore the tab before doing the following steps.

Ensure Firefox is completely closed, first.

If you use Windows, you can set the environment variables with GUI.
However, launching with terminal or commandline is simpler
(replace ``<username>`` with your home folder/directory name):

Windows (command prompt):

::

  set MOZ_LOG=KeyboardHandler:4,IMEHandler:4,sync
  set MOZ_LOG_FILE=C:\Users\<username>\firefox-log
  start firefox

Windows (PowerShell):

::

  $env:MOZ_LOG = "KeyboardHandler:4,IMEHandler:4,sync"
  $env:MOZ_LOG_FILE = "C:\Users\<username>\firefox-log"
  Start-Process firefox

macOS:

::

  MOZ_LOG=KeyboardHandler:4,IMEHandler:4,sync MOZ_LOG_FILE=/Users/<username>/firefox-log /Applications/Firefox.app/Contents/MacOS/firefox

Note: Replace ``Firefox.app`` with ``Firefox\ Beta.app`` or ``Firefox\ Nightly.app`` if you use beta or nightly build.

Linux:

::

  MOZ_LOG=KeyboardHandler:4,IMEHandler:4,sync MOZ_LOG_FILE=/home/<username>/firefox-log firefox

1-2. Logging only during a test
-------------------------------
If you don't need the IME information which is logged only at startup,
you can use ``about:logging``.

1. Prepare to do the simplest steps to reproduce, e.g., open a simple test case into a tab.
2. Open ``about:logging`` in a new tab.
3. Set "New log modules" field to ``KeyboardHandler:4,IMEHandler:4,sync`` and type ``Enter`` key.
4. Choose "Logging to a file" radio button below.
5. Set "New log file" field to a full path for log file (see ``MOZ_LOG_FILE`` value of above examples in 1-1) and type ``Enter`` key.
6. Then, **click** "Start Logging" button above.

2. Reproduce the bug
--------------------
Then, your all inputs via keyboard is now being logged.

Give focus to somewhere if you need with **mouse** and reproduce the bug with the minimum steps.

Note: Keyboard operation for preparing to reproduce the bug is also logged and that makes harder to read.
Therefore, keyboard should be used only when you reproduce the bug.

Warning: In order to avoid leaking private information, do **NOT** do the following kindes of things while testing:

- Typing private things like email address, passwords, etc.
- Move focus to password fields whose value is already filled by the web site or the password manager.
- Move focus to the URL bar if the URL contains private things like account name, session ID, etc.

3. Close the Firefox instance
-----------------------------
Then, close Firefox with **mouse**.

4. Attach the log file to the bug
---------------------------------
Now, you should find ``firefox-log-main.<process-id>.moz_log`` file which is not empty.
This file is what the developers want.
Let's attach the file to the bug with clicking "Attach New File" button in bugzilla.

For making the log file easier to read,
explaining what you typed during the test within the comment field is really helpful.
