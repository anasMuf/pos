package model

type OutletMember struct {
	PrimaryKey
	OutletID   uint   `json:"outlet_id" gorm:"not null;index"`
	UserID     uint   `json:"user_id" gorm:"not null;index"`
	OutletRole string `json:"outlet_role" gorm:"type:varchar(30);not null"`
	IsActive   bool   `json:"is_active" gorm:"not null;default:true"`
	BaseModelTimeAt
}

func (OutletMember) TableName() string {
	return "outlet_members"
}
