package handler

import (
	"api/dto"
	"api/model"
	"api/service"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type OutletHandler struct {
	service       *service.OutletService
	access        *service.AccessService
	memberService *service.OutletMemberService
}

func NewOutletHandler(s *service.OutletService, access *service.AccessService, memberService *service.OutletMemberService) *OutletHandler {
	return &OutletHandler{service: s, access: access, memberService: memberService}
}

func (h *OutletHandler) List(c echo.Context) error {
	page, limit := pagination(c)
	tenantID, _ := strconv.ParseUint(c.QueryParam("tenant_id"), 10, 64)
	outlets, total, err := h.service.List(page, limit, c.QueryParam("search"), uint(tenantID), h.access.OutletIDs(currentUserID(c)))
	if err != nil {
		return mapError(err)
	}
	return respondPage(c, http.StatusOK, "Outlets retrieved successfully", outlets, page, limit, total)
}

func (h *OutletHandler) Get(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	if !h.access.CanView(currentUserID(c), id) {
		return forbidden("")
	}
	outlet, err := h.service.Get(id)
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Outlet retrieved successfully", outlet)
}

func (h *OutletHandler) Create(c echo.Context) error {
	var req dto.CreateOutletRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}
	outlet, err := h.service.Create(req)
	if err != nil {
		return mapError(err)
	}

	uid := currentUserID(c)
	if uid > 0 {
		_, _ = h.memberService.Assign(outlet.ID, dto.AssignOutletMemberRequest{
			UserID:     uid,
			OutletRole: "owner",
		})
	}

	return respond(c, http.StatusCreated, "Outlet created successfully", outlet)
}

func (h *OutletHandler) Access(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	uid := currentUserID(c)
	role, ok := h.access.RoleFor(uid, id)
	if !ok {
		return forbidden("")
	}
	return respond(c, http.StatusOK, "Outlet access retrieved successfully", dto.OutletAccessResponse{
		OutletID:      id,
		Role:          role,
		IsGlobalAdmin: h.access.IsGlobalAdmin(uid),
	})
}

func (h *OutletHandler) CapabilityRegistry(c echo.Context) error {
	return respond(c, http.StatusOK, "Capabilities retrieved successfully", model.CapabilityRegistry())
}

func (h *OutletHandler) Update(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	if !h.access.CanManage(currentUserID(c), id) {
		return forbidden("")
	}
	var req dto.UpdateOutletRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}
	outlet, err := h.service.Update(id, req)
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Outlet updated successfully", outlet)
}

func (h *OutletHandler) UpdateCapabilities(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	if !h.access.CanManage(currentUserID(c), id) {
		return forbidden("")
	}
	var req dto.UpdateCapabilitiesRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}
	outlet, err := h.service.UpdateCapabilities(id, req.Capabilities)
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Outlet capabilities updated successfully", outlet)
}

func (h *OutletHandler) Delete(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	if !h.access.CanManage(currentUserID(c), id) {
		return forbidden("")
	}
	if err := h.service.Delete(id); err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Outlet deleted successfully", nil)
}
