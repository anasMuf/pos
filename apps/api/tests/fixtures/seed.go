package fixtures

import (
	"testing"

	"api/model"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Base is the shared seed graph used by integration tests.
type Base struct {
	Admin  *model.User
	Tenant *model.Tenant
	Retail *model.Outlet
	Print  *model.Outlet
	Kaos   *model.Product
	Banner *model.Product
}

// SeedBase creates a global admin, one tenant, two capability-different
// outlets, and two products. The admin is owner of both outlets.
func SeedBase(t *testing.T, db *gorm.DB) *Base {
	t.Helper()

	hash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash admin password: %v", err)
	}

	admin := &model.User{
		FullName: "Administrator",
		Email:    "admin@test.local",
		Username: "admin",
		Password: string(hash),
		Phone:    "0800000000",
		Address:  "Test HQ",
		Role:     "admin",
	}
	mustCreate(t, db, admin)

	tenant := &model.Tenant{Name: "Test Tenant", Code: "TEST-01", Status: "active"}
	mustCreate(t, db, tenant)

	retail := &model.Outlet{
		TenantID: tenant.ID,
		Name:     "Retail",
		Address:  "Jl. Retail",
		Capabilities: model.Capabilities{
			EnableVariants:      true,
			EnableTieredPricing: true,
		},
		DefaultConnectionMode: "online",
	}
	printShop := &model.Outlet{
		TenantID: tenant.ID,
		Name:     "Print",
		Address:  "Jl. Print",
		Capabilities: model.Capabilities{
			EnableVariants:         true,
			EnableModifiers:        true,
			EnableDimensionPricing: true,
			EnableTieredPricing:    true,
			EnableOrderWorkflow:    true,
			EnablePartialPayment:   true,
		},
		DefaultConnectionMode: "online",
	}
	mustCreate(t, db, retail)
	mustCreate(t, db, printShop)

	for _, outlet := range []*model.Outlet{retail, printShop} {
		mustCreate(t, db, &model.OutletMember{
			OutletID:   outlet.ID,
			UserID:     admin.ID,
			OutletRole: "owner",
			IsActive:   true,
		})
	}

	kaos := &model.Product{
		OutletID:        retail.ID,
		Name:            "Kaos",
		SKU:             "KAOS-1",
		Category:        "Clothing",
		PricingType:     "tiered",
		BasePrice:       45000,
		TrackInventory:  true,
		StockQty:        100,
		MinStockQty:     5,
		PricingRules:    model.JSON(`{"tiers":[{"min_qty":1,"max_qty":11,"price":45000},{"min_qty":12,"max_qty":999,"price":40000}]}`),
		ModifiersConfig: model.JSON(`[]`),
	}
	banner := &model.Product{
		OutletID:        printShop.ID,
		Name:            "Banner",
		SKU:             "BANNER-1",
		Category:        "Print",
		PricingType:     "dimension",
		BasePrice:       25000,
		TrackInventory:  true,
		StockQty:        100,
		MinStockQty:     5,
		PricingRules:    model.JSON(`{"unit":"m","min_area":1}`),
		ModifiersConfig: model.JSON(`[{"name":"Mata Ayam","price":2000}]`),
	}
	mustCreate(t, db, kaos)
	mustCreate(t, db, banner)

	return &Base{
		Admin:  admin,
		Tenant: tenant,
		Retail: retail,
		Print:  printShop,
		Kaos:   kaos,
		Banner: banner,
	}
}

func mustCreate(t *testing.T, db *gorm.DB, value interface{}) {
	t.Helper()
	if err := db.Create(value).Error; err != nil {
		t.Fatalf("seed create %T: %v", value, err)
	}
}
