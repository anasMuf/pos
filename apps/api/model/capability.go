package model

// CapabilityDefinition describes a configurable outlet capability so clients
// can render flags without hardcoding each key.
type CapabilityDefinition struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Description string `json:"description"`
	Default     bool   `json:"default"`
}

// capabilityRegistry is the single source of truth for capability metadata.
// Add new capabilities here; API and UI will pick them up automatically.
var capabilityRegistry = []CapabilityDefinition{
	{
		Key:         "enable_variants",
		Label:       "Varian Produk",
		Description: "Ukuran, warna, jenis",
		Default:     false,
	},
	{
		Key:         "enable_modifiers",
		Label:       "Modifier / Tambahan",
		Description: "Topping, finishing, catatan",
		Default:     false,
	},
	{
		Key:         "enable_dimension_pricing",
		Label:       "Harga Dimensi",
		Description: "Hitung per luas / ukuran",
		Default:     false,
	},
	{
		Key:         "enable_tiered_pricing",
		Label:       "Harga Bertingkat",
		Description: "Harga turun berdasarkan qty",
		Default:     false,
	},
	{
		Key:         "enable_order_workflow",
		Label:       "Alur Pesanan",
		Description: "Antrean → proses → siap → selesai",
		Default:     false,
	},
	{
		Key:         "enable_partial_payment",
		Label:       "DP / Pelunasan",
		Description: "Pembayaran bertahap",
		Default:     false,
	},
	{
		Key:         "enable_staff_commission",
		Label:       "Komisi Staf",
		Description: "Perhitungan komisi operator (PTH)",
		Default:     false,
	},
}

// CapabilityRegistry returns a copy so callers cannot mutate the registry.
func CapabilityRegistry() []CapabilityDefinition {
	out := make([]CapabilityDefinition, len(capabilityRegistry))
	copy(out, capabilityRegistry)
	return out
}
