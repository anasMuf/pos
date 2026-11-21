package dto

import "api/model"

type CreateOutletRequest struct {
	TenantID              uint                `json:"tenant_id" validate:"required"`
	Name                  string              `json:"name" validate:"required,min=3,max=150"`
	Address               string              `json:"address" validate:"required"`
	Capabilities          *model.Capabilities `json:"capabilities"`
	DefaultConnectionMode string              `json:"default_connection_mode" validate:"omitempty,oneof=online offline"`
}

type UpdateOutletRequest struct {
	Name                  string `json:"name" validate:"omitempty,min=3,max=150"`
	Address               string `json:"address" validate:"omitempty"`
	DefaultConnectionMode string `json:"default_connection_mode" validate:"omitempty,oneof=online offline"`
}

type UpdateCapabilitiesRequest struct {
	Capabilities model.Capabilities `json:"capabilities" validate:"required"`
}

type OutletAccessResponse struct {
	OutletID      uint   `json:"outlet_id"`
	Role          string `json:"role"`
	IsGlobalAdmin bool   `json:"is_global_admin"`
}
