package httpapi

import (
	"net/http"
	"net/http/httptest"
	"os"
	"regexp"
	"strings"
	"testing"
)

// registeredAdminPaths reads the route table from source so a newly added
// /api/admin route is covered by these tests automatically.
func registeredAdminPaths(t *testing.T) []string {
	t.Helper()
	source, err := os.ReadFile("server.go")
	if err != nil {
		t.Fatalf("read server.go: %v", err)
	}
	var paths []string
	for _, m := range regexp.MustCompile(`HandleFunc\("(/api/admin/[^"]*)"`).FindAllStringSubmatch(string(source), -1) {
		paths = append(paths, m[1])
	}
	if len(paths) < 20 {
		t.Fatalf("expected many admin routes, found %d", len(paths))
	}
	return paths
}

func TestAdminRoutesRequireToken(t *testing.T) {
	handler := newTestServer(t)
	for _, path := range registeredAdminPaths(t) {
		if adminPublicPaths[path] {
			continue
		}
		for _, method := range []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete} {
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, httptest.NewRequest(method, path, strings.NewReader("{}")))
			if rec.Code != http.StatusUnauthorized {
				t.Errorf("%s %s without token: expected 401, got %d", method, path, rec.Code)
			}
		}
	}
}

func TestStaffCannotReachOwnerOnlyRoutes(t *testing.T) {
	handler := newTestServer(t)
	_ = loginAdmin(t, handler)
	staffToken := createAndLoginStaff(t, handler)
	for _, path := range registeredAdminPaths(t) {
		if !isAdminOwnerOnly(path) {
			continue
		}
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req.Header.Set("authorization", "Bearer "+staffToken)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusForbidden {
			t.Errorf("staff GET %s: expected 403, got %d", path, rec.Code)
		}
	}
}

func TestStaffKeepsOperationalAccess(t *testing.T) {
	handler := newTestServer(t)
	_ = loginAdmin(t, handler)
	staffToken := createAndLoginStaff(t, handler)
	for _, path := range []string{"/api/admin/auth/me", "/api/admin/sessions", "/api/admin/stats", "/api/admin/filters", "/api/admin/transactions", "/api/admin/payments", "/api/admin/messages", "/api/admin/frames"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req.Header.Set("authorization", "Bearer "+staffToken)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code == http.StatusUnauthorized || rec.Code == http.StatusForbidden {
			t.Errorf("staff GET %s should be allowed, got %d: %s", path, rec.Code, rec.Body.String())
		}
	}
}

func TestOwnerReachesOwnerOnlyRoutes(t *testing.T) {
	handler := newTestServer(t)
	token := loginAdmin(t, handler)
	req := httptest.NewRequest(http.MethodGet, "/api/admin/wallet", nil)
	req.Header.Set("authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("owner GET wallet: expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}
