use std::path::PathBuf;

use anyhow::Result;
use clap::Parser;

#[derive(Parser, Debug)]
#[command()]
struct Args {
    protos: Vec<PathBuf>,
    #[arg(short = 'I')]
    includes: Vec<PathBuf>,
    #[arg(long = "rust_out")]
    rust_out: PathBuf,
}

fn main() -> Result<()> {
    let args = Args::parse();

    prost_build::Config::default()
        .out_dir(&args.rust_out)
        .compile_protos(&args.protos, &args.includes)?;

    Ok(())
}
