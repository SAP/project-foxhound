/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "PerformanceMainThread.h"
#include "PerformanceNavigation.h"
#include "PerformancePaintTiming.h"
#include "jsapi.h"
#include "js/GCAPI.h"
#include "js/PropertyAndElement.h"  // JS_DefineProperty
#include "mozilla/HoldDropJSObjects.h"
#include "PerformanceEventTiming.h"
#include "LargestContentfulPaint.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/Event.h"
#include "mozilla/dom/EventCounts.h"
#include "mozilla/dom/PerformanceEventTimingBinding.h"
#include "mozilla/dom/PerformanceNavigationTiming.h"
#include "mozilla/dom/PerformanceResourceTiming.h"
#include "mozilla/dom/PerformanceTiming.h"
#include "mozilla/StaticPrefs_dom.h"
#include "mozilla/StaticPrefs_privacy.h"
#include "mozilla/PresShell.h"
#include "nsIChannel.h"
#include "nsIHttpChannel.h"
#include "nsIDocShell.h"
#include "nsTextFrame.h"
#include "nsContainerFrame.h"

namespace mozilla::dom {

extern mozilla::LazyLogModule gLCPLogging;

namespace {

void GetURLSpecFromChannel(nsITimedChannel* aChannel, nsAString& aSpec) {
  aSpec.AssignLiteral("document");

  nsCOMPtr<nsIChannel> channel = do_QueryInterface(aChannel);
  if (!channel) {
    return;
  }

  nsCOMPtr<nsIURI> uri;
  nsresult rv = channel->GetURI(getter_AddRefs(uri));
  if (NS_WARN_IF(NS_FAILED(rv)) || !uri) {
    return;
  }

  nsAutoCString spec;
  rv = uri->GetSpec(spec);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return;
  }

  CopyUTF8toUTF16(spec, aSpec);
}

}  // namespace

NS_IMPL_CYCLE_COLLECTION_CLASS(PerformanceMainThread)

NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN_INHERITED(PerformanceMainThread,
                                                Performance)
  NS_IMPL_CYCLE_COLLECTION_UNLINK(
      mTiming, mNavigation, mDocEntry, mFCPTiming, mEventTimingEntries,
      mLargestContentfulPaintEntries, mFirstInputEvent, mPendingPointerDown,
      mPendingEventTimingEntries, mEventCounts)
  tmp->mImageLCPEntryMap.Clear();
  tmp->mTextFrameUnions.Clear();
  mozilla::DropJSObjects(tmp);
NS_IMPL_CYCLE_COLLECTION_UNLINK_END

NS_IMPL_CYCLE_COLLECTION_TRAVERSE_BEGIN_INHERITED(PerformanceMainThread,
                                                  Performance)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE(
      mTiming, mNavigation, mDocEntry, mFCPTiming, mEventTimingEntries,
      mLargestContentfulPaintEntries, mFirstInputEvent, mPendingPointerDown,
      mPendingEventTimingEntries, mEventCounts, mImageLCPEntryMap,
      mTextFrameUnions)

NS_IMPL_CYCLE_COLLECTION_TRAVERSE_END

NS_IMPL_CYCLE_COLLECTION_TRACE_BEGIN_INHERITED(PerformanceMainThread,
                                               Performance)
  NS_IMPL_CYCLE_COLLECTION_TRACE_JS_MEMBER_CALLBACK(mMozMemory)
NS_IMPL_CYCLE_COLLECTION_TRACE_END

NS_IMPL_ADDREF_INHERITED(PerformanceMainThread, Performance)
NS_IMPL_RELEASE_INHERITED(PerformanceMainThread, Performance)

// QueryInterface implementation for PerformanceMainThread
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(PerformanceMainThread)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY_AMBIGUOUS(nsISupports, EventTarget)
NS_INTERFACE_MAP_END_INHERITING(Performance)

