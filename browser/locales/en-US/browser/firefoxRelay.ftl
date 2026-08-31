# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

## Error messages for failed HTTP web requests.
## https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status#client_error_responses
## Variables:
##   $status (Number) - HTTP status code, for example 403

firefox-relay-mask-generation-failed = { -relay-brand-name } could not generate a new mask. HTTP error code: { $status }.
firefox-relay-get-reusable-masks-failed = { -relay-brand-name } could not find reusable masks. HTTP error code: { $status }.

##

firefox-relay-must-login-to-account = Sign in to your account to use your { -relay-brand-name } email masks.
firefox-relay-get-unlimited-masks =
    .label = Manage masks
    .accesskey = M
# $count (Number) - The number of free email masks the user has used
firefox-relay-reuse-masks-header =
    { $count ->
        *[other] You’ve used all { $count } free email masks
    }
# Description following warning that the user has used all their free email masks.
# The user is presented a list of recently used masks to select, or they can click a button to see all masks.
firefox-relay-reuse-masks-description-v2 = You can reuse one or see all masks to choose a different one.
firefox-relay-reuse-masks-select-label = Select a recent mask
firefox-relay-see-all-masks =
    .label = See all masks
    .accesskey = S
firefox-relay-dismiss =
    .label = Dismiss
    .accesskey = D
# This is followed, on a new line, by firefox-relay-opt-in-subtitle-1
firefox-relay-opt-in-title-1 = Protect your email address:
# This is preceded by firefox-relay-opt-in-title-1 (on a different line), which
# ends with a colon. You might need to adapt the capitalization of this string.
firefox-relay-opt-in-subtitle-1 = Use { -relay-brand-name } email mask
firefox-relay-use-mask-title-1 = Use an email mask
firefox-relay-use-mask-title = Use { -relay-brand-name } email mask
# This is followed, on a new line, by firefox-relay-opt-in-subtitle-b
firefox-relay-opt-in-title-b = Get a free email mask
# This is preceded by firefox-relay-opt-in-title-b (on a different line)
firefox-relay-opt-in-subtitle-b = Protect your inbox from spam
firefox-relay-opt-in-confirmation-enable-button =
    .label = Use email mask
    .accesskey = U
firefox-relay-opt-in-confirmation-disable =
    .label = Don’t show me this again
    .accesskey = D
firefox-relay-opt-in-confirmation-postpone =
    .label = Not now
    .accesskey = N

firefox-relay-and-fxa-opt-in-confirmation-disable =
    .label = Don’t show me this again
    .accesskey = D
firefox-relay-and-fxa-opt-in-confirmation-postpone =
    .label = Not now
    .accesskey = N

## The "with-domain" variation of the Relay offer popup

firefox-relay-and-fxa-popup-notification-header-with-domain = Get a free email mask

firefox-relay-and-fxa-popup-notification-first-sentence = Protect your inbox from spam by using a free <label data-l10n-name="firefox-relay-learn-more-url">{ -relay-brand-name } email mask</label> to hide your real address. Emails from <label data-l10n-name="firefox-fxa-and-relay-offer-domain">this site</label> will still come to your inbox, but with your email hidden.

firefox-relay-offer-why-to-use-relay-1 = Protect your inbox from spam by using a free <label data-l10n-name="firefox-relay-learn-more-url">{ -relay-brand-name } email mask</label> to hide your real address. Emails from <label data-l10n-name="firefox-fxa-and-relay-offer-domain">this site</label> will still come to your inbox, but with your email hidden.

## The "with-domain-and-value-prop" variation of the Relay offer popup

firefox-relay-and-fxa-popup-notification-second-sentence-with-domain-and-value-prop = First, sign up or sign in to your account to use an email mask.

firefox-relay-and-fxa-opt-in-confirmation-enable-button-with-domain-and-value-prop =
    .label = Next
    .accesskey = N
