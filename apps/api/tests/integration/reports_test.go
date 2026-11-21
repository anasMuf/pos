package integration

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"api/tests/fixtures"
	"api/tests/helpers"
)

func TestReportsEmptyCollectionsAreNotNull(t *testing.T) {
	db := helpers.TestDB(t)
	base := fixtures.SeedBase(t, db)
	client := loginAdmin(t, db, base)
	future := time.Now().AddDate(0, 0, 5).Format("2006-01-02")
	url := fmt.Sprintf("/reports/summary?from=%s&to=%s", future, future)

	var raw struct {
		Data struct {
			ByOutlet        json.RawMessage `json:"by_outlet"`
			ByPaymentMethod json.RawMessage `json:"by_payment_method"`
			Daily           json.RawMessage `json:"daily"`
		} `json:"data"`
	}
	if status := client.Do(http.MethodGet, url, nil, &raw); status != http.StatusOK {
		t.Fatalf("summary status = %d", status)
	}
	if string(raw.Data.ByOutlet) != "[]" {
		t.Fatalf("by_outlet = %s, want []", raw.Data.ByOutlet)
	}
	if string(raw.Data.ByPaymentMethod) != "[]" {
		t.Fatalf("by_payment_method = %s, want []", raw.Data.ByPaymentMethod)
	}
	if string(raw.Data.Daily) != "[]" {
		t.Fatalf("daily = %s, want []", raw.Data.Daily)
	}

	var recon struct {
		Data struct {
			RecentOffline json.RawMessage `json:"recent_offline"`
		} `json:"data"`
	}
	reconURL := fmt.Sprintf("/reports/reconciliation?from=%s&to=%s", future, future)
	if status := client.Do(http.MethodGet, reconURL, nil, &recon); status != http.StatusOK {
		t.Fatalf("reconciliation status = %d", status)
	}
	if string(recon.Data.RecentOffline) != "[]" {
		t.Fatalf("recent_offline = %s, want []", recon.Data.RecentOffline)
	}
}