PerformanceMainThread::PerformanceMainThread(nsPIDOMWindowInner* aWindow,
                                             nsDOMNavigationTiming* aDOMTiming,
                                             nsITimedChannel* aChannel)
    : Performance(aWindow->AsGlobal()),
      mDOMTiming(aDOMTiming),
      mChannel(aChannel) {
  MOZ_ASSERT(aWindow, "Parent window object should be provided");
  if (StaticPrefs::dom_enable_event_timing()) {
    mEventCounts = new class EventCounts(GetParentObject());
  }
  CreateNavigationTimingEntry();

  if (StaticPrefs::dom_enable_largest_contentful_paint()) {
    nsCOMPtr<nsPIDOMWindowInner> owner = GetOwner();
    MarkerInnerWindowId innerWindowID =
        owner ? MarkerInnerWindowId(owner->WindowID())
              : MarkerInnerWindowId::NoId();
    // There might be multiple LCP entries and we only care about the latest one
    // which is also the biggest value. That's why we need to record these
    // markers in two different places:
    // - During the Document unload, so we can record the closed pages.
    // - During the profile capture, so we can record the open pages.
    // We are capturing the second one here.
    // Our static analysis doesn't allow capturing ref-counted pointers in
    // lambdas, so we need to hide it in a uintptr_t. This is safe because this
    // lambda will be destroyed in ~PerformanceMainThread().
    uintptr_t self = reinterpret_cast<uintptr_t>(this);
    profiler_add_state_change_callback(
        // Using the "Pausing" state as "GeneratingProfile" profile happens too
        // late; we can not record markers if the profiler is already paused.
        ProfilingState::Pausing,
        [self, innerWindowID](ProfilingState aProfilingState) {
          const PerformanceMainThread* selfPtr =
              reinterpret_cast<const PerformanceMainThread*>(self);

          selfPtr->GetDOMTiming()->MaybeAddLCPProfilerMarker(innerWindowID);
        },
        self);
  }
}

PerformanceMainThread::~PerformanceMainThread() {
  profiler_remove_state_change_callback(reinterpret_cast<uintptr_t>(this));
  mozilla::DropJSObjects(this);
}

void PerformanceMainThread::GetMozMemory(JSContext* aCx,
                                         JS::MutableHandle<JSObject*> aObj) {
  if (!mMozMemory) {
    JS::Rooted<JSObject*> mozMemoryObj(aCx, JS_NewPlainObject(aCx));
    JS::Rooted<JSObject*> gcMemoryObj(aCx, js::gc::NewMemoryInfoObject(aCx));
    if (!mozMemoryObj || !gcMemoryObj) {
      MOZ_CRASH("out of memory creating performance.mozMemory");
    }
    if (!JS_DefineProperty(aCx, mozMemoryObj, "gc", gcMemoryObj,
                           JSPROP_ENUMERATE)) {
      MOZ_CRASH("out of memory creating performance.mozMemory");
    }
    mMozMemory = mozMemoryObj;
    mozilla::HoldJSObjects(this);
  }

  aObj.set(mMozMemory);
}

PerformanceTiming* PerformanceMainThread::Timing() {
  if (!mTiming) {
    // For navigation timing, the third argument (an nsIHttpChannel) is null
    // since the cross-domain redirect were already checked.  The last
    // argument (zero time) for performance.timing is the navigation start
    // value.
    mTiming = new PerformanceTiming(this, mChannel, nullptr,
                                    mDOMTiming->GetNavigationStart());
  }

  return mTiming;
}

void PerformanceMainThread::DispatchBufferFullEvent() {
  RefPtr<Event> event = NS_NewDOMEvent(this, nullptr, nullptr);
  // it bubbles, and it isn't cancelable
  event->InitEvent(u"resourcetimingbufferfull"_ns, true, false);
  event->SetTrusted(true);
  DispatchEvent(*event);
}

PerformanceNavigation* PerformanceMainThread::Navigation() {
  if (!mNavigation) {
    mNavigation = new PerformanceNavigation(this);
  }

  return mNavigation;
}

/**
 * An entry should be added only after the resource is loaded.
 * This method is not thread safe and can only be called on the main thread.
 */
void PerformanceMainThread::AddEntry(nsIHttpChannel* channel,
                                     nsITimedChannel* timedChannel) {
  MOZ_ASSERT(NS_IsMainThread());

  nsAutoString initiatorType;
  nsAutoString entryName;

  UniquePtr<PerformanceTimingData> performanceTimingData(
      PerformanceTimingData::Create(timedChannel, channel, 0, initiatorType,
                                    entryName));
  if (!performanceTimingData) {
    return;
  }
  AddRawEntry(std::move(performanceTimingData), initiatorType, entryName);
}

