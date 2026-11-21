package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
)

// JSON stores arbitrary JSON (object or array) in a Postgres jsonb column.
type JSON json.RawMessage

func (j JSON) Value() (driver.Value, error) {
	if len(j) == 0 {
		return []byte("null"), nil
	}
	return []byte(j), nil
}

func (j *JSON) Scan(value interface{}) error {
	if value == nil {
		*j = JSON("null")
		return nil
	}
	var raw []byte
	switch v := value.(type) {
	case []byte:
		raw = v
	case string:
		raw = []byte(v)
	default:
		return errors.New("model.JSON: unsupported scan type")
	}
	*j = append((*j)[0:0], raw...)
	return nil
}

func (j JSON) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("null"), nil
	}
	return j, nil
}

func (j *JSON) UnmarshalJSON(data []byte) error {
	if j == nil {
		return errors.New("model.JSON: UnmarshalJSON on nil pointer")
	}
	*j = append((*j)[0:0], data...)
	return nil
}

func (JSON) GormDataType() string { return "jsonb" }

// Capabilities is the per-outlet feature flag set.
type Capabilities struct {
	EnableVariants         bool `json:"enable_variants"`
	EnableModifiers        bool `json:"enable_modifiers"`
	EnableDimensionPricing bool `json:"enable_dimension_pricing"`
	EnableTieredPricing    bool `json:"enable_tiered_pricing"`
	EnableOrderWorkflow    bool `json:"enable_order_workflow"`
	EnablePartialPayment   bool `json:"enable_partial_payment"`
	EnableStaffCommission  bool `json:"enable_staff_commission"`
}

func (c Capabilities) Value() (driver.Value, error) {
	return json.Marshal(c)
}

func (c *Capabilities) Scan(value interface{}) error {
	if value == nil {
		*c = Capabilities{}
		return nil
	}
	var raw []byte
	switch v := value.(type) {
	case []byte:
		raw = v
	case string:
		raw = []byte(v)
	default:
		return errors.New("model.Capabilities: unsupported scan type")
	}
	return json.Unmarshal(raw, c)
}

func (Capabilities) GormDataType() string { return "jsonb" }
