# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# This string is used to name the folder that users will save backups to.
# "Restore" is an action and intended for prompting users to select this folder
# when following backup restoration steps. Please only include characters that
# can be used for folders. Invalid characters will be automatically stripped out
# or replaced with underscores.
backup-folder-name = Restore { -brand-product-name }

# This string is used for the generated file that will be stored within the
# backup-folder-name folder. It will have the profile name and an encoding of
# the backup date appended to it, followed by `.html`. Please only include
# characters that can be used for filenames. Invalid characters will be
# automatically stripped out or replaced with underscores.
#
# This is an example of what the final filename might look like after the
# profile name and backup date are appended to it:
#
# FirefoxBackup_default_20240606-1830.html
backup-file-name = { -brand-product-name }Backup

settings-data-backup-header = Backup
settings-data-backup-toggle = Manage backup
settings-data-backup-toggle-on = Turn on backup
settings-data-backup-toggle-off = Turn off backup
settings-data-backup-trigger-button = Backup now
settings-data-backup-in-progress-button = Backup in progress…
settings-data-backup-in-progress-message =
    .message = Backup in progress…
settings-data-backup-scheduled-backups-on = Backup: ON
settings-data-backup-scheduled-backups-off = Backup: OFF
settings-data-backup-scheduled-backups-description = Automatically protect your bookmarks, history, and other data. <a data-l10n-name="support-link">Learn more</a>
settings-data-backup-last-backup-date = Last backup: { DATETIME($date, timeStyle: "short") }, { DATETIME($date, dateStyle: "short") }
# "Location" refers to the folder where backups are being written to.
settings-data-backup-last-backup-location = Location
settings-data-backup-last-backup-location-show-in-folder = Show in folder
settings-data-backup-last-backup-location-edit = Edit…
settings-data-create-backup-error = There was an error creating your backup on { DATETIME($date, timeStyle: "short") }, { DATETIME($date, dateStyle: "short") }

settings-sensitive-data-encryption-description = Back up your passwords and payment methods, plus keep all your data safe with encryption.

# Variables:
#   $fileName (String) - The file name of the last backup that was created.
settings-data-backup-last-backup-filename = Filename: { $fileName }

settings-data-backup-restore-header = Restore your data

## These strings are shown under the header if scheduled backups are disabled.

settings-data-backup-scheduled-backups-off-restore-description = Use a { -brand-product-name } backup from another device to restore your data.
settings-data-backup-scheduled-backups-off-restore-choose = Choose backup file…

## These strings are shown under the header if scheduled backups are enabled.

settings-data-backup-scheduled-backups-on-restore-description = Recover your { -brand-product-name } data back from the last time it was backed up.
settings-data-backup-scheduled-backups-on-restore-choose = Restore…

settings-data-toggle-encryption-label = Back up your sensitive data
settings-data-toggle-encryption-support-link = Learn more

settings-data-change-password = Change password…

## These strings are displayed in a modal when users want to turn on scheduled backups.

turn-on-scheduled-backups-header = Turn on backup
turn-on-scheduled-backups-description = { -brand-short-name } will create a snapshot of your data every 24 hours. You can restore it if there’s a problem or you get a new device.
turn-on-scheduled-backups-support-link = What will be backed up?

# "Location" refers to the save location or a folder where users want backups stored.
turn-on-scheduled-backups-location-label = Location
# Variables:
#   $recommendedFolder (String) - Name of the recommended folder for saving backups
turn-on-scheduled-backups-location-default-folder =
    .value = { $recommendedFolder } (recommended)
turn-on-scheduled-backups-location-choose-button =
    { PLATFORM() ->
        [macos] Choose…
        *[other] Browse…
    }

turn-on-scheduled-backups-encryption-label = Back up your sensitive data
turn-on-scheduled-backups-encryption-create-password-label = Password
# Users will be prompted to re-type a password, to ensure that the password is entered correctly.
turn-on-scheduled-backups-encryption-repeat-password-label = Repeat password

turn-on-scheduled-backups-cancel-button = Cancel
turn-on-scheduled-backups-confirm-button = Turn on backup

