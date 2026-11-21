package dto

type CreateStockMovementRequest struct {
	OutletID      uint    `json:"outlet_id" validate:"required"`
	ProductID     uint    `json:"product_id" validate:"required"`
	VariantID     uint    `json:"variant_id"`
	MovementType  string  `json:"movement_type" validate:"required,oneof=stock_in stock_out sale adjustment sync_reconcile"`
	QtyChange     float64 `json:"qty_change" validate:"required"`
	ReferenceType string  `json:"reference_type"`
	ReferenceID   string  `json:"reference_id"`
	Note          string  `json:"note"`
}
