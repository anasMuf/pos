package seeders

import (
	"api/model"
	"errors"
	"log"
	"os"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	DefaultAdminEmail    = "admin@pos.local"
	DefaultAdminUsername = "admin"
	DefaultAdminPassword = "admin123"
)

// SeedDemo creates the default owner account and optionally demo data.
//
//   - SEED_DEFAULT_ACCOUNT=false disables admin bootstrapping
//   - SEED_DEMO_DATA=false disables demo tenant/outlet/product seeding
//   - DEFAULT_ADMIN_PASSWORD overrides the dev fallback (admin123)
func SeedDemo(db *gorm.DB) {
	if os.Getenv("SEED_DEFAULT_ACCOUNT") == "false" {
		log.Println("seed: disabled via SEED_DEFAULT_ACCOUNT=false")
		return
	}

	password := DefaultAdminPassword
	if override := os.Getenv("DEFAULT_ADMIN_PASSWORD"); override != "" {
		password = override
	}

	admin := seedAdmin(db, password)
	if admin == nil {
		return
	}

	if os.Getenv("SEED_DEMO_DATA") == "false" {
		log.Println("seed: demo data disabled via SEED_DEMO_DATA=false")
		return
	}
	seedDemoData(db, admin)
}

func seedAdmin(db *gorm.DB, password string) *model.User {
	var existing model.User
	if err := db.Where("email = ?", DefaultAdminEmail).First(&existing).Error; err == nil {
		return &existing
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Println("seed: failed to hash password:", err)
		return nil
	}

	admin := &model.User{
		FullName: "Administrator",
		Email:    DefaultAdminEmail,
		Username: DefaultAdminUsername,
		Password: string(hash),
		Phone:    "081234567800",
		Address:  "Head Office",
		Role:     "admin",
	}
	if err := db.Create(admin).Error; err != nil {
		log.Println("seed: failed to create admin:", err)
		return nil
	}

	log.Printf("seed: default account created (%s)", DefaultAdminEmail)
	return admin
}

// ResetAdmin creates the admin when missing or rotates its password.
// Use it for production bootstrap instead of enabling demo seeding.
func ResetAdmin(db *gorm.DB, email, password string) error {
	if email == "" {
		email = DefaultAdminEmail
	}
	if password == "" {
		return errors.New("DEFAULT_ADMIN_PASSWORD or -password is required")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	var user model.User
	err = db.Where("email = ?", email).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		user = model.User{
			FullName: "Administrator",
			Email:    email,
			Username: DefaultAdminUsername,
			Password: string(hash),
			Phone:    "081234567800",
			Address:  "Head Office",
			Role:     "admin",
		}
		if err := db.Create(&user).Error; err != nil {
			return err
		}
		log.Printf("admin: created %s", email)
		return nil
	}
	if err != nil {
		return err
	}

	if err := db.Model(&user).Updates(map[string]interface{}{
		"password": string(hash),
		"role":     "admin",
	}).Error; err != nil {
		return err
	}
	log.Printf("admin: password rotated for %s", email)
	return nil
}

