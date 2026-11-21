package integration

import (
	"net/http"
	"testing"

	"api/tests/helpers"
)

func TestHealthEndpoint(t *testing.T) {
	// Health does not need a database, so this test always runs.
	client := helpers.NewClient(t, nil)

	var out struct {
		Data struct {
			Status string `json:"status"`
		} `json:"data"`
	}
	status := client.Do(http.MethodGet, "/health", nil, &out)
	if status != http.StatusOK {
		t.Fatalf("health status = %d, want 200", status)
	}
	if out.Data.Status != "ok" {
		t.Fatalf("health payload status = %q, want ok", out.Data.Status)
	}
}
