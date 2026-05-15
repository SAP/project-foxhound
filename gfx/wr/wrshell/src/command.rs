/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use std::collections::BTreeMap;
use webrender_api::debugger::DebuggerTextureContent;
use crate::net;

// Types for defining debug commands (and queries) that can be run in CLI or GUI mode

pub struct CommandContext<'a> {
    pub net: &'a mut net::HttpConnection,
    args: BTreeMap<String, String>,
}

impl<'a> CommandContext<'a> {
    pub fn new(
        args: BTreeMap<String, String>,
        net: &'a mut net::HttpConnection,
    ) -> Self {
        CommandContext {
            args,
            net,
        }
    }

    #[allow(dead_code)]
    pub fn arg_string(
        &self,
        key: &str,
    ) -> &str {
        self.args[key].as_str()
    }
}

#[derive(Debug)]
pub enum CommandOutput {
    Log(String),
    Err(String),
    TextDocument {
        title: String,
        content: String,
    },
    SerdeDocument {
        kind: String,
        content: String,
    },
    Textures(Vec<DebuggerTextureContent>),
}

pub struct ParamDescriptor {
    pub name: &'static str,
    pub is_required: bool,
}

pub struct CommandDescriptor {
    pub name: &'static str,
    pub alias: Option<&'static str>,
    pub help: &'static str,
    pub params: &'static [ParamDescriptor],
}

impl Default for CommandDescriptor {
    fn default() -> Self {
        CommandDescriptor {
            name: "",
            alias: None,
            help: "",
            params: &[],
        }
    }
}

pub trait Command {
    fn descriptor(&self) -> CommandDescriptor;
    fn run(
        &mut self,
        ctx: &mut CommandContext,
    ) -> CommandOutput;
}

pub struct CommandList {
    commands: Vec<Box<dyn Command>>,
}

impl CommandList {
    pub fn new() -> Self {
        CommandList {
            commands: Vec::new(),
        }
    }

    pub fn register_command(
        &mut self,
        cmd: Box<dyn Command>,
    ) {
        assert!(!cmd.descriptor().name.is_empty(), "Invalid cmd name");
        self.commands.push(cmd);
    }

    pub fn cmds(&self) -> &[Box<dyn Command>] {
        &self.commands
    }

    pub fn get_mut<'a>(&mut self, name: &'a str) -> Option<&mut Box<dyn Command>> {
        self.commands
            .iter_mut()
            .find(|cmd| {
                let desc = cmd.descriptor();
                desc.name == name || desc.alias == Some(name)
            })
    }
}
