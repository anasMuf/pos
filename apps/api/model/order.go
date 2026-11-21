package model

import "time"

type Order struct {
	PrimaryKey
	OutletID         uint           `json:"outlet_id" gorm:"not null;index"`
	ShiftID          uint           `json:"shift_id" gorm:"index"`
	CashierUserID    uint           `json:"cashier_user_id" gorm:"not null;index"`
	CustomerID       uint           `json:"customer_id" gorm:"index"`
	ClientSyncID     string         `json:"client_sync_id" gorm:"type:varchar(100);not null;unique"`
	OrderNumber      string         `json:"order_number" gorm:"type:varchar(60);not null;unique"`
	CustomerName     string         `json:"customer_name" gorm:"type:varchar(150)"`
	OrderStatus      string         `json:"order_status" gorm:"type:varchar(20);not null;default:'completed'"`
	PaymentStatus    string         `json:"payment_status" gorm:"type:varchar(20);not null;default:'paid'"`
	SubtotalAmount   float64        `json:"subtotal_amount" gorm:"type:decimal(15,2);not null;default:0"`
	DiscountPercent  float64        `json:"discount_percent" gorm:"type:decimal(5,2);not null;default:0"`
	DiscountAmount   float64        `json:"discount_amount" gorm:"type:decimal(15,2);not null;default:0"`
	TaxPercent       float64        `json:"tax_percent" gorm:"type:decimal(5,2);not null;default:0"`
	TaxAmount        float64        `json:"tax_amount" gorm:"type:decimal(15,2);not null;default:0"`
	CommissionAmount float64        `json:"commission_amount" gorm:"type:decimal(15,2);not null;default:0"`
	TotalAmount      float64        `json:"total_amount" gorm:"type:decimal(15,2);not null;default:0"`
	PaidAmount       float64        `json:"paid_amount" gorm:"type:decimal(15,2);not null;default:0"`
	IsOfflineCreated bool           `json:"is_offline_created" gorm:"not null;default:false"`
	ClientCreatedAt  time.Time      `json:"client_created_at" gorm:"not null"`
	SyncedAt         *time.Time     `json:"synced_at"`
	MetaData         JSON           `json:"meta_data" gorm:"type:jsonb;not null;default:'{}'"`
	Items            []OrderItem    `json:"items" gorm:"foreignKey:OrderID"`
	Payments         []OrderPayment `json:"payments" gorm:"foreignKey:OrderID"`
	BaseModelTimeAt
}

func (Order) TableName() string {
	return "orders"
}

type OrderItem struct {
	PrimaryKey
	OrderID          uint    `json:"order_id" gorm:"not null;index"`
	ProductID        uint    `json:"product_id" gorm:"not null;index"`
	VariantID        uint    `json:"variant_id" gorm:"index"`
	ItemNameSnapshot string  `json:"item_name_snapshot" gorm:"type:varchar(200);not null"`
	Qty              float64 `json:"qty" gorm:"type:decimal(15,3);not null"`
	UnitPrice        float64 `json:"unit_price" gorm:"type:decimal(15,2);not null"`
	Subtotal         float64 `json:"subtotal" gorm:"type:decimal(15,2);not null"`
	CommissionAmount float64 `json:"commission_amount" gorm:"type:decimal(15,2);not null;default:0"`
	MetaData         JSON    `json:"meta_data" gorm:"type:jsonb;not null;default:'{}'"`
	BaseModelTimeAt
}

func (OrderItem) TableName() string {
	return "order_items"
}

type OrderPayment struct {
	PrimaryKey
	OrderID          uint      `json:"order_id" gorm:"not null;index"`
	ShiftID          uint      `json:"shift_id" gorm:"index"`
	ReceivedByUserID uint      `json:"received_by_user_id" gorm:"not null;index"`
	ClientPaymentID  string    `json:"client_payment_id" gorm:"type:varchar(100);not null;unique"`
	PaymentType      string    `json:"payment_type" gorm:"type:varchar(20);not null;default:'full'"`
	PaymentMethod    string    `json:"payment_method" gorm:"type:varchar(30);not null"`
	Amount           float64   `json:"amount" gorm:"type:decimal(15,2);not null"`
	PaidAt           time.Time `json:"paid_at" gorm:"not null"`
	Note             string    `json:"note" gorm:"type:text"`
	BaseModelTimeAt
}

func (OrderPayment) TableName() string {
	return "order_payments"
}
