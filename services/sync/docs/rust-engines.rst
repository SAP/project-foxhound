================================
How Rust Engines are implemented
================================

There are 2 main components to engines implemented in Rust

The bridged-engine
==================

Because Rust engines still need to work with the existing Sync infrastructure,
there's the concept of a :searchfox:`bridged-engine <services/sync/modules/bridged_engine.js>`.
In short, this is just a shim between the existing
:searchfox:`Sync Service <services/sync/modules/service.js>`
and the Rust code.
