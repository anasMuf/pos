package model

type ReceiptSetting struct {
	PrimaryKey
	OutletID           uint   `json:"outlet_id" gorm:"not null;uniqueIndex"`
	Header             string `json:"header" gorm:"type:text"`
	Footer             string `json:"footer" gorm:"type:text"`
	ShowCustomer       bool   `json:"show_customer" gorm:"not null"`
	ShowCashier        bool   `json:"show_cashier" gorm:"not null"`
	ShowPaymentDetails bool   `json:"show_payment_details" gorm:"not null"`
	PaperSize          string `json:"paper_size" gorm:"type:varchar(10);not null;default:'58mm'"`
	TaxLabel           string `json:"tax_label" gorm:"type:varchar(30)"`
	TaxNumber          string `json:"tax_number" gorm:"type:varchar(50)"`
	BaseModelTimeAt
}

func (ReceiptSetting) TableName() string {
	return "receipt_settings"
}
