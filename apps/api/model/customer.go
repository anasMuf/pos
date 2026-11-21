package model

type Customer struct {
	PrimaryKey
	OutletID uint   `json:"outlet_id" gorm:"not null;index"`
	Name     string `json:"name" gorm:"type:varchar(150);not null"`
	Phone    string `json:"phone" gorm:"type:varchar(30);index"`
	Email    string `json:"email" gorm:"type:varchar(150)"`
	Address  string `json:"address" gorm:"type:text"`
	Note     string `json:"note" gorm:"type:text"`
	BaseModelTimeAt
}

func (Customer) TableName() string {
	return "customers"
}
