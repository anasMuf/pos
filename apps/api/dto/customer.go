package dto

type CreateCustomerRequest struct {
	OutletID uint   `json:"outlet_id" validate:"required"`
	Name     string `json:"name" validate:"required,min=2,max=150"`
	Phone    string `json:"phone" validate:"omitempty,max=30"`
	Email    string `json:"email" validate:"omitempty,email,max=150"`
	Address  string `json:"address"`
	Note     string `json:"note"`
}

type UpdateCustomerRequest struct {
	Name    string `json:"name" validate:"omitempty,min=2,max=150"`
	Phone   string `json:"phone" validate:"omitempty,max=30"`
	Email   string `json:"email" validate:"omitempty,email,max=150"`
	Address string `json:"address"`
	Note    string `json:"note"`
}
