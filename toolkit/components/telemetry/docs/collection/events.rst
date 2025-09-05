.. _eventtelemetry:

======
Events
======

Across the different Firefox initiatives, there is a common need for a mechanism for recording, storing, sending & analysing application usage in an event-oriented format.
*Event Telemetry* specifies a common events data format, which allows for broader, shared usage of data processing tools.
Adding events is supported in artifact builds and build faster workflows.

For events recorded into Firefox Telemetry we also provide an API that opaquely handles storage and submission to our servers.

.. important::

    Every new or changed data collection in Firefox needs a `data collection review <https://wiki.mozilla.org/Firefox/Data_Collection>`__ from a Data Steward.

.. _events.serializationformat:

Serialization format
====================

Events are submitted in an :doc:`../data/event-ping` as an array, e.g.:

.. code-block:: js

  [
    [2147, "ui", "click", "back_button"],
    [2213, "ui", "search", "search_bar", "google"],
    [2892, "ui", "completion", "search_bar", "yahoo",
      {"querylen": "7", "results": "23"}],
    [5434, "dom", "load", "frame", null,
      {"prot": "https", "src": "script"}],
    // ...
  ]

Each event is of the form:

.. code-block:: js

  [timestamp, category, method, object, value, extra]

Where the individual fields are:

- ``timestamp``: ``Number``, positive integer. This is the time in ms when the event was recorded, relative to the main process start time.
- ``category``: ``String``, identifier. The category is a group name for events and helps to avoid name conflicts.
- ``method``: ``String``, identifier. This describes the type of event that occurred, e.g. ``click``, ``keydown`` or ``focus``.
- ``object``: ``String``, identifier. This is the object the event occurred on, e.g. ``reload_button`` or ``urlbar``.
- ``value``: ``String``, optional, may be ``null``. This is a user defined value, providing context for the event.
- ``extra``: ``Object``, optional, may be ``null``. This is an object of the form ``{"key": "value", ...}``, both keys and values need to be strings, keys are identifiers. This is used for events where additional richer context is needed.

.. _eventlimits:

Limits
------

