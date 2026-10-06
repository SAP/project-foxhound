# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = แท็บใหม่
newtab-settings-button =
    .title = ปรับแต่งหน้าแท็บใหม่ของคุณ
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = ปรับแต่งหน้านี้
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = ปรับแต่ง
newtab-customize-panel-label =
    .label = ปรับแต่ง
newtab-personalize-settings-icon-label =
    .title = ปรับแต่งแท็บใหม่
    .aria-label = การตั้งค่า
newtab-settings-dialog-label =
    .aria-label = การตั้งค่า
newtab-personalize-icon-label =
    .title = ปรับแท็บใหม่ให้เป็นส่วนตัว
    .aria-label = ปรับแท็บใหม่ให้เป็นส่วนตัว
newtab-personalize-dialog-label =
    .aria-label = ปรับให้เป็นแบบส่วนตัว
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = ปิด
    .aria-label = ปิด

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = หน้าแรก
home-homepage-new-windows =
    .label = หน้าต่างใหม่
home-homepage-new-tabs =
    .label = แท็บใหม่
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = เลือกไซต์ที่ต้องการ

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = ที่อยู่เว็บไซต์
home-custom-homepage-address =
    .placeholder = ป้อนที่อยู่
home-custom-homepage-address-button =
    .label = เพิ่มที่อยู่
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = ยังไม่ได้เพิ่มเว็บไซต์ใด
home-custom-homepage-delete-address-button =
    .aria-label = ลบที่อยู่
    .title = ลบที่อยู่
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = แทนที่ด้วย
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = หน้าที่เปิดปัจจุบัน
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = ที่คั่นหน้า…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = ค้นหา
home-prefs-stories-header2 =
    .label = เรื่องราว
    .description = เนื้อหาคัดสรรพิเศษโดยผลิตภัณฑ์ตระกูล { -brand-product-name }
home-prefs-widgets-header =
    .label = วิดเจ็ต
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = รายการ
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = ตัวจับเวลา
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = กีฬา
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = นาฬิกา
home-prefs-mission-message2 =
    .message = ผู้สนับสนุนของเราสนับสนุนภารกิจที่จะสร้างเว็บที่ดีขึ้น
home-prefs-manage-topics-link2 =
    .label = จัดการหัวข้อ
home-prefs-choose-wallpaper-link2 =
    .label = เลือกวอลล์เปเปอร์
home-prefs-firefox-logo-header =
    .label = โลโก้ { -brand-short-name }
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = เพื่อใช้คุณลักษณะเหล่านี้ ให้ตั้งค่าแท็บใหม่หรือหน้าต่างใหม่เป็น { -firefox-home-brand-name }
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label = { $num } แถว
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = ส่วนขยาย ({ $extension })
home-restore-defaults-srd =
    .label = เรียกคืนค่าเริ่มต้น
    .accesskey = ร
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (ค่าเริ่มต้น)
home-mode-choice-custom-srd =
    .label = URL กำหนดเอง…
home-mode-choice-blank-srd =
    .label = หน้าว่าง
home-prefs-shortcuts-header-srd =
    .label = ทางลัด
home-prefs-shortcuts-select =
    .aria-label = ทางลัด
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = ทางลัดที่ได้รับการสนับสนุน
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = เรื่องราวที่ได้รับการสนับสนุน
home-prefs-highlights-option-visited-pages-srd =
    .label = หน้าที่เยี่ยมชมแล้ว
home-prefs-highlights-options-bookmarks-srd =
    .label = ที่คั่นหน้า
home-prefs-highlights-option-most-recent-download-srd =
    .label = การดาวน์โหลดล่าสุด
home-prefs-recent-activity-header-srd =
    .label = กิจกรรมล่าสุด
home-prefs-recent-activity-select =
    .aria-label = กิจกรรมล่าสุด
home-prefs-weather-header-srd =
    .label = พยากรณ์อากาศ
