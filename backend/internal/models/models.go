package models

import "time"

type StoredImage struct {
	Key      string `json:"key"`
	URL      string `json:"url"`
	MimeType string `json:"mimeType"`
	Size     int64  `json:"size"`
}

type Session struct {
	ID          string       `json:"id"`
	ShortCode   string       `json:"shortCode"`
	Email       *string      `json:"email"`
	Phone       *string      `json:"phone"`
	LayoutID    *string      `json:"layoutId"`
	PaperSize   *string      `json:"paperSize"`
	FrameID     *string      `json:"frameId"`
	Status      string       `json:"status"`
	FinalImage  *StoredImage `json:"finalImage"`
	Images      []string     `json:"images"`
	DownloadURL string       `json:"downloadUrl"`
	CreatedAt   time.Time    `json:"createdAt"`
	UpdatedAt   time.Time    `json:"updatedAt"`
	ExpiresAt   time.Time    `json:"expiresAt"`
}

type Gallery struct {
	SessionID   string       `json:"sessionId"`
	Status      string       `json:"status"`
	FinalImage  *StoredImage `json:"finalImage"`
	Images      []string     `json:"images"`
	DownloadURL string       `json:"downloadUrl"`
	ExpiresAt   time.Time    `json:"expiresAt"`
	Expired     bool         `json:"expired"`
}

type Message struct {
	ID          string    `json:"id"`
	SessionID   string    `json:"sessionId"`
	Channel     string    `json:"channel"`
	Recipient   *string   `json:"recipient"`
	DownloadURL string    `json:"downloadUrl"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"createdAt"`
}

type AdminSessionDetail struct {
	Session  Session   `json:"session"`
	Messages []Message `json:"messages"`
	Payments []Payment `json:"payments"`
}

type Payment struct {
	ID        string    `json:"id"`
	SessionID string    `json:"sessionId"`
	Provider  string    `json:"provider"`
	Amount    int64     `json:"amount"`
	Currency  string    `json:"currency"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type PaymentLog struct {
	ID             string    `json:"id"`
	PaymentID      string    `json:"paymentId"`
	SessionID      string    `json:"sessionId"`
	Event          string    `json:"event"`
	Provider       string    `json:"provider"`
	Amount         int64     `json:"amount"`
	Currency       string    `json:"currency"`
	StatusBefore   *string   `json:"statusBefore"`
	StatusAfter    string    `json:"statusAfter"`
	ProviderRef    *string   `json:"providerRef"`
	RequestPayload string    `json:"requestPayload"`
	IP             string    `json:"ip"`
	UserAgent      string    `json:"userAgent"`
	CreatedAt      time.Time `json:"createdAt"`
}

type Transaction struct {
	ID        string    `json:"id"`
	SessionID string    `json:"sessionId"`
	Provider  string    `json:"provider"`
	Amount    int64     `json:"amount"`
	Currency  string    `json:"currency"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}

type Frame struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Category    string    `json:"category"`
	LayoutCount int       `json:"layoutCount"`
	ImageURL    string    `json:"imageUrl"`
	SlotJSON    string    `json:"slotJson"`
	Active      bool      `json:"active"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Stats struct {
	TotalSessions     int   `json:"totalSessions"`
	FinalizedSessions int   `json:"finalizedSessions"`
	SessionsToday     int   `json:"sessionsToday"`
	TotalImages       int   `json:"totalImages"`
	TotalPayments     int   `json:"totalPayments"`
	PaidPayments      int   `json:"paidPayments"`
	Revenue           int64 `json:"revenue"`
}

type AdminUser struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type AdminUserView struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type AdminToken struct {
	TokenHash  string     `json:"tokenHash"`
	UserID     string     `json:"userId"`
	ExpiresAt  time.Time  `json:"expiresAt"`
	CreatedAt  time.Time  `json:"createdAt"`
	LastUsedAt *time.Time `json:"lastUsedAt,omitempty"`
}

type AuditLog struct {
	ID        string    `json:"id"`
	ActorID   *string   `json:"actorId"`
	Action    string    `json:"action"`
	Resource  string    `json:"resource"`
	IP        string    `json:"ip"`
	UserAgent string    `json:"userAgent"`
	Success   bool      `json:"success"`
	CreatedAt time.Time `json:"createdAt"`
}

type LoginAttempt struct {
	Email         string     `json:"email"`
	FailedCount   int        `json:"failedCount"`
	LockedUntil   *time.Time `json:"lockedUntil,omitempty"`
	LastAttemptAt time.Time  `json:"lastAttemptAt"`
}

type AdminLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AdminLoginResponse struct {
	Authenticated bool   `json:"authenticated"`
	Token         string `json:"token,omitempty"`
	ExpiresAt     string `json:"expiresAt,omitempty"`
	Role          string `json:"role,omitempty"`
}

type CreateAdminUserRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type UpdateAdminUserRequest struct {
	Password string `json:"password"`
	Role     string `json:"role"`
}

type CreateSessionRequest struct {
	ID        string  `json:"id"`
	Email     *string `json:"email"`
	Phone     *string `json:"phone"`
	LayoutID  *string `json:"layoutId"`
	PaperSize *string `json:"paperSize"`
	FrameID   *string `json:"frameId"`
	Status    string  `json:"status"`
}

type FinalizeSessionRequest struct {
	Email      *string  `json:"email"`
	Phone      *string  `json:"phone"`
	LayoutID   *string  `json:"layoutId"`
	PaperSize  *string  `json:"paperSize"`
	FrameID    *string  `json:"frameId"`
	FinalImage string   `json:"finalImage"`
	Images     []string `json:"images"`
}

type SendLinkRequest struct {
	Channel   string  `json:"channel"`
	Recipient *string `json:"recipient"`
	Email     *string `json:"email"`
	Phone     *string `json:"phone"`
}

type PatchSessionRequest struct {
	Email     *string `json:"email"`
	Phone     *string `json:"phone"`
	LayoutID  *string `json:"layoutId"`
	PaperSize *string `json:"paperSize"`
	FrameID   *string `json:"frameId"`
	Status    *string `json:"status"`
}

type CreatePaymentRequest struct {
	SessionID string `json:"sessionId"`
	Provider  string `json:"provider"`
	Amount    int64  `json:"amount"`
	Currency  string `json:"currency"`
}

type PaymentWebhookRequest struct {
	PaymentID string `json:"paymentId"`
	SessionID string `json:"sessionId"`
	Status    string `json:"status"`
}

type UpsertFrameRequest struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Category    string `json:"category"`
	LayoutCount int    `json:"layoutCount"`
	ImageURL    string `json:"imageUrl"`
	SlotJSON    string `json:"slotJson"`
	Active      *bool  `json:"active"`
}

type CleanupResult struct {
	DeletedSessions int `json:"deletedSessions"`
	DeletedFiles    int `json:"deletedFiles"`
}
