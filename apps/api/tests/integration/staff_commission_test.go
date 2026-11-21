package integration

import (
	"fmt"
	"net/http"
	"testing"

	"api/tests/fixtures"
	"api/tests/helpers"
)

func TestStaffCommission(t *testing.T) {
	db := helpers.TestDB(t)
	base := fixtures.SeedBase(t, db)
	client := loginAdmin(t, db, base)

	// Enable the capability on the retail outlet.
	if status := client.Do(http.MethodPatch, fmt.Sprintf("/outlets/%d/capabilities", base.Retail.ID), map[string]interface{}{
		"capabilities": map[string]bool{
			"enable_variants":         true,
			"enable_tiered_pricing":   true,
			"enable_staff_commission": true,
		},
	}, nil); status != http.StatusOK {
		t.Fatalf("enable staff commission status = %d", status)
	}

	// 10% commission on the Kaos product.
	if status := client.Do(http.MethodPatch, fmt.Sprintf("/products/%d", base.Kaos.ID), map[string]interface{}{
		"commission_type":  "percent",
		"commission_value": 10,
	}, nil); status != http.StatusOK {
		t.Fatalf("set product commission status = %d", status)
	}

	var order struct {
		Data struct {
			ID               uint    `json:"id"`
			CommissionAmount float64 `json:"commission_amount"`
			TotalAmount      float64 `json:"total_amount"`
			Items            []struct {
				CommissionAmount float64 `json:"commission_amount"`
			} `json:"items"`
		} `json:"data"`
	}
	body := map[string]interface{}{
		"outlet_id":      base.Retail.ID,
		"client_sync_id": "commission-order-1",
		"items": []map[string]interface{}{
			{"product_id": base.Kaos.ID, "qty": 2, "unit_price": 1},
		},
		"initial_payment": map[string]interface{}{
			"client_payment_id": "commission-pay-1",
			"payment_type":      "full",
			"payment_method":    "cash",
			"amount":            1,
		},
	}
	if status := client.Do(http.MethodPost, "/orders", body, &order); status != http.StatusCreated {
		t.Fatalf("create order status = %d", status)
	}

	// Tiered qty 2 x 45000 = 90000 subtotal; 10% commission = 9000.
	if order.Data.TotalAmount != 90000 {
		t.Fatalf("total = %v, want 90000", order.Data.TotalAmount)
	}
	if order.Data.CommissionAmount != 9000 {
		t.Fatalf("order commission = %v, want 9000", order.Data.CommissionAmount)
	}
	if len(order.Data.Items) != 1 || order.Data.Items[0].CommissionAmount != 9000 {
		t.Fatalf("item commission = %+v, want 9000", order.Data.Items)
	}

	var report struct {
		Data struct {
			Total   float64 `json:"total"`
			ByStaff []struct {
				UserID           uint    `json:"user_id"`
				OrdersCount      int64   `json:"orders_count"`
				CommissionAmount float64 `json:"commission_amount"`
			} `json:"by_staff"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodGet, "/reports/commissions", nil, &report); status != http.StatusOK {
		t.Fatalf("commission report status = %d", status)
	}
	if report.Data.Total != 9000 {
		t.Fatalf("report total = %v, want 9000", report.Data.Total)
	}
	if len(report.Data.ByStaff) != 1 {
		t.Fatalf("by_staff rows = %d, want 1", len(report.Data.ByStaff))
	}
	if report.Data.ByStaff[0].UserID != base.Admin.ID {
		t.Fatalf("commission attributed to user %d, want %d", report.Data.ByStaff[0].UserID, base.Admin.ID)
	}
	if report.Data.ByStaff[0].OrdersCount != 1 || report.Data.ByStaff[0].CommissionAmount != 9000 {
		t.Fatalf("by_staff = %+v", report.Data.ByStaff[0])
	}
}

func TestStaffCommissionDisabled(t *testing.T) {
	db := helpers.TestDB(t)
	base := fixtures.SeedBase(t, db)
	client := loginAdmin(t, db, base)

	// Set commission on the product but leave the outlet capability disabled.
	if status := client.Do(http.MethodPatch, fmt.Sprintf("/products/%d", base.Kaos.ID), map[string]interface{}{
		"commission_type":  "fixed",
		"commission_value": 5000,
	}, nil); status != http.StatusOK {
		t.Fatalf("set product commission status = %d", status)
	}

	var order struct {
		Data struct {
			CommissionAmount float64 `json:"commission_amount"`
		} `json:"data"`
	}
	body := map[string]interface{}{
		"outlet_id":      base.Retail.ID,
		"client_sync_id": "commission-disabled-1",
		"items": []map[string]interface{}{
			{"product_id": base.Kaos.ID, "qty": 1, "unit_price": 1},
		},
		"initial_payment": map[string]interface{}{
			"client_payment_id": "commission-disabled-pay",
			"payment_type":      "full",
			"payment_method":    "cash",
			"amount":            1,
		},
	}
	if status := client.Do(http.MethodPost, "/orders", body, &order); status != http.StatusCreated {
		t.Fatalf("create order status = %d", status)
	}
	if order.Data.CommissionAmount != 0 {
		t.Fatalf("commission = %v, want 0 when capability disabled", order.Data.CommissionAmount)
	}
}
