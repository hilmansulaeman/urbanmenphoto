//go:build darwin || linux

package main

import (
	"fmt"
	"path/filepath"
	"runtime"

	"github.com/ebitengine/purego"
)

var edsdkLibraryName = map[string]string{
	"darwin": filepath.Join("EDSDK.framework", "EDSDK"),
	"linux":  "libEDSDK.so",
}[runtime.GOOS]

func edsdkOpenLibrary(dir string) (uintptr, error) {
	path := filepath.Join(dir, edsdkLibraryName)
	handle, err := purego.Dlopen(path, purego.RTLD_NOW|purego.RTLD_GLOBAL)
	if err != nil {
		return 0, fmt.Errorf("gagal memuat %s: %w", path, err)
	}
	return handle, nil
}
