package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"api/dto"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func parseUintParam(c echo.Context, name string) (uint, error) {
	value, err := strconv.ParseUint(c.Param(name), 10, 64)
	if err != nil || value == 0 {
		return 0, echo.NewHTTPError(http.StatusBadRequest, "Invalid "+name)
	}
	return uint(value), nil
}

func pagination(c echo.Context) (int, int) {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	return page, limit
}

func currentUserID(c echo.Context) uint {
	switch v := c.Get("user_id").(type) {
	case float64:
		return uint(v)
	case float32:
		return uint(v)
	case int:
		return uint(v)
	case int64:
		return uint(v)
	case uint:
		return v
	case json.Number:
		n, _ := v.Int64()
		return uint(n)
	default:
		return 0
	}
}

func mapError(err error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return echo.NewHTTPError(http.StatusNotFound, "Resource not found")
	}
	return echo.NewHTTPError(http.StatusBadRequest, err.Error())
}

func forbidden(message string) error {
	if message == "" {
		message = "You do not have access to this resource"
	}
	return echo.NewHTTPError(http.StatusForbidden, message)
}

func containsID(ids []uint, target uint) bool {
	for _, id := range ids {
		if id == target {
			return true
		}
	}
	return false
}

func respond(c echo.Context, status int, message string, data interface{}) error {
	return c.JSON(status, dto.SuccessResponse{Message: message, Data: data})
}

// respondPage writes a list response with pagination metadata so clients can
// implement paging or infinite scrolling without a separate count request.
func respondPage(c echo.Context, status int, message string, data interface{}, page, limit int, total int64) error {
	return c.JSON(status, dto.SuccessResponse{
		Message: message,
		Data:    data,
		Meta:    dto.NewPaginationMeta(page, limit, total),
	})
}
