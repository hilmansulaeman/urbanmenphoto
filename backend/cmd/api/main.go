package main

import (
	"log"
	"net/http"

	"urbanmenphoto/backend/internal/config"
	"urbanmenphoto/backend/internal/httpapi"
	"urbanmenphoto/backend/internal/store"
)

func main() {
	cfg := config.Load()
	var appStore store.Store
	var err error
	if cfg.DatabaseURL != "" {
		appStore, err = store.NewPostgresStore(cfg.DatabaseURL)
	} else {
		appStore, err = store.NewJSONStore(cfg.DataDir)
	}
	if err != nil {
		log.Fatalf("init store: %v", err)
	}

	server := httpapi.NewServer(cfg, appStore)
	addr := cfg.Host + ":" + cfg.Port

	log.Printf("Urbanmenphoto Go backend running at %s", cfg.PublicBaseURL)
	if err := http.ListenAndServe(addr, server.Routes()); err != nil {
		log.Fatal(err)
	}
}
