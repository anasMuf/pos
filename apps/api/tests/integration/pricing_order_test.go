package integration

import (
	"net/http"
	"testing"

	"api/tests/fixtures"
	"api/tests/helpers"
)

func TestDiscountAndTax(t *testing.T) {
	db := helpers.TestDB(t)
	base := fixtures.SeedBase(t, db)

	client := helpers.NewClient(t, db)
	client.Login(base.Admin.Email, "admin123")

	var order struct {
		Data struct {
			SubtotalAmount  float64 `json:"subtotal_amount"`
			DiscountAmount  float64 `json:"discount_amount"`
			TaxAmount       float64 `json:"tax_amount"`
			TotalAmount     float64 `json:"total_amount"`
			PaidAmount      float64 `json:"paid_amount"`
			PaymentStatus   string  `json:"payment_status"`
			DiscountPercent float64 `json:"discount_percent"`
			TaxPercent      float64 `json:"tax_percent"`
		} `json:"data"`
	}

	body := map[string]interface{}{
		"outlet_id":        base.Retail.ID,
		"client_sync_id":   "discount-tax-order",
		"discount_percent": 10,
		"discount_amount":  5000,
		"tax_percent":      11,
		"items": []map[string]interface{}{
			{"product_id": base.Kaos.ID, "qty": 1, "unit_price": 1},
		},
		"initial_payment": map[string]interface{}{
			"client_payment_id": "discount-tax-pay",
			"payment_type":      "full",
			"payment_method":    "cash",
			"amount":            39405,
		},
	}
	if status := client.Do(http.MethodPost, "/orders", body, &order); status != http.StatusCreated {
		t.Fatalf("create order status = %d", status)
	}

	// subtotal 45000 - (10% = 4500 + 5000) = 35500 taxable; tax 11% = 3905; total 39405.
	if order.Data.SubtotalAmount != 45000 {
		t.Fatalf("subtotal = %v, want 45000", order.Data.SubtotalAmount)
	}
	if order.Data.DiscountAmount != 9500 {
		t.Fatalf("discount = %v, want 9500", order.Data.DiscountAmount)
	}
	if order.Data.TaxAmount != 3905 {
		t.Fatalf("tax = %v, want 3905", order.Data.TaxAmount)
	}
	if order.Data.TotalAmount != 39405 {
		t.Fatalf("total = %v, want 39405", order.Data.TotalAmount)
	}
	if order.Data.PaidAmount != 39405 || order.Data.PaymentStatus != "paid" {
		t.Fatalf("payment = %v/%s, want 39405/paid", order.Data.PaidAmount, order.Data.PaymentStatus)
	}
}

func TestServerSidePricingAndPayments(t *testing.T) {
	db := helpers.TestDB(t)
	base := fixtures.SeedBase(t, db)

	client := helpers.NewClient(t, db)
	client.Login(base.Admin.Email, "admin123")

	var shift struct {
		Data struct {
			ID uint `json:"id"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodPost, "/cash-shifts/open", map[string]interface{}{
		"outlet_id":    base.Print.ID,
		"opening_cash": 0,
	}, &shift); status != http.StatusCreated {
		t.Fatalf("open shift status = %d", status)
	}

	orderBody := map[string]interface{}{
		"outlet_id":      base.Print.ID,
		"shift_id":       shift.Data.ID,
		"client_sync_id": "integration-order-1",
		"items": []map[string]interface{}{
			{
				"product_id": base.Banner.ID,
				"qty":        1,
				"unit_price": 1, // deliberately wrong; must be ignored
				"meta_data": map[string]interface{}{
					"width":     4,
					"height":    1,
					"modifiers": []string{"Mata Ayam"},
				},
			},
		},
		"initial_payment": map[string]interface{}{
			"client_payment_id": "integration-pay-1",
			"payment_type":      "full",
			"payment_method":    "cash",
			"amount":            1, // must be forced to total
		},
	}

	var order struct {
		Data struct {
			TotalAmount   float64 `json:"total_amount"`
			PaidAmount    float64 `json:"paid_amount"`
			PaymentStatus string  `json:"payment_status"`
			Items         []struct {
				UnitPrice float64 `json:"unit_price"`
				Subtotal  float64 `json:"subtotal"`
				MetaData  struct {
					Area float64 `json:"area"`
				} `json:"meta_data"`
			} `json:"items"`
		} `json:"data"`
	}

	if status := client.Do(http.MethodPost, "/orders", orderBody, &order); status != http.StatusCreated {
		t.Fatalf("create order status = %d", status)
	}
	if order.Data.TotalAmount != 102000 {
		t.Fatalf("total = %v, want 102000", order.Data.TotalAmount)
	}
	if len(order.Data.Items) != 1 || order.Data.Items[0].UnitPrice != 102000 {
		t.Fatalf("item unit price not recomputed: %+v", order.Data.Items)
	}
	if order.Data.Items[0].MetaData.Area != 4 {
		t.Fatalf("item area = %v, want 4", order.Data.Items[0].MetaData.Area)
	}
	if order.Data.PaidAmount != 102000 {
		t.Fatalf("paid = %v, want 102000 (full payment forced)", order.Data.PaidAmount)
	}
	if order.Data.PaymentStatus != "paid" {
		t.Fatalf("payment status = %q, want paid", order.Data.PaymentStatus)
	}

	dpOverTotal := map[string]interface{}{
		"outlet_id":      base.Print.ID,
		"client_sync_id": "integration-order-2",
		"items": []map[string]interface{}{
			{
				"product_id": base.Banner.ID,
				"qty":        1,
				"unit_price": 1,
				"meta_data":  map[string]interface{}{"width": 1, "height": 1},
			},
		},
		"initial_payment": map[string]interface{}{
			"client_payment_id": "integration-pay-2",
			"payment_type":      "down_payment",
			"payment_method":    "cash",
			"amount":            999999,
		},
	}
	if status := client.Do(http.MethodPost, "/orders", dpOverTotal, nil); status != http.StatusBadRequest {
		t.Fatalf("down payment above total status = %d, want 400", status)
	}
}
