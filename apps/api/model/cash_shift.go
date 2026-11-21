package model

import "time"

type CashShift struct {
	PrimaryKey
	OutletID       uint       `json:"outlet_id" gorm:"not null;index"`
	UserID         uint       `json:"user_id" gorm:"not null;index"`
	Status         string     `json:"status" gorm:"type:varchar(20);not null;default:'open'"`
	OpeningCash    float64    `json:"opening_cash" gorm:"type:decimal(15,2);not null;default:0"`
	ExpectedCash   float64    `json:"expected_cash" gorm:"type:decimal(15,2);not null;default:0"`
	ClosingCash    float64    `json:"closing_cash" gorm:"type:decimal(15,2)"`
	CashDifference float64    `json:"cash_difference" gorm:"type:decimal(15,2)"`
	OpenedAt       time.Time  `json:"opened_at" gorm:"not null"`
	ClosedAt       *time.Time `json:"closed_at"`
	BaseModelTimeAt
}

func (CashShift) TableName() string {
	return "cash_shifts"
}
