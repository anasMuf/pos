package handler

import (
	"api/dto"
	"api/service"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type CustomerHandler struct {
	service *service.CustomerService
	access  *service.AccessService
}

func NewCustomerHandler(s *service.CustomerService, access *service.AccessService) *CustomerHandler {
	return &CustomerHandler{service: s, access: access}
}

func (h *CustomerHandler) List(c echo.Context) error {
	page, limit := pagination(c)
	outletID, _ := strconv.ParseUint(c.QueryParam("outlet_id"), 10, 64)
	uid := currentUserID(c)
	if outletID > 0 && !h.access.CanView(uid, uint(outletID)) {
		return forbidden("")
	}

	customers, _, err := h.service.List(page, limit, uint(outletID), c.QueryParam("search"), h.access.OutletIDs(uid))
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Customers retrieved successfully", customers)
}

func (h *CustomerHandler) Get(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	customer, err := h.service.Get(id)
	if err != nil {
		return mapError(err)
	}
	if !h.access.CanView(currentUserID(c), customer.OutletID) {
		return forbidden("")
	}
	return respond(c, http.StatusOK, "Customer retrieved successfully", customer)
}

func (h *CustomerHandler) Create(c echo.Context) error {
	var req dto.CreateCustomerRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}
	if !h.access.CanOperate(currentUserID(c), req.OutletID) {
		return forbidden("")
	}
	customer, err := h.service.Create(req)
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusCreated, "Customer created successfully", customer)
}

func (h *CustomerHandler) Update(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	existing, err := h.service.Get(id)
	if err != nil {
		return mapError(err)
	}
	if !h.access.CanOperate(currentUserID(c), existing.OutletID) {
		return forbidden("")
	}

	var req dto.UpdateCustomerRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}
	customer, err := h.service.Update(id, req)
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Customer updated successfully", customer)
}

func (h *CustomerHandler) Delete(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	existing, err := h.service.Get(id)
	if err != nil {
		return mapError(err)
	}
	if !h.access.CanManage(currentUserID(c), existing.OutletID) {
		return forbidden("")
	}
	if err := h.service.Delete(id); err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Customer deleted successfully", nil)
}
