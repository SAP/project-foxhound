# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = নতুন ট্যাব
newtab-settings-button =
    .title = আপনার নতুন ট্যাব পেজটি কাস্টমাইজ করুন

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-new-tabs =
    .label = নতুন ট্যাবগুলি

## Custom URLs subpage


## Firefox Home content

# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } সারি
           *[other] { $num } সারিগুলি
        }
home-restore-defaults-srd =
    .label = ডিফল্ট মান পুনরায় স্থাপন
    .accesskey = R
home-mode-choice-custom-srd =
    .label = কাস্টম URLs…
home-mode-choice-blank-srd =
    .label = ফাঁকা পাতা
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = স্পন্সর করা স্টোরি
home-prefs-highlights-option-visited-pages-srd =
    .label = ঘুরে আসা পেজ
home-prefs-highlights-options-bookmarks-srd =
    .label = বুকমার্ক
home-prefs-highlights-option-most-recent-download-srd =
    .label = সর্বশেষ ডাউনলোড

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = অনুসন্ধান
    .aria-label = অনুসন্ধান

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = অনুসন্ধান ইঞ্জিন যোগ করুন
newtab-topsites-edit-topsites-header = শীর্ষ সাইট সম্পাদনা করুন
newtab-topsites-title-label = শিরোনাম
newtab-topsites-title-input =
    .placeholder = নাম দিন
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = টাইপ করুন অথবা পেস্ট করুন URL
newtab-topsites-url-validation = কার্যকর URL প্রয়োজন
newtab-topsites-image-url-label = কাস্টম ছবির URL
newtab-topsites-use-image-link = কাস্টম ছবি ব্যবহার করুন…
newtab-topsites-image-validation = ছবি লোড করতে ব্যর্থ। ভিন্ন URL এ চেস্টা করুন।

## Clear text button for the URL and image URL input fields in the Top Sites form.


## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = বাতিল
newtab-topsites-delete-history-button = ইতিহাস থেকে মুছে ফেলুন
newtab-topsites-save-button = সংরক্ষণ
newtab-topsites-preview-button = প্রাকদর্শন
newtab-topsites-add-button = যোগ

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = আপনি কি নিশ্চিতভাবে আপনার ইতিহাস থেকে এই পাতার সকল কিছু মুছে ফেলতে চান?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = এই পরিবর্তনটি অপরিবর্তনীয়।

## Top Sites - Sponsored label


## Label used by screen readers for pinned top sites


## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = মেনু খুলুন
    .aria-label = মেনু খুলুন
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#  $title (String): The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = মেনু খুলুন
    .aria-label = { $title } থেকে কনটেক্সট মেনু খুলুন
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = সাইটটি সম্পাদনা করুন
    .aria-label = সাইটটি সম্পাদনা করুন

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = সম্পাদনা
newtab-menu-open-new-window = নতুন উইন্ডোতে খুলুন
newtab-menu-open-new-private-window = নতুন ব্যক্তিগত উইন্ডোতে খুলুন
newtab-menu-dismiss = বাতিল
newtab-menu-pin = পিন
newtab-menu-unpin = আনপিন
newtab-menu-delete-history = ইতিহাস থেকে মুছে ফেলুন
newtab-menu-save-to-pocket = { -pocket-brand-name } এ সংরক্ষণ করুন
newtab-menu-delete-pocket = { -pocket-brand-name } থেকে মুছে দিন
newtab-menu-archive-pocket = { -pocket-brand-name } এ আর্কাইভ করুন

## Context menu options for sponsored stories and new ad formats on New Tab.


## Message displayed in a modal window to explain privacy and provide context for sponsored content.


##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = বুকমার্ক মুছে দিন
# Bookmark is a verb here.
newtab-menu-bookmark = বুকমার্ক

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = ডাউনলোডের লিঙ্ক অনুলিপি করুন
newtab-menu-go-to-download-page = ডাউনলোড পাতায় যাও
newtab-menu-remove-download = ইতিহাস থেকে মুছে ফেলুন

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] ফাইন্ডারে প্রদর্শন করুন
       *[other] ধারণকারী ফোল্ডার খুলুন
    }
