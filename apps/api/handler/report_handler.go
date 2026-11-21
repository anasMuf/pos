package handler

import (
	"api/service"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type ReportHandler struct {
	service *service.ReportService
	access  *service.AccessService
}

func NewReportHandler(s *service.ReportService, access *service.AccessService) *ReportHandler {
	return &ReportHandler{service: s, access: access}
}

func (h *ReportHandler) Summary(c echo.Context) error {
	uid := currentUserID(c)
	allowed := h.access.ManageableOutletIDs(uid)
	outletID, _ := strconv.ParseUint(c.QueryParam("outlet_id"), 10, 64)
	if outletID > 0 && !containsID(allowed, uint(outletID)) {
		return forbidden("")
	}

	report, err := h.service.Summary(allowed, uint(outletID), c.QueryParam("from"), c.QueryParam("to"))
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Report summary retrieved successfully", report)
}

func (h *ReportHandler) Commissions(c echo.Context) error {
	uid := currentUserID(c)
	allowed := h.access.ManageableOutletIDs(uid)
	outletID, _ := strconv.ParseUint(c.QueryParam("outlet_id"), 10, 64)
	if outletID > 0 && !containsID(allowed, uint(outletID)) {
		return forbidden("")
	}

	report, err := h.service.Commissions(allowed, uint(outletID), c.QueryParam("from"), c.QueryParam("to"))
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Commission report retrieved successfully", report)
}

func (h *ReportHandler) Reconciliation(c echo.Context) error {
	uid := currentUserID(c)
	allowed := h.access.ManageableOutletIDs(uid)
	outletID, _ := strconv.ParseUint(c.QueryParam("outlet_id"), 10, 64)
	if outletID > 0 && !containsID(allowed, uint(outletID)) {
		return forbidden("")
	}

	report, err := h.service.Reconciliation(allowed, uint(outletID), c.QueryParam("from"), c.QueryParam("to"))
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Reconciliation report retrieved successfully", report)
}
