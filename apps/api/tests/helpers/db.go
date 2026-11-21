package helpers

import (
	"os"
	"strings"
	"testing"

	"api/model"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Models is the canonical migration list used by tests.
var Models = []interface{}{
	&model.User{},
	&model.Tenant{},
	&model.Outlet{},
	&model.OutletMember{},
	&model.Product{},
	&model.ProductVariant{},
	&model.StockMovement{},
	&model.CashShift{},
	&model.Order{},
	&model.OrderItem{},
	&model.OrderPayment{},
	&model.Customer{},
	&model.ReceiptSetting{},
}

// TestDB connects to TEST_DB_DSN, migrates, and truncates all tables.
// Integration tests are skipped when TEST_DB_DSN is not set.
func TestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := os.Getenv("TEST_DB_DSN")
	if dsn == "" {
		t.Skip("TEST_DB_DSN is not set; skipping integration test")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("connect test database: %v", err)
	}
	if err := db.AutoMigrate(Models...); err != nil {
		t.Fatalf("migrate test database: %v", err)
	}

	Reset(db)
	return db
}

// Reset removes all rows and restarts sequences.
func Reset(db *gorm.DB) {
	tables := []string{
		"order_payments",
		"order_items",
		"orders",
		"cash_shifts",
		"stock_movements",
		"product_variants",
		"products",
		"customers",
		"receipt_settings",
		"outlet_members",
		"outlets",
		"tenants",
		"users",
	}
	db.Exec("TRUNCATE TABLE " + strings.Join(tables, ", ") + " RESTART IDENTITY CASCADE")
}
