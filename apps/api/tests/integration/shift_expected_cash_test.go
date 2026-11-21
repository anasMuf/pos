package integration

import (
	"fmt"
	"net/http"
	"testing"

	"api/tests/fixtures"
	"api/tests/helpers"
)

// TestOpenShiftReportsLiveExpectedCash guards the close-shift screen: an open
// shift must report opening cash + cash sales, not just the opening float.
func TestOpenShiftReportsLiveExpectedCash(t *testing.T) {
	db := helpers.TestDB(t)
	base := fixtures.SeedBase(t, db)
	client := loginAdmin(t, db, base)

	var shift struct {
		Data struct {
			ID uint `json:"id"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodPost, "/cash-shifts/open", map[string]interface{}{
		"outlet_id":    base.Print.ID,
		"opening_cash": 100000,
	}, &shift); status != http.StatusCreated {
		t.Fatalf("open shift status = %d", status)
	}

	orderBody := map[string]interface{}{
		"outlet_id":      base.Print.ID,
		"shift_id":       shift.Data.ID,
		"client_sync_id": "live-expected-order",
		"items": []map[string]interface{}{
			{
				"product_id": base.Banner.ID,
				"qty":        1,
				"unit_price": 1,
				"meta_data":  map[string]interface{}{"width": 1, "height": 1},
			},
		},
		"initial_payment": map[string]interface{}{
			"client_payment_id": "live-expected-payment",
			"payment_type":      "full",
			"payment_method":    "cash",
			"amount":            25000,
		},
	}
	if status := client.Do(http.MethodPost, "/orders", orderBody, nil); status != http.StatusCreated {
		t.Fatalf("create cash order status = %d", status)
	}

	var open struct {
		Data struct {
			Status       string  `json:"status"`
			ExpectedCash float64 `json:"expected_cash"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodGet, fmt.Sprintf("/cash-shifts/%d", shift.Data.ID), nil, &open); status != http.StatusOK {
		t.Fatalf("get shift status = %d", status)
	}
	if open.Data.Status != "open" {
		t.Fatalf("shift status = %q, want open", open.Data.Status)
	}
	if open.Data.ExpectedCash != 125000 {
		t.Fatalf("live expected cash = %v, want 125000", open.Data.ExpectedCash)
	}
}