# Tell the user there was an error accessing the user's selected backup
# folder. The folder may be invalid or inaccessible.
turn-on-scheduled-backups-error-file-system = There was a problem with your selected backup folder. Choose a different folder and try again.
backup-error-file-system = There was a problem with your selected backup folder while backing up { -brand-short-name }.

## These strings are displayed in a modal when users want to turn off scheduled backups.

turn-off-scheduled-backups-header = Turn off backup?
turn-off-scheduled-backups-description = This also deletes all of your backup data. It can’t be undone.
turn-off-scheduled-backups-support-link = Learn more

turn-off-scheduled-backups-cancel-button = Cancel
turn-off-scheduled-backups-confirm-button = Turn off and delete backup

## These strings are displayed in a modal when users want restore from a backup.

restore-from-backup-header = Restore your data
# Variables:
#   $date (string) - Date to be formatted based on locale
restore-from-backup-description-with-metadata =
    .message = This will replace all your current { -brand-short-name } data with your backup from { DATETIME($date, timeStyle: "short", dateStyle: "short") }.
restore-from-backup-support-link =
    .message = What will be restored?
restore-from-backup-no-backup-file-link = Having problems finding your backup?

restore-from-backup-filepicker-label = Backup file
restore-from-backup-filepicker-title = Choose Backup File:
restore-from-backup-file-choose-button =
    { PLATFORM() ->
        [macos] Choose…
        *[other] Browse…
    }
restore-from-backup-password-label = Password
restore-from-backup-password-description = This unlocks your encrypted backup.

restore-from-backup-cancel-button = Cancel
restore-from-backup-confirm-button = Restore and restart
restore-from-backup-restoring-button = Restoring…

## These strings are displayed in a small error message bar in the settings
## menu if there was an error when trying to restore a backed up profile

# User is not authorized to restore a particular backup file, usually because
# the backup file is encrypted and the user provided a recovery password that
# was different than the password the user configured for their backup file
backup-service-error-incorrect-password = Incorrect password. <a data-l10n-name="incorrect-password-support-link">Still having problems?</a>

# The backup file (or specific data files within the backup file) could not be
# loaded and parsed correctly, most likely due to data corruption of the
# backup file itself
backup-service-error-corrupt-file =
    .heading = This file isn’t working
    .message = There was a problem with your backup file. Choose a different file and try again.

# The backup file cannot be restored. The currently running application may
# be too old and may not support features in the backed up profile.
# Alternatively, the backup file may be too old and some of the feature in
# the backed up profile may no longer be supported.
backup-service-error-unsupported-version =
    .heading = This file isn’t working
    .message = The file you chose isn’t compatible with this version of { -brand-short-name }. Choose a different file and try again.

# The backup file cannot be restored. The currently running application is not
# the same application that created the backup file (e.g. Firefox cannot
# restore a Thunderbird profile backup).
backup-service-error-unsupported-application =
    .heading = This file isn’t working
    .message = The file you chose was not created by { -brand-short-name }. Choose a different file and try again.

# Recovery from backup did not succeed. Potential causes could be file system
# errors, internal code errors, decryption errors, etc.
backup-service-error-recovery-failed =
    .heading = { -brand-short-name } couldn’t restore
    .message = Restart { -brand-short-name } and try restoring your backup again.

# There was some error in the backup service but we don't have a more specific
# idea of what went wrong
backup-service-error-went-wrong2 =
    .heading = Hmm, there was a problem backing up.
    .message = Try again in a few minutes.

## These strings are displayed in a modal when users want to enable encryption or change the password for an existing backup.

enable-backup-encryption-header = Back up your sensitive data
enable-backup-encryption-support-link = Learn more

enable-backup-encryption-create-password-label = Password
# Users will be prompted to re-type a password, to ensure that the password is entered correctly.
enable-backup-encryption-repeat-password-label = Repeat password

enable-backup-encryption-cancel-button = Cancel
enable-backup-encryption-confirm-button = Save

change-backup-encryption-header = Change backup password

## These strings are displayed in a tooltip showing what requirements are met while creating a password.

