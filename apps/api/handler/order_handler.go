package handler

import (
	"api/dto"
	"api/service"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type OrderHandler struct {
	service *service.OrderService
	access  *service.AccessService
}

func NewOrderHandler(s *service.OrderService, access *service.AccessService) *OrderHandler {
	return &OrderHandler{service: s, access: access}
}

func (h *OrderHandler) List(c echo.Context) error {
	page, limit := pagination(c)
	outletID, _ := strconv.ParseUint(c.QueryParam("outlet_id"), 10, 64)
	customerID, _ := strconv.ParseUint(c.QueryParam("customer_id"), 10, 64)
	orders, _, err := h.service.List(
		page, limit, uint(outletID), uint(customerID),
		c.QueryParam("order_status"),
		c.QueryParam("payment_status"),
		c.QueryParam("search"),
		h.access.OutletIDs(currentUserID(c)),
	)
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Orders retrieved successfully", orders)
}

func (h *OrderHandler) Get(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	order, err := h.service.Get(id)
	if err != nil {
		return mapError(err)
	}
	if !h.access.CanView(currentUserID(c), order.OutletID) {
		return forbidden("")
	}
	return respond(c, http.StatusOK, "Order retrieved successfully", order)
}

func (h *OrderHandler) Create(c echo.Context) error {
	var req dto.CreateOrderRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}
	if !h.access.CanOperate(currentUserID(c), req.OutletID) {
		return forbidden("")
	}
	order, err := h.service.Create(req, currentUserID(c))
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusCreated, "Order created successfully", order)
}

func (h *OrderHandler) UpdateStatus(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	order, err := h.service.Get(id)
	if err != nil {
		return mapError(err)
	}
	if !h.access.CanView(currentUserID(c), order.OutletID) {
		return forbidden("")
	}
	var req dto.UpdateOrderStatusRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}
	order, err = h.service.UpdateStatus(id, req.OrderStatus)
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Order status updated successfully", order)
}

func (h *OrderHandler) AddPayment(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	order, err := h.service.Get(id)
	if err != nil {
		return mapError(err)
	}
	if !h.access.CanOperate(currentUserID(c), order.OutletID) {
		return forbidden("")
	}
	var req dto.AddOrderPaymentRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}
	order, err = h.service.AddPayment(id, req, currentUserID(c))
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusCreated, "Order payment added successfully", order)
}

func (h *OrderHandler) Delete(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	order, err := h.service.Get(id)
	if err != nil {
		return mapError(err)
	}
	if !h.access.CanManage(currentUserID(c), order.OutletID) {
		return forbidden("")
	}
	if err := h.service.Delete(id); err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Order deleted successfully", nil)
}

func (h *OrderHandler) SyncOrders(c echo.Context) error {
	var req dto.SyncOrdersRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}
	if !h.access.CanOperate(currentUserID(c), req.OutletID) {
		return forbidden("")
	}
	result, err := h.service.SyncOrders(req, currentUserID(c))
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Offline orders synchronized successfully", result)
}
