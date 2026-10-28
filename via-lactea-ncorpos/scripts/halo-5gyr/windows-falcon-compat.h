// Windows SDK annotations collide with upstream falcON local identifiers.
// Include the SDK before falcON and remove only those annotation macros.
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#undef IN
#undef OUT
