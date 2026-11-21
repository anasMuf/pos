package integration

import (
	"fmt"
	"net/http"
	"testing"

	"api/tests/fixtures"
	"api/tests/helpers"
)

func TestStockDeductionAndMovements(t *testing.T) {
	db := helpers.TestDB(t)
	base := fixtures.SeedBase(t, db)
	client := loginAdmin(t, db, base)
	shiftID := openShift(t, client, base.Retail.ID)

	var variant struct {
		Data struct {
			ID uint `json:"id"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodPost, fmt.Sprintf("/products/%d/variants", base.Kaos.ID), map[string]interface{}{
		"name":      "L",
		"sku":       "KAOS-L",
		"stock_qty": 10,
	}, &variant); status != http.StatusCreated {
		t.Fatalf("create variant status = %d", status)
	}

	orderBody := map[string]interface{}{
		"outlet_id":      base.Retail.ID,
		"shift_id":       shiftID,
		"client_sync_id": "inventory-order-1",
		"items": []map[string]interface{}{
			{
				"product_id": base.Kaos.ID,
				"variant_id": variant.Data.ID,
				"qty":        3,
				"unit_price": 1,
			},
		},
		"initial_payment": map[string]interface{}{
			"client_payment_id": "inventory-pay-1",
			"payment_type":      "full",
			"payment_method":    "cash",
			"amount":            1,
		},
	}
	var order struct {
		Data struct {
			TotalAmount float64 `json:"total_amount"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodPost, "/orders", orderBody, &order); status != http.StatusCreated {
		t.Fatalf("create variant order status = %d", status)
	}
	if order.Data.TotalAmount != 135000 {
		t.Fatalf("order total = %v, want 135000", order.Data.TotalAmount)
	}

	var product struct {
		Data struct {
			StockQty float64 `json:"stock_qty"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodGet, fmt.Sprintf("/products/%d", base.Kaos.ID), nil, &product); status != http.StatusOK {
		t.Fatalf("get product status = %d", status)
	}
	if product.Data.StockQty != 97 {
		t.Fatalf("product stock = %v, want 97", product.Data.StockQty)
	}

	var variants struct {
		Data []struct {
			ID       uint    `json:"id"`
			StockQty float64 `json:"stock_qty"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodGet, fmt.Sprintf("/products/%d/variants", base.Kaos.ID), nil, &variants); status != http.StatusOK {
		t.Fatalf("list variants status = %d", status)
	}
	found := false
	for _, item := range variants.Data {
		if item.ID == variant.Data.ID {
			found = true
			if item.StockQty != 7 {
				t.Fatalf("variant stock = %v, want 7", item.StockQty)
			}
		}
	}
	if !found {
		t.Fatalf("variant not found in list")
	}

	if status := client.Do(http.MethodPost, "/stock-movements", map[string]interface{}{
		"outlet_id":     base.Retail.ID,
		"product_id":    base.Kaos.ID,
		"movement_type": "stock_in",
		"qty_change":    5,
		"note":          "restock",
	}, nil); status != http.StatusCreated {
		t.Fatalf("stock_in status = %d", status)
	}

	if status := client.Do(http.MethodGet, fmt.Sprintf("/products/%d", base.Kaos.ID), nil, &product); status != http.StatusOK {
		t.Fatalf("get product after restock status = %d", status)
	}
	if product.Data.StockQty != 102 {
		t.Fatalf("product stock after restock = %v, want 102", product.Data.StockQty)
	}

	var movements struct {
		Data []struct {
			MovementType string `json:"movement_type"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodGet, fmt.Sprintf("/stock-movements?outlet_id=%d", base.Retail.ID), nil, &movements); status != http.StatusOK {
		t.Fatalf("list movements status = %d", status)
	}
	seen := map[string]bool{}
	for _, movement := range movements.Data {
		seen[movement.MovementType] = true
	}
	if !seen["sale"] || !seen["stock_in"] {
		t.Fatalf("movement history missing sale/stock_in: %+v", seen)
	}
}
