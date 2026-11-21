package service

import "api/model"

func normalizePagination(page, limit int) (int, int) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}
	return page, limit
}

func jsonOr(j model.JSON, fallback string) model.JSON {
	if len(j) == 0 || string(j) == "null" {
		return model.JSON(fallback)
	}
	return j
}

func defaultCapabilities() model.Capabilities {
	return model.Capabilities{}
}
