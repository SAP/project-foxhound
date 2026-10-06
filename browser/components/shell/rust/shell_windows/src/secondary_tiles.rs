/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
use nserror::{NS_OK, NS_ERROR_INVALID_ARG, nsresult};
use nsstring::{nsACString, nsAString, nsCString};
use std::path::PathBuf;
use thin_vec::ThinVec;
use windows::Foundation::Uri;
use windows::Storage::ApplicationData;
use windows::UI::StartScreen::SecondaryTile;
use windows::core::{HRESULT, HSTRING, Result as WindowsResult, h};
use xpcom::{RefPtr, interfaces::nsISecondaryTileListener, xpcom, xpcom_method};

#[xpcom(implement(nsISecondaryTileService), atomic)]
struct SecondaryTileService {}

impl SecondaryTileService {
    xpcom_method!(request_create_and_pin => RequestCreateAndPin(tile_id: *const nsACString, name: *const nsAString, icon_path: *const nsACString, args: *const ThinVec<nsCString>, listener: *const nsISecondaryTileListener));
    pub fn request_create_and_pin(
        &self,
        tile_id: &nsACString,
        name: &nsAString,
        icon_path: &nsACString,
        args: &ThinVec<nsCString>,
        listener: &nsISecondaryTileListener,
    ) -> Result<(), nsresult> {
        let tile_id = tile_id.to_string();
        let name = HSTRING::from_wide(name);
        let icon_path = icon_path.to_string();
        let listener = RefPtr::new(listener);

        if tile_id.contains('/') || tile_id.contains('\\') {
            return Err(NS_ERROR_INVALID_ARG);
        }

        // Create a command line for use with the secondary tile APIs.
        // TODO: Like nsWindowsShellService::CreateShellLinkObject, this
        // doesn't handle arguments containing quotation marks. It should be
        // updated to use an analogue of MakeCommandLine instead.
        let cmdline: String = args
            .iter()
            .map(|arg| format!("\"{}\"", arg))
            .collect::<Vec<_>>()
            .join(" ");

        moz_task::spawn_local("SecondaryTile creation", async move {
            let result =
                Self::create_secondary_tile(tile_id, &name, icon_path, &HSTRING::from(cmdline))
                    .await;

            // SAFETY: `listener` is assumed to be valid, we hold a reference
            // to it, we're on the main thread, we're only passing a bool/i32
            // where any value is acceptable, and it should not do anything
            // otherwise unsafe.
            unsafe {
                match result {
                    Ok(accepted) => listener.Succeeded(accepted),
                    Err(err) => listener.Failed(err.code().0),
                }
            };
        })
        .detach();

        Ok(())
    }

    async fn create_secondary_tile(
        tile_id: String,
        name: &HSTRING,
        icon_path: String,
        cmdlinew: &HSTRING,
    ) -> WindowsResult<bool> {
        let image_prefix = tile_id.clone();
        let image_uri = moz_task::spawn_blocking("SecondaryTile image copy", async move {
            Self::copy_image(&icon_path, &image_prefix)
        })
        .await?;

        let secondary_tile = SecondaryTile::new()?;
        secondary_tile.SetTileId(&HSTRING::from(tile_id))?;
        secondary_tile.SetDisplayName(name)?;
        secondary_tile.SetArguments(cmdlinew)?;

        secondary_tile
            .VisualElements()?
            .SetSquare150x150Logo(&image_uri)?;
        secondary_tile
            .VisualElements()?
            .SetSquare44x44Logo(&image_uri)?;

        let taskbar_manager = windows::UI::Shell::TaskbarManager::GetDefault()?;
        taskbar_manager
            .RequestPinSecondaryTileAsync(&secondary_tile)?
            .await
    }

