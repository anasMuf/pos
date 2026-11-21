package model

type Product struct {
	PrimaryKey
	OutletID        uint    `json:"outlet_id" gorm:"not null;index"`
	Name            string  `json:"name" gorm:"type:varchar(200);not null"`
	SKU             string  `json:"sku" gorm:"type:varchar(80);not null;index"`
	Category        string  `json:"category" gorm:"type:varchar(100);not null"`
	PricingType     string  `json:"pricing_type" gorm:"type:varchar(20);not null;default:'fixed'"`
	BasePrice       float64 `json:"base_price" gorm:"type:decimal(15,2);not null;default:0"`
	TrackInventory  bool    `json:"track_inventory" gorm:"not null;default:true"`
	StockQty        float64 `json:"stock_qty" gorm:"type:decimal(15,3);not null;default:0"`
	MinStockQty     float64 `json:"min_stock_qty" gorm:"type:decimal(15,3);not null;default:0"`
	PricingRules    JSON    `json:"pricing_rules" gorm:"type:jsonb;not null;default:'{}'"`
	ModifiersConfig JSON    `json:"modifiers_config" gorm:"type:jsonb;not null;default:'[]'"`
	CommissionType  string  `json:"commission_type" gorm:"type:varchar(20);not null;default:'none'"`
	CommissionValue float64 `json:"commission_value" gorm:"type:decimal(15,2);not null;default:0"`
	BaseModelTimeAt
}

func (Product) TableName() string {
	return "products"
}

type ProductVariant struct {
	PrimaryKey
	ProductID     uint    `json:"product_id" gorm:"not null;index"`
	Name          string  `json:"name" gorm:"type:varchar(150);not null"`
	SKU           string  `json:"sku" gorm:"type:varchar(100);not null;unique"`
	Barcode       string  `json:"barcode" gorm:"type:varchar(100);index"`
	PriceOverride float64 `json:"price_override" gorm:"type:decimal(15,2)"`
	StockQty      float64 `json:"stock_qty" gorm:"type:decimal(15,3);not null;default:0"`
	BaseModelTimeAt
}

func (ProductVariant) TableName() string {
	return "product_variants"
}
