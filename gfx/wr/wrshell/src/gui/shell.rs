/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

pub fn ui(app: &mut super::Gui, ui: &mut egui::Ui) {
    let area = ui.max_rect();
    let mut log_area = area;
    let mut cmd_area = area;
    log_area.max.y -= 20.0;
    cmd_area.min.y = log_area.max.y;

    ui.scope_builder(egui::UiBuilder::new().max_rect(log_area), |ui| {
        egui::ScrollArea::vertical()
            .auto_shrink([false; 2])
            .stick_to_bottom(true)
            .show(ui, |ui| {
                ui.spacing_mut().item_spacing.y = 2.0;
                for line in &app.data_model.log {
                    ui.label(egui::RichText::new(line).monospace());
                }
            });
    });

    ui.scope_builder(egui::UiBuilder::new().max_rect(cmd_area), |ui| {
        // Command input
        let _response = ui.horizontal(|ui| {
            ui.label(">");
            let size = ui.available_size();
            let text_edit = egui::TextEdit::singleline(&mut app.data_model.cmd)
                .hint_text("Enter command (or help)")
                .desired_width(size.x - 20.0);
            let response = ui.add(text_edit);

            if response.lost_focus() && ui.input(|i| i.key_pressed(egui::Key::Enter)) {
                let cmd = std::mem::take(&mut app.data_model.cmd);

                let push_history = match app.cmd_history.last() {
                    Some(prev) => *prev != cmd,
                    None => true,
                };
                if push_history {
                    app.cmd_history.push(cmd.clone());
                }
                app.cmd_history_index = app.cmd_history.len();

                app.handle_command(&cmd);
                response.request_focus();
            }

            // Handle history navigation
            if response.has_focus() {
                if ui.input(|i| i.key_pressed(egui::Key::ArrowUp)) && !app.cmd_history.is_empty() {
                    if app.cmd_history_index > 0 {
                        app.cmd_history_index -= 1;
                        app.data_model.cmd = app.cmd_history[app.cmd_history_index].clone();
                    }
                }
                if ui.input(|i| i.key_pressed(egui::Key::ArrowDown)) && !app.cmd_history.is_empty() {
                    if app.cmd_history_index < app.cmd_history.len() - 1 {
                        app.cmd_history_index += 1;
                        app.data_model.cmd = app.cmd_history[app.cmd_history_index].clone();
                    }
                }
            }

            response
        });
    });
}
