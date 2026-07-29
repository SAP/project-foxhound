# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = 새 탭
newtab-settings-button =
    .title = 새 탭 페이지 사용자 지정
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = 이 페이지 사용자 지정
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = 사용자 지정
newtab-customize-panel-label =
    .label = 사용자 지정
newtab-personalize-settings-icon-label =
    .title = 새 탭 개인화
    .aria-label = 설정
newtab-settings-dialog-label =
    .aria-label = 설정
newtab-personalize-icon-label =
    .title = 새 탭 개인화
    .aria-label = 새 탭 개인화
newtab-personalize-dialog-label =
    .aria-label = 개인화
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = 닫기
    .aria-label = 닫기

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = 홈페이지
home-homepage-new-windows =
    .label = 새 창
home-homepage-new-tabs =
    .label = 새 탭
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = 특정 사이트 선택

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = 웹 사이트 주소
home-custom-homepage-address =
    .placeholder = 주소 입력
home-custom-homepage-address-button =
    .label = 주소 추가
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = 아직 추가된 웹 사이트가 없습니다.
home-custom-homepage-delete-address-button =
    .aria-label = 주소 삭제
    .title = 주소 삭제
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = 대체:
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = 현재 열려있는 페이지
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = 북마크…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = 검색
home-prefs-stories-header2 =
    .label = 이야기
    .description = { -brand-product-name } 제품군이 선별한 뛰어난 콘텐츠
home-prefs-widgets-header =
    .label = 위젯
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = 목록
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = 타이머
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = 스포츠
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = 시계
home-prefs-mission-message2 =
    .message = 스폰서는 더 나은 웹을 만들려는 저희를 지원합니다.
home-prefs-manage-topics-link2 =
    .label = 주제 관리
home-prefs-choose-wallpaper-link2 =
    .label = 배경 화면 선택
home-prefs-firefox-logo-header =
    .label = { -brand-short-name } 로고
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = 이 기능을 사용하려면, 새 탭이나 새 창을 { -firefox-home-brand-name }으로 설정하세요.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label = { $num } 행
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = 확장 기능 ({ $extension })
home-restore-defaults-srd =
    .label = 기본값으로 복원
    .accesskey = R
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (기본값)
home-mode-choice-custom-srd =
    .label = 사용자 지정 URL…
home-mode-choice-blank-srd =
    .label = 빈 페이지
home-prefs-shortcuts-header-srd =
    .label = 바로 가기
home-prefs-shortcuts-select =
    .aria-label = 바로 가기
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = 스폰서 바로 가기
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = 스폰서 소식
home-prefs-highlights-option-visited-pages-srd =
    .label = 방문한 페이지
home-prefs-highlights-options-bookmarks-srd =
    .label = 북마크
home-prefs-highlights-option-most-recent-download-srd =
    .label = 가장 최근 다운로드
home-prefs-recent-activity-header-srd =
    .label = 최근 활동
home-prefs-recent-activity-select =
    .aria-label = 최근 활동
home-prefs-weather-header-srd =
    .label = 날씨
home-prefs-support-firefox-header-srd =
    .label = { -brand-product-name } 지원
home-prefs-mission-message-learn-more-link-srd = 방법 알아보기

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = 검색
    .aria-label = 검색
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = { $engine } 검색 또는 주소 입력
newtab-search-box-handoff-text-no-engine = 검색어 또는 주소 입력
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = { $engine } 검색 또는 주소 입력
    .title = { $engine } 검색 또는 주소 입력
    .aria-label = { $engine } 검색 또는 주소 입력
newtab-search-box-handoff-input-no-engine =
    .placeholder = 검색어 또는 주소 입력
    .title = 검색어 또는 주소 입력
    .aria-label = 검색어 또는 주소 입력
newtab-search-box-text = 웹 검색
newtab-search-box-input =
    .placeholder = 웹 검색
    .aria-label = 웹 검색

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = 검색 엔진 추가
newtab-topsites-add-shortcut-header = 새 바로 가기
newtab-topsites-edit-topsites-header = 상위 사이트 편집
newtab-topsites-edit-shortcut-header = 바로 가기 편집
newtab-topsites-add-shortcut-label = 바로 가기 추가
newtab-topsites-add-shortcut-title =
    .title = 바로 가기 추가
    .aria-label = 바로 가기 추가
newtab-topsites-title-label = 제목
newtab-topsites-title-input =
    .placeholder = 제목 입력
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = URL 입력 또는 붙여넣기
newtab-topsites-url-validation = 유효한 URL이 필요합니다
newtab-topsites-image-url-label = 사용자 지정 이미지 URL
newtab-topsites-use-image-link = 사용자 지정 이미지 사용…
newtab-topsites-image-validation = 이미지를 읽어오지 못했습니다. 다른 URL을 시도하세요.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = 텍스트 지우기

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = 취소
newtab-topsites-delete-history-button = 기록에서 삭제
newtab-topsites-save-button = 저장
newtab-topsites-preview-button = 미리보기
newtab-topsites-add-button = 추가

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = 정말 기록에서 이 페이지의 모든 인스턴스를 삭제하시겠습니까?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = 이 작업은 취소할 수 없습니다.

