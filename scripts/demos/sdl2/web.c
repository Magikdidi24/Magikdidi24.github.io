/*
  The web build of the small C programs (Snake, Pong, the Game of Life, the
  cube, the bouncing ball). main.c of each one is compiled as it is, with its
  main() and its loop: Samuel's code, unchanged. This file stands for SDL2
  and for the little of the C library that the programs use; the page stands
  for the window, the keyboard and the mouse.

  The loop of a program never returns. So that the page keeps its turn, the
  build passes the result through Binaryen's Asyncify: when the program
  sleeps (SDL_Delay), or asks for events twice without sleeping, it is put
  aside and taken up again later.

  Everything here is named web_...: the programs define short names of their
  own, as macros too, and this file must not meet them. It is compiled before
  the program for the same reason.
*/
#include <stdarg.h>
#include <SDL2/SDL.h>
#include <SDL2/SDL_ttf.h>
#include <stdio.h>
#include <time.h>
#include <math.h>

#define EXPORT(name) __attribute__((export_name(#name)))
#define IMPORT(name) __attribute__((import_module("env"), import_name(#name)))

/* What the page does for the program. */
IMPORT(size) void web_size(int w, int h);
IMPORT(fill) void web_fill(int x, int y, int w, int h, Uint32 color);
IMPORT(text) void web_text(int x, int y, const char *text, int length, Uint32 color, int size);
IMPORT(poll) int web_poll(SDL_Event *event);
IMPORT(sleep) void web_sleep(Uint32 milliseconds);
IMPORT(print) void web_print(const char *text, int length);
IMPORT(exit) __attribute__((noreturn)) void web_exit(int code);
IMPORT(now) double web_now(void);

/* ---- The C library ---- */

static unsigned long long web_seed = 1;

void srand(unsigned seed) { web_seed = seed; }

/* 31 bits, as on Linux: a program that takes rand() % 0xFFFFFF counts on them. */
int rand(void) {
    web_seed = web_seed * 6364136223846793005ULL + 1442695040888963407ULL;
    return (int)(web_seed >> 33);
}

time_t time(time_t *out) {
    time_t seconds = (time_t)web_now();
    if (out) *out = seconds;
    return seconds;
}

void exit(int code) { web_exit(code); }

/* Memory is taken from one block and never given back: the programs ask for little. A block that grows where it stands does not move. */
static unsigned char web_heap[4 << 20];
static size_t web_used;
static size_t web_latest;

void *malloc(size_t size) {
    size = (size + 7) & ~(size_t)7;
    if (web_used + 8 + size > sizeof web_heap) return NULL;
    web_latest = web_used;
    *(size_t *)(web_heap + web_used) = size;
    web_used += 8 + size;
    return web_heap + web_latest + 8;
}

void *realloc(void *block, size_t size) {
    if (!block) return malloc(size);
    size_t at = (unsigned char *)block - web_heap - 8;
    size_t had = *(size_t *)(web_heap + at);
    if (at == web_latest) {
        web_used = at;
        return malloc(size);
    }
    unsigned char *moved = malloc(size);
    if (moved) __builtin_memcpy(moved, block, had < size ? had : size);
    return moved;
}

void free(void *block) { (void)block; }

static int web_length(const char *text) {
    int length = 0;
    while (text[length]) length++;
    return length;
}

/* printf, as far as the programs go: %d %i %u %x %c %s %f and %%, widths ignored. */
static int web_format(char *out, int room, const char *format, va_list values) {
    int n = 0;
#define WEB_PUT(c) do { if (n < room - 1) out[n++] = (c); } while (0)
    for (; *format; format++) {
        if (*format != '%') { WEB_PUT(*format); continue; }
        int decimals = 6;
        format++;
        while (*format == '-' || *format == '+' || *format == ' ' || *format == '0' || (*format >= '1' && *format <= '9')) format++;
        if (*format == '.') {
            decimals = 0;
            for (format++; *format >= '0' && *format <= '9'; format++) decimals = decimals * 10 + (*format - '0');
        }
        while (*format == 'l' || *format == 'h') format++;
        char digits[24];
        int count = 0;
        if (*format == 'd' || *format == 'i' || *format == 'u' || *format == 'x') {
            long long value = *format == 'd' || *format == 'i' ? va_arg(values, int) : va_arg(values, unsigned);
            unsigned long long rest = value < 0 ? -value : value;
            unsigned base = *format == 'x' ? 16 : 10;
            do { digits[count++] = "0123456789abcdef"[rest % base]; rest /= base; } while (rest);
            if (value < 0) WEB_PUT('-');
            while (count) WEB_PUT(digits[--count]);
        } else if (*format == 'f') {
            double value = va_arg(values, double);
            if (value < 0) { WEB_PUT('-'); value = -value; }
            double scale = 1;
            for (int i = 0; i < decimals; i++) scale *= 10;
            unsigned long long whole = (unsigned long long)value;
            unsigned long long part = (unsigned long long)((value - whole) * scale + 0.5);
            if (part >= (unsigned long long)scale) { whole++; part = 0; }
            do { digits[count++] = '0' + whole % 10; whole /= 10; } while (whole);
            while (count) WEB_PUT(digits[--count]);
            if (decimals) WEB_PUT('.');
            for (int i = 0; i < decimals; i++) { digits[i] = '0' + part % 10; part /= 10; }
            for (int i = decimals; i > 0; i--) WEB_PUT(digits[i - 1]);
        } else if (*format == 's') {
            for (const char *text = va_arg(values, const char *); text && *text; text++) WEB_PUT(*text);
        } else if (*format == 'c') {
            WEB_PUT((char)va_arg(values, int));
        } else if (*format == '%') {
            WEB_PUT('%');
        } else if (!*format) {
            break;
        }
    }
#undef WEB_PUT
    out[n] = 0;
    return n;
}

