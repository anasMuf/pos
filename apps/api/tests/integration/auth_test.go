package integration

import (
	"net/http"
	"testing"

	"api/tests/helpers"
)

func TestAuthRegisterLoginProfile(t *testing.T) {
	db := helpers.TestDB(t)
	client := helpers.NewClient(t, db)

	status := client.Do(http.MethodPost, "/users/register", map[string]string{
		"full_name": "Test User",
		"username":  "testuser",
		"email":     "test@example.com",
		"password":  "secret123",
		"phone":     "0800000001",
		"address":   "Jl. Test",
	}, nil)
	if status != http.StatusCreated {
		t.Fatalf("register status = %d, want 201", status)
	}

	client.Login("test@example.com", "secret123")

	var profile struct {
		Data struct {
			Email string `json:"email"`
		} `json:"data"`
	}
	status = client.Do(http.MethodGet, "/users", nil, &profile)
	if status != http.StatusOK {
		t.Fatalf("profile status = %d, want 200", status)
	}
	if profile.Data.Email != "test@example.com" {
		t.Fatalf("profile email = %q, want test@example.com", profile.Data.Email)
	}
}

func TestAuthRejectsMissingToken(t *testing.T) {
	db := helpers.TestDB(t)
	client := helpers.NewClient(t, db)

	status := client.Do(http.MethodGet, "/outlets", nil, nil)
	if status != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", status)
	}
}
