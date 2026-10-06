/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use crate::command::{Command, CommandDescriptor, CommandList, ParamDescriptor};
use crate::command::{CommandContext, CommandOutput};
use crate::wrench;

use webrender::scene::Scene;

// Implementation of a basic set of script commands

// Register the script commands in this source file
pub fn register(cmd_list: &mut CommandList) {
    cmd_list.register_command(Box::new(ProcessCaptureCommand));
}

pub struct ProcessCaptureCommand;

impl Command for ProcessCaptureCommand {
    fn descriptor(&self) -> CommandDescriptor {
        CommandDescriptor {
            name: "process-capture",
            help: r#"
Process a WR capture directory.
  USAGE: process-capture [scene file] [output file]
"#,
            params: &[
                ParamDescriptor {
                    name: "scene",
                    is_required: true,
                },
                ParamDescriptor {
                    name: "out",
                    is_required: true,
                },
            ],
            ..Default::default()
        }
    }

    fn run(
        &mut self,
        ctx: &mut CommandContext,
    ) -> CommandOutput {
        use std::io::Write;

        let source = ctx.arg_string("scene");
        let target = ctx.arg_string("out");

        println!("Loading scene file '{}'", source);
        let scene_file = match std::fs::read_to_string(source) {
            Ok(f) => f,
            Err(..) => return CommandOutput::Err("\tUnable to read scene".into()),
        };

        println!("Deserialize scene file '{}'", source);
        let scene: Scene = match ron::de::from_str(&scene_file) {
            Ok(out) => out,
            Err(..) => return CommandOutput::Err("\tDeserialization failed".into()),
        };

        let yaml = match wrench::scene_to_yaml(&scene) {
            Ok(yaml) => yaml,
            Err(err) => return CommandOutput::Err(
                format!("\tFailed to convert - {}", err)
            ),
        };

        let mut output = match std::fs::File::create(target) {
            Ok(f) => f,
            Err(..) => return CommandOutput::Err("\tUnable to open output file".into()),
        };
        write!(output, "{}", yaml).expect("failed to write yaml");

        CommandOutput::Log(yaml)
    }
}