## Top Sites - Sponsored label

newtab-topsite-sponsored = 스폰서

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (고정)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = 메뉴 열기
    .aria-label = 메뉴 열기
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = 삭제
    .aria-label = 삭제
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = 메뉴 열기
    .aria-label = { $title }에 대한 컨텍스트 메뉴 열기
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = 이 사이트 편집
    .aria-label = 이 사이트 편집

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = 편집
newtab-menu-open-new-window = 새 창에서 열기
newtab-menu-open-new-private-window = 새 사생활 보호 창에서 열기
newtab-menu-dismiss = 닫기
newtab-menu-pin = 고정
newtab-menu-unpin = 고정 해제
newtab-menu-delete-history = 기록에서 삭제
newtab-menu-save-to-pocket = { -pocket-brand-name }에 저장
newtab-menu-delete-pocket = { -pocket-brand-name }에서 삭제
newtab-menu-archive-pocket = { -pocket-brand-name }에 보관
newtab-menu-show-privacy-info = 우리의 스폰서와 개인 정보 보호
newtab-menu-about-fakespot = { -fakespot-brand-name } 정보
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = 신고
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = 차단
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = 팔로우 취소
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = 더 알아보기
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = 주제 팔로우 취소

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = 스폰서 콘텐츠 관리
newtab-menu-our-sponsors-and-your-privacy = 스폰서와 개인 정보 보호
newtab-menu-report-this-ad = 이 광고 신고

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = 완료
newtab-privacy-modal-button-manage = 스폰서 콘텐츠 설정 관리
newtab-privacy-modal-header = 개인 정보는 중요합니다.
newtab-privacy-modal-paragraph-2 =
    매력적인 이야기를 정리해서 보여주는 것 뿐만 아니라, 엄선된 스폰서로 부터
    관련성 높은 콘텐츠를 보여줍니다. 안심하세요. <strong>사용자의 탐색 데이터는 
    { -brand-product-name }의 개인 복사본을 남기지 않습니다</strong> — 저희와 스폰서 모두
    들여다보지 않습니다.
newtab-privacy-modal-link = 새 탭에서 개인 정보 보호 작동 방식 알아보기

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = 북마크 삭제
# Bookmark is a verb here.
newtab-menu-bookmark = 북마크

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = 다운로드 링크 복사
newtab-menu-go-to-download-page = 다운로드 페이지로 이동
newtab-menu-remove-download = 기록에서 삭제

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Finder에서 보기
       *[other] 폴더에서 보기
    }
newtab-menu-open-file = 파일 열기

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = 방문한 사이트
newtab-label-bookmarked = 북마크됨
newtab-label-removed-bookmark = 북마크 삭제됨
newtab-label-recommended = 인기
newtab-label-saved = { -pocket-brand-name }에 저장됨
newtab-label-download = 다운로드됨
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · 스폰서
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = { $sponsor } 후원
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead }분
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = 스폰서

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = 섹션 삭제
newtab-section-menu-collapse-section = 섹션 접기
newtab-section-menu-expand-section = 섹션 펼치기
newtab-section-menu-manage-section = 섹션 관리
newtab-section-menu-manage-webext = 확장 기능 관리
newtab-section-menu-add-topsite = 상위 사이트 추가
newtab-section-menu-add-search-engine = 검색 엔진 추가
newtab-section-menu-move-up = 위로 이동
newtab-section-menu-move-down = 아래로 이동
newtab-section-menu-privacy-notice = 개인정보 보호정책

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = 섹션 접기
newtab-section-expand-section-label =
    .aria-label = 섹션 펼치기

## Section Headers.

newtab-section-header-topsites = 상위 사이트
newtab-section-header-recent-activity = 최근 활동
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = { $provider } 추천
newtab-section-header-stories = 생각하게 하는 이야기
# "picks" refers to recommended articles
newtab-section-header-todays-picks = 오늘의 추천

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = 탐색을 시작하면 최근 방문하거나 북마크한 좋은 글이나 영상, 페이지를 여기에 보여줍니다.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = 다 왔습니다. { $provider }에서 제공하는 주요 기사를 다시 확인해 보세요. 기다릴 수 없습니까? 인기 주제를 선택하면 웹에서 볼 수 있는 가장 재미있는 글을 볼 수 있습니다.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = 다 왔습니다. 더 많은 이야기를 나중에 다시 확인해 보세요. 기다릴 수 없습니까? 인기 주제를 선택하면 웹에서 볼 수 있는 가장 재미있는 글을 볼 수 있습니다.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = 모두 따라 잡았습니다!
newtab-discovery-empty-section-topstories-content = 더 많은 이야기는 나중에 다시 확인해 보세요.
newtab-discovery-empty-section-topstories-try-again-button = 다시 시도
newtab-discovery-empty-section-topstories-loading = 로드 중…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = 이런! 이 섹션을 거의 다 로드했지만, 안 된 부분이 있습니다.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = 인기 주제:
newtab-pocket-new-topics-title = 더 많은 이야기를 원하세요? { -pocket-brand-name } 인기 주제 보기
newtab-pocket-more-recommendations = 더 많은 추천
newtab-pocket-learn-more = 더 알아보기
newtab-pocket-cta-button = { -pocket-brand-name } 받기
newtab-pocket-cta-text = 좋아하는 이야기를 { -pocket-brand-name }에 저장하고 재미있게 읽어 보세요.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name }은 { -brand-product-name } 제품군의 일부입니다.
newtab-pocket-save = 저장
newtab-pocket-saved = 저장됨

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = 좋아요
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = 싫어요
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = 감사합니다. 사용자의 의견은 제품 개선에 도움이 됩니다.
newtab-toast-dismiss-button =
    .title = 닫기
    .aria-label = 닫기

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = 웹의 최고를 발견하세요
newtab-pocket-onboarding-cta = { -pocket-brand-name }은 가장 유익하고 영감을 주며 신뢰할 수 있는 콘텐츠를 { -brand-product-name } 브라우저에 바로 제공하기 위해 다양한 출판물을 탐색합니다.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = 이런! 이 콘텐츠를 로드하는 중에 문제가 발생했습니다.
newtab-error-fallback-refresh-link = 페이지를 새로 고침해서 다시 시도하세요.

