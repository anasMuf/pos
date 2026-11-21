package service

import (
	"api/model"
	"encoding/json"
	"errors"
	"fmt"
	"math"
)

type pricingTier struct {
	MinQty float64 `json:"min_qty"`
	MaxQty float64 `json:"max_qty"`
	Price  float64 `json:"price"`
}

type pricingRules struct {
	Unit    string        `json:"unit"`
	MinArea float64       `json:"min_area"`
	Tiers   []pricingTier `json:"tiers"`
}

type modifierConfig struct {
	Name  string  `json:"name"`
	Price float64 `json:"price"`
}

type itemMeta struct {
	Width     float64  `json:"width"`
	Height    float64  `json:"height"`
	Area      float64  `json:"area"`
	Unit      string   `json:"unit"`
	Modifiers []string `json:"modifiers"`
}

// PricedItem is the authoritative server-side price for one order line.
type PricedItem struct {
	Product        *model.Product
	Variant        *model.ProductVariant
	VariantID      uint
	Name           string
	Qty            float64
	UnitPrice      float64
	Subtotal       float64
	Meta           model.JSON
	TrackInventory bool
}

// PriceItem recomputes an order line from product/variant config.
// Client-supplied unit prices are never trusted.
func PriceItem(product *model.Product, variant *model.ProductVariant, qty float64, meta model.JSON) (*PricedItem, error) {
	if product == nil {
		return nil, errors.New("product is required")
	}
	if qty <= 0 {
		return nil, errors.New("quantity must be greater than zero")
	}

	var rules pricingRules
	if len(product.PricingRules) > 0 {
		if err := json.Unmarshal(product.PricingRules, &rules); err != nil {
			return nil, fmt.Errorf("invalid pricing rules for product %s", product.Name)
		}
	}

	var metaMap map[string]interface{}
	if len(meta) > 0 {
		_ = json.Unmarshal(meta, &metaMap)
	}
	if metaMap == nil {
		metaMap = map[string]interface{}{}
	}

	var parsedMeta itemMeta
	if len(meta) > 0 {
		_ = json.Unmarshal(meta, &parsedMeta)
	}

	basePrice := product.BasePrice
	if variant != nil && variant.PriceOverride > 0 {
		basePrice = variant.PriceOverride
	}

	pricingType := product.PricingType
	if pricingType == "" {
		pricingType = "fixed"
	}

	unitPrice := basePrice
	switch pricingType {
	case "fixed":
		// base price already applied
	case "dimension":
		if parsedMeta.Width <= 0 || parsedMeta.Height <= 0 {
			return nil, fmt.Errorf("product %s requires width/height dimensions", product.Name)
		}
		area := parsedMeta.Width * parsedMeta.Height
		if rules.MinArea > area {
			area = rules.MinArea
		}
		unitPrice = basePrice * area
		metaMap["width"] = parsedMeta.Width
		metaMap["height"] = parsedMeta.Height
		metaMap["area"] = round2(area)
		if rules.Unit != "" {
			metaMap["unit"] = rules.Unit
		}
	case "tiered":
		unitPrice = tierUnitPrice(basePrice, rules.Tiers, qty)
	default:
		return nil, fmt.Errorf("unsupported pricing type %q for product %s", pricingType, product.Name)
	}

	modifierAdd, modifierNames, err := resolveModifiers(product, parsedMeta.Modifiers)
	if err != nil {
		return nil, err
	}
	unitPrice = round2(unitPrice + modifierAdd)
	if len(modifierNames) > 0 {
		metaMap["modifiers"] = modifierNames
	} else {
		delete(metaMap, "modifiers")
	}

	normalized, err := json.Marshal(metaMap)
	if err != nil {
		return nil, err
	}

	name := product.Name
	variantID := uint(0)
	if variant != nil {
		name = product.Name + " - " + variant.Name
		variantID = variant.ID
	}

	return &PricedItem{
		Product:        product,
		Variant:        variant,
		VariantID:      variantID,
		Name:           name,
		Qty:            qty,
		UnitPrice:      unitPrice,
		Subtotal:       round2(unitPrice * qty),
		Meta:           model.JSON(normalized),
		TrackInventory: product.TrackInventory,
	}, nil
}

func tierUnitPrice(basePrice float64, tiers []pricingTier, qty float64) float64 {
	for _, tier := range tiers {
		maxQty := tier.MaxQty
		if maxQty <= 0 {
			maxQty = math.MaxFloat64
		}
		if qty >= tier.MinQty && qty <= maxQty {
			return tier.Price
		}
	}
	return basePrice
}

func resolveModifiers(product *model.Product, selected []string) (float64, []string, error) {
	if len(selected) == 0 {
		return 0, nil, nil
	}

	var configs []modifierConfig
	if len(product.ModifiersConfig) > 0 {
		_ = json.Unmarshal(product.ModifiersConfig, &configs)
	}
	available := make(map[string]float64, len(configs))
	for _, config := range configs {
		available[config.Name] = config.Price
	}

	total := 0.0
	names := make([]string, 0, len(selected))
	seen := make(map[string]bool, len(selected))
	for _, name := range selected {
		if seen[name] {
			continue
		}
		price, ok := available[name]
		if !ok {
			return 0, nil, fmt.Errorf("modifier %q is not available for product %s", name, product.Name)
		}
		total += price
		names = append(names, name)
		seen[name] = true
	}
	return total, names, nil
}

func round2(value float64) float64 {
	return math.Round(value*100) / 100
}
