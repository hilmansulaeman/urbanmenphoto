//go:build windows

package main

import (
	"fmt"
	"path/filepath"
	"syscall"
	"unsafe"
)

const edsdkLibraryName = "EDSDK.dll"

// edsdkOpenLibrary loads EDSDK.dll. EDSDK.dll needs EdsImage.dll next to it, so
// the directory is added to the DLL search path first.
func edsdkOpenLibrary(dir string) (uintptr, error) {
	if dirPtr, err := syscall.UTF16PtrFromString(dir); err == nil {
		syscall.NewLazyDLL("kernel32.dll").NewProc("SetDllDirectoryW").Call(uintptr(unsafe.Pointer(dirPtr)))
	}
	handle, err := syscall.LoadLibrary(filepath.Join(dir, edsdkLibraryName))
	if err != nil {
		return 0, fmt.Errorf("gagal memuat EDSDK.dll dari %s (butuh DLL 64-bit): %w", dir, err)
	}
	return uintptr(handle), nil
}
