package main

import (
	"context"
	"runtime"
	"strings"
	"testing"
	"time"
)

func TestEDSDKCameraIDs(t *testing.T) {
	a := &agent{cfg: config{Provider: "edsdk"}}
	for _, id := range []string{"canon:123456", "edsdk:0"} {
		if !a.validCameraID(id) {
			t.Fatalf("expected %q to be a valid EDSDK camera ID", id)
		}
	}
	if a.validCameraID("usb:001,004") {
		t.Fatal("gphoto2 USB ports must not be valid for the EDSDK provider")
	}
}

func TestEDSError(t *testing.T) {
	if msg := edsError("EdsOpenSession", 0x81).Error(); !strings.Contains(msg, "sibuk") {
		t.Fatalf("unexpected message %q", msg)
	}
	if msg := edsError("EdsOpenSession", 0x9999).Error(); !strings.Contains(msg, "0x9999") {
		t.Fatalf("unexpected message %q", msg)
	}
}

// TestEDSDKLoadsAndLists loads the real SDK when it is installed and lists
// cameras. It needs no camera: an empty list is a pass.
func TestEDSDKLoadsAndLists(t *testing.T) {
	lib, dir, err := loadEDSDK()
	if err != nil {
		t.Skipf("EDSDK not installed: %v", err)
	}
	t.Logf("EDSDK loaded from %s", dir)
	driver := newEDSDKDriver(lib)
	go func() {
		runtime.LockOSThread()
		driver.run()
	}()
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	cameras, err := driver.list(ctx)
	if err != nil {
		t.Fatalf("list cameras: %v", err)
	}
	t.Logf("cameras: %+v", cameras)
}
