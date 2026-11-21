package handler

import (
	"api/dto"
	"api/service"
	"net/http"

	"github.com/labstack/echo/v4"
)

type TenantHandler struct {
	service *service.TenantService
	access  *service.AccessService
}

func NewTenantHandler(s *service.TenantService, access *service.AccessService) *TenantHandler {
	return &TenantHandler{service: s, access: access}
}

// List godoc
// @Summary      List tenants
// @Tags         tenants
// @Security     ApiKeyAuth
// @Success      200 {object} dto.SuccessResponse
// @Router       /tenants [get]
func (h *TenantHandler) List(c echo.Context) error {
	page, limit := pagination(c)
	tenants, _, err := h.service.List(page, limit, c.QueryParam("search"), h.access.TenantIDs(currentUserID(c)))
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Tenants retrieved successfully", tenants)
}

func (h *TenantHandler) Get(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	if !h.access.CanViewTenant(currentUserID(c), id) {
		return forbidden("")
	}
	tenant, err := h.service.Get(id)
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Tenant retrieved successfully", tenant)
}

func (h *TenantHandler) Create(c echo.Context) error {
	var req dto.CreateTenantRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}
	tenant, err := h.service.Create(req)
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusCreated, "Tenant created successfully", tenant)
}

func (h *TenantHandler) Update(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	if !h.access.CanManageTenant(currentUserID(c), id) {
		return forbidden("")
	}
	var req dto.UpdateTenantRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}
	tenant, err := h.service.Update(id, req)
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Tenant updated successfully", tenant)
}

func (h *TenantHandler) Delete(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	if !h.access.CanManageTenant(currentUserID(c), id) {
		return forbidden("")
	}
	if err := h.service.Delete(id); err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Tenant deleted successfully", nil)
}