func TestReportsSummaryAndReconciliation(t *testing.T) {
	db := helpers.TestDB(t)
	base := fixtures.SeedBase(t, db)
	client := loginAdmin(t, db, base)

	printOrder := map[string]interface{}{
		"outlet_id":      base.Print.ID,
		"client_sync_id": "report-online-1",
		"items": []map[string]interface{}{
			{
				"product_id": base.Banner.ID,
				"qty":        1,
				"unit_price": 1,
				"meta_data":  map[string]interface{}{"width": 1, "height": 1},
			},
		},
		"initial_payment": map[string]interface{}{
			"client_payment_id": "report-online-pay-1",
			"payment_type":      "full",
			"payment_method":    "cash",
			"amount":            1,
		},
	}
	if status := client.Do(http.MethodPost, "/orders", printOrder, nil); status != http.StatusCreated {
		t.Fatalf("online print order status = %d", status)
	}

	batch := map[string]interface{}{
		"outlet_id": base.Print.ID,
		"orders": []map[string]interface{}{
			{
				"client_sync_id": "report-offline-1",
				"customer_name":  "Offline Customer",
				"items": []map[string]interface{}{
					{
						"product_id": base.Banner.ID,
						"qty":        1,
						"unit_price": 1,
						"meta_data":  map[string]interface{}{"width": 1, "height": 1},
					},
				},
				"payments": []map[string]interface{}{
					{
						"client_payment_id": "report-offline-pay-1",
						"payment_type":      "full",
						"payment_method":    "cash",
						"amount":            1,
					},
				},
			},
		},
	}
	if status := client.Do(http.MethodPost, "/sync/orders", batch, nil); status != http.StatusOK {
		t.Fatalf("offline sync status = %d", status)
	}

	retailOrder := map[string]interface{}{
		"outlet_id":      base.Retail.ID,
		"client_sync_id": "report-retail-1",
		"items": []map[string]interface{}{
			{"product_id": base.Kaos.ID, "qty": 1, "unit_price": 1},
		},
		"initial_payment": map[string]interface{}{
			"client_payment_id": "report-retail-pay-1",
			"payment_type":      "full",
			"payment_method":    "cash",
			"amount":            1,
		},
	}
	if status := client.Do(http.MethodPost, "/orders", retailOrder, nil); status != http.StatusCreated {
		t.Fatalf("retail order status = %d", status)
	}

	today := time.Now().Format("2006-01-02")

	var summary struct {
		Data struct {
			Totals struct {
				OrdersCount       int64   `json:"orders_count"`
				Revenue           float64 `json:"revenue"`
				PaidAmount        float64 `json:"paid_amount"`
				Outstanding       float64 `json:"outstanding"`
				OfflineOrders     int64   `json:"offline_orders"`
				AverageOrderValue float64 `json:"average_order_value"`
			} `json:"totals"`
			ByOutlet []struct {
				OutletID    uint    `json:"outlet_id"`
				OrdersCount int64   `json:"orders_count"`
				Revenue     float64 `json:"revenue"`
			} `json:"by_outlet"`
			ByPaymentMethod []struct {
				PaymentMethod string  `json:"payment_method"`
				Amount        float64 `json:"amount"`
				Count         int64   `json:"count"`
			} `json:"by_payment_method"`
			Daily []struct {
				Date        string  `json:"date"`
				OrdersCount int64   `json:"orders_count"`
				Revenue     float64 `json:"revenue"`
			} `json:"daily"`
		} `json:"data"`
	}
	summaryURL := fmt.Sprintf("/reports/summary?from=%s&to=%s", today, today)
	if status := client.Do(http.MethodGet, summaryURL, nil, &summary); status != http.StatusOK {
		t.Fatalf("report summary status = %d", status)
	}
	if summary.Data.Totals.OrdersCount != 3 {
		t.Fatalf("orders count = %d, want 3", summary.Data.Totals.OrdersCount)
	}
	if summary.Data.Totals.Revenue != 95000 || summary.Data.Totals.PaidAmount != 95000 {
		t.Fatalf("revenue/paid = %v/%v, want 95000/95000", summary.Data.Totals.Revenue, summary.Data.Totals.PaidAmount)
	}
	if summary.Data.Totals.Outstanding != 0 || summary.Data.Totals.OfflineOrders != 1 {
		t.Fatalf("outstanding/offline = %v/%v, want 0/1", summary.Data.Totals.Outstanding, summary.Data.Totals.OfflineOrders)
	}
	if summary.Data.Totals.AverageOrderValue != 31666.67 {
		t.Fatalf("average order value = %v, want 31666.67", summary.Data.Totals.AverageOrderValue)
	}
	if len(summary.Data.ByOutlet) != 2 {
		t.Fatalf("by outlet len = %d, want 2", len(summary.Data.ByOutlet))
	}
	if len(summary.Data.ByPaymentMethod) != 1 ||
		summary.Data.ByPaymentMethod[0].Amount != 95000 ||
		summary.Data.ByPaymentMethod[0].Count != 3 {
		t.Fatalf("unexpected payment methods: %+v", summary.Data.ByPaymentMethod)
	}
	if len(summary.Data.Daily) != 1 || summary.Data.Daily[0].OrdersCount != 3 {
		t.Fatalf("unexpected daily report: %+v", summary.Data.Daily)
	}

	var recon struct {
		Data struct {
			OfflineOrders       int64   `json:"offline_orders"`
			OnlineOrders        int64   `json:"online_orders"`
			SyncedOfflineOrders int64   `json:"synced_offline_orders"`
			OfflineRevenue      float64 `json:"offline_revenue"`
			RecentOffline       []struct {
				OrderNumber string  `json:"order_number"`
				TotalAmount float64 `json:"total_amount"`
			} `json:"recent_offline"`
		} `json:"data"`
	}
	reconURL := fmt.Sprintf("/reports/reconciliation?from=%s&to=%s", today, today)
	if status := client.Do(http.MethodGet, reconURL, nil, &recon); status != http.StatusOK {
		t.Fatalf("reconciliation status = %d", status)
	}
	if recon.Data.OfflineOrders != 1 || recon.Data.OnlineOrders != 2 || recon.Data.SyncedOfflineOrders != 1 {
		t.Fatalf("reconciliation counts = %+v, want offline 1 / online 2 / synced 1", recon.Data)
	}
	if recon.Data.OfflineRevenue != 25000 {
		t.Fatalf("offline revenue = %v, want 25000", recon.Data.OfflineRevenue)
	}
	if len(recon.Data.RecentOffline) != 1 || recon.Data.RecentOffline[0].TotalAmount != 25000 {
		t.Fatalf("unexpected recent offline: %+v", recon.Data.RecentOffline)
	}

	// Date filter excludes today's orders.
	tomorrow := time.Now().AddDate(0, 0, 1).Format("2006-01-02")
	var empty struct {
		Data struct {
			Totals struct {
				OrdersCount int64 `json:"orders_count"`
			} `json:"totals"`
		} `json:"data"`
	}
	emptyURL := fmt.Sprintf("/reports/summary?from=%s&to=%s", tomorrow, tomorrow)
	if status := client.Do(http.MethodGet, emptyURL, nil, &empty); status != http.StatusOK {
		t.Fatalf("empty report status = %d", status)
	}
	if empty.Data.Totals.OrdersCount != 0 {
		t.Fatalf("future report orders = %d, want 0", empty.Data.Totals.OrdersCount)
	}
}

