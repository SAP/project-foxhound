# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Thẻ mới
newtab-settings-button =
    .title = Tùy biến trang thẻ mới
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Tuỳ chỉnh trang này
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Tùy chỉnh
newtab-customize-panel-label =
    .label = Tùy chỉnh
newtab-personalize-settings-icon-label =
    .title = Cá nhân hóa thẻ mới
    .aria-label = Cài đặt
newtab-settings-dialog-label =
    .aria-label = Cài đặt
newtab-personalize-icon-label =
    .title = Cá nhân hóa thẻ mới
    .aria-label = Cá nhân hóa thẻ mới
newtab-personalize-dialog-label =
    .aria-label = Cá nhân hóa
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Bỏ qua
    .aria-label = Bỏ qua

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Trang chủ
home-homepage-new-windows =
    .label = Cửa sổ mới
home-homepage-new-tabs =
    .label = Thẻ mới
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Chọn một trang web cụ thể

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Địa chỉ trang web
home-custom-homepage-address =
    .placeholder = Nhập địa chỉ
home-custom-homepage-address-button =
    .label = Thêm địa chỉ
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Chưa có trang web nào được thêm vào.
home-custom-homepage-delete-address-button =
    .aria-label = Xóa địa chỉ
    .title = Xóa địa chỉ
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Thay thế bằng
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Các trang hiện đang mở
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Dấu trang…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Tìm kiếm
home-prefs-stories-header2 =
    .label = Câu chuyện
    .description = Nội dung đặc biệt được quản lý bởi gia đình { -brand-product-name }
home-prefs-widgets-header =
    .label = Widget
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Danh sách
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Bộ hẹn giờ
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Thể thao
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Đồng hồ
home-prefs-mission-message2 =
    .message = Các nhà tài trợ của chúng tôi hỗ trợ sứ mệnh của chúng tôi là xây dựng một trang web tốt hơn.
home-prefs-manage-topics-link2 =
    .label = Quản lý chủ đề
home-prefs-choose-wallpaper-link2 =
    .label = Chọn một hình nền
home-prefs-firefox-logo-header =
    .label = Logo { -brand-short-name }
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Để sử dụng các tính năng này, hãy đặt thẻ mới hoặc cửa sổ mới thành { -firefox-home-brand-name }.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label = { $num } hàng
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Tiện ích mở rộng ({ $extension })
home-restore-defaults-srd =
    .label = Khôi phục về mặc định
    .accesskey = R
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (Mặc định)
home-mode-choice-custom-srd =
    .label = Tùy chỉnh URL...
home-mode-choice-blank-srd =
    .label = Trang trắng
home-prefs-shortcuts-header-srd =
    .label = Lối tắt
home-prefs-shortcuts-select =
    .aria-label = Lối tắt
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Các lối tắt được tài trợ
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Bài viết quảng cáo
home-prefs-highlights-option-visited-pages-srd =
    .label = Trang đã truy cập
home-prefs-highlights-options-bookmarks-srd =
    .label = Dấu trang
home-prefs-highlights-option-most-recent-download-srd =
    .label = Tải xuống gần đây nhất
home-prefs-recent-activity-header-srd =
    .label = Hoạt động gần đây
home-prefs-recent-activity-select =
    .aria-label = Hoạt động gần đây
home-prefs-weather-header-srd =
    .label = Thời tiết
