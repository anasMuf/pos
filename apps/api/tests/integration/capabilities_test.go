package integration

import (
	"fmt"
	"net/http"
	"testing"

	"api/tests/fixtures"
	"api/tests/helpers"
)

func TestCapabilityRegistry(t *testing.T) {
	db := helpers.TestDB(t)
	base := fixtures.SeedBase(t, db)
	client := loginAdmin(t, db, base)

	var registry struct {
		Data []struct {
			Key     string `json:"key"`
			Label   string `json:"label"`
			Default bool   `json:"default"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodGet, "/capabilities", nil, &registry); status != http.StatusOK {
		t.Fatalf("capability registry status = %d", status)
	}
	if len(registry.Data) != 7 {
		t.Fatalf("registry has %d entries, want 7", len(registry.Data))
	}

	keys := map[string]bool{}
	for _, entry := range registry.Data {
		if entry.Label == "" {
			t.Fatalf("capability %q has no label", entry.Key)
		}
		keys[entry.Key] = true
	}
	for _, expected := range []string{
		"enable_variants",
		"enable_modifiers",
		"enable_dimension_pricing",
		"enable_tiered_pricing",
		"enable_order_workflow",
		"enable_partial_payment",
		"enable_staff_commission",
	} {
		if !keys[expected] {
			t.Fatalf("registry missing %q", expected)
		}
	}
}

func TestCapabilityEnforcement(t *testing.T) {
	db := helpers.TestDB(t)
	base := fixtures.SeedBase(t, db)
	client := loginAdmin(t, db, base)
	retailShift := openShift(t, client, base.Retail.ID)

	// Modifiers are disabled on the retail outlet.
	modifierOrder := map[string]interface{}{
		"outlet_id":      base.Retail.ID,
		"shift_id":       retailShift,
		"client_sync_id": "cap-modifier",
		"items": []map[string]interface{}{
			{
				"product_id": base.Kaos.ID,
				"qty":        1,
				"unit_price": 1,
				"meta_data":  map[string]interface{}{"modifiers": []string{"Extra"}},
			},
		},
		"initial_payment": map[string]interface{}{
			"client_payment_id": "cap-modifier-pay",
			"payment_type":      "full",
			"payment_method":    "cash",
			"amount":            1,
		},
	}
	if status := client.Do(http.MethodPost, "/orders", modifierOrder, nil); status != http.StatusBadRequest {
		t.Fatalf("modifier on retail status = %d, want 400", status)
	}

	// Partial payment is disabled on the retail outlet.
	dpOrder := map[string]interface{}{
		"outlet_id":      base.Retail.ID,
		"shift_id":       retailShift,
		"client_sync_id": "cap-dp",
		"items": []map[string]interface{}{
			{"product_id": base.Kaos.ID, "qty": 1, "unit_price": 1},
		},
		"initial_payment": map[string]interface{}{
			"client_payment_id": "cap-dp-pay",
			"payment_type":      "down_payment",
			"payment_method":    "cash",
			"amount":            1000,
		},
	}
	if status := client.Do(http.MethodPost, "/orders", dpOrder, nil); status != http.StatusBadRequest {
		t.Fatalf("DP on retail status = %d, want 400", status)
	}

	// A valid retail order can be created, but workflow transitions are disabled.
	var retailOrder struct {
		Data struct {
			ID uint `json:"id"`
		} `json:"data"`
	}
	validRetail := map[string]interface{}{
		"outlet_id":      base.Retail.ID,
		"shift_id":       retailShift,
		"client_sync_id": "cap-retail-valid",
		"items": []map[string]interface{}{
			{"product_id": base.Kaos.ID, "qty": 1, "unit_price": 1},
		},
		"initial_payment": map[string]interface{}{
			"client_payment_id": "cap-retail-valid-pay",
			"payment_type":      "full",
			"payment_method":    "cash",
			"amount":            1,
		},
	}
	if status := client.Do(http.MethodPost, "/orders", validRetail, &retailOrder); status != http.StatusCreated {
		t.Fatalf("valid retail order status = %d", status)
	}
	if status := client.Do(http.MethodPatch, fmt.Sprintf("/orders/%d/status", retailOrder.Data.ID), map[string]interface{}{
		"order_status": "in_progress",
	}, nil); status != http.StatusBadRequest {
		t.Fatalf("workflow on retail status = %d, want 400", status)
	}

	// The print outlet enables everything.
	printShift := openShift(t, client, base.Print.ID)
	var printOrder struct {
		Data struct {
			ID            uint   `json:"id"`
			OrderStatus   string `json:"order_status"`
			PaymentStatus string `json:"payment_status"`
		} `json:"data"`
	}
	printBody := map[string]interface{}{
		"outlet_id":      base.Print.ID,
		"shift_id":       printShift,
		"client_sync_id": "cap-print-valid",
		"order_status":   "in_progress",
		"items": []map[string]interface{}{
			{
				"product_id": base.Banner.ID,
				"qty":        1,
				"unit_price": 1,
				"meta_data": map[string]interface{}{
					"width":     2,
					"height":    1,
					"modifiers": []string{"Mata Ayam"},
				},
			},
		},
		"initial_payment": map[string]interface{}{
			"client_payment_id": "cap-print-pay",
			"payment_type":      "down_payment",
			"payment_method":    "cash",
			"amount":            10000,
		},
	}
	if status := client.Do(http.MethodPost, "/orders", printBody, &printOrder); status != http.StatusCreated {
		t.Fatalf("print order status = %d", status)
	}
	if printOrder.Data.OrderStatus != "in_progress" || printOrder.Data.PaymentStatus != "partial" {
		t.Fatalf("print order = %+v, want in_progress/partial", printOrder.Data)
	}
	if status := client.Do(http.MethodPatch, fmt.Sprintf("/orders/%d/status", printOrder.Data.ID), map[string]interface{}{
		"order_status": "ready",
	}, nil); status != http.StatusOK {
		t.Fatalf("print workflow status = %d, want 200", status)
	}

	// Dimension pricing requires width/height.
	dimensionMissing := map[string]interface{}{
		"outlet_id":      base.Print.ID,
		"shift_id":       printShift,
		"client_sync_id": "cap-dimension-missing",
		"items": []map[string]interface{}{
			{"product_id": base.Banner.ID, "qty": 1, "unit_price": 1, "meta_data": map[string]interface{}{}},
		},
		"initial_payment": map[string]interface{}{
			"client_payment_id": "cap-dimension-missing-pay",
			"payment_type":      "full",
			"payment_method":    "cash",
			"amount":            1,
		},
	}
	if status := client.Do(http.MethodPost, "/orders", dimensionMissing, nil); status != http.StatusBadRequest {
		t.Fatalf("dimension without size status = %d, want 400", status)
	}
}