## Customization Menu

newtab-custom-shortcuts-title = 바로 가기
newtab-custom-shortcuts-subtitle = 저장하거나 방문한 사이트
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = 바로 가기
    .description = 저장하거나 방문한 사이트
newtab-custom-shortcuts-nova =
    .label = 바로 가기
newtab-custom-row-description =
    .description = 행 수
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
           *[other] { $num } 행
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
       *[other] { $num } 행
    }
newtab-custom-sponsored-sites = 스폰서 바로 가기
newtab-custom-pocket-title = { -pocket-brand-name } 추천
newtab-custom-pocket-subtitle = { -brand-product-name } 제품군의 일부인 { -pocket-brand-name }에서 선별한 뛰어난 콘텐츠
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = 추천 이야기
    .description = { -brand-product-name } 제품군이 선별한 뛰어난 콘텐츠
newtab-recommended-stories-toggle =
    .label = 추천 이야기
newtab-custom-stories-personalized-toggle =
    .label = 이야기
newtab-custom-stories-personalized-checkbox-label = 활동에 기반한 개인화된 이야기
newtab-custom-pocket-sponsored = 스폰서 소식
newtab-custom-pocket-show-recent-saves = 최근 저장한 항목 표시
newtab-custom-recent-title = 최근 활동
newtab-custom-recent-subtitle = 최근 사이트 및 콘텐츠 모음
newtab-custom-weather-toggle =
    .label = 날씨
    .description = 오늘의 일기예보를 한눈에 보기
newtab-custom-widget-weather-toggle =
    .label = 날씨
newtab-custom-widget-lists-toggle =
    .label = 목록
newtab-custom-widget-timer-toggle =
    .label = 타이머
newtab-custom-widget-sports-toggle =
    .label = 월드컵
newtab-custom-widget-clock-toggle =
    .label = 시계
newtab-custom-widget-sports-toggle2 =
    .label = 스포츠
newtab-custom-widget-section-title = 위젯
newtab-custom-widget-section-toggle =
    .label = 위젯
newtab-widget-manage-title = 위젯
newtab-widget-manage-widget-button =
    .label = 위젯 관리
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = 닫기
    .aria-label = 메뉴 닫기
newtab-custom-close-button = 닫기
newtab-custom-settings = 추가 설정

## New Tab Wallpapers

newtab-wallpaper-title = 배경 화면
newtab-wallpaper-reset = 기본값으로 재설정
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = 이미지 업로드
newtab-wallpaper-add-an-image = 이미지 추가
newtab-wallpaper-custom-color = 색상 선택
newtab-wallpaper-toggle-title =
    .label = 배경 화면
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = 이미지가 파일 크기 제한인 { $file_size }MB를 초과했습니다. 더 작은 파일을 업로드 해 주세요.
newtab-wallpaper-error-upload-file-type = 파일을 업로드하지 못했습니다. 이미지 파일로 다시 시도해 주세요.
newtab-wallpaper-error-file-type = 파일을 업로드하지 못했습니다. 다른 파일 형식으로 다시 시도하세요.
newtab-wallpaper-light-red-panda = 레서판다
newtab-wallpaper-light-mountain = 하얀 산
newtab-wallpaper-light-sky = 보라색과 분홍색 구름이 있는 하늘
newtab-wallpaper-light-color = 파란색, 분홍색, 노란색 모양
newtab-wallpaper-light-landscape = 파란 안개 산 풍경
newtab-wallpaper-light-beach = 야자수가 있는 해변
newtab-wallpaper-dark-aurora = 북극 오로라
newtab-wallpaper-dark-color = 빨간색과 파란색 모양
newtab-wallpaper-dark-panda = 숲속에 숨어있는 레서판다
newtab-wallpaper-dark-sky = 밤하늘이 있는 도시 풍경
newtab-wallpaper-dark-mountain = 산 풍경
newtab-wallpaper-dark-city = 보라색 도시 풍경
newtab-wallpaper-dark-fox-anniversary = 숲 근처 포장도로에 있는 여우
newtab-wallpaper-light-fox-anniversary = 안개가 자욱한 산 풍경이 있는 풀밭에 있는 여우

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = 단색
newtab-wallpaper-colors = 색상
newtab-wallpaper-blue = 파란색
newtab-wallpaper-light-blue = 하늘색
newtab-wallpaper-light-purple = 연보라색
newtab-wallpaper-light-green = 연두색
newtab-wallpaper-green = 녹색
newtab-wallpaper-beige = 베이지색
newtab-wallpaper-yellow = 노란색
newtab-wallpaper-orange = 주황색
newtab-wallpaper-pink = 분홍색
newtab-wallpaper-light-pink = 연분홍색
newtab-wallpaper-red = 빨간색
newtab-wallpaper-dark-blue = 진청색
newtab-wallpaper-dark-purple = 진보라색
newtab-wallpaper-dark-green = 진녹색
newtab-wallpaper-brown = 갈색

