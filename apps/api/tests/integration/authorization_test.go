package integration

import (
	"fmt"
	"net/http"
	"testing"

	"api/tests/fixtures"
	"api/tests/helpers"
)

func TestAuthorizationScoping(t *testing.T) {
	db := helpers.TestDB(t)
	base := fixtures.SeedBase(t, db)

	admin := helpers.NewClient(t, db)
	admin.Login(base.Admin.Email, "admin123")

	var adminOutlets struct {
		Data []map[string]any `json:"data"`
	}
	if status := admin.Do(http.MethodGet, "/outlets", nil, &adminOutlets); status != http.StatusOK {
		t.Fatalf("admin outlet list status = %d", status)
	}
	if len(adminOutlets.Data) != 2 {
		t.Fatalf("admin sees %d outlets, want 2", len(adminOutlets.Data))
	}

	userA := helpers.NewClient(t, db)
	status := userA.Do(http.MethodPost, "/users/register", map[string]string{
		"full_name": "User A",
		"username":  "usera",
		"email":     "usera@example.com",
		"password":  "secret123",
		"phone":     "0800000002",
		"address":   "Jl. A",
	}, nil)
	if status != http.StatusCreated {
		t.Fatalf("register user A status = %d", status)
	}
	userA.Login("usera@example.com", "secret123")

	var empty struct {
		Data []map[string]any `json:"data"`
	}
	if status := userA.Do(http.MethodGet, "/outlets", nil, &empty); status != http.StatusOK {
		t.Fatalf("user A outlet list status = %d", status)
	}
	if len(empty.Data) != 0 {
		t.Fatalf("user A sees %d outlets, want 0", len(empty.Data))
	}

	status = userA.Do(http.MethodGet, fmt.Sprintf("/outlets/%d", base.Retail.ID), nil, nil)
	if status != http.StatusForbidden {
		t.Fatalf("user A reading another outlet status = %d, want 403", status)
	}

	var created struct {
		Data struct {
			ID uint `json:"id"`
		} `json:"data"`
	}
	status = userA.Do(http.MethodPost, "/outlets", map[string]interface{}{
		"tenant_id": base.Tenant.ID,
		"name":      "User A Outlet",
		"address":   "Jl. A",
	}, &created)
	if status != http.StatusCreated {
		t.Fatalf("user A create outlet status = %d", status)
	}
	if created.Data.ID == 0 {
		t.Fatalf("created outlet id is zero")
	}

	var own struct {
		Data []map[string]any `json:"data"`
	}
	if status := userA.Do(http.MethodGet, "/outlets", nil, &own); status != http.StatusOK {
		t.Fatalf("user A outlet list status = %d", status)
	}
	if len(own.Data) != 1 {
		t.Fatalf("user A sees %d outlets after onboarding, want 1", len(own.Data))
	}
}

