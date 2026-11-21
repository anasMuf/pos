// @title           Universal Multi-Capability POS API
// @version         1.0
// @description     Multi-tenant, multi-outlet, capability-driven POS API.
// @termsOfService  http://swagger.io/terms/

// @contact.name   API Support
// @contact.url    http://www.swagger.io/support
// @contact.email  support@swagger.io

// @license.name  Apache 2.0
// @license.url   http://www.apache.org/licenses/LICENSE-2.0.html

// @host      localhost:8080
// @BasePath  /api

// @securityDefinitions.apikey  ApiKeyAuth
// @in                          header
// @name                        Authorization

package main

import (
	"api/config"
	_ "api/docs"
	"api/model"
	"api/seeders"
	"api/server"
	"flag"
	"log"
	"os"

	"gorm.io/gorm"
)

func runResetAdmin(db *gorm.DB, args []string) {
	fs := flag.NewFlagSet("reset-admin", flag.ExitOnError)
	email := fs.String("email", seeders.DefaultAdminEmail, "admin email")
	password := fs.String("password", os.Getenv("DEFAULT_ADMIN_PASSWORD"), "new password")
	_ = fs.Parse(args)

	if err := seeders.ResetAdmin(db, *email, *password); err != nil {
		log.Fatal("reset-admin: ", err)
	}
}

func main() {
	config.LoadEnv()
	db := config.DBInit()

	if err := db.AutoMigrate(
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
	); err != nil {
		panic("Gagal auto-migrate tabel: " + err.Error())
	}

	seeders.SeedDemo(db)

	if len(os.Args) > 1 && os.Args[1] == "reset-admin" {
		runResetAdmin(db, os.Args[2:])
		return
	}

	e := server.New(db)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	e.Logger.Fatal(e.Start(":" + port))
}