home-prefs-support-firefox-header-srd =
    .label = ร่วมสนับสนุน { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = ค้นหาว่าทำอย่างไร

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = ค้นหา
    .aria-label = ค้นหา
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = ค้นหาด้วย { $engine } หรือป้อนที่อยู่
newtab-search-box-handoff-text-no-engine = ค้นหาหรือป้อนที่อยู่
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = ค้นหาด้วย { $engine } หรือป้อนที่อยู่
    .title = ค้นหาด้วย { $engine } หรือป้อนที่อยู่
    .aria-label = ค้นหาด้วย { $engine } หรือป้อนที่อยู่
newtab-search-box-handoff-input-no-engine =
    .placeholder = ค้นหาหรือป้อนที่อยู่
    .title = ค้นหาหรือป้อนที่อยู่
    .aria-label = ค้นหาหรือป้อนที่อยู่
newtab-search-box-text = ค้นหาเว็บ
newtab-search-box-input =
    .placeholder = ค้นหาเว็บ
    .aria-label = ค้นหาเว็บ

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = เพิ่มเครื่องมือค้นหา
newtab-topsites-add-shortcut-header = ทางลัดใหม่
newtab-topsites-edit-topsites-header = แก้ไขไซต์เด่น
newtab-topsites-edit-shortcut-header = แก้ไขทางลัด
newtab-topsites-add-shortcut-label = เพิ่มทางลัด
newtab-topsites-add-shortcut-title =
    .title = เพิ่มทางลัด
    .aria-label = เพิ่มทางลัด
newtab-topsites-title-label = ชื่อเรื่อง
newtab-topsites-title-input =
    .placeholder = ป้อนชื่อเรื่อง
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = พิมพ์หรือวาง URL
newtab-topsites-url-validation = ต้องการ URL ที่ถูกต้อง
newtab-topsites-image-url-label = URL ภาพกำหนดเอง
newtab-topsites-use-image-link = ใช้ภาพกำหนดเอง…
newtab-topsites-image-validation = ไม่สามารถโหลดภาพ ลอง URL อื่น

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = ล้างข้อความ

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = ยกเลิก
newtab-topsites-delete-history-button = ลบออกจากประวัติ
newtab-topsites-save-button = บันทึก
newtab-topsites-preview-button = แสดงตัวอย่าง
newtab-topsites-add-button = เพิ่ม

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = คุณแน่ใจหรือไม่ว่าต้องการลบทุกอินสแตนซ์ของหน้านี้ออกจากประวัติของคุณ?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = การกระทำนี้ไม่สามารถเลิกทำได้

## Top Sites - Sponsored label

newtab-topsite-sponsored = ได้รับการสนับสนุน

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (ปักหมุดอยู่)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = เปิดเมนู
    .aria-label = เปิดเมนู
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = เอาออก
    .aria-label = เอาออก
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = เปิดเมนู
    .aria-label = เปิดเมนูบริบทสำหรับ { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = แก้ไขไซต์นี้
    .aria-label = แก้ไขไซต์นี้

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = แก้ไข
newtab-menu-open-new-window = เปิดในหน้าต่างใหม่
newtab-menu-open-new-private-window = เปิดในหน้าต่างส่วนตัวใหม่
newtab-menu-dismiss = ยกเลิก
newtab-menu-pin = ปักหมุด
newtab-menu-unpin = ถอนหมุด
newtab-menu-delete-history = ลบออกจากประวัติ
newtab-menu-save-to-pocket = บันทึกไปยัง { -pocket-brand-name }
newtab-menu-delete-pocket = ลบจาก { -pocket-brand-name }
newtab-menu-archive-pocket = เก็บถาวรใน { -pocket-brand-name }
newtab-menu-show-privacy-info = สปอนเซอร์ของเราและความเป็นส่วนตัวของคุณ
newtab-menu-about-fakespot = เกี่ยวกับ { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = รายงาน
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = ปิดกั้น
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = เลิกติดตาม
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = เรียนรู้เพิ่มเติม
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = เลิกติดตามหัวข้อ

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = จัดการเนื้อหาที่ได้รับการสนับสนุน
newtab-menu-our-sponsors-and-your-privacy = ผู้สนับสนุนของเราและความเป็นส่วนตัวของคุณ
newtab-menu-report-this-ad = รายงานโฆษณานี้

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = เสร็จสิ้น
newtab-privacy-modal-button-manage = จัดการการตั้งค่าเนื้อหาที่ได้รับการสนับสนุน
newtab-privacy-modal-header = ความเป็นส่วนตัวของคุณสำคัญ
newtab-privacy-modal-paragraph-2 =
    นอกเหนือจากการนำเสนอเรื่องราวที่น่าสนใจ เรายังแสดงให้คุณเห็นเนื้อหาที่เกี่ยวข้อง
    ซึ่งได้รับการตรวจสอบอย่างละเอียดจากผู้สนับสนุนที่ได้รับการคัดเลือก ทำให้คุณมั่นใจ
    ได้ว่า<strong>ข้อมูลการเรียกดูของคุณจะไม่ทิ้งสำเนาส่วนตัวของ { -brand-product-name } ของคุณ</strong>ซึ่งเราและ
    สปอนเซอร์ของเราจะไม่เห็น
newtab-privacy-modal-link = เรียนรู้วิธีการปกป้องความเป็นส่วนตัวในแท็บใหม่

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = เอาที่คั่นหน้าออก
# Bookmark is a verb here.
newtab-menu-bookmark = เพิ่มที่คั่นหน้า

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = คัดลอกลิงก์ดาวน์โหลด
newtab-menu-go-to-download-page = ไปยังหน้าดาวน์โหลด
newtab-menu-remove-download = เอาออกจากประวัติ

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] แสดงใน Finder
       *[other] เปิดโฟลเดอร์ที่บรรจุ
    }
newtab-menu-open-file = เปิดไฟล์

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = เยี่ยมชมแล้ว
newtab-label-bookmarked = เพิ่มที่คั่นหน้าแล้ว
newtab-label-removed-bookmark = เอาที่คั่นหน้าออกแล้ว
newtab-label-recommended = กำลังนิยม
newtab-label-saved = บันทึกไปยัง { -pocket-brand-name } แล้ว
newtab-label-download = ดาวน์โหลดแล้ว
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · ผู้สนับสนุน
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = สนับสนุนโดย { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } นาที
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = ได้รับการสนับสนุน

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = เอาส่วนออก
newtab-section-menu-collapse-section = ยุบส่วน
newtab-section-menu-expand-section = ขยายส่วน
newtab-section-menu-manage-section = จัดการส่วน
newtab-section-menu-manage-webext = จัดการส่วนขยาย
newtab-section-menu-add-topsite = เพิ่มไซต์เด่น
newtab-section-menu-add-search-engine = เพิ่มเครื่องมือค้นหา
newtab-section-menu-move-up = ย้ายขึ้น
newtab-section-menu-move-down = ย้ายลง
newtab-section-menu-privacy-notice = ข้อกำหนดความเป็นส่วนตัว

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = ยุบส่วน
newtab-section-expand-section-label =
    .aria-label = ขยายส่วน

## Section Headers.

newtab-section-header-topsites = ไซต์เด่น
newtab-section-header-recent-activity = กิจกรรมล่าสุด
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = แนะนำโดย { $provider }
newtab-section-header-stories = เรื่องราวที่จุดประกายความคิด
# "picks" refers to recommended articles
newtab-section-header-todays-picks = บทความคัดสรรสำหรับคุณประจำวันนี้

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = เริ่มเรียกดูและเราจะแสดงบทความ วิดีโอ และหน้าอื่น ๆ บางส่วนที่ยอดเยี่ยมที่คุณได้เยี่ยมชมหรือเพิ่มที่คั่นหน้าไว้ล่าสุดที่นี่
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = คุณได้อ่านเรื่องราวครบทั้งหมดแล้ว คุณสามารถกลับมาตรวจดูเรื่องราวเด่นจาก { $provider } ได้ภายหลัง อดใจรอไม่ได้งั้นหรือ? เลือกหัวข้อยอดนิยมเพื่อค้นหาเรื่องราวที่ยอดเยี่ยมจากเว็บต่าง ๆ
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = คุณได้อ่านเรื่องราวครบทั้งหมดแล้ว คุณสามารถกลับมาตรวจดูเรื่องราวเพิ่มเติมได้ภายหลัง อดใจรอไม่ได้งั้นหรือ? เลือกหัวข้อยอดนิยมเพื่อค้นหาเรื่องราวที่ยอดเยี่ยมจากเว็บต่างๆ

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = คุณได้อ่านเรื่องราวครบทั้งหมดแล้ว!
newtab-discovery-empty-section-topstories-content = คุณสามารถกลับมาตรวจดูเรื่องราวเพิ่มเติมได้ภายหลัง
newtab-discovery-empty-section-topstories-try-again-button = ลองอีกครั้ง
newtab-discovery-empty-section-topstories-loading = กำลังโหลด…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = อุ๊ปส์! เราโหลดส่วนนี้เกือบเสร็จแล้ว แต่ยังไม่เสร็จดี

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = หัวข้อยอดนิยม:
newtab-pocket-new-topics-title = ต้องการเรื่องราวเพิ่มเติมหรือไม่ ดูหัวข้อยอดนิยมเหล่านี้จาก { -pocket-brand-name }
newtab-pocket-more-recommendations = คำแนะนำเพิ่มเติม
newtab-pocket-learn-more = เรียนรู้เพิ่มเติม
newtab-pocket-cta-button = รับ { -pocket-brand-name }
newtab-pocket-cta-text = บันทึกเรื่องราวที่คุณรักลงใน { -pocket-brand-name } และเติมเต็มสมองของคุณด้วยบทความที่น่าหลงใหล
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } เป็นส่วนหนึ่งของตระกูล { -brand-product-name }
newtab-pocket-save = บันทึก
newtab-pocket-saved = บันทึกแล้ว

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = เรื่องราวที่คล้ายกัน
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = ฉันไม่สนใจ
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = ขอบคุณ ความคิดเห็นของคุณจะช่วยเราปรับปรุงฟีดของคุณให้ดีขึ้น
newtab-toast-dismiss-button =
    .title = ปิด
    .aria-label = ปิด

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = ค้นพบสุดยอดเว็บ
newtab-pocket-onboarding-cta = { -pocket-brand-name } สำรวจสิ่งพิมพ์ที่หลากหลายเพื่อนำเนื้อหาที่ให้ข้อมูล สร้างแรงบันดาลใจ และน่าเชื่อถือที่สุดมาสู่เบราว์เซอร์ { -brand-product-name } ของคุณ

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = อุปส์ มีบางอย่างผิดพลาดในการโหลดเนื้อหานี้
newtab-error-fallback-refresh-link = เรียกหน้าใหม่เพื่อลองอีกครั้ง

