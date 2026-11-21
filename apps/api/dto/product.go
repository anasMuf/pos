package dto

import "api/model"

type CreateProductRequest struct {
	OutletID        uint       `json:"outlet_id" validate:"required"`
	Name            string     `json:"name" validate:"required,min=2,max=200"`
	SKU             string     `json:"sku" validate:"required,max=80"`
	Category        string     `json:"category" validate:"required,max=100"`
	PricingType     string     `json:"pricing_type" validate:"required,oneof=fixed dimension tiered"`
	BasePrice       float64    `json:"base_price" validate:"gte=0"`
	TrackInventory  *bool      `json:"track_inventory"`
	StockQty        float64    `json:"stock_qty" validate:"gte=0"`
	MinStockQty     float64    `json:"min_stock_qty" validate:"gte=0"`
	PricingRules    model.JSON `json:"pricing_rules"`
	ModifiersConfig model.JSON `json:"modifiers_config"`
	CommissionType  string     `json:"commission_type" validate:"omitempty,oneof=none percent fixed"`
	CommissionValue float64    `json:"commission_value" validate:"gte=0"`
}

type UpdateProductRequest struct {
	Name            string     `json:"name" validate:"omitempty,min=2,max=200"`
	SKU             string     `json:"sku" validate:"omitempty,max=80"`
	Category        string     `json:"category" validate:"omitempty,max=100"`
	PricingType     string     `json:"pricing_type" validate:"omitempty,oneof=fixed dimension tiered"`
	BasePrice       *float64   `json:"base_price" validate:"omitempty,gte=0"`
	TrackInventory  *bool      `json:"track_inventory"`
	MinStockQty     *float64   `json:"min_stock_qty" validate:"omitempty,gte=0"`
	PricingRules    model.JSON `json:"pricing_rules"`
	ModifiersConfig model.JSON `json:"modifiers_config"`
	CommissionType  string     `json:"commission_type" validate:"omitempty,oneof=none percent fixed"`
	CommissionValue *float64   `json:"commission_value" validate:"omitempty,gte=0"`
}

type CreateProductVariantRequest struct {
	Name          string   `json:"name" validate:"required,max=150"`
	SKU           string   `json:"sku" validate:"required,max=100"`
	Barcode       string   `json:"barcode" validate:"omitempty,max=100"`
	PriceOverride *float64 `json:"price_override"`
	StockQty      float64  `json:"stock_qty" validate:"gte=0"`
}

type UpdateProductVariantRequest struct {
	Name          string   `json:"name" validate:"omitempty,max=150"`
	SKU           string   `json:"sku" validate:"omitempty,max=100"`
	Barcode       string   `json:"barcode" validate:"omitempty,max=100"`
	PriceOverride *float64 `json:"price_override"`
	StockQty      *float64 `json:"stock_qty" validate:"omitempty,gte=0"`
}
