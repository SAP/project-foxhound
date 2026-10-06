/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use super::Gui;
use webrender_api::RenderCommandInfo;

pub fn ui(app: &mut Gui, ui: &mut egui::Ui) {
    if ui.checkbox(&mut app.data_model.frame_log.enabled, "Log render commands").changed() {
        app.net.post_with_content("render-cmd-log", &app.data_model.frame_log.enabled).ok();
    }

    if let Some(frame) = app.data_model.frame_log.frame(app.data_model.timeline.current_frame) {
        if let Some(cmds) = &frame.render_commands {
            draw_calls_ui(cmds, ui);
        }
    }
}

pub fn draw_calls_ui(cmds: &[RenderCommandInfo], ui: &mut egui::Ui) {
    egui::ScrollArea::vertical().show(ui, |ui| {
        egui::Grid::new("").show(ui, |ui| {
            for cmd in cmds {
                match cmd {
                    RenderCommandInfo::RenderTarget { kind, size } => {
                        ui.end_row();
                        ui.label(egui::RichText::new("Target"));
                        ui.label(egui::RichText::new(format!("{kind} {}x{}", size.width, size.height)));
                    }
                    RenderCommandInfo::DrawCall { shader, instances } => {
                        ui.label(egui::RichText::new("  Draw"));
                        ui.label(egui::RichText::new(shader.clone()).strong());
                        let inst = format!("{} instance{}", instances, if *instances > 1 { "s"} else { "" });
                        ui.label(egui::RichText::new(inst).weak());
                    }
                }
                ui.end_row();
            }
        });
    });
}
