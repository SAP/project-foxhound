================================
How Rust Engines are implemented
================================

There are 2 main components to engines implemented in Rust

The bridged-engine
==================

Because Rust engines still need to work with the existing Sync infrastructure,
there's the concept of a `bridged-engine <https://searchfox.org/mozilla-central/source/services/sync/modules/bridged_engine.js>`_.
In short, this is just a shim between the existing
`Sync Service <https://searchfox.org/mozilla-central/source/services/sync/modules/service.js>`_
and the Rust code.
