/* What the programs print goes to the page, which shows it under their picture. */
#ifndef WEB_STDIO_H
#define WEB_STDIO_H
typedef struct FILE FILE;
extern FILE *stdout;
extern FILE *stderr;
int printf(const char *format, ...);
int fprintf(FILE *stream, const char *format, ...);
int sprintf(char *out, const char *format, ...);
#endif
