package unit

import (
	"testing"

	"api/dto"
)

func TestNewPaginationMeta(t *testing.T) {
	tests := []struct {
		name     string
		page     int
		limit    int
		total    int64
		wantMore bool
	}{
		{name: "first page with more rows", page: 1, limit: 10, total: 25, wantMore: true},
		{name: "exact last page", page: 3, limit: 10, total: 30, wantMore: false},
		{name: "partial last page", page: 3, limit: 10, total: 21, wantMore: false},
		{name: "empty result", page: 1, limit: 10, total: 0, wantMore: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			meta := dto.NewPaginationMeta(tt.page, tt.limit, tt.total)
			if meta.Page != tt.page || meta.Limit != tt.limit || meta.Total != tt.total {
				t.Fatalf("meta = %+v, want page=%d limit=%d total=%d", meta, tt.page, tt.limit, tt.total)
			}
			if meta.HasMore != tt.wantMore {
				t.Fatalf("has_more = %v, want %v", meta.HasMore, tt.wantMore)
			}
		})
	}
}
