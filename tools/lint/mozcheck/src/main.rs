// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

mod batch;
mod common;
#[cfg(unix)]
mod file_perm;
mod file_whitespace;
mod license;
mod pathutil;
mod rejected_words;
mod trojan_source;

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "mozcheck", about = "Fast linting tools for Mozilla")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Scan files for rejected word patterns
    RejectedWords {
        /// Regex pattern to search for
        #[arg(long)]
        pattern: String,

        /// Case-insensitive matching
        #[arg(long, default_value_t = false)]
        ignore_case: bool,

        /// Linter name for output
        #[arg(long)]
        linter: String,

        /// Message to include in lint issues
        #[arg(long)]
        message: String,

        /// Rule name for output
        #[arg(long)]
        rule: String,
    },
    /// Check file permissions (Unix only)
    #[cfg(unix)]
    FilePerm {
        /// Allow executable bit on files with shebang
        #[arg(long, default_value_t = false)]
        allow_shebang: bool,

        /// Fix permissions (chmod 644)
        #[arg(long, default_value_t = false)]
        fix: bool,

        /// Linter name for output
        #[arg(long, default_value = "file-perm")]
        linter: String,
    },
    /// Check whitespace issues (trailing spaces, missing newlines, CRLF)
    FileWhitespace {
        /// Fix whitespace issues
        #[arg(long, default_value_t = false)]
        fix: bool,

        /// Linter name for output
        #[arg(long, default_value = "file-whitespace")]
        linter: String,
    },
    /// Detect Unicode format characters (CVE-2021-42572)
    TrojanSource {
        /// Linter name for output
        #[arg(long, default_value = "trojan-source")]
        linter: String,
    },
    /// Run multiple linters in batch mode (JSON from stdin)
    Batch,
}

fn main() {
    let cli = Cli::parse();

    let result = match cli.command {
        Commands::RejectedWords {
            pattern,
            ignore_case,
            linter,
            message,
            rule,
        } => rejected_words::run(&pattern, ignore_case, &linter, &message, &rule),
        #[cfg(unix)]
        Commands::FilePerm {
            allow_shebang,
            fix,
            linter,
        } => {
            file_perm::run(allow_shebang, fix, &linter);
            Ok(())
        }
        Commands::FileWhitespace { fix, linter } => {
            file_whitespace::run(fix, &linter);
            Ok(())
        }
        Commands::TrojanSource { linter } => {
            trojan_source::run(&linter);
            Ok(())
        }
        Commands::Batch => batch::run(),
    };

    if let Err(e) = result {
        eprintln!("{e}");
        std::process::exit(1);
    }
}