FILE *stdout = 0;
FILE *stderr = 0;
static char web_line[512];

int sprintf(char *out, const char *format, ...) {
    va_list values;
    va_start(values, format);
    int n = web_format(out, 1 << 30, format, values);
    va_end(values);
    return n;
}

int printf(const char *format, ...) {
    va_list values;
    va_start(values, format);
    int n = web_format(web_line, sizeof web_line, format, values);
    va_end(values);
    web_print(web_line, n);
    return n;
}

int fprintf(FILE *stream, const char *format, ...) {
    (void)stream;
    va_list values;
    va_start(values, format);
    int n = web_format(web_line, sizeof web_line, format, values);
    va_end(values);
    web_print(web_line, n);
    return n;
}

/* ---- SDL2 ---- */

static SDL_Surface web_screen;
static SDL_Surface web_words;
static TTF_Font web_font;

int SDL_Init(Uint32 flags) { (void)flags; return 0; }
void SDL_Quit(void) {}
const char *SDL_GetError(void) { return ""; }

SDL_Window *SDL_CreateWindow(const char *title, int x, int y, int w, int h, Uint32 flags) {
    (void)title; (void)x; (void)y; (void)flags;
    web_screen.w = w;
    web_screen.h = h;
    web_size(w, h);
    return (SDL_Window *)&web_screen;
}

void SDL_DestroyWindow(SDL_Window *window) { (void)window; }
SDL_Surface *SDL_GetWindowSurface(SDL_Window *window) { (void)window; return &web_screen; }

int SDL_FillRect(SDL_Surface *surface, const SDL_Rect *rect, Uint32 color) {
    if (rect) web_fill(rect->x, rect->y, rect->w, rect->h, color);
    else web_fill(0, 0, surface->w, surface->h, color);
    return 0;
}

/* The page shows what was drawn as soon as the program sleeps: there is nothing to hand over. */
int SDL_UpdateWindowSurface(SDL_Window *window) { (void)window; return 0; }
int SDL_PollEvent(SDL_Event *event) { return web_poll(event); }
void SDL_Delay(Uint32 milliseconds) { web_sleep(milliseconds); }

int TTF_Init(void) { return 0; }
void TTF_Quit(void) {}
const char *TTF_GetError(void) { return ""; }
/* Whatever file is asked for, the page writes in its own font, at that size. */
TTF_Font *TTF_OpenFont(const char *file, int size) { (void)file; web_font.size = size; return &web_font; }
void TTF_CloseFont(TTF_Font *font) { (void)font; }

SDL_Surface *TTF_RenderText_Solid(TTF_Font *font, const char *text, SDL_Color color) {
    web_words = (SDL_Surface){web_length(text) * font->size / 2, font->size, text, color.r << 16 | color.g << 8 | color.b, font->size};
    return &web_words;
}

/* The one thing ever blitted is a line of text, on the window. */
int SDL_BlitSurface(SDL_Surface *source, const SDL_Rect *from, SDL_Surface *target, SDL_Rect *at) {
    (void)from; (void)target;
    if (source && source->text) web_text(at ? at->x : 0, at ? at->y : 0, source->text, web_length(source->text), source->color, source->size);
    return 0;
}

void SDL_FreeSurface(SDL_Surface *surface) { (void)surface; }

/* ---- The program ---- */

/* Where Asyncify keeps the program while it is put aside: two addresses, then the room they bound. */
static int web_aside[16384];

EXPORT(aside) int *web_room(void) {
    web_aside[0] = (int)(size_t)(web_aside + 2);
    web_aside[1] = (int)(size_t)(web_aside + 16384);
    return web_aside;
}

#include "main.c"

EXPORT(run) int web_run(void) { return main(); }
