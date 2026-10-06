#[cfg(all(not(target_os = "macos"), unix))]
mod snap {
    use mozrunner::runner::platform::firefox_default_path;
    use std::env;
    use std::ops::Drop;
    use std::path::PathBuf;
    use std::sync::{LazyLock, Mutex, MutexGuard};

    static SNAP_KEY: &str = "SNAP_INSTANCE_NAME";
    static SNAP_LEGACY_KEY: &str = "SNAP_NAME";

    static ENV_MUTEX: LazyLock<Mutex<()>> = LazyLock::new(Mutex::default);

    pub(crate) struct SnapEnvironment<'environment> {
        initial_environment: (Option<String>, Option<String>),
        #[allow(dead_code)]
        guard: MutexGuard<'environment, ()>,
    }

    impl<'environment> SnapEnvironment<'environment> {
        pub(crate) fn new() -> SnapEnvironment<'environment> {
            SnapEnvironment {
                initial_environment: (env::var(SNAP_KEY).ok(), env::var(SNAP_LEGACY_KEY).ok()),
                guard: ENV_MUTEX.lock().unwrap(),
            }
        }

        pub(crate) fn set(&self, value: Option<String>, legacy_value: Option<String>) {
            fn set_env(key: &str, value: Option<String>) {
                // SAFETY: Safe as long as no other threads try to modify the environment
                // This is enforced by SnapEnvironment taking a mutex, so tests can't run
                // in parallel.
                unsafe {
                    match value {
                        Some(value) => env::set_var(key, value),
                        None => env::remove_var(key),
                    }
                }
            }
            set_env(SNAP_KEY, value);
            set_env(SNAP_LEGACY_KEY, legacy_value);
        }
    }

    impl Drop for SnapEnvironment<'_> {
        fn drop(&mut self) {
            self.set(
                self.initial_environment.0.clone(),
                self.initial_environment.1.clone(),
            );
        }
    }

    #[test]
    fn test_default_path_linux() {
        use SnapEnvironment;
        let snap_path = Some(PathBuf::from(
            "/snap/firefox/current/usr/lib/firefox/firefox",
        ));

        let snap_env = SnapEnvironment::new();

        snap_env.set(None, None);
        assert_ne!(firefox_default_path(), snap_path);

        snap_env.set(Some("value".into()), None);
        assert_eq!(firefox_default_path(), snap_path);

        snap_env.set(None, Some("value".into()));
        assert_eq!(firefox_default_path(), snap_path);
    }
}
