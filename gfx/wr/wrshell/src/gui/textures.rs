/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use super::{Gui, Document, DocumentKind};
use webrender_api::debugger::DebuggerTextureContent;
use webrender_api::TextureCacheCategory;

pub fn texture_viewer_ui(ui: &mut egui::Ui, image: &DebuggerTextureContent, handle: &egui::TextureHandle) {
    ui.label(format!("Size: {}x{}, Format {:?}", image.width, image.height, image.format));

    egui::ScrollArea::both().show(ui, |ui| {
        ui.image(egui::ImageSource::Texture(
            egui::load::SizedTexture::new(
                handle.id(),
                egui::vec2(image.width as f32, image.height as f32)
            )
        ));
    });
}

pub fn texture_list_ui(app: &mut Gui, ui: &mut egui::Ui) {
   texture_list_inner(app, ui, TextureCacheCategory::Atlas);
   texture_list_inner(app, ui, TextureCacheCategory::Standalone);
   texture_list_inner(app, ui, TextureCacheCategory::RenderTarget);
   texture_list_inner(app, ui, TextureCacheCategory::PictureTile);
}

fn texture_category_query(category: TextureCacheCategory) -> &'static str {
    match category {
        TextureCacheCategory::Atlas => "atlas-textures",
        TextureCacheCategory::Standalone => "standalone-textures",
        TextureCacheCategory::PictureTile => "tile-textures",
        TextureCacheCategory::RenderTarget => "target-textures",
    }
}

fn texture_category_label(category: TextureCacheCategory) -> &'static str {
    match category {
        TextureCacheCategory::Atlas => "Atlases",
        TextureCacheCategory::Standalone => "Standalone",
        TextureCacheCategory::PictureTile => "Tiles",
        TextureCacheCategory::RenderTarget => "Render targets",
    }
}

fn texture_list_inner(app: &mut Gui, ui: &mut egui::Ui, category: TextureCacheCategory) {
    let width = ui.available_width();

    let cursor = ui.cursor().min;
    let refresh_rect = egui::Rect {
        min: egui::Pos2::new(cursor.x + width - 20.0, cursor.y),
        max: egui::Pos2::new(cursor.x + width, cursor.y + 20.0),
    };
    let refresh_button = egui::widgets::Button::new("↓");
    if ui.place(refresh_rect, refresh_button).clicked() {
        let query_result = app.net.get_with_query(
            "query", &[("type", texture_category_query(category))]
        );

        if let Ok(Some(msg)) = query_result {
            app.data_model.preview_doc_index = None;
            app.data_model.documents.retain(|doc| !doc_is_texture(doc, category));

            // Note: deserializing the textures takes a long time in
            // debug builds.
            let new_textures = serde_json::from_str(msg.as_str()).unwrap();
            add_textures(app, new_textures);
        }
    }

    egui::CollapsingHeader::new(texture_category_label(category)).default_open(true).show(ui, |ui| {
        egui::ScrollArea::vertical().show(ui, |ui| {
            for (i, doc) in app.data_model.documents.iter().enumerate() {
                if !doc_is_texture(doc, category) {
                    continue;
                }

                let item = egui::Button::selectable(
                    app.data_model.preview_doc_index == Some(i),
                    &doc.title,
                ).min_size(egui::vec2(width - 20.0, 20.0));

                if ui.add(item).clicked() {
                    app.data_model.preview_doc_index = Some(i);
                }
            }
        });
    });
}

pub fn add_textures(
    app: &mut Gui,
    mut textures: Vec<DebuggerTextureContent>,
) {
    textures.sort_by(|a, b| a.name.cmp(&b.name));
    for texture in textures {
        app.data_model.documents.push(Document {
            title: texture.name.clone(),
            kind: DocumentKind::Texture {
                content: texture,
                handle: None,
            }
        });
    }
}

/// Perform uploads if need be. Happens earlier in the update because it needs
/// access to the egui context.
pub fn prepare(app: &mut super::Gui, ctx: &egui::Context) {
    if let Some(idx) = app.data_model.preview_doc_index {
        if idx >= app.data_model.documents.len() {
            return;
        }

        let DocumentKind::Texture { content, handle } = &mut app.data_model.documents[idx].kind else {
            return;
        };

        if handle.is_some() {
            return;
        }

        if let Some(gpu_texture) = upload_texture(ctx, content) {
            *handle = Some(gpu_texture)
        }
    }
}

fn upload_texture(
    ctx: &egui::Context,
    texture: &DebuggerTextureContent,
) -> Option<egui::TextureHandle> {
    use webrender_api::ImageFormat;

    let color_image = match texture.format {
        ImageFormat::RGBA8 => {
            egui::ColorImage::from_rgba_unmultiplied(
                [texture.width as usize, texture.height as usize],
                &texture.data,
            )
        }
        ImageFormat::BGRA8 => {
            // Convert BGRA to RGBA
            let mut rgba_data = texture.data.clone();
            for pixel in rgba_data.chunks_exact_mut(4) {
                pixel.swap(0, 2); // Swap B and R
            }
            egui::ColorImage::from_rgba_unmultiplied(
                [texture.width as usize, texture.height as usize],
                &rgba_data,
            )
        }
        ImageFormat::R8 => {
            // Convert grayscale to RGBA
            let rgba_data: Vec<u8> = texture.data.iter()
                .flat_map(|&gray| [gray, gray, gray, 255])
                .collect();
            egui::ColorImage::from_rgba_unmultiplied(
                [texture.width as usize, texture.height as usize],
                &rgba_data,
            )
        }
        _ => {
            println!("Unsupported texture format: {:?}", texture.format);
            return None;
        }
    };

    Some(ctx.load_texture(
        &texture.name,
        color_image,
        egui::TextureOptions::default(),
    ))
}

fn doc_is_texture(doc: &Document, kind: TextureCacheCategory) -> bool {
    match doc.kind {
        DocumentKind::Texture { content: DebuggerTextureContent { category, .. }, .. } => {
            category == kind
        },
        _ => false,
    }
}
