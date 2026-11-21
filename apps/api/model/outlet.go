package model

type Outlet struct {
	PrimaryKey
	TenantID              uint         `json:"tenant_id" gorm:"not null;index"`
	Name                  string       `json:"name" gorm:"type:varchar(150);not null"`
	Address               string       `json:"address" gorm:"type:text;not null"`
	Capabilities          Capabilities `json:"capabilities" gorm:"type:jsonb;not null;default:'{}'"`
	DefaultConnectionMode string       `json:"default_connection_mode" gorm:"type:varchar(10);not null;default:'online'"`
	BaseModelTimeAt
}

func (Outlet) TableName() string {
	return "outlets"
}
