/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use rusqlite::{
    types::{FromSql, FromSqlError, FromSqlResult, ToSqlOutput, ValueRef},
    ToSql,
};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Value(serde_json::Value);

impl From<serde_json::Value> for Value {
    fn from(value: serde_json::Value) -> Self {
        Self(value)
    }
}

impl Value {
    pub fn inner(&self) -> &serde_json::Value {
        &self.0
    }
}

impl ToSql for Value {
    fn to_sql(&self) -> rusqlite::Result<ToSqlOutput<'_>> {
        Ok(ToSqlOutput::from(serde_json::to_string(&self.0).map_err(
            |e| rusqlite::Error::ToSqlConversionFailure(e.into()),
        )?))
    }
}

impl FromSql for Value {
    fn column_result(value: ValueRef<'_>) -> FromSqlResult<Self> {
        Ok(Self(
            serde_json::from_slice(value.as_bytes()?).map_err(|e| FromSqlError::Other(e.into()))?,
        ))
    }
}

#[derive(thiserror::Error, Debug)]
pub enum ValueError {
    #[error("to variant")]
    ToVariant,
}
