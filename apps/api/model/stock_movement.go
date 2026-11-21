package model

type StockMovement struct {
	PrimaryKey
	OutletID      uint    `json:"outlet_id" gorm:"not null;index"`
	ProductID     uint    `json:"product_id" gorm:"not null;index"`
	VariantID     uint    `json:"variant_id" gorm:"index"`
	UserID        uint    `json:"user_id" gorm:"not null;index"`
	MovementType  string  `json:"movement_type" gorm:"type:varchar(20);not null"`
	QtyChange     float64 `json:"qty_change" gorm:"type:decimal(15,3);not null"`
	ReferenceType string  `json:"reference_type" gorm:"type:varchar(30)"`
	ReferenceID   string  `json:"reference_id" gorm:"type:varchar(100)"`
	Note          string  `json:"note" gorm:"type:text"`
	BaseModelTimeAt
}

func (StockMovement) TableName() string {
	return "stock_movements"
}
