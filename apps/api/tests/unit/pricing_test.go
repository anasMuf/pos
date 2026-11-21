package unit

import (
	"encoding/json"
	"testing"

	"api/model"
	"api/service"
)

func jsonOf(payload string) model.JSON {
	return model.JSON(payload)
}

func TestPriceItemFixedAndVariant(t *testing.T) {
	product := &model.Product{
		Name:            "Fixed",
		PricingType:     "fixed",
		BasePrice:       10000,
		ModifiersConfig: jsonOf(`[{"name":"Extra","price":2000}]`),
	}
	variant := &model.ProductVariant{
		ProductID:     1,
		Name:          "Premium",
		PriceOverride: 15000,
	}
	variant.ID = 7

	cases := []struct {
		name         string
		variant      *model.ProductVariant
		qty          float64
		meta         model.JSON
		wantUnit     float64
		wantSubtotal float64
		wantErr      bool
	}{
		{"base price", nil, 2, nil, 10000, 20000, false},
		{"variant override", variant, 2, nil, 15000, 30000, false},
		{"modifier added", nil, 1, jsonOf(`{"modifiers":["Extra"]}`), 12000, 12000, false},
		{"unknown modifier", nil, 1, jsonOf(`{"modifiers":["Nope"]}`), 0, 0, true},
		{"zero qty", nil, 0, nil, 0, 0, true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			priced, err := service.PriceItem(product, tc.variant, tc.qty, tc.meta)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected an error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if priced.UnitPrice != tc.wantUnit {
				t.Fatalf("unit price = %v, want %v", priced.UnitPrice, tc.wantUnit)
			}
			if priced.Subtotal != tc.wantSubtotal {
				t.Fatalf("subtotal = %v, want %v", priced.Subtotal, tc.wantSubtotal)
			}
		})
	}
}

func TestPriceItemDimension(t *testing.T) {
	product := &model.Product{
		Name:            "Banner",
		PricingType:     "dimension",
		BasePrice:       25000,
		PricingRules:    jsonOf(`{"unit":"m","min_area":1}`),
		ModifiersConfig: jsonOf(`[{"name":"Mata Ayam","price":2000}]`),
	}

	priced, err := service.PriceItem(product, nil, 1, jsonOf(`{"width":4,"height":1,"modifiers":["Mata Ayam"]}`))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if priced.UnitPrice != 102000 {
		t.Fatalf("unit price = %v, want 102000", priced.UnitPrice)
	}
	if priced.Subtotal != 102000 {
		t.Fatalf("subtotal = %v, want 102000", priced.Subtotal)
	}

	var meta struct {
		Area float64 `json:"area"`
		Unit string  `json:"unit"`
	}
	if err := json.Unmarshal(priced.Meta, &meta); err != nil {
		t.Fatalf("decode meta: %v", err)
	}
	if meta.Area != 4 {
		t.Fatalf("meta area = %v, want 4", meta.Area)
	}
	if meta.Unit != "m" {
		t.Fatalf("meta unit = %q, want m", meta.Unit)
	}
}

func TestPriceItemDimensionRequiresDimensions(t *testing.T) {
	product := &model.Product{
		Name:         "Banner",
		PricingType:  "dimension",
		BasePrice:    25000,
		PricingRules: jsonOf(`{"unit":"m","min_area":1}`),
	}

	if _, err := service.PriceItem(product, nil, 1, jsonOf(`{"area":4}`)); err == nil {
		t.Fatalf("expected an error when width/height are missing")
	}
}

func TestPriceItemDimensionMinimumArea(t *testing.T) {
	product := &model.Product{
		Name:         "Banner",
		PricingType:  "dimension",
		BasePrice:    25000,
		PricingRules: jsonOf(`{"unit":"m","min_area":2}`),
	}

	priced, err := service.PriceItem(product, nil, 1, jsonOf(`{"width":1,"height":1}`))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if priced.UnitPrice != 50000 {
		t.Fatalf("unit price = %v, want 50000 (minimum area 2)", priced.UnitPrice)
	}
}

func TestPriceItemTiered(t *testing.T) {
	product := &model.Product{
		Name:         "Kaos",
		PricingType:  "tiered",
		BasePrice:    45000,
		PricingRules: jsonOf(`{"tiers":[{"min_qty":1,"max_qty":11,"price":45000},{"min_qty":12,"max_qty":999,"price":40000}]}`),
	}

	small, err := service.PriceItem(product, nil, 2, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if small.UnitPrice != 45000 {
		t.Fatalf("qty 2 unit price = %v, want 45000", small.UnitPrice)
	}

	bulk, err := service.PriceItem(product, nil, 12, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if bulk.UnitPrice != 40000 {
		t.Fatalf("qty 12 unit price = %v, want 40000", bulk.UnitPrice)
	}
	if bulk.Subtotal != 480000 {
		t.Fatalf("qty 12 subtotal = %v, want 480000", bulk.Subtotal)
	}
}
