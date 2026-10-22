package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
	"unsafe"

	"github.com/ebitengine/purego"
)

// Canon EDSDK provider (CAMERA_PROVIDER=edsdk).
//
// EDSDK is a proprietary C library, so it is loaded at runtime from EDSDK_DIR
// with purego instead of being linked in: no cgo, no C compiler, and the same
// code path for Windows (EDSDK.dll), macOS (EDSDK.framework) and Linux
// (libEDSDK.so). The SDK files are not committed; see README-WINDOWS.txt.
//
// EDSDK is not thread-safe and delivers events only while EdsGetEvent runs, so
// every call happens on one OS thread owned by edsdkDriver.run.

const (
	edsErrOK                = 0x00000000
	edsErrObjectNotReady    = 0x0000A102
	edsErrSessionAlreadyOpn = 0x0000201E
	edsErrDeviceBusy        = 0x00000081

	edsPropProductName = 0x00000002
	edsPropSaveTo      = 0x0000000b
	edsPropBodyIDEx    = 0x00000015

	edsSaveToHost = 2

	edsCmdTakePicture = 0x00000000

	edsObjectEventAll                 = 0x00000200
	edsObjectEventDirItemCreated      = 0x00000204
	edsObjectEventDirItemRemoved      = 0x00000205
	edsObjectEventDirItemInfoChanged  = 0x00000206
	edsObjectEventDirItemContentChgd  = 0x00000207
	edsObjectEventDirItemRequestXfer  = 0x00000208
	edsObjectEventDirItemRequestXferD = 0x00000209

	edsAccessReadWrite           = 2
	edsDispositionCreateAlways   = 1
	edsdkCaptureTimeout          = 30 * time.Second
	edsdkTakePictureRetryTimeout = 5 * time.Second
)

type edsDeviceInfo struct {
	PortName          [256]byte
	DeviceDescription [256]byte
	DeviceSubType     uint32
	Reserved          uint32
}

type edsDirItemInfo struct {
	Size     uint64
	IsFolder int32
	GroupID  uint32
	Option   uint32
	FileName [256]byte
	Format   uint32
	DateTime uint32
}

// edsLib holds the EDSDK entry points. Struct-by-value arguments differ per
// ABI, so setCapacityHost is bound in edsdk_capacity_*.go.
type edsLib struct {
	initializeSDK         func() uint32
	terminateSDK          func() uint32
	getEvent              func() uint32
	getCameraList         func(out *uintptr) uint32
	getChildCount         func(ref uintptr, out *uint32) uint32
	getChildAtIndex       func(ref uintptr, index int32, out *uintptr) uint32
	getDeviceInfo         func(cam uintptr, info *edsDeviceInfo) uint32
	openSession           func(cam uintptr) uint32
	closeSession          func(cam uintptr) uint32
	release               func(ref uintptr) uint32
	sendCommand           func(cam uintptr, cmd uint32, param int32) uint32
	setPropertyData       func(ref uintptr, prop uint32, param int32, size uint32, data unsafe.Pointer) uint32
	getPropertySize       func(ref uintptr, prop uint32, param int32, dataType *uint32, size *uint32) uint32
	getPropertyData       func(ref uintptr, prop uint32, param int32, size uint32, data unsafe.Pointer) uint32
	setObjectEventHandler func(cam uintptr, event uint32, handler uintptr, ctx uintptr) uint32
	getDirectoryItemInfo  func(item uintptr, info *edsDirItemInfo) uint32
	createFileStream      func(path *byte, disposition, access uint32, out *uintptr) uint32
	download              func(item uintptr, size uint64, stream uintptr) uint32
	downloadComplete      func(item uintptr) uint32
	setCapacityHost       func(cam uintptr) uint32
}

