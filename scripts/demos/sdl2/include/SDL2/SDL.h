/* What the small C programs use of SDL2, for their web build: a window whose
   surface is filled with rectangles, a queue of events, a delay. web.c
   implements it; the page draws and listens (src/room/ui/demos/program.ts). */
#ifndef WEB_SDL2_H
#define WEB_SDL2_H
#include <stddef.h>

typedef unsigned char Uint8;
typedef unsigned int Uint32;

typedef struct { int x, y, w, h; } SDL_Rect;
typedef struct { Uint8 r, g, b, a; } SDL_Color;
/* A surface is the window, or a line of text that waits to be drawn on it. */
typedef struct SDL_Surface { int w, h; const char *text; Uint32 color; int size; } SDL_Surface;
typedef struct SDL_Window SDL_Window;

typedef struct { int sym; } SDL_Keysym;
typedef struct { Uint32 type; SDL_Keysym keysym; } SDL_KeyboardEvent;
typedef struct { Uint32 type; int x, y; } SDL_MouseButtonEvent;
typedef union { Uint32 type; SDL_KeyboardEvent key; SDL_MouseButtonEvent button; } SDL_Event;

enum { SDL_QUIT = 0x100, SDL_KEYDOWN = 0x300, SDL_MOUSEBUTTONDOWN = 0x401 };
enum { SDLK_SPACE = ' ', SDLK_s = 's', SDLK_z = 'z', SDLK_RIGHT = 0x4000004F, SDLK_LEFT = 0x40000050, SDLK_DOWN = 0x40000051, SDLK_UP = 0x40000052 };

#define SDL_INIT_VIDEO 0x20u
#define SDL_INIT_EVERYTHING 0xF231u
#define SDL_WINDOWPOS_CENTERED 0

int SDL_Init(Uint32 flags);
void SDL_Quit(void);
const char *SDL_GetError(void);
SDL_Window *SDL_CreateWindow(const char *title, int x, int y, int w, int h, Uint32 flags);
void SDL_DestroyWindow(SDL_Window *window);
SDL_Surface *SDL_GetWindowSurface(SDL_Window *window);
int SDL_FillRect(SDL_Surface *surface, const SDL_Rect *rect, Uint32 color);
int SDL_BlitSurface(SDL_Surface *source, const SDL_Rect *from, SDL_Surface *target, SDL_Rect *at);
void SDL_FreeSurface(SDL_Surface *surface);
int SDL_UpdateWindowSurface(SDL_Window *window);
int SDL_PollEvent(SDL_Event *event);
void SDL_Delay(Uint32 milliseconds);

/* SDL.h brings these of the C library with it, and the programs count on that. */
void *malloc(size_t size);
void *realloc(void *block, size_t size);
void free(void *block);
int rand(void);
void srand(unsigned seed);
__attribute__((noreturn)) void exit(int code);

#endif