password-rules-header = Password requirements
password-rules-length-description = At least 8 characters
password-rules-email-description = Not your email address
password-rules-disclaimer = Stay safe — don’t reuse passwords. See more tips to <a data-l10n-name="password-support-link">create strong passwords</a>.
password-validity-has-email = Can’t be an email address
password-validity-do-not-match = Passwords don’t match

## These strings are only used for assistive technologies, like screen readers, in the password requirements tooltip.

password-rules-a11y-success =
    .alt = Success
password-rules-a11y-warning =
    .alt = Warning

## These strings are displayed in a modal when users want to disable encryption for an existing backup.

disable-backup-encryption-header = Remove password protection
disable-backup-encryption-description2 = Your saved passwords and payment methods will also no longer be backed up.
disable-backup-encryption-support-link = What will be backed up?

disable-backup-encryption-cancel-button = Cancel
disable-backup-encryption-confirm-button = Remove password

## These strings are used to tell users when errors occur when using
## the backup system

backup-error-password-requirements = Your password doesn’t meet the requirements. Please try another password.

# This error message will be shown to the user when something went wrong with
# the backup system but we do not have any more specific idea of what went
# wrong. This message invites the user to try an action again because there
# is a chance that the action will succeed if retried.
backup-error-retry = Something went wrong. Please try again.

## These strings are inserted into the generated single-file backup archive.
## The single-file backup archive is a specially-crafted, static HTML file
## that is placed within a user specified directory (the Documents folder by
## default) within a folder labelled with the "backup-folder-name" string.

backup-file-header = { -brand-short-name } is ready to be restored
backup-file-title = Restore { -brand-short-name }
backup-file-intro = Get back to browsing and recover all your bookmarks, history, and other data. <a data-l10n-name="backup-file-support-link">Learn more</a>

backup-file-path-label = Backup file:

backup-file-encryption-state-label = Encrypted:
backup-file-encryption-state-value-encrypted = Yes
backup-file-encryption-state-value-not-encrypted = No

backup-file-creation-device-label = Device:

backup-file-creation-date-label = Created:
# Variables:
#   $date (Datetime) - The date the backup was created
backup-file-creation-date-value = { DATETIME($date, timeStyle: "short") }, { DATETIME($date, dateStyle: "short") }

backup-file-how-to-restore-header = How to restore:

# The ☰ character is intended as a visual icon representing the Firefox
# application menu.
backup-file-moz-browser-restore-step-1 = Open the application menu ☰ and go to Settings > Sync
backup-file-moz-browser-restore-step-2 = Click “Choose backup file” and select this file
backup-file-moz-browser-restore-step-3 = Restart { -brand-short-name } when asked

backup-file-other-browser-restore-step-1 = Download and install { -brand-short-name }
backup-file-download-moz-browser-button = Download
# The ☰ character is intended as a visual icon representing the Firefox
# application menu.
backup-file-other-browser-restore-step-2 = Start { -brand-short-name }, open the application menu ☰ and go to Settings > Sync
backup-file-other-browser-restore-step-3 = Click “Choose backup file” and select this file
backup-file-other-browser-restore-step-4 = Restart { -brand-short-name } when asked

## These strings are used in the about:restore and about:welcome pages
## These pages guide the user on browser startup to help them restore a backup
## if they have one on their file system.

# Variables:
# $numberOfOtherBackupsFound (number) - The number of backups found other than the displayed default backup
other-backup-files-founds =
    { $numberOfOtherBackupsFound ->
        [one] <b>Note:</b> { $numberOfOtherBackupsFound } other backup file found
       *[other] <b>Note:</b> { $numberOfOtherBackupsFound } other backup files found
    }

# Variables:
#   $date (Datetime) - The date the backup was created
#   $machineName (String) - Name of the machine that the backup was created on.
backup-file-creation-date-and-device = Created on { DATETIME($date, year: "numeric", month: "numeric", day: "numeric") } on { $machineName }

backup-file-restore-file-validation-error = This file isn’t working. Try picking a different file. <a data-l10n-name="restore-problems">Still having problems?</a>

restore-from-backup-filepicker-input =
    .placeholder = No file selected
