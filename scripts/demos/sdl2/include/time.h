/* The clock of the page, in seconds: the programs seed their random numbers with it. */
#ifndef WEB_TIME_H
#define WEB_TIME_H
typedef long long time_t;
time_t time(time_t *out);
#endif
