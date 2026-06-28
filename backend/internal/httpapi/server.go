package httpapi

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"urbanmenphoto/backend/internal/auth"
	"urbanmenphoto/backend/internal/config"
	"urbanmenphoto/backend/internal/models"
	"urbanmenphoto/backend/internal/store"
)

type Server struct {
	cfg     config.Config
	store   store.Store
	limiter *rateLimiter
}

type response struct {
	Data  any       `json:"data,omitempty"`
	Error *apiError `json:"error,omitempty"`
}

type apiError struct {
	Message string `json:"message"`
}

type imageData struct {
	MimeType string
	Ext      string
	Bytes    []byte
}

var dataURLPattern = regexp.MustCompile(`^data:([^;]+);base64,(.+)$`)
var emailPattern = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)
var phonePattern = regexp.MustCompile(`^\+?[0-9]{8,16}$`)

func NewServer(cfg config.Config, jsonStore store.Store) *Server {
	return &Server{
		cfg:     cfg,
		store:   jsonStore,
		limiter: newRateLimiter(time.Minute),
	}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/", s.handleIndex)
	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/swagger", s.handleSwaggerUI)
	mux.HandleFunc("/swagger/openapi.yaml", s.handleSwaggerSpec)
	mux.HandleFunc("/api/galleries/", s.handleGalleryByID)
	mux.HandleFunc("/api/sessions", s.handleSessions)
	mux.HandleFunc("/api/sessions/", s.handleSessionByID)
	mux.HandleFunc("/api/payments", s.handlePayments)
	mux.HandleFunc("/api/payments/", s.handlePaymentByID)
	mux.HandleFunc("/api/frames", s.handleFrames)
	mux.HandleFunc("/api/admin/auth/login", s.handleAdminLogin)
	mux.HandleFunc("/api/admin/auth/logout", s.handleAdminLogout)
	mux.HandleFunc("/api/admin/auth/me", s.handleAdminMe)
	mux.HandleFunc("/api/admin/users", s.handleAdminUsers)
	mux.HandleFunc("/api/admin/users/", s.handleAdminUserByID)
	mux.HandleFunc("/api/admin/sessions", s.handleAdminSessions)
	mux.HandleFunc("/api/admin/sessions/", s.handleAdminSessionByID)
	mux.HandleFunc("/api/admin/stats", s.handleAdminStats)
	mux.HandleFunc("/api/admin/messages", s.handleAdminMessages)
	mux.HandleFunc("/api/admin/payments", s.handleAdminPayments)
	mux.HandleFunc("/api/admin/payment-logs", s.handleAdminPaymentLogs)
	mux.HandleFunc("/api/admin/transactions", s.handleAdminTransactions)
	mux.HandleFunc("/api/admin/audit-logs", s.handleAdminAuditLogs)
	mux.HandleFunc("/api/admin/cleanup", s.handleAdminCleanup)
	mux.HandleFunc("/api/admin/frames", s.handleAdminFrames)
	mux.HandleFunc("/api/admin/frames/", s.handleAdminFrameByID)
	mux.HandleFunc("/files/", s.handleFiles)

	return s.withCORS(mux)
}

func (s *Server) withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		s.setSecurityHeaders(w)
		origin := r.Header.Get("origin")
		if s.allowedOrigin(origin) {
			w.Header().Set("access-control-allow-origin", origin)
			w.Header().Set("vary", "Origin")
		}
		w.Header().Set("access-control-allow-methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS")
		w.Header().Set("access-control-allow-headers", "content-type,x-admin-key,authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		if s.cfg.MaxBodyBytes > 0 {
			r.Body = http.MaxBytesReader(w, r.Body, s.cfg.MaxBodyBytes)
		}

		next.ServeHTTP(w, r)
	})
}

func (s *Server) setSecurityHeaders(w http.ResponseWriter) {
	w.Header().Set("x-content-type-options", "nosniff")
	w.Header().Set("x-frame-options", "DENY")
	w.Header().Set("referrer-policy", "no-referrer")
	w.Header().Set("permissions-policy", "camera=(), microphone=(), geolocation=()")
	w.Header().Set("content-security-policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://unpkg.com; script-src 'self' 'unsafe-inline' https://unpkg.com")
}

func (s *Server) allowedOrigin(origin string) bool {
	if origin == "" {
		return true
	}
	if len(s.cfg.AllowedOrigins) == 0 {
		return strings.HasPrefix(origin, "http://localhost:") || strings.HasPrefix(origin, "http://127.0.0.1:")
	}
	for _, allowed := range s.cfg.AllowedOrigins {
		if origin == allowed {
			return true
		}
	}
	return false
}

func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		writeError(w, http.StatusNotFound, "Route not found.")
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
		return
	}

	writeJSON(w, http.StatusOK, response{Data: map[string]any{
		"service": "urbanmenphoto-go-backend",
		"status":  "ok",
		"docs":    "/swagger",
	}})
}

