package integration

import (
	"fmt"
	"net/http"
	"testing"

	"api/tests/fixtures"
	"api/tests/helpers"
)

func TestPaymentsSettlementBounds(t *testing.T) {
	db := helpers.TestDB(t)
	base := fixtures.SeedBase(t, db)
	client := loginAdmin(t, db, base)
	shiftID := openShift(t, client, base.Print.ID)

	var order struct {
		Data struct {
			ID            uint    `json:"id"`
			TotalAmount   float64 `json:"total_amount"`
			PaidAmount    float64 `json:"paid_amount"`
			PaymentStatus string  `json:"payment_status"`
		} `json:"data"`
	}
	body := map[string]interface{}{
		"outlet_id":      base.Print.ID,
		"shift_id":       shiftID,
		"client_sync_id": "payments-order-1",
		"items": []map[string]interface{}{
			{
				"product_id": base.Banner.ID,
				"qty":        1,
				"unit_price": 1,
				"meta_data":  map[string]interface{}{"width": 1, "height": 1},
			},
		},
		"initial_payment": map[string]interface{}{
			"client_payment_id": "payments-dp-1",
			"payment_type":      "down_payment",
			"payment_method":    "cash",
			"amount":            10000,
		},
	}
	if status := client.Do(http.MethodPost, "/orders", body, &order); status != http.StatusCreated {
		t.Fatalf("create DP order status = %d", status)
	}
	if order.Data.TotalAmount != 25000 || order.Data.PaidAmount != 10000 || order.Data.PaymentStatus != "partial" {
		t.Fatalf("unexpected DP order: %+v", order.Data)
	}

	settleTooMuch := map[string]interface{}{
		"shift_id":          shiftID,
		"client_payment_id": "payments-settle-a",
		"payment_type":      "settlement",
		"payment_method":    "cash",
		"amount":            999999,
	}
	if status := client.Do(http.MethodPost, fmt.Sprintf("/orders/%d/payments", order.Data.ID), settleTooMuch, nil); status != http.StatusBadRequest {
		t.Fatalf("settlement above remaining status = %d, want 400", status)
	}

	settleOK := map[string]interface{}{
		"shift_id":          shiftID,
		"client_payment_id": "payments-settle-b",
		"payment_type":      "settlement",
		"payment_method":    "cash",
		"amount":            15000,
	}
	var paid struct {
		Data struct {
			PaidAmount    float64 `json:"paid_amount"`
			PaymentStatus string  `json:"payment_status"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodPost, fmt.Sprintf("/orders/%d/payments", order.Data.ID), settleOK, &paid); status != http.StatusCreated {
		t.Fatalf("valid settlement status = %d, want 201", status)
	}
	if paid.Data.PaidAmount != 25000 || paid.Data.PaymentStatus != "paid" {
		t.Fatalf("after settlement: %+v, want paid 25000", paid.Data)
	}

	var idempotent struct {
		Data struct {
			PaidAmount float64 `json:"paid_amount"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodPost, fmt.Sprintf("/orders/%d/payments", order.Data.ID), settleOK, &idempotent); status != http.StatusCreated {
		t.Fatalf("idempotent settlement status = %d", status)
	}
	if idempotent.Data.PaidAmount != 25000 {
		t.Fatalf("idempotent payment changed paid amount: %v", idempotent.Data.PaidAmount)
	}

	extra := map[string]interface{}{
		"shift_id":          shiftID,
		"client_payment_id": "payments-settle-c",
		"payment_type":      "settlement",
		"payment_method":    "cash",
		"amount":            1,
	}
	if status := client.Do(http.MethodPost, fmt.Sprintf("/orders/%d/payments", order.Data.ID), extra, nil); status != http.StatusBadRequest {
		t.Fatalf("payment on fully paid order status = %d, want 400", status)
	}

	// DP is disabled on the retail outlet.
	retailDP := map[string]interface{}{
		"outlet_id":      base.Retail.ID,
		"client_sync_id": "payments-retail-dp",
		"items": []map[string]interface{}{
			{"product_id": base.Kaos.ID, "qty": 1, "unit_price": 1},
		},
		"initial_payment": map[string]interface{}{
			"client_payment_id": "payments-retail-dp-1",
			"payment_type":      "down_payment",
			"payment_method":    "cash",
			"amount":            1000,
		},
	}
	if status := client.Do(http.MethodPost, "/orders", retailDP, nil); status != http.StatusBadRequest {
		t.Fatalf("retail DP status = %d, want 400 (capability disabled)", status)
	}
}
