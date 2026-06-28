package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"urbanmenphoto/backend/internal/auth"
	"urbanmenphoto/backend/internal/config"
	"urbanmenphoto/backend/internal/models"
	"urbanmenphoto/backend/internal/store"
)

func newTestServer(t *testing.T) http.Handler {
	t.Helper()

	tmpDir := t.TempDir()
	jsonStore, err := store.NewJSONStore(filepath.Join(tmpDir, "data"))
	if err != nil {
		t.Fatalf("store init failed: %v", err)
	}
	passwordHash, err := auth.HashPassword("test-password-123")
	if err != nil {
		t.Fatalf("hash test password: %v", err)
	}
	now := time.Now()
	if err := jsonStore.UpsertAdminUser(models.AdminUser{
		ID:           "admin-test",
		Email:        "admin@example.test",
		PasswordHash: passwordHash,
		Role:         "owner",
		CreatedAt:    now,
		UpdatedAt:    now,
	}); err != nil {
		t.Fatalf("seed admin user: %v", err)
	}

	server := NewServer(config.Config{
		Host:             "127.0.0.1",
		Port:             "8787",
		PublicBaseURL:    "http://example.test",
		AllowedOrigins:   []string{"http://localhost:5173"},
		DataDir:          filepath.Join(tmpDir, "data"),
		StorageDir:       filepath.Join(tmpDir, "storage"),
		SessionTTLDays:   7,
		AdminTokenTTLHrs: 12,
		MaxBodyBytes:     1024 * 1024,
	}, jsonStore)

	return server.Routes()
}

func loginAdmin(t *testing.T, handler http.Handler) string {
	t.Helper()

	body := bytes.NewBufferString(`{"email":"admin@example.test","password":"test-password-123"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/admin/auth/login", body)
	req.Header.Set("content-type", "application/json")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected admin login status 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var loginResponse struct {
		Data struct {
			Token string `json:"token"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &loginResponse); err != nil {
		t.Fatalf("decode login response: %v", err)
	}
	if loginResponse.Data.Token == "" {
		t.Fatal("expected admin token")
	}
	return loginResponse.Data.Token
}

func TestHealth(t *testing.T) {
	handler := newTestServer(t)
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	if rec.Header().Get("x-content-type-options") != "nosniff" {
		t.Fatal("expected security headers")
	}
}

func TestCORSWhitelist(t *testing.T) {
	handler := newTestServer(t)
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	req.Header.Set("origin", "https://evil.example")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Header().Get("access-control-allow-origin") != "" {
		t.Fatal("expected disallowed origin to be omitted")
	}

	req = httptest.NewRequest(http.MethodGet, "/health", nil)
	req.Header.Set("origin", "http://localhost:5173")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Header().Get("access-control-allow-origin") != "http://localhost:5173" {
		t.Fatal("expected allowed origin header")
	}
}