func loadEDSLib(dir string) (*edsLib, error) {
	handle, err := edsdkOpenLibrary(dir)
	if err != nil {
		return nil, err
	}
	l := &edsLib{}
	bindings := map[string]any{
		"EdsInitializeSDK":         &l.initializeSDK,
		"EdsTerminateSDK":          &l.terminateSDK,
		"EdsGetEvent":              &l.getEvent,
		"EdsGetCameraList":         &l.getCameraList,
		"EdsGetChildCount":         &l.getChildCount,
		"EdsGetChildAtIndex":       &l.getChildAtIndex,
		"EdsGetDeviceInfo":         &l.getDeviceInfo,
		"EdsOpenSession":           &l.openSession,
		"EdsCloseSession":          &l.closeSession,
		"EdsRelease":               &l.release,
		"EdsSendCommand":           &l.sendCommand,
		"EdsSetPropertyData":       &l.setPropertyData,
		"EdsGetPropertySize":       &l.getPropertySize,
		"EdsGetPropertyData":       &l.getPropertyData,
		"EdsSetObjectEventHandler": &l.setObjectEventHandler,
		"EdsGetDirectoryItemInfo":  &l.getDirectoryItemInfo,
		"EdsCreateFileStream":      &l.createFileStream,
		"EdsDownload":              &l.download,
		"EdsDownloadComplete":      &l.downloadComplete,
	}
	for name, target := range bindings {
		if err := registerEDSFunc(target, handle, name); err != nil {
			return nil, fmt.Errorf("EDSDK: fungsi %s tidak ditemukan: %w", name, err)
		}
	}
	if err := bindEDSCapacity(l, handle); err != nil {
		return nil, fmt.Errorf("EDSDK: fungsi EdsSetCapacity tidak ditemukan: %w", err)
	}
	return l, nil
}

// registerEDSFunc converts the panic purego raises for a missing symbol into an error.
func registerEDSFunc(target any, handle uintptr, name string) (err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("%v", r)
		}
	}()
	purego.RegisterLibFunc(target, handle, name)
	return nil
}

// edsdkSearchDirs lists where the platform's EDSDK library may live, best first.
func edsdkSearchDirs() []string {
	var dirs []string
	if dir := strings.TrimSpace(os.Getenv("EDSDK_DIR")); dir != "" {
		dirs = append(dirs, dir)
	}
	platform := map[string]string{
		"windows": "windows-x64",
		"darwin":  "macos",
		"linux":   "linux-" + map[string]string{"amd64": "x86_64", "arm64": "arm64"}[runtime.GOARCH],
	}[runtime.GOOS]
	roots := []string{"."}
	if exe, err := os.Executable(); err == nil {
		roots = append([]string{filepath.Dir(exe)}, roots...)
	}
	for _, root := range roots {
		dirs = append(dirs, filepath.Join(root, "edsdk"))
		if platform != "" {
			dirs = append(dirs, filepath.Join(root, "sdk", platform), filepath.Join(root, "cmd", "camera-agent", "sdk", platform))
		}
	}
	return dirs
}

type edsdkCamera struct {
	ID     string
	Model  string
	Serial string
}

type edsdkDriver struct {
	lib      *edsLib
	jobs     chan func()
	serials  map[string]string // device port name -> serial, filled once per camera
	callback uintptr

	// Set only while a capture runs on the worker thread.
	mu          sync.Mutex
	transferErr error
	transferred bool
	destPath    string
}

func newEDSDKDriver(lib *edsLib) *edsdkDriver {
	d := &edsdkDriver{lib: lib, jobs: make(chan func()), serials: map[string]string{}}
	d.callback = purego.NewCallback(d.onObjectEvent)
	return d
}

// run owns the calling OS thread. main calls it on the main thread because
// macOS EDSDK expects its events there.
func (d *edsdkDriver) run() error {
	if code := d.lib.initializeSDK(); code != edsErrOK {
		return edsError("EdsInitializeSDK", code)
	}
	defer d.lib.terminateSDK()
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case job := <-d.jobs:
			job()
		case <-ticker.C:
			d.lib.getEvent()
		}
	}
}

