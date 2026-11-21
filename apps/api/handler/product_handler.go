package handler

import (
	"api/dto"
	"api/service"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type ProductHandler struct {
	service *service.ProductService
	access  *service.AccessService
}

func NewProductHandler(s *service.ProductService, access *service.AccessService) *ProductHandler {
	return &ProductHandler{service: s, access: access}
}

func (h *ProductHandler) List(c echo.Context) error {
	page, limit := pagination(c)
	outletID, _ := strconv.ParseUint(c.QueryParam("outlet_id"), 10, 64)
	products, _, err := h.service.List(page, limit, c.QueryParam("search"), uint(outletID), c.QueryParam("category"), h.access.OutletIDs(currentUserID(c)))
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Products retrieved successfully", products)
}

func (h *ProductHandler) Get(c echo.Context) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}
	product, err := h.service.Get(id)
	if err != nil {
		return mapError(err)
	}
	if !h.access.CanView(currentUserID(c), product.OutletID) {
		return forbidden("")
	}
	return respond(c, http.StatusOK, "Product retrieved successfully", product)
}

func (h *ProductHandler) Create(c echo.Context) error {
	var req dto.CreateProductRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}
	if !h.access.CanManage(currentUserID(c), req.OutletID) {
		return forbidden("")
	}
	product, err := h.service.Create(req)
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusCreated, "Product created successfully", product)
}

func (h *ProductHandler) Update(c echo.Context) error {
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
	var req dto.UpdateProductRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}
	product, err := h.service.Update(id, req)
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Product updated successfully", product)
}

func (h *ProductHandler) Delete(c echo.Context) error {
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
	return respond(c, http.StatusOK, "Product deleted successfully", nil)
}

func (h *ProductHandler) ListVariants(c echo.Context) error {
	productID, err := parseUintParam(c, "product_id")
	if err != nil {
		return err
	}
	product, err := h.service.Get(productID)
	if err != nil {
		return mapError(err)
	}
	if !h.access.CanView(currentUserID(c), product.OutletID) {
		return forbidden("")
	}
	variants, err := h.service.ListVariants(productID)
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Product variants retrieved successfully", variants)
}

func (h *ProductHandler) CreateVariant(c echo.Context) error {
	productID, err := parseUintParam(c, "product_id")
	if err != nil {
		return err
	}
	product, err := h.service.Get(productID)
	if err != nil {
		return mapError(err)
	}
	if !h.access.CanManage(currentUserID(c), product.OutletID) {
		return forbidden("")
	}
	var req dto.CreateProductVariantRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}
	variant, err := h.service.CreateVariant(productID, req)
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusCreated, "Product variant created successfully", variant)
}

func (h *ProductHandler) UpdateVariant(c echo.Context) error {
	productID, err := parseUintParam(c, "product_id")
	if err != nil {
		return err
	}
	product, err := h.service.Get(productID)
	if err != nil {
		return mapError(err)
	}
	if !h.access.CanManage(currentUserID(c), product.OutletID) {
		return forbidden("")
	}
	variantID, err := parseUintParam(c, "variant_id")
	if err != nil {
		return err
	}
	var req dto.UpdateProductVariantRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid JSON")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}
	variant, err := h.service.UpdateVariant(productID, variantID, req)
	if err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Product variant updated successfully", variant)
}

func (h *ProductHandler) DeleteVariant(c echo.Context) error {
	productID, err := parseUintParam(c, "product_id")
	if err != nil {
		return err
	}
	product, err := h.service.Get(productID)
	if err != nil {
		return mapError(err)
	}
	if !h.access.CanManage(currentUserID(c), product.OutletID) {
		return forbidden("")
	}
	variantID, err := parseUintParam(c, "variant_id")
	if err != nil {
		return err
	}
	if err := h.service.DeleteVariant(productID, variantID); err != nil {
		return mapError(err)
	}
	return respond(c, http.StatusOK, "Product variant deleted successfully", nil)
}
