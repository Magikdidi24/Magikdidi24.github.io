/* The few names of SDL that the liquid simulator uses to draw, for its web
   build: the page implements them on a canvas (src/room/ui/demos/fluid.ts). */
#ifndef WEB_SDL_H
#define WEB_SDL_H
#include <stdbool.h>

typedef unsigned char Uint8;
typedef struct { Uint8 r, g, b, a; } SDL_Color;
typedef struct { float x, y, w, h; } SDL_FRect;
typedef struct SDL_Renderer SDL_Renderer;

bool SDL_SetRenderDrawColor(SDL_Renderer *renderer, Uint8 r, Uint8 g, Uint8 b, Uint8 a);
bool SDL_RenderFillRect(SDL_Renderer *renderer, const SDL_FRect *rect);
bool SDL_RenderLine(SDL_Renderer *renderer, float x1, float y1, float x2, float y2);
bool SDL_RenderClear(SDL_Renderer *renderer);

#endif
