/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use std::collections::VecDeque;

#[derive(Debug)]
pub struct GraphStats {
    pub min: f64,
    pub avg: f64,
    pub max: f64,
    pub sum: f64,
    pub samples: usize,
}

pub struct Graph {
    pub name: String,
    pub values: VecDeque<f64>,
}

impl Graph {
    pub fn new(name: &str, max_samples: usize) -> Self {
        let mut values = VecDeque::new();
        values.reserve(max_samples);

        Graph {
            name: name.into(),
            values
        }
    }

    pub fn push(&mut self, val: f64) {
        if self.values.len() == self.values.capacity() {
            self.values.pop_back();
        }
        self.values.push_front(val);
    }

    pub fn stats(&self) -> GraphStats {
        let mut stats = GraphStats {
            min: f64::MAX,
            avg: 0.0,
            max: -f64::MAX,
            sum: 0.0,
            samples: 0,
        };

        let mut samples = 0;
        for value in &self.values {
            if value.is_finite() {
                stats.min = stats.min.min(*value);
                stats.max = stats.max.max(*value);
                stats.sum += *value;
                samples += 1;
            }
        }

        if samples > 0 {
            stats.avg = stats.sum / samples as f64;
            stats.samples = samples;
        } else {
            stats.min = 0.0;
            stats.max = 0.0;
        }

        stats
    }
}

pub fn ui(app: &mut super::Gui, ui: &mut egui::Ui) {
    for graph in app.data_model.profile_graphs.values() {
        let stats = graph.stats();

        ui.label(&graph.name);

        let (response, painter) = ui.allocate_painter(
            egui::vec2(1024.0, 128.0),
            egui::Sense::hover(),
        );

        let rect = response.rect;

        // Background
        painter.rect_filled(rect, 0.0, egui::Color32::from_rgb(77, 77, 77));

        let max_samples = graph.values.capacity() as f32;
        let w = rect.width() / max_samples;
        let h = rect.height();

        let color_t0 = egui::Color32::from_rgb(0, 255, 0);

        for (index, sample) in graph.values.iter().enumerate() {
            if !sample.is_finite() {
                continue;
            }
            let sample = *sample as f32;
            let x1 = rect.right() - index as f32 * w;
            let x0 = x1 - w;

            let y0 = rect.bottom() - (sample / stats.max as f32) * h;
            let y1 = rect.bottom();

            let rect = egui::Rect::from_min_max(
                egui::pos2(x0, y0),
                egui::pos2(x1, y1),
            );

            painter.rect_filled(rect, 0.0, color_t0);
        }

        ui.label(format!("Min: {:.2}, Avg: {:.2}, Max: {:.2}", stats.min, stats.avg, stats.max));
    }
}