void PerformanceMainThread::AddEntry(const nsString& entryName,
                                     const nsString& initiatorType,
                                     UniquePtr<PerformanceTimingData>&& aData) {
  AddRawEntry(std::move(aData), initiatorType, entryName);
}

void PerformanceMainThread::AddRawEntry(UniquePtr<PerformanceTimingData> aData,
                                        const nsAString& aInitiatorType,
                                        const nsAString& aEntryName) {
  // The PerformanceResourceTiming object will use the PerformanceTimingData
  // object to get all the required timings.
  auto entry =
      MakeRefPtr<PerformanceResourceTiming>(std::move(aData), this, aEntryName);
  entry->SetInitiatorType(aInitiatorType);
  InsertResourceEntry(entry);
}

void PerformanceMainThread::SetFCPTimingEntry(PerformancePaintTiming* aEntry) {
  MOZ_ASSERT(aEntry);
  if (!mFCPTiming) {
    mFCPTiming = aEntry;
    QueueEntry(aEntry);
  }
}

void PerformanceMainThread::InsertEventTimingEntry(
    PerformanceEventTiming* aEventEntry) {
  mPendingEventTimingEntries.insertBack(aEventEntry);

  if (mHasQueuedRefreshdriverObserver) {
    return;
  }

  PresShell* presShell = GetPresShell();
  if (!presShell) {
    return;
  }

  nsPresContext* presContext = presShell->GetPresContext();
  if (!presContext) {
    return;
  }

  // Using PostRefreshObserver is fine because we don't
  // run any JS between the `mark paint timing` step and the
  // `pending Event Timing entries` step. So mixing the order
  // here is fine.
  mHasQueuedRefreshdriverObserver = true;
  presContext->RegisterManagedPostRefreshObserver(
      new ManagedPostRefreshObserver(
          presContext, [performance = RefPtr<PerformanceMainThread>(this)](
                           bool aWasCanceled) {
            if (!aWasCanceled) {
              // XXX Should we do this even if canceled?
              performance->DispatchPendingEventTimingEntries();
            }
            performance->mHasQueuedRefreshdriverObserver = false;
            return ManagedPostRefreshObserver::Unregister::Yes;
          }));
}

void PerformanceMainThread::BufferEventTimingEntryIfNeeded(
    PerformanceEventTiming* aEventEntry) {
  if (mEventTimingEntries.Length() < kDefaultEventTimingBufferSize) {
    mEventTimingEntries.AppendElement(aEventEntry);
  }
}

void PerformanceMainThread::BufferLargestContentfulPaintEntryIfNeeded(
    LargestContentfulPaint* aEntry) {
  MOZ_ASSERT(StaticPrefs::dom_enable_largest_contentful_paint());
  if (mLargestContentfulPaintEntries.Length() <
      kMaxLargestContentfulPaintBufferSize) {
    mLargestContentfulPaintEntries.AppendElement(aEntry);
  }
}

void PerformanceMainThread::DispatchPendingEventTimingEntries() {
  DOMHighResTimeStamp renderingTime = NowUnclamped();

  while (!mPendingEventTimingEntries.isEmpty()) {
    RefPtr<PerformanceEventTiming> entry =
        mPendingEventTimingEntries.popFirst();

    entry->SetDuration(renderingTime - entry->RawStartTime());
    IncEventCount(entry->GetName());

    if (entry->RawDuration() >= kDefaultEventTimingMinDuration) {
      QueueEntry(entry);
    }

    if (!mHasDispatchedInputEvent) {
      switch (entry->GetMessage()) {
        case ePointerDown: {
          mPendingPointerDown = entry->Clone();
          mPendingPointerDown->SetEntryType(u"first-input"_ns);
          break;
        }
        case ePointerUp: {
          if (mPendingPointerDown) {
            MOZ_ASSERT(!mFirstInputEvent);
            mFirstInputEvent = mPendingPointerDown.forget();
            QueueEntry(mFirstInputEvent);
            SetHasDispatchedInputEvent();
          }
          break;
        }
        case eMouseClick:
        case eKeyDown:
        case eMouseDown: {
          mFirstInputEvent = entry->Clone();
          mFirstInputEvent->SetEntryType(u"first-input"_ns);
          QueueEntry(mFirstInputEvent);
          SetHasDispatchedInputEvent();
          break;
        }
        default:
          break;
      }
    }
  }
}

