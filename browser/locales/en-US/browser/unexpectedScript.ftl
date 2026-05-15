# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

unexpected-script-close-button =
    .aria-label = Close

# This string is used in the notification bar
# Variables:
#   $origin (string) - The top level domain the unexpected script was loaded from
unexpected-script-load-message = <strong>{ -brand-short-name } has detected an unexpected, privileged script from { $origin }</strong>

unexpected-script-load-message-button-allow =
    .label = Allow
    .accesskey = A

unexpected-script-load-message-button-block =
    .label = Block
    .accesskey = B

unexpected-script-load-title = Unexpected Script Load

unexpected-script-load-detail-1-allow = { -brand-short-name } will <strong>ALLOW</strong> unexpected privileged scripts, including the one below, to load. This will make your { -brand-short-name } installation <strong>less</strong> secure.

unexpected-script-load-detail-1-block = { -brand-short-name } will <strong>BLOCK</strong> unexpected privileged scripts, including the one below, from loading. This will make your { -brand-short-name } installation <strong>more</strong> secure.

# In this text "the functionality" refers to whatever the unexpected script is doing.
# Sorry that is vague - but we don't know what these scripts are, so we don't know what they're doing
# They could be a custom script people used to customize Firefox, an enterprise configuration script, or something else entirely
unexpected-script-load-detail-2 = Even if you allow this script, please report it to { -vendor-short-name } to help understand how and why it was loaded. <em>Without this information, the functionality will break in the future.</em>

unexpected-script-load-report-checkbox =
    .label = Report the URL of this script to { -vendor-short-name }

unexpected-script-load-email-checkbox =
    .label = Include my email so { -vendor-short-name } can contact me if needed

unexpected-script-load-email-textbox =
    .placeholder = Enter email here
    .aria-label = Enter email here

unexpected-script-load-more-info = More Info

unexpected-script-load-learn-more = Learn More

unexpected-script-load-telemetry-disabled = Reporting is disabled because Telemetry is disabled in Settings. Enable Telemetry to Report.
