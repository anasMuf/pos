package dto

// PaginationQuery is embedded by list endpoints via query params.
type PaginationQuery struct {
	Page   int    `query:"page"`
	Limit  int    `query:"limit"`
	Search string `query:"search"`
}

// PaginationMeta is added to list responses that expose totals.
// `has_more` lets clients (e.g. infinite scroll) know whether another page exists.
type PaginationMeta struct {
	Page    int   `json:"page"`
	Limit   int   `json:"limit"`
	Total   int64 `json:"total"`
	HasMore bool  `json:"has_more"`
}

// NewPaginationMeta derives the metadata from the requested window and the
// total row count returned by the repository.
func NewPaginationMeta(page, limit int, total int64) *PaginationMeta {
	return &PaginationMeta{
		Page:    page,
		Limit:   limit,
		Total:   total,
		HasMore: int64(page*limit) < total,
	}
}