## Customization Menu

newtab-custom-shortcuts-title = ทางลัด
newtab-custom-shortcuts-subtitle = ไซต์ที่คุณบันทึกหรือเยี่ยมชม
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = ทางลัด
    .description = ไซต์ที่คุณบันทึกหรือเยี่ยมชม
newtab-custom-shortcuts-nova =
    .label = ทางลัด
newtab-custom-row-description =
    .description = จำนวนแถว
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
           *[other] { $num } แถว
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
       *[other] { $num } แถว
    }
newtab-custom-sponsored-sites = ทางลัดที่ได้รับการสนับสนุน
newtab-custom-pocket-title = แนะนำโดย { -pocket-brand-name }
newtab-custom-pocket-subtitle = เนื้อหาคัดสรรพิเศษโดย { -pocket-brand-name } ซึ่งเป็นส่วนหนึ่งของตระกูล { -brand-product-name }
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = เรื่องราวแนะนำ
    .description = เนื้อหาคัดสรรพิเศษโดยผลิตภัณฑ์ตระกูล { -brand-product-name }
newtab-recommended-stories-toggle =
    .label = เรื่องราวแนะนำ
newtab-custom-stories-personalized-toggle =
    .label = เรื่องราว
newtab-custom-stories-personalized-checkbox-label = เรื่องราวที่ปรับแต่งตามกิจกรรมของคุณ
newtab-custom-pocket-sponsored = เรื่องราวที่ได้รับการสนับสนุน
newtab-custom-pocket-show-recent-saves = แสดงบันทึกล่าสุด
newtab-custom-recent-title = กิจกรรมล่าสุด
newtab-custom-recent-subtitle = ไซต์และเนื้อหาล่าสุดที่คัดสรรมา
newtab-custom-weather-toggle =
    .label = พยากรณ์อากาศ
    .description = ดูพยากรณ์อากาศประจำวันนี้ได้อย่างรวดเร็ว
newtab-custom-widget-weather-toggle =
    .label = พยากรณ์อากาศ
newtab-custom-widget-lists-toggle =
    .label = รายการ
newtab-custom-widget-timer-toggle =
    .label = ตัวจับเวลา
newtab-custom-widget-sports-toggle =
    .label = ฟุตบอลโลก
newtab-custom-widget-clock-toggle =
    .label = นาฬิกา
newtab-custom-widget-sports-toggle2 =
    .label = กีฬา
newtab-custom-widget-section-title = วิดเจ็ต
newtab-custom-widget-section-toggle =
    .label = วิดเจ็ต
newtab-widget-manage-title = วิดเจ็ต
newtab-widget-manage-widget-button =
    .label = จัดการวิดเจ็ต
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = ปิด
    .aria-label = ปิดเมนู
newtab-custom-close-button = ปิด
newtab-custom-settings = จัดการการตั้งค่าเพิ่มเติม

## New Tab Wallpapers

newtab-wallpaper-title = รูปพื้นหลัง
newtab-wallpaper-reset = กลับเป็นค่าเริ่มต้น
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = อัปโหลดภาพ
newtab-wallpaper-add-an-image = เพิ่มภาพ
newtab-wallpaper-custom-color = เลือกสี
newtab-wallpaper-toggle-title =
    .label = รูปพื้นหลัง
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = ภาพมีขนาดเกินขีดจำกัดขนาดไฟล์ที่ { $file_size } MB โปรดลองอัปโหลดไฟล์ที่มีขนาดเล็กกว่านี้
newtab-wallpaper-error-upload-file-type = เราไม่สามารถอัปโหลดไฟล์ของคุณได้ โปรดลองอีกครั้งด้วยไฟล์ภาพ
newtab-wallpaper-error-file-type = เราไม่สามารถอัปโหลดไฟล์ของคุณได้ โปรดลองอีกครั้งด้วยชนิดไฟล์ที่ต่างจากนี้
newtab-wallpaper-light-red-panda = แพนด้าแดง
newtab-wallpaper-light-mountain = ภูเขาสีขาว
newtab-wallpaper-light-sky = ท้องฟ้าที่มีเมฆสีม่วงและสีชมพู
newtab-wallpaper-light-color = รูปทรงที่มีสีฟ้า สีชมพู และสีเหลือง
newtab-wallpaper-light-landscape = วิวภูเขาที่มีหมอกสีฟ้า
newtab-wallpaper-light-beach = ชายหาดที่มีต้นปาล์ม
newtab-wallpaper-dark-aurora = แสงเหนือ
newtab-wallpaper-dark-color = รูปทรงที่มีสีแดงและสีน้ำเงิน
newtab-wallpaper-dark-panda = แพนด้าแดงที่ซ่อนตัวอยู่ในป่า
newtab-wallpaper-dark-sky = วิวเมืองใต้ท้องฟ้ายามค่ำคืน
newtab-wallpaper-dark-mountain = วิวภูเขา
newtab-wallpaper-dark-city = วิวเมืองสีม่วง
newtab-wallpaper-dark-fox-anniversary = สุนัขจิ้งจอกอยู่บนทางเท้าใกล้ป่าแห่งหนึ่ง
newtab-wallpaper-light-fox-anniversary = สุนัขจิ้งจอกอยู่ในทุ่งหญ้าที่มีทิวทัศน์ภูเขาซึ่งเต็มไปด้วยหมอก

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = สีทึบ
newtab-wallpaper-colors = สี
newtab-wallpaper-blue = น้ำเงิน
newtab-wallpaper-light-blue = น้ำเงินอ่อน
newtab-wallpaper-light-purple = ม่วงอ่อน
newtab-wallpaper-light-green = เขียวอ่อน
newtab-wallpaper-green = เขียว
newtab-wallpaper-beige = เบจ
newtab-wallpaper-yellow = เหลือง
newtab-wallpaper-orange = ส้ม
newtab-wallpaper-pink = ชมพู
newtab-wallpaper-light-pink = ชมพูอ่อน
newtab-wallpaper-red = แดง
newtab-wallpaper-dark-blue = น้ำเงินเข้ม
newtab-wallpaper-dark-purple = ม่วงเข้ม
newtab-wallpaper-dark-green = เขียวเข้ม
newtab-wallpaper-brown = น้ำตาล