// do runs fn on the EDSDK thread and waits for it.
func (d *edsdkDriver) do(ctx context.Context, fn func() error) error {
	result := make(chan error, 1)
	job := func() { result <- fn() }
	select {
	case d.jobs <- job:
	case <-ctx.Done():
		return ctx.Err()
	}
	select {
	case err := <-result:
		return err
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (d *edsdkDriver) list(ctx context.Context) ([]camera, error) {
	var out []camera
	err := d.do(ctx, func() error {
		cams, release, err := d.enumerate()
		defer release()
		if err != nil {
			return err
		}
		for _, c := range cams {
			out = append(out, camera{Model: c.Model, Port: c.ID, Stable: strings.HasPrefix(c.ID, "canon:")})
		}
		return nil
	})
	return out, err
}

// capture takes one picture with the camera whose ID was returned by list and
// stores the JPEG/RAW file at destPath.
func (d *edsdkDriver) capture(ctx context.Context, id, destPath string) error {
	return d.do(ctx, func() error {
		cams, release, err := d.enumerate()
		defer release()
		if err != nil {
			return err
		}
		for _, c := range cams {
			if c.ID == id {
				return d.captureWith(c.ref, destPath)
			}
		}
		return fmt.Errorf("Canon dengan ID %q tidak terdeteksi oleh EDSDK. Periksa kabel, daya, dan tutup EOS Utility", strings.TrimPrefix(id, "canon:"))
	})
}

type edsdkRef struct {
	edsdkCamera
	ref uintptr
}

// enumerate returns every connected camera. The returned release func frees
// all camera references and must always be called, even on error.
func (d *edsdkDriver) enumerate() ([]edsdkRef, func(), error) {
	var refs []uintptr
	var list uintptr
	release := func() {
		for _, ref := range refs {
			d.lib.release(ref)
		}
		if list != 0 {
			d.lib.release(list)
		}
	}
	if code := d.lib.getCameraList(&list); code != edsErrOK {
		return nil, release, edsError("EdsGetCameraList", code)
	}
	var count uint32
	if code := d.lib.getChildCount(list, &count); code != edsErrOK {
		return nil, release, edsError("EdsGetChildCount", code)
	}
	var cams []edsdkRef
	for i := uint32(0); i < count; i++ {
		var ref uintptr
		if code := d.lib.getChildAtIndex(list, int32(i), &ref); code != edsErrOK {
			return nil, release, edsError("EdsGetChildAtIndex", code)
		}
		refs = append(refs, ref)
		var info edsDeviceInfo
		if code := d.lib.getDeviceInfo(ref, &info); code != edsErrOK {
			return nil, release, edsError("EdsGetDeviceInfo", code)
		}
		port := cString(info.PortName[:])
		model := cString(info.DeviceDescription[:])
		serial, known := d.serials[port]
		if !known {
			serial = d.readSerial(ref)
			if serial != "" {
				d.serials[port] = serial
			}
		}
		id := "canon:" + serial
		if serial == "" {
			// No serial: the position in the USB list is not stable across replugs.
			id = fmt.Sprintf("edsdk:%d", i)
		}
		cams = append(cams, edsdkRef{edsdkCamera: edsdkCamera{ID: id, Model: model, Serial: serial}, ref: ref})
	}
	return cams, release, nil
}

// readSerial reads the body serial number, which needs an open session.
func (d *edsdkDriver) readSerial(cam uintptr) string {
	code := d.lib.openSession(cam)
	if code != edsErrOK && code != edsErrSessionAlreadyOpn {
		return ""
	}
	if code == edsErrOK {
		defer d.lib.closeSession(cam)
	}
	var dataType, size uint32
	if d.lib.getPropertySize(cam, edsPropBodyIDEx, 0, &dataType, &size) != edsErrOK || size == 0 || size > 256 {
		return ""
	}
	buf := make([]byte, size)
	if d.lib.getPropertyData(cam, edsPropBodyIDEx, 0, size, unsafe.Pointer(&buf[0])) != edsErrOK {
		return ""
	}
	return strings.TrimSpace(cString(buf))
}

func (d *edsdkDriver) captureWith(cam uintptr, destPath string) error {
	code := d.lib.openSession(cam)
	if code != edsErrOK && code != edsErrSessionAlreadyOpn {
		return edsError("EdsOpenSession", code)
	}
	if code == edsErrOK {
		defer d.lib.closeSession(cam)
	}

	host := uint32(edsSaveToHost)
	if code := d.lib.setPropertyData(cam, edsPropSaveTo, 0, 4, unsafe.Pointer(&host)); code != edsErrOK {
		return edsError("EdsSetPropertyData(SaveTo)", code)
	}
	// Tell the camera the host has plenty of space, otherwise it may refuse to shoot.
	if code := d.lib.setCapacityHost(cam); code != edsErrOK {
		return edsError("EdsSetCapacity", code)
	}

	d.mu.Lock()
	d.transferred, d.transferErr, d.destPath = false, nil, destPath
	d.mu.Unlock()
	if code := d.lib.setObjectEventHandler(cam, edsObjectEventAll, d.callback, 0); code != edsErrOK {
		return edsError("EdsSetObjectEventHandler", code)
	}
	defer d.lib.setObjectEventHandler(cam, edsObjectEventAll, 0, 0)

	deadline := time.Now().Add(edsdkTakePictureRetryTimeout)
	for {
		code = d.lib.sendCommand(cam, edsCmdTakePicture, 0)
		if code == edsErrOK {
			break
		}
		if (code != edsErrObjectNotReady && code != edsErrDeviceBusy) || time.Now().After(deadline) {
			return edsError("EdsSendCommand(TakePicture)", code)
		}
		d.lib.getEvent()
		time.Sleep(200 * time.Millisecond)
	}

	deadline = time.Now().Add(edsdkCaptureTimeout)
	for time.Now().Before(deadline) {
		d.lib.getEvent()
		d.mu.Lock()
		done, err := d.transferred, d.transferErr
		d.mu.Unlock()
		if err != nil {
			return err
		}
		if done {
			return nil
		}
		time.Sleep(50 * time.Millisecond)
	}
	return errors.New("kamera tidak mengirim foto dalam 30 detik. Periksa fokus, mode kamera, dan kartu memori")
}

// onObjectEvent runs inside EdsGetEvent on the EDSDK thread.
func (d *edsdkDriver) onObjectEvent(event uint32, ref uintptr, _ uintptr) uintptr {
	switch event {
	case edsObjectEventDirItemRequestXfer, edsObjectEventDirItemRequestXferD:
		err := d.downloadItem(ref)
		d.mu.Lock()
		d.transferred, d.transferErr = err == nil, err
		d.mu.Unlock()
		if ref != 0 {
			d.lib.release(ref)
		}
	case edsObjectEventDirItemCreated, edsObjectEventDirItemRemoved, edsObjectEventDirItemInfoChanged, edsObjectEventDirItemContentChgd:
		if ref != 0 {
			d.lib.release(ref)
		}
	}
	return edsErrOK
}

func (d *edsdkDriver) downloadItem(item uintptr) error {
	d.mu.Lock()
	dest := d.destPath
	d.mu.Unlock()
	var info edsDirItemInfo
	if code := d.lib.getDirectoryItemInfo(item, &info); code != edsErrOK {
		return edsError("EdsGetDirectoryItemInfo", code)
	}
	path := append([]byte(dest), 0)
	var stream uintptr
	if code := d.lib.createFileStream(&path[0], edsDispositionCreateAlways, edsAccessReadWrite, &stream); code != edsErrOK {
		return edsError("EdsCreateFileStream", code)
	}
	defer d.lib.release(stream)
	if code := d.lib.download(item, info.Size, stream); code != edsErrOK {
		return edsError("EdsDownload", code)
	}
	if code := d.lib.downloadComplete(item); code != edsErrOK {
		return edsError("EdsDownloadComplete", code)
	}
	return nil
}

func cString(b []byte) string {
	for i, c := range b {
		if c == 0 {
			return string(b[:i])
		}
	}
	return string(b)
}

func edsError(call string, code uint32) error {
	names := map[uint32]string{
		0x00000001: "belum diimplementasikan",
		0x00000007: "tidak didukung kamera ini",
		0x00000061: "handle tidak valid",
		0x00000080: "kamera tidak ditemukan",
		0x00000081: "kamera sedang sibuk",
		0x00000082: "perangkat tidak valid",
		0x000000C0: "port USB dipakai aplikasi lain (tutup EOS Utility)",
		0x000000C1: "kamera terputus",
		0x00008D01: "autofokus gagal",
		0x00008D06: "tidak ada kartu memori",
		0x00008D07: "kartu memori bermasalah",
		0x00008D0B: "lensa tidak terpasang",
		0x0000A102: "kamera belum siap",
	}
	if name, ok := names[code]; ok {
		return fmt.Errorf("%s gagal: %s (0x%X)", call, name, code)
	}
	return fmt.Errorf("%s gagal: kode EDSDK 0x%X", call, code)
}
