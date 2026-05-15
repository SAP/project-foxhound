// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef BASE_MESSAGE_PUMP_KQUEUE_H_
#define BASE_MESSAGE_PUMP_KQUEUE_H_

#include <mach/mach.h>
#include <stdint.h>
#include <sys/event.h>

#include <vector>

#include "mozilla/RefPtr.h"
#include "mozilla/UniquePtrExtensions.h"
#include "nsTHashMap.h"

#include "base/basictypes.h"
#include "base/time.h"
#include "base/message_pump.h"

namespace base {

// MessagePumpKqueue is used on macOS to drive an IO MessageLoop that is
// capable of watching both POSIX file descriptors and Mach ports.
class MessagePumpKqueue : public MessagePump {
 public:
  // Used with WatchFileDescriptor to asynchronously monitor the I/O readiness
  // of a File Descriptor.
  class Watcher {
   public:
    virtual ~Watcher() {}
    // Called from MessageLoop::Run when an FD can be read from/written to
    // without blocking
    virtual void OnFileCanReadWithoutBlocking(int fd) = 0;
    virtual void OnFileCanWriteWithoutBlocking(int fd) = 0;
  };

  class FileDescriptorWatcher {
   public:
    explicit FileDescriptorWatcher();
    ~FileDescriptorWatcher();

    bool StopWatchingFileDescriptor();

   protected:
    friend class MessagePumpKqueue;

    void Init(MessagePumpKqueue* pump, int fd, int mode, Watcher* watcher);
    void Reset();

    int fd() { return fd_; }
    int mode() { return mode_; }
    Watcher* watcher() { return watcher_; }

   private:
    int fd_ = -1;
    int mode_ = 0;
    Watcher* watcher_ = nullptr;
    RefPtr<MessagePumpKqueue> pump_;

    DISALLOW_COPY_AND_ASSIGN(FileDescriptorWatcher);
  };

  enum Mode {
    WATCH_READ = 1 << 0,
    WATCH_WRITE = 1 << 1,
    WATCH_READ_WRITE = WATCH_READ | WATCH_WRITE
  };

  // Delegate interface that provides notifications of Mach message receive
  // events.
  class MachPortWatcher {
   public:
    virtual ~MachPortWatcher() {}
    virtual void OnMachMessageReceived(mach_port_t port) = 0;
  };

  // Controller interface that is used to stop receiving events for an
  // installed MachPortWatcher.
  class MachPortWatchController {
   public:
    explicit MachPortWatchController();
    ~MachPortWatchController();

    bool StopWatchingMachPort();

   protected:
    friend class MessagePumpKqueue;

    void Init(MessagePumpKqueue* pump, mach_port_t port,
              MachPortWatcher* watcher);
    void Reset();

    mach_port_t port() { return port_; }
    MachPortWatcher* watcher() { return watcher_; }

   private:
    mach_port_t port_ = MACH_PORT_NULL;
    MachPortWatcher* watcher_ = nullptr;
    RefPtr<MessagePumpKqueue> pump_;

    DISALLOW_COPY_AND_ASSIGN(MachPortWatchController);
  };

  MessagePumpKqueue();
  ~MessagePumpKqueue() override;

  // MessagePump:
  void Run(Delegate* delegate) override;
  void Quit() override;
  void ScheduleWork() override;
  void ScheduleDelayedWork(const TimeTicks& delayed_work_time) override;

  // Begins watching the Mach receive right named by |port|. The |controller|
  // can be used to stop watching for incoming messages, and new message
  // notifications are delivered to the |delegate|. Returns true if the watch
  // was successfully set-up and false on error.
  bool WatchMachReceivePort(mach_port_t port,
                            MachPortWatchController* controller,
                            MachPortWatcher* delegate);

  bool WatchFileDescriptor(int fd, bool persistent, int mode,
                           FileDescriptorWatcher* controller,
                           Watcher* delegate);

 private:
  // Called by the watch controller implementations to stop watching the
  // respective types of handles.
  bool StopWatchingMachPort(MachPortWatchController* controller);
  bool StopWatchingFileDescriptor(FileDescriptorWatcher* controller);

  // Checks the |kqueue_| for events. If |next_work_info| is null, then the
  // kqueue will be polled for events. If it is non-null, it will wait for the
  // amount of time specified by the NextWorkInfo or until an event is
  // triggered. Returns whether any events were dispatched, with the events
  // stored in |events_|.
  bool DoInternalWork(Delegate* delegate, TimeTicks* delayed_work_time);

  // Called by DoInternalWork() to dispatch the user events stored in |events_|
  // that were triggered. |count| is the number of events to process. Returns
  // true if work was done, or false if no work was done.
  bool ProcessEvents(Delegate* delegate, int count);

  // Sets the wakeup timer to |wakeup_time|, or clears it if |wakeup_time| is
  // base::TimeTicks::Max(). Updates |scheduled_wakeup_time_| to follow.
  void UpdateWakeupTimer(const base::TimeTicks& wakeup_time);

  // Receive right to which an empty Mach message is sent to wake up the pump
  // in response to ScheduleWork().
  mozilla::UniqueMachReceiveRight wakeup_;
  // Scratch buffer that is used to receive the message sent to |wakeup_|.
  mach_msg_empty_rcv_t wakeup_buffer_{};

  // Watch controllers for FDs. IDs are generated from next_fd_controller_id_
  // and are stored in the kevent64_s::udata field.
  nsTHashMap<uint64_t, FileDescriptorWatcher*> fd_controllers_;
  uint64_t next_fd_controller_id_ = 0;

  // Watch controllers for Mach ports. IDs are the port being watched.
  nsTHashMap<mach_port_name_t, MachPortWatchController*> port_controllers_;

  // The kqueue that drives the pump.
  mozilla::UniqueFileHandle kqueue_;

  // Whether the pump has been Quit() or not.
  bool keep_running_ = true;

  // The time at which we cshould call DoDelayedWork.
  base::TimeTicks delayed_work_time_;

  // The number of events scheduled on the |kqueue_|. There is always at least
  // 1, for the |wakeup_| port (or |port_set_|).
  size_t event_count_ = 1;
  // Buffer used by DoInternalWork() to be notified of triggered events. This
  // is always at least |event_count_|-sized.
  std::vector<kevent64_s> events_{event_count_};

  DISALLOW_COPY_AND_ASSIGN(MessagePumpKqueue);
};

}  // namespace base

#endif  // BASE_MESSAGE_PUMP_KQUEUE_H_
