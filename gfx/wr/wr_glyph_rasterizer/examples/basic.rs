/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use std::sync::Arc;
use std::mem;

use api::{
    IdNamespace, FontTemplate, FontKey, FontInstanceKey, FontInstanceOptions,
    FontInstancePlatformOptions, ColorF, FontInstanceFlags, units::DevicePoint,
};
use glutin::config::{ConfigTemplateBuilder, GlConfig};
use glutin::context::{
    ContextApi, ContextAttributesBuilder, NotCurrentGlContext, Version,
};
use glutin::display::{GetGlDisplay, GlDisplay};
use glutin::surface::{GlSurface, SurfaceAttributesBuilder, WindowSurface};
use glutin_winit::DisplayBuilder;
use rayon::ThreadPoolBuilder;
use std::num::NonZeroU32;
use winit::application::ApplicationHandler;
use winit::dpi::PhysicalSize;
use winit::event::{WindowEvent};
use winit::event_loop::{ActiveEventLoop, EventLoop};
use winit::raw_window_handle::{HasWindowHandle, RawWindowHandle};
use wr_glyph_rasterizer::RasterizedGlyph;
use wr_glyph_rasterizer::{
    SharedFontResources, BaseFontInstance, GlyphRasterizer, FontInstance, GlyphKey,
    SubpixelDirection, profiler::GlyphRasterizeProfiler,
};

#[path = "common/boilerplate.rs"]
mod boilerplate;

struct Profiler;

impl GlyphRasterizeProfiler for Profiler {
    fn start_time(&mut self) {}
    fn end_time(&mut self) -> f64 {
        0.
    }
    fn set(&mut self, _value: f64) {}
}

fn load_glyphs() -> Vec<RasterizedGlyph> {
    let namespace = IdNamespace(0);
    let mut fonts = SharedFontResources::new(namespace);

    let font_key = FontKey::new(namespace, 0);
    let raw_font_data = include_bytes!("../../wrench/reftests/text/FreeSans.ttf");
    let font_template = FontTemplate::Raw(Arc::new(raw_font_data.to_vec()), 0);
    let shared_font_key = fonts
        .font_keys
        .add_key(&font_key, &font_template)
        .expect("Failed to add font key");

    let font_instance_key = FontInstanceKey::new(namespace, 1);
    fonts.templates.add_font(shared_font_key, font_template);
    assert!(fonts.templates.has_font(&shared_font_key));

    // AddFontInstance will only be processed here, not in the resource cache, so it
    // is safe to take the options rather than clone them.
    let base = BaseFontInstance::new(
        font_instance_key,
        shared_font_key,
        32.,
        mem::take(&mut Some(FontInstanceOptions::default())),
        mem::take(&mut Some(FontInstancePlatformOptions::default())),
        mem::take(&mut Vec::new()),
    );
    let shared_instance = fonts
        .instance_keys
        .add_key(base)
        .expect("Failed to add font instance key");
    fonts.instances.add_font_instance(shared_instance);

    let workers = {
        let worker = ThreadPoolBuilder::new()
            .thread_name(|idx| format!("WRWorker#{}", idx))
            .build();
        Arc::new(worker.unwrap())
    };
    let mut glyph_rasterizer = GlyphRasterizer::new(workers, None, false);

    glyph_rasterizer.add_font(
        shared_font_key,
        fonts
            .templates
            .get_font(&shared_font_key)
            .expect("Could not find FontTemplate"),
    );

    let mut font = FontInstance::new(
        fonts
            .instances
            .get_font_instance(font_instance_key)
            .expect("Could not found BaseFontInstance"),
        ColorF::BLACK.into(),
        api::FontRenderMode::Alpha,
        FontInstanceFlags::SUBPIXEL_POSITION | FontInstanceFlags::FONT_SMOOTHING,
    );

    glyph_rasterizer.prepare_font(&mut font);

    let glyph_keys = [
        glyph_rasterizer
            .get_glyph_index(shared_font_key, 'A')
            .expect("Failed to get glyph index"),
        glyph_rasterizer
            .get_glyph_index(shared_font_key, 'B')
            .expect("Failed to get glyph index"),
        glyph_rasterizer
            .get_glyph_index(shared_font_key, 'C')
            .expect("Failed to get glyph index"),
    ];

    let glyph_keys = glyph_keys.map(|g| {
        GlyphKey::new(
            g,
            DevicePoint::new(100., 100.),
            SubpixelDirection::Horizontal,
        )
    });

    glyph_rasterizer.request_glyphs(font, &glyph_keys, |_| true);

    let mut glyphs = vec![];
    glyph_rasterizer.resolve_glyphs(
        |job, _| {
            if let Ok(glyph) = job.result {
                glyphs.push(glyph);
            }
        },
        &mut Profiler,
    );

    glyphs
}

