/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use std::io::{self, Read};
use std::process::{Command, Stdio};

use anyhow::{anyhow, Result};

pub(crate) struct CommandResult {
    pub(crate) exit_code: i32,
    pub(crate) output: String,
}

/// A simple trait to facilitate unit testing of functions that run commands.
pub(crate) trait CommandRunner {
    fn run(&self, cmd: Command) -> Result<CommandResult>;
}

pub(crate) struct RealRunner;

impl CommandRunner for RealRunner {
    fn run(&self, mut cmd: Command) -> Result<CommandResult> {
        // Pipe stdout and stderr to the same buffer. This ensures that the
        // output is exactly the same as would be seen in a shell, at the cost
        // of not separating stdout and stderr.
        let (mut stdout_r, stdout_w) = io::pipe()?;
        let stderr = stdout_w.try_clone()?;
        let mut child = cmd
            .stdout(Stdio::from(stdout_w))
            .stderr(Stdio::from(stderr))
            .spawn()?;

        // The `read_to_string` being called above won't return until an EOF
        // is found. That won't happen until the `stdout_w` we gave to `cmd`
        // is dropped. The cleanest way to do that is to drop `cmd` now that
        // we're done with it.
        drop(cmd);

        let mut output = String::new();
        stdout_r.read_to_string(&mut output)?;

        let exit_code = child
            .wait()?
            .code()
            .ok_or_else(|| anyhow!("process had no exit code"))?;

        return Ok(CommandResult {
            exit_code: exit_code,
            output: output,
        });
    }
}
