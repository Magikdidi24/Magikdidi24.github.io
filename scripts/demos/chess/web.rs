//! The web build of the chess engine (github.com/Magikdidi24/ChessBoard).
//!
//! board.rs, moves.rs and engine.rs are compiled as they are: the rules and
//! the search are Samuel's code, unchanged. This file stands for main.rs,
//! which draws the board with macroquad and runs the engine in a thread:
//! here the page draws the board, and asks these functions what the position
//! is, what may be played, and what the engine answers.
//!
//! Squares are numbered as in board.rs: 0 is a8, 63 is h1. A piece is a
//! number: 1 king, 2 queen, 3 rook, 4 bishop, 5 knight, 6 pawn, plus 8 when
//! it is black; 0 is an empty square.
#![allow(dead_code)] // what only main.rs called

mod board;
mod engine;
mod moves;

use std::cell::RefCell;
use std::sync::atomic::AtomicBool;
use std::time::Duration;

use board::{Board, Color, PieceType, START_FEN, fen_to_board};
use engine::search;
use moves::{Move, Status, game_status, is_in_check, legal_moves, make_move};

struct Game {
    board: Board,
    /// The positions played before `board`, oldest first.
    history: Vec<Board>,
    last: Option<Move>,
    /// What the last search of the engine reached.
    depth: u32,
    nodes: u64,
    score: i32,
}

impl Game {
    fn new() -> Self {
        Game { board: fen_to_board(START_FEN), history: vec![], last: None, depth: 0, nodes: 0, score: 0 }
    }

    fn play(&mut self, m: Move) {
        self.history.push(self.board);
        self.board = make_move(self.board, m);
        self.last = Some(m);
    }
}

thread_local! {
    static GAME: RefCell<Game> = RefCell::new(Game::new());
}

fn code(kind: PieceType) -> u32 {
    match kind {
        PieceType::King => 1,
        PieceType::Queen => 2,
        PieceType::Rook => 3,
        PieceType::Bishop => 4,
        PieceType::Knight => 5,
        PieceType::Pawn => 6,
    }
}

fn kind(code: u32) -> Option<PieceType> {
    match code {
        2 => Some(PieceType::Queen),
        3 => Some(PieceType::Rook),
        4 => Some(PieceType::Bishop),
        5 => Some(PieceType::Knight),
        _ => None,
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn new_game() {
    GAME.with(|game| *game.borrow_mut() = Game::new());
}

#[unsafe(no_mangle)]
pub extern "C" fn piece(square: u32) -> u32 {
    GAME.with(|game| match game.borrow().board.get(square as usize % 64) {
        Some(p) => code(p.kind) + if p.color == Color::Black { 8 } else { 0 },
        None => 0,
    })
}

/// 0 when White is to move, 1 when Black is.
#[unsafe(no_mangle)]
pub extern "C" fn turn() -> u32 {
    GAME.with(|game| (game.borrow().board.who_play == Color::Black) as u32)
}

/// The squares the piece on `from` may go to, one bit per square.
#[unsafe(no_mangle)]
pub extern "C" fn targets(from: u32) -> u64 {
    GAME.with(|game| {
        legal_moves(&game.borrow().board).iter().filter(|m| m.from == from as usize).fold(0, |bits, m| bits | 1 << m.to)
    })
}

/// Whether going from `from` to `to` promotes a pawn: the move then needs a piece.
#[unsafe(no_mangle)]
pub extern "C" fn promotes(from: u32, to: u32) -> u32 {
    GAME.with(|game| {
        legal_moves(&game.borrow().board).iter().any(|m| m.from == from as usize && m.to == to as usize && m.promotion.is_some()) as u32
    })
}

/// Play a move if it is legal, with the piece a pawn becomes when it promotes. Returns whether it was played.
#[unsafe(no_mangle)]
pub extern "C" fn play(from: u32, to: u32, promotion: u32) -> u32 {
    GAME.with(|game| {
        let mut game = game.borrow_mut();
        let wanted = Move { from: from as usize, to: to as usize, promotion: kind(promotion) };
        let legal = legal_moves(&game.board).contains(&wanted);
        if legal {
            game.play(wanted);
        }
        legal as u32
    })
}

/// Let the engine search for `milliseconds` at most, to `max_depth` at most, and play what it finds. Returns whether it played.
#[unsafe(no_mangle)]
pub extern "C" fn think(milliseconds: u32, max_depth: u32) -> u32 {
    GAME.with(|game| {
        let mut game = game.borrow_mut();
        let found = search(&game.board, &game.history, max_depth, Duration::from_millis(milliseconds as u64), &AtomicBool::new(false));
        game.depth = found.depth;
        game.nodes = found.nodes;
        game.score = found.score;
        match found.best {
            Some(m) => {
                game.play(m);
                1
            }
            None => 0,
        }
    })
}

/// 0 while the game goes on, then 1 checkmate (the side to move is mated), 2 stalemate, 3 fifty moves, 4 not enough material, 5 repetition.
#[unsafe(no_mangle)]
pub extern "C" fn status() -> u32 {
    GAME.with(|game| {
        let game = game.borrow();
        match game_status(&game.board, &game.history) {
            Status::Ongoing => 0,
            Status::Checkmate => 1,
            Status::Stalemate => 2,
            Status::FiftyMoves => 3,
            Status::InsufficientMaterial => 4,
            Status::Repetition => 5,
        }
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn in_check() -> u32 {
    GAME.with(|game| {
        let game = game.borrow();
        is_in_check(game.board, game.board.who_play) as u32
    })
}

/// The last move played, as `from * 64 + to`, or -1 before the first one.
#[unsafe(no_mangle)]
pub extern "C" fn last_move() -> i32 {
    GAME.with(|game| game.borrow().last.map_or(-1, |m| (m.from * 64 + m.to) as i32))
}

#[unsafe(no_mangle)]
pub extern "C" fn search_depth() -> u32 {
    GAME.with(|game| game.borrow().depth)
}

#[unsafe(no_mangle)]
pub extern "C" fn search_nodes() -> f64 {
    GAME.with(|game| game.borrow().nodes as f64)
}
