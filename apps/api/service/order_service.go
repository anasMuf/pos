package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
)

type SyncResult struct {
	SyncedCount    int           `json:"synced_count"`
	DuplicateCount int           `json:"duplicate_count"`
	Orders         []model.Order `json:"orders"`
}

type OrderService struct {
	db          *gorm.DB
	repo        *repository.Repository[model.Order]
	productRepo *repository.Repository[model.Product]
	variantRepo *repository.Repository[model.ProductVariant]
}

func NewOrderService(
	db *gorm.DB,
	repo *repository.Repository[model.Order],
	productRepo *repository.Repository[model.Product],
	variantRepo *repository.Repository[model.ProductVariant],
) *OrderService {
	return &OrderService{db: db, repo: repo, productRepo: productRepo, variantRepo: variantRepo}
}

type paymentInput struct {
	ClientPaymentID string
	PaymentType     string
	PaymentMethod   string
	Amount          float64
	Note            string
	PaidAt          time.Time
}

type orderInput struct {
	OutletID        uint
	ShiftID         uint
	CustomerID      uint
	ClientSyncID    string
	CustomerName    string
	OrderStatus     string
	DiscountPercent float64
	DiscountAmount  float64
	TaxPercent      float64
	MetaData        model.JSON
	ClientCreatedAt time.Time
	IsOffline       bool
	Items           []dto.CreateOrderItemRequest
	Payments        []paymentInput
}

func (s *OrderService) List(page, limit int, outletID, customerID uint, orderStatus, paymentStatus, search string, allowedOutletIDs []uint) ([]model.Order, int64, error) {
	page, limit = normalizePagination(page, limit)
	if len(allowedOutletIDs) == 0 {
		return []model.Order{}, 0, nil
	}
	q := s.repo.Query().Where("outlet_id IN ?", allowedOutletIDs)
	if outletID > 0 {
		q = q.Where("outlet_id = ?", outletID)
	}
	if customerID > 0 {
		q = q.Where("customer_id = ?", customerID)
	}
	if orderStatus != "" {
		q = q.Where("order_status = ?", orderStatus)
	}
	if paymentStatus != "" {
		q = q.Where("payment_status = ?", paymentStatus)
	}
	if search != "" {
		like := "%" + search + "%"
		q = q.Where("customer_name ILIKE ? OR order_number ILIKE ?", like, like)
	}

	var total int64
	if err := q.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var orders []model.Order
	offset := (page - 1) * limit
	if err := q.Preload("Items").Preload("Payments").
		Order("id DESC").Offset(offset).Limit(limit).Find(&orders).Error; err != nil {
		return nil, 0, err
	}
	return orders, total, nil
}

func (s *OrderService) Get(id uint) (*model.Order, error) {
	var order model.Order
	if err := s.db.Preload("Items").Preload("Payments").First(&order, id).Error; err != nil {
		return nil, err
	}
	return &order, nil
}