## Abstract

newtab-wallpaper-category-title-abstract = 추상
newtab-wallpaper-abstract-green = 녹색 모양
newtab-wallpaper-abstract-blue = 파란색 모양
newtab-wallpaper-abstract-purple = 보라색 모양
newtab-wallpaper-abstract-orange = 주황색 모양
newtab-wallpaper-gradient-orange = 주황색과 분홍색 그라데이션
newtab-wallpaper-abstract-blue-purple = 파란색과 보라색 모양
newtab-wallpaper-abstract-white-curves = 음영 곡선이 있는 흰색
newtab-wallpaper-abstract-purple-green = 보라색과 녹색 빛 그라데이션
newtab-wallpaper-abstract-blue-purple-waves = 파란색과 보라색 물결 모양
newtab-wallpaper-abstract-black-waves = 검은 물결 모양

## Firefox

newtab-wallpaper-category-title-photographs = 사진
newtab-wallpaper-beach-at-sunrise = 일출의 해변
newtab-wallpaper-beach-at-sunset = 석양의 해변
newtab-wallpaper-storm-sky = 폭풍우 하늘
newtab-wallpaper-sky-with-pink-clouds = 분홍색 구름의 하늘
newtab-wallpaper-red-panda-yawns-in-a-tree = 나무 위에서 하품하는 레서판다
newtab-wallpaper-white-mountains = 하얀 산
newtab-wallpaper-hot-air-balloons = 낮 동안 다양한 색상의 열기구
newtab-wallpaper-starry-canyon = 파란 별이 빛나는 밤
newtab-wallpaper-suspension-bridge = 낮 동안 회색 전체 현수교 사진
newtab-wallpaper-sand-dunes = 하얀 모래언덕
newtab-wallpaper-palm-trees = 골든 아워의 코코넛 야자수 실루엣
newtab-wallpaper-blue-flowers = 푸른 꽃잎이 만발한 꽃의 근접 촬영 사진
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = <a data-l10n-name="webpage-link">{ $webpage_string }</a>에 있는 <a data-l10n-name="name-link">{ $author_string }</a>의 사진
newtab-wallpaper-feature-highlight-header = 다채로운 색상 사용해보기
newtab-wallpaper-feature-highlight-content = 배경화면으로 새 탭을 산뜻하게 꾸며보세요.
newtab-wallpaper-feature-highlight-button = 확인
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = 닫기
    .aria-label = 팝업 닫기
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = 천문
newtab-wallpaper-celestial-lunar-eclipse = 월식
newtab-wallpaper-celestial-earth-night = 지구 저궤도에서 본 야간 사진
newtab-wallpaper-celestial-starry-sky = 별이 빛나는 하늘
newtab-wallpaper-celestial-eclipse-time-lapse = 월식 타임 랩스
newtab-wallpaper-celestial-black-hole = 블랙홀 은하 일러스트
newtab-wallpaper-celestial-river = 강의 인공위성 이미지

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = { $provider }의 일기예보 보기
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ 스폰서
newtab-weather-menu-change-location = 위치 변경
newtab-weather-change-location-search-input-placeholder =
    .placeholder = 위치 검색
    .aria-label = 위치 검색
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = 현재 위치 사용
newtab-weather-menu-weather-display = 날씨 표시
newtab-weather-todays-forecast = 오늘의 일기예보
newtab-weather-see-full-forecast = 전체 일기예보 보기
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = 단순
newtab-weather-menu-change-weather-display-simple = 단순 보기로 전환
newtab-weather-menu-weather-display-option-detailed = 상세
newtab-weather-menu-change-weather-display-detailed = 상세 보기로 전환
newtab-weather-menu-temperature-units = 온도 단위
newtab-weather-menu-temperature-option-fahrenheit = 화씨
newtab-weather-menu-temperature-option-celsius = 섭씨
newtab-weather-menu-change-temperature-units-fahrenheit = 화씨로 전환
newtab-weather-menu-change-temperature-units-celsius = 섭씨로 전환
newtab-weather-menu-hide-weather = 새 탭에서 날씨 숨기기
newtab-weather-menu-learn-more = 더 알아보기
newtab-weather-menu-detect-my-location = 내 위치 감지
# This message is shown if user is working offline
newtab-weather-error-not-available = 지금은 날씨 데이터를 사용할 수 없습니다.
newtab-weather-opt-in-see-weather = 현재 위치의 날씨를 보시겠습니까?
newtab-weather-opt-in-not-now =
    .label = 나중에
