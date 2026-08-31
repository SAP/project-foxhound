# App Services Tooling

This directory holds tools implemented by application-services and required to be
used in the build process.

There are 2 such tools - 'embedded-uniffi-bindgen' and 'nimbus-fml', both of which
will be called by the gradle build system.

Note that these are effectively wrappers - the tools themselves remain in the app-services directory,
but these crates form a wrapper around them, meaning consumers don't need to know the full path
to the tool, just the path to this directory.

NOTE: This is landing before app-services itself. That means that currently these are just
stub tools. Once we move app-services into this directory the stubs will be updated to
become actual wrappers around the tools. This helps us solve a bit of a chicken-and-egg
problem landing app-services. Updating these stubs is bug 2002854.
