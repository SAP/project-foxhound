/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_glean_GleanEvent_h
#define mozilla_glean_GleanEvent_h

#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/Record.h"
#include "mozilla/glean/bindings/EventGIFFTMap.h"
#include "mozilla/glean/bindings/GleanMetric.h"
#include "mozilla/glean/fog_ffi_generated.h"
#include "mozilla/ResultVariant.h"

#include "nsString.h"
#include "nsTArray.h"

namespace mozilla::dom {
// forward declaration
struct GleanEventRecord;
}  // namespace mozilla::dom

namespace mozilla::glean {

// forward declaration
class GleanEvent;

namespace impl {

/**
 * Represents the recorded data for a single event
 */
struct RecordedEvent {
 public:
  uint64_t mTimestamp;
  nsCString mCategory;
  nsCString mName;

  nsTArray<std::tuple<nsCString, nsCString>> mExtra;
};

template <class T>
class EventMetric {
  friend class mozilla::glean::GleanEvent;

 public:
  constexpr explicit EventMetric(uint32_t id) : mId(id) {}

  /**
   * Record an event.
   *
   * @param aExtras The list of (extra key, value) pairs. Allowed extra keys are
   *                defined in the metric definition.
   *                If the wrong keys are used or values are too large
   *                an error is report and no event is recorded.
   */
  void Record(const Maybe<T>& aExtras = Nothing()) const {
    auto id = EventIdForMetric(mId);
    if (id) {
      // NB. In case `aExtras` is filled we call `ToFfiExtra`, causing
      // twice the required allocation. We could be smarter and reuse the data.
      // But this is GIFFT-only allocation, so wait to be told it's a problem.
      Maybe<CopyableTArray<Telemetry::EventExtraEntry>> telExtras;
      Maybe<nsCString> telValue;
      if (aExtras) {
        CopyableTArray<Telemetry::EventExtraEntry> extras;
        auto serializedExtras = aExtras->ToFfiExtra();
        auto keys = std::move(std::get<0>(serializedExtras));
        auto values = std::move(std::get<1>(serializedExtras));
        for (size_t i = 0; i < keys.Length(); i++) {
          if (keys[i].EqualsLiteral("value")) {
            telValue = Some(values[i]);
            continue;
          }
          extras.EmplaceBack(Telemetry::EventExtraEntry{keys[i], values[i]});
        }
        telExtras = Some(extras);
      }
      Telemetry::RecordEvent(id.extract(), telValue, telExtras);
    }
    if (aExtras) {
      auto extra = aExtras->ToFfiExtra();
      fog_event_record(mId, &std::get<0>(extra), &std::get<1>(extra));
    } else {
      nsTArray<nsCString> keys;
      nsTArray<nsCString> vals;
      fog_event_record(mId, &keys, &vals);
    }
  }

  /**
   * **Test-only API**
   *
   * Get a list of currently stored events for this event metric.
   *
   * This function will attempt to await the last parent-process task (if any)
   * writing to the the metric's storage engine before returning a value.
   * This function will not wait for data from child processes.
   *
   * This doesn't clear the stored value.
   * Parent process only. Panics in child processes.
   *
   * @param aPingName The (optional) name of the ping to retrieve the metric
   *        for. Defaults to the first value in `send_in_pings`.
   *
   * @return value of the stored metric, or Nothing() if there is no value.
   */
  Result<Maybe<nsTArray<RecordedEvent>>, nsCString> TestGetValue(
      const nsACString& aPingName = nsCString()) const {
    nsCString err;
    if (fog_event_test_get_error(mId, &err)) {
      return Err(err);
    }

    if (!fog_event_test_has_value(mId, &aPingName)) {
      return Maybe<nsTArray<RecordedEvent>>();
    }

    nsTArray<FfiRecordedEvent> events;
    fog_event_test_get_value(mId, &aPingName, &events);

    nsTArray<RecordedEvent> result;
    for (const auto& event : events) {
      auto ev = result.AppendElement();
      ev->mTimestamp = event.timestamp;
      ev->mCategory.Append(event.category);
      ev->mName.Assign(event.name);

      MOZ_ASSERT(event.extras.Length() % 2 == 0);
      ev->mExtra.SetCapacity(event.extras.Length() / 2);
      for (unsigned int i = 0; i < event.extras.Length(); i += 2) {
        // keys & values are interleaved.
        nsCString key = std::move(event.extras[i]);
        nsCString value = std::move(event.extras[i + 1]);
        ev->mExtra.AppendElement(
            std::make_tuple(std::move(key), std::move(value)));
      }
    }
    return Some(std::move(result));
  }

 private:
  static const nsCString ExtraStringForKey(uint32_t aKey);

  const uint32_t mId;
};

}  // namespace impl

struct NoExtraKeys {
  std::tuple<nsTArray<nsCString>, nsTArray<nsCString>> ToFfiExtra() const {
    nsTArray<nsCString> extraKeys;
    nsTArray<nsCString> extraValues;
    return std::make_tuple(std::move(extraKeys), std::move(extraValues));
  }
};

class GleanEvent final : public GleanMetric {
 public:
  explicit GleanEvent(uint32_t id, nsISupports* aParent)
      : GleanMetric(aParent), mEvent(id) {}

  virtual JSObject* WrapObject(
      JSContext* aCx, JS::Handle<JSObject*> aGivenProto) override final;

  void Record(const dom::Optional<dom::Record<nsCString, nsCString>>& aExtra);

  void TestGetValue(const nsACString& aPingName,
                    dom::Nullable<nsTArray<dom::GleanEventRecord>>& aResult,
                    ErrorResult& aRv);

 private:
  virtual ~GleanEvent() = default;

  const impl::EventMetric<NoExtraKeys> mEvent;
};

}  // namespace mozilla::glean

#endif /* mozilla_glean_GleanEvent.h */