newtab-weather-opt-in-yes =
    .label = 예
newtab-weather-opt-in-headline = 지역 일기예보 받기
newtab-weather-opt-in-use-location =
    .label = 위치 사용
newtab-weather-opt-in-choose-location = 위치 선택
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = 뉴욕
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = 높음
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = 낮음
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = { $provider }의 일기예보 보기
    .aria-description = { $provider } ∙ 스폰서

## Topic Labels

newtab-topic-label-business = 사업
newtab-topic-label-career = 직업
newtab-topic-label-education = 교육
newtab-topic-label-arts = 연예
newtab-topic-label-food = 음식
newtab-topic-label-health = 건강
newtab-topic-label-hobbies = 게임
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = 금융
newtab-topic-label-society-parenting = 육아
newtab-topic-label-government = 정치
newtab-topic-label-education-science = 과학
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = 생활
newtab-topic-label-sports = 스포츠
newtab-topic-label-tech = 기술
newtab-topic-label-travel = 여행
newtab-topic-label-home = 홈 & 마당

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = 피드를 세부 조정하려면 주제를 선택하세요
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = 두 개 이상의 주제를 선택하세요. 전문 큐레이터가 여러분의 관심사에 맞는 이야기를 우선적으로 선정합니다. 언제든지 업데이트하세요.
newtab-topic-selection-save-button = 저장
newtab-topic-selection-cancel-button = 취소
newtab-topic-selection-button-maybe-later = 나중에요
newtab-topic-selection-privacy-link = 데이터를 보호하고 관리하는 방법 알아보기
newtab-topic-selection-button-update-interests = 관심 분야 업데이트
newtab-topic-selection-button-pick-interests = 관심 분야를 선택하세요

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = 팔로우
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = { $topic } 팔로우
newtab-section-following-button = 팔로잉
newtab-section-unfollow-button = 팔로우 취소
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = 팔로잉: { $topic } 팔로우 취소
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = 피드를 미세 조정하세요
newtab-section-follow-highlight-subtitle = 관심 분야를 팔로우하면 좋아하는 것을 더 많이 볼 수 있습니다.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = 차단
newtab-section-blocked-button = 차단됨
newtab-section-unblock-button = 차단 해제
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = { $topic } 팔로우
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = { $topic } 팔로우 취소
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = { $topic } 차단
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = { $topic } 차단 해제

## Confirmation modal for blocking a section

newtab-section-cancel-button = 나중에
newtab-section-confirm-block-topic-p1 = 정말로 이 주제를 차단하시겠습니까?
newtab-section-confirm-block-topic-p2 = 차단된 주제는 더 이상 피드에 나타나지 않습니다.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = { $topic } 차단
newtab-section-block-cancel-button = 취소

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = 주제
newtab-section-manage-topics-button-v2 =
    .label = 주제 관리
newtab-section-mangage-topics-followed-topics = 팔로우됨
newtab-section-mangage-topics-followed-topics-empty-state = 아직 주제를 팔로우하지 않았습니다.
newtab-section-mangage-topics-blocked-topics = 차단됨
newtab-section-mangage-topics-blocked-topics-empty-state = 아직 주제를 차단하지 않았습니다.
newtab-custom-wallpaper-title = 사용자 지정 배경 화면이 있습니다
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = 자신만의 배경 화면을 업로드하거나 사용자 지정 색상을 선택하여 나만의 { -brand-product-name }로 만들 수 있습니다.
newtab-custom-wallpaper-cta = 사용해 보기

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = 나만의 { -brand-product-name }를 만들 배경 화면을 선택하세요
newtab-new-user-custom-wallpaper-subtitle = 사용자 지정 배경화면과 색상으로 모든 새 탭을 내 집처럼 꾸며보세요.
newtab-new-user-custom-wallpaper-cta = 지금 사용해보기

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = 새로운 배경 화면이 방금 공개되었습니다
newtab-wallpaper-feature-highlight-subtitle = 취향에 맞는 걸 골라 모든 새 탭을 나만의 공간으로 꾸며보세요.
newtab-wallpaper-feature-highlight-cta = 배경 화면 선택

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = 모바일용 { -brand-product-name } 다운로드
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = 코드를 스캔하면 이동 중에도 안전하게 탐색할 수 있습니다.
newtab-download-mobile-highlight-body-variant-b = 탭, 비밀번호 등을 동기화할 때 중단한 부분부터 다시 시작하세요.
newtab-download-mobile-highlight-body-variant-c = 이동 중에도 { -brand-product-name }를 가져갈 수 있다는 사실을 알고 계셨나요? 같은 브라우저. 주머니에 넣고 다니세요.
newtab-download-mobile-highlight-image =
    .aria-label = 모바일용 { -brand-product-name } 다운로드를 위한 QR 코드

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = 즐겨찾기를 간편하게
newtab-shortcuts-highlight-subtitle = 바로 가기를 추가하여 한 번의 클릭으로 즐겨찾는 사이트를 이용하세요.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = 보고하는 이유?
newtab-report-ads-reason-not-interested =
    .label = 관심 없음
