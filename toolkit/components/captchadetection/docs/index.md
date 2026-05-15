# Firefox’s CAPTCHA Detection

## Introduction

Firefox can collect information about the rate of CAPTCHAs that users come across. This allows us to run experiments with new privacy features with confidence that they do not regress the user experience through an increased rate of CAPTCHAs. To get there, we record the type of CAPTCHA, number of occurrences, how it was solved, and whether it was completed successfully.

## Implementation Details

In short, we use JSWindowActors and network interception to track the states of known CAPTCHAs. We then use Glean to record metrics into the separate ping CAPTCHA-detection. Finally, we then send the ping roughly every 24 hours. The implementation is located at [toolkit/components/captchadetection](https://searchfox.org/mozilla-central/source/toolkit/components/captchadetection) directory.

We only [enable the actor for CAPTCHA provider URLs](https://searchfox.org/mozilla-central/rev/dbef1a2f75798fb0136b7428d959c8feb09ad5d1/toolkit/modules/ActorManagerParent.sys.mjs#249-284). This allows us to not consume a lot of resources. This method, however, also restricts us to tracking only CAPTCHAs that embed themselves in an iframe. This is not the case for all CAPTCHAs, for example GeeTest.

### Document Counting

To be able to say simple statements like “.5% of page loads have a CAPTCHA (we detect)” we need the denominator. To record this we count pages loaded (actually destroyed) [the same way we count this metric for use counters](https://searchfox.org/mozilla-central/rev/475c968d00995daab9fc257f683c7815c4345cb4/dom/ipc/WindowGlobalParent.cpp#1179-1186). The reason we have our own separate metric  from use counters is because of the ping schedule. We send our CAPTCHA-detection ping on a different schedule from use-counter ping. For more information about the ping schedule see [here](#ping-submission-schedule).

### User Settings/Configuration

A big factor in CAPTCHA rates (we theorized at time of development) was understanding the differences based on browser settings.  Accordingly, we decided to collect user settings with each ping. These preferences include your ETP Mode, your Cookie Settings, and similar preferences \- for more detailed information, see [here](#labels-in-the-dashboard---formatting-of-prefsofinterest).

We also segment the data, separating normal browsing mode and private browsing mode.

Whenever we reference statistics relating to CAPTCHAs it’s important to know the mode (Normal or PBM) and settings (ETP Standard, etc) you are referencing.  For sample statistics in this document we are using Normal browsing mode with ETP Standard.

### JS Actor Entry

Currently, we track 5 CAPTCHA providers: [Google reCAPTCHA V2, Cloudflare Turnstile, Datadome, hCAPTCHA, and ArkoseLabs FunCAPTCHA](https://searchfox.org/mozilla-central/rev/ac81a39dfe0663eb40a34c7c36d89e34be29cb20/toolkit/modules/ActorManagerParent.sys.mjs#261-280). To reduce complexity, we define different kinds of handlers. [`#initCAPTCHAHandler`](https://searchfox.org/mozilla-central/rev/dbef1a2f75798fb0136b7428d959c8feb09ad5d1/toolkit/components/captchadetection/CaptchaDetectionChild.sys.mjs#483-490) goes through the list of handlers, letting the handlers’ static `matches` function decide if an instance of that handler should be created or not.

### CAPTCHA Specific Handlers

All detection actors inherit from the `CAPTCHAHandler` class. It defines two functions, `matches` and `updateState`. The `matches` function, as described above, is used to determine if the handler can handle the given document/CAPTCHA type. For example, Google reCAPTCHA V2 checks if the document’s URL starts with `https://www.google.com/reCAPTCHA/api2/`. UpdateState function is just a convenience function for communicating with the parent actor. It adds some additional information the parent expects to receive for common operations. Other than these two functions, `CAPTCHAHandler` class also stores a reference to the JSWindowActor. The rest of the implementation details are up to the specific handler/concrete class.

#### Google reCAPTCHA v2

reCAPTCHA v2 presents itself as a checkbox associated with an action a user would like to do, such as comment on an article.  The user checks the box, reCAPTCHA decides whether or not you look like a bot, and it will either autocomplete and check the box *or* present you with a puzzle (i.e. select all the boxes with traffic lights) to solve. After successfully solving the puzzle, it will then check the box. reCAPTCHA seems to be primarily used in conjunction with a form for a specific action a user wants to take.

It uses two iframes. One for the challenge and one for the checkmark. We create a child actor for each one of them. Upon construction, the actor creates a mutation observer. The checkmark actor waits for the checkmark to be checked. The challenge actor waits for it to become visible. If we observe a checkmark without observing a challenge, that means we autocompleted. If we observe a challenge and later observe a checkmark, that means the user had to complete a puzzle. The parent keeps the state for each tab. When the challenge becomes visible, we update the state to [ImagesShown](https://searchfox.org/mozilla-central/rev/60f924edfedc19cd16a30251053513c08bba149c/toolkit/components/captchadetection/CaptchaDetectionChild.sys.mjs#144) for the tab[^1] and increment the puzzle shown metric by one. When the checkmark becomes checked, we increment either the auto or manually completed metric and clear the state for the tab. We also clear the tab state, when the page is unloaded.

While we could, in theory, record how many times a CAPTCHA is *present* \- this metric is not *that* useful.  Just because a CAPTCHA is present on a page is not evidence a user has interacted with it.  It could be a CAPTCHA used as part of a comment form at the bottom of an article that the user never even sees.  We do actually collect this metric (google\_reCAPTCHA\_v2\_oc) but we don’t consider it to be that useful.

Thus, for Google reCAPTCHA v2 we have four metrics:

1. [CAPTCHALoaded](https://searchfox.org/mozilla-central/rev/60f924edfedc19cd16a30251053513c08bba149c/toolkit/components/captchadetection/metrics.yaml#24)[^2] \- the number of times we detected this CAPTCHA type (see note above)
2. [AutoComplete](https://searchfox.org/mozilla-central/rev/60f924edfedc19cd16a30251053513c08bba149c/toolkit/components/captchadetection/metrics.yaml#72) \- the number of times the CAPTCHA box was interacted with and the puzzle was autocompleted without showing a puzzle
3. [ImagesShown](https://searchfox.org/mozilla-central/rev/60f924edfedc19cd16a30251053513c08bba149c/toolkit/components/captchadetection/metrics.yaml#40) \- the number of times a user interacts with the CAPTCHA, it does not autocomplete, and the user sees the puzzle
4. [ManuallyCompleted](https://searchfox.org/mozilla-central/rev/60f924edfedc19cd16a30251053513c08bba149c/toolkit/components/captchadetection/metrics.yaml#56) \- the number of times the puzzle was manually completed

As of writing, data suggests that:

- 59.5%[^3] of challenges completed get auto completed (AutoComplete / (AutoComplete \+ ManuallyCompleted))
- 1.13% of pages that have a CAPTCHA actually get interacted with ((AutoComplete \+ ManuallyCompleted) / CAPTCHALoaded)
- 0.1% of pages have a CAPTCHA a user interacts with ((AutoComplete \+ ManuallyCompleted) / PagesLoaded)
- 8.5% of pages have a CAPTCHA of this type (CAPTCHALoaded / PagesLoaded)

#### Cloudflare Turnstile

Turnstile presents itself as a checkbox as well. Unlike Google reCAPTCHA v2, there’s no visible challenge. It only evaluates bot-likeness based on browser and user properties. Since there’s no puzzle, we only record whether the challenge failed or not. Turnstile may present itself as a full page interstitial or as an individual challenge on forms etc.

Cloudflare Turnstile runs inside a closed shadow root, because of that the handler uses two mutation observers, but only one at any given time. Upon construction, we check if the closed shadow root is already present, if not, we place a mutation observer. The first mutation observer waits until the closed shadow root is placed. Once we detect the shadow root, we create another observer for the shadow root and stop observing with the first observer. We then simply check the very conveniently id’ed “fail” and “success” elements’ visibility. When we detect a change in their visibility, we notify the parent and record failure or success.

Thus, for Cloudflare Turnstile we have three metrics:

1. [CAPTCHALoaded](https://searchfox.org/mozilla-central/rev/60f924edfedc19cd16a30251053513c08bba149c/toolkit/components/captchadetection/metrics.yaml#88) \- the number of times we detected this CAPTCHA type, which does not mean the user interacted with it
2. [SuccessfulCompletion](https://searchfox.org/mozilla-central/rev/60f924edfedc19cd16a30251053513c08bba149c/toolkit/components/captchadetection/metrics.yaml#104) \- the number of times challenge was successfully completed
3. [FailedCompletion](https://searchfox.org/mozilla-central/rev/60f924edfedc19cd16a30251053513c08bba149c/toolkit/components/captchadetection/metrics.yaml#120) \- the number of times challenge was failed

As of writing, data suggests that:

- 98.7% of challenges completed get successfully completed (SuccessfulCompletion / (SuccessfulCompletion \+ FailedCompletion))
- 39.1% of pages that have a CAPTCHA actually get interacted with ((SuccessfulCompletion \+ FailedCompletion) / CAPTCHALoaded)
- 2.1% of pages have a CAPTCHA a user interacts with ((SuccessfulCompletion \+ FailedCompletion) / PagesLoaded)
- 5.2% of pages have a CAPTCHA of this type (CAPTCHALoaded / PagesLoaded)

#### Datadome

Datadome presents itself as a puzzle. Unlike other CAPTCHAs, the only variant I came across was a full interstitial page, and not an embedded widget. It requires the user to slide a puzzle piece into the image. After completing the puzzle, the user either gets blocked, or is automatically redirected to the page.

**One important thing to consider** when interpreting the data is, Datadome CAPTCHA only presents itself for low-trust clients (browser \+ network). So, if it shows up, it is highly likely you will be blocked. Etsy.com for example uses Datadome, but it will never show up if your client doesn’t have bot-like behaviour. So, block rates are way higher than all the other CAPTCHAs.

Datadome runs in an iframe, but it communicates the result to the embedding page. So we listen for message events and parse them. We track three states/events for it, namely, load/puzzle shown, blocked load, and puzzle completed. When we detect any of these events, we notify the parent and record metrics.

Due to it being an interstitial CAPTCHA, consistently getting Datadome CAPTCHA is hard (so far only using Tor proxy with RFP enabled worked) and testing/developing a detection actor is hard due to its reproducibility.

Thus, for Datadome we have four metrics:

1. [CAPTCHALoaded](https://searchfox.org/mozilla-central/rev/60f924edfedc19cd16a30251053513c08bba149c/toolkit/components/captchadetection/metrics.yaml#138) \- the number of times we detected this CAPTCHA type, which does not mean the user interacted with it. This includes the blocked page. E.g. a user sees a captcha, gets blocked, gets redirected to the blocked page. This interaction counts as 2 loads.
2. [PuzzleShown](https://searchfox.org/mozilla-central/rev/60f924edfedc19cd16a30251053513c08bba149c/toolkit/components/captchadetection/metrics.yaml#154) \- the number of times we detected the visible puzzle
3. [Blocked](https://searchfox.org/mozilla-central/rev/60f924edfedc19cd16a30251053513c08bba149c/toolkit/components/captchadetection/metrics.yaml#170) \- the number of times the user was blocked. Do note that a frustrated user could try to refresh to page and get the same blocked page potentially incrementing the blocked counter multiple times)
4. [PuzzleCompleted](https://searchfox.org/mozilla-central/rev/60f924edfedc19cd16a30251053513c08bba149c/toolkit/components/captchadetection/metrics.yaml#186) \- the number of times the CAPTCHA was completed. Do note that this doesn’t guarantee not being blocked. You may be blocked even after a successful completion

As of writing, data suggests that:

- 48.3% of challenges get completed (PuzzleCompleted / PuzzleShown)
- 99.1% of CAPTCHA loads show puzzle (PuzzleShown / (CAPTCHALoaded \- Blocked))
- No more than 66.5% of completed challenges end up blocked (Blocked / PuzzleCompleted)
- 0.000603% of pages blocked (Blocked / PagesLoaded)
- 0.000906% of pages have a CAPTCHA a user interacts with (PuzzleCompleted / PagesLoaded)
- 0.002492% of pages have this type of CAPTCHA (CaptchaLoaded / PagesLoaded)

We used “no more” for certain metrics here because as previously mentioned, once a user is blocked and they refresh the page, we’ll increment the blocked counter again despite the user actually completing the challenge once.

#### hCAPTCHA

hCAPTCHA is very similar to Google reCAPTCHA v2. It also presents itself as a checkbox. Upon clicking, the user will either complete a puzzle, or will get a checkmark automatically.

hCAPTCHA uses two iframes, one for the checkmark and one for the puzzle. Upon construction, the actor determines the type of the frame, and places a mutation observer. Each frame then communicates with the parent to keep the state of the tab for the puzzle shown and completeness status. Once we receive a checkmark, we record whether it was completed automatically or manually. Once the tab is closed, we reset the state for the tab.

Thus, for hCAPTCHA we have four metrics:

1. [CAPTCHALoaded](https://searchfox.org/mozilla-central/rev/60f924edfedc19cd16a30251053513c08bba149c/toolkit/components/captchadetection/metrics.yaml#202) \- the number of times we detected this CAPTCHA type, which does not mean the user interacted with it
2. [PuzzleShown](https://searchfox.org/mozilla-central/rev/60f924edfedc19cd16a30251053513c08bba149c/toolkit/components/captchadetection/metrics.yaml#218) \- the number of times we detected the visible puzzle
3. [AutoCompleted](https://searchfox.org/mozilla-central/rev/60f924edfedc19cd16a30251053513c08bba149c/toolkit/components/captchadetection/metrics.yaml#250) \- the number of times the CAPTCHA was automatically completed
4. [ManuallyCompleted](https://searchfox.org/mozilla-central/rev/60f924edfedc19cd16a30251053513c08bba149c/toolkit/components/captchadetection/metrics.yaml#234) \- the number of times the puzzle was manually completed

As of writing, data suggests that:

- 54.4% of challenges completed get auto completed (AutoComplete / (AutoComplete \+ ManuallyCompleted))
- 12% of pages that have a CAPTCHA actually get interacted with ((AutoComplete \+ ManuallyCompleted) / CAPTCHALoaded)
- 0.02% of pages have a CAPTCHA a user interacts with ((AutoComplete \+ ManuallyCompleted) / PagesLoaded)
- 0.144% of pages have a CAPTCHA of this type (CAPTCHALoaded / PagesLoaded)

#### ArkoseLabs FunCAPTCHA

ArkoseLabs FunCAPTCHA shows itself after an interaction. Once visible, the CAPTCHA will ask you to rotate an object on the right side in the direction of the hand on the right side. It can ask you to do it multiple times before completing the CAPTCHA. After submitting, it will decide whether you passed or not.

Implementation-wise ArkoseLabs is the most different handler. Once we detect the frame, we ask the parent to monitor network requests. The parent then places an observer to the `http-on-examine-response` event. The observer checks if the request is initiated from the frame and if the hardcoded API url matches the request url. If it is a match, we add a listener, and decode the http response. After decoding the response, we check for the expected keys in the API response. If they are present, we update the state until we receive a solution. Once we receive a solution, we record the number of solutions provided before getting a checkmark.

Thus, for ArkoseLabs FunCAPTCHA we have four metrics:

1. [CAPTCHALoaded](https://searchfox.org/mozilla-central/rev/60f924edfedc19cd16a30251053513c08bba149c/toolkit/components/captchadetection/metrics.yaml#266) \- the number of times we detected this CAPTCHA type.  Similar to reCAPTCHA and hCAPTCHA this metric is somewhat misleading because the CAPTCHA might be on the bottom of a page and never even seen by the user.
2. [SuccessfulCompletion](https://searchfox.org/mozilla-central/rev/60f924edfedc19cd16a30251053513c08bba149c/toolkit/components/captchadetection/metrics.yaml#298) \- the number of times challenge was successfully completed
3. [FailedCompletion](https://searchfox.org/mozilla-central/rev/60f924edfedc19cd16a30251053513c08bba149c/toolkit/components/captchadetection/metrics.yaml#314) \- the number of times challenge was failed
4. [SolutionsRequired](https://searchfox.org/mozilla-central/rev/60f924edfedc19cd16a30251053513c08bba149c/toolkit/components/captchadetection/metrics.yaml#330) \- the number of solutions required before submission

As of writing, data suggests that:

- 54.6% of challenges get interacted with ((SuccessfulCompletion \+ FailedCompletion) / CAPTCHALoaded)
- 88% of completed challenges are completed successfully (SuccessfulCompletion / (SuccessfulCompletion \+ FailedCompletion))
- Requires 1.4 solutions on average before completion (AVG(SolutionsRequired))
- 0.001733% of pages have a this type of CAPTCHA a user interacts with ((SuccessfulCompletion \+ FailedCompletion) / PagesLoaded)
- 0.003176% of pages have a this type of CAPTCHA (CAPTCHALoaded / PagesLoaded)

### Ping Submission Schedule

CAPTCHADetectionPingUtils.sys.mjs file is responsible for the submission of the ping. We submit the ping in three different ways.

1. When a user launches the browser, we will call *maybeSubmitPing*.
2. When a user interacts with a CAPTCHA, depending on the event and the type of CAPTCHA, we may call *maybeSubmitPing*.
3. When a user changes one of the [“prefsOfInterest”](https://searchfox.org/mozilla-central/rev/dbef1a2f75798fb0136b7428d959c8feb09ad5d1/toolkit/components/captchadetection/CaptchaDetectionPingUtils.sys.mjs#151-196), we will call *flushPing*.

*maybeSubmitPing* takes a bool `setHasUnsubmittedDataFlag`. If it is true, we set `HasUnsubmittedDataFlag`  to true. Next, we check if it has been more than 24 hours ± 17 minutes[^4] since `lastSubmission`. If it has been more than that, then we will call *flushPing.*

*flushPing* can be called from two locations. One of them, as described above, is from *maybeSubmitPing*. The other location is pref change observer for prefs in *prefsOfInterest*. The function checks  if `HasUnsubmittedDataFlag` is false and returns if it is. It will then submit the ping, set `HasUnsubmittedDataFlag`  to false, and update `lastSubmission`.

## Metrics Collected Summary

The CAPTCHA metrics listed above are also presented in this table. We also follow [a specific naming schema](https://searchfox.org/mozilla-central/rev/ac81a39dfe0663eb40a34c7c36d89e34be29cb20/toolkit/components/captchadetection/metrics.yaml#12-20).

| Type | Success Type | Failure Type | CAPTCHALoaded | PuzzleShown |
| :---: | :---: | :---: | :---: | :---: |
| Google reCAPTCHA v2 | Auto completion (googleReCAPTCHAV2Ac) | Manual Puzzle Completion (googleReCAPTCHAV2Pc) | googleReCAPTCHAV2O  | googleReCAPTCHAV2Ps |
| Cloudflare Turnstile | Challenge succeeded (cloudflareTurnstileCc) | Challenge failed (cloudflareTurnstileCf) | cloudflareTurnstileOc |  |
| Datadome | Puzzle passed (datadomePc) | Blocked (datadomeBl) | datadomeOc  | datadomePs |
| hCAPTCHA | Auto completion (hCAPTCHAAc) | Manual puzzle completion (hCAPTCHAPc) | hCAPTCHAOc  | hCAPTCHAPs |
| ArkoseLabs FunCAPTCHA | Puzzle completed successfully (arkoselabsPc) | Puzzle failed (arkoselabsPf) | arkoselabsOc | **Other**: solutions required (arkoselabsSolutionsRequired) |

## Redash Dashboard and Queries

Currently, we have a one large dashboard that contains all the CAPTCHA types for desktop and mobile, and for all the *prefsOfInterest*. The link to the dashboard is [https://sql.telemetry.mozilla.org/dashboard/captcha-detection](https://sql.telemetry.mozilla.org/dashboard/captcha-detection).

### Labels in the dashboard \- Formatting of prefsOfInterest

You may notice weird numbers in the table labels. Mostly 01s but other numbers too. These numbers are from the *prefsOfInterest* we collect with our ping. As described above, we collect 11 prefs in total, 10 of which are boolean prefs and the remaining one is an integer pref. To visualize data per preference combination, we turn these into a key. The key is made up by turning trues into 1s and falses into 0s, and leaving integers as is.
Later, in a switch case, we label known preference configurations, so instead of 00010010115, we use “Standard.” However, users use many different configurations, and naming all of them is hard. We could encode everything as X Pref On \+ Y Pref Off \+ Z Pref Off… but it would be a very long label and wouldn’t be any better than 01s. Known configurations make up most of our users too. So, we leave out some of them as keys because labeling them simply doesn’t make sense. Here’s the prefs we currently collect:

* network\_cookie\_cookiebehavior\_optinpartitioning
* network\_cookie\_cookiebehavior\_optinpartitioning\_pbm
* privacy\_fingerprintingprotection
* privacy\_fingerprintingprotection\_pbm
* privacy\_resistfingerprinting
* privacy\_resistfingerprinting\_pbmode
* privacy\_trackingprotection\_cryptomining\_enabled
* privacy\_trackingprotection\_enabled
* privacy\_trackingprotection\_fingerprinting\_enabled
* privacy\_trackingprotection\_pbm\_enabled
* network\_cookie\_cookiebehavior: This is the integer pref. [The meaning of each value](https://searchfox.org/mozilla-central/rev/0fe159e3c1a09d9cd22b0ceadbe01efc7e8fd788/netwerk/cookie/nsICookieService.idl#73-81):
  * 0 \= allow all cookies
  * 1 \= reject all third-party cookies
  * 2 \= reject all cookies
  * 3 \= reject third-party cookies unless the eTLD already has at least one cookie
  * 4 \= reject trackers
  * 5 \= reject trackers, partition third-party cookies

### SQL Queries Used in the Dashboard

As we have multiple CAPTCHA types, all SQL queries end up with very repetitive pieces. For that reason, we use a script to generate SQL queries. The script used [can be found here](https://gist.github.com/FKLC/a87c89684e9400a222fc93ed14323613). Here are some common things you might want to do and how to do them:

* Adding a new pref to prefsOfInterest
  * Add it to GROUP\_BY
  * Add it to KEY\_METRICS. If you don’t have a very specific reason, you should add it at the end or beginning of the array. This way, performing the next step will be much easier and less error prone.
  * Update keyWithKnownSettings. You should add the pref value for each known setting configuration. For example, if you introduce pref X, and pref X is false in cases A, B, and C, you should add 0 to those cases, and if it is true for cases D, E, F,  then you should add 1 to those cases. Where you place this new value depends on the previous step. If you placed your new pref at the beginning of the array, you should add to the beginning of the label, and vice versa.
* Adding a new CAPTCHA type
  * In [Metrics Collected Summary](#metrics-collected-summary), we defined success- and failure-like metrics. Since we have lots of them we use an array named RATIO\_LIKE\_METRICS. Simply add your success- and failure-like metric for the new CAPTCHA, and it should create a ratio-like metric.
* Changing date range and granularity
  * You may update TIMESERIES\_GRANULARITY and LAST\_N to play with date range and granularity.

### Graph Colors

In the dashboard, there are 54 graphs. 54 graphs times the number of different prefsOfInterest configurations is a very large number. There is no API to color these graphs manually, so I wrote a script that you run in the browser console of the STMO page that will set the colors for a graph. The script [can be found here](https://gist.github.com/FKLC/26a8d58327d76bc893274ac0d12eac7b).

### Finding All Queries Regarding CAPTCHA Detection

We tag all queries related to CAPTCHA detection with the tag “CAPTCHA-detection”. Unfortunately, Redash currently doesn’t support links to tags (see [here for progress](https://github.com/getredash/redash/issues/3197)). So, we can’t provide a link to the CAPTCHA-detection tag. Instead, follow these short steps

1. Visit [https://sql.telemetry.mozilla.org/queries](https://sql.telemetry.mozilla.org/queries) for queries and [https://sql.telemetry.mozilla.org/dashboards](https://sql.telemetry.mozilla.org/dashboards) for dashboards
2. Hit CTRL+F
3. Type “CAPTCHA-detection” (without the quotes)
4. You should see a link on the right side of the page
5. Click on it
6. Scroll back up. That's it\!

## Data Notes

This section details some various wonderings we have had as we analyzed the data.

* “XX% of pages have a CAPTCHA”
  * Let’s consider this question for a given mode and setting (Normal and ETP Standard).
  * Do you arrive at this value by summing all the CAPTCHAs of all the users and dividing by all the pages of all the users?  X \= (C1 \+ C2 \+ C3 \+ …) / (P1 \+ P2 \+ P3 \+ …)
  * Or do you arrive at it by averaging the percentages of all the users?  X \= ((C1 / P1) \+ … \+ (CN / PN)) / N.
  * When we compare these methods we get XXX for the first and YYY for the second.
* Is there a statistically significant difference in success/failure rates of CAPTCHAs between Standard (00010010115) and Strict (00110011115) in normal browsing?
* Is there a statistically significant difference in success/failure rates of CAPTCHAs between normal and private browsing in standard?

## Other Notes

* Previous, outdated [implementation notes](https://docs.google.com/document/d/1WVEJgYCWXJVhrXQlYWXWSBNumj_xS3dp49B2gZ0mh90/edit?usp=sharing).

[^1]:  This means that if for some reason there are more than one Google reCAPTCHA v2 on the page, and if the user interacts with one of them, gets a puzzle, doesn't complete it, clicks on another and gets auto-completion, we’ll record it as manual completion. While we can store the key for the CAPTCHA, we just hope this behaviour isn’t very common.

[^2]:  Note that links to metrics link to the normal browsing mode metric; the pbm version of the metric is lower in the file.

[^3]:  See [here to see](https://sql.telemetry.mozilla.org/queries/108535) how we got these numbers

[^4]:  See [this comment](https://searchfox.org/mozilla-central/rev/60f924edfedc19cd16a30251053513c08bba149c/toolkit/components/captchadetection/CaptchaDetectionPingUtils.sys.mjs#69-76) for why 17 minutes if you’re curious.
