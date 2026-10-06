/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use super::Gui;

pub struct Timeline {
    pub current_frame: usize,
}

impl Timeline {
    pub fn new() -> Self {
        Timeline {
            current_frame: 0,
        }
    }
}

pub fn ui(app: &mut Gui, ui: &mut egui::Ui) {
    let area = ui.max_rect();
    let mut top_area = area;
    let mut bottom_area = area;
    top_area.max.y -= 20.0;
    bottom_area.min.y = top_area.max.y;

    ui.scope_builder(egui::UiBuilder::new().max_rect(bottom_area), |ui| {
        show_timeline(
            bottom_area,
            &mut app.data_model.timeline.current_frame,
            app.data_model.frame_log.first_frame_index(),
            app.data_model.frame_log.last_frame_index(),
            ui,
        );
    });
}

pub fn show_timeline(
    rect: egui::Rect,
    current_frame: &mut usize,
    first_frame: usize,
    last_frame: usize,
    ui: &mut egui::Ui,
) {
    ui.horizontal(|ui| {
        let style = ui.style().clone();
        let radius = style.visuals.widgets.inactive.corner_radius;

        let button_size = egui::Vec2 { x: 20.0, y: rect.height() };
        let prev = egui::Button::new("←")
            .min_size(button_size)
            .corner_radius(egui::CornerRadius { nw: radius.nw, sw: radius.sw, ne: 0, se: 0 });
        let next = egui::Button::new("→")
            .min_size(button_size)
            .corner_radius(egui::CornerRadius { ne: radius.ne, se: radius.se, nw: 0, sw: 0 });

        let spacing = ui.spacing().item_spacing.x;
        ui.spacing_mut().item_spacing.x = 1.0;

        let prev_clicked = ui.add(prev).clicked();

        ui.spacing_mut().item_spacing.x = spacing;

        let next_clicked = ui.add(next).clicked();

        if prev_clicked {
            *current_frame = (*current_frame).max(first_frame + 1) - 1
        }

        if next_clicked {
            *current_frame = (*current_frame + 1).min(last_frame)
        }

        let min = ui.cursor().min;
        let max = rect.max;
        let tl_rect = egui::Rect { min, max };
        let size = max - min;

        let sense = egui::Sense::CLICK
            | egui::Sense::HOVER
            | egui::Sense::FOCUSABLE
            | egui::Sense::DRAG;
        let response = ui.allocate_response(size, sense);

        let num_frames = last_frame - first_frame + 1;
        let n = num_frames as f32;

        let y0 = min.y;
        let y1 = min.y + size.y;

        let background = style.visuals.widgets.inactive.bg_fill;
        let border = style.visuals.widgets.inactive.bg_stroke;
        let separator = egui::Stroke { width: 1.0, color: style.visuals.panel_fill };
        ui.painter().rect(tl_rect, radius, background, border, egui::StrokeKind::Inside);

        let mut hovered_frame = None;
        let mut prev_x = min.x;
        for i in 0..num_frames {
            let x = min.x + (i + 1) as f32 * size.x / n;

            let frame_rect = egui::Rect {
                min: egui::Pos2 { x: prev_x, y: y0 },
                max: egui::Pos2 { x, y: y1 },
            };

            if ui.rect_contains_pointer(frame_rect) {
                hovered_frame = Some((i, frame_rect))
            }

            if i != num_frames - 1 {
                ui.painter().vline(x, egui::Rangef { min: y0, max: y1 }, separator);
            }
            prev_x = x;
        }

        let selected_cell_idx = *current_frame - first_frame;

        if num_frames > 1 {
            let x0 = min.x + selected_cell_idx as f32 * size.x / n;
            let x1 = min.x + (selected_cell_idx + 1) as f32 * size.x / n;
            let selected_frame_rect = egui::Rect {
                min: egui::Pos2 { x: x0, y: y0 },
                max: egui::Pos2 { x: x1, y: y1 },
            };
            ui.painter().rect(
                selected_frame_rect,
                0u8,
                style.visuals.widgets.active.bg_fill,
                style.visuals.widgets.active.bg_stroke,
                egui::StrokeKind::Inside,
            );
        }

        if num_frames > 0 {
            if let Some((idx, frame_rect)) = hovered_frame {
                ui.painter().rect(
                    frame_rect, 0u8,
                    if idx == selected_cell_idx {
                        style.visuals.widgets.active.bg_fill
                    } else {
                        style.visuals.widgets.hovered.bg_fill
                    },
                    style.visuals.widgets.hovered.bg_stroke,
                    egui::StrokeKind::Inside,
                );

                if response.clicked() || response.is_pointer_button_down_on() {
                    *current_frame = first_frame + idx;
                }
            }
        }
    });
}
