package store

import "urbanmenphoto/backend/internal/models"

type Store interface {
	ListSessions() []models.Session
	FindSession(id string) (models.Session, bool)
	InsertSession(session models.Session) error
	UpdateSession(session models.Session) error
	DeleteSession(id string) (models.Session, error)

	InsertMessage(message models.Message) error
	ListMessages() []models.Message
	MessagesBySession(sessionID string) []models.Message

	ListPayments() []models.Payment
	FindPayment(id string) (models.Payment, bool)
	PaymentsBySession(sessionID string) []models.Payment
	InsertPayment(payment models.Payment) error
	UpdatePayment(payment models.Payment) error
	InsertPaymentLog(log models.PaymentLog) error
	ListPaymentLogs() []models.PaymentLog
	PaymentLogsByPayment(paymentID string) []models.PaymentLog

	ListFrames() []models.Frame
	UpsertFrame(frame models.Frame) error
	DeleteFrame(id string) error

	FindAdminUserByEmail(email string) (models.AdminUser, bool)
	FindAdminUserByID(id string) (models.AdminUser, bool)
	ListAdminUsers() []models.AdminUser
	UpsertAdminUser(user models.AdminUser) error
	DeleteAdminUser(id string) error
	InsertAdminToken(token models.AdminToken) error
	FindAdminTokenByHash(tokenHash string) (models.AdminToken, bool)
	UpdateAdminToken(token models.AdminToken) error
	DeleteAdminToken(tokenHash string) error

	InsertAuditLog(log models.AuditLog) error
	ListAuditLogs() []models.AuditLog

	FindLoginAttempt(email string) (models.LoginAttempt, bool)
	UpsertLoginAttempt(attempt models.LoginAttempt) error
}
