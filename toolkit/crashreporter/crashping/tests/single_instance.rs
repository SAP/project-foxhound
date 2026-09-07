use crashping::{ClientInfoMetrics, InitGlean};
use std::process::{Child, Command};
use std::sync::{
    atomic::{AtomicBool, Ordering::Relaxed},
    Arc, Condvar, Mutex,
};
use std::time::Duration;

#[test]
#[ignore]
fn do_glean_init() {
    let data_dir = std::env::temp_dir()
        .join("crashping_tests")
        .join("do_glean_init");
    let _glean_handle = InitGlean::new(
        data_dir,
        "my_app",
        ClientInfoMetrics {
            app_build: "build".into(),
            app_display_version: "version".into(),
            channel: None,
            locale: None,
        },
    )
    .initialize()
    .unwrap();

    eprintln!("got handle");

    // Wait and hold the glean handle indefinitely. The caller will kill us.
    std::thread::park();
}

struct GleanInitChild {
    child: Child,
    has_handle: Arc<AtomicBool>,
}

#[derive(Default)]
struct Signal {
    condvar: Condvar,
    gate: Mutex<()>,
}

impl Signal {
    fn wait(&self, guard: std::sync::MutexGuard<'_, ()>) {
        let (_guard, result) = self
            .condvar
            .wait_timeout(guard, Duration::from_millis(250))
            .unwrap();
        if result.timed_out() {
            panic!("failed to see signal change before timeout");
        }
    }

    fn notify(&self) {
        self.condvar.notify_all();
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, ()> {
        self.gate.lock().unwrap()
    }
}

impl GleanInitChild {
    fn new(has_handle_changed: Arc<Signal>) -> Self {
        let me = std::env::current_exe().unwrap();
        let mut child = Command::new(me)
            .args(["--ignored", "--exact", "--nocapture", "do_glean_init"])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .expect("failed to execute test child");
        let mut stderr = std::io::BufReader::new(child.stderr.take().unwrap());
        let has_handle = Arc::new(AtomicBool::new(false));
        let has_handle_t = has_handle.clone();
        std::thread::spawn(move || {
            use std::io::BufRead;
            let mut line = String::new();
            // Catch this sort of error with the top-level timeout.
            let Ok(_) = stderr.read_line(&mut line) else {
                return;
            };
            if line == "got handle\n" {
                let _guard = has_handle_changed.lock();
                has_handle_t.store(true, Relaxed);
                has_handle_changed.notify();
            }
        });

        GleanInitChild { child, has_handle }
    }

    fn has_handle(&mut self) -> bool {
        self.has_handle.load(Relaxed)
    }

    fn kill(&mut self) {
        self.child.kill().unwrap();
        self.has_handle.store(false, Relaxed);
    }
}

impl Drop for GleanInitChild {
    fn drop(&mut self) {
        self.kill();
    }
}

#[test]
fn exclusive_access() {
    let has_handle_changed = Arc::new(Signal::default());

    let guard = has_handle_changed.lock();

    // Spawn two children
    let mut child_a = GleanInitChild::new(has_handle_changed.clone());
    let mut child_b = GleanInitChild::new(has_handle_changed.clone());

    has_handle_changed.wait(guard);

    // Give a little time for the other child to potentially get a handle too (if there's a bug).
    std::thread::sleep(Duration::from_millis(100));

    assert_ne!(
        child_a.has_handle(),
        child_b.has_handle(),
        "exactly one of the children should have the handle"
    );
    let was_child_a = child_a.has_handle();

    let guard = has_handle_changed.lock();
    // Kill the child that has the glean store.
    if was_child_a {
        child_a.kill();
    } else {
        child_b.kill();
    }
    assert_eq!(child_a.has_handle() || child_b.has_handle(), false);
    has_handle_changed.wait(guard);

    // Ensure the other child acquired the handle.
    if was_child_a {
        assert!(
            child_b.has_handle() && !child_a.has_handle(),
            "child b should have the handle"
        );
    } else {
        assert!(
            child_a.has_handle() && !child_b.has_handle(),
            "child a should ahve the handle"
        );
    }
}