home-prefs-support-firefox-header-srd =
    .label = Hỗ trợ cho { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = Tìm hiểu cách thức

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Tìm kiếm
    .aria-label = Tìm kiếm
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Tìm kiếm với { $engine } hoặc nhập địa chỉ
newtab-search-box-handoff-text-no-engine = Tìm kiếm hoặc nhập địa chỉ
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Tìm kiếm với { $engine } hoặc nhập địa chỉ
    .title = Tìm kiếm với { $engine } hoặc nhập địa chỉ
    .aria-label = Tìm kiếm với { $engine } hoặc nhập địa chỉ
newtab-search-box-handoff-input-no-engine =
    .placeholder = Tìm kiếm hoặc nhập địa chỉ
    .title = Tìm kiếm hoặc nhập địa chỉ
    .aria-label = Tìm kiếm hoặc nhập địa chỉ
newtab-search-box-text = Tìm kiếm trên mạng
newtab-search-box-input =
    .placeholder = Tìm kiếm trên mạng
    .aria-label = Tìm kiếm trên mạng

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Thêm công cụ tìm kiếm
newtab-topsites-add-shortcut-header = Lối tắt mới
newtab-topsites-edit-topsites-header = Sửa trang web hàng đầu
newtab-topsites-edit-shortcut-header = Chỉnh sửa lối tắt
newtab-topsites-add-shortcut-label = Thêm lối tắt
newtab-topsites-add-shortcut-title =
    .title = Thêm lối tắt
    .aria-label = Thêm lối tắt
newtab-topsites-title-label = Tiêu đề
newtab-topsites-title-input =
    .placeholder = Nhập tiêu đề
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Nhập hoặc dán URL
newtab-topsites-url-validation = Yêu cầu URL hợp lệ
newtab-topsites-image-url-label = Hình ảnh Tuỳ chỉnh URL
newtab-topsites-use-image-link = Sử dụng hình ảnh tùy chỉnh…
newtab-topsites-image-validation = Không tải được hình ảnh. Hãy thử một URL khác.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Xoá văn bản

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Hủy bỏ
newtab-topsites-delete-history-button = Xóa khỏi lịch sử
newtab-topsites-save-button = Lưu lại
newtab-topsites-preview-button = Xem trước
newtab-topsites-add-button = Thêm

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Bạn có chắc bạn muốn xóa bỏ mọi thứ của trang này từ lịch sử?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Thao tác này không thể hoàn tác được.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Được tài trợ

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (đã ghim)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Mở bảng chọn
    .aria-label = Mở bảng chọn
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Gỡ bỏ
    .aria-label = Gỡ bỏ
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Mở bảng chọn
    .aria-label = Mở bảng chọn ngữ cảnh cho { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Chỉnh sửa trang web này
    .aria-label = Chỉnh sửa trang web này

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Chỉnh sửa
newtab-menu-open-new-window = Mở trong cửa sổ mới
newtab-menu-open-new-private-window = Mở trong cửa sổ riêng tư mới
newtab-menu-dismiss = Bỏ qua
newtab-menu-pin = Ghim
newtab-menu-unpin = Bỏ ghim
newtab-menu-delete-history = Xóa khỏi lịch sử
newtab-menu-save-to-pocket = Lưu vào { -pocket-brand-name }
newtab-menu-delete-pocket = Xóa khỏi { -pocket-brand-name }
newtab-menu-archive-pocket = Lưu trữ trong { -pocket-brand-name }
newtab-menu-show-privacy-info = Nhà tài trợ của chúng tôi và sự riêng tư của bạn
newtab-menu-about-fakespot = Về { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Báo cáo
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Chặn
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Huỷ theo dõi
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Tìm hiểu thêm
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Bỏ theo dõi chủ đề

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Quản lý nội dung được tài trợ
newtab-menu-our-sponsors-and-your-privacy = Nhà tài trợ của chúng tôi và sự riêng tư của bạn
newtab-menu-report-this-ad = Báo cáo quảng cáo này

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Xong
newtab-privacy-modal-button-manage = Quản lý cài đặt nội dung được tài trợ
newtab-privacy-modal-header = Vấn đề riêng tư của bạn.
newtab-privacy-modal-paragraph-2 =
    Ngoài việc tận hưởng những câu chuyện hấp dẫn, chúng tôi cũng cho bạn thấy có liên quan,
    nội dung được đánh giá cao từ các nhà tài trợ chọn lọc. Hãy yên tâm, <strong>dữ liệu duyệt của bạn
    không bao giờ để lại bản sao { -brand-product-name }</strong> của bạn — chúng tôi không thể nhìn thấy nó
    và các tài trợ của chúng tôi cũng vậy.
newtab-privacy-modal-link = Tìm hiểu cách hoạt động của quyền riêng tư trên thẻ mới

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Xóa dấu trang
# Bookmark is a verb here.
newtab-menu-bookmark = Dấu trang

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Sao chép địa chỉ tải xuống
newtab-menu-go-to-download-page = Đi đến trang web tải xuống
newtab-menu-remove-download = Xóa khỏi lịch sử

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Hiển thị trong Finder
       *[other] Mở thư mục chứa
    }
newtab-menu-open-file = Mở tập tin

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Đã truy cập
newtab-label-bookmarked = Đã được đánh dấu
newtab-label-removed-bookmark = Đã xóa dấu trang
newtab-label-recommended = Xu hướng
newtab-label-saved = Đã lưu vào { -pocket-brand-name }
newtab-label-download = Đã tải xuống
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Được tài trợ
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Được tài trợ bởi { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } phút
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Được tài trợ

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Xoá mục
newtab-section-menu-collapse-section = Thu gọn mục
newtab-section-menu-expand-section = Mở rộng mục
newtab-section-menu-manage-section = Quản lý mục
newtab-section-menu-manage-webext = Quản lí tiện ích
newtab-section-menu-add-topsite = Thêm trang web hàng đầu
newtab-section-menu-add-search-engine = Thêm công cụ tìm kiếm
newtab-section-menu-move-up = Di chuyển lên
newtab-section-menu-move-down = Di chuyển xuống
newtab-section-menu-privacy-notice = Thông báo bảo mật

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Thu gọn mục
newtab-section-expand-section-label =
    .aria-label = Mở rộng mục

## Section Headers.

newtab-section-header-topsites = Trang web hàng đầu
newtab-section-header-recent-activity = Hoạt động gần đây
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Được đề xuất bởi { $provider }
newtab-section-header-stories = Những câu chuyện kích động tư tưởng
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Lựa chọn hôm nay dành cho bạn

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Bắt đầu duyệt web và chúng tôi sẽ hiển thị một số bài báo, video, và các trang khác mà bạn đã xem hoặc đã đánh dấu tại đây.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Bạn đã bắt kịp. Kiểm tra lại sau để biết thêm các câu chuyện hàng đầu từ { $provider }. Không muốn đợi? Chọn một chủ đề phổ biến để tìm thêm những câu chuyện tuyệt vời từ khắp nơi trên web.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Bạn đã bắt kịp. Kiểm tra lại sau để biết thêm các câu chuyện. Không muốn đợi? Chọn một chủ đề phổ biến để tìm thêm những câu chuyện tuyệt vời từ khắp nơi trên web.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Bạn đã bắt kịp!
newtab-discovery-empty-section-topstories-content = Kiểm tra lại sau để biết thêm câu chuyện.
newtab-discovery-empty-section-topstories-try-again-button = Thử lại
newtab-discovery-empty-section-topstories-loading = Đang tải…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Rất tiếc! Chúng tôi gần như tải phần này, nhưng không hoàn toàn.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Các chủ đề phổ biến:
newtab-pocket-new-topics-title = Muốn nhiều câu chuyện hơn nữa? Xem các chủ đề phổ biến này từ { -pocket-brand-name }
newtab-pocket-more-recommendations = Nhiều khuyến nghị hơn
newtab-pocket-learn-more = Tìm hiểu thêm
newtab-pocket-cta-button = Sử dụng { -pocket-brand-name }
newtab-pocket-cta-text = Lưu những câu chuyện bạn yêu thích trong { -pocket-brand-name } và vui vẻ khi đọc chúng.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } là một phần của gia đình { -brand-product-name }
newtab-pocket-save = Lưu
newtab-pocket-saved = Đã lưu

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Thêm những nội dung giống thế này
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Không hợp với tôi
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Cảm ơn. Những phản hồi của bạn sẽ giúp chúng tôi cải thiện bản tin của bạn.
newtab-toast-dismiss-button =
    .title = Bỏ qua
    .aria-label = Bỏ qua

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Khám phá những điều tốt nhất của web
newtab-pocket-onboarding-cta = { -pocket-brand-name } khám phá nhiều loại ấn phẩm khác nhau để mang nội dung giàu thông tin, truyền cảm hứng và đáng tin cậy nhất đến ngay trình duyệt { -brand-product-name } của bạn.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Rất tiếc, đã xảy ra lỗi khi tải nội dung này.
newtab-error-fallback-refresh-link = Thử làm mới lại trang.

## Customization Menu

newtab-custom-shortcuts-title = Lối tắt
newtab-custom-shortcuts-subtitle = Các trang web bạn lưu hoặc truy cập
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Lối tắt
    .description = Các trang web bạn lưu hoặc truy cập
newtab-custom-shortcuts-nova =
    .label = Lối tắt
newtab-custom-row-description =
    .description = Số lượng hàng
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
           *[other] { $num } hàng
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
       *[other] { $num } hàng
    }