DOMHighResTimeStamp PerformanceMainThread::GetPerformanceTimingFromString(
    const nsAString& aProperty) {
  // ::Measure expects the values returned from this function to be passed
  // through ReduceTimePrecision already.
  if (!IsPerformanceTimingAttribute(aProperty)) {
    return 0;
  }
  // Values from Timing() are already reduced
  if (aProperty.EqualsLiteral("redirectStart")) {
    return Timing()->RedirectStart();
  }
  if (aProperty.EqualsLiteral("redirectEnd")) {
    return Timing()->RedirectEnd();
  }
  if (aProperty.EqualsLiteral("fetchStart")) {
    return Timing()->FetchStart();
  }
  if (aProperty.EqualsLiteral("domainLookupStart")) {
    return Timing()->DomainLookupStart();
  }
  if (aProperty.EqualsLiteral("domainLookupEnd")) {
    return Timing()->DomainLookupEnd();
  }
  if (aProperty.EqualsLiteral("connectStart")) {
    return Timing()->ConnectStart();
  }
  if (aProperty.EqualsLiteral("secureConnectionStart")) {
    return Timing()->SecureConnectionStart();
  }
  if (aProperty.EqualsLiteral("connectEnd")) {
    return Timing()->ConnectEnd();
  }
  if (aProperty.EqualsLiteral("requestStart")) {
    return Timing()->RequestStart();
  }
  if (aProperty.EqualsLiteral("responseStart")) {
    return Timing()->ResponseStart();
  }
  if (aProperty.EqualsLiteral("responseEnd")) {
    return Timing()->ResponseEnd();
  }
  // Values from GetDOMTiming() are not.
  DOMHighResTimeStamp retValue;
  if (aProperty.EqualsLiteral("navigationStart")) {
    // DOMHighResTimeStamp is in relation to navigationStart, so this will be
    // zero.
    retValue = GetDOMTiming()->GetNavigationStart();
  } else if (aProperty.EqualsLiteral("unloadEventStart")) {
    retValue = GetDOMTiming()->GetUnloadEventStart();
  } else if (aProperty.EqualsLiteral("unloadEventEnd")) {
    retValue = GetDOMTiming()->GetUnloadEventEnd();
  } else if (aProperty.EqualsLiteral("domLoading")) {
    retValue = GetDOMTiming()->GetDomLoading();
  } else if (aProperty.EqualsLiteral("domInteractive")) {
    retValue = GetDOMTiming()->GetDomInteractive();
  } else if (aProperty.EqualsLiteral("domContentLoadedEventStart")) {
    retValue = GetDOMTiming()->GetDomContentLoadedEventStart();
  } else if (aProperty.EqualsLiteral("domContentLoadedEventEnd")) {
    retValue = GetDOMTiming()->GetDomContentLoadedEventEnd();
  } else if (aProperty.EqualsLiteral("domComplete")) {
    retValue = GetDOMTiming()->GetDomComplete();
  } else if (aProperty.EqualsLiteral("loadEventStart")) {
    retValue = GetDOMTiming()->GetLoadEventStart();
  } else if (aProperty.EqualsLiteral("loadEventEnd")) {
    retValue = GetDOMTiming()->GetLoadEventEnd();
  } else {
    MOZ_CRASH(
        "IsPerformanceTimingAttribute and GetPerformanceTimingFromString are "
        "out "
        "of sync");
  }
  return nsRFPService::ReduceTimePrecisionAsMSecs(
      retValue, GetRandomTimelineSeed(), mRTPCallerType);
}

