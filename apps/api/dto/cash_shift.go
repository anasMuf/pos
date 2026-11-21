package dto

type OpenCashShiftRequest struct {
	OutletID    uint    `json:"outlet_id" validate:"required"`
	OpeningCash float64 `json:"opening_cash" validate:"gte=0"`
}

type CloseCashShiftRequest struct {
	ClosingCash float64 `json:"closing_cash" validate:"gte=0"`
}