func TestReportsScoping(t *testing.T) {
	db := helpers.TestDB(t)
	base := fixtures.SeedBase(t, db)

	// User with no membership sees an empty report and cannot filter by outlet.
	userA := helpers.NewClient(t, db)
	if status := userA.Do(http.MethodPost, "/users/register", map[string]string{
		"full_name": "Report User",
		"username":  "reportuser",
		"email":     "reportuser@example.com",
		"password":  "secret123",
		"phone":     "0800000020",
		"address":   "Jl. R",
	}, nil); status != http.StatusCreated {
		t.Fatalf("register user status = %d", status)
	}
	userA.Login("reportuser@example.com", "secret123")

	var empty struct {
		Data struct {
			ByOutlet []map[string]any `json:"by_outlet"`
		} `json:"data"`
	}
	if status := userA.Do(http.MethodGet, "/reports/summary", nil, &empty); status != http.StatusOK {
		t.Fatalf("scoped report status = %d", status)
	}
	if len(empty.Data.ByOutlet) != 0 {
		t.Fatalf("scoped report by_outlet = %d, want 0", len(empty.Data.ByOutlet))
	}
	if status := userA.Do(http.MethodGet, fmt.Sprintf("/reports/summary?outlet_id=%d", base.Print.ID), nil, nil); status != http.StatusForbidden {
		t.Fatalf("outlet-filtered report status = %d, want 403", status)
	}

	// Cashier (not owner/manager) cannot see reports either.
	admin := loginAdmin(t, db, base)
	cashier := helpers.NewClient(t, db)
	if status := cashier.Do(http.MethodPost, "/users/register", map[string]string{
		"full_name": "Report Cashier",
		"username":  "reportcashier",
		"email":     "reportcashier@example.com",
		"password":  "secret123",
		"phone":     "0800000021",
		"address":   "Jl. RC",
	}, nil); status != http.StatusCreated {
		t.Fatalf("register cashier status = %d", status)
	}
	cashier.Login("reportcashier@example.com", "secret123")
	var profile struct {
		Data struct {
			ID uint `json:"id"`
		} `json:"data"`
	}
	cashier.Do(http.MethodGet, "/users", nil, &profile)
	if status := admin.Do(http.MethodPost, fmt.Sprintf("/outlets/%d/members", base.Print.ID), map[string]interface{}{
		"user_id":     profile.Data.ID,
		"outlet_role": "cashier",
	}, nil); status != http.StatusCreated {
		t.Fatalf("assign cashier status = %d", status)
	}
	if status := cashier.Do(http.MethodGet, fmt.Sprintf("/reports/summary?outlet_id=%d", base.Print.ID), nil, nil); status != http.StatusForbidden {
		t.Fatalf("cashier report status = %d, want 403", status)
	}
}