newtab-custom-sponsored-sites = Các lối tắt được tài trợ
newtab-custom-pocket-title = Được đề xuất bởi { -pocket-brand-name }
newtab-custom-pocket-subtitle = Nội dung đặc biệt do { -pocket-brand-name }, một phần của { -brand-product-name }, quản lý
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Câu chuyện được đề xuất
    .description = Nội dung đặc biệt được quản lý bởi gia đình { -brand-product-name }
newtab-recommended-stories-toggle =
    .label = Câu chuyện được đề xuất
newtab-custom-stories-personalized-toggle =
    .label = Câu chuyện
newtab-custom-stories-personalized-checkbox-label = Câu chuyện được cá nhân hóa dựa trên hoạt động của bạn
newtab-custom-pocket-sponsored = Câu chuyện được tài trợ
newtab-custom-pocket-show-recent-saves = Hiển thị các lần lưu gần đây
newtab-custom-recent-title = Hoạt động gần đây
newtab-custom-recent-subtitle = Tuyển chọn các trang và nội dung gần đây
newtab-custom-weather-toggle =
    .label = Thời tiết
    .description = Sơ lược về dự báo hôm nay
newtab-custom-widget-weather-toggle =
    .label = Thời tiết
newtab-custom-widget-lists-toggle =
    .label = Danh sách
newtab-custom-widget-timer-toggle =
    .label = Bộ hẹn giờ
newtab-custom-widget-sports-toggle =
    .label = World Cup
newtab-custom-widget-clock-toggle =
    .label = Đồng hồ
newtab-custom-widget-sports-toggle2 =
    .label = Thể thao
newtab-custom-widget-section-title = Widget
newtab-custom-widget-section-toggle =
    .label = Widget
newtab-widget-manage-title = Widget
newtab-widget-manage-widget-button =
    .label = Quản lý widget
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Đóng
    .aria-label = Đóng menu
newtab-custom-close-button = Đóng
newtab-custom-settings = Quản lý các cài đặt khác

## New Tab Wallpapers

newtab-wallpaper-title = Hình nền
newtab-wallpaper-reset = Đặt lại về mặc định
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Tải lên một ảnh
newtab-wallpaper-add-an-image = Thêm một ảnh
newtab-wallpaper-custom-color = Chọn màu
newtab-wallpaper-toggle-title =
    .label = Hình nền
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Hình ảnh vượt quá giới hạn kích thước tập tin { $file_size }MB. Vui lòng thử tải lên một tập tin nhỏ hơn.
newtab-wallpaper-error-upload-file-type = Chúng tôi không thể tải tập tin của bạn lên. Vui lòng thử lại với tập tin hình ảnh.
newtab-wallpaper-error-file-type = Chúng tôi không thể tải lên tập tin của bạn. Vui lòng thử lại với loại tập tin khác.
newtab-wallpaper-light-red-panda = Gấu trúc đỏ
newtab-wallpaper-light-mountain = Núi trắng
newtab-wallpaper-light-sky = Bầu trời với những đám mây màu tím và hồng
newtab-wallpaper-light-color = Hình dạng màu xanh, hồng và vàng
newtab-wallpaper-light-landscape = Phong cảnh núi sương mù xanh
newtab-wallpaper-light-beach = Bãi biển có cây cọ
newtab-wallpaper-dark-aurora = Cực quang
newtab-wallpaper-dark-color = Hình dạng màu đỏ và màu xanh
newtab-wallpaper-dark-panda = Gấu trúc đỏ ẩn trong rừng
newtab-wallpaper-dark-sky = Cảnh quan thành phố với bầu trời đêm
newtab-wallpaper-dark-mountain = Phong cảnh núi
newtab-wallpaper-dark-city = Phong cảnh thành phố màu tím
newtab-wallpaper-dark-fox-anniversary = Một chú cáo đứng trên vỉa hè gần khu rừng
newtab-wallpaper-light-fox-anniversary = Một chú cáo trong cánh đồng xanh cỏ với phong cảnh núi non mờ sương

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Màu
newtab-wallpaper-colors = Màu
newtab-wallpaper-blue = Xanh dương
newtab-wallpaper-light-blue = Xanh dương nhạt
newtab-wallpaper-light-purple = Tím nhạt
newtab-wallpaper-light-green = Xanh lục nhạt
newtab-wallpaper-green = Xanh lục
newtab-wallpaper-beige = Be
newtab-wallpaper-yellow = Vàng
newtab-wallpaper-orange = Da cam
newtab-wallpaper-pink = Hồng
newtab-wallpaper-light-pink = Hồng nhạt
newtab-wallpaper-red = Đỏ
newtab-wallpaper-dark-blue = Xanh dương đậm
newtab-wallpaper-dark-purple = Tím đậm
newtab-wallpaper-dark-green = Xanh lục đậm
newtab-wallpaper-brown = Nâu

