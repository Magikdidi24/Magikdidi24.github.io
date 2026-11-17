#!/bin/sh
# Builds the programs that can be played in the 3D room, from Samuel's own
# repositories at the commits below, into public/room/demos: the liquid
# simulator (C), the chess engine (Rust) and five small C programs. Their
# sources are compiled as they are. fluid/web.c and chess/web.rs stand for the
# main() of the first two, which opened a window; sdl2/web.c stands for SDL2
# under the small programs, whose main() runs as it is.
#
#   sh scripts/demos/build.sh
#
# Needs git, clang, wasm-ld, wasm-opt, and rustc with its wasm32-wasip1
# standard library and wasi-libc. On Fedora: dnf install clang lld binaryen
# rust-std-static-wasm32-wasip1 wasi-libc-static. Where they are not
# installed, WASM_LD, WASM_OPT, RUST_SYSROOT and WASI_LIBC can point to
# unpacked copies.
set -eu

FLUID=13c9fd639907a3a478ead94226839043d45cd450
CHESS=3dabad1833ed21d3fea38767bcf217fc553ffd96

here=$(cd "$(dirname "$0")" && pwd)
out=$here/../../public/room/demos
wasm_ld=${WASM_LD:-wasm-ld}
wasm_opt=${WASM_OPT:-wasm-opt}
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

# A small program: its main.c under what stands for SDL2. Its loop never
# returns, so Asyncify rewrites the result: the program can be put aside when
# it sleeps or waits for events, and the page keeps its turn.
small() {
  fetch "$1" "$2" "$3"
  clang --target=wasm32 -O2 -nostdlib -fno-builtin -mbulk-memory \
    -I "$here/sdl2/include" -I "$work/$1" -c "$here/sdl2/web.c" -o "$work/$1.o"
  "$wasm_ld" --no-entry --strip-all -z stack-size=1048576 -o "$work/$1.raw.wasm" "$work/$1.o"
  "$wasm_opt" --enable-bulk-memory --enable-bulk-memory-opt --enable-nontrapping-float-to-int \
    --enable-sign-ext --enable-mutable-globals \
    --asyncify --pass-arg=asyncify-imports@env.sleep,env.poll -O2 "$work/$1.raw.wasm" -o "$out/$1.wasm"
}

small snake Snake_in_C 61efdb7096c7ba500f5834a70c7ee0b0d4188abc
small pong Pong_in_C 20daf51c63b4d4015b9bdb8a39f2ab7206eabdb8
small life Game_of_life_in_C c6fcb6e5ba44cf0f3ea6c3251f1fa995aa366591
small cube 3Dcube_in_C d4b6ae67a4dff6268c66f372b958f35ecb104841
small ball Bouncy_in_C 9e95a882c354092d225848b052e9ed7370d50683

ls -l "$out"