## Abstract

newtab-wallpaper-category-title-abstract = นามธรรม
newtab-wallpaper-abstract-green = รูปร่างสีเขียว
newtab-wallpaper-abstract-blue = รูปร่างสีน้ำเงิน
newtab-wallpaper-abstract-purple = รูปร่างสีม่วง
newtab-wallpaper-abstract-orange = รูปร่างสีส้ม
newtab-wallpaper-gradient-orange = ไล่ระดับสีส้มและชมพู
newtab-wallpaper-abstract-blue-purple = รูปร่างสีน้ำเงินและสีม่วง
newtab-wallpaper-abstract-white-curves = สีขาวพร้อมเส้นโค้งแรเงา
newtab-wallpaper-abstract-purple-green = เกรเดียนท์สีอ่อนสีม่วงและสีเขียว
newtab-wallpaper-abstract-blue-purple-waves = รูปทรงคลื่นสีน้ำเงินและสีม่วง
newtab-wallpaper-abstract-black-waves = รูปทรงคลื่นสีดำ

## Firefox

newtab-wallpaper-category-title-photographs = ภาพถ่าย
newtab-wallpaper-beach-at-sunrise = ชายหาดตอนพระอาทิตย์ขึ้น
newtab-wallpaper-beach-at-sunset = ชายหาดตอนพระอาทิตย์ตก
newtab-wallpaper-storm-sky = ท้องฟ้ามีพายุ
newtab-wallpaper-sky-with-pink-clouds = ท้องฟ้ามีเมฆสีชมพู
newtab-wallpaper-red-panda-yawns-in-a-tree = แพนด้าแดงหาวอยู่บนต้นไม้
newtab-wallpaper-white-mountains = ภูเขาสีขาว
newtab-wallpaper-hot-air-balloons = บอลลูนลมร้อนหลากสีสันในช่วงกลางวัน
newtab-wallpaper-starry-canyon = คืนที่เต็มไปด้วยดวงดาวสีฟ้า
newtab-wallpaper-suspension-bridge = ภาพถ่ายสะพานแขวนสีเทาในช่วงกลางวัน
newtab-wallpaper-sand-dunes = เนินทรายสีขาว
newtab-wallpaper-palm-trees = ภาพเงาของต้นมะพร้าวในช่วงชั่วโมงทองคำ
newtab-wallpaper-blue-flowers = ภาพถ่ายระยะใกล้ของดอกไม้กลีบสีน้ำเงินที่กำลังบาน
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = ภาพถ่ายโดย <a data-l10n-name="name-link">{ $author_string }</a> จาก <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = ลองเลือกสีสันที่คุณชอบ
newtab-wallpaper-feature-highlight-content = เปลี่ยนโฉมแท็บใหม่ของคุณด้วยภาพพื้นหลัง
newtab-wallpaper-feature-highlight-button = เข้าใจแล้ว
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = ปิด
    .aria-label = ปิดป็อปอัป
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = ท้องฟ้า
newtab-wallpaper-celestial-lunar-eclipse = จันทรุปราคา
newtab-wallpaper-celestial-earth-night = ภาพถ่ายตอนกลางคืนจากวงโคจรต่ำของโลก
newtab-wallpaper-celestial-starry-sky = ท้องฟ้าที่เต็มไปด้วยดวงดาว
newtab-wallpaper-celestial-eclipse-time-lapse = ภาพไทม์แลปส์ปรากฏการณ์จันทรุปราคา
newtab-wallpaper-celestial-black-hole = ภาพประกอบกาแล็กซี่หลุมดำ
newtab-wallpaper-celestial-river = ภาพถ่ายดาวเทียมของแม่น้ำ

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = ดูพยากรณ์ใน { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = สนับสนุนโดย { $provider }
newtab-weather-menu-change-location = เปลี่ยนตำแหน่งที่ตั้ง
newtab-weather-change-location-search-input-placeholder =
    .placeholder = ค้นหาตำแหน่งที่ตั้ง
    .aria-label = ค้นหาตำแหน่งที่ตั้ง
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = ใช้ตำแหน่งที่ตั้งปัจจุบัน
newtab-weather-menu-weather-display = การแสดงผลพยากรณ์อากาศ
newtab-weather-todays-forecast = พยากรณ์วันนี้
newtab-weather-see-full-forecast = ดูพยากรณ์ฉบับเต็ม
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = ธรรมดา
newtab-weather-menu-change-weather-display-simple = สลับเป็นมุมมองธรรมดา
newtab-weather-menu-weather-display-option-detailed = ละเอียด
newtab-weather-menu-change-weather-display-detailed = สลับเป็นมุมมองละเอียด
newtab-weather-menu-temperature-units = หน่วยอุณหภูมิ
newtab-weather-menu-temperature-option-fahrenheit = ฟาเรนไฮต์
newtab-weather-menu-temperature-option-celsius = เซลเซียส
newtab-weather-menu-change-temperature-units-fahrenheit = เปลี่ยนเป็นฟาเรนไฮต์
newtab-weather-menu-change-temperature-units-celsius = เปลี่ยนเป็นเซลเซียส
newtab-weather-menu-hide-weather = ซ่อนพยากรณ์อากาศในแท็บใหม่
newtab-weather-menu-learn-more = เรียนรู้เพิ่มเติม
newtab-weather-menu-detect-my-location = ตรวจจับตำแหน่งที่ตั้งของฉัน
# This message is shown if user is working offline
newtab-weather-error-not-available = ไม่มีข้อมูลพยากรณ์อากาศในขณะนี้
newtab-weather-opt-in-see-weather = คุณต้องการดูสภาพอากาศสำหรับตำแหน่งที่ตั้งของคุณหรือไม่?
newtab-weather-opt-in-not-now =
    .label = ยังไม่ทำตอนนี้
newtab-weather-opt-in-yes =
    .label = ใช่
newtab-weather-opt-in-headline = ตรวจสอบพยากรณ์อากาศในพื้นที่ของคุณ
newtab-weather-opt-in-use-location =
    .label = ใช้ตำแหน่งที่ตั้ง
newtab-weather-opt-in-choose-location = เลือกตำแหน่งที่ตั้ง
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = นครนิวยอร์ก
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = สูง
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = ต่ำ
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = ดูพยากรณ์ใน { $provider }
    .aria-description = สนับสนุนโดย { $provider }

## Topic Labels

newtab-topic-label-business = ธุรกิจ
newtab-topic-label-career = อาชีพ
newtab-topic-label-education = การศึกษา
newtab-topic-label-arts = ความบันเทิง
newtab-topic-label-food = อาหาร
newtab-topic-label-health = สุขภาพ
newtab-topic-label-hobbies = เกมมิ่ง
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = เงิน
newtab-topic-label-society-parenting = การเลี้ยงลูก
newtab-topic-label-government = การเมือง
newtab-topic-label-education-science = วิทยาศาสตร์
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = เคล็ดลับการใช้ชีวิต
newtab-topic-label-sports = กีฬา
newtab-topic-label-tech = เทคโนโลยี
newtab-topic-label-travel = การท่องเที่ยว
newtab-topic-label-home = บ้านและสวน

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = เลือกหัวข้อเพื่อปรับแต่งฟีดของคุณ
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = เลือกหัวข้อสองหัวข้อขึ้นไป ผู้เชี่ยวชาญของเราจะจัดลำดับความสำคัญของเรื่องราวที่ปรับให้เหมาะกับความสนใจของคุณ ซึ่งสามารถอัปเดตได้ตลอดเวลา
newtab-topic-selection-save-button = บันทึก
newtab-topic-selection-cancel-button = ยกเลิก
newtab-topic-selection-button-maybe-later = ไว้ภายหลัง
newtab-topic-selection-privacy-link = เรียนรู้ว่าเราปกป้องและจัดการข้อมูลอย่างไร
newtab-topic-selection-button-update-interests = ปรับเปลี่ยนความสนใจของคุณ
newtab-topic-selection-button-pick-interests = เลือกความสนใจของคุณ

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = ติดตาม
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = ติดตาม { $topic }
newtab-section-following-button = ติดตามอยู่
newtab-section-unfollow-button = เลิกติดตาม
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = กำลังติดตาม: เลิกติดตาม { $topic }
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = ปรับแต่งฟีดของคุณ
newtab-section-follow-highlight-subtitle = ติดตามในสิ่งที่คุณสนใจ เพื่อดูสิ่งที่คุณชอบได้มากขึ้น

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = ปิดกั้น
newtab-section-blocked-button = ปิดกั้นแล้ว
newtab-section-unblock-button = เลิกปิดกั้น
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = ติดตาม { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = เลิกติดตาม { $topic }
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = ปิดกั้น { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = เลิกปิดกั้น { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = ยังไม่ทำตอนนี้
newtab-section-confirm-block-topic-p1 = คุณแน่ใจหรือไม่ว่าต้องการปิดกั้นหัวข้อนี้?
newtab-section-confirm-block-topic-p2 = หัวข้อที่ถูกปิดกั้นจะไม่ปรากฏในฟีดของคุณอีกต่อไป
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = ปิดกั้น { $topic }
newtab-section-block-cancel-button = ยกเลิก

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = หัวข้อ
newtab-section-manage-topics-button-v2 =
    .label = จัดการหัวข้อ
newtab-section-mangage-topics-followed-topics = ติดตามอยู่
newtab-section-mangage-topics-followed-topics-empty-state = คุณยังไม่ได้ติดตามหัวข้อใดๆ
newtab-section-mangage-topics-blocked-topics = ปิดกั้นอยู่
newtab-section-mangage-topics-blocked-topics-empty-state = คุณยังไม่ได้ปิดกั้นหัวข้อใดๆ
newtab-custom-wallpaper-title = รูปพื้นหลังกำหนดเองอยู่ตรงนี้
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = อัปโหลดรูปพื้นหลังของคุณเองหรือเลือกสีกำหนดเองเพื่อปรับแต่ง { -brand-product-name } ในแบบของคุณ
newtab-custom-wallpaper-cta = ลองเลย

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = เลือกวอลล์เปเปอร์เพื่อทำให้ { -brand-product-name } เป็นสไตล์ของคุณ
newtab-new-user-custom-wallpaper-subtitle = ตกแต่งแท็บใหม่ให้เป็นแบบของคุณด้วยวอลล์เปเปอร์และสีสันที่เลือกเอง
newtab-new-user-custom-wallpaper-cta = ลองเลย

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = รูปพื้นหลังใหม่ล่าสุดเพิ่งมาถึง
newtab-wallpaper-feature-highlight-subtitle = เลือกอันที่คุณชอบและทำให้ทุก ๆ แท็บใหม่เป็นตัวคุณ
newtab-wallpaper-feature-highlight-cta = เลือกรูปพื้นหลัง

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = ดาวน์โหลด { -brand-product-name } สำหรับมือถือ
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = สแกนโค้ดเพื่อท่องเว็บอย่างปลอดภัยขณะเดินทาง
newtab-download-mobile-highlight-body-variant-b = ท่องเว็บต่อจากที่ค้างไว้ได้เมื่อคุณซิงค์แท็บ รหัสผ่าน และอื่นๆ ของคุณ
newtab-download-mobile-highlight-body-variant-c = คุณรู้ไหมว่าคุณสามารถใช้ { -brand-product-name } ขณะเดินทางได้? นำเบราว์เซอร์ตัวเดียวกันนี้มาไว้ในกระเป๋าของคุณ
newtab-download-mobile-highlight-image =
    .aria-label = คิวอาร์โค้ดสำหรับดาวน์โหลด { -brand-product-name } สำหรับมือถือ

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = รายการโปรดของคุณอยู่แค่ปลายนิ้ว
newtab-shortcuts-highlight-subtitle = เพิ่มทางลัดเพื่อให้เข้าถึงไซต์โปรดของคุณได้ในคลิกเดียว

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = ทำไมคุณถึงรายงานสิ่งนี้?
newtab-report-ads-reason-not-interested =
    .label = ฉันไม่สนใจ
newtab-report-ads-reason-inappropriate =
    .label = มันไม่เหมาะสม
newtab-report-ads-reason-seen-it-too-many-times =
    .label = ฉันเห็นมันมาหลายครั้งเกินไปแล้ว
newtab-report-content-wrong-category =
    .label = หมวดหมู่ผิด
newtab-report-content-outdated =
    .label = ล้าสมัย
newtab-report-content-inappropriate-offensive =
    .label = ไม่เหมาะสมหรือก้าวร้าว
newtab-report-content-spam-misleading =
    .label = สแปมหรือทำให้เข้าใจผิด
newtab-report-content-requires-payment-subscription =
    .label = ต้องชำระเงินหรือสมัครสมาชิก
newtab-report-content-requires-payment-subscription-learn-more = เรียนรู้เพิ่มเติม
newtab-report-cancel = ยกเลิก
newtab-report-submit = ส่ง
newtab-toast-thanks-for-reporting =
    .message = ขอบคุณที่รายงานสิ่งนี้
newtab-toast-widgets-hidden =
    .message = เลือกไอคอนรูปดินสอเพื่อเพิ่มวิดเจ็ตกลับเข้าไปได้ตลอดเวลา
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = คุณกำลังติดตาม { $topic }
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = คุณไม่ได้กำลังติดตาม { $topic } อีกต่อไป
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = คุณจะไม่เห็นเรื่องราวเกี่ยวกับ { $topic } อีกต่อไป

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = ความเป็นไปได้ไม่มีที่สิ้นสุด เพิ่มมาสักหนึ่งอย่างเลย
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = ใหม่
newtab-widget-lists-label-beta =
    .label = เบต้า
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = เสร็จสมบูรณ์ ({ $number })
newtab-widget-lists-celebration-headline = ทำดีมาก
newtab-widget-lists-celebration-subhead = เสร็จเรียบร้อย
newtab-widget-task-list-menu-copy = คัดลอก
newtab-widget-lists-menu-edit = แก้ไขชื่อรายการ
newtab-widget-lists-menu-edit2 =
    .aria-label = แก้ไขชื่อรายการ
newtab-widget-lists-menu-create = สร้างรายการใหม่
newtab-widget-lists-menu-delete = ลบรายการนี้
newtab-widget-lists-menu-copy = คัดลอกรายการไปยังคลิปบอร์ด
newtab-widget-lists-menu-learn-more = เรียนรู้เพิ่มเติม
newtab-widget-lists-button-add-item = เพิ่มงาน
newtab-widget-lists-input-add-an-item2 =
    .placeholder = เพิ่มงาน
    .aria-label = เพิ่มงาน
newtab-widget-lists-input-error = โปรดระบุข้อความเพื่อเพิ่มงาน
newtab-widget-lists-input-menu-open-link = เปิดลิงก์
newtab-widget-lists-input-menu-move-up = เลื่อนขึ้น
newtab-widget-lists-input-menu-move-down = เลื่อนลง
newtab-widget-lists-input-menu-delete = ลบ
newtab-widget-lists-input-menu-edit = แก้ไข
newtab-widget-lists-input-menu-edit2 =
    .aria-label = แก้ไขรายการ
newtab-widget-lists-edit-clear =
    .aria-label = ยกเลิก
    .title = ยกเลิก
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + สร้างรายการใหม่
newtab-widget-lists-name-label-default =
    .label = รายการงาน
newtab-widget-lists-name-label-checklist =
    .label = รายการตรวจสอบ
newtab-widget-lists-name-placeholder-default =
    .placeholder = รายการงาน
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = รายการตรวจสอบ
    .aria-label = แก้ไขชื่อรายการ
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = รายการใหม่
    .aria-label = แก้ไขชื่อรายการ
newtab-widget-section-title = วิดเจ็ต
newtab-widget-menu-hide = ซ่อนวิดเจ็ต
newtab-widget-menu-change-size = เปลี่ยนขนาด
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = ย้าย
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = ซ้าย
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = ขวา
newtab-widget-size-small = เล็ก
newtab-widget-size-medium = ปานกลาง
newtab-widget-size-large = ใหญ่
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = ซ่อนวิดเจ็ต
    .aria-label = ซ่อนวิดเจ็ตทั้งหมด
newtab-widget-section-maximize =
    .title = ขยายวิดเจ็ต
    .aria-label = ขยายวิดเจ็ตทั้งหมดให้เต็มขนาด
newtab-widget-section-minimize =
    .title = ย่อขนาดวิดเจ็ด
    .aria-label = ยุบวิดเจ็ตทั้งหมดให้เป็นขนาดกะทัดรัด
newtab-widget-section-menu-button =
    .title = เมนูวิดเจ็ต
    .aria-label = เปิดเมนูวิดเจ็ต
newtab-widget-add-widgets-button =
    .aria-label = เพิ่มวิดเจ็ต
    .title = เพิ่มวิดเจ็ต
newtab-widget-section-menu-manage = จัดการวิดเจ็ต
newtab-widget-section-menu-hide-all = ซ่อนวิดเจ็ต
newtab-widget-section-menu-learn-more = เรียนรู้เพิ่มเติม
newtab-widget-section-feedback = บอกเราว่าคุณคิดอย่างไร
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = แสดงวิดเจ็ตเพิ่มขึ้น
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = แสดงวิดเจ็ตน้อยลง
newtab-widget-lists-name-default = รายการตรวจสอบ

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = ตัวจับเวลา
newtab-widget-timer-notification-focus = หมดเวลาโฟกัสแล้ว ทำได้เยี่ยมเลย อยากพักสักหน่อยไหม?
newtab-widget-timer-notification-break = หมดเวลาพักแล้ว พร้อมที่จะโฟกัสหรือยัง?
newtab-widget-timer-notification-warning = การแจ้งเตือนปิดอยู่
newtab-widget-timer-mode-focus =
    .label = โฟกัส
newtab-widget-timer-mode-break =
    .label = พัก
newtab-widget-timer-label-play =
    .label = เล่น
newtab-widget-timer-label-pause =
    .label = หยุดชั่วคราว
newtab-widget-timer-reset =
    .title = ล้างค่า
newtab-widget-timer-menu-notifications = ปิดการแจ้งเตือน
newtab-widget-timer-menu-notifications-on = เปิดการแจ้งเตือน
newtab-widget-timer-menu-learn-more = เรียนรู้เพิ่มเติม
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = ข่าวเด่น
newtab-daily-briefing-card-menu-dismiss = ยกเลิก
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = อัปเดตเมื่อ { $minutes } นาทีที่แล้ว
newtab-widget-message-title = มีสมาธิด้วยรายการสิ่งที่ต้องทำและตัวจับเวลาในตัว
# to-dos stands for "things to do".
newtab-widget-message-copy = ตั้งแต่เตือนความจำด่วน ๆ ไปจนถึงสิ่งที่ต้องทำในแต่ละวัน ช่วงเวลาโฟกัสไปจนถึงช่วงเวลาพัก ให้คุณอยู่กับงานและตรงเวลาเสมอ
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = จุดเดียวสำหรับการโฟกัส การพยากรณ์ และอื่น ๆ
newtab-widget-message-focus-forecasts-body = ทำให้วันของคุณราบรื่นด้วยวิดเจ็ตใน { -brand-product-name } ตรวจสอบพยากรณ์อากาศ จดจ่ออยู่กับงาน หรือติดตามเวลาทั่วโลก
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = แต่ง { -brand-product-name } ในแบบคุณ
newtab-promo-card-body-addons = เลือกรูปพื้นหลังจากชุดสะสมของเรา หรือสร้างขึ้นมาเอง
newtab-promo-card-cta-addons = ลองเลย
newtab-promo-card-title = ร่วมสนับสนุน { -brand-product-name }
newtab-promo-card-body = ผู้สนับสนุนของเราสนับสนุนภารกิจที่จะสร้างเว็บที่ดีขึ้น
newtab-promo-card-cta = เรียนรู้เพิ่มเติม
newtab-promo-card-dismiss-button =
    .title = ปิด
    .aria-label = ปิด

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label = เริ่มจับเวลา { $minutes } นาที
newtab-widget-timer-pause-aria =
    .aria-label = หยุดตัวจับเวลาชั่วคราว
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label = { $minutes } นาที
newtab-widget-timer-decrease-min =
    .title = ลด 1 นาที
newtab-widget-timer-increase-min =
    .title = เพิ่ม 1 นาที
newtab-widget-timer-mode-group =
    .aria-label = โหมดจับเวลา
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = โฟกัส
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = พัก
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = ซ่อนตัวจับเวลา
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = เยี่ยมมาก
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = หมดเวลาพักแล้ว
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = พักสักหน่อยไหม?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = พร้อมที่จะโฟกัสหรือยัง?

##

newtab-sports-widget-menu-follow-teams = ติดตามทีม
newtab-sports-widget-menu-view-schedule = ดูตารางการแข่ง
newtab-sports-widget-menu-view-upcoming = ดูสิ่งที่กำลังจะมาถึง
newtab-sports-widget-menu-view-results = ดูผลการแข่ง
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = วันสำคัญ
newtab-sports-widget-menu-learn-more = เรียนรู้เพิ่มเติม
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = ติดตามข่าวสารฟุตบอลโลก
newtab-sports-widget-get-updates = เกาะติดผลบอลสดและอีกมากมาย
newtab-sports-widget-view-schedule =
    .label = ดูตารางการแข่ง
newtab-sports-widget-follow-teams =
    .label = ติดตามทีม
newtab-sports-widget-view-matches =
    .label = ดูการแข่งขัน
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title = ติดตามได้สูงสุด { $number } ทีม
newtab-sports-widget-choose-wallpaper =
    .label = เลือกรูปพื้นหลัง
newtab-sports-widget-skip = ข้าม
newtab-sports-widget-search-country =
    .placeholder = ค้นหาประเทศ
    .aria-label = ค้นหาประเทศ
newtab-sports-widget-cancel = ยกเลิก
newtab-sports-widget-back-button =
    .aria-label = ย้อนกลับ
newtab-sports-widget-done-button =
    .label = เสร็จสิ้น
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (ถูกคัดออก)
newtab-sports-widget-view-all =
    .label = ดูทั้งหมด
newtab-sports-widget-show-less =
    .label = แสดงน้อยลง
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = เฉพาะทีมที่ติดตาม
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = ดู
    .title = ดูสด
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = ดูสด
    .title = ดูสด
newtab-sports-widget-watch-dialog-close =
    .aria-label = ปิด
    .title = ปิด
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = ฟรี
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = ทดลองใช้ฟรี
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = ฟรีและเสียค่าใช้จ่าย
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = เสียค่าใช้จ่าย
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = เฉพาะบางเกมเท่านั้น
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = มีให้บริการในภูมิภาคของคุณ
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = ภูมิภาคอื่น ๆ
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = เปิดสตรีม
    .title = เปิดสตรีม
newtab-sports-widget-group-stage = รอบแบ่งกลุ่ม
newtab-sports-widget-group-a = กลุ่ม A
newtab-sports-widget-group-b = กลุ่ม B
newtab-sports-widget-group-c = กลุ่ม C
newtab-sports-widget-group-d = กลุ่ม D
newtab-sports-widget-group-e = กลุ่ม E
newtab-sports-widget-group-f = กลุ่ม F
newtab-sports-widget-group-g = กลุ่ม G
newtab-sports-widget-group-h = กลุ่ม H
newtab-sports-widget-group-i = กลุ่ม I
newtab-sports-widget-group-j = กลุ่ม J
newtab-sports-widget-group-k = กลุ่ม K
newtab-sports-widget-group-l = กลุ่ม L
newtab-sports-widget-round-32 = รอบ 32 ทีม
newtab-sports-widget-round-16 = รอบ 16 ทีม
newtab-sports-widget-quarter-finals = รอบก่อนรองชนะเลิศ
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = สด
newtab-custom-widget-live-refresh =
    .title = เรียกคะแนนใหม่
    .aria-label = เรียกคะแนนใหม่
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = วันสำคัญ
newtab-sports-widget-upcoming = กำลังจะมาถึง
# Used for a match currently ongoing
newtab-sports-widget-now = ตอนนี้
newtab-sports-widget-results = ผลลัพธ์
newtab-sports-widget-semi-finals = รอบรองชนะเลิศ
newtab-sports-widget-bronze-finals = รอบชิงเหรียญทองแดง
# Final is the final match for 1st place.
newtab-sports-widget-final = รอบชิงชนะเลิศ
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = ล่าช้า
newtab-sports-widget-postponed = เลื่อนออกไป
newtab-sports-widget-suspended = ถูกระงับ
newtab-sports-widget-cancelled = ถูกยกเลิก
newtab-sports-widget-information = ข้อมูลเกี่ยวกับการแข่ง
newtab-sports-widget-no-live-data = ข้อมูลการแข่งขันสดไม่ได้รับการอัปเดตในขณะนี้
newtab-sports-widget-view-results-link = ดูผลการแข่ง
newtab-sports-widget-third-place = อันดับสาม
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = รองชนะเลิศ
newtab-sports-widget-champions = ผู้ชนะเลิศ
newtab-sports-widget-world-cup-champions = แชมป์ฟุตบอลโลก 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = หมดเวลา
newtab-sports-widget-match-halftime = ช่วงพักครึ่ง
newtab-sports-widget-match-extra-time = ช่วงต่อเวลา
newtab-sports-widget-match-penalties = ช่วงยิงจุดโทษ
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = พบกับ
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = ไม่พลาดรายละเอียดการแข่งขันที่จะเกิดขึ้น

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = ก่อนหน้า
    .title = ก่อนหน้า
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = ถัดไป
    .title = ถัดไป
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = การแข่งขันสด { $index } จากทั้งหมด { $total }
    .title = การแข่งขันสด { $index } จากทั้งหมด { $total }

## Accessible labels for match rows in the sports widget. These are read by
## screen readers to announce the match details and status.
## Variables shared by all messages in this group:
##   $homeTeam (String) - The full name of the home team (e.g. "Mexico")
##   $awayTeam (String) - The full name of the away team (e.g. "Russia")

# A finished match row (regular full-time result).
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
newtab-sports-widget-match-aria-label-results =
    .aria-label = { $homeTeam }, { $homeScore } พบกับ { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) พบกับ { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = สด: { $homeTeam }, { $homeScore } พบกับ { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } พบกับ { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } พบกับ { $awayTeam }, ล่าช้า
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } พบกับ { $awayTeam }, เลื่อนออกไป
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } พบกับ { $awayTeam }, พักการแข่งขัน
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } พบกับ { $awayTeam }, ถูกยกเลิก

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = บอสเนียและเฮอร์เซโกวีนา
newtab-sports-widget-team-name-label-civ =
    .label = ไอวอรีโคสต์
newtab-sports-widget-team-name-label-cod =
    .label = สาธารณรัฐประชาธิปไตยคองโก
newtab-sports-widget-team-name-label-eng =
    .label = อังกฤษ
newtab-sports-widget-team-name-label-sco =
    .label = สกอตแลนด์
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = ยังไม่ได้กำหนด

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = เริ่มฉลองฟุตบอลโลกด้วยรูปพื้นหลังใหม่
newtab-sports-widget-message-wallpapers-body = เติมพลังความคึกคักในวันแข่งขันให้กับเบราว์เซอร์ของคุณสำหรับทัวร์นาเมนต์นี้
newtab-sports-widget-message-wallpapers-cta = เลือกรูปพื้นหลัง
newtab-sports-widget-message-add-widgets-cta =
    .label = เพิ่มวิดเจ็ต
newtab-sports-widget-message-day-in-play-title = เติมความสนุกสนานให้วันของคุณด้วยวิดเจ็ต { -brand-product-name }
newtab-sports-widget-message-day-in-play-body = ติดตามการแข่งขันฟุตบอลโลก จดจ่ออยู่กับงาน ติดตามเวลาทั่วโลก และอื่น ๆ อีกมากมาย
newtab-sports-widget-message-explore-widgets-cta =
    .label = สำรวจวิดเจ็ต

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = ปิด
    .aria-label = ปิด
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = ตกแต่งพื้นที่นี้ให้เป็นของคุณเอง
newtab-activation-window-message-customization-focus-message = เลือกภาพพื้นหลังใหม่ๆ เพิ่มทางลัดไปยังไซต์โปรดของคุณ และติดตามข่าวสารที่น่าสนใจอยู่เสมอ
newtab-activation-window-message-customization-focus-primary-button =
    .label = เริ่มปรับแต่ง
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = พื้นที่แห่งนี้เล่นตามกฎของคุณ
newtab-activation-window-message-values-focus-message = { -brand-product-name } ช่วยให้คุณเลือกดูสินค้าได้ตามใจชอบ พร้อมวิธีเริ่มต้นวันใหม่บนโลกออนไลน์ในแบบที่เป็นส่วนตัวยิ่งขึ้น ปรับแต่ง { -brand-product-name } ให้เป็นของคุณเอง

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = ซ่อนนาฬิกา
newtab-clock-widget-menu-learn-more = เรียนรู้เพิ่มเติม
newtab-clock-widget-menu-edit = แก้ไขนาฬิกา
newtab-clock-widget-menu-switch-to-12h = สลับเป็นรูปแบบ 12 ชั่วโมง
newtab-clock-widget-menu-switch-to-24h = สลับเป็นรูปแบบ 24 ชั่วโมง
newtab-clock-widget-label-your-clocks = นาฬิกาของคุณ
newtab-clock-widget-search-location-input =
    .label = ตำแหน่งที่ตั้ง
    .placeholder = ค้นหาเมือง
    .aria-label = ค้นหาเมือง
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = ชื่อเล่น (ไม่บังคับ)
    .placeholder = เพิ่มชื่อเล่น
    .aria-label = ชื่อเล่น (ไม่บังคับ)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = เพิ่มนาฬิกาใหม่
    .aria-label = เพิ่มนาฬิกาใหม่
newtab-clock-widget-button-add-clock = เพิ่ม
newtab-clock-widget-button-cancel = ยกเลิก
newtab-clock-widget-button-back =
    .title = ย้อนกลับ
    .aria-label = ย้อนกลับ
newtab-clock-widget-button-edit-clock =
    .title = แก้ไขนาฬิกา
    .aria-label = แก้ไขนาฬิกา
newtab-clock-widget-button-save = บันทึก
newtab-clock-widget-button-remove-clock =
    .title = เอานาฬิกาออก
    .aria-label = เอานาฬิกาออก
# Accessible name for a clock row in the "Your clocks" management panel
# when the row has no user-provided nickname. Read aloud by screen
# readers when focus lands on the row.
# Variables:
#   $city (string) - The city name displayed in the row.
newtab-clock-widget-edit-item =
    .aria-label = { $city }
# Accessible name for a clock row when a user nickname has been set.
# Variables:
#   $city (string) - The city name displayed in the row.
#   $nickname (string) - The user-provided nickname for the row.
newtab-clock-widget-edit-item-with-nickname =
    .aria-label = { $city }, ชื่อเล่น: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = เพิ่มนาฬิกา
newtab-clock-widget-edit-clock-form =
    .aria-label = แก้ไขนาฬิกา
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = ผลการค้นหา
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = ไม่มีที่ตรงกัน
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = เปิดเมนูสำหรับนาฬิกา
    .aria-label = เปิดเมนูสำหรับนาฬิกา
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = ชื่อเล่น: { $nickname }
