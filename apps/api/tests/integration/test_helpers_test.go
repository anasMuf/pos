package integration

import (
	"net/http"
	"testing"

	"api/tests/fixtures"
	"api/tests/helpers"

	"gorm.io/gorm"
)

func loginAdmin(t *testing.T, db *gorm.DB, base *fixtures.Base) *helpers.Client {
	t.Helper()
	client := helpers.NewClient(t, db)
	client.Login(base.Admin.Email, "admin123")
	return client
}

func openShift(t *testing.T, client *helpers.Client, outletID uint) uint {
	t.Helper()
	var out struct {
		Data struct {
			ID uint `json:"id"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodPost, "/cash-shifts/open", map[string]interface{}{
		"outlet_id":    outletID,
		"opening_cash": 0,
	}, &out); status != http.StatusCreated {
		t.Fatalf("open shift status = %d, want 201", status)
	}
	return out.Data.ID
}
