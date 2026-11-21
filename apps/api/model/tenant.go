package model

type Tenant struct {
	PrimaryKey
	Name   string `json:"name" gorm:"type:varchar(150);not null"`
	Code   string `json:"code" gorm:"type:varchar(50);not null;unique"`
	Status string `json:"status" gorm:"type:varchar(20);not null;default:'active'"`
	BaseModelTimeAt
}

func (Tenant) TableName() string {
	return "tenants"
}
