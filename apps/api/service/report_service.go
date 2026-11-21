package service

import (
	"api/dto"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type ReportService struct {
	db *gorm.DB
}

func NewReportService(db *gorm.DB) *ReportService {
	return &ReportService{db: db}
}

func (s *ReportService) Summary(allowedOutletIDs []uint, outletID uint, from, to string) (*dto.ReportSummary, error) {
	summary := &dto.ReportSummary{
		From:            from,
		To:              to,
		ByOutlet:        []dto.OutletReport{},
		ByPaymentMethod: []dto.PaymentMethodReport{},
		Daily:           []dto.DailyReport{},
	}
	if len(allowedOutletIDs) == 0 {
		return summary, nil
	}

	start, end, err := parseDateRange(from, to)
	if err != nil {
		return nil, err
	}

	type totalsRow struct {
		OrdersCount   int64
		Revenue       float64
		Paid          float64
		OfflineOrders int64
	}
	var totals totalsRow
	q := s.db.Table("orders").
		Select("COUNT(*) AS orders_count, COALESCE(SUM(total_amount),0) AS revenue, COALESCE(SUM(paid_amount),0) AS paid, COALESCE(SUM(CASE WHEN is_offline_created THEN 1 ELSE 0 END),0) AS offline_orders").
		Where("orders.deleted_at IS NULL")
	q = applyOrderScope(q, allowedOutletIDs, outletID, start, end)
	if err := q.Scan(&totals).Error; err != nil {
		return nil, err
	}
	summary.Totals = dto.ReportTotals{
		OrdersCount:   totals.OrdersCount,
		Revenue:       round2(totals.Revenue),
		PaidAmount:    round2(totals.Paid),
		Outstanding:   round2(totals.Revenue - totals.Paid),
		OfflineOrders: totals.OfflineOrders,
	}
	if totals.OrdersCount > 0 {
		summary.Totals.AverageOrderValue = round2(totals.Revenue / float64(totals.OrdersCount))
	}

	var byOutlet []dto.OutletReport
	q = s.db.Table("orders").
		Select("orders.outlet_id AS outlet_id, outlets.name AS outlet_name, COUNT(*) AS orders_count, COALESCE(SUM(orders.total_amount),0) AS revenue, COALESCE(SUM(orders.paid_amount),0) AS paid_amount, COALESCE(SUM(CASE WHEN orders.is_offline_created THEN 1 ELSE 0 END),0) AS offline_orders").
		Joins("JOIN outlets ON outlets.id = orders.outlet_id").
		Where("orders.deleted_at IS NULL AND outlets.deleted_at IS NULL").
		Group("orders.outlet_id, outlets.name").
		Order("revenue DESC")
	q = applyOrderScope(q, allowedOutletIDs, outletID, start, end)
	if err := q.Scan(&byOutlet).Error; err != nil {
		return nil, err
	}
	for i := range byOutlet {
		byOutlet[i].Revenue = round2(byOutlet[i].Revenue)
		byOutlet[i].PaidAmount = round2(byOutlet[i].PaidAmount)
		byOutlet[i].Outstanding = round2(byOutlet[i].Revenue - byOutlet[i].PaidAmount)
	}
	if byOutlet == nil {
		byOutlet = []dto.OutletReport{}
	}
	summary.ByOutlet = byOutlet

	sub := s.db.Table("orders").Select("orders.id").Where("orders.deleted_at IS NULL")
	sub = applyOrderScope(sub, allowedOutletIDs, outletID, start, end)

	var methods []dto.PaymentMethodReport
	if err := s.db.Table("order_payments").
		Select("payment_method, COALESCE(SUM(amount),0) AS amount, COUNT(*) AS count").
		Where("deleted_at IS NULL").
		Where("order_id IN (?)", sub).
		Group("payment_method").
		Order("amount DESC").
		Scan(&methods).Error; err != nil {
		return nil, err
	}
	for i := range methods {
		methods[i].Amount = round2(methods[i].Amount)
	}
	if methods == nil {
		methods = []dto.PaymentMethodReport{}
	}
	summary.ByPaymentMethod = methods

	var daily []dto.DailyReport
	q = s.db.Table("orders").
		Select("TO_CHAR(orders.created_at, 'YYYY-MM-DD') AS date, COUNT(*) AS orders_count, COALESCE(SUM(orders.total_amount),0) AS revenue").
		Where("orders.deleted_at IS NULL").
		Group("date").
		Order("date ASC")
	q = applyOrderScope(q, allowedOutletIDs, outletID, start, end)
	if err := q.Scan(&daily).Error; err != nil {
		return nil, err
	}
	for i := range daily {
		daily[i].Revenue = round2(daily[i].Revenue)
	}
	if daily == nil {
		daily = []dto.DailyReport{}
	}
	summary.Daily = daily

	return summary, nil
}

func (s *ReportService) Reconciliation(allowedOutletIDs []uint, outletID uint, from, to string) (*dto.ReconciliationReport, error) {
	report := &dto.ReconciliationReport{From: from, To: to, RecentOffline: []dto.SyncOrderSummary{}}
	if len(allowedOutletIDs) == 0 {
		return report, nil
	}

	start, end, err := parseDateRange(from, to)
	if err != nil {
		return nil, err
	}

	type reconRow struct {
		OfflineOrders  int64
		OnlineOrders   int64
		Synced         int64
		OfflineRevenue float64
	}
	var row reconRow
	q := s.db.Table("orders").
		Select("COALESCE(SUM(CASE WHEN is_offline_created THEN 1 ELSE 0 END),0) AS offline_orders, COALESCE(SUM(CASE WHEN is_offline_created THEN 0 ELSE 1 END),0) AS online_orders, COALESCE(SUM(CASE WHEN is_offline_created AND synced_at IS NOT NULL THEN 1 ELSE 0 END),0) AS synced, COALESCE(SUM(CASE WHEN is_offline_created THEN total_amount ELSE 0 END),0) AS offline_revenue").
		Where("orders.deleted_at IS NULL")
	q = applyOrderScope(q, allowedOutletIDs, outletID, start, end)
	if err := q.Scan(&row).Error; err != nil {
		return nil, err
	}
	report.OfflineOrders = row.OfflineOrders
	report.OnlineOrders = row.OnlineOrders
	report.SyncedOfflineOrders = row.Synced
	report.OfflineRevenue = round2(row.OfflineRevenue)

	type recentRow struct {
		ID              uint
		OrderNumber     string
		OutletID        uint
		OutletName      string
		ClientCreatedAt time.Time
		SyncedAt        *time.Time
		TotalAmount     float64
		PaymentStatus   string
	}
	var recent []recentRow
	q = s.db.Table("orders").
		Select("orders.id, orders.order_number, orders.outlet_id, outlets.name AS outlet_name, orders.client_created_at, orders.synced_at, orders.total_amount, orders.payment_status").
		Joins("JOIN outlets ON outlets.id = orders.outlet_id").
		Where("orders.deleted_at IS NULL AND outlets.deleted_at IS NULL AND orders.is_offline_created = ?", true).
		Order("orders.synced_at DESC NULLS LAST").
		Limit(20)
	q = applyOrderScope(q, allowedOutletIDs, outletID, start, end)
	if err := q.Scan(&recent).Error; err != nil {
		return nil, err
	}
	for _, item := range recent {
		report.RecentOffline = append(report.RecentOffline, dto.SyncOrderSummary{
			ID:              item.ID,
			OrderNumber:     item.OrderNumber,
			OutletID:        item.OutletID,
			OutletName:      item.OutletName,
			ClientCreatedAt: item.ClientCreatedAt,
			SyncedAt:        item.SyncedAt,
			TotalAmount:     round2(item.TotalAmount),
			PaymentStatus:   item.PaymentStatus,
		})
	}

	if report.RecentOffline == nil {
		report.RecentOffline = []dto.SyncOrderSummary{}
	}

	return report, nil
}

func (s *ReportService) Commissions(allowedOutletIDs []uint, outletID uint, from, to string) (*dto.CommissionReport, error) {
	report := &dto.CommissionReport{From: from, To: to, ByStaff: []dto.StaffCommissionReport{}}
	if len(allowedOutletIDs) == 0 {
		return report, nil
	}

	start, end, err := parseDateRange(from, to)
	if err != nil {
		return nil, err
	}

	type row struct {
		UserID           uint
		UserName         string
		OrdersCount      int64
		CommissionAmount float64
	}
	var rows []row
	q := s.db.Table("orders").
		Select("orders.cashier_user_id AS user_id, COALESCE(users.full_name, CONCAT('User #', orders.cashier_user_id)) AS user_name, COUNT(*) AS orders_count, COALESCE(SUM(orders.commission_amount),0) AS commission_amount").
		Joins("LEFT JOIN users ON users.id = orders.cashier_user_id").
		Where("orders.deleted_at IS NULL AND orders.commission_amount > 0").
		Group("orders.cashier_user_id, users.full_name").
		Order("commission_amount DESC")
	q = applyOrderScope(q, allowedOutletIDs, outletID, start, end)
	if err := q.Scan(&rows).Error; err != nil {
		return nil, err
	}

	total := 0.0
	for _, item := range rows {
		amount := round2(item.CommissionAmount)
		total += amount
		report.ByStaff = append(report.ByStaff, dto.StaffCommissionReport{
			UserID:           item.UserID,
			UserName:         item.UserName,
			OrdersCount:      item.OrdersCount,
			CommissionAmount: amount,
		})
	}
	report.Total = round2(total)

	return report, nil
}

func parseDateRange(from, to string) (time.Time, time.Time, error) {
	var start, end time.Time
	if from != "" {
		parsed, err := time.Parse("2006-01-02", from)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid from date")
		}
		start = parsed
	}
	if to != "" {
		parsed, err := time.Parse("2006-01-02", to)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid to date")
		}
		end = parsed.AddDate(0, 0, 1)
	}
	return start, end, nil
}

func applyOrderScope(q *gorm.DB, allowedOutletIDs []uint, outletID uint, start, end time.Time) *gorm.DB {
	q = q.Where("orders.outlet_id IN ?", allowedOutletIDs)
	if outletID > 0 {
		q = q.Where("orders.outlet_id = ?", outletID)
	}
	if !start.IsZero() {
		q = q.Where("orders.created_at >= ?", start)
	}
	if !end.IsZero() {
		q = q.Where("orders.created_at < ?", end)
	}
	return q
}
