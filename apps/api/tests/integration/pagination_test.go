package integration

import (
	"net/http"
	"testing"

	"api/tests/fixtures"
	"api/tests/helpers"
)

// TestListResponsesExposePaginationMeta guards the `meta` block used by the
// frontend infinite-scroll lists. Adding it must not change `data`.
func TestListResponsesExposePaginationMeta(t *testing.T) {
	db := helpers.TestDB(t)
	base := fixtures.SeedBase(t, db)
	client := loginAdmin(t, db, base)

	type meta struct {
		Page    int   `json:"page"`
		Limit   int   `json:"limit"`
		Total   int64 `json:"total"`
		HasMore bool  `json:"has_more"`
	}
	type listEnvelope struct {
		Data []map[string]any `json:"data"`
		Meta *meta            `json:"meta"`
	}

	endpoints := map[string]string{
		"products":    "/products?limit=1",
		"customers":   "/customers?limit=1",
		"orders":      "/orders?limit=1",
		"outlets":     "/outlets?limit=1",
		"tenants":     "/tenants?limit=1",
		"stock":       "/stock-movements?limit=1",
		"cash_shifts": "/cash-shifts?limit=1",
	}

	for name, path := range endpoints {
		t.Run(name, func(t *testing.T) {
			var body listEnvelope
			if status := client.Do(http.MethodGet, path, nil, &body); status != http.StatusOK {
				t.Fatalf("GET %s status = %d", path, status)
			}
			if body.Meta == nil {
				t.Fatalf("GET %s missing meta", path)
			}
			if body.Meta.Page != 1 || body.Meta.Limit != 1 {
				t.Fatalf("GET %s meta = %+v", path, *body.Meta)
			}
			if body.Meta.Total < int64(len(body.Data)) {
				t.Fatalf("GET %s total = %d, data len = %d", path, body.Meta.Total, len(body.Data))
			}
			if len(body.Data) > 1 {
				t.Fatalf("GET %s returned %d rows for limit=1", path, len(body.Data))
			}
		})
	}
}
