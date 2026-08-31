/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef GECKO_TRACE_SPAN_EVENT_H
#define GECKO_TRACE_SPAN_EVENT_H

#include "nsVariant.h"

namespace mozilla::gecko_trace {

using string_view = std::string_view;

using AttributeValue =
    Variant<bool, int64_t, string_view, mozilla::Span<const bool>,
            mozilla::Span<const int64_t>, mozilla::Span<const string_view>>;

// Note: Consider adding a mechanism to prevent manual implementation of
// this interface for types.
class SpanEvent {
 public:
  virtual ~SpanEvent() = default;

  /**
   * Iterate overall key-value pairs in this event.
   *
   * Calls the provided callback function for each attribute set in this event
   * instance. The iteration includes attributes from parent classes if this
   * event inherits from other events.
   *
   * @param `aCallback` Function to call for each key-value pair.
   *                  Should return true to continue iteration, false to stop.
   * @return true if all callbacks returned true, false if any returned false
   */
  virtual bool ForEachKeyValue(
      std::function<bool(string_view, AttributeValue)> aCallback) const = 0;

  /**
   * Get the name identifier for this trace event.
   *
   * Returns the string identifier used to categorize and filter this event
   * type in trace collection and analysis tools.
   *
   * @return String view containing the event name
   */
  virtual string_view GetEventName() const = 0;

  /**
   * Get the total number of attributes this event can contain.
   *
   * Returns the count of all possible attributes, including those inherited
   * from parent event classes.
   *
   * @return Total attribute count
   */
  virtual size_t Size() const = 0;

#ifdef GECKO_TRACE_ENABLE
  void Emit();
#else
  constexpr void Emit() {};
#endif
};

}  // namespace mozilla::gecko_trace

#endif  // GECKO_TRACE_SPAN_EVENT_H
