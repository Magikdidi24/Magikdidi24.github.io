/*
  The web build of the 2D liquid simulator (github.com/Magikdidi24/Fluid_Simulation).
  main.c is compiled as it is, without its main(): the simulation and its
  drawing are Samuel's code, unchanged. The page stands for the window, and
  the few functions below stand for the loop of main(), which read the mouse
  and the keyboard.
*/
#define NO_MAIN
#include "main.c"

#define EXPORT(name) __attribute__((export_name(#name)))

static Cell env[COLS * ROWS];

static bool inside(int x, int y) { return x >= 0 && x < COLS && y >= 0 && y < ROWS; }

EXPORT(reset) void web_reset(void) { prep_env(env); }

/* The left button of main(): the liquid fills the cell, or a wall takes it when `liquid` is -1. */
EXPORT(paint) void web_paint(int x, int y, int liquid) {
    int count = sizeof(liquids) / sizeof(liquids[0]);
    if (!inside(x, y) || liquid < -1 || liquid >= count) return;
    int idx = y * COLS + x;
    if (liquid == -1)
        env[idx] = (Cell){-1, 0.0, x, y, 0, wall};
    else if (env[idx].type != -1)
        env[idx] = (Cell){liquid, 1.0, x, y, liquids[liquid].weight, liquids[liquid].color};
}

/* Its right button. */
EXPORT(erase) void web_erase(int x, int y) {
    if (inside(x, y)) env[y * COLS + x] = (Cell){-2, 0.0, x, y, 0, {0, 0, 0, 0}};
}

/* One turn of its loop: five rounds of the three passes, then the picture. */
EXPORT(frame) void web_frame(int pressure) {
    for (int it = 0; it < 5; it++) {
        simulation_step(env);
        mix_step(env);
        density_step(env);
    }
    SDL_SetRenderDrawColor(0, 0, 0, 0, 255);
    SDL_RenderClear(0);
    draw_env(env, 0, pressure);
    draw_grid(0);
}

/* What the page needs to know of the program: its sizes, and the colour of each liquid as 0xRRGGBB (the wall is -1). */
EXPORT(width) int web_width(void) { return WIDTH_SCREEN; }
EXPORT(height) int web_height(void) { return HEIGHT_SCREEN; }
EXPORT(cell) int web_cell(void) { return CELL_SIZE; }
EXPORT(count) int web_count(void) { return sizeof(liquids) / sizeof(liquids[0]); }
EXPORT(color) int web_color(int liquid) {
    SDL_Color c = liquid < 0 ? wall : liquids[liquid].color;
    return c.r << 16 | c.g << 8 | c.b;
}
