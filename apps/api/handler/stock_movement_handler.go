package handler

import (
	"api/dto"
	"api/service"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type StockMovementHandler struct {
	service *service.StockMovementService
	access  *service.AccessService
}

func NewStockMovementHandler(s *service.StockMovementService, access *service.AccessService) *StockMovementHandler {
	return &StockMovementHandler{service: s, access: access}
}

func (h *StockMovementHandler) List(c echo.Context) error {
	page, limit := pagination(c)
	outletID, _ := strconv.ParseUint(c.QueryParam("outlet_id"), 10, 64)
	productID, _ := strconv.ParseUint(c.QueryParam("product_id"), 10, 64)
	movements, total, err := h.service.List(page, limit, uint(outletID), uint(productID), c.QueryParam("movement_type"), h.access.OutletIDs(currentUserID(c)))
	if err != nil {
		return mapError(err)
	}
	return respondPage(c, http.StatusOK, "Stock movements retrieved successfully", movements, page, limit, total)
}

func (h *StockMovementHandler) Create(c echo.Context) error {
	var req dto.CreateStockMovementRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}
	if !h.access.CanManage(currentUserID(c), req.OutletID) {
		return forbidden("")
	}
	movement, err := h.service.Create(req, currentUserID(c))
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusCreated, "Stock movement created successfully", movement)
}