newtab-menu-open-file = ফাইল খুলুন

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = পরিদর্শিত
newtab-label-bookmarked = বুকমার্ক করা হয়েছে
newtab-label-recommended = ঝোঁক
newtab-label-saved = { -pocket-brand-name } এ সংরক্ষণ করুন
newtab-label-download = ডাউনলোড হয়েছে

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = সেকশনটি সরান
newtab-section-menu-collapse-section = সেকশনটি সংকোচন করুন
newtab-section-menu-expand-section = সেকশনটি প্রসারিত করুন
newtab-section-menu-manage-section = সেকশনটি পরিচালনা করুন
newtab-section-menu-manage-webext = এক্সটেনসন ব্যবহার করুন
newtab-section-menu-add-topsite = টপ সাইট যোগ করুন
newtab-section-menu-add-search-engine = অনুসন্ধান ইঞ্জিন যোগ করুন
newtab-section-menu-move-up = উপরে উঠাও
newtab-section-menu-move-down = নীচে নামাও
newtab-section-menu-privacy-notice = গোপনীয়তা নীতি

## Section aria-labels


## Section Headers.

newtab-section-header-topsites = শীর্ঘ সাইট
# Variables:
#  $provider (String): Name of the corresponding content provider.
newtab-section-header-pocket = { $provider } দ্বারা সুপারিশকৃত

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = ব্রাউজি করা শুরু করুন, এবং কিছু গুরুত্বপূর্ণ নিবন্ধ, ভিডিও, এবং আপনি সম্প্রতি পরিদর্শন বা বুকমার্ক করেছেন এমন কিছু পৃষ্ঠা আমরা এখানে প্রদর্শন করব।
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#  $provider (String): Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = কিছু একটা ঠিক নেই। { $provider } এর শীর্ষ গল্পগুলো পেতে কিছুক্ষণ পর আবার দেখুন। অপেক্ষা করতে চান না? বিশ্বের সেরা গল্পগুলো পেতে কোন জনপ্রিয় বিষয় নির্বাচন করুন।

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.


## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = জনপ্রিয় বিষয়:
newtab-pocket-more-recommendations = আরও সুপারিশ
newtab-pocket-cta-button = { -pocket-brand-name } ব্যবহার করুন
newtab-pocket-cta-text = { -pocket-brand-name } এ আপনার পছন্দের গল্পগুলো সংরক্ষণ করুন, এবং চমৎকার সব লেখা পড়ে আপনার মনের ইন্ধন যোগান।

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.


## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.


## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = ওহো, কনটেন্টটি লোড করতে কিছু ভুল হয়েছে।
newtab-error-fallback-refresh-link = পুনরায় চেস্টা করার জন্য পেজটি রিফ্রেশ করুন।

## Customization Menu


## New Tab Wallpapers


## Solid Colors


## Abstract


## Firefox


## Firefox


## Celestial


## New Tab Weather


## Topic Labels


## Topic Selection Modal


## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.


## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.


## Confirmation modal for blocking a section


## Strings for custom wallpaper highlight


## Strings for new user activation custom wallpaper highlight


## Strings for Nova wallpaper feature highlight


## Strings for download mobile highlight


## Strings for shortcuts highlight


## Strings for reporting issues with ads and content


## Strings for task / to-do list productivity widget


## Strings introduced by the Nova redesign of the Timer widget


## Strings introduced by the Nova redesign of the Timer widget


##


## Sports widget live-games pagination. Shown when 2+ matches are live at the same time


## Accessible labels for match rows in the sports widget. These are read by
## screen readers to announce the match details and status.
## Variables shared by all messages in this group:
##   $homeTeam (String) - The full name of the home team (e.g. "Mexico")
##   $awayTeam (String) - The full name of the away team (e.g. "Russia")


## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.


## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.


## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.


## Strings for the Clock widget