newtab-report-ads-reason-inappropriate =
    .label = 부적절함
newtab-report-ads-reason-seen-it-too-many-times =
    .label = 너무 많이 본 경우
newtab-report-content-wrong-category =
    .label = 잘못된 분류
newtab-report-content-outdated =
    .label = 오래됨
newtab-report-content-inappropriate-offensive =
    .label = 부적절하거나 불쾌감을 주는 내용
newtab-report-content-spam-misleading =
    .label = 스팸 또는 오해의 소지가 있는 내용
newtab-report-content-requires-payment-subscription =
    .label = 결제나 구독이 필요함
newtab-report-content-requires-payment-subscription-learn-more = 더 알아보기
newtab-report-cancel = 취소
newtab-report-submit = 보내기
newtab-toast-thanks-for-reporting =
    .message = 신고해 주셔서 감사합니다.
newtab-toast-widgets-hidden =
    .message = 언제든지 위젯을 다시 추가하려면 연필 아이콘을 선택하세요.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = { $topic } 주제를 팔로우했습니다.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = { $topic } 주제를 더 이상 팔로우하지 않습니다.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = { $topic }에 대한 이야기가 더 이상 표시되지 않습니다.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = 가능성은 무한합니다. 하나를 추가하세요.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = 신규
newtab-widget-lists-label-beta =
    .label = 베타
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = 완료 ({ $number }개)
newtab-widget-lists-celebration-headline = 잘하셨습니다
newtab-widget-lists-celebration-subhead = 모두 확인됨
newtab-widget-task-list-menu-copy = 복사
newtab-widget-lists-menu-edit = 목록 이름 편집
newtab-widget-lists-menu-edit2 =
    .aria-label = 목록 이름 편집
newtab-widget-lists-menu-create = 새 목록 만들기
newtab-widget-lists-menu-delete = 이 목록 삭제
newtab-widget-lists-menu-copy = 클립보드에 목록 복사
newtab-widget-lists-menu-learn-more = 더 알아보기
newtab-widget-lists-button-add-item = 항목 추가
newtab-widget-lists-input-add-an-item2 =
    .placeholder = 항목 추가
    .aria-label = 항목 추가
newtab-widget-lists-input-error = 항목을 추가하려면 텍스트를 포함하세요.
newtab-widget-lists-input-menu-open-link = 링크 열기
newtab-widget-lists-input-menu-move-up = 위로 이동
newtab-widget-lists-input-menu-move-down = 아래로 이동
newtab-widget-lists-input-menu-delete = 삭제
newtab-widget-lists-input-menu-edit = 편집
newtab-widget-lists-input-menu-edit2 =
    .aria-label = 항목 편집
newtab-widget-lists-edit-clear =
    .aria-label = 취소
    .title = 취소
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + 새 목록 만들기
newtab-widget-lists-name-label-default =
    .label = 작업 목록
newtab-widget-lists-name-label-checklist =
    .label = 체크리스트
newtab-widget-lists-name-placeholder-default =
    .placeholder = 작업 목록
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = 체크리스트
    .aria-label = 목록 이름 편집
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = 새 목록
    .aria-label = 목록 이름 편집
newtab-widget-section-title = 위젯
newtab-widget-menu-hide = 위젯 숨기기
newtab-widget-menu-change-size = 크기 변경
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = 이동
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = 왼쪽
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = 오른쪽
newtab-widget-size-small = 작게
newtab-widget-size-medium = 중간
newtab-widget-size-large = 크게
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = 위젯 숨기기
    .aria-label = 모든 위젯 숨기기
newtab-widget-section-maximize =
    .title = 위젯 펼치기
    .aria-label = 모든 위젯을 전체 크기로 펼치기
newtab-widget-section-minimize =
    .title = 위젯 최소화
    .aria-label = 모든 위젯을 작은 크기로 접기
newtab-widget-section-menu-button =
    .title = 위젯 메뉴
    .aria-label = 위젯 메뉴 열기
newtab-widget-add-widgets-button =
    .aria-label = 위젯 추가
    .title = 위젯 추가
newtab-widget-section-menu-manage = 위젯 관리
newtab-widget-section-menu-hide-all = 위젯 숨기기
newtab-widget-section-menu-learn-more = 더 알아보기
newtab-widget-section-feedback = 의견을 알려주세요
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = 위젯 더보기
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = 위젯 접기
newtab-widget-lists-name-default = 체크리스트

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = 타이머
newtab-widget-timer-notification-focus = 집중 시간이 다 되었습니다. 잘 하셨습니다. 휴식이 필요하신가요?
newtab-widget-timer-notification-break = 휴식 시간이 종료되었습니다. 집중할 준비가 되셨나요?
newtab-widget-timer-notification-warning = 알림 꺼짐
newtab-widget-timer-mode-focus =
    .label = 집중
