# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = بلگه نۊ
newtab-customize-panel-icon-button-label = سفارشی کردن
newtab-settings-dialog-label =
    .aria-label = سامووا
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }

## Search box component.

# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = پیتینیڌن وا { $engine } یا ی نشۊوی بزنین
newtab-search-box-handoff-text-no-engine = پیتینیڌن یا زیڌن نشۊوی
newtab-search-box-text = پیتینیڌن من وب

## Top Sites - General form dialog.

newtab-topsites-add-search-engine-header = ٱووردن موتور پیتینیڌن
newtab-topsites-add-shortcut-header = ره نهنگ نۊ
newtab-topsites-edit-shortcut-header = آلشت ره نهنگ
newtab-topsites-add-shortcut-label = ٱووردن ره نهنگ
newtab-topsites-add-shortcut-title =
    .title = ٱووردن ره نهنگ
    .aria-label = ٱووردن ره نهنگ
newtab-topsites-title-label = عونوان
newtab-topsites-url-label = نشۊوی اینترنتی

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = لقو
newtab-topsites-delete-history-button = پاک کردن ز ویرگار
newtab-topsites-save-button = زفت
newtab-topsites-add-button = ٱووردن

## Top Sites - Delete history confirmation dialog.

# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = ای کار وورگندنی نؽ.

## Top Sites - Sponsored label

