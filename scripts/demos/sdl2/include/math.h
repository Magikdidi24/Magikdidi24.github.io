/* The two functions of math.h that the programs call: the page gives its own. */
#ifndef WEB_MATH_H
#define WEB_MATH_H
__attribute__((import_module("env"), import_name("cos"))) double cos(double x);
__attribute__((import_module("env"), import_name("sin"))) double sin(double x);
#endif