newtab-widget-timer-mode-break =
    .label = 휴식
newtab-widget-timer-label-play =
    .label = 재생
newtab-widget-timer-label-pause =
    .label = 일시 중지
newtab-widget-timer-reset =
    .title = 초기화
newtab-widget-timer-menu-notifications = 알림 끄기
newtab-widget-timer-menu-notifications-on = 알림 켜기
newtab-widget-timer-menu-learn-more = 더 알아보기
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = 주요 헤드라인
newtab-daily-briefing-card-menu-dismiss = 닫기
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = { $minutes }분 전 업데이트됨
newtab-widget-message-title = 목록과 내장 타이머로 집중하기
# to-dos stands for "things to do".
newtab-widget-message-copy = 빠른 알림부터 매일 할 일 목록, 집중 세션부터 스트레칭 휴식까지 — 업무에 집중하고 시간을 준수하세요.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = 집중, 날씨 등을 한곳에서
newtab-widget-message-focus-forecasts-body = { -brand-product-name } 위젯으로 끊김 없는 하루를 보내세요. 날씨 예보를 확인하고, 할 일에 집중하며, 세계 각지의 시간을 추적할 수 있습니다.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = 나만의 { -brand-product-name } 만들기
newtab-promo-card-body-addons = 모음집에서 배경 화면을 선택하거나 나만의 배경 화면을 만드세요.
newtab-promo-card-cta-addons = 지금 사용해보기
newtab-promo-card-title = { -brand-product-name } 지원
newtab-promo-card-body = 스폰서는 더 나은 웹을 만들려는 저희를 지원합니다
newtab-promo-card-cta = 더 알아보기
newtab-promo-card-dismiss-button =
    .title = 닫기
    .aria-label = 닫기

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label = { $minutes }분 타이머 시작
newtab-widget-timer-pause-aria =
    .aria-label = 타이머 일시 중지
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label = { $minutes }분
newtab-widget-timer-decrease-min =
    .title = 1분 감소
newtab-widget-timer-increase-min =
    .title = 1분 증가
newtab-widget-timer-mode-group =
    .aria-label = 타이머 모드
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = 집중
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = 휴식
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = 타이머 숨기기
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = 잘하셨어요
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = 휴식 시간이 종료됨
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = 휴식이 필요하신가요?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = 집중할 준비가 되었나요?

##

newtab-sports-widget-menu-follow-teams = 팀 팔로우
newtab-sports-widget-menu-view-schedule = 일정 보기
newtab-sports-widget-menu-view-upcoming = 예정된 경기 보기
newtab-sports-widget-menu-view-results = 결과 보기
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = 주요 날짜
newtab-sports-widget-menu-learn-more = 더 알아보기
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = 월드컵 소식을 놓치지 마세요
newtab-sports-widget-get-updates = 라이브 경기 업데이트 등을 받으세요.
newtab-sports-widget-view-schedule =
    .label = 일정 보기
newtab-sports-widget-follow-teams =
    .label = 팀 팔로우
newtab-sports-widget-view-matches =
    .label = 경기 보기
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title = 최대 { $number }개 팀 팔로우
newtab-sports-widget-choose-wallpaper =
    .label = 배경 화면 선택
newtab-sports-widget-skip = 건너뛰기
newtab-sports-widget-search-country =
    .placeholder = 국가 검색
    .aria-label = 국가 검색
newtab-sports-widget-cancel = 취소
newtab-sports-widget-back-button =
    .aria-label = 뒤로
newtab-sports-widget-done-button =
    .label = 완료
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (탈락)
newtab-sports-widget-view-all =
    .label = 모두 보기
newtab-sports-widget-show-less =
    .label = 접기
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = 팔로우한 팀만
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = 시청
    .title = 라이브 시청
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = 라이브 시청
    .title = 라이브 시청
newtab-sports-widget-watch-dialog-close =
    .aria-label = 닫기
    .title = 닫기
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = 무료
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = 무료 체험
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = 무료 및 유료
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = 유료
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = 일부 경기만 제공
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = 내 지역에서 사용 가능
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = 기타 지역
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = 스트림 열기
    .title = 스트림 열기
