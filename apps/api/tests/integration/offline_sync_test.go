package integration

import (
	"fmt"
	"net/http"
	"testing"

	"api/tests/fixtures"
	"api/tests/helpers"
)

func TestOfflineSyncIsIdempotent(t *testing.T) {
	db := helpers.TestDB(t)
	base := fixtures.SeedBase(t, db)
	client := loginAdmin(t, db, base)

	batch := map[string]interface{}{
		"outlet_id": base.Print.ID,
		"orders": []map[string]interface{}{
			{
				"client_sync_id": "offline-order-1",
				"customer_name":  "Offline Customer",
				"order_status":   "completed",
				"items": []map[string]interface{}{
					{
						"product_id": base.Banner.ID,
						"qty":        1,
						"unit_price": 1,
						"meta_data": map[string]interface{}{
							"width":     4,
							"height":    1,
							"modifiers": []string{"Mata Ayam"},
						},
					},
				},
				"payments": []map[string]interface{}{
					{
						"client_payment_id": "offline-payment-1",
						"payment_type":      "full",
						"payment_method":    "cash",
						"amount":            1,
					},
				},
			},
		},
	}

	var first struct {
		Data struct {
			SyncedCount    int `json:"synced_count"`
			DuplicateCount int `json:"duplicate_count"`
			Orders         []struct {
				TotalAmount   float64 `json:"total_amount"`
				PaymentStatus string  `json:"payment_status"`
			} `json:"orders"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodPost, "/sync/orders", batch, &first); status != http.StatusOK {
		t.Fatalf("first sync status = %d, want 200", status)
	}
	if first.Data.SyncedCount != 1 || first.Data.DuplicateCount != 0 {
		t.Fatalf("first sync counts = synced:%d duplicate:%d, want 1/0", first.Data.SyncedCount, first.Data.DuplicateCount)
	}
	if len(first.Data.Orders) != 1 || first.Data.Orders[0].TotalAmount != 102000 {
		t.Fatalf("synced order total not computed server-side: %+v", first.Data.Orders)
	}
	if first.Data.Orders[0].PaymentStatus != "paid" {
		t.Fatalf("synced order payment status = %q, want paid", first.Data.Orders[0].PaymentStatus)
	}

	var second struct {
		Data struct {
			SyncedCount    int `json:"synced_count"`
			DuplicateCount int `json:"duplicate_count"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodPost, "/sync/orders", batch, &second); status != http.StatusOK {
		t.Fatalf("second sync status = %d, want 200", status)
	}
	if second.Data.SyncedCount != 0 || second.Data.DuplicateCount != 1 {
		t.Fatalf("second sync counts = synced:%d duplicate:%d, want 0/1", second.Data.SyncedCount, second.Data.DuplicateCount)
	}

	var product struct {
		Data struct {
			StockQty float64 `json:"stock_qty"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodGet, fmt.Sprintf("/products/%d", base.Banner.ID), nil, &product); status != http.StatusOK {
		t.Fatalf("get product status = %d", status)
	}
	if product.Data.StockQty != 99 {
		t.Fatalf("stock after sync = %v, want 99 (deducted exactly once)", product.Data.StockQty)
	}
}
