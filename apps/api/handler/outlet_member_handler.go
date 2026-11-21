package handler

import (
	"api/dto"
	"api/service"
	"net/http"

	"github.com/labstack/echo/v4"
)

type OutletMemberHandler struct {
	service *service.OutletMemberService
	access  *service.AccessService
}

func NewOutletMemberHandler(s *service.OutletMemberService, access *service.AccessService) *OutletMemberHandler {
	return &OutletMemberHandler{service: s, access: access}
}

func (h *OutletMemberHandler) List(c echo.Context) error {
	outletID, err := parseUintParam(c, "outlet_id")
	if err != nil {
		return err
	}
	if !h.access.CanView(currentUserID(c), outletID) {
		return forbidden("")
	}
	members, err := h.service.List(outletID)
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Outlet members retrieved successfully", members)
}

func (h *OutletMemberHandler) Assign(c echo.Context) error {
	outletID, err := parseUintParam(c, "outlet_id")
	if err != nil {
		return err
	}
	if !h.access.CanManage(currentUserID(c), outletID) {
		return forbidden("")
	}
	var req dto.AssignOutletMemberRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}
	member, err := h.service.Assign(outletID, req)
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusCreated, "Outlet member assigned successfully", member)
}

func (h *OutletMemberHandler) Update(c echo.Context) error {
	outletID, err := parseUintParam(c, "outlet_id")
	if err != nil {
		return err
	}
	if !h.access.CanManage(currentUserID(c), outletID) {
		return forbidden("")
	}
	memberID, err := parseUintParam(c, "member_id")
	if err != nil {
		return err
	}
	var req dto.UpdateOutletMemberRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}
	member, err := h.service.Update(outletID, memberID, req)
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Outlet member updated successfully", member)
}

func (h *OutletMemberHandler) Remove(c echo.Context) error {
	outletID, err := parseUintParam(c, "outlet_id")
	if err != nil {
		return err
	}
	if !h.access.CanManage(currentUserID(c), outletID) {
		return forbidden("")
	}
	memberID, err := parseUintParam(c, "member_id")
	if err != nil {
		return err
	}
	if err := h.service.Remove(outletID, memberID); err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Outlet member removed successfully", nil)
}