void PerformanceMainThread::InsertUserEntry(PerformanceEntry* aEntry) {
  MOZ_ASSERT(NS_IsMainThread());

  nsAutoCString uri;
  double markCreationEpoch = 0;

  if (StaticPrefs::dom_performance_enable_user_timing_logging() ||
      StaticPrefs::dom_performance_enable_notify_performance_timing()) {
    nsresult rv = NS_ERROR_FAILURE;
    nsCOMPtr<nsPIDOMWindowInner> owner = GetOwner();
    if (owner && owner->GetDocumentURI()) {
      rv = owner->GetDocumentURI()->GetHost(uri);
    }

    if (NS_FAILED(rv)) {
      // If we have no URI, just put in "none".
      uri.AssignLiteral("none");
    }

    // PR_Now() returns a signed 64-bit integer. Since it represents a
    // timestamp, only ~32-bits will represent the value which should safely fit
    // into a double.
    markCreationEpoch = static_cast<double>(PR_Now() / PR_USEC_PER_MSEC);

    if (StaticPrefs::dom_performance_enable_user_timing_logging()) {
      Performance::LogEntry(aEntry, uri);
    }
  }

  if (StaticPrefs::dom_performance_enable_notify_performance_timing()) {
    TimingNotification(aEntry, uri, markCreationEpoch);
  }

  Performance::InsertUserEntry(aEntry);
}

TimeStamp PerformanceMainThread::CreationTimeStamp() const {
  return GetDOMTiming()->GetNavigationStartTimeStamp();
}

DOMHighResTimeStamp PerformanceMainThread::CreationTime() const {
  return GetDOMTiming()->GetNavigationStart();
}

void PerformanceMainThread::CreateNavigationTimingEntry() {
  MOZ_ASSERT(!mDocEntry, "mDocEntry should be null.");

  if (!StaticPrefs::dom_enable_performance_navigation_timing()) {
    return;
  }

  nsAutoString name;
  GetURLSpecFromChannel(mChannel, name);

  UniquePtr<PerformanceTimingData> timing(
      new PerformanceTimingData(mChannel, nullptr, 0));

  nsCOMPtr<nsIHttpChannel> httpChannel = do_QueryInterface(mChannel);
  if (httpChannel) {
    timing->SetPropertiesFromHttpChannel(httpChannel, mChannel);
  }

  mDocEntry = new PerformanceNavigationTiming(std::move(timing), this, name);
}

void PerformanceMainThread::UpdateNavigationTimingEntry() {
  if (!mDocEntry) {
    return;
  }

  // Let's update some values.
  nsCOMPtr<nsIHttpChannel> httpChannel = do_QueryInterface(mChannel);
  if (httpChannel) {
    mDocEntry->UpdatePropertiesFromHttpChannel(httpChannel, mChannel);
  }
}

void PerformanceMainThread::QueueNavigationTimingEntry() {
  if (!mDocEntry) {
    return;
  }

  UpdateNavigationTimingEntry();

  QueueEntry(mDocEntry);
}

void PerformanceMainThread::QueueLargestContentfulPaintEntry(
    LargestContentfulPaint* aEntry) {
  MOZ_ASSERT(StaticPrefs::dom_enable_largest_contentful_paint());
  QueueEntry(aEntry);
}

EventCounts* PerformanceMainThread::EventCounts() {
  MOZ_ASSERT(StaticPrefs::dom_enable_event_timing());
  return mEventCounts;
}

void PerformanceMainThread::GetEntries(
    nsTArray<RefPtr<PerformanceEntry>>& aRetval) {
  aRetval = mResourceEntries.Clone();
  aRetval.AppendElements(mUserEntries);

  if (mDocEntry) {
    aRetval.AppendElement(mDocEntry);
  }

  if (mFCPTiming) {
    aRetval.AppendElement(mFCPTiming);
  }
  aRetval.Sort(PerformanceEntryComparator());
}

