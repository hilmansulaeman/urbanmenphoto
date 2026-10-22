//go:build darwin || linux

package main

// bindEDSCapacity binds EdsSetCapacity. On SysV amd64 and AAPCS64 a 12-byte
// struct of three int32 values is passed in two integer registers: the first
// eight bytes, then the remaining four.
func bindEDSCapacity(l *edsLib, handle uintptr) error {
	var raw func(cam uintptr, low, high uint64) uint32
	if err := registerEDSFunc(&raw, handle, "EdsSetCapacity"); err != nil {
		return err
	}
	l.setCapacityHost = func(cam uintptr) uint32 {
		const freeClusters, bytesPerSector, reset = 0x7FFFFFFF, 512, 1
		return raw(cam, uint64(freeClusters)|uint64(bytesPerSector)<<32, uint64(reset))
	}
	return nil
}