Each ``String`` marked as an identifier (the event ``name``, ``category``, ``method``,
``object``, and the keys of ``extra``) is restricted to be composed of alphanumeric ASCII
characters ([a-zA-Z0-9]) plus infix underscores ('_' characters that aren't the first or last).
``category`` is also permitted infix periods ('.' characters, so long as they aren't the
first or last character).

For the Firefox Telemetry implementation, several fields are subject to length limits:

- ``category``: Max. byte length is ``30``.
- ``method``: Max. byte length is ``20``.
- ``object``: Max. byte length is ``20``.
- ``value``: Max. byte length is ``80``.
- ``extra``: Max. number of keys is ``10``.

  - Each extra key name: Max. string length is ``15``.
  - Each extra value: Max. byte length is ``80``.

Only ``value`` and the values of ``extra`` will be truncated if over the specified length.
Any other ``String`` going over its limit will be reported as an error and the operation
aborted.

.. _eventdefinition:

The YAML definition file
========================

Any event recorded into Firefox Telemetry must be registered before it can be recorded.
For any code that ships as part of Firefox that happens in `Events.yaml <https://searchfox.org/mozilla-central/source/toolkit/components/telemetry/Events.yaml>`_.

The probes in the definition file are represented in a fixed-depth, three-level structure. The first level contains *category* names (grouping multiple events together), the second level contains *event* names, under which the events properties are listed. E.g.:

.. code-block:: yaml

  # The following is a category of events named "browser.ui".
  browser.ui:
    click: # This is the event named "click".
      objects: ["reload-btn"] # List the objects for this event.
      description: >
        Describes this event in detail, potentially over
        multiple lines.
      # ... and more event properties.
    # ... and more events.
  # This is the "dom" category.
  search:
    # And the "completion" event.
    completion:
      # ...
      description: Recorded when a search completion suggestion was clicked.
      extra_keys:
        distance: The edit distance to the current search query input.
        loadtime: How long it took to load this completion entry.
    # ...

Category and event names are subject to the limits :ref:`specified above <eventlimits>`.

The following event properties are valid:

- ``methods`` *(optional, list of strings)*: The valid event methods. If not set this defaults to ``[eventName]``.
- ``objects`` *(required, list of strings)*: The valid event objects.
- ``description`` *(required, string)*: Description of the event and its semantics.
- ``release_channel_collection`` *(optional, string)*: This can be set to ``opt-in`` (default) or ``opt-out``.
- ``record_in_processes`` *(required, list of strings)*: A list of processes the event can be recorded in. Currently supported values are:

  - ``main``
  - ``content``
  - ``gpu``
  - ``all_children`` (record in all the child processes)
  - ``all`` (record in all the processes).

- ``bug_numbers`` *(required, list of numbers)*: A list of Bugzilla bug numbers that are relevant to this event.
- ``notification_emails`` *(required, list of strings)*: A list of emails of owners for this event. This is used for contact for data reviews and potentially to email alerts.
- expiry: There are two properties that can specify expiry, at least one needs to be set:

  - ``expiry_version`` *(required, string)*: The version number in which the event expires, e.g. ``"50"``, or ``"never"``. A version number of type "N" is automatically converted to "N.0a1" in order to expire the event also in the development channels. For events that never expire the value ``never`` can be used.

- ``extra_keys`` *(optional, object)*: An object that specifies valid keys for the ``extra`` argument and a description - see the example above.
- ``products`` *(required, list of strings)*: A list of products the event can be recorded on. Currently supported values are:

  - ``firefox`` - Collected in Firefox Desktop for submission via Firefox Telemetry.
  - ``thunderbird`` - Collected in Thunderbird for submission via Thunderbird Telemetry.

.. note::

  Combinations of ``category``, ``method``, and ``object`` defined in the file must be unique.

The API
=======

Public JS API
-------------

Since Firefox 132 (see `bug 1863031 <https://bugzilla.mozilla.org/show_bug.cgi?id=1863031>`__),
events in Firefox Desktop are
:doc:`recorded using the Glean API <../../glean/user/glean_for_legacy_events>`.

.. note::
  Events can be expensive to store, submit, and query.
  You are responsible for ensuring that you don't submit too many events.
  When your new events land in Nightly, consult with the Data Org about whether they are too "chatty".

Internal API
------------

.. code-block:: js

  Services.telemetry.snapshotEvents(dataset, clear, eventLimit);
  Services.telemetry.clearEvents();

These functions are only supposed to be used by Telemetry internally or in tests.

Also, the ``event-telemetry-storage-limit-reached`` topic is notified when the event ping event
limit is reached (1000 event records).
This is intended only for use internally or in tests.

.. _events.event-summary:

Event Summary
=============

Calling ``recordEvent`` on any non-expired registered event will accumulate to a
:doc:`Scalar <scalars>` for ease of analysing uptake and usage patterns. Even if the event category
isn't enabled.

The scalar is ``telemetry.event_counts`` for statically-registered events (the ones in
``Events.yaml``) and ``telemetry.dynamic_event_counts`` for dynamically-registered events (the ones
registered via ``registerEvents``). These are :ref:`keyed scalars <scalars.keyed-scalars>` where
the keys are of the form ``category#method#object`` and the values are counts of the number of
times ``recordEvent`` was called with that combination of ``category``, ``method``, and ``object``.

These two scalars have a default maximum key limit of 500 per process.

Example:

.. code-block:: js

  // telemetry.event_counts summarizes in the same process the events were recorded

  // Let us suppose in the parent process this happens:
  Services.telemetry.recordEvent("interaction", "click", "document", "xuldoc");
  Services.telemetry.recordEvent("interaction", "click", "document", "xuldoc-neighbour");

  // And in each of child processes 1 through 4, this happens:
  Services.telemetry.recordEvent("interaction", "click", "document", "htmldoc");

In the case that ``interaction.click.document`` is statically-registered, this will result in the
parent-process scalar ``telemetry.event_counts`` having a key ``interaction#click#document`` with
value ``2`` and the content-process scalar ``telemetry.event_counts`` having a key
``interaction#click#document`` with the value ``4``.

All dynamically-registered events end up in the dynamic-process ``telemetry.dynamic_event_counts``
(notice the different name) regardless of in which process the events were recorded. From the
example above, if ``interaction.click.document`` was registered with ``registerEvents`` then
the dynamic-process scalar ``telemetry.dynamic_event_counts`` would have a key
``interaction#click#document`` with the value ``6``.

Testing
=======

Tests involving Event Telemetry often follow this three-step form:

1. ``Services.telemetry.clearEvents();`` To minimize the effects of prior code and tests.
2. ``runTheCode();`` This is part of the test where you call the code that's supposed to collect
   Event Telemetry.
3. ``TelemetryTestUtils.assertEvents(expected, filter, options);`` This will check the
   events recorded by Event Telemetry against your provided list of expected events.
   If you only need to check the number of events recorded, you can use
   ``TelemetryTestUtils.assertNumberOfEvents(expectedNum, filter, options);``.
   Both utilities have :searchfox:`helpful inline documentation <toolkit/components/telemetry/tests/utils/TelemetryTestUtils.sys.mjs>`.


Version History
===============

- Firefox 134: Remove ``operating_systems`` (`bug 1925369 <https://bugzilla.mozilla.org/show_bug.cgi?id=1925369>`_).
- Firefox 132: recordEvent|registerEvents deprecation and removal (see `bug 1863031 <https://bugzilla.mozilla.org/show_bug.cgi?id=1863031>`__).
- Firefox 79:  ``geckoview`` support removed (see `bug 1620395 <https://bugzilla.mozilla.org/show_bug.cgi?id=1620395>`__).
- Firefox 52: Initial event support (`bug 1302663 <https://bugzilla.mozilla.org/show_bug.cgi?id=1302663>`_).
- Firefox 53: Event recording disabled by default (`bug 1329139 <https://bugzilla.mozilla.org/show_bug.cgi?id=1329139>`_).
- Firefox 54: Added child process events (`bug 1313326 <https://bugzilla.mozilla.org/show_bug.cgi?id=1313326>`_).
- Firefox 56: Added support for recording new probes from add-ons (`bug 1302681 <bug https://bugzilla.mozilla.org/show_bug.cgi?id=1302681>`_).
- Firefox 58:

   - Ignore re-registering existing events for a category instead of failing (`bug 1408975 <https://bugzilla.mozilla.org/show_bug.cgi?id=1408975>`_).
   - Removed support for the ``expiry_date`` property, as it was unused (`bug 1414638 <https://bugzilla.mozilla.org/show_bug.cgi?id=1414638>`_).
- Firefox 61:

   - Enabled support for adding events in artifact builds and build-faster workflows (`bug 1448945 <https://bugzilla.mozilla.org/show_bug.cgi?id=1448945>`_).
   - Added summarization of events (`bug 1440673 <https://bugzilla.mozilla.org/show_bug.cgi?id=1440673>`_).
- Firefox 66: Replace ``cpp_guard`` with ``operating_systems`` (`bug 1482912 <https://bugzilla.mozilla.org/show_bug.cgi?id=1482912>`_)`