func (s *OrderService) Create(req dto.CreateOrderRequest, userID uint) (*model.Order, error) {
	var existing model.Order
	if err := s.db.Preload("Items").Preload("Payments").
		Where("client_sync_id = ?", req.ClientSyncID).First(&existing).Error; err == nil {
		return &existing, nil
	}

	in := orderInput{
		OutletID:        req.OutletID,
		ShiftID:         req.ShiftID,
		CustomerID:      req.CustomerID,
		ClientSyncID:    req.ClientSyncID,
		CustomerName:    req.CustomerName,
		OrderStatus:     req.OrderStatus,
		DiscountPercent: req.DiscountPercent,
		DiscountAmount:  req.DiscountAmount,
		TaxPercent:      req.TaxPercent,
		MetaData:        req.MetaData,
		ClientCreatedAt: time.Now(),
		Items:           req.Items,
	}
	if req.InitialPayment != nil {
		in.Payments = []paymentInput{{
			ClientPaymentID: req.InitialPayment.ClientPaymentID,
			PaymentType:     req.InitialPayment.PaymentType,
			PaymentMethod:   req.InitialPayment.PaymentMethod,
			Amount:          req.InitialPayment.Amount,
			Note:            req.InitialPayment.Note,
			PaidAt:          time.Now(),
		}}
	}

	var created *model.Order
	err := s.db.Transaction(func(tx *gorm.DB) error {
		order, err := createOrderTx(tx, in, userID)
		if err != nil {
			return err
		}
		created = order
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.Get(created.ID)
}

func (s *OrderService) UpdateStatus(id uint, status string) (*model.Order, error) {
	order, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}

	var outlet model.Outlet
	if err := s.db.First(&outlet, order.OutletID).Error; err != nil {
		return nil, err
	}
	if status != "completed" && status != "cancelled" && !outlet.Capabilities.EnableOrderWorkflow {
		return nil, errors.New("order workflow capability is disabled for this outlet")
	}

	order.OrderStatus = status
	if err := s.repo.Save(order); err != nil {
		return nil, err
	}
	return s.Get(id)
}

func (s *OrderService) AddPayment(id uint, req dto.AddOrderPaymentRequest, userID uint) (*model.Order, error) {
	var existing model.OrderPayment
	if err := s.db.Where("client_payment_id = ?", req.ClientPaymentID).First(&existing).Error; err == nil {
		return s.Get(id)
	}

	order, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}

	var outlet model.Outlet
	if err := s.db.First(&outlet, order.OutletID).Error; err != nil {
		return nil, err
	}
	if req.PaymentType != "full" && !outlet.Capabilities.EnablePartialPayment {
		return nil, errors.New("partial payment capability is disabled for this outlet")
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		amount, err := normalizePaymentAmount(order.TotalAmount, order.PaidAmount, paymentInput{
			PaymentType: req.PaymentType,
			Amount:      req.Amount,
		}, true)
		if err != nil {
			return err
		}

		payment := &model.OrderPayment{
			OrderID:          order.ID,
			ShiftID:          req.ShiftID,
			ReceivedByUserID: userID,
			ClientPaymentID:  req.ClientPaymentID,
			PaymentType:      req.PaymentType,
			PaymentMethod:    req.PaymentMethod,
			Amount:           amount,
			PaidAt:           time.Now(),
			Note:             req.Note,
		}
		if err := tx.Create(payment).Error; err != nil {
			return err
		}
		paid := round2(order.PaidAmount + amount)
		return tx.Model(&model.Order{}).Where("id = ?", order.ID).Updates(map[string]interface{}{
			"paid_amount":    paid,
			"payment_status": derivePaymentStatus(paid, order.TotalAmount),
		}).Error
	})
	if err != nil {
		return nil, err
	}
	return s.Get(id)
}

