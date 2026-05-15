/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Strings should have a maximum of 111 characters and be comprised of printable ASCII characters.

pub fn build_telemetry_struct() -> wgh::Telemetry {
    wgh::Telemetry {
        #[cfg(target_os = "windows")]
        d3d12_expose_adapter,
    }
}

#[cfg(target_os = "windows")]
fn d3d12_expose_adapter(
    desc: &windows::Win32::Graphics::Dxgi::DXGI_ADAPTER_DESC2,
    driver_version: Result<[u16; 4], windows::core::HRESULT>,
    result: wgh::D3D12ExposeAdapterResult,
) {
    // The key must be under 111 bytes:
    // - backend identifier 'D' = 1 byte
    // - 4 * u32's formatted as hex = 4 * 8 = 32 bytes
    // - 5 * ':' separators = 5 bytes
    // - 4 * u16's formatted as dec + 3 * '.' separators = 4 * 5 + 3 = 23 bytes OR
    //   'DVE:' + a u32 formatted as hex = 4 + 8 = 12 bytes
    // total = 61 or 50 bytes
    let key = match driver_version {
        Ok(driver_version) => &format!(
            "D:{:X}:{:X}:{:X}:{:X}:{}.{}.{}.{}",
            desc.VendorId,
            desc.DeviceId,
            desc.SubSysId,
            desc.Revision,
            driver_version[0],
            driver_version[1],
            driver_version[2],
            driver_version[3],
        ),
        Err(hresult) => &format!(
            "D:{:X}:{:X}:{:X}:{:X}:DVE:{:X}",
            desc.VendorId, desc.DeviceId, desc.SubSysId, desc.Revision, hresult.0
        ),
    };
    let category = match result {
        wgh::D3D12ExposeAdapterResult::CreateDeviceError(err) => match err {
            wgh::dx12::CreateDeviceError::GetProcAddress => "NONE:GetProcAddress",
            wgh::dx12::CreateDeviceError::D3D12CreateDevice(hresult) => {
                &format!("NONE:D3D12CreateDevice:{:X}", hresult.0)
            }
            wgh::dx12::CreateDeviceError::RetDeviceIsNull => "NONE:RetDeviceIsNull",
        },
        wgh::D3D12ExposeAdapterResult::UnknownFeatureLevel(fl) => {
            &format!("NONE:UNKNOWN_FL:{}", fl)
        }
        wgh::D3D12ExposeAdapterResult::ResourceBindingTier2Requirement => "NONE:REQ_RBT2",
        wgh::D3D12ExposeAdapterResult::ShaderModel6Requirement => "NONE:REQ_SM6",
        wgh::D3D12ExposeAdapterResult::Success(feature_level, shader_model) => {
            let feature_level = match feature_level {
                wgh::dx12::FeatureLevel::_11_0 => "11_0",
                wgh::dx12::FeatureLevel::_11_1 => "11_1",
                wgh::dx12::FeatureLevel::_12_0 => "12_0",
                wgh::dx12::FeatureLevel::_12_1 => "12_1",
                wgh::dx12::FeatureLevel::_12_2 => "12_2",
            };
            let shader_model = match shader_model {
                wgh::dx12::ShaderModel::_5_1 => "5.1",
                wgh::dx12::ShaderModel::_6_0 => "6.0",
                wgh::dx12::ShaderModel::_6_1 => "6.1",
                wgh::dx12::ShaderModel::_6_2 => "6.2",
                wgh::dx12::ShaderModel::_6_3 => "6.3",
                wgh::dx12::ShaderModel::_6_4 => "6.4",
                wgh::dx12::ShaderModel::_6_5 => "6.5",
                wgh::dx12::ShaderModel::_6_6 => "6.6",
                wgh::dx12::ShaderModel::_6_7 => "6.7",
                wgh::dx12::ShaderModel::_6_8 => "6.8",
                wgh::dx12::ShaderModel::_6_9 => "6.9",
            };
            &format!("SOME:FL{feature_level}:SM{shader_model}")
        }
    };
    firefox_on_glean::metrics::webgpu::expose_adapter
        .get(key, category)
        .add(1);
}
