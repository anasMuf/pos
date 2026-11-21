package dto

type CreateTenantRequest struct {
	Name   string `json:"name" validate:"required,min=3,max=150"`
	Code   string `json:"code" validate:"required,min=2,max=50"`
	Status string `json:"status" validate:"omitempty,oneof=active inactive"`
}

type UpdateTenantRequest struct {
	Name   string `json:"name" validate:"omitempty,min=3,max=150"`
	Status string `json:"status" validate:"omitempty,oneof=active inactive"`
}