    xpcom_method!(request_delete => RequestDelete(tile_id: *const nsACString, listener: *const nsISecondaryTileListener));
    pub fn request_delete(
        &self,
        tile_id: &nsACString,
        listener: &nsISecondaryTileListener,
    ) -> Result<(), nsresult> {
        let tile_id = tile_id.to_string();
        let listener = RefPtr::new(listener);

        if tile_id.contains('/') || tile_id.contains('\\') {
            return Err(NS_ERROR_INVALID_ARG);
        }

        moz_task::spawn_local("SecondaryTile deletion", async move {
            let result = Self::delete_secondary_tile(tile_id).await;

            // SAFETY: `listener` is assumed to be valid, we hold a reference
            // to it, we're on the main thread, we're only passing a bool/i32
            // where any value is acceptable, and it should not do anything
            // otherwise unsafe.
            unsafe {
                match result {
                    Ok(accepted) => listener.Succeeded(accepted),
                    Err(err) => listener.Failed(err.code().0),
                }
            };
        })
        .detach();

        Ok(())
    }

    async fn delete_secondary_tile(tile_id: String) -> WindowsResult<bool> {
        let taskbar_manager = windows::UI::Shell::TaskbarManager::GetDefault()?;

        let was_removed = taskbar_manager
            .TryUnpinSecondaryTileAsync(&HSTRING::from(&tile_id))?
            .await?;

        // Wait until unpinning succeeded before removing the image.
        moz_task::spawn_blocking("SeconaryTile image deletion", async move {
            Self::remove_images(&tile_id)
        })
        .await?;

        Ok(was_removed)
    }

    /// Copies the image at the given path to a path inside of the
    /// `ms-appdata:///local` directory, making it usable as a secondary tile
    /// icon.
    fn copy_image(source: &str, prefix: &str) -> WindowsResult<Uri> {
        let (path, uri) = Self::get_image_location(prefix)?;

        if let Some(Err(err)) = path.parent().map(std::fs::create_dir) {
            if err.kind() != std::io::ErrorKind::AlreadyExists {
                return Err(windows_error_from_io_error(err));
            }
        }

        std::fs::copy(source, &path).map_err(windows_error_from_io_error)?;

        Ok(uri)
    }

    fn remove_images(prefix: &str) -> WindowsResult<()> {
        let path = Self::get_image_location(prefix)?.0;
        let result = std::fs::remove_file(&path).map_err(windows_error_from_io_error);

        // Remove the secondary tiles folder if it's empty, but if something
        // goes wrong ignore it.
        let _ = path.parent().map(|parent| std::fs::remove_dir(parent));

        result
    }

    fn get_image_location(prefix: &str) -> WindowsResult<(PathBuf, Uri)> {
        // In theory, we could scale the images according to each size that
        // Windows wants (e.g. 44x44, 150x150, ...). We currently rely on
        // Windows to scale the images for us, though, so use 'generic' to
        // indicate that the size isn't specific.
        Self::get_storage_location(&format!("secondarytiles\\{}_generic.png", prefix))
    }

    fn get_storage_location(relative: &str) -> WindowsResult<(PathBuf, Uri)> {
        let mut path: PathBuf = ApplicationData::Current()
            .and_then(|appdata| appdata.LocalFolder())
            .and_then(|folder| folder.Path())?
            .to_os_string()
            .into();
        path.push(relative);

        let uri = Uri::CreateWithRelativeUri(h!("ms-appdata:///local/"), &HSTRING::from(relative))?;

        Ok((path, uri))
    }
}

fn windows_error_from_io_error(io_error: std::io::Error) -> windows::core::Error {
    windows::core::Error::from_hresult(
        io_error
            .raw_os_error()
            .map(|w32| HRESULT::from_win32(w32 as u32))
            .unwrap_or(windows::Win32::Foundation::E_FAIL),
    )
}

/// Constructor to allow the `nsISecondaryTileService` to be created through
/// the C ABI.
///
/// # Safety
///
/// This function much be called with valid `iid` and `result` pointers.
#[unsafe(no_mangle)]
pub extern "C" fn shell_windows_new_secondary_tile_service(
    iid: &xpcom::nsIID,
    result: *mut *mut xpcom::reexports::libc::c_void,
) -> nsresult {
    let service = SecondaryTileService::allocate(InitSecondaryTileService {});
    // SAFETY: The caller is responsible to pass a valid IID and pointer-to-pointer.
    unsafe { service.QueryInterface(iid, result) }
}
