#pragma once
// MSVC portability shim: POSIX alloca maps to the CRT _alloca.
#include <malloc.h>
#ifndef alloca
#define alloca _alloca
#endif