## Abstract

newtab-wallpaper-category-title-abstract = Trừu tượng
newtab-wallpaper-abstract-green = Hình dạng màu xanh lục
newtab-wallpaper-abstract-blue = Hình dạng màu xanh dương
newtab-wallpaper-abstract-purple = Hình dạng màu tím
newtab-wallpaper-abstract-orange = Hình dạng màu cam
newtab-wallpaper-gradient-orange = Chuyển sắc màu cam và màu hồng
newtab-wallpaper-abstract-blue-purple = Hình dạng màu xanh dương và màu tím
newtab-wallpaper-abstract-white-curves = Màu trắng với các đường cong bóng mờ
newtab-wallpaper-abstract-purple-green = Chuyển sắc ánh sáng tím và xanh lá cây
newtab-wallpaper-abstract-blue-purple-waves = Hình dạng gợn sóng màu xanh dương và tím
newtab-wallpaper-abstract-black-waves = Hình dạng gợn sóng màu đen

## Firefox

newtab-wallpaper-category-title-photographs = Hình ảnh
newtab-wallpaper-beach-at-sunrise = Bãi biển lúc bình minh
newtab-wallpaper-beach-at-sunset = Bãi biển lúc hoàng hôn
newtab-wallpaper-storm-sky = Trời giông bão
newtab-wallpaper-sky-with-pink-clouds = Bầu trời với đám mây màu hồng
newtab-wallpaper-red-panda-yawns-in-a-tree = Gấu trúc đỏ ngáp trên cây
newtab-wallpaper-white-mountains = Núi trắng
newtab-wallpaper-hot-air-balloons = Các loại màu của bóng bay không khí nóng vào ban ngày
newtab-wallpaper-starry-canyon = Đêm sao màu xanh
newtab-wallpaper-suspension-bridge = Ảnh cầu treo màu xám chụp vào ban ngày
newtab-wallpaper-sand-dunes = Đồi cát trắng
newtab-wallpaper-palm-trees = Hình bóng của cây cọ dừa trong giờ vàng
newtab-wallpaper-blue-flowers = Ảnh chụp cận cảnh những bông hoa cánh xanh đang nở
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Hình ảnh bởi <a data-l10n-name="name-link">{ $author_string }</a> trên <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Thử một chút màu sắc
newtab-wallpaper-feature-highlight-content = Mang lại diện mạo mới cho thẻ mới của bạn bằng hình nền.
newtab-wallpaper-feature-highlight-button = Đã hiểu
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Bỏ qua
    .aria-label = Đóng cửa sổ bật lên
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Thiên thể
newtab-wallpaper-celestial-lunar-eclipse = Nguyệt thực
newtab-wallpaper-celestial-earth-night = Ảnh ban đêm từ quỹ đạo thấp của Trái Đất
newtab-wallpaper-celestial-starry-sky = Bầu trời đầy sao
newtab-wallpaper-celestial-eclipse-time-lapse = Thời gian trôi nhanh của nguyệt thực
newtab-wallpaper-celestial-black-hole = Minh họa lỗ đen trong thiên hà
newtab-wallpaper-celestial-river = Hình ảnh vệ tinh của sông

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Xem dự báo với { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Được tài trợ
newtab-weather-menu-change-location = Thay đổi khu vực
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Tìm kiếm khu vực
    .aria-label = Tìm kiếm khu vực
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Sử dụng khu vực hiện tại
newtab-weather-menu-weather-display = Cách hiển thị thời tiết
newtab-weather-todays-forecast = Dự báo thời tiết hôm nay
newtab-weather-see-full-forecast = Xem dự báo thời tiết đầy đủ
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Đơn giản
newtab-weather-menu-change-weather-display-simple = Chuyển sang xem đơn giản
newtab-weather-menu-weather-display-option-detailed = Chi tiết
newtab-weather-menu-change-weather-display-detailed = Chuyển sang xem chi tiết
newtab-weather-menu-temperature-units = Đơn vị nhiệt độ
newtab-weather-menu-temperature-option-fahrenheit = Độ F
newtab-weather-menu-temperature-option-celsius = Độ C
newtab-weather-menu-change-temperature-units-fahrenheit = Chuyển sang độ F
newtab-weather-menu-change-temperature-units-celsius = Chuyển sang độ C
newtab-weather-menu-hide-weather = Ẩn thời tiết trên thẻ mới
newtab-weather-menu-learn-more = Tìm hiểu thêm
newtab-weather-menu-detect-my-location = Phát hiện vị trí của tôi
# This message is shown if user is working offline
newtab-weather-error-not-available = Dữ liệu thời tiết hiện không có sẵn.
newtab-weather-opt-in-see-weather = Bạn có muốn xem thời tiết ở nơi bạn ở không?
newtab-weather-opt-in-not-now =
    .label = Không phải bây giờ
newtab-weather-opt-in-yes =
    .label = Đồng ý
newtab-weather-opt-in-headline = Xem dự báo thời tiết nơi ở hiện tại của bạn
newtab-weather-opt-in-use-location =
    .label = Sử dụng vị trí
newtab-weather-opt-in-choose-location = Chọn khu vực
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = Thành phố New York
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Cao nhất
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Thấp nhất
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Xem dự báo với { $provider }
    .aria-description = { $provider } ∙ Được tài trợ

## Topic Labels

newtab-topic-label-business = Kinh doanh
newtab-topic-label-career = Cơ hội nghề nghiệp
newtab-topic-label-education = Giáo dục
newtab-topic-label-arts = Giải trí
newtab-topic-label-food = Thực phẩm
newtab-topic-label-health = Sức khỏe
newtab-topic-label-hobbies = Trò chơi
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Tài chính cá nhân
newtab-topic-label-society-parenting = Nuôi dạy con cái
newtab-topic-label-government = Chính trị
newtab-topic-label-education-science = Khoa học
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Mẹo vặt cuộc sống
newtab-topic-label-sports = Thể thao
newtab-topic-label-tech = Công nghệ
newtab-topic-label-travel = Du lịch
newtab-topic-label-home = Nhà & vườn

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Chọn chủ đề để tinh chỉnh nguồn cấp dữ liệu của bạn
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Chọn hai hoặc nhiều chủ đề. Các người chuyên gia giám tuyển của chúng tôi sẽ ưu tiên những câu chuyện phù hợp với sở thích của bạn. Cập nhật bất cứ lúc nào.
newtab-topic-selection-save-button = Lưu
newtab-topic-selection-cancel-button = Hủy bỏ
newtab-topic-selection-button-maybe-later = Có lẽ để sau
newtab-topic-selection-privacy-link = Tìm hiểu cách chúng tôi bảo vệ và quản lý dữ liệu
newtab-topic-selection-button-update-interests = Cập nhật sở thích của bạn
newtab-topic-selection-button-pick-interests = Chọn sở thích của bạn

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Theo dõi
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Theo dõi { $topic }
newtab-section-following-button = Đang theo dõi
newtab-section-unfollow-button = Huỷ theo dõi
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Đang theo dõi: Bỏ theo dõi { $topic }
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Tinh chỉnh nguồn cấp dữ liệu của bạn
newtab-section-follow-highlight-subtitle = Theo dõi sở thích của bạn để xem thêm những gì bạn thích.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Chặn
newtab-section-blocked-button = Đã chặn
newtab-section-unblock-button = Bỏ chặn
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = Theo dõi { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = Bỏ theo dõi { $topic }
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = Chặn { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Bỏ chặn { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = Không phải bây giờ
newtab-section-confirm-block-topic-p1 = Bạn có chắc là bạn muốn chặn chủ đề này?
newtab-section-confirm-block-topic-p2 = Chủ đề bị chặn sẽ không còn xuất hiện trong nguồn cấp dữ liệu của bạn.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Chặn { $topic }
newtab-section-block-cancel-button = Hủy bỏ

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Các chủ đề
newtab-section-manage-topics-button-v2 =
    .label = Quản lý chủ đề
newtab-section-mangage-topics-followed-topics = Đã theo dõi
newtab-section-mangage-topics-followed-topics-empty-state = Bạn chưa theo dõi bất kỳ chủ đề nào.
newtab-section-mangage-topics-blocked-topics = Đã chặn
newtab-section-mangage-topics-blocked-topics-empty-state = Bạn chưa chặn bất kỳ chủ đề nào.
newtab-custom-wallpaper-title = Hình nền tùy chỉnh ở đây
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Tải lên hình nền của bạn hoặc chọn một màu tùy chỉnh để biến { -brand-product-name } thành của riêng bạn.
newtab-custom-wallpaper-cta = Thử ngay

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Chọn một hình nền để tạo { -brand-product-name } thành của riêng bạn
newtab-new-user-custom-wallpaper-subtitle = Khiến mọi thẻ mới trở nên thân thiện với hình nền và màu sắc tùy chỉnh.
newtab-new-user-custom-wallpaper-cta = Thử ngay bây giờ

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Những hình nền mới toanh vừa cập nhật
newtab-wallpaper-feature-highlight-subtitle = Hãy chọn thẻ yêu thích của bạn và biến mỗi thẻ mới thành một trải nghiệm quen thuộc.
newtab-wallpaper-feature-highlight-cta = Chọn hình nền

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Tải xuống { -brand-product-name } dành cho di động
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Quét mã để duyệt web an toàn khi đang di chuyển.
newtab-download-mobile-highlight-body-variant-b = Tiếp tục từ nơi bạn dừng lại khi đồng bộ hóa các thẻ, mật khẩu và nhiều thứ khác.
newtab-download-mobile-highlight-body-variant-c = Bạn có biết bạn có thể mang theo { -brand-product-name } khi đang di chuyển? Cùng một trình duyệt. Trong túi của bạn.
newtab-download-mobile-highlight-image =
    .aria-label = Mã QR để tải xuống { -brand-product-name } dành cho di động

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Những mục yêu thích của bạn trong tầm tay bạn
newtab-shortcuts-highlight-subtitle = Thêm lối tắt để truy cập các trang web yêu thích chỉ bằng một cú nhấp chuột.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Tại sao bạn báo cáo điều này?
newtab-report-ads-reason-not-interested =
    .label = Tôi không quan tâm
newtab-report-ads-reason-inappropriate =
    .label = Không phù hợp
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Tôi đã nhìn thấy nó quá nhiều lần
newtab-report-content-wrong-category =
    .label = Sai danh mục
newtab-report-content-outdated =
    .label = Đã lỗi thời
newtab-report-content-inappropriate-offensive =
    .label = Không phù hợp hoặc xúc phạm
newtab-report-content-spam-misleading =
    .label = Spam hoặc gây hiểu lầm
newtab-report-content-requires-payment-subscription =
    .label = Yêu cầu thanh toán hoặc gói đăng ký
newtab-report-content-requires-payment-subscription-learn-more = Tìm hiểu thêm
newtab-report-cancel = Hủy bỏ
newtab-report-submit = Gửi
newtab-toast-thanks-for-reporting =
    .message = Cảm ơn bạn đã báo cáo điều này.
newtab-toast-widgets-hidden =
    .message = Chọn biểu tượng bút chì để thêm lại widget bất cứ lúc nào.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Bạn hiện đang theo dõi { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Bạn không còn theo dõi { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Bạn sẽ không còn thấy các bài viết về { $topic } nữa.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Khả năng là vô tận. Hãy thêm một cái.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Mới
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Đã hoàn thành ({ $number })
newtab-widget-lists-celebration-headline = Làm tốt lắm
newtab-widget-lists-celebration-subhead = Tất cả đã xong
newtab-widget-task-list-menu-copy = Sao chép
newtab-widget-lists-menu-edit = Chỉnh sửa tên danh sách
newtab-widget-lists-menu-edit2 =
    .aria-label = Chỉnh sửa tên danh sách
newtab-widget-lists-menu-create = Tạo một danh sách mới
newtab-widget-lists-menu-delete = Xóa danh sách này
newtab-widget-lists-menu-copy = Sao chép danh sách vào bộ nhớ tạm
newtab-widget-lists-menu-learn-more = Tìm hiểu thêm
newtab-widget-lists-button-add-item = Thêm một mục
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Thêm một mục
    .aria-label = Thêm một mục
newtab-widget-lists-input-error = Vui lòng thêm văn bản để thêm mục.
newtab-widget-lists-input-menu-open-link = Mở liên kết
newtab-widget-lists-input-menu-move-up = Di chuyển lên
newtab-widget-lists-input-menu-move-down = Di chuyển xuống
newtab-widget-lists-input-menu-delete = Xóa
newtab-widget-lists-input-menu-edit = Chỉnh sửa
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Chỉnh sửa mục
newtab-widget-lists-edit-clear =
    .aria-label = Huỷ bỏ
    .title = Huỷ bỏ
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Tạo một danh sách mới
newtab-widget-lists-name-label-default =
    .label = Danh sách nhiệm vụ
newtab-widget-lists-name-label-checklist =
    .label = Danh sách việc cần làm
newtab-widget-lists-name-placeholder-default =
    .placeholder = Danh sách nhiệm vụ
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Danh sách việc cần làm
    .aria-label = Chỉnh sửa tên danh sách
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Danh sách mới
    .aria-label = Chỉnh sửa tên danh sách
newtab-widget-section-title = Widget
newtab-widget-menu-hide = Ẩn widget
newtab-widget-menu-change-size = Thay đổi kích thước
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Di chuyển
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Trái
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Phải
newtab-widget-size-small = Nhỏ
newtab-widget-size-medium = Trung bình
newtab-widget-size-large = Lớn
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Ẩn widget
    .aria-label = Ẩn tất cả widget
newtab-widget-section-maximize =
    .title = Mở rộng widget
    .aria-label = Mở rộng tất cả widget thành kích thước đầy đủ
newtab-widget-section-minimize =
    .title = Thu nhỏ widget
    .aria-label = Thu nhỏ tất cả widget thành kích thước nhỏ gọn
newtab-widget-section-menu-button =
    .title = Menu widget
    .aria-label = Mở menu widget
newtab-widget-add-widgets-button =
    .aria-label = Thêm widget
    .title = Thêm widget
newtab-widget-section-menu-manage = Quản lý widget
newtab-widget-section-menu-hide-all = Ẩn widget
newtab-widget-section-menu-learn-more = Tìm hiểu thêm
newtab-widget-section-feedback = Hãy cho chúng tôi biết suy nghĩ của bạn
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Hiện thêm widget
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Hiện ích widget hơn
newtab-widget-lists-name-default = Danh sách việc cần làm

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Bộ hẹn giờ
newtab-widget-timer-notification-focus = Đã hết thời gian tập trung. Làm tốt lắm. Bạn cần nghỉ ngơi không?
newtab-widget-timer-notification-break = Giờ nghỉ của bạn đã kết thúc. Sẵn sàng bắt đầu thời gian tập trung?
newtab-widget-timer-notification-warning = Thông báo đã tắt
newtab-widget-timer-mode-focus =
    .label = Tập trung
newtab-widget-timer-mode-break =
    .label = Giải lao
newtab-widget-timer-label-play =
    .label = Bắt đầu
newtab-widget-timer-label-pause =
    .label = Tạm dừng
newtab-widget-timer-reset =
    .title = Đặt lại
newtab-widget-timer-menu-notifications = Tắt thông báo
newtab-widget-timer-menu-notifications-on = Bật thông báo
newtab-widget-timer-menu-learn-more = Tìm hiểu thêm
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Tin tức nổi bật
newtab-daily-briefing-card-menu-dismiss = Bỏ qua
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Đã cập nhật { $minutes } phút trước
newtab-widget-message-title = Giữ tập trung với danh sách và bộ đếm thời gian tích hợp
# to-dos stands for "things to do".
newtab-widget-message-copy = Từ những lời nhắc nhở nhanh đến những việc cần làm hàng ngày, các buổi tập trung đến những giờ nghỉ giải lao — hãy tập trung vào nhiệm vụ và đúng giờ.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Một nơi để tập trung, dự báo thời tiết và nhiều hơn nữa.
newtab-widget-message-focus-forecasts-body = Giữ cho ngày của bạn luôn trôi chảy với các widget của { -brand-product-name }. Kiểm tra dự báo thời tiết, theo dõi công việc hoặc theo dõi thời gian trên toàn cầu.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Biến { -brand-product-name } thành của riêng bạn
newtab-promo-card-body-addons = Chọn một hình nền từ bộ sưu tập của chúng tôi hoặc tự tạo hình nền của riêng bạn.
newtab-promo-card-cta-addons = Thử ngay bây giờ
newtab-promo-card-title = Hỗ trợ cho { -brand-product-name }
newtab-promo-card-body = Các nhà tài trợ của chúng tôi hỗ trợ sứ mệnh của chúng tôi là xây dựng một trang web tốt hơn
newtab-promo-card-cta = Tìm hiểu thêm
newtab-promo-card-dismiss-button =
    .title = Bỏ qua
    .aria-label = Bỏ qua

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label = Bắt đầu bộ hẹn giờ { $minutes } phút
newtab-widget-timer-pause-aria =
    .aria-label = Tạm dừng bộ hẹn giờ
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label = { $minutes } phút
newtab-widget-timer-decrease-min =
    .title = Giảm 1 phút
newtab-widget-timer-increase-min =
    .title = Tăng 1 phút
newtab-widget-timer-mode-group =
    .aria-label = Chế độ hẹn giờ
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Tập trung
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Giải lao
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Ẩn bộ hẹn giờ
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Làm tốt lắm
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Giờ giải lao của bạn đã kết thúc
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Cần giải lao?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Sẵn sàng tập trung trở lại?

##

newtab-sports-widget-menu-follow-teams = Theo dõi đội
newtab-sports-widget-menu-view-schedule = Xem lịch trình
newtab-sports-widget-menu-view-upcoming = Xem cái gì sắp tới
newtab-sports-widget-menu-view-results = Hiện kết quả
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Ngày quan trọng
newtab-sports-widget-menu-learn-more = Tìm hiểu thêm
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Cập nhật World Cup
newtab-sports-widget-get-updates = Nhận thông tin cập nhật trực tiếp và hơn thế nữa.
newtab-sports-widget-view-schedule =
    .label = Xem lịch trình
newtab-sports-widget-follow-teams =
    .label = Theo dõi đội
newtab-sports-widget-view-matches =
    .label = Xem các trận đấu
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
       *[other] Theo dõi { $number } nhóm
    }
newtab-sports-widget-choose-wallpaper =
    .label = Chọn một hình nền
newtab-sports-widget-skip = Bỏ qua
newtab-sports-widget-search-country =
    .placeholder = Tìm kiếm quốc gia
    .aria-label = Tìm kiếm quốc gia
newtab-sports-widget-cancel = Hủy
newtab-sports-widget-back-button =
    .aria-label = Quay lại
newtab-sports-widget-done-button =
    .label = Xong
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (đã bị loại)
newtab-sports-widget-view-all =
    .label = Xem tất cả
newtab-sports-widget-show-less =
    .label = Hiện ít hơn
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Chỉ các đội đã theo dõi
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Xem
    .title = Xem trực tiếp
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Xem trực tiếp
    .title = Xem trực tiếp
newtab-sports-widget-watch-dialog-close =
    .aria-label = Đóng
    .title = Đóng
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Miễn phí
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Dùng thử miễn phí
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Miễn phí và trả phí
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Trả phí
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Chỉ chọn trận đấu
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Có sẵn tại khu vực của bạn
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Các khu vực khác
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Xem trực tiếp
    .title = Xem trực tiếp
newtab-sports-widget-group-stage = Vòng bảng
newtab-sports-widget-group-a = Bảng A
newtab-sports-widget-group-b = Bảng B
newtab-sports-widget-group-c = Bảng C
newtab-sports-widget-group-d = Bảng D
newtab-sports-widget-group-e = Bảng E
newtab-sports-widget-group-f = Bảng F
newtab-sports-widget-group-g = Bảng G
newtab-sports-widget-group-h = Bảng H
newtab-sports-widget-group-i = Bảng I
newtab-sports-widget-group-j = Bảng J
newtab-sports-widget-group-k = Bảng K
newtab-sports-widget-group-l = Bảng L
newtab-sports-widget-round-32 = Vòng 32
newtab-sports-widget-round-16 = Vòng 16
newtab-sports-widget-quarter-finals = Tứ kết
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = TRỰC TIẾP
newtab-custom-widget-live-refresh =
    .title = Làm mới điểm số
    .aria-label = Làm mới điểm số
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Ngày quan trọng
newtab-sports-widget-upcoming = Sắp tới
# Used for a match currently ongoing
newtab-sports-widget-now = Bây giờ
newtab-sports-widget-results = Kết quả
newtab-sports-widget-semi-finals = Bán kết
newtab-sports-widget-bronze-finals = Tranh hạng ba
# Final is the final match for 1st place.
newtab-sports-widget-final = Chung kết
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Bị lùi giờ
newtab-sports-widget-postponed = Đã hoãn lại
newtab-sports-widget-suspended = Đã tạm dừng
newtab-sports-widget-cancelled = Đã huỷ trận
newtab-sports-widget-information = Thông tin về trận đấu
newtab-sports-widget-no-live-data = Dữ liệu trận đấu trực tiếp hiện chưa được cập nhật
newtab-sports-widget-view-results-link = Xem kết quả
newtab-sports-widget-third-place = Hạng ba
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Á quân
newtab-sports-widget-champions = Nhà vô địch
newtab-sports-widget-world-cup-champions = Nhà vô địch World Cup 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Hết giờ
newtab-sports-widget-match-halftime = Nghỉ giữa hiệp
newtab-sports-widget-match-extra-time = Hiệp phụ
newtab-sports-widget-match-penalties = Luân lưu
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = vs
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Đón chờ thông tin chi tiết về trận đấu sắp tới

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Trước
    .title = Trước
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Tiếp
    .title = Tiếp
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Trận đấu trực tiếp { $index } của { $total }
    .title = Trận đấu trực tiếp { $index } của { $total }

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
    .aria-label = { $homeTeam }, { $homeScore } với { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) với { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = Trực tiếp: { $homeTeam }, { $homeScore } với { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } với { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } với { $awayTeam }, bị lùi giờ
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } với { $awayTeam }, đã hoãn lại
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } với { $awayTeam }, đã tạm dừng
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } với { $awayTeam }, đã huỷ trận

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosnia và Herzegovina
newtab-sports-widget-team-name-label-civ =
    .label = Bờ Biển Ngà
newtab-sports-widget-team-name-label-cod =
    .label = CHDC Congo
newtab-sports-widget-team-name-label-eng =
    .label = Anh
newtab-sports-widget-team-name-label-sco =
    .label = Scotland
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = Sẽ được xác định sau

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Khởi động World Cup với những hình nền mới
newtab-sports-widget-message-wallpapers-body = Hãy mang chút năng lượng của ngày thi đấu đến trình duyệt của bạn trong suốt giải đấu.
newtab-sports-widget-message-wallpapers-cta = Chọn hình nền
newtab-sports-widget-message-add-widgets-cta =
    .label = Add widgets
newtab-sports-widget-message-day-in-play-title = Hãy giữ cho ngày của bạn luôn thú vị với các widget của { -brand-product-name }
newtab-sports-widget-message-day-in-play-body = Theo dõi World Cup, hoàn thành công việc, theo dõi thời gian trên toàn cầu và hơn thế nữa.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Khám phá widget

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Bỏ qua
    .aria-label = Bỏ qua
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Hãy biến không gian này thành của riêng bạn.
newtab-activation-window-message-customization-focus-message = Chọn hình nền mới, thêm lối tắt đến các trang web yêu thích của bạn và cập nhật những câu chuyện mà bạn quan tâm.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Bắt đầu tuỳ chỉnh
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Không gian này tuân theo luật lệ của bạn.
newtab-activation-window-message-values-focus-message = { -brand-product-name } cho phép bạn duyệt web theo cách bạn thích, với cách thức cá nhân hơn để bắt đầu ngày mới trực tuyến. Biến { -brand-product-name } thành của riêng bạn.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Ẩn đồng hồ
newtab-clock-widget-menu-learn-more = Tìm hiểu thêm
newtab-clock-widget-menu-edit = Chỉnh sửa đồng hồ
newtab-clock-widget-menu-switch-to-12h = Chuyển sang định dạng 12 giờ
newtab-clock-widget-menu-switch-to-24h = Chuyển sang định dạng 24 giờ
newtab-clock-widget-label-your-clocks = Đồng hồ của bạn
newtab-clock-widget-search-location-input =
    .label = Vị trí
    .placeholder = Tìm kiếm một thành phố
    .aria-label = Tìm kiếm một thành phố
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Tên gọi (tuỳ chọn)
    .placeholder = Thêm một tên gọi
    .aria-label = Tên gọi (tuỳ chọn)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Thêm đồng hồ mới
    .aria-label = Thêm đồng hồ mới
newtab-clock-widget-button-add-clock = Thêm
newtab-clock-widget-button-cancel = Hủy bỏ
newtab-clock-widget-button-back =
    .title = Quay lại
    .aria-label = Quay lại
newtab-clock-widget-button-edit-clock =
    .title = Chỉnh sửa đồng hồ
    .aria-label = Chỉnh sửa đồng hồ
newtab-clock-widget-button-save = Lưu
newtab-clock-widget-button-remove-clock =
    .title = Xoá đồng hồ
    .aria-label = Xoá đồng hồ
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
    .aria-label = { $city }, biệt danh: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Thêm đồng hồ
newtab-clock-widget-edit-clock-form =
    .aria-label = Chỉnh sửa đồng hồ
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Kết quả tìm kiếm
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Không có kết quả phù hợp
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Mở menu đồng hồ
    .aria-label = Mở menu đồng hồ
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Tên gọi: { $nickname }