newtab-topsite-sponsored = هؽزگری وابیڌه

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (دیسنیڌه وابی)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = گۊشیڌن نومگه
    .aria-label = گۊشیڌن نومگه
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = پاک کردن
    .aria-label = پاک کردن
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = آلشت ای وبگه
    .aria-label = آلشت ای وبگه

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = آلشت
newtab-menu-open-new-window = گۊشیڌن من ی نیمدری نۊ
newtab-menu-open-new-private-window = گۊشیڌن من ی نیمدری سیخومی نۊ
newtab-menu-dismiss = رڌ کردن
newtab-menu-pin = دیسنیڌن
newtab-menu-unpin = وورداشتن دیسنیڌن
newtab-menu-delete-history = پاک کردن ز ویرگار
newtab-menu-save-to-pocket = زفت کردن من { -pocket-brand-name }
newtab-menu-delete-pocket = پاک کردن ز { -pocket-brand-name }
newtab-menu-archive-pocket = آرشیو من { -pocket-brand-name }
newtab-menu-show-privacy-info = هؽزگرووݩ ایما وو هریم سیخومی ایسا
newtab-menu-about-fakespot = زبار { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = گوزارش
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = مسدۊد کردن

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = ٱنجوم وابی
newtab-privacy-modal-button-manage = دؽوۉداری سامووا موئتوا هؽزگر

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = پاک کردن نشووک
# Bookmark is a verb here.
newtab-menu-bookmark = نشووک

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = لف گیری لینگ دانلود
newtab-menu-go-to-download-page = رئڌن و بلگه دانلود
newtab-menu-remove-download = پاک کردن ز ویرگار

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-open-file = گۊشیڌن فایل

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = نیشته وابیڌه
newtab-label-bookmarked = نشووک ناهاڌه وابیڌه
newtab-label-removed-bookmark = نشووک پاک وابی
newtab-label-saved = من { -pocket-brand-name } زفت وابیڌه
newtab-label-download = دانلود وابیڌه
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = هؽزگری وابیڌه

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = پاک کردن بشن
newtab-section-menu-collapse-section = جم کردن بشن
newtab-section-menu-expand-section = واز کردن بشن
newtab-section-menu-manage-section = دؽوۉداری بشن
newtab-section-menu-manage-webext = دؽوۉداری وردنی
newtab-section-menu-add-search-engine = ٱووردن موتور پیتینیڌن
newtab-section-menu-privacy-notice = نوکات زفت مهرموویی

## Section Headers.

newtab-section-header-stories = داستانا فرگ کردنی

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-try-again-button = قپ ریت دووارته

## Pocket Content Section.

newtab-pocket-learn-more = قلوه دووسته بۊین
newtab-pocket-save = زفت
newtab-pocket-saved = زفت وابی

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

newtab-toast-dismiss-button =
    .title = رڌ کردن
    .aria-label = رڌ کردن

## Customization Menu

newtab-custom-shortcuts-title = ره نهنگا
newtab-custom-sponsored-sites = ره نهنگا هؽزگرووݩ
newtab-custom-stories-personalized-toggle =
    .label = داستانا
newtab-custom-pocket-sponsored = وزعیتا هؽزگرووݩ
newtab-custom-widget-weather-toggle =
    .label = ٱو وو هوا
newtab-custom-widget-lists-toggle =
    .label = نومگه یل
newtab-custom-widget-timer-toggle =
    .label = زمووݩ سنج
newtab-custom-widget-section-title = ویجتا
newtab-custom-widget-section-toggle =
    .label = ویجتا
newtab-widget-manage-title = ویجتا
newtab-widget-manage-widget-button =
    .label = دؽوۉداری ویجتا
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = بستن
    .aria-label = بستن نومگه
newtab-custom-close-button = بستن
newtab-custom-settings = دؽوۉداری سامووا قلوه

## New Tab Wallpapers

newtab-wallpaper-title = کاقز دیواری یل
newtab-wallpaper-custom-color = ی رنگ پسند کۊنین

## Solid Colors

newtab-wallpaper-category-title-colors = رنگا سابت
newtab-wallpaper-blue = کوۊ
newtab-wallpaper-light-blue = کوۊ رۊشن
newtab-wallpaper-light-purple = بناوش رۊشن
newtab-wallpaper-light-green = ساوز رۊشن
newtab-wallpaper-green = ساوز
newtab-wallpaper-beige = بژ
newtab-wallpaper-pink = آل
newtab-wallpaper-light-pink = آل رۊشن
newtab-wallpaper-red = سوئر
newtab-wallpaper-dark-blue = کوۊ تاریک
newtab-wallpaper-dark-purple = بناوش تاریک
newtab-wallpaper-dark-green = ساوز تاریک

## Firefox

newtab-wallpaper-feature-highlight-header = رنگا شاڌ ن امتهووݩ کۊنین
newtab-wallpaper-feature-highlight-button = فئمیم
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = آسمۊوی
newtab-wallpaper-celestial-lunar-eclipse = مه گرؽڌیی
newtab-wallpaper-celestial-earth-night = شؽوات شاو ز مدار بلمی زمین
newtab-wallpaper-celestial-starry-sky = آسمووݩ پور آستاره

## New Tab Weather

# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = ساڌه
newtab-weather-menu-weather-display-option-detailed = جۊزعیات
newtab-weather-menu-change-weather-display-detailed = آلشت و هالت نیشتن جۊزعیات
newtab-weather-menu-temperature-units = واهدا دما
newtab-weather-menu-temperature-option-fahrenheit = فارنهایت
newtab-weather-menu-temperature-option-celsius = سانتیگراد
newtab-weather-menu-change-temperature-units-fahrenheit = آلشت و فارنهایت
newtab-weather-menu-change-temperature-units-celsius = آلشت و سانتیگراد
newtab-weather-menu-hide-weather = بؽڌار کردن ٱو وو هوا من بلگه نۊ
newtab-weather-menu-learn-more = قلوه دووسته بۊین
newtab-weather-menu-detect-my-location = تشخیس داڌن جاگه مو
# This message is shown if user is working offline
newtab-weather-error-not-available = دووسمندیا ٱو وو هوا سکو من دسرس نؽ
newtab-weather-opt-in-not-now =
    .label = سکو ن
newtab-weather-opt-in-yes =
    .label = هری
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = شئر نیویورک

## Topic Labels

newtab-topic-label-business = کسب ۉ کار
newtab-topic-label-career = شوغل
newtab-topic-label-education = وا نوم ناهاڌن
newtab-topic-label-arts = سرگرمی
newtab-topic-label-food = غزا
newtab-topic-label-health = سلامت
newtab-topic-label-hobbies = بازی
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = پیل
newtab-topic-label-government = سیاست
newtab-topic-label-education-science = علم
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = شگردا زندیی
newtab-topic-label-sports = ورزش
newtab-topic-label-tech = تکنۊلۊژی
newtab-topic-label-travel = سفر
newtab-topic-label-home = هووه وو باغ

## Topic Selection Modal

newtab-topic-selection-save-button = زفت
newtab-topic-selection-cancel-button = لقو
newtab-topic-selection-button-maybe-later = گاشڌ دینداتر
newtab-topic-selection-privacy-link = دووسته بۊین ک چتاور دووسمندیا ن زفت وو هونووݩ ن دؽوۉداری اکۊنیم
newtab-topic-selection-button-update-interests = علاقه یل خوتووݩ ن ورۊ رسۊوی کۊنین
newtab-topic-selection-button-pick-interests = پسند علاقه یل خوتووݩ

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = فید خوتووݩ ن دییق سامووݩ کۊنین

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = مسدۊد کردن
newtab-section-blocked-button = مسدۊد وابیڌه
newtab-section-unblock-button = ز مسدۊدی دراووردن

## Confirmation modal for blocking a section

newtab-section-cancel-button = سکو ن
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = مسدۊد کردن { $topic }

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = سرتالا
newtab-section-manage-topics-button-v2 =
    .label = دؽوۉداری سرتالا
newtab-section-mangage-topics-blocked-topics = مسدۊد وابیڌه
newtab-custom-wallpaper-cta = امتهووس کوݩ

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-cta = هیم سکو امتهووݩ کوݩ

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = دانلود { -brand-product-name } سی موبایل

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = مووردا دلخا ایسا من دسرس تووݩ هڌ

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = سیچه یونه گوزارش ادی؟
newtab-report-ads-reason-not-interested =
    .label = مو علاقه ای نڌاروم
newtab-report-ads-reason-inappropriate =
    .label = موناسو نؽ
newtab-report-ads-reason-seen-it-too-many-times =
    .label = مو هم ی کرت دو کرت نؽ ک دیمسه
newtab-report-content-wrong-category =
    .label = کتن بندی اشتوا
newtab-report-content-spam-misleading =
    .label = هرزنومه یا بلا کوننده
newtab-report-content-requires-payment-subscription =
    .label = وا پرداخت کۊنین یا اشتراک داشته بۊین
newtab-report-content-requires-payment-subscription-learn-more = قلوه دووسته بۊین
newtab-report-cancel = لقو
newtab-report-submit = فشناڌن
newtab-toast-thanks-for-reporting =
    .message = ممنووݩ ک یونه گوزارش داڌی.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = ائتمالات تمومی نڌارن. یکی ازاف کۊنین.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = نۊ
newtab-widget-lists-label-beta =
    .label = آزمایشی
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = تموم وابیڌه ({ $number })
newtab-widget-task-list-menu-copy = لف گیری
newtab-widget-lists-menu-edit = آلشت نومگه نوم
newtab-widget-lists-menu-create = وورکل ی نومگه نۊ
newtab-widget-lists-menu-delete = پاک کردن ای نومگه
newtab-widget-lists-menu-copy = لف گیری نومگه من کلیپ بورد
newtab-widget-lists-menu-hide = بؽڌار کردن پوی نومگه یل
newtab-widget-lists-menu-learn-more = قلوه دووسته بۊین
newtab-widget-lists-input-add-an-item =
    .placeholder = ٱووردن ی موورد
newtab-widget-lists-input-menu-open-link = گۊشیڌن لینگ
newtab-widget-lists-input-menu-move-up = جاگورو و روء
newtab-widget-lists-input-menu-move-down = جاگورو و لم
newtab-widget-lists-input-menu-delete = پاک کردن
newtab-widget-lists-input-menu-edit = آلشت
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + وورکل ی نومگه نۊ
newtab-widget-lists-name-label-default =
    .label = نومگه کارا
newtab-widget-lists-name-placeholder-default =
    .placeholder = نومگه کارا
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new =
    .placeholder = نومگه نۊ
newtab-widget-section-title = ویجتا
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = بؽڌار کردن ویجتا
    .aria-label = بؽڌار کردن پوی ویجتا

## Strings for timer productivity widget
## When the timer ends, a system notification may be shown. Depending on which mode the timer is in, that message would be shown

newtab-widget-timer-notification-title = زمووݩ سنج
newtab-widget-timer-notification-warning = وارسۊویا کۊر هڌن
newtab-widget-timer-mode-focus =
    .label = فوکۊس
newtab-widget-timer-mode-break =
    .label = اشکستن
newtab-widget-timer-label-play =
    .label = پشک
newtab-widget-timer-label-pause =
    .label = واڌاشتن
newtab-widget-timer-reset =
    .title = وورنشۊوی
newtab-widget-timer-menu-notifications = کۊر کردن وارسۊویا
newtab-widget-timer-menu-notifications-on = رۊشن کردن وارسۊویا
newtab-widget-timer-menu-hide = بؽڌار کردن زمووݩ سنج
newtab-widget-timer-menu-learn-more = قلوه دووسته بۊین
newtab-promo-card-title = لادرار { -brand-product-name }
newtab-promo-card-cta = قلوه دووسته بۊین
newtab-promo-card-dismiss-button =
    .title = رڌ کردن
    .aria-label = رڌ کردن
