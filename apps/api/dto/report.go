package dto

import "time"

type ReportTotals struct {
	OrdersCount       int64   `json:"orders_count"`
	Revenue           float64 `json:"revenue"`
	PaidAmount        float64 `json:"paid_amount"`
	Outstanding       float64 `json:"outstanding"`
	OfflineOrders     int64   `json:"offline_orders"`
	AverageOrderValue float64 `json:"average_order_value"`
}

type OutletReport struct {
	OutletID      uint    `json:"outlet_id"`
	OutletName    string  `json:"outlet_name"`
	OrdersCount   int64   `json:"orders_count"`
	Revenue       float64 `json:"revenue"`
	PaidAmount    float64 `json:"paid_amount"`
	Outstanding   float64 `json:"outstanding"`
	OfflineOrders int64   `json:"offline_orders"`
}

type PaymentMethodReport struct {
	PaymentMethod string  `json:"payment_method"`
	Amount        float64 `json:"amount"`
	Count         int64   `json:"count"`
}

type DailyReport struct {
	Date        string  `json:"date"`
	OrdersCount int64   `json:"orders_count"`
	Revenue     float64 `json:"revenue"`
}

type ReportSummary struct {
	From            string                `json:"from"`
	To              string                `json:"to"`
	Totals          ReportTotals          `json:"totals"`
	ByOutlet        []OutletReport        `json:"by_outlet"`
	ByPaymentMethod []PaymentMethodReport `json:"by_payment_method"`
	Daily           []DailyReport         `json:"daily"`
}

type SyncOrderSummary struct {
	ID              uint       `json:"id"`
	OrderNumber     string     `json:"order_number"`
	OutletID        uint       `json:"outlet_id"`
	OutletName      string     `json:"outlet_name"`
	ClientCreatedAt time.Time  `json:"client_created_at"`
	SyncedAt        *time.Time `json:"synced_at"`
	TotalAmount     float64    `json:"total_amount"`
	PaymentStatus   string     `json:"payment_status"`
}

type ReconciliationReport struct {
	From                string             `json:"from"`
	To                  string             `json:"to"`
	OfflineOrders       int64              `json:"offline_orders"`
	OnlineOrders        int64              `json:"online_orders"`
	SyncedOfflineOrders int64              `json:"synced_offline_orders"`
	OfflineRevenue      float64            `json:"offline_revenue"`
	RecentOffline       []SyncOrderSummary `json:"recent_offline"`
}

type StaffCommissionReport struct {
	UserID           uint    `json:"user_id"`
	UserName         string  `json:"user_name"`
	OrdersCount      int64   `json:"orders_count"`
	CommissionAmount float64 `json:"commission_amount"`
}

type CommissionReport struct {
	From    string                  `json:"from"`
	To      string                  `json:"to"`
	Total   float64                 `json:"total"`
	ByStaff []StaffCommissionReport `json:"by_staff"`
}
