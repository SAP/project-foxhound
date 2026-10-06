# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = بلگه نۊ
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = سفارشی کردن ای بلگه
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = سفارشی کردن
newtab-customize-panel-label =
    .label = سفارشی کردن
newtab-settings-dialog-label =
    .aria-label = سامووا
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = رڌ کردن
    .aria-label = رڌ کردن

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = بلگه هووه ای
home-homepage-new-windows =
    .label = نیمدری یل نۊ
home-homepage-new-tabs =
    .label = بلگه یل نۊ

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = نشۊوی (ا) وبگه
home-custom-homepage-address =
    .placeholder = زیذن نشۊوی
home-custom-homepage-address-button =
    .label = ٱووردن نشۊوی
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = جایونی کردن وا
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = بلگه یل گۊشیڌه وابیڌه هیم سکویی
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = نشووکا…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = پیتینیڌن
home-prefs-widgets-header =
    .label = ویجتا
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = نومگه یل
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = زمووݩ سنج
home-prefs-manage-topics-link2 =
    .label = دؽوۉداری سرتالا
home-prefs-choose-wallpaper-link2 =
    .label = پسند شؽوات زمینه
home-prefs-firefox-logo-header =
    .label = لوگو { -brand-short-name }
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } ردیف
           *[other] { $num } ردیف
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = وردنی ({ $extension })
home-restore-defaults-srd =
    .label = وورگندن پؽش فرزا
    .accesskey = R
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (پؽش فرز)
home-mode-choice-custom-srd =
    .label = نشۊویا سفارشی…
home-mode-choice-blank-srd =
    .label = بلگه پتی
home-prefs-shortcuts-header-srd =
    .label = ره نهنگا
home-prefs-shortcuts-select =
    .aria-label = ره نهنگا
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = ره نهنگا هؽزگرووݩ
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = وزعیتا هؽزگرووݩ
home-prefs-highlights-option-visited-pages-srd =
    .label = بلگه یل نیشته وابیڌه
home-prefs-highlights-options-bookmarks-srd =
    .label = نشووکا
home-prefs-recent-activity-header-srd =
    .label = فعالیتا دیندایی
home-prefs-recent-activity-select =
    .aria-label = فعالیتا دیندایی
home-prefs-weather-header-srd =
    .label = ٱو وو هوا
home-prefs-support-firefox-header-srd =
    .label = لادرار { -brand-product-name }

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = پیتینیڌن
    .aria-label = پیتینیڌن
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = پیتینیڌن وا { $engine } یا ی نشۊوی بزنین
newtab-search-box-handoff-text-no-engine = پیتینیڌن یا زیڌن نشۊوی
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = پیتینیڌن وا { $engine } یا ی نشۊوی بزنین
    .title = پیتینیڌن وا { $engine } یا ی نشۊوی بزنین
    .aria-label = پیتینیڌن وا { $engine } یا ی نشۊوی بزنین
newtab-search-box-handoff-input-no-engine =
    .placeholder = پیتینیڌن یا زیڌن نشۊوی
    .title = پیتینیڌن یا زیڌن نشۊوی
    .aria-label = پیتینیڌن یا زیڌن نشۊوی
newtab-search-box-text = پیتینیڌن من وب
newtab-search-box-input =
    .placeholder = پیتینیڌن من وب
    .aria-label = پیتینیڌن من وب

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = ٱووردن موتور پیتینیڌن
newtab-topsites-add-shortcut-header = ره نهنگ نۊ
newtab-topsites-edit-shortcut-header = آلشت ره نهنگ
newtab-topsites-add-shortcut-label = ٱووردن ره نهنگ
newtab-topsites-add-shortcut-title =
    .title = ٱووردن ره نهنگ
    .aria-label = ٱووردن ره نهنگ
newtab-topsites-title-label = عونوان
newtab-topsites-title-input =
    .placeholder = زیڌن ی عونوان
newtab-topsites-url-label = نشۊوی اینترنتی
newtab-topsites-url-input =
    .placeholder = ی نشۊوی هؽل کۊنین یا جا بونین
newtab-topsites-url-validation = نشۊوی اینترنتی موعتبر لازوم هڌ
newtab-topsites-image-url-label = نشۊوی سفارشی شؽوات
newtab-topsites-use-image-link = و کار گرؽڌن ی شؽوات سفارشی…
newtab-topsites-image-validation =
    بار ونی شؽوات شکست خرد.
    نشۊوی دیری ن امتهووݩ کۊنین.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = روفتن هؽل

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = لقو
newtab-topsites-delete-history-button = پاک کردن ز ویرگار
newtab-topsites-save-button = زفت
newtab-topsites-preview-button = پؽش نیر
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
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = قلوه دووسته بۊین

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
newtab-section-menu-move-up = جاگورو و روء
newtab-section-menu-move-down = جاگورو و لم
newtab-section-menu-privacy-notice = نوکات زفت مهرمووه ای

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = جم کردن بشن
newtab-section-expand-section-label =
    .aria-label = واز کردن بشن

## Section Headers.

newtab-section-header-recent-activity = فعالیتا دیندایی
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = پؽشنهاڌ وابیڌه و دست { $provider }
newtab-section-header-stories = داستانا فرگ کردنی

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-try-again-button = قپ ریت دووارته
newtab-discovery-empty-section-topstories-loading = هونی بار اونه…

## Pocket Content Section.

newtab-pocket-learn-more = قلوه دووسته بۊین
newtab-pocket-cta-button = گرؽڌن { -pocket-brand-name }
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
newtab-custom-recent-title = فعالیتا دیندایی
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
newtab-wallpaper-reset = وورگندن و سامووا پؽش فرز
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = آپلود ی شؽوات
newtab-wallpaper-custom-color = ی رنگ پسند کۊنین
newtab-wallpaper-toggle-title =
    .label = کاقز دیواری یل
newtab-wallpaper-light-red-panda = پاندای سوئر
newtab-wallpaper-light-mountain = کوه اسبؽڌ
newtab-wallpaper-light-sky = آسمۊوی وا ٱورا بناوش وو آل

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
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
newtab-widget-lists-menu-edit2 =
    .aria-label = آلشت نومگه نوم
newtab-widget-lists-menu-create = وورکل ی نومگه نۊ
newtab-widget-lists-menu-delete = پاک کردن ای نومگه
newtab-widget-lists-menu-copy = لف گیری نومگه من کلیپ بورد
newtab-widget-lists-menu-learn-more = قلوه دووسته بۊین
newtab-widget-lists-button-add-item = ٱووردن ی موورد
newtab-widget-lists-input-add-an-item2 =
    .placeholder = ٱووردن ی موورد
    .aria-label = ٱووردن ی موورد
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
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = نومگه نۊ
    .aria-label = آلشت نومگه نوم
newtab-widget-section-title = ویجتا
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = بؽڌار کردن ویجتا
    .aria-label = بؽڌار کردن پوی ویجتا
newtab-widget-section-menu-manage = دؽوۉداری ویجتا

## Strings introduced by the Nova redesign of the Timer widget

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
newtab-widget-timer-menu-learn-more = قلوه دووسته بۊین
newtab-daily-briefing-card-menu-dismiss = رڌ کردن
newtab-promo-card-title = لادرار { -brand-product-name }
newtab-promo-card-cta = قلوه دووسته بۊین
newtab-promo-card-dismiss-button =
    .title = رڌ کردن
    .aria-label = رڌ کردن

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = رڌ کردن
    .aria-label = رڌ کردن
