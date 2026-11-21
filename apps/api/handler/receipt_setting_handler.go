package handler

import (
	"api/dto"
	"api/service"
	"net/http"

	"github.com/labstack/echo/v4"
)

type ReceiptSettingHandler struct {
	service *service.ReceiptSettingService
	access  *service.AccessService
}

func NewReceiptSettingHandler(s *service.ReceiptSettingService, access *service.AccessService) *ReceiptSettingHandler {
	return &ReceiptSettingHandler{service: s, access: access}
}

func (h *ReceiptSettingHandler) Get(c echo.Context) error {
	outletID, err := parseUintParam(c, "outlet_id")
	if err != nil {
		return err
	}
	if !h.access.CanView(currentUserID(c), outletID) {
		return forbidden("")
	}
	setting, err := h.service.GetByOutlet(outletID)
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Receipt settings retrieved successfully", setting)
}

func (h *ReceiptSettingHandler) Upsert(c echo.Context) error {
	outletID, err := parseUintParam(c, "outlet_id")
	if err != nil {
		return err
	}
	if !h.access.CanManage(currentUserID(c), outletID) {
		return forbidden("")
	}

	var req dto.UpdateReceiptSettingRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	setting, err := h.service.Upsert(outletID, req)
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Receipt settings updated successfully", setting)
}