func TestSwaggerSpec(t *testing.T) {
	handler := newTestServer(t)
	req := httptest.NewRequest(http.MethodGet, "/swagger/openapi.yaml", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	if !bytes.Contains(rec.Body.Bytes(), []byte("openapi: 3.0.3")) {
		t.Fatalf("expected OpenAPI spec, got %s", rec.Body.String())
	}
}

func TestSessionPaymentAndGalleryFlow(t *testing.T) {
	handler := newTestServer(t)
	adminToken := loginAdmin(t, handler)

	sessionBody := bytes.NewBufferString(`{"layoutId":"layout-3","paperSize":"4r","frameId":"demo-frame"}`)
	sessionReq := httptest.NewRequest(http.MethodPost, "/api/sessions", sessionBody)
	sessionReq.Header.Set("content-type", "application/json")
	sessionRec := httptest.NewRecorder()
	handler.ServeHTTP(sessionRec, sessionReq)

	if sessionRec.Code != http.StatusCreated {
		t.Fatalf("expected session status 201, got %d: %s", sessionRec.Code, sessionRec.Body.String())
	}

	var sessionResponse struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(sessionRec.Body.Bytes(), &sessionResponse); err != nil {
		t.Fatalf("decode session response: %v", err)
	}
	if sessionResponse.Data.ID == "" {
		t.Fatal("expected session id")
	}

	paymentBody := bytes.NewBufferString(`{"sessionId":"` + sessionResponse.Data.ID + `","provider":"manual","amount":50000}`)
	paymentReq := httptest.NewRequest(http.MethodPost, "/api/payments", paymentBody)
	paymentReq.Header.Set("content-type", "application/json")
	paymentRec := httptest.NewRecorder()
	handler.ServeHTTP(paymentRec, paymentReq)

	if paymentRec.Code != http.StatusCreated {
		t.Fatalf("expected payment status 201, got %d: %s", paymentRec.Code, paymentRec.Body.String())
	}
	var paymentResponse struct {
		Data struct {
			ID     string `json:"id"`
			Status string `json:"status"`
		} `json:"data"`
	}
	if err := json.Unmarshal(paymentRec.Body.Bytes(), &paymentResponse); err != nil {
		t.Fatalf("decode payment response: %v", err)
	}
	if paymentResponse.Data.Status != "pending" {
		t.Fatalf("expected manual payment to stay pending, got %q", paymentResponse.Data.Status)
	}

	simPaymentBody := bytes.NewBufferString(`{"sessionId":"` + sessionResponse.Data.ID + `","provider":"qris-simulation","amount":50000}`)
	simPaymentReq := httptest.NewRequest(http.MethodPost, "/api/payments", simPaymentBody)
	simPaymentReq.Header.Set("content-type", "application/json")
	simPaymentRec := httptest.NewRecorder()
	handler.ServeHTTP(simPaymentRec, simPaymentReq)

	if simPaymentRec.Code != http.StatusCreated {
		t.Fatalf("expected simulated payment status 201, got %d: %s", simPaymentRec.Code, simPaymentRec.Body.String())
	}
	var simPaymentResponse struct {
		Data struct {
			Status string `json:"status"`
		} `json:"data"`
	}
	if err := json.Unmarshal(simPaymentRec.Body.Bytes(), &simPaymentResponse); err != nil {
		t.Fatalf("decode simulated payment response: %v", err)
	}
	if simPaymentResponse.Data.Status != "paid" {
		t.Fatalf("expected qris simulation payment to be paid, got %q", simPaymentResponse.Data.Status)
	}

	galleryReq := httptest.NewRequest(http.MethodGet, "/api/galleries/"+sessionResponse.Data.ID, nil)
	galleryRec := httptest.NewRecorder()
	handler.ServeHTTP(galleryRec, galleryReq)

	if galleryRec.Code != http.StatusOK {
		t.Fatalf("expected gallery status 200, got %d: %s", galleryRec.Code, galleryRec.Body.String())
	}

	sendBody := bytes.NewBufferString(`{"channel":"email","recipient":"user@example.test"}`)
	sendReq := httptest.NewRequest(http.MethodPost, "/api/sessions/"+sessionResponse.Data.ID+"/send-link", sendBody)
	sendReq.Header.Set("content-type", "application/json")
	sendRec := httptest.NewRecorder()
	handler.ServeHTTP(sendRec, sendReq)

	if sendRec.Code != http.StatusAccepted {
		t.Fatalf("expected send-link status 202, got %d: %s", sendRec.Code, sendRec.Body.String())
	}

	for _, path := range []string{
		"/api/admin/stats",
		"/api/admin/messages",
		"/api/admin/payments",
		"/api/admin/payment-logs",
		"/api/admin/payment-logs?paymentId=" + paymentResponse.Data.ID,
		"/api/admin/transactions",
		"/api/admin/audit-logs",
		"/api/admin/sessions/" + sessionResponse.Data.ID,
	} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req.Header.Set("authorization", "Bearer "+adminToken)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected %s status 200, got %d: %s", path, rec.Code, rec.Body.String())
		}
	}
}

func TestAdminTokenIsStoredHashed(t *testing.T) {
	handler := newTestServer(t)
	token := loginAdmin(t, handler)

	req := httptest.NewRequest(http.MethodGet, "/api/admin/audit-logs", nil)
	req.Header.Set("authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected audit logs status 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if bytes.Contains(rec.Body.Bytes(), []byte(token)) {
		t.Fatal("raw admin token leaked in API response")
	}
}

func TestAdminLogoutRevokesToken(t *testing.T) {
	handler := newTestServer(t)
	token := loginAdmin(t, handler)

	logoutReq := httptest.NewRequest(http.MethodPost, "/api/admin/auth/logout", nil)
	logoutReq.Header.Set("authorization", "Bearer "+token)
	logoutRec := httptest.NewRecorder()
	handler.ServeHTTP(logoutRec, logoutReq)

	if logoutRec.Code != http.StatusOK {
		t.Fatalf("expected logout status 200, got %d: %s", logoutRec.Code, logoutRec.Body.String())
	}

	meReq := httptest.NewRequest(http.MethodGet, "/api/admin/auth/me", nil)
	meReq.Header.Set("authorization", "Bearer "+token)
	meRec := httptest.NewRecorder()
	handler.ServeHTTP(meRec, meReq)

	if meRec.Code != http.StatusUnauthorized {
		t.Fatalf("expected revoked token status 401, got %d: %s", meRec.Code, meRec.Body.String())
	}
}

