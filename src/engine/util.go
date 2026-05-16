package engine

import (
	"syscall"
	"unsafe"
)

// cString reads a null-terminated C string from a pointer.
// This performs unchecked pointer conversion which is safe for DLL return values.
//
//nolint:unsafeptr
func cString(ptr unsafe.Pointer) string {
	if ptr == nil {
		return ""
	}

	// Find length by scanning for null terminator
	var length int
	p := (*byte)(ptr)
	for {
		if *p == 0 {
			break
		}
		length++
		p = (*byte)(unsafe.Add(unsafe.Pointer(p), 1))
	}

	if length == 0 {
		return ""
	}

	// Read all bytes at once
	bytes := unsafe.Slice((*byte)(ptr), length)
	return string(bytes)
}

// cStringAndFree reads a null-terminated C string from a pointer and frees it
func cStringAndFree(ptr uintptr, freeProc *syscall.LazyProc) string {
	if ptr == 0 {
		return ""
	}
	s := cString(unsafe.Pointer(ptr))
	if freeProc != nil {
		freeProc.Call(ptr)
	}
	return s
}