newtab-sports-widget-group-stage = 조별 예선
newtab-sports-widget-group-a = A 그룹
newtab-sports-widget-group-b = B 그룹
newtab-sports-widget-group-c = C 그룹
newtab-sports-widget-group-d = D 그룹
newtab-sports-widget-group-e = E 그룹
newtab-sports-widget-group-f = F 그룹
newtab-sports-widget-group-g = G 그룹
newtab-sports-widget-group-h = H 그룹
newtab-sports-widget-group-i = I 그룹
newtab-sports-widget-group-j = J 그룹
newtab-sports-widget-group-k = K 그룹
newtab-sports-widget-group-l = L 그룹
newtab-sports-widget-round-32 = 32강
newtab-sports-widget-round-16 = 16강
newtab-sports-widget-quarter-finals = 8강
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = 라이브
newtab-custom-widget-live-refresh =
    .title = 점수 새로 고침
    .aria-label = 점수 새로 고침
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = 주요 날짜
newtab-sports-widget-upcoming = 예정된 경기
# Used for a match currently ongoing
newtab-sports-widget-now = 지금
newtab-sports-widget-results = 결과
newtab-sports-widget-semi-finals = 준결승
newtab-sports-widget-bronze-finals = 동메달 결정전
# Final is the final match for 1st place.
newtab-sports-widget-final = 결승
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = 지연됨
newtab-sports-widget-postponed = 연기됨
newtab-sports-widget-suspended = 중단됨
newtab-sports-widget-cancelled = 취소됨
newtab-sports-widget-information = 경기 정보
newtab-sports-widget-no-live-data = 현재 라이브 경기 데이터가 업데이트되지 않고 있습니다
newtab-sports-widget-view-results-link = 결과 보기
newtab-sports-widget-third-place = 3위
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = 준우승
newtab-sports-widget-champions = 우승팀
newtab-sports-widget-world-cup-champions = 2026년 월드컵 우승팀
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = 경기 종료
newtab-sports-widget-match-halftime = 하프타임
newtab-sports-widget-match-extra-time = 연장전
newtab-sports-widget-match-penalties = 페널티
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = vs
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = 향후 경기 정보를 기대해 주세요

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = 이전
    .title = 이전
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = 다음
    .title = 다음
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = 라이브 경기 { $index } / { $total }
    .title = 라이브 경기 { $index } / { $total }

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
    .aria-label = { $homeTeam }, { $homeScore } 대 { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) 대 { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = 라이브: { $homeTeam }, { $homeScore } 대 { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } 대 { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } 대 { $awayTeam }, 지연됨
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } 대 { $awayTeam }, 연기됨
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } 대 { $awayTeam }, 일시 중단됨
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } 대 { $awayTeam }, 취소됨

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = 보스니아 헤르체코비나
newtab-sports-widget-team-name-label-civ =
    .label = 코트디브아르
newtab-sports-widget-team-name-label-cod =
    .label = 콩고 민주공화국
newtab-sports-widget-team-name-label-eng =
    .label = 잉글랜드
newtab-sports-widget-team-name-label-sco =
    .label = 스코틀랜드
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = 미정

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = 새로운 배경 화면으로 월드컵을 시작하세요
newtab-sports-widget-message-wallpapers-body = 토너먼트 기간 동안 브라우저에 경기 날의 생생한 열기를 더해 보세요.
newtab-sports-widget-message-wallpapers-cta = 배경 화면 선택
newtab-sports-widget-message-add-widgets-cta =
    .label = 위젯 추가
newtab-sports-widget-message-day-in-play-title = { -brand-product-name } 위젯으로 활기를 되찾으세요
newtab-sports-widget-message-day-in-play-body = 월드컵 소식을 확인하고, 할 일에 집중하며, 세계 각지의 시간을 확인하는 등 다양한 기능을 만나보세요.
newtab-sports-widget-message-explore-widgets-cta =
    .label = 위젯 살펴보기

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = 닫기
    .aria-label = 닫기
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = 이 공간을 나만의 공간으로 만들기
newtab-activation-window-message-customization-focus-message = 새로운 배경 화면을 선택하고, 즐겨찾는 사이트에 대한 바로 가기를 추가하고, 관심 있는 최신 뉴스를 받아보세요.
newtab-activation-window-message-customization-focus-primary-button =
    .label = 맞춤 설정 시작
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = 이 공간은 유연하고 사용자 정의가 가능합니다
newtab-activation-window-message-values-focus-message = { -brand-product-name }는 사용자가 원하는 방식으로 탐색할 수 있게 해주며, 온라인에서 하루를 시작하는 더 개인화된 방법을 제공합니다. 나만의 { -brand-product-name }를 만드세요.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = 시계 숨기기
newtab-clock-widget-menu-learn-more = 더 알아보기
newtab-clock-widget-menu-edit = 시계 편집
newtab-clock-widget-menu-switch-to-12h = 12시간제로 전환
newtab-clock-widget-menu-switch-to-24h = 24시간제로 전환
newtab-clock-widget-label-your-clocks = 나만의 시계
newtab-clock-widget-search-location-input =
    .label = 위치
    .placeholder = 도시 검색
    .aria-label = 도시 검색
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = 별명 (선택 사항)
    .placeholder = 별명 추가
    .aria-label = 별명 (선택 사항)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = 새 시계 추가
    .aria-label = 새 시계 추가
newtab-clock-widget-button-add-clock = 추가
newtab-clock-widget-button-cancel = 취소
newtab-clock-widget-button-back =
    .title = 뒤로
    .aria-label = 뒤로
newtab-clock-widget-button-edit-clock =
    .title = 시계 편집
    .aria-label = 시계 편집
newtab-clock-widget-button-save = 저장
newtab-clock-widget-button-remove-clock =
    .title = 시계 제거
    .aria-label = 시계 제거
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
    .aria-label = { $city }, 별명: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = 시계 추가
newtab-clock-widget-edit-clock-form =
    .aria-label = 시계 편집
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = 검색 결과
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = 일치 결과 없음
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = 시계 메뉴 열기
    .aria-label = 시계 메뉴 열기
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Nickname: { $nickname }