func seedDemoData(db *gorm.DB, admin *model.User) {
	var tenantCount int64
	db.Model(&model.Tenant{}).Count(&tenantCount)
	if tenantCount > 0 {
		return
	}

	tenant := &model.Tenant{Name: "Kreasi Nusantara Grup", Code: "KNG-01", Status: "active"}
	if err := db.Create(tenant).Error; err != nil {
		log.Println("seed: failed to create tenant:", err)
		return
	}

	retail := &model.Outlet{
		TenantID: tenant.ID,
		Name:     "Outlet Retail & Distro Sudirman",
		Address:  "Jl. Sudirman No. 45",
		Capabilities: model.Capabilities{
			EnableVariants:      true,
			EnableTieredPricing: true,
		},
		DefaultConnectionMode: "online",
	}
	printShop := &model.Outlet{
		TenantID: tenant.ID,
		Name:     "Outlet Cetak & Sablon Diponegoro",
		Address:  "Jl. Diponegoro No. 18",
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
	if err := db.Create(retail).Error; err != nil {
		log.Println("seed: failed to create retail outlet:", err)
		return
	}
	if err := db.Create(printShop).Error; err != nil {
		log.Println("seed: failed to create print outlet:", err)
		return
	}

	if admin != nil {
		db.Create(&model.OutletMember{OutletID: retail.ID, UserID: admin.ID, OutletRole: "owner", IsActive: true})
		db.Create(&model.OutletMember{OutletID: printShop.ID, UserID: admin.ID, OutletRole: "owner", IsActive: true})
	}

	kaos := &model.Product{
		OutletID:        retail.ID,
		Name:            "Kaos Polos Cotton 24s",
		SKU:             "KPS-24S",
		Category:        "Clothing",
		PricingType:     "tiered",
		BasePrice:       45000,
		TrackInventory:  true,
		StockQty:        0,
		MinStockQty:     10,
		PricingRules:    model.JSON(`{"tiers":[{"min_qty":1,"max_qty":11,"price":45000},{"min_qty":12,"max_qty":999,"price":40000}]}`),
		ModifiersConfig: model.JSON(`[]`),
	}
	banner := &model.Product{
		OutletID:        printShop.ID,
		Name:            "Cetak Banner Flexi 280gr",
		SKU:             "BNR-280",
		Category:        "Percetakan",
		PricingType:     "dimension",
		BasePrice:       25000,
		TrackInventory:  true,
		StockQty:        120,
		MinStockQty:     20,
		PricingRules:    model.JSON(`{"unit":"m","min_area":1}`),
		ModifiersConfig: model.JSON(`[{"name":"Mata Ayam","price":2000},{"name":"Laminasi Glossy","price":5000}]`),
	}
	sablon := &model.Product{
		OutletID:        printShop.ID,
		Name:            "Sablon Kaos Custom",
		SKU:             "SBL-CST",
		Category:        "Sablon",
		PricingType:     "tiered",
		BasePrice:       35000,
		TrackInventory:  false,
		StockQty:        0,
		MinStockQty:     0,
		PricingRules:    model.JSON(`{"tiers":[{"min_qty":1,"max_qty":5,"price":35000},{"min_qty":6,"max_qty":999,"price":28000}]}`),
		ModifiersConfig: model.JSON(`[{"name":"Sablon DTF A3","price":15000},{"name":"Lengan Panjang","price":7000}]`),
	}
	db.Create(kaos)
	db.Create(banner)
	db.Create(sablon)

	db.Create(&model.ProductVariant{ProductID: kaos.ID, Name: "Hitam - L", SKU: "KPS-24S-BLK-L", Barcode: "899100200101", StockQty: 25})
	db.Create(&model.ProductVariant{ProductID: kaos.ID, Name: "Putih - XL", SKU: "KPS-24S-WHT-XL", Barcode: "899100200102", PriceOverride: 50000, StockQty: 8})

	db.Create(&model.Customer{OutletID: retail.ID, Name: "Budi Santoso", Phone: "081200000001", Email: "budi@example.com", Address: "Jl. Sudirman"})
	db.Create(&model.Customer{OutletID: printShop.ID, Name: "Grand Opening Cafe", Phone: "081200000002", Email: "cafe@example.com", Address: "Jl. Diponegoro", Note: "Langganan spanduk"})
	db.Create(&model.Customer{OutletID: printShop.ID, Name: "Sari Wulandari", Phone: "081200000003"})

	db.Create(&model.ReceiptSetting{
		OutletID:           retail.ID,
		Header:             "Kreasi Nusantara - Retail",
		Footer:             "Terima kasih telah berbelanja",
		ShowCustomer:       true,
		ShowCashier:        true,
		ShowPaymentDetails: true,
		PaperSize:          "58mm",
	})
	db.Create(&model.ReceiptSetting{
		OutletID:           printShop.ID,
		Header:             "Kreasi Nusantara - Cetak & Sablon",
		Footer:             "Terima kasih, pesanan diproses sesuai antrean",
		ShowCustomer:       true,
		ShowCashier:        true,
		ShowPaymentDetails: true,
		PaperSize:          "80mm",
		TaxLabel:           "NPWP",
		TaxNumber:          "01.234.567.8-901.000",
	})

	log.Println("seed: demo tenant, outlets, products, variants, customers, and receipt settings created")
}
