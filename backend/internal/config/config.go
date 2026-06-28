package config

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

type Config struct {
	Host                 string
	Port                 string
	PublicBaseURL        string
	PaymentWebhookSecret string
	AllowedOrigins       []string
	DatabaseURL          string
	DataDir              string
	StorageDir           string
	SessionTTLDays       int
	AdminTokenTTLHrs     int
	MaxBodyBytes         int64
}

func Load() Config {
	loadDotEnv()

	port := getEnv("BACKEND_PORT", getEnv("PORT", "8787"))
	host := getEnv("BACKEND_HOST", "127.0.0.1")
	defaultDataDir, defaultStorageDir := defaultRuntimeDirs()

	return Config{
		Host:                 host,
		Port:                 port,
		PublicBaseURL:        getEnv("PUBLIC_BASE_URL", "http://localhost:"+port),
		PaymentWebhookSecret: os.Getenv("PAYMENT_WEBHOOK_SECRET"),
		AllowedOrigins:       splitCSV(os.Getenv("ALLOWED_ORIGINS")),
		DatabaseURL:          os.Getenv("DATABASE_URL"),
		DataDir:              getEnv("BACKEND_DATA_DIR", defaultDataDir),
		StorageDir:           getEnv("BACKEND_STORAGE_DIR", defaultStorageDir),
		SessionTTLDays:       getEnvInt("SESSION_TTL_DAYS", 7),
		AdminTokenTTLHrs:     getEnvInt("ADMIN_TOKEN_TTL_HOURS", 12),
		MaxBodyBytes:         int64(getEnvInt("MAX_BODY_BYTES", 15*1024*1024)),
	}
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	result := []string{}
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			result = append(result, part)
		}
	}
	return result
}

func loadDotEnv() {
	for _, envPath := range dotEnvPaths() {
		file, err := os.Open(envPath)
		if err != nil {
			continue
		}
		defer file.Close()

		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			key, value, ok := strings.Cut(line, "=")
			if !ok {
				continue
			}
			key = strings.TrimSpace(key)
			value = strings.Trim(strings.TrimSpace(value), `"'`)
			if key == "" || os.Getenv(key) != "" {
				continue
			}
			_ = os.Setenv(key, value)
		}
		return
	}
}

func dotEnvPaths() []string {
	cwd, err := os.Getwd()
	if err == nil && strings.EqualFold(filepath.Base(cwd), "backend") {
		return []string{".env", filepath.Join("..", ".env")}
	}
	return []string{filepath.Join("backend", ".env"), ".env"}
}

func defaultRuntimeDirs() (string, string) {
	cwd, err := os.Getwd()
	if err == nil && strings.EqualFold(filepath.Base(cwd), "backend") {
		return "data", "storage"
	}
	return filepath.Join("backend", "data"), filepath.Join("backend", "storage")
}

func getEnv(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	var parsed int
	for _, char := range value {
		if char < '0' || char > '9' {
			return fallback
		}
		parsed = parsed*10 + int(char-'0')
	}

	if parsed <= 0 {
		return fallback
	}
	return parsed
}
