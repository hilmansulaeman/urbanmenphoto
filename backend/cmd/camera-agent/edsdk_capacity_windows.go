//go:build windows

package main

import (
	"runtime"
	"unsafe"
)

type edsCapacity struct {
	NumberOfFreeClusters int32
	BytesPerSector       int32
	Reset                int32
}

// bindEDSCapacity binds EdsSetCapacity. On Windows x64 a 12-byte struct
// argument is passed by pointer to a caller-owned copy.
func bindEDSCapacity(l *edsLib, handle uintptr) error {
	var raw func(cam uintptr, capacity uintptr) uint32
	if err := registerEDSFunc(&raw, handle, "EdsSetCapacity"); err != nil {
		return err
	}
	l.setCapacityHost = func(cam uintptr) uint32 {
		c := edsCapacity{NumberOfFreeClusters: 0x7FFFFFFF, BytesPerSector: 512, Reset: 1}
		code := raw(cam, uintptr(unsafe.Pointer(&c)))
		runtime.KeepAlive(&c)
		return code
	}
	return nil
}
