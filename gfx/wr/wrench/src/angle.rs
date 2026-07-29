/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use winit::{event_loop::ActiveEventLoop, window::Window};

#[cfg(not(windows))]
pub enum Context {}

#[cfg(windows)]
pub use crate::egl::Context;

impl Context {
    #[cfg(not(windows))]
    pub fn with_window(
        _: winit::window::WindowAttributes,
        _: &crate::GlApiRequest,
        _: &ActiveEventLoop,
        _: bool,
    ) -> Result<(Window, Self), String> {
        Err("ANGLE rendering is only supported on Windows".into())
    }

    #[cfg(windows)]
    pub fn with_window(
        window_attrs: winit::window::WindowAttributes,
        gl_request: &crate::GlApiRequest,
        event_loop: &ActiveEventLoop,
        using_compositor: bool,
    ) -> Result<(Window, Self), crate::egl::CreationError> {
        use winit::raw_window_handle::{HasWindowHandle, RawWindowHandle};
        use crate::egl::{PixelFormatRequirements, Robustness};

        let pf_reqs = &PixelFormatRequirements::default();
        let window = event_loop.create_window(window_attrs)
            .map_err(|e| crate::egl::CreationError::OsError(e.to_string()))?;
        let hwnd = match window.window_handle().unwrap().as_raw() {
            RawWindowHandle::Win32(h) => h.hwnd.get() as *const _,
            _ => unreachable!(),
        };
        Self::new(pf_reqs, gl_request, false, Robustness::NotRobust)
            .and_then(|p| p.finish(hwnd, using_compositor))
            .map(|context| (window, context))
    }

    #[cfg(not(windows))]
    pub unsafe fn make_current(&self) -> Result<(), String> {
        match *self {}
    }

    #[cfg(not(windows))]
    pub fn get_proc_address(&self, _: &str) -> *const () {
        match *self {}
    }

    #[cfg(not(windows))]
    pub fn swap_buffers(&self) -> Result<(), String> {
        match *self {}
    }

    #[cfg(not(windows))]
    pub fn is_gles(&self) -> bool {
        match *self {}
    }

    #[cfg(not(windows))]
    pub fn get_d3d11_device(&self) -> *const std::os::raw::c_void {
        match *self {}
    }
}
