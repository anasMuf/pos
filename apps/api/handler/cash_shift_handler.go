package handler

import (
	"api/dto"
	"api/service"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type CashShiftHandler struct {
	service *service.CashShiftService
	access  *service.AccessService
}

func NewCashShiftHandler(s *service.CashShiftService, access *service.AccessService) *CashShiftHandler {
	return &CashShiftHandler{service: s, access: access}
}

func (h *CashShiftHandler) List(c echo.Context) error {
	page, limit := pagination(c)
	outletID, _ := strconv.ParseUint(c.QueryParam("outlet_id"), 10, 64)
	shifts, _, err := h.service.List(page, limit, uint(outletID), c.QueryParam("status"), h.access.OutletIDs(currentUserID(c)))
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Cash shifts retrieved successfully", shifts)
}

func (h *CashShiftHandler) Get(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	shift, err := h.service.Get(id)
	if err != nil {
		return mapError(err)
	}
	if !h.access.CanView(currentUserID(c), shift.OutletID) {
		return forbidden("")
	}
	return respond(c, http.StatusOK, "Cash shift retrieved successfully", shift)
}

func (h *CashShiftHandler) Open(c echo.Context) error {
	var req dto.OpenCashShiftRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}
	if !h.access.CanOperate(currentUserID(c), req.OutletID) {
		return forbidden("")
	}
	shift, err := h.service.Open(req, currentUserID(c))
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusCreated, "Cash shift opened successfully", shift)
}

func (h *CashShiftHandler) Close(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	var req dto.CloseCashShiftRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}
	shift, err := h.service.Get(id)
	if err != nil {
		return mapError(err)
	}
	uid := currentUserID(c)
	if !h.access.CanManage(uid, shift.OutletID) && shift.UserID != uid {
		return forbidden("")
	}
	closed, err := h.service.Close(id, req.ClosingCash)
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Cash shift closed successfully", closed)
}
