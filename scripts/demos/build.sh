#!/bin/sh
# Builds the two programs that can be played in the 3D room, from Samuel's own
# repositories at the commits below: public/room/demos/fluid.wasm (C) and
# chess.wasm (Rust). Their sources are compiled as they are; web.c and web.rs
# stand for the main() of each, which opened a window.
#
#   sh scripts/demos/build.sh
#
# Needs git, clang, wasm-ld, and rustc with its wasm32-wasip1 standard library
# and wasi-libc. On Fedora: dnf install clang lld rust-std-static-wasm32-wasip1
# wasi-libc-static. Where they are not installed, WASM_LD, RUST_SYSROOT and
# WASI_LIBC can point to unpacked copies.
set -eu

FLUID=13c9fd639907a3a478ead94226839043d45cd450
CHESS=3dabad1833ed21d3fea38767bcf217fc553ffd96

here=$(cd "$(dirname "$0")" && pwd)
out=$here/../../public/room/demos
wasm_ld=${WASM_LD:-wasm-ld}
wasi_libc=${WASI_LIBC:-/usr/wasm32-wasi/lib/wasm32-wasi}
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

# A repository at one commit, without its history.
fetch() {
  git init -q "$work/$1"
  git -C "$work/$1" fetch -q --depth 1 "https://github.com/Magikdidi24/$2" "$3"
  git -C "$work/$1" checkout -q FETCH_HEAD
}

mkdir -p "$out"

# The liquid simulator. Its SDL calls become imports that the page implements.
fetch fluid Fluid_Simulation "$FLUID"
clang --target=wasm32 -O2 -nostdlib -mbulk-memory -Wall \
  -I "$here/fluid/include" -I "$work/fluid" -c "$here/fluid/web.c" -o "$work/fluid.o"
"$wasm_ld" --no-entry --import-undefined --strip-all -z stack-size=262144 -o "$out/fluid.wasm" "$work/fluid.o"

# The chess engine: its three modules beside web.rs, which takes the place of main.rs.
# The folder it is built in is left out of the file, so that two builds give the same bytes.
fetch chess ChessBoard "$CHESS"
mkdir "$work/engine"
cp "$work/chess/src/board.rs" "$work/chess/src/moves.rs" "$work/chess/src/engine.rs" "$here/chess/web.rs" "$work/engine/"
rustc --edition 2024 --target wasm32-wasip1 --crate-type cdylib --crate-name chess \
  ${RUST_SYSROOT:+--sysroot "$RUST_SYSROOT"} \
  --remap-path-prefix "$work/engine=src" \
  -C opt-level=3 -C panic=abort -C strip=symbols -C lto=fat -C codegen-units=1 \
  -C linker="$wasm_ld" -L "$wasi_libc" -o "$out/chess.wasm" "$work/engine/web.rs"

ls -l "$out"
