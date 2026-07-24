# Reps

This folder contains the React components used by:
* debugger
* console
* profiler frontend

to render any arbitrary JavaScript object nicely to Web Developers.

This library receives as input the Firefox DevTools Remote Debugging Protocol (RDP)'s
Object actor's "form" object. Also known as "grip" in some part of DevTools codebase.
This contains a preview objects which helps render the object at the state it was at a given point in time.
The object actor also exposes various methods to query information about the object,
but this will represent the current state of the object.

# Release a new version on NPM

As this library is also used by the profiler frontend,
versions should be uploaded to NPM for it to pull it.

First bump the version number in `package.json`.
Then make sure to commit any changes made to reps folder (including the version bump).
This is important as the `publish` command will ultimately reset all uncommited changes
made in the `reps` folder.

And then run:
```
$ npm publish devtools-reps
```
