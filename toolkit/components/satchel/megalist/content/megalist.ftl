# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

filter-input =
  .placeholder = Search passwords
  .key = F
  .aria-label = Search passwords

menu-more-options-button =
  .title = More options

more-options-popup =
  .aria-label = More Options

## Commands

command-copy = Copy
command-reveal = Reveal
command-conceal = Conceal
command-toggle = Toggle
command-open = Open
command-delete = Remove record
command-edit = Edit
command-save = Save
command-cancel = Cancel

## Passwords

passwords-section-label = Passwords
passwords-disabled = Passwords are disabled

passwords-expand-section-tooltip = Show Passwords
passwords-collapse-section-tooltip = Hide Passwords

passwords-dismiss-breach-alert-command = Dismiss breach alert
passwords-command-create = Add Password
passwords-command-import-from-browser = Import from Another Browser…
passwords-command-import = Import from a File…
passwords-command-export = Export Passwords…
passwords-command-remove-all = Remove All Passwords…
passwords-command-settings = Settings
passwords-command-help = Help
passwords-command-sort-name = Sort By Name (A-Z)
# This message can be seen when sorting logins by breached or vulnerable alerts.
passwords-command-sort-alerts = Sort By Alerts

passwords-os-auth-dialog-caption = { -brand-full-name }

# This message can be seen when attempting to export a password in about:logins on Windows.
passwords-export-os-auth-dialog-message-win = To export your passwords, enter your Windows login credentials. This helps protect the security of your accounts.
# This message can be seen when attempting to export a password in about:logins
# The macOS strings are preceded by the operating system with "Firefox is trying to "
# and includes subtitle of "Enter password for the user "xxx" to allow this." These
# notes are only valid for English. only provide the reason that account verification is needed. Do not put a complete sentence here.
passwords-export-os-auth-dialog-message-macosx = export saved passwords

# This message can be seen when attempting to reveal a password in contextual password manager on Windows
passwords-reveal-password-os-auth-dialog-message-win = To view your password, enter your Windows login credentials. This helps protect the security of your accounts.
# The MacOS string is preceded by the operating system with "Firefox is trying to ".
# Only provide the reason that account verification is needed. Do not put a complete sentence here.
passwords-reveal-password-os-auth-dialog-message-macosx = reveal the saved password

# This message can be seen when attempting to copy a password in contextual password manager on Windows.
passwords-copy-password-os-auth-dialog-message-win = To copy your password, enter your Windows login credentials. This helps protect the security of your accounts.
# The MacOS string is preceded by the operating system with "Firefox is trying to ".
# Only provide the reason that account verification is needed. Do not put a complete sentence here.
passwords-copy-password-os-auth-dialog-message-macosx = copy the saved password

passwords-import-file-picker-title = Import Passwords
passwords-import-file-picker-import-button = Import

# A description for the .csv file format that may be shown as the file type
# filter by the operating system.
passwords-import-file-picker-csv-filter-title =
  { PLATFORM() ->
      [macos] CSV Document
     *[other] CSV File
  }
# A description for the .tsv file format that may be shown as the file type
# filter by the operating system. TSV is short for 'tab separated values'.
passwords-import-file-picker-tsv-filter-title =
  { PLATFORM() ->
      [macos] TSV Document
     *[other] TSV File
  }

passwords-import-success-heading =
  .heading = Passwords imported

# Variables
#   $added (number) - Number of added passwords
#   $modified (number) - Number of modified passwords
passwords-import-success-message =
  New passwords added: { $added }<br/>Existing passwords updated: { $modified }

passwords-import-detailed-report = View detailed report
passwords-import-success-button = Done

passwords-import-error-heading-and-message =
  .heading = Couldn’t import passwords
  .message = Make sure your file includes a column for websites, usernames, and passwords.
passwords-import-error-button-try-again = Try Again
passwords-import-error-button-cancel = Cancel
passwords-import-learn-more = Learn about importing passwords

# Export passwords to file dialog
export-passwords-dialog-title = Export passwords to file?
# This string recommends to the user that they delete the exported password file that is saved on their local machine.
export-passwords-dialog-message = After you export, we recommend deleting it so others who may use this device can’t see your passwords.
export-passwords-dialog-confirm-button = Continue with export

# Title of the file picker dialog
passwords-export-file-picker-title = Export Passwords from { -brand-short-name }
# The default file name shown in the file picker when exporting saved logins.
# The resultant filename will end in .csv (added in code).
passwords-export-file-picker-default-filename = passwords
passwords-export-file-picker-export-button = Export
# A description for the .csv file format that may be shown as the file type
# filter by the operating system.
passwords-export-file-picker-csv-filter-title =
  { PLATFORM() ->
      [macos] CSV Document
     *[other] CSV File
  }

# Variables
#   $count (number) - Number of passwords
passwords-count =
  { $count ->
      [one] { $count } password
     *[other] { $count } passwords
  }

# Variables
#   $count (number) - Number of filtered passwords
#   $total (number) - Total number of passwords
passwords-filtered-count =
  { $total ->
      [one] { $count } of { $total } password
     *[other] { $count } of { $total } passwords
  }

# Confirm the removal of all saved passwords
#   $total (number) - Total number of passwords
passwords-remove-all-title =
  { $total ->
     [one] Remove password?
    *[other] Remove all { $total } passwords?
  }

# Checkbox label to confirm the removal of saved passwords
#   $total (number) - Total number of passwords
passwords-remove-all-confirm =
  { $total ->
     [1] Yes, remove password
    *[other] Yes, remove passwords
  }

