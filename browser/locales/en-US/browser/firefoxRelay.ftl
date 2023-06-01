# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

## Error messages for failed HTTP web requests.
## https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#client_error_responses
## Variables:
##   $status (Number) - HTTP status code, for example 403

firefox-relay-mask-generation-failed = { -relay-brand-name } could not generate a new mask. HTTP error code: { $status }.
firefox-relay-get-reusable-masks-failed = { -relay-brand-name } could not find reusable masks. HTTP error code: { $status }.

##

firefox-relay-must-login-to-fxa = You must log in to { -fxaccount-brand-name } in order to use { -relay-brand-name }.
firefox-relay-get-unlimited-masks =
    .label = Manage masks
    .accesskey = M
firefox-relay-opt-in-title = Protect your email address
firefox-relay-opt-in-subtitle = Add { -relay-brand-name }
firefox-relay-generate-mask-title = Protect your email address
firefox-relay-generate-mask-subtitle = Generate { -relay-brand-short-name } mask
firefox-relay-opt-in-confirmation-enable =
    .label = Continue
    .accesskey = C
firefox-relay-opt-in-confirmation-disable =
    .label = Don’t show me this again
    .accesskey = D
firefox-relay-opt-in-confirmation-postpone =
    .label = Not now
    .accesskey = N
