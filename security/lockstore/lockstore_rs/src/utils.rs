/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use crate::LockstoreError;
use kvstore::Value;

/// Convert bytes to a kvstore Value (stored as base64 JSON string)
pub fn bytes_to_value(bytes: &[u8]) -> Result<Value, LockstoreError> {
    use base64::Engine;
    let base64_str = base64::engine::general_purpose::STANDARD.encode(bytes);
    let json_val = serde_json::Value::String(base64_str);
    Ok(Value::from(json_val))
}

/// Extract bytes from a kvstore Value (stored as base64 JSON string)
pub fn value_to_bytes(value: &Value) -> Result<Vec<u8>, LockstoreError> {
    use base64::Engine;

    // Extract the string from the JSON value
    let base64_str = value
        .inner()
        .as_str()
        .ok_or_else(|| LockstoreError::Serialization("Expected string value".to_string()))?;

    // Decode from base64
    base64::engine::general_purpose::STANDARD
        .decode(base64_str)
        .map_err(|e| LockstoreError::Serialization(format!("Failed to decode base64: {}", e)))
}
