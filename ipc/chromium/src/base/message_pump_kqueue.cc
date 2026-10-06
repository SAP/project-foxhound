// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "base/message_pump_kqueue.h"

#include <sys/errno.h>

#ifdef XP_IOS
#  include <BrowserEngineCore/BEkevent.h>
#endif

#include "mozilla/AutoRestore.h"

#include "base/logging.h"
#include "base/scoped_nsautorelease_pool.h"
#include "base/eintr_wrapper.h"

namespace base {

namespace {

// On iOS, the normal `kevent64` method is blocked by the content process
// sandbox, so instead we use `be_kevent64` from the BrowserEngineCore library.
static int platform_kevent64(int fd, const kevent64_s* changelist, int nchanges,
                             kevent64_s* eventlist, int nevents, int flags) {
#ifdef XP_IOS
  return be_kevent64(fd, changelist, nchanges, eventlist, nevents, flags);
#else
  return kevent64(fd, changelist, nchanges, eventlist, nevents, flags, nullptr);
#endif
}

int ChangeOneEvent(const mozilla::UniqueFileHandle& kqueue, kevent64_s* event) {
  return HANDLE_EINTR(platform_kevent64(kqueue.get(), event, 1, nullptr, 0, 0));
}

}  // namespace

MessagePumpKqueue::FileDescriptorWatcher::FileDescriptorWatcher() = default;

MessagePumpKqueue::FileDescriptorWatcher::~FileDescriptorWatcher() {
  StopWatchingFileDescriptor();
}

bool MessagePumpKqueue::FileDescriptorWatcher::StopWatchingFileDescriptor() {
  if (!pump_) return true;
  return pump_->StopWatchingFileDescriptor(this);
}

void MessagePumpKqueue::FileDescriptorWatcher::Init(MessagePumpKqueue* pump,
                                                    int fd, int mode,
                                                    Watcher* watcher) {
  DCHECK_NE(fd, -1);
  DCHECK(!watcher_);
  DCHECK(watcher);
  DCHECK(pump);
  fd_ = fd;
  mode_ = mode;
  watcher_ = watcher;
  pump_ = pump;
}

void MessagePumpKqueue::FileDescriptorWatcher::Reset() {
  fd_ = -1;
  mode_ = 0;
  watcher_ = nullptr;
  pump_ = nullptr;
}

MessagePumpKqueue::MachPortWatchController::MachPortWatchController() = default;

MessagePumpKqueue::MachPortWatchController::~MachPortWatchController() {
  StopWatchingMachPort();
}

bool MessagePumpKqueue::MachPortWatchController::StopWatchingMachPort() {
  if (!pump_) {
    return true;
  }
  return pump_->StopWatchingMachPort(this);
}

void MessagePumpKqueue::MachPortWatchController::Init(
    MessagePumpKqueue* pump, mach_port_t port, MachPortWatcher* watcher) {
  DCHECK(!watcher_);
  DCHECK(watcher);
  DCHECK(pump);
  port_ = port;
  watcher_ = watcher;
  pump_ = pump;
}

void MessagePumpKqueue::MachPortWatchController::Reset() {
  port_ = MACH_PORT_NULL;
  watcher_ = nullptr;
  pump_ = nullptr;
}

MessagePumpKqueue::MessagePumpKqueue() : kqueue_(kqueue()) {
  DCHECK(kqueue_) << "kqueue";

  // Create a Mach port that will be used to wake up the pump by sending
  // a message in response to ScheduleWork(). This is significantly faster than
  // using an EVFILT_USER event, especially when triggered across threads.
  mach_port_t wakeup;
  kern_return_t kr =
      mach_port_allocate(mach_task_self(), MACH_PORT_RIGHT_RECEIVE, &wakeup);
  wakeup_.reset(wakeup);
  CHECK(kr == KERN_SUCCESS)
  << "mach_port_allocate: " << mach_error_string(kr);

  // Specify the wakeup port event to directly receive the Mach message as part
  // of the kevent64() syscall.
  kevent64_s event{};
  event.ident = wakeup_.get();
  event.filter = EVFILT_MACHPORT;
  event.flags = EV_ADD;
  event.fflags = MACH_RCV_MSG;
  event.ext[0] = reinterpret_cast<uint64_t>(&wakeup_buffer_);
  event.ext[1] = sizeof(wakeup_buffer_);

  int rv = ChangeOneEvent(kqueue_, &event);
  DCHECK(rv == 0) << "kevent64";
}

MessagePumpKqueue::~MessagePumpKqueue() = default;

void MessagePumpKqueue::Run(Delegate* delegate) {
  mozilla::AutoRestore<bool> reset_keep_running(keep_running_);
  keep_running_ = true;

  while (keep_running_) {
    ScopedNSAutoreleasePool pool;

    bool do_more_work = DoInternalWork(delegate, nullptr);
    if (!keep_running_) break;

    do_more_work |= delegate->DoWork();
    if (!keep_running_) break;

    TimeTicks delayed_work_time;
    do_more_work |= delegate->DoDelayedWork(&delayed_work_time);
    if (!keep_running_) break;

    if (do_more_work) continue;

    do_more_work |= delegate->DoIdleWork();
    if (!keep_running_) break;

    if (do_more_work) continue;

    DoInternalWork(delegate, &delayed_work_time);
  }
}

void MessagePumpKqueue::Quit() {
  keep_running_ = false;
  ScheduleWork();
}

void MessagePumpKqueue::ScheduleWork() {
  mach_msg_empty_send_t message{};
  message.header.msgh_size = sizeof(message);
  message.header.msgh_bits =
      MACH_MSGH_BITS_REMOTE(MACH_MSG_TYPE_MAKE_SEND_ONCE);
  message.header.msgh_remote_port = wakeup_.get();
  kern_return_t kr = mach_msg_send(&message.header);
  if (kr != KERN_SUCCESS) {
    // If ScheduleWork() is being called by other threads faster than the pump
    // can dispatch work, the kernel message queue for the wakeup port can fill
    // up (this happens under base_perftests, for example). The kernel does
    // return a SEND_ONCE right in the case of failure, which must be destroyed
    // to avoid leaking.
    if ((kr & ~MACH_MSG_IPC_SPACE) != MACH_SEND_NO_BUFFER) {
      DLOG(ERROR) << "mach_msg_send: " << mach_error_string(kr);
    }
    mach_msg_destroy(&message.header);
  }
}

void MessagePumpKqueue::ScheduleDelayedWork(
    const TimeTicks& delayed_work_time) {
  // Nothing to do. This MessagePump uses DoWork().
}

bool MessagePumpKqueue::WatchMachReceivePort(
    mach_port_t port, MachPortWatchController* controller,
    MachPortWatcher* delegate) {
  DCHECK(port != MACH_PORT_NULL);
  DCHECK(controller);
  DCHECK(delegate);

  if (controller->port() != MACH_PORT_NULL) {
    DLOG(ERROR)
        << "Cannot use the same MachPortWatchController while it is active";
    return false;
  }

  kevent64_s event{};
  event.ident = port;
  event.filter = EVFILT_MACHPORT;
  event.flags = EV_ADD;
  int rv = ChangeOneEvent(kqueue_, &event);
  if (rv < 0) {
    DLOG(ERROR) << "kevent64";
    return false;
  }
  ++event_count_;

  controller->Init(this, port, delegate);
  port_controllers_.InsertOrUpdate(port, controller);

  return true;
}

bool MessagePumpKqueue::WatchFileDescriptor(int fd, bool persistent, int mode,
                                            FileDescriptorWatcher* controller,
                                            Watcher* delegate) {
  DCHECK_GE(fd, 0);
  DCHECK(controller);
  DCHECK(delegate);
  DCHECK_NE(mode & Mode::WATCH_READ_WRITE, 0);

  if (controller->fd() != -1 && controller->fd() != fd) {
    DLOG(ERROR)
        << "Cannot use the same FileDescriptorWatcher on two different FDs";
    return false;
  }
  StopWatchingFileDescriptor(controller);

  AutoTArray<kevent64_s, 2> events;

  kevent64_s base_event{};
  base_event.ident = static_cast<uint64_t>(fd);
  base_event.flags = EV_ADD | (!persistent ? EV_ONESHOT : 0);

  if (mode & Mode::WATCH_READ) {
    base_event.filter = EVFILT_READ;
    CHECK(next_fd_controller_id_ < std::numeric_limits<uint64_t>::max());
    base_event.udata = next_fd_controller_id_++;
    fd_controllers_.InsertOrUpdate(base_event.udata, controller);
    events.AppendElement(base_event);
  }
  if (mode & Mode::WATCH_WRITE) {
    base_event.filter = EVFILT_WRITE;
    CHECK(next_fd_controller_id_ < std::numeric_limits<uint64_t>::max());
    base_event.udata = next_fd_controller_id_++;
    fd_controllers_.InsertOrUpdate(base_event.udata, controller);
    events.AppendElement(base_event);
  }

  int rv = HANDLE_EINTR(platform_kevent64(kqueue_.get(), events.Elements(),
                                          events.Length(), nullptr, 0, 0));
  if (rv < 0) {
    DLOG(ERROR) << "WatchFileDescriptor kevent64";
    return false;
  }

  event_count_ += events.Length();
  controller->Init(this, fd, mode, delegate);

  return true;
}

bool MessagePumpKqueue::StopWatchingMachPort(
    MachPortWatchController* controller) {
  mach_port_t port = controller->port();
  controller->Reset();
  port_controllers_.Remove(port);

  kevent64_s event{};
  event.ident = port;
  event.filter = EVFILT_MACHPORT;
  event.flags = EV_DELETE;
  --event_count_;
  int rv = ChangeOneEvent(kqueue_, &event);
  if (rv < 0) {
    DLOG(ERROR) << "kevent64";
    return false;
  }

  return true;
}

bool MessagePumpKqueue::StopWatchingFileDescriptor(
    FileDescriptorWatcher* controller) {
  int fd = controller->fd();
  int mode = controller->mode();
  controller->Reset();

  if (fd < 0) return true;

  AutoTArray<kevent64_s, 2> events;

  kevent64_s base_event{};
  base_event.ident = static_cast<uint64_t>(fd);
  base_event.flags = EV_DELETE;

  if (mode & Mode::WATCH_READ) {
    base_event.filter = EVFILT_READ;
    events.AppendElement(base_event);
  }
  if (mode & Mode::WATCH_WRITE) {
    base_event.filter = EVFILT_WRITE;
    events.AppendElement(base_event);
  }

  int rv = HANDLE_EINTR(platform_kevent64(kqueue_.get(), events.Elements(),
                                          events.Length(), nullptr, 0, 0));
  if (rv < 0) DLOG(ERROR) << "StopWatchingFileDescriptor kevent64";

  // The keys for the IDMap aren't recorded anywhere (they're attached to the
  // kevent object in the kernel), so locate the entries by controller pointer.
  fd_controllers_.RemoveIf([&](auto& it) { return it.Data() == controller; });

  event_count_ -= events.Length();

  return rv >= 0;
}

bool MessagePumpKqueue::DoInternalWork(Delegate* delegate,
                                       TimeTicks* delayed_work_time) {
  if (events_.size() < event_count_) {
    events_.resize(event_count_);
  }

  bool poll = delayed_work_time == nullptr;
  int flags = poll ? KEVENT_FLAG_IMMEDIATE : 0;
  if (!poll && delayed_work_time_ != *delayed_work_time) {
    UpdateWakeupTimer(*delayed_work_time);
    DCHECK(delayed_work_time_ == *delayed_work_time);
  }

  int rv = HANDLE_EINTR(platform_kevent64(
      kqueue_.get(), nullptr, 0, events_.data(), events_.size(), flags));

  CHECK(rv >= 0)
  << "kevent64";
  return ProcessEvents(delegate, rv);
}

bool MessagePumpKqueue::ProcessEvents(Delegate* delegate, int count) {
  bool did_work = false;

  for (int i = 0; i < count; ++i) {
    auto* event = &events_[i];
    if (event->filter == EVFILT_READ || event->filter == EVFILT_WRITE) {
      did_work = true;

      FileDescriptorWatcher* controller = fd_controllers_.Get(event->udata);
      if (!controller) {
        // The controller was removed by some other work callout before
        // this event could be processed.
        continue;
      }
      Watcher* fd_watcher = controller->watcher();

      if (event->flags & EV_ONESHOT) {
        // If this was a one-shot event, the Controller needs to stop tracking
        // the descriptor, so it is not double-removed when it is told to stop
        // watching.
        controller->Reset();
        fd_controllers_.Remove(event->udata);
        --event_count_;
      }

      if (fd_watcher) {
        if (event->filter == EVFILT_READ) {
          fd_watcher->OnFileCanReadWithoutBlocking(
              static_cast<int>(event->ident));
        } else if (event->filter == EVFILT_WRITE) {
          fd_watcher->OnFileCanWriteWithoutBlocking(
              static_cast<int>(event->ident));
        }
      }
    } else if (event->filter == EVFILT_MACHPORT) {
      mach_port_t port = event->ident;

      if (port == wakeup_.get()) {
        // The wakeup event has been received, do not treat this as "doing
        // work", this just wakes up the pump.
        continue;
      }

      did_work = true;

      MachPortWatchController* controller = port_controllers_.Get(port);
      // The controller could have been removed by some other work callout
      // before this event could be processed.
      if (controller) {
        controller->watcher()->OnMachMessageReceived(port);
      }
    } else if (event->filter == EVFILT_TIMER) {
      // The wakeup timer fired.
      DCHECK(!delayed_work_time_.is_null());
      delayed_work_time_ = base::TimeTicks();
      --event_count_;
    } else {
      NOTREACHED() << "Unexpected event for filter " << event->filter;
    }
  }

  return did_work;
}

void MessagePumpKqueue::UpdateWakeupTimer(const base::TimeTicks& wakeup_time) {
  DCHECK_NE(wakeup_time, delayed_work_time_);

  // The ident of the wakeup timer. There's only the one timer as the pair
  // (ident, filter) is the identity of the event.
  constexpr uint64_t kWakeupTimerIdent = 0x0;
  if (wakeup_time.is_null()) {
    // Clear the timer.
    kevent64_s timer{};
    timer.ident = kWakeupTimerIdent;
    timer.filter = EVFILT_TIMER;
    timer.flags = EV_DELETE;

    int rv = ChangeOneEvent(kqueue_, &timer);
    CHECK(rv == 0)
    << "kevent64, delete timer";
    --event_count_;
  } else {
    // Set/reset the timer.
    kevent64_s timer{};
    timer.ident = kWakeupTimerIdent;
    timer.filter = EVFILT_TIMER;
    // This updates the timer if it already exists in |kqueue_|.
    timer.flags = EV_ADD | EV_ONESHOT;

    // Specify the sleep in microseconds to avoid undersleeping due to
    // numeric problems.
    // If wakeup_time is in the past, the delta below will be negative and the
    // timer is set immediately.
    timer.fflags = NOTE_USECONDS;
    timer.data = (wakeup_time - base::TimeTicks::Now()).InMicroseconds();

    int rv = ChangeOneEvent(kqueue_, &timer);
    CHECK(rv == 0)
    << "kevent64, set timer";

    // Bump the event count if we just added the timer.
    if (delayed_work_time_.is_null()) ++event_count_;
  }

  delayed_work_time_ = wakeup_time;
}

}  // namespace base