void PerformanceMainThread::GetEntriesByType(
    const nsAString& aEntryType, nsTArray<RefPtr<PerformanceEntry>>& aRetval) {
  RefPtr<nsAtom> type = NS_Atomize(aEntryType);
  if (type == nsGkAtoms::navigation) {
    aRetval.Clear();

    if (mDocEntry) {
      aRetval.AppendElement(mDocEntry);
    }
    return;
  }

  if (type == nsGkAtoms::paint) {
    if (mFCPTiming) {
      aRetval.AppendElement(mFCPTiming);
      return;
    }
  }

  if (type == nsGkAtoms::firstInput && mFirstInputEvent) {
    aRetval.AppendElement(mFirstInputEvent);
    return;
  }

  Performance::GetEntriesByType(aEntryType, aRetval);
}
void PerformanceMainThread::GetEntriesByTypeForObserver(
    const nsAString& aEntryType, nsTArray<RefPtr<PerformanceEntry>>& aRetval) {
  if (aEntryType.EqualsLiteral("event")) {
    aRetval.AppendElements(mEventTimingEntries);
    return;
  }

  if (StaticPrefs::dom_enable_largest_contentful_paint()) {
    if (aEntryType.EqualsLiteral("largest-contentful-paint")) {
      aRetval.AppendElements(mLargestContentfulPaintEntries);
      return;
    }
  }

  return GetEntriesByType(aEntryType, aRetval);
}

void PerformanceMainThread::GetEntriesByName(
    const nsAString& aName, const Optional<nsAString>& aEntryType,
    nsTArray<RefPtr<PerformanceEntry>>& aRetval) {
  Performance::GetEntriesByName(aName, aEntryType, aRetval);

  if (mFCPTiming && mFCPTiming->GetName()->Equals(aName) &&
      (!aEntryType.WasPassed() ||
       mFCPTiming->GetEntryType()->Equals(aEntryType.Value()))) {
    aRetval.AppendElement(mFCPTiming);
    return;
  }

  // The navigation entry is the first one. If it exists and the name matches,
  // let put it in front.
  if (mDocEntry && mDocEntry->GetName()->Equals(aName)) {
    aRetval.InsertElementAt(0, mDocEntry);
    return;
  }
}

mozilla::PresShell* PerformanceMainThread::GetPresShell() {
  nsIGlobalObject* ownerGlobal = GetOwnerGlobal();
  if (!ownerGlobal) {
    return nullptr;
  }
  if (Document* doc = ownerGlobal->GetAsInnerWindow()->GetExtantDoc()) {
    return doc->GetPresShell();
  }
  return nullptr;
}

void PerformanceMainThread::IncEventCount(const nsAtom* aType) {
  MOZ_ASSERT(StaticPrefs::dom_enable_event_timing());

  // This occurs when the pref was false when the performance
  // object was first created, and became true later. It's
  // okay to return early because eventCounts is not exposed.
  if (!mEventCounts) {
    return;
  }

  ErrorResult rv;
  uint64_t count = EventCounts_Binding::MaplikeHelpers::Get(
      mEventCounts, nsDependentAtomString(aType), rv);
  MOZ_ASSERT(!rv.Failed());
  EventCounts_Binding::MaplikeHelpers::Set(
      mEventCounts, nsDependentAtomString(aType), ++count, rv);
  MOZ_ASSERT(!rv.Failed());
}

size_t PerformanceMainThread::SizeOfEventEntries(
    mozilla::MallocSizeOf aMallocSizeOf) const {
  size_t eventEntries = 0;
  for (const PerformanceEventTiming* entry : mEventTimingEntries) {
    eventEntries += entry->SizeOfIncludingThis(aMallocSizeOf);
  }
  return eventEntries;
}

void PerformanceMainThread::ProcessElementTiming() {
  if (!StaticPrefs::dom_enable_largest_contentful_paint()) {
    return;
  }
  const bool shouldLCPDataEmpty =
      HasDispatchedInputEvent() || HasDispatchedScrollEvent();
  MOZ_ASSERT_IF(shouldLCPDataEmpty,
                mTextFrameUnions.IsEmpty() && mImageLCPEntryMap.IsEmpty());

  if (shouldLCPDataEmpty) {
    return;
  }

  nsPresContext* presContext = GetPresShell()->GetPresContext();
  MOZ_ASSERT(presContext);

  // After https://github.com/w3c/largest-contentful-paint/issues/104 is
  // resolved, LargestContentfulPaint and FirstContentfulPaint should
  // be using the same timestamp, which should be the same timestamp
  // as to what https://w3c.github.io/paint-timing/#mark-paint-timing step 2
  // defines.
  // TODO(sefeng): Check the timestamp after this issue is resolved.
  TimeStamp rawNowTime = presContext->GetMarkPaintTimingStart();

  MOZ_ASSERT(GetOwnerGlobal());
  Document* document = GetOwnerGlobal()->GetAsInnerWindow()->GetExtantDoc();
  if (!document ||
      !nsContentUtils::GetInProcessSubtreeRootDocument(document)->IsActive()) {
    return;
  }

  nsTArray<ImagePendingRendering> imagesPendingRendering =
      std::move(mImagesPendingRendering);
  for (const auto& imagePendingRendering : imagesPendingRendering) {
    RefPtr<Element> element = imagePendingRendering.GetElement();
    if (!element) {
      continue;
    }

    MOZ_ASSERT(imagePendingRendering.mLoadTime <= rawNowTime);
    if (imgRequestProxy* requestProxy =
            imagePendingRendering.GetImgRequestProxy()) {
      LCPHelpers::CreateLCPEntryForImage(
          this, element, requestProxy, imagePendingRendering.mLoadTime,
          rawNowTime, imagePendingRendering.mLCPImageEntryKey);
    }
  }

  MOZ_ASSERT(mImagesPendingRendering.IsEmpty());
}

