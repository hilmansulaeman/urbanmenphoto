package httpapi

import (
	"net/http"
	"strings"
)

// adminPublicPaths are the only /api/admin routes reachable without a token.
var adminPublicPaths = map[string]bool{
	"/api/admin/auth/login":            true,
	"/api/admin/auth/login/verify-otp": true,
}

// adminOwnerOnlyPrefixes need the owner role. They mirror the dashboard menus
// that staff cannot see (STAFF_ALLOWED_MENUS in AdminDashboard.jsx), so a staff
// token cannot reach them by calling the API directly. audit-logs is absent
// on purpose: its handler already limits staff to monitoring events.
var adminOwnerOnlyPrefixes = []string{
	"/api/admin/users",
	"/api/admin/vouchers",
	"/api/admin/wallet",
	"/api/admin/subscriptions",
	"/api/admin/payment_keys",
	"/api/admin/frames_gif",
	"/api/admin/storage",
	"/api/admin/cleanup",
	"/api/admin/projects",
}

func isAdminOwnerOnly(path string) bool {
	for _, prefix := range adminOwnerOnlyPrefixes {
		if path == prefix || strings.HasPrefix(path, prefix+"/") {
			return true
		}
	}
	return false
}

// withAdminAuth rejects every /api/admin request that lacks a valid admin
// token, so a new handler cannot ship without authentication. Handlers still
// run their own requireAdmin checks to get the user for auditing.
func (s *Server) withAdminAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if !strings.HasPrefix(path, "/api/admin/") || adminPublicPaths[path] {
			next.ServeHTTP(w, r)
			return
		}
		user, err := s.requireAdmin(r)
		if err != nil {
			writeError(w, http.StatusUnauthorized, err.Error())
			return
		}
		if isAdminOwnerOnly(path) && user.Role != "owner" {
			writeError(w, http.StatusForbidden, "Owner access is required.")
			return
		}
		next.ServeHTTP(w, r)
	})
}