func (s *OrderService) Delete(id uint) error {
	if _, err := s.repo.FindByID(id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}

func (s *OrderService) SyncOrders(req dto.SyncOrdersRequest, userID uint) (*SyncResult, error) {
	result := &SyncResult{Orders: []model.Order{}}
	now := time.Now()

	for _, o := range req.Orders {
		var existing model.Order
		if err := s.db.Preload("Items").Preload("Payments").
			Where("client_sync_id = ?", o.ClientSyncID).First(&existing).Error; err == nil {
			result.DuplicateCount++
			result.Orders = append(result.Orders, existing)
			continue
		}

		clientCreatedAt := now
		if o.ClientCreatedAt != nil {
			clientCreatedAt = *o.ClientCreatedAt
		}
		in := orderInput{
			OutletID:        req.OutletID,
			ShiftID:         o.ShiftID,
			CustomerID:      o.CustomerID,
			ClientSyncID:    o.ClientSyncID,
			CustomerName:    o.CustomerName,
			OrderStatus:     o.OrderStatus,
			DiscountPercent: o.DiscountPercent,
			DiscountAmount:  o.DiscountAmount,
			TaxPercent:      o.TaxPercent,
			MetaData:        o.MetaData,
			ClientCreatedAt: clientCreatedAt,
			IsOffline:       true,
			Items:           o.Items,
		}
		for _, p := range o.Payments {
			paidAt := now
			if p.PaidAt != nil {
				paidAt = *p.PaidAt
			}
			in.Payments = append(in.Payments, paymentInput{
				ClientPaymentID: p.ClientPaymentID,
				PaymentType:     p.PaymentType,
				PaymentMethod:   p.PaymentMethod,
				Amount:          p.Amount,
				Note:            p.Note,
				PaidAt:          paidAt,
			})
		}

		var created *model.Order
		err := s.db.Transaction(func(tx *gorm.DB) error {
			order, err := createOrderTx(tx, in, userID)
			if err != nil {
				return err
			}
			created = order
			return nil
		})
		if err != nil {
			return nil, err
		}
		result.SyncedCount++
		result.Orders = append(result.Orders, *created)
	}
	return result, nil
}

func createOrderTx(tx *gorm.DB, in orderInput, userID uint) (*model.Order, error) {
	var outlet model.Outlet
	if err := tx.First(&outlet, in.OutletID).Error; err != nil {
		return nil, fmt.Errorf("outlet %d not found", in.OutletID)
	}
	if err := validateOutletCapabilities(&outlet, in); err != nil {
		return nil, err
	}

	var customer *model.Customer
	if in.CustomerID > 0 {
		var found model.Customer
		if err := tx.Where("id = ? AND outlet_id = ?", in.CustomerID, in.OutletID).First(&found).Error; err != nil {
			return nil, fmt.Errorf("customer %d not found for this outlet", in.CustomerID)
		}
		customer = &found
	}

	items := make([]model.OrderItem, 0, len(in.Items))
	stockDeltas := make([]struct {
		productID uint
		variantID uint
		qty       float64
	}, 0, len(in.Items))
	subtotal := 0.0
	orderCommission := 0.0

	for _, item := range in.Items {
		var product model.Product
		if err := tx.First(&product, item.ProductID).Error; err != nil {
			return nil, fmt.Errorf("product %d not found", item.ProductID)
		}
		var variant *model.ProductVariant
		if item.VariantID > 0 {
			var found model.ProductVariant
			if err := tx.First(&found, item.VariantID).Error; err != nil || found.ProductID != product.ID {
				return nil, fmt.Errorf("product variant %d not found", item.VariantID)
			}
			variant = &found
		}
		if product.PricingType == "dimension" && !outlet.Capabilities.EnableDimensionPricing {
			return nil, fmt.Errorf("dimension pricing capability is disabled for product %s", product.Name)
		}
		if product.PricingType == "tiered" && !outlet.Capabilities.EnableTieredPricing {
			return nil, fmt.Errorf("tiered pricing capability is disabled for product %s", product.Name)
		}

		priced, err := PriceItem(&product, variant, item.Qty, item.MetaData)
		if err != nil {
			return nil, err
		}
		subtotal += priced.Subtotal
		commission := computeItemCommission(&product, priced.Subtotal, priced.Qty, outlet.Capabilities.EnableStaffCommission)
		orderCommission += commission
		items = append(items, model.OrderItem{
			ProductID:        product.ID,
			VariantID:        priced.VariantID,
			ItemNameSnapshot: priced.Name,
			Qty:              priced.Qty,
			UnitPrice:        priced.UnitPrice,
			Subtotal:         priced.Subtotal,
			CommissionAmount: commission,
			MetaData:         priced.Meta,
		})
		if priced.TrackInventory {
			stockDeltas = append(stockDeltas, struct {
				productID uint
				variantID uint
				qty       float64
			}{product.ID, priced.VariantID, priced.Qty})
		}
	}

	orderStatus := in.OrderStatus
	if orderStatus == "" {
		orderStatus = "completed"
	}
	now := time.Now()

	discountAmount, taxAmount, totalAmount := computeOrderTotals(subtotal, in.DiscountPercent, in.DiscountAmount, in.TaxPercent)

	customerID := uint(0)
	customerName := in.CustomerName
	if customer != nil {
		customerID = customer.ID
		if customerName == "" {
			customerName = customer.Name
		}
	}

	order := &model.Order{
		OutletID:         in.OutletID,
		ShiftID:          in.ShiftID,
		CashierUserID:    userID,
		CustomerID:       customerID,
		ClientSyncID:     in.ClientSyncID,
		OrderNumber:      generateOrderNumber(),
		CustomerName:     customerName,
		OrderStatus:      orderStatus,
		PaymentStatus:    "unpaid",
		SubtotalAmount:   subtotal,
		DiscountPercent:  in.DiscountPercent,
		DiscountAmount:   discountAmount,
		TaxPercent:       in.TaxPercent,
		TaxAmount:        taxAmount,
		CommissionAmount: round2(orderCommission),
		TotalAmount:      totalAmount,
		ClientCreatedAt:  in.ClientCreatedAt,
		MetaData:         jsonOr(in.MetaData, "{}"),
	}
	if order.ClientCreatedAt.IsZero() {
		order.ClientCreatedAt = now
	}
	if in.IsOffline {
		order.IsOfflineCreated = true
		order.SyncedAt = &now
	}
	if err := tx.Create(order).Error; err != nil {
		return nil, err
	}

	for i := range items {
		items[i].OrderID = order.ID
		if err := tx.Create(&items[i]).Error; err != nil {
			return nil, err
		}
	}

	paid := 0.0
	payments := make([]model.OrderPayment, 0, len(in.Payments))
	for _, p := range in.Payments {
		amount, err := normalizePaymentAmount(order.TotalAmount, paid, p, in.IsOffline)
		if err != nil {
			return nil, err
		}
		payment := model.OrderPayment{
			OrderID:          order.ID,
			ShiftID:          in.ShiftID,
			ReceivedByUserID: userID,
			ClientPaymentID:  p.ClientPaymentID,
			PaymentType:      p.PaymentType,
			PaymentMethod:    p.PaymentMethod,
			Amount:           amount,
			PaidAt:           p.PaidAt,
			Note:             p.Note,
		}
		if payment.PaidAt.IsZero() {
			payment.PaidAt = now
		}
		if err := tx.Create(&payment).Error; err != nil {
			return nil, err
		}
		paid = round2(paid + amount)
		payments = append(payments, payment)
	}

	status := derivePaymentStatus(paid, order.TotalAmount)
	if err := tx.Model(&model.Order{}).Where("id = ?", order.ID).Updates(map[string]interface{}{
		"paid_amount":    paid,
		"payment_status": status,
	}).Error; err != nil {
		return nil, err
	}

	for _, d := range stockDeltas {
		if err := applyStockDelta(tx, d.productID, d.variantID, -d.qty); err != nil {
			return nil, err
		}
		movement := &model.StockMovement{
			OutletID:      order.OutletID,
			ProductID:     d.productID,
			VariantID:     d.variantID,
			UserID:        userID,
			MovementType:  "sale",
			QtyChange:     -d.qty,
			ReferenceType: "order",
			ReferenceID:   order.OrderNumber,
		}
		if err := tx.Create(movement).Error; err != nil {
			return nil, err
		}
	}

	order.PaidAmount = paid
	order.PaymentStatus = status
	order.Items = items
	order.Payments = payments
	return order, nil
}

func derivePaymentStatus(paid, total float64) string {
	switch {
	case paid <= 0:
		return "unpaid"
	case paid+0.005 >= total:
		return "paid"
	default:
		return "partial"
	}
}

// normalizePaymentAmount enforces server-side payment rules and returns the
// authoritative amount to persist.
func normalizePaymentAmount(total, alreadyPaid float64, p paymentInput, allowSettlement bool) (float64, error) {
	remaining := round2(total - alreadyPaid)
	if remaining <= 0 {
		return 0, errors.New("order is already fully paid")
	}

	switch p.PaymentType {
	case "full":
		return remaining, nil
	case "down_payment":
		if p.Amount <= 0 {
			return 0, errors.New("down payment amount must be greater than zero")
		}
		if p.Amount > remaining {
			return 0, errors.New("down payment exceeds remaining total")
		}
		return round2(p.Amount), nil
	case "settlement":
		if !allowSettlement {
			return 0, errors.New("initial payment cannot be a settlement")
		}
		if p.Amount <= 0 {
			return 0, errors.New("settlement amount must be greater than zero")
		}
		if p.Amount > remaining {
			return 0, errors.New("settlement exceeds remaining total")
		}
		return round2(p.Amount), nil
	default:
		return 0, fmt.Errorf("invalid payment type %q", p.PaymentType)
	}
}

func generateOrderNumber() string {
	raw := make([]byte, 3)
	_, _ = rand.Read(raw)
	return fmt.Sprintf("ORD-%s-%s", time.Now().Format("20060102"), strings.ToUpper(hex.EncodeToString(raw)))
}

func validateOutletCapabilities(outlet *model.Outlet, in orderInput) error {
	if in.OrderStatus != "" && in.OrderStatus != "completed" && in.OrderStatus != "cancelled" && !outlet.Capabilities.EnableOrderWorkflow {
		return errors.New("order workflow capability is disabled for this outlet")
	}
	for _, payment := range in.Payments {
		if payment.PaymentType != "full" && !outlet.Capabilities.EnablePartialPayment {
			return errors.New("partial payment capability is disabled for this outlet")
		}
	}
	for _, item := range in.Items {
		if item.VariantID > 0 && !outlet.Capabilities.EnableVariants {
			return errors.New("product variants capability is disabled for this outlet")
		}
		if !outlet.Capabilities.EnableModifiers && hasModifiers(item.MetaData) {
			return errors.New("modifiers capability is disabled for this outlet")
		}
	}
	return nil
}

func computeItemCommission(product *model.Product, subtotal, qty float64, enabled bool) float64 {
	if !enabled || product.CommissionValue <= 0 {
		return 0
	}
	switch product.CommissionType {
	case "percent":
		return round2(subtotal * product.CommissionValue / 100)
	case "fixed":
		return round2(product.CommissionValue * qty)
	default:
		return 0
	}
}

func computeOrderTotals(subtotal, discountPercent, discountAmount, taxPercent float64) (float64, float64, float64) {
	discount := round2(subtotal*discountPercent/100 + discountAmount)
	if discount < 0 {
		discount = 0
	}
	if discount > subtotal {
		discount = round2(subtotal)
	}
	taxable := round2(subtotal - discount)
	tax := round2(taxable * taxPercent / 100)
	total := round2(taxable + tax)
	return discount, tax, total
}

func hasModifiers(meta model.JSON) bool {
	if len(meta) == 0 {
		return false
	}
	var payload map[string]interface{}
	if err := json.Unmarshal(meta, &payload); err != nil {
		return false
	}
	value, ok := payload["modifiers"]
	if !ok || value == nil {
		return false
	}
	switch modifiers := value.(type) {
	case []interface{}:
		return len(modifiers) > 0
	case string:
		return modifiers != ""
	default:
		return false
	}
}
