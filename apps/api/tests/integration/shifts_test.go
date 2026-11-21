package integration

import (
	"fmt"
	"net/http"
	"testing"

	"api/tests/fixtures"
	"api/tests/helpers"
)

func TestShiftOpenCloseReconciliation(t *testing.T) {
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

	if status := client.Do(http.MethodPost, "/cash-shifts/open", map[string]interface{}{
		"outlet_id":    base.Print.ID,
		"opening_cash": 100000,
	}, nil); status != http.StatusBadRequest {
		t.Fatalf("duplicate open shift status = %d, want 400", status)
	}

	orderBody := map[string]interface{}{
		"outlet_id":      base.Print.ID,
		"shift_id":       shift.Data.ID,
		"client_sync_id": "shift-order-1",
		"items": []map[string]interface{}{
			{
				"product_id": base.Banner.ID,
				"qty":        1,
				"unit_price": 1,
				"meta_data":  map[string]interface{}{"width": 1, "height": 1},
			},
		},
		"initial_payment": map[string]interface{}{
			"client_payment_id": "shift-pay-1",
			"payment_type":      "full",
			"payment_method":    "cash",
			"amount":            1,
		},
	}
	if status := client.Do(http.MethodPost, "/orders", orderBody, nil); status != http.StatusCreated {
		t.Fatalf("create cash order status = %d", status)
	}

	var closed struct {
		Data struct {
			Status         string  `json:"status"`
			ExpectedCash   float64 `json:"expected_cash"`
			CashDifference float64 `json:"cash_difference"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodPost, fmt.Sprintf("/cash-shifts/%d/close", shift.Data.ID), map[string]interface{}{
		"closing_cash": 125000,
	}, &closed); status != http.StatusOK {
		t.Fatalf("close shift status = %d", status)
	}
	if closed.Data.Status != "closed" {
		t.Fatalf("shift status = %q, want closed", closed.Data.Status)
	}
	if closed.Data.ExpectedCash != 125000 {
		t.Fatalf("expected cash = %v, want 125000", closed.Data.ExpectedCash)
	}
	if closed.Data.CashDifference != 0 {
		t.Fatalf("cash difference = %v, want 0", closed.Data.CashDifference)
	}

	if status := client.Do(http.MethodPost, fmt.Sprintf("/cash-shifts/%d/close", shift.Data.ID), map[string]interface{}{
		"closing_cash": 125000,
	}, nil); status != http.StatusBadRequest {
		t.Fatalf("double close status = %d, want 400", status)
	}

	var shift2 struct {
		Data struct {
			ID uint `json:"id"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodPost, "/cash-shifts/open", map[string]interface{}{
		"outlet_id":    base.Print.ID,
		"opening_cash": 100000,
	}, &shift2); status != http.StatusCreated {
		t.Fatalf("second open shift status = %d", status)
	}

	var closed2 struct {
		Data struct {
			ExpectedCash   float64 `json:"expected_cash"`
			CashDifference float64 `json:"cash_difference"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodPost, fmt.Sprintf("/cash-shifts/%d/close", shift2.Data.ID), map[string]interface{}{
		"closing_cash": 130000,
	}, &closed2); status != http.StatusOK {
		t.Fatalf("second close status = %d", status)
	}
	if closed2.Data.ExpectedCash != 100000 || closed2.Data.CashDifference != 30000 {
		t.Fatalf("second close expected/diff = %v/%v, want 100000/30000", closed2.Data.ExpectedCash, closed2.Data.CashDifference)
	}
}
