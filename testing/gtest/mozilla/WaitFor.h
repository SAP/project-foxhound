/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef TESTING_GTEST_MOZILLA_WAITFOR_H_
#define TESTING_GTEST_MOZILLA_WAITFOR_H_

#include "MediaEventSource.h"
#include "mozilla/media/MediaUtils.h"
#include "mozilla/Maybe.h"
#include "mozilla/MozPromise.h"
#include "mozilla/SpinEventLoopUntil.h"

namespace mozilla {

/**
 * Waits for an occurrence of aEvent on the current thread (by blocking it,
 * except tasks added to the event loop may run) and returns the event's
 * templated value, if it's non-void.
 *
 * The caller must be wary of eventloop issues, in
 * particular cases where we rely on a stable state runnable, but there is never
 * a task to trigger stable state. In such cases it is the responsibility of the
 * caller to create the needed tasks, as JS would. A noteworthy API that relies
 * on stable state is MediaTrackGraph::GetInstance.
 */
template <ListenerPolicy Lp, typename First, typename... Rest>
inline auto WaitFor(MediaEventSourceImpl<Lp, First, Rest...>& aEvent) {
  constexpr size_t num_params = 1 + sizeof...(Rest);
  using Storage =
      std::conditional_t<num_params == 1, First, std::tuple<First, Rest...>>;
  Maybe<Storage> value;
  MediaEventListener listener = aEvent.Connect(
      AbstractThread::GetCurrent(), [&value](First&& aFirst, Rest&&... aRest) {
        if constexpr (num_params == 1) {
          value = Some<Storage>(std::forward<First>(aFirst));
        } else {
          value = Some<Storage>(
              {std::forward<First>(aFirst), std::forward<Rest...>(aRest...)});
        }
      });
  SpinEventLoopUntil<ProcessFailureBehavior::IgnoreAndContinue>(
      "WaitFor(MediaEventSource<T>& aEvent)"_ns,
      [&] { return value.isSome(); });
  listener.Disconnect();
  return value.value();
}

/**
 * Specialization of WaitFor<T> for void.
 */
template <ListenerPolicy Lp>
inline void WaitFor(MediaEventSourceImpl<Lp, void>& aEvent) {
  bool done = false;
  MediaEventListener listener =
      aEvent.Connect(AbstractThread::GetCurrent(), [&] { done = true; });
  SpinEventLoopUntil<ProcessFailureBehavior::IgnoreAndContinue>(
      "WaitFor(MediaEventSource<void>& aEvent)"_ns, [&] { return done; });
  listener.Disconnect();
}

/**
 * Variant of WaitFor that blocks the caller until a MozPromise has either been
 * resolved or rejected.
 */
template <typename R, typename E, bool Exc>
inline Result<R, E> WaitFor(const RefPtr<MozPromise<R, E, Exc>>& aPromise) {
  Maybe<R> success;
  Maybe<E> error;
  aPromise->Then(
      GetCurrentSerialEventTarget(), __func__,
      [&](R aResult) { success = Some(aResult); },
      [&](E aError) { error = Some(aError); });
  SpinEventLoopUntil<ProcessFailureBehavior::IgnoreAndContinue>(
      "WaitFor(const RefPtr<MozPromise<R, E, Exc>>& aPromise)"_ns,
      [&] { return success.isSome() || error.isSome(); });
  if (success.isSome()) {
    return success.extract();
  }
  return Err(error.extract());
}

/**
 * A variation of WaitFor that takes a callback to be called each time aEvent is
 * raised. Blocks the caller until the callback function returns true.
 */
template <ListenerPolicy Lp, typename... Args, typename CallbackFunction>
inline void WaitUntil(MediaEventSourceImpl<Lp, Args...>& aEvent,
                      CallbackFunction&& aF) {
  bool done = false;
  MediaEventListener listener =
      aEvent.Connect(AbstractThread::GetCurrent(), [&](Args... aValue) {
        if (!done) {
          done = aF(std::forward<Args>(aValue)...);
        }
      });
  SpinEventLoopUntil<ProcessFailureBehavior::IgnoreAndContinue>(
      "WaitUntil(MediaEventSource<Args...>& aEvent, CallbackFunction&& aF)"_ns,
      [&] { return done; });
  listener.Disconnect();
}

template <typename... Args>
using TakeNPromise = MozPromise<std::vector<std::tuple<Args...>>, bool, true>;

template <ListenerPolicy Lp, typename... Args>
inline auto TakeN(MediaEventSourceImpl<Lp, Args...>& aEvent,
                  size_t aN) -> RefPtr<TakeNPromise<Args...>> {
  using Storage = std::vector<std::tuple<Args...>>;
  using Promise = TakeNPromise<Args...>;
  using Holder = media::Refcountable<MozPromiseHolder<Promise>>;
  using Values = media::Refcountable<Storage>;
  using Listener = media::Refcountable<MediaEventListener>;
  auto values = MakeRefPtr<Values>();
  values->reserve(aN);
  auto listener = MakeRefPtr<Listener>();
  auto holder = MakeRefPtr<Holder>();
  *listener = aEvent.Connect(AbstractThread::GetCurrent(),
                             [values, listener, aN, holder](Args... aValue) {
                               values->push_back({aValue...});
                               if (values->size() == aN) {
                                 listener->Disconnect();
                                 holder->Resolve(std::move(*values),
                                                 "TakeN listener callback");
                               }
                             });
  return holder->Ensure(__func__);
}

/**
 * Helper that, given that canonicals have just been updated on the current
 * thread, will block its execution until mirrors and their watchers have
 * executed on aTarget.
 */
inline void WaitForMirrors(const RefPtr<nsISerialEventTarget>& aTarget) {
  Unused << WaitFor(InvokeAsync(aTarget, __func__, [] {
    return GenericPromise::CreateAndResolve(true, "WaitForMirrors resolver");
  }));
}

/**
 * Short form of WaitForMirrors that assumes mirrors are on the current thread
 * (like canonicals).
 */
inline void WaitForMirrors() { WaitForMirrors(GetCurrentSerialEventTarget()); }

}  // namespace mozilla

#endif  // TESTING_GTEST_MOZILLA_WAITFOR_H_