void PerformanceMainThread::FinalizeLCPEntriesForText() {
  nsPresContext* presContext = GetPresShell()->GetPresContext();
  MOZ_ASSERT(presContext);

  bool canFinalize = StaticPrefs::dom_enable_largest_contentful_paint() &&
                     !presContext->HasStoppedGeneratingLCP();
  nsTHashMap<nsRefPtrHashKey<Element>, nsRect> textFrameUnion =
      std::move(GetTextFrameUnions());
  if (canFinalize) {
    for (const auto& textFrameUnion : textFrameUnion) {
      LCPHelpers::FinalizeLCPEntryForText(
          this, presContext->GetMarkPaintTimingStart(), textFrameUnion.GetKey(),
          textFrameUnion.GetData(), presContext);
    }
  }
  MOZ_ASSERT(GetTextFrameUnions().IsEmpty());
}

void PerformanceMainThread::StoreImageLCPEntry(
    Element* aElement, imgRequestProxy* aImgRequestProxy,
    LargestContentfulPaint* aEntry) {
  mImageLCPEntryMap.InsertOrUpdate({aElement, aImgRequestProxy}, aEntry);
}

already_AddRefed<LargestContentfulPaint>
PerformanceMainThread::GetImageLCPEntry(Element* aElement,
                                        imgRequestProxy* aImgRequestProxy) {
  Maybe<RefPtr<LargestContentfulPaint>> entry =
      mImageLCPEntryMap.Extract({aElement, aImgRequestProxy});
  if (entry.isNothing()) {
    return nullptr;
  }

  Document* doc = aElement->GetComposedDoc();
  MOZ_ASSERT(doc, "Element should be connected when it's painted");

  Maybe<LCPImageEntryKey>& contentIdentifier =
      entry.value()->GetLCPImageEntryKey();
  if (contentIdentifier.isSome()) {
    doc->ContentIdentifiersForLCP().EnsureRemoved(contentIdentifier.value());
    contentIdentifier.reset();
  }

  return entry.value().forget();
}

bool PerformanceMainThread::UpdateLargestContentfulPaintSize(double aSize) {
  if (aSize > mLargestContentfulPaintSize) {
    mLargestContentfulPaintSize = aSize;
    return true;
  }
  return false;
}

void PerformanceMainThread::SetHasDispatchedScrollEvent() {
  mHasDispatchedScrollEvent = true;
  ClearGeneratedTempDataForLCP();
}

void PerformanceMainThread::SetHasDispatchedInputEvent() {
  mHasDispatchedInputEvent = true;
  ClearGeneratedTempDataForLCP();
}

void PerformanceMainThread::ClearGeneratedTempDataForLCP() {
  mTextFrameUnions.Clear();
  mImageLCPEntryMap.Clear();
  mImagesPendingRendering.Clear();

  nsIGlobalObject* ownerGlobal = GetOwnerGlobal();
  if (!ownerGlobal) {
    return;
  }

  if (Document* document = ownerGlobal->GetAsInnerWindow()->GetExtantDoc()) {
    document->ContentIdentifiersForLCP().Clear();
  }
}
}  // namespace mozilla::dom
