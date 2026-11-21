package service

import (
	"api/model"

	"gorm.io/gorm"
)

// AccessService centralises membership, role, and capability checks.
type AccessService struct {
	db *gorm.DB
}

func NewAccessService(db *gorm.DB) *AccessService {
	return &AccessService{db: db}
}

// IsGlobalAdmin returns true for platform-level admins seeded/managed outside outlets.
func (a *AccessService) IsGlobalAdmin(userID uint) bool {
	var role string
	if err := a.db.Model(&model.User{}).Where("id = ?", userID).Pluck("role", &role).Error; err != nil {
		return false
	}
	return role == "admin"
}

// Membership returns the active membership for a user in an outlet.
func (a *AccessService) Membership(userID, outletID uint) (*model.OutletMember, bool) {
	if a.IsGlobalAdmin(userID) {
		return &model.OutletMember{OutletID: outletID, UserID: userID, OutletRole: "owner", IsActive: true}, true
	}
	var member model.OutletMember
	err := a.db.Where("user_id = ? AND outlet_id = ? AND is_active = ?", userID, outletID, true).
		First(&member).Error
	if err != nil {
		return nil, false
	}
	return &member, true
}

// CanView allows any active member of the outlet.
func (a *AccessService) CanView(userID, outletID uint) bool {
	_, ok := a.Membership(userID, outletID)
	return ok
}

// RoleFor returns the effective outlet role, or "admin" for global admins.
func (a *AccessService) RoleFor(userID, outletID uint) (string, bool) {
	if a.IsGlobalAdmin(userID) {
		return "admin", true
	}
	member, ok := a.Membership(userID, outletID)
	if !ok {
		return "", false
	}
	return member.OutletRole, true
}

// CanOperate allows cashier-level operations (sales, payments, shifts).
func (a *AccessService) CanOperate(userID, outletID uint) bool {
	member, ok := a.Membership(userID, outletID)
	if !ok {
		return false
	}
	return hasRole(member.OutletRole, "owner", "manager", "cashier")
}

// CanManage allows owner/manager-level operations (catalog, inventory, members, capabilities).
func (a *AccessService) CanManage(userID, outletID uint) bool {
	member, ok := a.Membership(userID, outletID)
	if !ok {
		return false
	}
	return hasRole(member.OutletRole, "owner", "manager")
}

// OutletIDs returns every outlet the user can access. Global admins get all outlets.
func (a *AccessService) OutletIDs(userID uint) []uint {
	var ids []uint
	if a.IsGlobalAdmin(userID) {
		a.db.Model(&model.Outlet{}).Pluck("id", &ids)
		return ids
	}
	a.db.Model(&model.OutletMember{}).
		Where("user_id = ? AND is_active = ?", userID, true).
		Pluck("outlet_id", &ids)
	return ids
}

// TenantIDs returns every tenant the user can access via outlet membership.
func (a *AccessService) TenantIDs(userID uint) []uint {
	var ids []uint
	if a.IsGlobalAdmin(userID) {
		a.db.Model(&model.Tenant{}).Pluck("id", &ids)
		return ids
	}
	a.db.Table("outlet_members").
		Joins("JOIN outlets ON outlets.id = outlet_members.outlet_id").
		Where("outlet_members.user_id = ? AND outlet_members.is_active = ?", userID, true).
		Where("outlet_members.deleted_at IS NULL AND outlets.deleted_at IS NULL").
		Distinct().
		Pluck("outlets.tenant_id", &ids)
	return ids
}

// CanViewTenant allows any member of an outlet under the tenant.
func (a *AccessService) CanViewTenant(userID, tenantID uint) bool {
	if a.IsGlobalAdmin(userID) {
		return true
	}
	var count int64
	a.db.Table("outlet_members").
		Joins("JOIN outlets ON outlets.id = outlet_members.outlet_id").
		Where("outlets.tenant_id = ? AND outlet_members.user_id = ? AND outlet_members.is_active = ?", tenantID, userID, true).
		Where("outlet_members.deleted_at IS NULL AND outlets.deleted_at IS NULL").
		Count(&count)
	return count > 0
}

// CanManageTenant allows owner/manager of any outlet under the tenant.
func (a *AccessService) CanManageTenant(userID, tenantID uint) bool {
	if a.IsGlobalAdmin(userID) {
		return true
	}
	var count int64
	a.db.Table("outlet_members").
		Joins("JOIN outlets ON outlets.id = outlet_members.outlet_id").
		Where("outlets.tenant_id = ? AND outlet_members.user_id = ? AND outlet_members.is_active = ?", tenantID, userID, true).
		Where("outlet_members.outlet_role IN ?", []string{"owner", "manager"}).
		Where("outlet_members.deleted_at IS NULL AND outlets.deleted_at IS NULL").
		Count(&count)
	return count > 0
}

// ManageableOutletIDs returns outlets where the user is owner/manager.
func (a *AccessService) ManageableOutletIDs(userID uint) []uint {
	var ids []uint
	if a.IsGlobalAdmin(userID) {
		a.db.Model(&model.Outlet{}).Pluck("id", &ids)
		return ids
	}
	a.db.Model(&model.OutletMember{}).
		Where("user_id = ? AND is_active = ? AND outlet_role IN ?", userID, true, []string{"owner", "manager"}).
		Pluck("outlet_id", &ids)
	return ids
}

func hasRole(role string, allowed ...string) bool {
	for _, candidate := range allowed {
		if role == candidate {
			return true
		}
	}
	return false
}
