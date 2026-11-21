package dto

type UpdateReceiptSettingRequest struct {
	Header             string `json:"header"`
	Footer             string `json:"footer"`
	ShowCustomer       *bool  `json:"show_customer"`
	ShowCashier        *bool  `json:"show_cashier"`
	ShowPaymentDetails *bool  `json:"show_payment_details"`
	PaperSize          string `json:"paper_size" validate:"omitempty,oneof=58mm 80mm A4"`
	TaxLabel           string `json:"tax_label"`
	TaxNumber          string `json:"tax_number"`
}
