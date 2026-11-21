package integration

import (
	"fmt"
	"net/http"
	"testing"

	"api/tests/fixtures"
	"api/tests/helpers"
)

func TestCustomerCRUDAndOrderLink(t *testing.T) {
	db := helpers.TestDB(t)
	base := fixtures.SeedBase(t, db)
	client := loginAdmin(t, db, base)

	var customer struct {
		Data struct {
			ID   uint   `json:"id"`
			Name string `json:"name"`
		} `json:"data"`
	}
	status := client.Do(http.MethodPost, "/customers", map[string]interface{}{
		"outlet_id": base.Print.ID,
		"name":      "Acme Corp",
		"phone":     "081200000009",
		"email":     "acme@example.com",
		"note":      "VIP",
	}, &customer)
	if status != http.StatusCreated {
		t.Fatalf("create customer status = %d", status)
	}
	if customer.Data.Name != "Acme Corp" {
		t.Fatalf("customer name = %q", customer.Data.Name)
	}

	var list struct {
		Data []map[string]any `json:"data"`
	}
	if status := client.Do(http.MethodGet, fmt.Sprintf("/customers?outlet_id=%d", base.Print.ID), nil, &list); status != http.StatusOK {
		t.Fatalf("list customers status = %d", status)
	}
	if len(list.Data) == 0 {
		t.Fatalf("customer list is empty")
	}

	var updated struct {
		Data struct {
			Note string `json:"note"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodPatch, fmt.Sprintf("/customers/%d", customer.Data.ID), map[string]interface{}{
		"note": "Updated note",
	}, &updated); status != http.StatusOK {
		t.Fatalf("update customer status = %d", status)
	}
	if updated.Data.Note != "Updated note" {
		t.Fatalf("customer note = %q", updated.Data.Note)
	}

	shiftID := openShift(t, client, base.Print.ID)
	var order struct {
		Data struct {
			CustomerID   uint   `json:"customer_id"`
			CustomerName string `json:"customer_name"`
		} `json:"data"`
	}
	orderBody := map[string]interface{}{
		"outlet_id":      base.Print.ID,
		"shift_id":       shiftID,
		"customer_id":    customer.Data.ID,
		"client_sync_id": "customer-order-1",
		"items": []map[string]interface{}{
			{
				"product_id": base.Banner.ID,
				"qty":        1,
				"unit_price": 1,
				"meta_data":  map[string]interface{}{"width": 1, "height": 1},
			},
		},
		"initial_payment": map[string]interface{}{
			"client_payment_id": "customer-order-pay-1",
			"payment_type":      "full",
			"payment_method":    "cash",
			"amount":            1,
		},
	}
	if status := client.Do(http.MethodPost, "/orders", orderBody, &order); status != http.StatusCreated {
		t.Fatalf("order with customer status = %d", status)
	}
	if order.Data.CustomerID != customer.Data.ID {
		t.Fatalf("order customer id = %d, want %d", order.Data.CustomerID, customer.Data.ID)
	}
	if order.Data.CustomerName != "Acme Corp" {
		t.Fatalf("order customer name = %q, want Acme Corp", order.Data.CustomerName)
	}

	var history struct {
		Data []map[string]any `json:"data"`
	}
	if status := client.Do(http.MethodGet, fmt.Sprintf("/orders?outlet_id=%d&customer_id=%d", base.Print.ID, customer.Data.ID), nil, &history); status != http.StatusOK {
		t.Fatalf("customer history status = %d", status)
	}
	if len(history.Data) != 1 {
		t.Fatalf("customer history len = %d, want 1", len(history.Data))
	}

	// Customer must belong to the order outlet.
	crossOutlet := map[string]interface{}{
		"outlet_id":      base.Retail.ID,
		"customer_id":    customer.Data.ID,
		"client_sync_id": "customer-order-cross",
		"items": []map[string]interface{}{
			{"product_id": base.Kaos.ID, "qty": 1, "unit_price": 1},
		},
		"initial_payment": map[string]interface{}{
			"client_payment_id": "customer-order-cross-pay",
			"payment_type":      "full",
			"payment_method":    "cash",
			"amount":            1,
		},
	}
	if status := client.Do(http.MethodPost, "/orders", crossOutlet, nil); status != http.StatusBadRequest {
		t.Fatalf("cross-outlet customer status = %d, want 400", status)
	}

	if status := client.Do(http.MethodDelete, fmt.Sprintf("/customers/%d", customer.Data.ID), nil, nil); status != http.StatusOK {
		t.Fatalf("delete customer status = %d", status)
	}
}

func TestReceiptSettings(t *testing.T) {
	db := helpers.TestDB(t)
	base := fixtures.SeedBase(t, db)
	client := loginAdmin(t, db, base)

	var defaults struct {
		Data struct {
			PaperSize    string `json:"paper_size"`
			ShowCustomer bool   `json:"show_customer"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodGet, fmt.Sprintf("/outlets/%d/receipt-settings", base.Print.ID), nil, &defaults); status != http.StatusOK {
		t.Fatalf("get receipt settings status = %d", status)
	}
	if defaults.Data.PaperSize != "58mm" || !defaults.Data.ShowCustomer {
		t.Fatalf("unexpected defaults: %+v", defaults.Data)
	}

	var updated struct {
		Data struct {
			Header      string `json:"header"`
			PaperSize   string `json:"paper_size"`
			ShowCashier bool   `json:"show_cashier"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodPut, fmt.Sprintf("/outlets/%d/receipt-settings", base.Print.ID), map[string]interface{}{
		"header":       "Toko A",
		"footer":       "Thanks",
		"paper_size":   "80mm",
		"show_cashier": false,
	}, &updated); status != http.StatusOK {
		t.Fatalf("update receipt settings status = %d", status)
	}
	if updated.Data.Header != "Toko A" || updated.Data.PaperSize != "80mm" || updated.Data.ShowCashier {
		t.Fatalf("unexpected updated settings: %+v", updated.Data)
	}

	// Cashier cannot change receipt settings.
	cashier := helpers.NewClient(t, db)
	if status := cashier.Do(http.MethodPost, "/users/register", map[string]string{
		"full_name": "Receipt Cashier",
		"username":  "receiptcashier",
		"email":     "receiptcashier@example.com",
		"password":  "secret123",
		"phone":     "0800000010",
		"address":   "Jl. C",
	}, nil); status != http.StatusCreated {
		t.Fatalf("register cashier status = %d", status)
	}
	cashier.Login("receiptcashier@example.com", "secret123")

	var profile struct {
		Data struct {
			ID uint `json:"id"`
		} `json:"data"`
	}
	cashier.Do(http.MethodGet, "/users", nil, &profile)

	if status := client.Do(http.MethodPost, fmt.Sprintf("/outlets/%d/members", base.Print.ID), map[string]interface{}{
		"user_id":     profile.Data.ID,
		"outlet_role": "cashier",
	}, nil); status != http.StatusCreated {
		t.Fatalf("assign cashier status = %d", status)
	}

	if status := cashier.Do(http.MethodPut, fmt.Sprintf("/outlets/%d/receipt-settings", base.Print.ID), map[string]interface{}{
		"header": "Illegal",
	}, nil); status != http.StatusForbidden {
		t.Fatalf("cashier update receipt settings status = %d, want 403", status)
	}
}