func TestOutletAccessRoles(t *testing.T) {
	db := helpers.TestDB(t)
	base := fixtures.SeedBase(t, db)

	admin := helpers.NewClient(t, db)
	admin.Login(base.Admin.Email, "admin123")

	var adminAccess struct {
		Data struct {
			Role          string `json:"role"`
			IsGlobalAdmin bool   `json:"is_global_admin"`
		} `json:"data"`
	}
	if status := admin.Do(http.MethodGet, fmt.Sprintf("/outlets/%d/access", base.Retail.ID), nil, &adminAccess); status != http.StatusOK {
		t.Fatalf("admin access status = %d", status)
	}
	if adminAccess.Data.Role != "admin" || !adminAccess.Data.IsGlobalAdmin {
		t.Fatalf("admin access = %+v, want role admin and is_global_admin", adminAccess.Data)
	}

	cashier := helpers.NewClient(t, db)
	if status := cashier.Do(http.MethodPost, "/users/register", map[string]string{
		"full_name": "Cashier Access",
		"username":  "cashieraccess",
		"email":     "cashieraccess@example.com",
		"password":  "secret123",
		"phone":     "0800000009",
		"address":   "Jl. Access",
	}, nil); status != http.StatusCreated {
		t.Fatalf("register cashier status = %d", status)
	}
	cashier.Login("cashieraccess@example.com", "secret123")

	var cashierProfile struct {
		Data struct {
			ID uint `json:"id"`
		} `json:"data"`
	}
	cashier.Do(http.MethodGet, "/users", nil, &cashierProfile)

	if status := admin.Do(http.MethodPost, fmt.Sprintf("/outlets/%d/members", base.Retail.ID), map[string]interface{}{
		"user_id":     cashierProfile.Data.ID,
		"outlet_role": "cashier",
	}, nil); status != http.StatusCreated {
		t.Fatalf("assign cashier status = %d", status)
	}

	var cashierAccess struct {
		Data struct {
			Role          string `json:"role"`
			IsGlobalAdmin bool   `json:"is_global_admin"`
		} `json:"data"`
	}
	if status := cashier.Do(http.MethodGet, fmt.Sprintf("/outlets/%d/access", base.Retail.ID), nil, &cashierAccess); status != http.StatusOK {
		t.Fatalf("cashier access status = %d", status)
	}
	if cashierAccess.Data.Role != "cashier" || cashierAccess.Data.IsGlobalAdmin {
		t.Fatalf("cashier access = %+v, want role cashier", cashierAccess.Data)
	}

	outsider := helpers.NewClient(t, db)
	if status := outsider.Do(http.MethodPost, "/users/register", map[string]string{
		"full_name": "Outsider",
		"username":  "outsider",
		"email":     "outsider@example.com",
		"password":  "secret123",
		"phone":     "0800000010",
		"address":   "Jl. Outside",
	}, nil); status != http.StatusCreated {
		t.Fatalf("register outsider status = %d", status)
	}
	outsider.Login("outsider@example.com", "secret123")

	if status := outsider.Do(http.MethodGet, fmt.Sprintf("/outlets/%d/access", base.Retail.ID), nil, nil); status != http.StatusForbidden {
		t.Fatalf("outsider access status = %d, want 403", status)
	}
}

func TestCashierCannotManageCatalog(t *testing.T) {
	db := helpers.TestDB(t)
	base := fixtures.SeedBase(t, db)

	// Create and assign a cashier.
	admin := helpers.NewClient(t, db)
	admin.Login(base.Admin.Email, "admin123")

	cashier := helpers.NewClient(t, db)
	if status := cashier.Do(http.MethodPost, "/users/register", map[string]string{
		"full_name": "Cashier",
		"username":  "cashier",
		"email":     "cashier@example.com",
		"password":  "secret123",
		"phone":     "0800000003",
		"address":   "Jl. C",
	}, nil); status != http.StatusCreated {
		t.Fatalf("register cashier status = %d", status)
	}
	cashier.Login("cashier@example.com", "secret123")

	var cashierProfile struct {
		Data struct {
			ID uint `json:"id"`
		} `json:"data"`
	}
	cashier.Do(http.MethodGet, "/users", nil, &cashierProfile)

	if status := admin.Do(http.MethodPost, fmt.Sprintf("/outlets/%d/members", base.Retail.ID), map[string]interface{}{
		"user_id":     cashierProfile.Data.ID,
		"outlet_role": "cashier",
	}, nil); status != http.StatusCreated {
		t.Fatalf("assign cashier status = %d", status)
	}

	// Cashier can read products.
	if status := cashier.Do(http.MethodGet, fmt.Sprintf("/products?outlet_id=%d", base.Retail.ID), nil, nil); status != http.StatusOK {
		t.Fatalf("cashier product list status = %d", status)
	}

	// Cashier cannot create a product.
	status := cashier.Do(http.MethodPost, "/products", map[string]interface{}{
		"outlet_id":    base.Retail.ID,
		"name":         "Illegal",
		"sku":          "ILL-1",
		"category":     "X",
		"pricing_type": "fixed",
		"base_price":   1,
	}, nil)
	if status != http.StatusForbidden {
		t.Fatalf("cashier create product status = %d, want 403", status)
	}
}
