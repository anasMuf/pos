package dto

import (
	"time"

	"api/model"
)

type CreateOrderItemRequest struct {
	ProductID uint       `json:"product_id" validate:"required"`
	VariantID uint       `json:"variant_id"`
	Qty       float64    `json:"qty" validate:"required,gt=0"`
	UnitPrice float64    `json:"unit_price" validate:"gte=0"`
	MetaData  model.JSON `json:"meta_data"`
}

type InitialPaymentRequest struct {
	ClientPaymentID string  `json:"client_payment_id" validate:"required"`
	PaymentType     string  `json:"payment_type" validate:"required,oneof=full down_payment settlement"`
	PaymentMethod   string  `json:"payment_method" validate:"required,oneof=cash qris transfer"`
	Amount          float64 `json:"amount" validate:"gte=0"`
	Note            string  `json:"note"`
}

type CreateOrderRequest struct {
	OutletID        uint                     `json:"outlet_id" validate:"required"`
	ShiftID         uint                     `json:"shift_id"`
	CustomerID      uint                     `json:"customer_id"`
	ClientSyncID    string                   `json:"client_sync_id" validate:"required,max=100"`
	CustomerName    string                   `json:"customer_name" validate:"max=150"`
	OrderStatus     string                   `json:"order_status" validate:"omitempty,oneof=queued in_progress ready completed cancelled"`
	DiscountPercent float64                  `json:"discount_percent" validate:"gte=0,lte=100"`
	DiscountAmount  float64                  `json:"discount_amount" validate:"gte=0"`
	TaxPercent      float64                  `json:"tax_percent" validate:"gte=0,lte=100"`
	MetaData        model.JSON               `json:"meta_data"`
	Items           []CreateOrderItemRequest `json:"items" validate:"required,min=1,dive"`
	InitialPayment  *InitialPaymentRequest   `json:"initial_payment"`
}

type AddOrderPaymentRequest struct {
	ShiftID         uint    `json:"shift_id"`
	ClientPaymentID string  `json:"client_payment_id" validate:"required,max=100"`
	PaymentType     string  `json:"payment_type" validate:"required,oneof=full down_payment settlement"`
	PaymentMethod   string  `json:"payment_method" validate:"required,oneof=cash qris transfer"`
	Amount          float64 `json:"amount" validate:"required,gt=0"`
	Note            string  `json:"note"`
}

type UpdateOrderStatusRequest struct {
	OrderStatus string `json:"order_status" validate:"required,oneof=queued in_progress ready completed cancelled"`
}

type SyncOrderPaymentRequest struct {
	ShiftID         uint       `json:"shift_id"`
	ClientPaymentID string     `json:"client_payment_id" validate:"required"`
	PaymentType     string     `json:"payment_type" validate:"required,oneof=full down_payment settlement"`
	PaymentMethod   string     `json:"payment_method" validate:"required,oneof=cash qris transfer"`
	Amount          float64    `json:"amount" validate:"required,gt=0"`
	PaidAt          *time.Time `json:"paid_at"`
	Note            string     `json:"note"`
}

type SyncOrderRequest struct {
	ShiftID         uint                      `json:"shift_id"`
	CustomerID      uint                      `json:"customer_id"`
	ClientSyncID    string                    `json:"client_sync_id" validate:"required"`
	CustomerName    string                    `json:"customer_name"`
	OrderStatus     string                    `json:"order_status" validate:"omitempty,oneof=queued in_progress ready completed cancelled"`
	DiscountPercent float64                   `json:"discount_percent" validate:"gte=0,lte=100"`
	DiscountAmount  float64                   `json:"discount_amount" validate:"gte=0"`
	TaxPercent      float64                   `json:"tax_percent" validate:"gte=0,lte=100"`
	ClientCreatedAt *time.Time                `json:"client_created_at"`
	MetaData        model.JSON                `json:"meta_data"`
	Items           []CreateOrderItemRequest  `json:"items" validate:"required,min=1,dive"`
	Payments        []SyncOrderPaymentRequest `json:"payments" validate:"dive"`
}

type SyncOrdersRequest struct {
	OutletID uint               `json:"outlet_id" validate:"required"`
	Orders   []SyncOrderRequest `json:"orders" validate:"required,min=1,dive"`
}