func TestAdminUserManagement(t *testing.T) {
	handler := newTestServer(t)
	token := loginAdmin(t, handler)

	createReq := httptest.NewRequest(http.MethodPost, "/api/admin/users", bytes.NewBufferString(`{"email":"staff@example.test","password":"staff-password-123","role":"staff"}`))
	createReq.Header.Set("content-type", "application/json")
	createReq.Header.Set("authorization", "Bearer "+token)
	createRec := httptest.NewRecorder()
	handler.ServeHTTP(createRec, createReq)

	if createRec.Code != http.StatusCreated {
		t.Fatalf("expected create admin user status 201, got %d: %s", createRec.Code, createRec.Body.String())
	}
	if bytes.Contains(createRec.Body.Bytes(), []byte("passwordHash")) {
		t.Fatal("admin password hash leaked in API response")
	}

	var createResponse struct {
		Data struct {
			ID    string `json:"id"`
			Email string `json:"email"`
			Role  string `json:"role"`
		} `json:"data"`
	}
	if err := json.Unmarshal(createRec.Body.Bytes(), &createResponse); err != nil {
		t.Fatalf("decode create admin response: %v", err)
	}
	if createResponse.Data.ID == "" || createResponse.Data.Email != "staff@example.test" || createResponse.Data.Role != "staff" {
		t.Fatalf("unexpected create admin response: %s", createRec.Body.String())
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/admin/users", nil)
	listReq.Header.Set("authorization", "Bearer "+token)
	listRec := httptest.NewRecorder()
	handler.ServeHTTP(listRec, listReq)
	if listRec.Code != http.StatusOK {
		t.Fatalf("expected list admin users status 200, got %d: %s", listRec.Code, listRec.Body.String())
	}

	updateReq := httptest.NewRequest(http.MethodPatch, "/api/admin/users/"+createResponse.Data.ID, bytes.NewBufferString(`{"role":"owner","password":"new-staff-password-123"}`))
	updateReq.Header.Set("content-type", "application/json")
	updateReq.Header.Set("authorization", "Bearer "+token)
	updateRec := httptest.NewRecorder()
	handler.ServeHTTP(updateRec, updateReq)
	if updateRec.Code != http.StatusOK {
		t.Fatalf("expected update admin user status 200, got %d: %s", updateRec.Code, updateRec.Body.String())
	}

	deleteReq := httptest.NewRequest(http.MethodDelete, "/api/admin/users/"+createResponse.Data.ID, nil)
	deleteReq.Header.Set("authorization", "Bearer "+token)
	deleteRec := httptest.NewRecorder()
	handler.ServeHTTP(deleteRec, deleteReq)
	if deleteRec.Code != http.StatusNoContent {
		t.Fatalf("expected delete admin user status 204, got %d: %s", deleteRec.Code, deleteRec.Body.String())
	}
}

func TestSecurityValidation(t *testing.T) {
	handler := newTestServer(t)

	loginReq := httptest.NewRequest(http.MethodPost, "/api/admin/auth/login", bytes.NewBufferString(`{"email":"admin@example.test","password":"wrong-password"}`))
	loginReq.Header.Set("content-type", "application/json")
	loginRec := httptest.NewRecorder()
	handler.ServeHTTP(loginRec, loginReq)
	if loginRec.Code != http.StatusUnauthorized {
		t.Fatalf("expected bad login status 401, got %d: %s", loginRec.Code, loginRec.Body.String())
	}

	sessionReq := httptest.NewRequest(http.MethodPost, "/api/sessions", bytes.NewBufferString(`{"layoutId":"layout-3"}`))
	sessionReq.Header.Set("content-type", "application/json")
	sessionRec := httptest.NewRecorder()
	handler.ServeHTTP(sessionRec, sessionReq)
	if sessionRec.Code != http.StatusCreated {
		t.Fatalf("expected session status 201, got %d: %s", sessionRec.Code, sessionRec.Body.String())
	}

	var sessionResponse struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(sessionRec.Body.Bytes(), &sessionResponse); err != nil {
		t.Fatalf("decode session response: %v", err)
	}

	sendReq := httptest.NewRequest(http.MethodPost, "/api/sessions/"+sessionResponse.Data.ID+"/send-link", bytes.NewBufferString(`{"channel":"email","recipient":"not-an-email"}`))
	sendReq.Header.Set("content-type", "application/json")
	sendRec := httptest.NewRecorder()
	handler.ServeHTTP(sendRec, sendReq)
	if sendRec.Code != http.StatusBadRequest {
		t.Fatalf("expected bad email status 400, got %d: %s", sendRec.Code, sendRec.Body.String())
	}

	paymentReq := httptest.NewRequest(http.MethodPost, "/api/payments", bytes.NewBufferString(`{"sessionId":"`+sessionResponse.Data.ID+`","provider":"manual","amount":0}`))
	paymentReq.Header.Set("content-type", "application/json")
	paymentRec := httptest.NewRecorder()
	handler.ServeHTTP(paymentRec, paymentReq)
	if paymentRec.Code != http.StatusBadRequest {
		t.Fatalf("expected bad payment status 400, got %d: %s", paymentRec.Code, paymentRec.Body.String())
	}
}