func (s *Server) handleSwaggerUI(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/swagger" {
		writeError(w, http.StatusNotFound, "Route not found.")
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
		return
	}

	w.Header().Set("content-type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Urbanmenphoto API</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({ url: "/swagger/openapi.yaml", dom_id: "#swagger-ui" });
    </script>
  </body>
</html>`))
}

func (s *Server) handleSwaggerSpec(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
		return
	}

	w.Header().Set("content-type", "application/yaml; charset=utf-8")
	http.ServeFile(w, r, resolveLocalFile(
		filepath.Join("backend", "docs", "openapi.yaml"),
		filepath.Join("docs", "openapi.yaml"),
		filepath.Join("..", "..", "docs", "openapi.yaml"),
	))
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
		return
	}
	writeJSON(w, http.StatusOK, response{Data: map[string]any{
		"ok":      true,
		"service": "urbanmenphoto-go-backend",
	}})
}

func (s *Server) handleSessions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
		return
	}

	var body models.CreateSessionRequest
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := validateContact(body.Email, body.Phone); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	session := s.newSession(body)
	if err := s.store.InsertSession(session); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to save session.")
		return
	}

	writeJSON(w, http.StatusCreated, response{Data: session})
}

func (s *Server) handleSessionByID(w http.ResponseWriter, r *http.Request) {
	sessionID, action := pathIDAndAction(r.URL.Path, "/api/sessions/")
	if sessionID == "" {
		writeError(w, http.StatusNotFound, "Session not found.")
		return
	}

	switch {
	case r.Method == http.MethodGet && action == "":
		session, ok := s.store.FindSession(sessionID)
		if !ok {
			writeError(w, http.StatusNotFound, "Session not found.")
			return
		}
		writeJSON(w, http.StatusOK, response{Data: session})
	case r.Method == http.MethodPatch && action == "":
		s.patchSession(w, r, sessionID)
	case r.Method == http.MethodPost && action == "finalize":
		s.finalizeSession(w, r, sessionID)
	case r.Method == http.MethodPost && action == "send-link":
		s.recordSendLink(w, r, sessionID)
	case r.Method == http.MethodPost && action == "expire":
		s.expireSession(w, sessionID)
	default:
		writeError(w, http.StatusNotFound, "Route not found.")
	}
}

func (s *Server) handleGalleryByID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
		return
	}

	sessionID, _ := pathIDAndAction(r.URL.Path, "/api/galleries/")
	session, ok := s.store.FindSession(sessionID)
	if !ok {
		writeError(w, http.StatusNotFound, "Gallery not found.")
		return
	}

	expired := time.Now().After(session.ExpiresAt)
	if expired {
		writeError(w, http.StatusGone, "Gallery link has expired.")
		return
	}

	writeJSON(w, http.StatusOK, response{Data: models.Gallery{
		SessionID:   session.ID,
		Status:      session.Status,
		FinalImage:  session.FinalImage,
		Images:      session.Images,
		DownloadURL: session.DownloadURL,
		ExpiresAt:   session.ExpiresAt,
		Expired:     expired,
	}})
}

func (s *Server) handleAdminSessions(w http.ResponseWriter, r *http.Request) {
	if _, err := s.requireAdmin(r); err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
		return
	}

	writeJSON(w, http.StatusOK, response{Data: s.store.ListSessions()})
}

func (s *Server) handleAdminSessionByID(w http.ResponseWriter, r *http.Request) {
	adminUser, err := s.requireAdmin(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	sessionID, _ := pathIDAndAction(r.URL.Path, "/api/admin/sessions/")
	switch r.Method {
	case http.MethodGet:
		session, ok := s.store.FindSession(sessionID)
		if !ok {
			writeError(w, http.StatusNotFound, "Session not found.")
			return
		}
		writeJSON(w, http.StatusOK, response{Data: models.AdminSessionDetail{
			Session:  session,
			Messages: s.store.MessagesBySession(session.ID),
			Payments: s.store.PaymentsBySession(session.ID),
		}})
	case http.MethodDelete:
		if adminUser.Role != "owner" {
			writeError(w, http.StatusForbidden, "Owner admin role is required.")
			return
		}
		session, err := s.store.DeleteSession(sessionID)
		if err != nil {
			writeError(w, http.StatusNotFound, "Session not found.")
			return
		}
		_ = os.RemoveAll(filepath.Join(s.cfg.StorageDir, "sessions", session.ID))
		s.audit(r, &adminUser.ID, "admin.session.delete", session.ID, true)
		w.WriteHeader(http.StatusNoContent)
	default:
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
	}
}

func (s *Server) handleAdminStats(w http.ResponseWriter, r *http.Request) {
	if _, err := s.requireAdmin(r); err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
		return
	}

	today := time.Now().Format("2006-01-02")
	stats := models.Stats{}

	for _, session := range s.store.ListSessions() {
		stats.TotalSessions++
		if session.Status == "finalized" {
			stats.FinalizedSessions++
		}
		if session.CreatedAt.Format("2006-01-02") == today {
			stats.SessionsToday++
		}
		stats.TotalImages += len(session.Images)
	}
	for _, payment := range s.store.ListPayments() {
		stats.TotalPayments++
		if payment.Status == "paid" || payment.Status == "success" {
			stats.PaidPayments++
			stats.Revenue += payment.Amount
		}
	}

	writeJSON(w, http.StatusOK, response{Data: stats})
}

func (s *Server) handleAdminLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
		return
	}
	if !s.allowRequest(r, "admin-login", 5) {
		writeError(w, http.StatusTooManyRequests, "Too many login attempts. Please wait before trying again.")
		return
	}

	var body models.AdminLoginRequest
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	email := strings.ToLower(strings.TrimSpace(body.Email))
	if !validEmail(email) {
		writeError(w, http.StatusBadRequest, "email is invalid.")
		return
	}
	if attempt, ok := s.store.FindLoginAttempt(email); ok && attempt.LockedUntil != nil && time.Now().Before(*attempt.LockedUntil) {
		s.audit(r, nil, "admin.login.locked", "admin", false)
		writeError(w, http.StatusTooManyRequests, "Too many failed login attempts. Try again later.")
		return
	}

	user, ok := s.store.FindAdminUserByEmail(email)
	if !ok || !auth.VerifyPassword(body.Password, user.PasswordHash) {
		s.recordFailedLogin(email)
		s.audit(r, nil, "admin.login.failed", "admin", false)
		writeError(w, http.StatusUnauthorized, "Email or password is invalid.")
		return
	}
	s.clearLoginAttempt(email)

	token := newID() + "." + shortCode()
	now := time.Now()
	expiresAt := now.Add(time.Duration(s.cfg.AdminTokenTTLHrs) * time.Hour)
	if err := s.store.InsertAdminToken(models.AdminToken{
		TokenHash: auth.HashToken(token),
		UserID:    user.ID,
		ExpiresAt: expiresAt,
		CreatedAt: now,
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create admin token.")
		return
	}
	s.audit(r, &user.ID, "admin.login.success", "admin", true)

	writeJSON(w, http.StatusOK, response{Data: models.AdminLoginResponse{
		Authenticated: true,
		Token:         token,
		ExpiresAt:     expiresAt.Format(time.RFC3339),
		Role:          user.Role,
	}})
}

func (s *Server) handleAdminMe(w http.ResponseWriter, r *http.Request) {
	adminUser, err := s.requireAdmin(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
		return
	}

	writeJSON(w, http.StatusOK, response{Data: map[string]any{
		"authenticated": true,
		"email":         adminUser.Email,
		"role":          adminUser.Role,
	}})
}

func (s *Server) handleAdminLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
		return
	}

	tokenHash, err := adminTokenHashFromRequest(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}

	token, ok := s.store.FindAdminTokenByHash(tokenHash)
	if !ok || time.Now().After(token.ExpiresAt) {
		writeError(w, http.StatusUnauthorized, "Admin bearer token is invalid or expired.")
		return
	}

	var actorID *string
	if user, ok := s.store.FindAdminUserByID(token.UserID); ok {
		actorID = &user.ID
	}
	if err := s.store.DeleteAdminToken(tokenHash); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to logout admin.")
		return
	}
	s.audit(r, actorID, "admin.logout", "admin", true)

	writeJSON(w, http.StatusOK, response{Data: map[string]any{
		"authenticated": false,
		"loggedOut":     true,
	}})
}

func (s *Server) handleAdminUsers(w http.ResponseWriter, r *http.Request) {
	adminUser, err := s.requireOwner(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}

	switch r.Method {
	case http.MethodGet:
		writeJSON(w, http.StatusOK, response{Data: adminUserViews(s.store.ListAdminUsers())})
	case http.MethodPost:
		s.createAdminUser(w, r, &adminUser.ID)
	default:
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
	}
}

func (s *Server) handleAdminUserByID(w http.ResponseWriter, r *http.Request) {
	adminUser, err := s.requireOwner(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}

	userID, _ := pathIDAndAction(r.URL.Path, "/api/admin/users/")
	if userID == "" {
		writeError(w, http.StatusNotFound, "Admin user not found.")
		return
	}

	switch r.Method {
	case http.MethodPatch:
		s.updateAdminUser(w, r, userID, &adminUser.ID)
	case http.MethodDelete:
		if userID == adminUser.ID {
			writeError(w, http.StatusBadRequest, "You cannot delete your own admin account.")
			return
		}
		if err := s.store.DeleteAdminUser(userID); err != nil {
			writeError(w, http.StatusNotFound, "Admin user not found.")
			return
		}
		s.audit(r, &adminUser.ID, "admin.user.delete", userID, true)
		w.WriteHeader(http.StatusNoContent)
	default:
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
	}
}

func (s *Server) handleAdminMessages(w http.ResponseWriter, r *http.Request) {
	if _, err := s.requireOwner(r); err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
		return
	}

	writeJSON(w, http.StatusOK, response{Data: s.store.ListMessages()})
}

func (s *Server) handleAdminPayments(w http.ResponseWriter, r *http.Request) {
	if _, err := s.requireOwner(r); err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
		return
	}

	writeJSON(w, http.StatusOK, response{Data: s.store.ListPayments()})
}

func (s *Server) handleAdminPaymentLogs(w http.ResponseWriter, r *http.Request) {
	if _, err := s.requireAdmin(r); err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
		return
	}

	paymentID := strings.TrimSpace(r.URL.Query().Get("paymentId"))
	if paymentID != "" {
		writeJSON(w, http.StatusOK, response{Data: s.store.PaymentLogsByPayment(paymentID)})
		return
	}
	writeJSON(w, http.StatusOK, response{Data: s.store.ListPaymentLogs()})
}

func (s *Server) handleAdminTransactions(w http.ResponseWriter, r *http.Request) {
	if _, err := s.requireOwner(r); err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
		return
	}

	transactions := []models.Transaction{}
	for _, payment := range s.store.ListPayments() {
		transactions = append(transactions, models.Transaction{
			ID:        payment.ID,
			SessionID: payment.SessionID,
			Provider:  payment.Provider,
			Amount:    payment.Amount,
			Currency:  payment.Currency,
			Status:    payment.Status,
			CreatedAt: payment.CreatedAt,
		})
	}
	writeJSON(w, http.StatusOK, response{Data: transactions})
}

func (s *Server) handleAdminAuditLogs(w http.ResponseWriter, r *http.Request) {
	if _, err := s.requireOwner(r); err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
		return
	}

	writeJSON(w, http.StatusOK, response{Data: s.store.ListAuditLogs()})
}

func (s *Server) handleAdminCleanup(w http.ResponseWriter, r *http.Request) {
	adminUser, err := s.requireOwner(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
		return
	}

	result := models.CleanupResult{}
	now := time.Now()
	for _, session := range s.store.ListSessions() {
		if now.Before(session.ExpiresAt) {
			continue
		}
		deletedFiles := countFiles(filepath.Join(s.cfg.StorageDir, "sessions", session.ID))
		if _, err := s.store.DeleteSession(session.ID); err == nil {
			result.DeletedSessions++
			result.DeletedFiles += deletedFiles
			_ = os.RemoveAll(filepath.Join(s.cfg.StorageDir, "sessions", session.ID))
		}
	}
	s.audit(r, &adminUser.ID, "admin.cleanup", "sessions", true)

	writeJSON(w, http.StatusOK, response{Data: result})
}

func (s *Server) handlePayments(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
		return
	}
	if !s.allowRequest(r, "create-payment", 20) {
		writeError(w, http.StatusTooManyRequests, "Too many payment requests. Please wait before trying again.")
		return
	}

	var body models.CreatePaymentRequest
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if body.SessionID == "" {
		writeError(w, http.StatusBadRequest, "sessionId is required.")
		return
	}
	if body.Amount <= 0 {
		writeError(w, http.StatusBadRequest, "amount must be greater than zero.")
		return
	}
	if body.Amount > 100000000 {
		writeError(w, http.StatusBadRequest, "amount is too large.")
		return
	}
	if _, ok := s.store.FindSession(body.SessionID); !ok {
		writeError(w, http.StatusNotFound, "Session not found.")
		return
	}

	now := time.Now()
	provider := body.Provider
	if provider == "" {
		provider = "manual"
	}
	if !validSlug(provider, 32) {
		writeError(w, http.StatusBadRequest, "provider is invalid.")
		return
	}
	currency := body.Currency
	if currency == "" {
		currency = "IDR"
	}
	if currency != "IDR" {
		writeError(w, http.StatusBadRequest, "currency must be IDR.")
		return
	}

	payment := models.Payment{
		ID:        newID(),
		SessionID: body.SessionID,
		Provider:  provider,
		Amount:    body.Amount,
		Currency:  currency,
		Status:    "pending",
		CreatedAt: now,
		UpdatedAt: now,
	}
	if provider == "qris-simulation" {
		payment.Status = "paid"
	}
	if err := s.store.InsertPayment(payment); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to save payment.")
		return
	}
	if err := s.insertPaymentLog(r, "payment.created", payment, nil, map[string]any{
		"sessionId": payment.SessionID,
		"provider":  payment.Provider,
		"amount":    payment.Amount,
		"currency":  payment.Currency,
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to save payment log.")
		return
	}
	if payment.Status == "paid" {
		if session, ok := s.store.FindSession(payment.SessionID); ok {
			session.Status = "paid"
			session.UpdatedAt = now
			_ = s.store.UpdateSession(session)
		}
	}

	writeJSON(w, http.StatusCreated, response{Data: payment})
}

func (s *Server) handlePaymentByID(w http.ResponseWriter, r *http.Request) {
	paymentID, action := pathIDAndAction(r.URL.Path, "/api/payments/")

	switch {
	case r.Method == http.MethodGet && action == "":
		payment, ok := s.store.FindPayment(paymentID)
		if !ok {
			writeError(w, http.StatusNotFound, "Payment not found.")
			return
		}
		writeJSON(w, http.StatusOK, response{Data: payment})
	case r.Method == http.MethodPost && action == "webhook":
		s.handlePaymentWebhook(w, r, paymentID)
	default:
		writeError(w, http.StatusNotFound, "Route not found.")
	}
}

func (s *Server) handleFrames(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
		return
	}

	frames := []models.Frame{}
	for _, frame := range s.store.ListFrames() {
		if frame.Active {
			frames = append(frames, frame)
		}
	}
	writeJSON(w, http.StatusOK, response{Data: frames})
}

func (s *Server) handleAdminFrames(w http.ResponseWriter, r *http.Request) {
	adminUser, err := s.requireAdmin(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}

	switch r.Method {
	case http.MethodGet:
		writeJSON(w, http.StatusOK, response{Data: s.store.ListFrames()})
	case http.MethodPost:
		if adminUser.Role != "owner" {
			writeError(w, http.StatusForbidden, "Owner admin role is required.")
			return
		}
		s.upsertFrame(w, r, "", &adminUser.ID)
	default:
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
	}
}

func (s *Server) handleAdminFrameByID(w http.ResponseWriter, r *http.Request) {
	adminUser, err := s.requireOwner(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}

	frameID, _ := pathIDAndAction(r.URL.Path, "/api/admin/frames/")
	switch r.Method {
	case http.MethodPut:
		s.upsertFrame(w, r, frameID, &adminUser.ID)
	case http.MethodDelete:
		if err := s.store.DeleteFrame(frameID); err != nil {
			writeError(w, http.StatusNotFound, "Frame not found.")
			return
		}
		s.audit(r, &adminUser.ID, "admin.frame.delete", frameID, true)
		w.WriteHeader(http.StatusNoContent)
	default:
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
	}
}

func (s *Server) handleFiles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
		return
	}

	relativePath := strings.TrimPrefix(r.URL.Path, "/files/")
	if strings.Contains(relativePath, "..") {
		writeError(w, http.StatusBadRequest, "Invalid file path.")
		return
	}

	http.ServeFile(w, r, filepath.Join(s.cfg.StorageDir, relativePath))
}

func (s *Server) finalizeSession(w http.ResponseWriter, r *http.Request, sessionID string) {
	var body models.FinalizeSessionRequest
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := validateContact(body.Email, body.Phone); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if len(body.Images) > 16 {
		writeError(w, http.StatusBadRequest, "too many images.")
		return
	}

	session, ok := s.store.FindSession(sessionID)
	if !ok {
		writeError(w, http.StatusNotFound, "Session not found.")
		return
	}

	imageURLs := make([]string, 0, len(body.Images)+1)
	if body.FinalImage != "" {
		image, err := s.saveDataURL(session.ID, body.FinalImage, "final-print")
		if err == nil {
			session.FinalImage = &image
			imageURLs = append(imageURLs, image.URL)
		}
	}

	for index, rawImage := range body.Images {
		image, err := s.saveDataURL(session.ID, rawImage, "image-"+itoa(index+1))
		if err == nil {
			imageURLs = append(imageURLs, image.URL)
		}
	}

	if len(imageURLs) > 0 {
		session.Images = imageURLs
	}

	session.Email = firstString(body.Email, session.Email)
	session.Phone = firstString(body.Phone, session.Phone)
	session.LayoutID = firstString(body.LayoutID, session.LayoutID)
	session.PaperSize = firstString(body.PaperSize, session.PaperSize)
	session.FrameID = firstString(body.FrameID, session.FrameID)
	session.Status = "finalized"
	session.UpdatedAt = time.Now()

	if err := s.store.UpdateSession(session); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update session.")
		return
	}

	writeJSON(w, http.StatusOK, response{Data: session})
}

func (s *Server) patchSession(w http.ResponseWriter, r *http.Request, sessionID string) {
	var body models.PatchSessionRequest
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := validateContact(body.Email, body.Phone); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	session, ok := s.store.FindSession(sessionID)
	if !ok {
		writeError(w, http.StatusNotFound, "Session not found.")
		return
	}

	session.Email = firstString(body.Email, session.Email)
	session.Phone = firstString(body.Phone, session.Phone)
	session.LayoutID = firstString(body.LayoutID, session.LayoutID)
	session.PaperSize = firstString(body.PaperSize, session.PaperSize)
	session.FrameID = firstString(body.FrameID, session.FrameID)
	if body.Status != nil && *body.Status != "" {
		session.Status = *body.Status
	}
	session.UpdatedAt = time.Now()

	if err := s.store.UpdateSession(session); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update session.")
		return
	}

	writeJSON(w, http.StatusOK, response{Data: session})
}

func (s *Server) expireSession(w http.ResponseWriter, sessionID string) {
	session, ok := s.store.FindSession(sessionID)
	if !ok {
		writeError(w, http.StatusNotFound, "Session not found.")
		return
	}

	now := time.Now()
	session.Status = "expired"
	session.ExpiresAt = now
	session.UpdatedAt = now

	if err := s.store.UpdateSession(session); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to expire session.")
		return
	}

	writeJSON(w, http.StatusOK, response{Data: session})
}

func (s *Server) recordSendLink(w http.ResponseWriter, r *http.Request, sessionID string) {
	if !s.allowRequest(r, "send-link", 10) {
		writeError(w, http.StatusTooManyRequests, "Too many send-link requests. Please wait before trying again.")
		return
	}

	var body models.SendLinkRequest
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	session, ok := s.store.FindSession(sessionID)
	if !ok {
		writeError(w, http.StatusNotFound, "Session not found.")
		return
	}

	recipient := body.Recipient
	if recipient == nil {
		recipient = firstString(body.Email, body.Phone)
	}

	channel := body.Channel
	if channel == "" {
		channel = "email"
	}
	if channel != "email" && channel != "whatsapp" {
		writeError(w, http.StatusBadRequest, "channel must be email or whatsapp.")
		return
	}
	if recipient == nil || *recipient == "" {
		writeError(w, http.StatusBadRequest, "recipient is required.")
		return
	}
	if channel == "email" && !validEmail(*recipient) {
		writeError(w, http.StatusBadRequest, "recipient email is invalid.")
		return
	}
	if channel == "whatsapp" && !validPhone(*recipient) {
		writeError(w, http.StatusBadRequest, "recipient phone is invalid.")
		return
	}

	message := models.Message{
		ID:          newID(),
		SessionID:   session.ID,
		Channel:     channel,
		Recipient:   recipient,
		DownloadURL: session.DownloadURL,
		Status:      "queued",
		CreatedAt:   time.Now(),
	}

	if err := s.store.InsertMessage(message); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to record message.")
		return
	}

	writeJSON(w, http.StatusAccepted, response{Data: message})
}

func (s *Server) handlePaymentWebhook(w http.ResponseWriter, r *http.Request, paymentID string) {
	if s.cfg.PaymentWebhookSecret != "" && r.Header.Get("x-webhook-secret") != s.cfg.PaymentWebhookSecret {
		writeError(w, http.StatusUnauthorized, "Payment webhook secret is invalid or missing.")
		return
	}
	if !s.allowRequest(r, "payment-webhook", 60) {
		writeError(w, http.StatusTooManyRequests, "Too many webhook requests. Please wait before trying again.")
		return
	}

	var body models.PaymentWebhookRequest
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	targetID := paymentID
	if body.PaymentID != "" {
		targetID = body.PaymentID
	}

	payment, ok := s.store.FindPayment(targetID)
	if !ok {
		writeError(w, http.StatusNotFound, "Payment not found.")
		return
	}

	status := body.Status
	if status == "" {
		status = "paid"
	}
	if !validPaymentStatus(status) {
		writeError(w, http.StatusBadRequest, "payment status is invalid.")
		return
	}
	statusBefore := payment.Status
	payment.Status = status
	payment.UpdatedAt = time.Now()

	if err := s.store.UpdatePayment(payment); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update payment.")
		return
	}
	if err := s.insertPaymentLog(r, "payment.webhook", payment, &statusBefore, map[string]any{
		"paymentId": body.PaymentID,
		"sessionId": body.SessionID,
		"status":    status,
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to save payment log.")
		return
	}

	if status == "paid" || status == "success" {
		if session, ok := s.store.FindSession(payment.SessionID); ok {
			session.Status = "paid"
			session.UpdatedAt = time.Now()
			_ = s.store.UpdateSession(session)
		}
	}
	s.audit(r, nil, "payment.webhook", payment.ID, true)

	writeJSON(w, http.StatusOK, response{Data: payment})
}

func (s *Server) insertPaymentLog(r *http.Request, event string, payment models.Payment, statusBefore *string, payload map[string]any) error {
	if payload == nil {
		payload = map[string]any{}
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		payloadBytes = []byte("{}")
	}

	return s.store.InsertPaymentLog(models.PaymentLog{
		ID:             newID(),
		PaymentID:      payment.ID,
		SessionID:      payment.SessionID,
		Event:          event,
		Provider:       payment.Provider,
		Amount:         payment.Amount,
		Currency:       payment.Currency,
		StatusBefore:   statusBefore,
		StatusAfter:    payment.Status,
		RequestPayload: string(payloadBytes),
		IP:             clientIP(r),
		UserAgent:      r.UserAgent(),
		CreatedAt:      time.Now(),
	})
}

func (s *Server) upsertFrame(w http.ResponseWriter, r *http.Request, frameID string, actorID *string) {
	var body models.UpsertFrameRequest
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if body.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required.")
		return
	}
	if body.ImageURL == "" {
		writeError(w, http.StatusBadRequest, "imageUrl is required.")
		return
	}

	now := time.Now()
	id := frameID
	if id == "" {
		id = body.ID
	}
	if id == "" {
		id = "frame-" + shortCode()
	}

	active := true
	if body.Active != nil {
		active = *body.Active
	}
	category := body.Category
	if category == "" {
		category = "custom"
	}

	frame := models.Frame{
		ID:          id,
		Name:        body.Name,
		Category:    category,
		LayoutCount: body.LayoutCount,
		ImageURL:    body.ImageURL,
		SlotJSON:    body.SlotJSON,
		Active:      active,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.store.UpsertFrame(frame); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to save frame.")
		return
	}
	s.audit(r, actorID, "admin.frame.upsert", frame.ID, true)

	writeJSON(w, http.StatusOK, response{Data: frame})
}

func (s *Server) createAdminUser(w http.ResponseWriter, r *http.Request, actorID *string) {
	var body models.CreateAdminUserRequest
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	email := strings.ToLower(strings.TrimSpace(body.Email))
	if !validEmail(email) {
		writeError(w, http.StatusBadRequest, "email is invalid.")
		return
	}
	if _, exists := s.store.FindAdminUserByEmail(email); exists {
		writeError(w, http.StatusConflict, "Admin user already exists.")
		return
	}
	role := normalizeAdminRole(body.Role)
	if role == "" {
		writeError(w, http.StatusBadRequest, "role must be owner or staff.")
		return
	}

	passwordHash, err := auth.HashPassword(body.Password)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	now := time.Now()
	user := models.AdminUser{
		ID:           "admin-" + shortCode(),
		Email:        email,
		PasswordHash: passwordHash,
		Role:         role,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if err := s.store.UpsertAdminUser(user); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to save admin user.")
		return
	}
	s.audit(r, actorID, "admin.user.create", user.ID, true)

	writeJSON(w, http.StatusCreated, response{Data: adminUserView(user)})
}

func (s *Server) updateAdminUser(w http.ResponseWriter, r *http.Request, userID string, actorID *string) {
	var body models.UpdateAdminUserRequest
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	user, ok := s.store.FindAdminUserByID(userID)
	if !ok {
		writeError(w, http.StatusNotFound, "Admin user not found.")
		return
	}

	if body.Role != "" {
		role := normalizeAdminRole(body.Role)
		if role == "" {
			writeError(w, http.StatusBadRequest, "role must be owner or staff.")
			return
		}
		user.Role = role
	}
	if body.Password != "" {
		passwordHash, err := auth.HashPassword(body.Password)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		user.PasswordHash = passwordHash
	}
	user.UpdatedAt = time.Now()

	if err := s.store.UpsertAdminUser(user); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update admin user.")
		return
	}
	s.audit(r, actorID, "admin.user.update", user.ID, true)

	writeJSON(w, http.StatusOK, response{Data: adminUserView(user)})
}

func (s *Server) newSession(body models.CreateSessionRequest) models.Session {
	now := time.Now()
	id := body.ID
	if id == "" {
		id = newID()
	}

	status := body.Status
	if status == "" {
		status = "created"
	}

	return models.Session{
		ID:          id,
		ShortCode:   shortCode(),
		Email:       body.Email,
		Phone:       body.Phone,
		LayoutID:    body.LayoutID,
		PaperSize:   body.PaperSize,
		FrameID:     body.FrameID,
		Status:      status,
		Images:      []string{},
		DownloadURL: s.cfg.PublicBaseURL + "/gallery/" + id,
		CreatedAt:   now,
		UpdatedAt:   now,
		ExpiresAt:   now.AddDate(0, 0, s.cfg.SessionTTLDays),
	}
}

func (s *Server) saveDataURL(sessionID string, dataURL string, fileStem string) (models.StoredImage, error) {
	decoded, err := parseDataURL(dataURL)
	if err != nil {
		return models.StoredImage{}, err
	}

	sessionDir := filepath.Join(s.cfg.StorageDir, "sessions", sessionID)
	if err := os.MkdirAll(sessionDir, 0755); err != nil {
		return models.StoredImage{}, err
	}

	fileName := fileStem + "." + decoded.Ext
	key := filepath.Join("sessions", sessionID, fileName)
	filePath := filepath.Join(s.cfg.StorageDir, key)

	if err := os.WriteFile(filePath, decoded.Bytes, 0644); err != nil {
		return models.StoredImage{}, err
	}

	return models.StoredImage{
		Key:      filepath.ToSlash(key),
		URL:      s.cfg.PublicBaseURL + "/files/" + filepath.ToSlash(key),
		MimeType: decoded.MimeType,
		Size:     int64(len(decoded.Bytes)),
	}, nil
}

func (s *Server) requireAdmin(r *http.Request) (models.AdminUser, error) {
	tokenHash, err := adminTokenHashFromRequest(r)
	if err != nil {
		return models.AdminUser{}, err
	}

	token, ok := s.store.FindAdminTokenByHash(tokenHash)
	if !ok || time.Now().After(token.ExpiresAt) {
		return models.AdminUser{}, errors.New("Admin bearer token is invalid or expired.")
	}

	user, ok := s.store.FindAdminUserByID(token.UserID)
	if !ok {
		return models.AdminUser{}, errors.New("Admin user no longer exists.")
	}
	now := time.Now()
	token.LastUsedAt = &now
	_ = s.store.UpdateAdminToken(token)

	return user, nil
}

func adminTokenHashFromRequest(r *http.Request) (string, error) {
	authHeader := r.Header.Get("authorization")
	if !strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
		return "", errors.New("Admin bearer token is missing.")
	}

	tokenValue := strings.TrimSpace(authHeader[len("Bearer "):])
	if tokenValue == "" {
		return "", errors.New("Admin bearer token is missing.")
	}
	return auth.HashToken(tokenValue), nil
}

func (s *Server) requireOwner(r *http.Request) (models.AdminUser, error) {
	user, err := s.requireAdmin(r)
	if err != nil {
		return models.AdminUser{}, err
	}
	if user.Role != "owner" {
		return models.AdminUser{}, errors.New("Owner admin role is required.")
	}
	return user, nil
}

func adminUserView(user models.AdminUser) models.AdminUserView {
	return models.AdminUserView{
		ID:        user.ID,
		Email:     user.Email,
		Role:      user.Role,
		CreatedAt: user.CreatedAt,
		UpdatedAt: user.UpdatedAt,
	}
}

func adminUserViews(users []models.AdminUser) []models.AdminUserView {
	views := make([]models.AdminUserView, 0, len(users))
	for _, user := range users {
		views = append(views, adminUserView(user))
	}
	return views
}

func parseDataURL(dataURL string) (imageData, error) {
	matches := dataURLPattern.FindStringSubmatch(dataURL)
	if len(matches) != 3 {
		return imageData{}, errors.New("invalid data URL")
	}

	raw, err := base64.StdEncoding.DecodeString(matches[2])
	if err != nil {
		return imageData{}, err
	}

	ext := strings.TrimPrefix(matches[1], "image/")
	if !validImageMime(matches[1]) {
		return imageData{}, errors.New("unsupported image mime type")
	}
	if ext == "jpeg" {
		ext = "jpg"
	}
	if ext == "" || strings.Contains(ext, "/") {
		ext = "bin"
	}

	return imageData{
		MimeType: matches[1],
		Ext:      ext,
		Bytes:    raw,
	}, nil
}

func readJSON(r *http.Request, target any) error {
	defer r.Body.Close()
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		if errors.Is(err, io.EOF) {
			return errors.New("JSON body is required.")
		}
		return err
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, body response) {
	w.Header().Set("content-type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, response{Error: &apiError{Message: message}})
}

func pathIDAndAction(path string, prefix string) (string, string) {
	rest := strings.Trim(strings.TrimPrefix(path, prefix), "/")
	parts := strings.Split(rest, "/")
	if len(parts) == 0 {
		return "", ""
	}
	if len(parts) == 1 {
		return parts[0], ""
	}
	return parts[0], parts[1]
}

func newID() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return shortCode() + shortCode()
	}

	bytes[6] = (bytes[6] & 0x0f) | 0x40
	bytes[8] = (bytes[8] & 0x3f) | 0x80

	return hex.EncodeToString(bytes[0:4]) + "-" +
		hex.EncodeToString(bytes[4:6]) + "-" +
		hex.EncodeToString(bytes[6:8]) + "-" +
		hex.EncodeToString(bytes[8:10]) + "-" +
		hex.EncodeToString(bytes[10:16])
}

func shortCode() string {
	bytes := make([]byte, 5)
	if _, err := rand.Read(bytes); err != nil {
		return "local"
	}
	return hex.EncodeToString(bytes)
}

func firstString(values ...*string) *string {
	for _, value := range values {
		if value != nil && *value != "" {
			return value
		}
	}
	return nil
}

func itoa(value int) string {
	if value == 0 {
		return "0"
	}

	digits := []byte{}
	for value > 0 {
		digits = append([]byte{byte('0' + value%10)}, digits...)
		value /= 10
	}
	return string(digits)
}

func countFiles(root string) int {
	count := 0
	_ = filepath.WalkDir(root, func(path string, entry os.DirEntry, err error) error {
		if err != nil || entry.IsDir() {
			return nil
		}
		count++
		return nil
	})
	return count
}

func resolveLocalFile(paths ...string) string {
	for _, path := range paths {
		if _, err := os.Stat(path); err == nil {
			return path
		}
	}
	return paths[0]
}

func (s *Server) allowRequest(r *http.Request, scope string, limit int) bool {
	return s.limiter.allow(scope+":"+clientIP(r), limit)
}

func validEmail(value string) bool {
	value = strings.TrimSpace(value)
	return len(value) <= 254 && emailPattern.MatchString(value)
}

func validPhone(value string) bool {
	value = strings.TrimSpace(strings.ReplaceAll(value, " ", ""))
	return phonePattern.MatchString(value)
}

func validSlug(value string, maxLength int) bool {
	if value == "" || len(value) > maxLength {
		return false
	}
	for _, char := range value {
		if (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9') || char == '-' || char == '_' {
			continue
		}
		return false
	}
	return true
}

func validPaymentStatus(value string) bool {
	switch value {
	case "pending", "paid", "success", "failed", "expired", "cancelled":
		return true
	default:
		return false
	}
}

func normalizeAdminRole(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "staff":
		return "staff"
	case "owner":
		return "owner"
	default:
		return ""
	}
}

func validateContact(email *string, phone *string) error {
	if email != nil && *email != "" && !validEmail(*email) {
		return errors.New("email is invalid")
	}
	if phone != nil && *phone != "" && !validPhone(*phone) {
		return errors.New("phone is invalid")
	}
	return nil
}

func validImageMime(value string) bool {
	switch value {
	case "image/png", "image/jpeg", "image/gif", "image/webp":
		return true
	default:
		return false
	}
}

func (s *Server) recordFailedLogin(email string) {
	now := time.Now()
	attempt, _ := s.store.FindLoginAttempt(email)
	attempt.Email = email
	attempt.FailedCount++
	attempt.LastAttemptAt = now
	if attempt.FailedCount >= 5 {
		lockedUntil := now.Add(15 * time.Minute)
		attempt.LockedUntil = &lockedUntil
	}
	_ = s.store.UpsertLoginAttempt(attempt)
}

func (s *Server) clearLoginAttempt(email string) {
	_ = s.store.UpsertLoginAttempt(models.LoginAttempt{
		Email:         email,
		FailedCount:   0,
		LastAttemptAt: time.Now(),
	})
}

func (s *Server) audit(r *http.Request, actorID *string, action string, resource string, success bool) {
	_ = s.store.InsertAuditLog(models.AuditLog{
		ID:        newID(),
		ActorID:   actorID,
		Action:    action,
		Resource:  resource,
		IP:        clientIP(r),
		UserAgent: r.UserAgent(),
		Success:   success,
		CreatedAt: time.Now(),
	})
}
