# Rust Component Observability

There are several systems in place to help teams gain observability into Rust components.
This document describes how to set them up.

## Component Errors

Components are encouraged to use the `error_support` crate to help handle Rust errors.

`error_support` expects crates to define 2 different error enums:

* The `Error` enum is used internally by the crate, which means it's used for most of the code.
* The `ApiError` enum is returned from the public API.
  This consists of a thin layer that forwards to an internal function and converts `Error` to `ApiError`.
  Public errors generally have fewer variants and fields,
  since they only expose data that consumers care about.

Crates should implement the `error_support::GetErrorHandling` trait
which defines how internal errors get converted to public errors.
This conversion is also an opportunity for crates to log errors and/or report them to our error tracking system.
`error_support` also provides the `handle_error` macro, which can be used to auto-convert the error types.

The `example` crate shows how this looks in practice:

* [error.rs](https://github.com/mozilla/application-services/blob/main/components/example/src/error.rs)
  defines the `Error` and `ApiError` enums and has the `GetErrorHandling` implementation.
* [lib.rs](https://github.com/mozilla/application-services/blob/main/components/example/src/lib.rs)
  defines the `ExampleComponent` type which shows how `handle_error` can be used for top-level public functions.
  The bodies of each function evaluate to the `Result<T, Error>` type and that macro converts this to `Result<T, ApiError>`

## Where do error reports go?

Applications have flexibility in how these reports are handled.
The mobile clients previously used Sentry, but we are in the process of moving all platforms to report these errors using the
[`rust-component-errors` Glean ping](https://dictionary.telemetry.mozilla.org/apps/fenix/pings/rust-component-errors)

During this transition process, the Glean error ping is currently only wired up on Android, errors will not be reported for iOS or Desktop.
Also, Android is also sending error reports to both Sentry and the Glean.
Work is currently in-progress to fix all of this.

### Reporting errors directly

Use `error_support::report_error!` to record errors directly, outside the error conversion process.
It uses the same formatting as `println!`.

### Breadcrumbs

Use `error_support::breadcrumb!` macro to record error breadcrumbs to provide error context.
Error reports will include the most recent 20 breadcrumbs.
`breadcrumb!` also uses the same formatting as `println!`.

## Metrics

Use [Glean](https://mozilla.github.io/glean/book/index.html) to record metrics for your components.
Unfortunately, Glean metrics can not be recorded from Rust directly, but there is currently [work in progress to fix this](https://bugzilla.mozilla.org/show_bug.cgi?id=2012752).
In the meantime, you'll need to use a workaround to record your metrics.

On Kotlin, this usually means creating wrapper code in application-services ([example](https://github.com/mozilla/application-services/blob/d60a631522cff4a8a7df449e68e173f163dac70b/components/logins/android/src/main/java/mozilla/appservices/logins/DatabaseLoginsStorage.kt#L128-L133)).
On Swift, the wrapper code lives in firefox-ios ([example](https://github.com/mozilla-mobile/firefox-ios/blob/87eedafa1244839c6ead660c118e65000afbb5f2/MozillaRustComponents/Sources/MozillaRustComponentsWrapper/Logins/LoginsStorage.swift#L44))
On Desktop, we don't have a great story at the moment.

### Defining new metrics

* Create a `metrics.yaml` file if it doesn't exist and add new entries to it.
  See the [Glean book](https://mozilla.github.io/glean/book/user/metrics/adding-new-metrics.html) for details.
  It's often helpful to use an existing `metrics.yaml` file from another component as a template.
* Open a PR to get [data review](https://wiki.mozilla.org/Data_Collection) for your metrics.
* If you created a new `metrics.yaml` file, you may need to hook it up to `probe-scraper` so that it's available there.
  See <https://bugzilla.mozilla.org/show_bug.cgi?id=2019535> for discussion.
  This issue will probably go away when we move the application-services code into moz-central.

## Dashboards

The [generate-rust-dashboards tool](https://github.com/mozilla/application-services/tree/main/tools/generate-rust-dashboards)
can be used to generate dashboards for your team's Rust components.
The dashboards can track both component errors and metrics in a single page.

### Rust code setup

* Add your component as a variant of the [`Component` enum](https://github.com/mozilla/application-services/blob/dd910ef65ea4f4079e8730de5c0b0d7040afa422/tools/generate-rust-dashboards/src/component_config.rs#L10).
  Update the methods below and add a case for your component variant.
* Add your team config to the [all_dashboards()](https://github.com/mozilla/application-services/blob/dd910ef65ea4f4079e8730de5c0b0d7040afa422/tools/generate-rust-dashboards/src/team_config.rs#L9).
  Use the existing `TeamConfig` instances as a template for your team.

### bigquery-etl

Before metrics can be graphed on a dashboard, you'll need to add them to our `bigquery-etl` configuration.
This greatly improves performance by aggregating metrics on a daily basis to a new table
The dashboard code uses the aggregate tables in it's `FROM` statements,
so you won't see anything until you complete this step.

* Clone the [bigquery-etl](https://github.com/mozilla/bigquery-etl) repository
* Update [rust_component_metrics/__init__.py](https://github.com/mozilla/bigquery-etl/blob/154c7942574adbd8d798162d04a139c3db9b397a/sql_generators/rust_component_metrics/__init__.py#L16) and add entries for your metrics
* Open a `bigquery-etl` PR and wait for it to be merged.
  On success, aggregate tables will start being populated the following day.
  On failure, the sync team will get an Airflow failure notification and should be able to help you fix the error.

### Creating a dashboard on Yardstick

* Ensure you have a yardstick account by going to [Yardstick](https://yardstick.mozilla.org/) and logging in using Mozilla SSO.
  You should have “editor” access and can create, edit, and delete dashboards and alerts.
  If not, go to the [Yardstick Grafana User Guide](https://mozilla-hub.atlassian.net/wiki/spaces/SRE/pages/886866077/Yardstick+Grafana+Service+User+Guide).
* Run `cargo generate-rust-dashboards [team-slug] [output-dir]`.
  This will generate a set of JSON files for each dashboard page in `[output-dir]`
* Log in to [https://yardstick.mozilla.org/](https://yardstick.mozilla.org/)
* Create a folder in yardstick for your team (optional, but highly recommended)
* From that folder, use the `New` button, select `Import`, and upload each of the generated JSON files to create the dashboards.

Congratulations, you now have a dashboard for your team's components!

In the future you can edit the Rust code and re-import the JSON files to update your dashboards.
Grafana will ensure this modifies the current dashboards rather than creating a new one.

### Currently supported metrics

Dashboards currently support the following metrics:

* counter and labeled counter
* distribution and labeled distribution
* event

If you want to use another metric please open a bugzilla ticket in `Application services / General`.
It's likely that it will be easy to implement, we just haven't done it yet.
