package dto

type AssignOutletMemberRequest struct {
	UserID     uint   `json:"user_id" validate:"required"`
	OutletRole string `json:"outlet_role" validate:"required,oneof=owner manager cashier operator"`
	IsActive   *bool  `json:"is_active"`
}

type UpdateOutletMemberRequest struct {
	OutletRole string `json:"outlet_role" validate:"omitempty,oneof=owner manager cashier operator"`
	IsActive   *bool  `json:"is_active"`
}
