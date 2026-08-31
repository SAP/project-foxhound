===================
Web Apps in Firefox
===================

Web Apps in Firefox — also referred to as Taskbar Tabs in-source — is a feature that allows pinning a simplified and site stylized browser window to the taskbar (or system equivalent). This is analagous to what is often referred to as Progressive Web Apps (PWAs).

The feature is enabled by the preference `browser.taskbarTabs.enabled`.

.. note::

  Currently Web Apps can only be enabled for non-MSIX Windows installs.

-------------------
System Interactions
-------------------

~~~~~~~~~~~~~~~~~~~~~
Web Apps and Profiles
~~~~~~~~~~~~~~~~~~~~~

Web Apps are tied to the profile they are created with, therefore web app pages have the same access, controls, and add-ons as a normal tab.

~~~~~~~~~~~~~~~~~~~~~~~
Web Apps and Containers
~~~~~~~~~~~~~~~~~~~~~~~

Web apps are tied to the container — also referred to as Contextual Identity in-source — they are created with. When launching a Web App via the taskbar it will reopen in this tied to container. This affords users the ability to isolate sites without requiring a new profile per Web App.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Web Apps and Session Restore
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Web Apps are similar to Private Windows in that they are not tied to the lifetime of normal browser session restore. Web App windows are not restore for users who have enabled "Open previous windows and tabs", and will not prevent the restoration of windows restored by session restore.