# Button label to confirm removal of saved passwords
#   $total (number) - Total number of passwords
passwords-remove-all-confirm-button =
  { $total ->
     [1] Remove
    *[other] Remove all
  }

# Message to confirm the removal of all saved passwords when user DOES NOT HAVE SYNC
#   $total (number) - Total number of passwords
passwords-remove-all-message =
  { $total ->
     [1] This will remove your password saved to { -brand-short-name } and any breach alerts. You cannot undo this action.
    *[other] This will remove the passwords saved to { -brand-short-name } and any breach alerts. You cannot undo this action.
  }

# Message for modal to confirm the removal of all saved passwords when user HAS SYNC
#   $total (number) - Total number of passwords
passwords-remove-all-message-sync =
  { $total ->
     [1] This will remove the password saved to { -brand-short-name } on all your synced devices and remove any breach alerts. You cannot undo this action.
    *[other] This will remove all passwords saved to { -brand-short-name } on all your synced devices and remove any breach alerts. You cannot undo this action.
  }

passwords-origin-label = Website
# The attribute .data-after describes the text that should be displayed for the ::after pseudo-selector
passwords-username-label = Username
  .data-after = Copied
# The attribute .data-after describes the text that should be displayed for the ::after pseudo-selector
passwords-password-label = Password
  .data-after = Copied

passwords-radiogroup-label =
  .aria-label = Filter passwords

# Variables
#   $url (string) - The url associated with the new login
passwords-add-password-success-heading =
  .heading = Password added for { $url }
passwords-add-password-success-button = View

# Variables
#   $url (string) - The url associated with the existing login
passwords-password-already-exists-error-heading =
  .heading = A password and username for { $url } already exists
passwords-password-already-exists-error-button = Go to Password

# Radiobutton label to display total number of passwords
#   $total (number) - Total number of passwords
passwords-radiobutton-all = All ({ $total })

# Radiobutton label to display total number of alerts
#   $total (number) - Total number of alerts
passwords-radiobutton-alerts = Alerts ({ $total })

## Login Form

passwords-create-label =
  .label = Add password
passwords-edit-label =
  .label = Edit password
passwords-origin-tooltip = Enter the exact address where you’ll sign in to this site.
passwords-username-tooltip = Enter the username, email address, or account number you use to sign in.
passwords-password-tooltip = Enter the password used to sign in to this account.

## Password Card

passwords-list-label =
  .aria-label = Passwords

website-icon =
  .alt = Website Icon
copy-icon =
  .alt = Copy
check-icon =
  .alt = Copied
alert-icon =
  .alt = Warning

# Variables
#   $url (string) - The url associated with the login
origin-login-line =
  .aria-label = Visit { $url }
  .title = Visit { $url }
# Variables
#   $username (string) - The username associated with the login
username-login-line =
  .aria-label = Copy Username { $username }
  .title = Copy Username { $username }
password-login-line =
  .aria-label = Copy Password
  .title = Copy Password
edit-login-button = Edit
  .tooltiptext = Edit Password

show-password-button =
  .aria-label = Show Password
  .title = Show Password
hide-password-button =
  .aria-label = Hide Password
  .title = Hide Password

# The message displayed when the search text does not match any of the user's saved logins.
passwords-no-passwords-found-header =
  .heading = No passwords found
passwords-no-passwords-found-message = Try a different search term and try again.

## When the user has no saved passwords, we display the following messages to inform the user they can save
## their passwords safely and securely in Firefox:

# This string encourages the user to save their passwords in Firefox (the "safe spot").
passwords-no-passwords-header = Save your passwords to a safe spot.
# This string informs that we (Firefox) store all passwords securely and will notify them of any breaches and alerts their
# passwords may be involved in.
passwords-no-passwords-message = All passwords are encrypted and we’ll watch out for breaches and alerts if you’re affected.
# This string encourages the user to save their passwords to Firefox again.
passwords-no-passwords-get-started-message = Add them here to get started.
# This string is displayed in a button. If the user clicks it, they will be taken to a form to create a new password.
passwords-add-manually = Add manually

## Payments

payments-command-create = Add Payment Method

payments-section-label = Payment methods
payments-disabled = Payments methods are disabled

payments-expand-section-tooltip = Show Payments
payments-collapse-section-tooltip = Hide Payments

# Variables
#   $count (number) - Number of payment methods
payments-count =
  { $count ->
      [one] { $count } payment method
     *[other] { $count } payment methods
  }

# Variables
#   $count (number) - Number of filtered payment methods
#   $total (number) - Total number of payment methods
payments-filtered-count =
  { $total ->
      [one] { $count } of { $total } payment method
     *[other] { $count } of { $total } payment methods
  }

card-number-label = Card Number
card-expiration-label = Expires on
card-holder-label = Name on Card

## Addresses

addresses-command-create = Add Address

addresses-section-label = Addresses
addresses-disabled = Addresses are disabled

addresses-expand-section-tooltip = Show Addresses
addresses-collapse-section-tooltip = Hide Addresses

# Variables
#   $count (number) - Number of addresses
addresses-count =
  { $count ->
      [one] { $count } address
     *[other] { $count } addresses
  }

# Variables
#   $count (number) - Number of filtered addresses
#   $total (number) - Total number of addresses
addresses-filtered-count =
  { $total ->
      [one] { $count } of { $total } address
     *[other] { $count } of { $total } addresses
  }

address-name-label = Name
address-phone-label = Phone
address-email-label = Email
