This project provides a CRUD key-value store interface and delegates all database functionality to the underlying rusqlite instance.

It is better known among its users as `skv`. However the name `skv` already refers to another key-value store initiative in the rust ecosystem and therefore the repo has been renamed to `mzkv` for confusion avoidance purposes. 

### TODO

Allow multiple processes to access a database. This would be useful for sharing state between the Firefox main process and [non-content child processes](https://firefox-source-docs.mozilla.org/ipc/processes.html).

Sharing state directly between the [front-end](https://searchfox.org/mozilla-central/source/mobile/android/fenix), [Android Components](https://mozac.org/contributing/architecture), and [GeckoView](https://firefox-source-docs.mozilla.org/mobile/android/geckoview/contributor/geckoview-architecture.html) in Firefox for Android via this crate could also be useful.
