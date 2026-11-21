package integration

import (
	"net/http"
	"testing"

	"api/tests/fixtures"
	"api/tests/helpers"
)

func TestUserSearchRequiresManageAccess(t *testing.T) {
	db := helpers.TestDB(t)
	base := fixtures.SeedBase(t, db)

	admin := helpers.NewClient(t, db)
	admin.Login(base.Admin.Email, "admin123")

	outsider := helpers.NewClient(t, db)
	if status := outsider.Do(http.MethodPost, "/users/register", map[string]string{
		"full_name": "Searchable Outsider",
		"username":  "searchable",
		"email":     "searchable@example.com",
		"password":  "secret123",
		"phone":     "0800000020",
		"address":   "Jl. Search",
	}, nil); status != http.StatusCreated {
		t.Fatalf("register outsider status = %d", status)
	}
	outsider.Login("searchable@example.com", "secret123")

	var result struct {
		Data []struct {
			ID       uint   `json:"id"`
			FullName string `json:"full_name"`
			Email    string `json:"email"`
		} `json:"data"`
	}
	if status := admin.Do(http.MethodGet, "/users/search?search=searchable", nil, &result); status != http.StatusOK {
		t.Fatalf("admin search status = %d", status)
	}
	if len(result.Data) != 1 {
		t.Fatalf("admin search returned %d users, want 1", len(result.Data))
	}
	if result.Data[0].Email != "searchable@example.com" {
		t.Fatalf("search returned %+v", result.Data[0])
	}

	// A user without any manageable outlet cannot search the directory.
	if status := outsider.Do(http.MethodGet, "/users/search?search=admin", nil, nil); status != http.StatusForbidden {
		t.Fatalf("outsider search status = %d, want 403", status)
	}
}
