/* What the Game of Life uses of SDL_ttf: a font of one size, and a line of text drawn with it. */
#ifndef WEB_SDL2_TTF_H
#define WEB_SDL2_TTF_H
#include <SDL2/SDL.h>

typedef struct TTF_Font { int size; } TTF_Font;

int TTF_Init(void);
void TTF_Quit(void);
const char *TTF_GetError(void);
TTF_Font *TTF_OpenFont(const char *file, int size);
void TTF_CloseFont(TTF_Font *font);
SDL_Surface *TTF_RenderText_Solid(TTF_Font *font, const char *text, SDL_Color color);

#endif
