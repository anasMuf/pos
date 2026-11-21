package server

import (
	"api/dto"
	"api/handler"
	"api/middleware"
	"api/model"
	"api/repository"
	"api/service"
	"api/utility"
	"net/http"

	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
	echoMiddleware "github.com/labstack/echo/v4/middleware"
	echoSwagger "github.com/swaggo/echo-swagger"
	"gorm.io/gorm"
)

// New wires repositories, services, handlers, middleware, and routes.
// It is shared by main and by integration tests.
func New(db *gorm.DB) *echo.Echo {
	// repositories
	userRepo := repository.NewUserRepository(db)
	tenantRepo := repository.NewRepository[model.Tenant](db)
	outletRepo := repository.NewRepository[model.Outlet](db)
	outletMemberRepo := repository.NewRepository[model.OutletMember](db)
	productRepo := repository.NewRepository[model.Product](db)
	variantRepo := repository.NewRepository[model.ProductVariant](db)
	stockMovementRepo := repository.NewRepository[model.StockMovement](db)
	cashShiftRepo := repository.NewRepository[model.CashShift](db)
	orderRepo := repository.NewRepository[model.Order](db)
	customerRepo := repository.NewRepository[model.Customer](db)
	receiptSettingRepo := repository.NewRepository[model.ReceiptSetting](db)

	// services
	accessService := service.NewAccessService(db)
	userService := service.NewUserService(userRepo)
	tenantService := service.NewTenantService(tenantRepo)
	outletService := service.NewOutletService(outletRepo)
	outletMemberService := service.NewOutletMemberService(outletMemberRepo)
	productService := service.NewProductService(productRepo, variantRepo)
	stockMovementService := service.NewStockMovementService(db, stockMovementRepo, productRepo, variantRepo)
	cashShiftService := service.NewCashShiftService(db, cashShiftRepo)
	orderService := service.NewOrderService(db, orderRepo, productRepo, variantRepo)
	customerService := service.NewCustomerService(customerRepo)
	receiptSettingService := service.NewReceiptSettingService(receiptSettingRepo)
	reportService := service.NewReportService(db)

	// handlers
	userHandler := handler.NewUserHandler(userService)
	tenantHandler := handler.NewTenantHandler(tenantService, accessService)
	outletHandler := handler.NewOutletHandler(outletService, accessService, outletMemberService)
	outletMemberHandler := handler.NewOutletMemberHandler(outletMemberService, accessService)
	productHandler := handler.NewProductHandler(productService, accessService)
	stockMovementHandler := handler.NewStockMovementHandler(stockMovementService, accessService)
	cashShiftHandler := handler.NewCashShiftHandler(cashShiftService, accessService)
	orderHandler := handler.NewOrderHandler(orderService, accessService)
	customerHandler := handler.NewCustomerHandler(customerService, accessService)
	receiptSettingHandler := handler.NewReceiptSettingHandler(receiptSettingService, accessService)
	reportHandler := handler.NewReportHandler(reportService, accessService)

	e := echo.New()
	e.Validator = &utility.CustomValidator{Validator: validator.New()}
	e.Use(middleware.MiddlewareLogging)
	e.Use(echoMiddleware.CORS())
	e.HTTPErrorHandler = handler.CustomHTTPErrorHandler

	api := e.Group("/api")
	api.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, dto.SuccessResponse{
			Message: "OK",
			Data:    map[string]string{"status": "ok"},
		})
	})
	api.POST("/users/register", userHandler.CreateUser)
	api.POST("/users/login", userHandler.LoginUser)

	auth := api.Group("")
	auth.Use(middleware.JWTAuth)
	auth.GET("/users", userHandler.GetUser)

	// Tenants
	auth.GET("/tenants", tenantHandler.List)
	auth.POST("/tenants", tenantHandler.Create)
	auth.GET("/tenants/:id", tenantHandler.Get)
	auth.PATCH("/tenants/:id", tenantHandler.Update)
	auth.DELETE("/tenants/:id", tenantHandler.Delete)

	// Outlets & capabilities
	auth.GET("/capabilities", outletHandler.CapabilityRegistry)
	auth.GET("/outlets", outletHandler.List)
	auth.POST("/outlets", outletHandler.Create)
	auth.GET("/outlets/:id", outletHandler.Get)
	auth.GET("/outlets/:id/access", outletHandler.Access)
	auth.PATCH("/outlets/:id", outletHandler.Update)
	auth.PATCH("/outlets/:id/capabilities", outletHandler.UpdateCapabilities)
	auth.DELETE("/outlets/:id", outletHandler.Delete)

	// Outlet members
	auth.GET("/outlets/:outlet_id/members", outletMemberHandler.List)
	auth.POST("/outlets/:outlet_id/members", outletMemberHandler.Assign)
	auth.PATCH("/outlets/:outlet_id/members/:member_id", outletMemberHandler.Update)
	auth.DELETE("/outlets/:outlet_id/members/:member_id", outletMemberHandler.Remove)

	// Products & variants
	auth.GET("/products", productHandler.List)
	auth.POST("/products", productHandler.Create)
	auth.GET("/products/:id", productHandler.Get)
	auth.PATCH("/products/:id", productHandler.Update)
	auth.DELETE("/products/:id", productHandler.Delete)
	auth.GET("/products/:product_id/variants", productHandler.ListVariants)
	auth.POST("/products/:product_id/variants", productHandler.CreateVariant)
	auth.PATCH("/products/:product_id/variants/:variant_id", productHandler.UpdateVariant)
	auth.DELETE("/products/:product_id/variants/:variant_id", productHandler.DeleteVariant)

	// Customers
	auth.GET("/customers", customerHandler.List)
	auth.POST("/customers", customerHandler.Create)
	auth.GET("/customers/:id", customerHandler.Get)
	auth.PATCH("/customers/:id", customerHandler.Update)
	auth.DELETE("/customers/:id", customerHandler.Delete)

	// Receipt settings
	auth.GET("/outlets/:outlet_id/receipt-settings", receiptSettingHandler.Get)
	auth.PUT("/outlets/:outlet_id/receipt-settings", receiptSettingHandler.Upsert)

	// Reports
	auth.GET("/reports/summary", reportHandler.Summary)
	auth.GET("/reports/commissions", reportHandler.Commissions)
	auth.GET("/reports/reconciliation", reportHandler.Reconciliation)

	// Stock movements
	auth.GET("/stock-movements", stockMovementHandler.List)
	auth.POST("/stock-movements", stockMovementHandler.Create)

	// Cash shifts
	auth.GET("/cash-shifts", cashShiftHandler.List)
	auth.POST("/cash-shifts/open", cashShiftHandler.Open)
	auth.GET("/cash-shifts/:id", cashShiftHandler.Get)
	auth.POST("/cash-shifts/:id/close", cashShiftHandler.Close)

	// Orders, payments & offline sync
	auth.GET("/orders", orderHandler.List)
	auth.POST("/orders", orderHandler.Create)
	auth.GET("/orders/:id", orderHandler.Get)
	auth.PATCH("/orders/:id/status", orderHandler.UpdateStatus)
	auth.POST("/orders/:id/payments", orderHandler.AddPayment)
	auth.DELETE("/orders/:id", orderHandler.Delete)
	auth.POST("/sync/orders", orderHandler.SyncOrders)

	e.GET("/swagger/*", echoSwagger.WrapHandler)

	return e
}