struct App {
    glyphs: Vec<RasterizedGlyph>,
    gl_state: Option<GlState>,
}

struct GlState {
    gl_obj: boilerplate::Gl,
    window: winit::window::Window,
    gl_surface: glutin::surface::Surface<WindowSurface>,
    gl_context: glutin::context::PossiblyCurrentContext,
}

impl ApplicationHandler for App {
    fn resumed(&mut self, event_loop: &ActiveEventLoop) {
        if self.gl_state.is_some() {
            return;
        }

        let window_attrs = winit::window::Window::default_attributes()
            .with_title("A fantastic window!")
            .with_inner_size(PhysicalSize::new(1900.0_f64, 1300.0_f64));

        let template = ConfigTemplateBuilder::new().with_depth_size(24);

        let (window, gl_config) = DisplayBuilder::new()
            .with_window_attributes(Some(window_attrs))
            .build(event_loop, template, |configs| {
                configs.reduce(|acc, config| {
                    if config.num_samples() > acc.num_samples() { config } else { acc }
                }).unwrap()
            })
            .expect("failed to create GL display and window");

        let window = window.unwrap();
        let gl_display = gl_config.display();

        let raw_window_handle: RawWindowHandle = window
            .window_handle()
            .expect("failed to get window handle")
            .as_raw();

        let (not_current_ctx, is_gles) = {
            let gl_attrs = ContextAttributesBuilder::new()
                .with_context_api(ContextApi::OpenGl(Some(Version::new(3, 2))))
                .build(Some(raw_window_handle));
            match unsafe { gl_display.create_context(&gl_config, &gl_attrs) } {
                Ok(ctx) => (ctx, false),
                Err(_) => {
                    let gles_attrs = ContextAttributesBuilder::new()
                        .with_context_api(ContextApi::Gles(Some(Version::new(3, 0))))
                        .build(Some(raw_window_handle));
                    let ctx = unsafe { gl_display.create_context(&gl_config, &gles_attrs) }
                        .expect("failed to create GLES context");
                    (ctx, true)
                }
            }
        };

        let physical_size = window.inner_size();
        let surface_attrs = SurfaceAttributesBuilder::<WindowSurface>::new()
            .build(
                raw_window_handle,
                NonZeroU32::new(physical_size.width.max(1)).unwrap(),
                NonZeroU32::new(physical_size.height.max(1)).unwrap(),
            );

        let gl_surface = unsafe {
            gl_display
                .create_window_surface(&gl_config, &surface_attrs)
                .expect("failed to create GL surface")
        };

        let gl_context = not_current_ctx
            .make_current(&gl_surface)
            .expect("failed to make GL context current");

        let gl_obj = boilerplate::load(is_gles, &gl_display, std::mem::take(&mut self.glyphs));

        self.gl_state = Some(GlState {
            gl_obj,
            window,
            gl_surface,
            gl_context,
        });
    }

    fn window_event(
        &mut self,
        event_loop: &ActiveEventLoop,
        _window_id: winit::window::WindowId,
        event: WindowEvent,
    ) {
        let state = match self.gl_state {
            Some(ref state) => state,
            None => return,
        };

        match event {
            WindowEvent::CloseRequested => {
                event_loop.exit();
            }
            WindowEvent::RedrawRequested => {
                let size = state.window.inner_size();
                let scale_factor = state.window.scale_factor();
                state.gl_obj.draw_frame(
                    size.width as f32,
                    size.height as f32,
                    [0., 0., 0., 1.0],
                    [1., 1., 1., 1.0],
                    scale_factor as f32,
                );
                state.gl_surface.swap_buffers(&state.gl_context).unwrap();
            }
            _ => (),
        }
    }
}

fn main() {
    let glyphs = load_glyphs();

    let event_loop = EventLoop::new().expect("failed to create event loop");

    let mut app = App {
        glyphs,
        gl_state: None,
    };

    event_loop.run_app(&mut app).expect("event loop error");
}
