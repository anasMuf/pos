# API Contract: Universal Multi-Capability POS Template

> Berdasarkan: `erd.md` (Universal Multi-Capability POS Template)
> 
> 

## Base URL

```text
/api

```

## Authentication

* **Endpoint publik:** `POST /api/users/register`, `POST /api/users/login`


* **Endpoint protected:** Semua endpoint di bawah ini memerlukan autentikasi **JWT Bearer token** pada header `Authorization`.


* **Format header:** `Authorization: Bearer <token>`


* **Otorisasi & Capability Guard:** Akses resource terikat pada keanggotaan outlet (`OUTLET_MEMBER`) dan status `capabilities` (`jsonb`) pada `OUTLET` yang aktif.



---

## Endpoints

### 1. Tenants

#### List Tenants

```http
GET /api/tenants

```

Headers:

```http
Authorization: Bearer <token>

```

Query Parameters:

| Param | Type | Required | Keterangan |
| --- | --- | --- | --- |
| `page` | number | no | Halaman (default `1`)

 |
| `limit` | number | no | Item per halaman (default `10`)

 |
| `search` | string | no | Pencarian berdasarkan `name` atau `code`

 |

Response `200 OK`:

```json
{
  "message": "Tenants retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Kreasi Nusantara Grup",
      "code": "KNG-01",
      "status": "active",
      "created_at": "2026-11-21T08:00:00Z",
      "updated_at": "2026-11-21T08:00:00Z"
    }
  ]
}

```

#### Create Tenant

```http
POST /api/tenants

```

Headers:

```http
Authorization: Bearer <token>

```

Request Body:

```json
{
  "name": "Kreasi Nusantara Grup",
  "code": "KNG-01",
  "status": "active"
}

```

Validation Rules:

| Field | Rules |
| --- | --- |
| `name` | `required,min=3,max=150` |
| `code` | `required,min=2,max=50` |
| `status` | `omitempty,oneof=active inactive` |

Response `201 Created`:

```json
{
  "message": "Tenant created successfully",
  "data": {
    "id": 1,
    "name": "Kreasi Nusantara Grup",
    "code": "KNG-01",
    "status": "active",
    "created_at": "2026-11-21T08:00:00Z",
    "updated_at": "2026-11-21T08:00:00Z"
  }
}

```

#### Get Tenant by ID

```http
GET /api/tenants/:id

```

Headers:

```http
Authorization: Bearer <token>

```

Path Parameters:

| Param | Type | Required | Keterangan |
| --- | --- | --- | --- |
| `id` | uint | yes | ID tenant |

Response `200 OK`:

```json
{
  "message": "Tenant retrieved successfully",
  "data": {
    "id": 1,
    "name": "Kreasi Nusantara Grup",
    "code": "KNG-01",
    "status": "active",
    "created_at": "2026-11-21T08:00:00Z",
    "updated_at": "2026-11-21T08:00:00Z"
  }
}

```

#### Update Tenant

```http
PATCH /api/tenants/:id

```

Headers:

```http
Authorization: Bearer <token>

```

Request Body:

```json
{
  "name": "Kreasi Nusantara Sejahtera",
  "status": "active"
}

```

Validation Rules:

| Field | Rules |
| --- | --- |
| `name` | `omitempty,min=3,max=150` |
| `status` | `omitempty,oneof=active inactive` |

Response `200 OK`:

```json
{
  "message": "Tenant updated successfully",
  "data": {
    "id": 1,
    "name": "Kreasi Nusantara Sejahtera",
    "code": "KNG-01",
    "status": "active",
    "created_at": "2026-11-21T08:00:00Z",
    "updated_at": "2026-11-21T09:00:00Z"
  }
}

```

#### Delete Tenant

```http
DELETE /api/tenants/:id

```

Headers:

```http
Authorization: Bearer <token>

```

Response `200 OK`:

```json
{
  "message": "Tenant deleted successfully",
  "data": null
}

```

---

### 2. Outlets & Capability Flags

#### List Outlets

```http
GET /api/outlets

```

Headers:

```http
Authorization: Bearer <token>

```

Query Parameters:

| Param | Type | Required | Keterangan |
| --- | --- | --- | --- |
| `page` | number | no | Halaman (default `1`)

 |
| `limit` | number | no | Item per halaman (default `10`)

 |
| `search` | string | no | Pencarian berdasarkan `name` atau `address`

 |
| `tenant_id` | uint | no | Filter berdasarkan ID tenant |

Response `200 OK`:

```json
{
  "message": "Outlets retrieved successfully",
  "data": [
    {
      "id": 2,
      "tenant_id": 1,
      "name": "Outlet Cetak & Sablon Diponegoro",
      "address": "Jl. Diponegoro No. 18",
      "capabilities": {
        "enable_variants": true,
        "enable_modifiers": true,
        "enable_dimension_pricing": true,
        "enable_tiered_pricing": true,
        "enable_order_workflow": true,
        "enable_partial_payment": true
      },
      "default_connection_mode": "online",
      "created_at": "2026-11-21T08:00:00Z",
      "updated_at": "2026-11-21T08:00:00Z"
    }
  ]
}

```

#### Create Outlet

```http
POST /api/outlets

```

Headers:

```http
Authorization: Bearer <token>

```

Request Body:

```json
{
  "tenant_id": 1,
  "name": "Outlet Cetak & Sablon Diponegoro",
  "address": "Jl. Diponegoro No. 18",
  "capabilities": {
    "enable_variants": true,
    "enable_modifiers": true,
    "enable_dimension_pricing": true,
    "enable_tiered_pricing": true,
    "enable_order_workflow": true,
    "enable_partial_payment": true
  },
  "default_connection_mode": "online"
}

```

Validation Rules:

| Field | Rules |
| --- | --- |
| `tenant_id` | `required,gt=0` |
| `name` | `required,min=3,max=150` |
| `address` | `required,min=3` |
| `capabilities` | `omitempty` |
| `default_connection_mode` | `omitempty,oneof=online offline` |

Response `201 Created`:

```json
{
  "message": "Outlet created successfully",
  "data": {
    "id": 2,
    "tenant_id": 1,
    "name": "Outlet Cetak & Sablon Diponegoro",
    "address": "Jl. Diponegoro No. 18",
    "capabilities": {
      "enable_variants": true,
      "enable_modifiers": true,
      "enable_dimension_pricing": true,
      "enable_tiered_pricing": true,
      "enable_order_workflow": true,
      "enable_partial_payment": true
    },
    "default_connection_mode": "online",
    "created_at": "2026-11-21T08:00:00Z",
    "updated_at": "2026-11-21T08:00:00Z"
  }
}

```

#### Get Outlet by ID

```http
GET /api/outlets/:id

```

Headers:

```http
Authorization: Bearer <token>

```

Response `200 OK`:

```json
{
  "message": "Outlet retrieved successfully",
  "data": {
    "id": 2,
    "tenant_id": 1,
    "name": "Outlet Cetak & Sablon Diponegoro",
    "address": "Jl. Diponegoro No. 18",
    "capabilities": {
      "enable_variants": true,
      "enable_modifiers": true,
      "enable_dimension_pricing": true,
      "enable_tiered_pricing": true,
      "enable_order_workflow": true,
      "enable_partial_payment": true
    },
    "default_connection_mode": "online",
    "created_at": "2026-11-21T08:00:00Z",
    "updated_at": "2026-11-21T08:00:00Z"
  }
}

```

#### Update Outlet

```http
PATCH /api/outlets/:id

```

Headers:

```http
Authorization: Bearer <token>

```

Request Body:

```json
{
  "name": "Outlet Cetak & Sablon Diponegoro Utama",
  "address": "Jl. Diponegoro No. 18B",
  "default_connection_mode": "online"
}

```

Validation Rules:

| Field | Rules |
| --- | --- |
| `name` | `omitempty,min=3,max=150` |
| `address` | `omitempty,min=3` |
| `default_connection_mode` | `omitempty,oneof=online offline` |

Response `200 OK`:

```json
{
  "message": "Outlet updated successfully",
  "data": {
    "id": 2,
    "tenant_id": 1,
    "name": "Outlet Cetak & Sablon Diponegoro Utama",
    "address": "Jl. Diponegoro No. 18B",
    "capabilities": {
      "enable_variants": true,
      "enable_modifiers": true,
      "enable_dimension_pricing": true,
      "enable_tiered_pricing": true,
      "enable_order_workflow": true,
      "enable_partial_payment": true
    },
    "default_connection_mode": "online",
    "created_at": "2026-11-21T08:00:00Z",
    "updated_at": "2026-11-21T09:10:00Z"
  }
}

```

#### Update Outlet Capabilities

```http
PATCH /api/outlets/:id/capabilities

```

Headers:

```http
Authorization: Bearer <token>

```

Request Body:

```json
{
  "capabilities": {
    "enable_variants": true,
    "enable_modifiers": true,
    "enable_dimension_pricing": true,
    "enable_tiered_pricing": true,
    "enable_order_workflow": true,
    "enable_partial_payment": true,
    "enable_staff_commission": true
  }
}

```

Validation Rules:

| Field | Rules |
| --- | --- |
| `capabilities` | `required` |

Response `200 OK`:

```json
{
  "message": "Outlet capabilities updated successfully",
  "data": {
    "id": 2,
    "capabilities": {
      "enable_variants": true,
      "enable_modifiers": true,
      "enable_dimension_pricing": true,
      "enable_tiered_pricing": true,
      "enable_order_workflow": true,
      "enable_partial_payment": true,
      "enable_staff_commission": true
    }
  }
}

```

#### Capability Registry

```http
GET /api/capabilities

```

Headers:

```http
Authorization: Bearer <token>

```

Response `200 OK`:

```json
{
  "message": "Capabilities retrieved successfully",
  "data": [
    { "key": "enable_variants", "label": "Varian Produk", "description": "Ukuran, warna, jenis", "default": false },
    { "key": "enable_modifiers", "label": "Modifier / Tambahan", "description": "Topping, finishing, catatan", "default": false },
    { "key": "enable_dimension_pricing", "label": "Harga Dimensi", "description": "Hitung per luas / ukuran", "default": false },
    { "key": "enable_tiered_pricing", "label": "Harga Bertingkat", "description": "Harga turun berdasarkan qty", "default": false },
    { "key": "enable_order_workflow", "label": "Alur Pesanan", "description": "Antrean → proses → siap → selesai", "default": false },
    { "key": "enable_partial_payment", "label": "DP / Pelunasan", "description": "Pembayaran bertahap", "default": false },
    { "key": "enable_staff_commission", "label": "Komisi Staf", "description": "Perhitungan komisi operator (PTH)", "default": false }
  ]
}

```

Registry adalah sumber metadata capability; klien merender flag dari daftar ini sehingga penambahan capability baru tidak memerlukan perubahan UI.

#### Get Outlet Access

```http
GET /api/outlets/:id/access

```

Response `200 OK`:

```json
{
  "message": "Outlet access retrieved successfully",
  "data": {
    "outlet_id": 2,
    "role": "cashier",
    "is_global_admin": false
  }
}

```

`role` bernilai `admin` (platform admin), `owner`, `manager`, `cashier`, atau `operator`. Non-member menerima `403 Forbidden`.

#### Delete Outlet

```http
DELETE /api/outlets/:id

```

Headers:

```http
Authorization: Bearer <token>

```

Response `200 OK`:

```json
{
  "message": "Outlet deleted successfully",
  "data": null
}

```

---

### 3. Outlet Members (Role & Access)

#### List Outlet Members

```http
GET /api/outlets/:outlet_id/members

```

Headers:

```http
Authorization: Bearer <token>

```

Query Parameters:

| Param | Type | Required | Keterangan |
| --- | --- | --- | --- |
| `page` | number | no | Halaman (default `1`)

 |
| `limit` | number | no | Item per halaman (default `10`)

 |
| `outlet_role` | string | no | Filter role (`owner`, `manager`, `cashier`, `operator`) |

Response `200 OK`:

```json
{
  "message": "Outlet members retrieved successfully",
  "data": [
    {
      "id": 4,
      "outlet_id": 2,
      "user_id": 2,
      "outlet_role": "cashier",
      "is_active": true,
      "created_at": "2026-11-21T08:00:00Z",
      "updated_at": "2026-11-21T08:00:00Z"
    }
  ]
}

```

#### Assign Outlet Member

```http
POST /api/outlets/:outlet_id/members

```

Headers:

```http
Authorization: Bearer <token>

```

Request Body:

```json
{
  "user_id": 3,
  "outlet_role": "operator",
  "is_active": true
}

```

Validation Rules:

| Field | Rules |
| --- | --- |
| `user_id` | `required,gt=0` |
| `outlet_role` | `required,oneof=owner manager cashier operator` |
| `is_active` | `omitempty` |

Response `201 Created`:

```json
{
  "message": "Outlet member assigned successfully",
  "data": {
    "id": 5,
    "outlet_id": 2,
    "user_id": 3,
    "outlet_role": "operator",
    "is_active": true,
    "created_at": "2026-11-21T08:05:00Z",
    "updated_at": "2026-11-21T08:05:00Z"
  }
}

```

#### Update Outlet Member

```http
PATCH /api/outlets/:outlet_id/members/:member_id

```

Headers:

```http
Authorization: Bearer <token>

```

Request Body:

```json
{
  "outlet_role": "cashier",
  "is_active": true
}

```

Validation Rules:

| Field | Rules |
| --- | --- |
| `outlet_role` | `omitempty,oneof=owner manager cashier operator` |
| `is_active` | `omitempty` |

Response `200 OK`:

```json
{
  "message": "Outlet member updated successfully",
  "data": {
    "id": 5,
    "outlet_id": 2,
    "user_id": 3,
    "outlet_role": "cashier",
    "is_active": true,
    "created_at": "2026-11-21T08:05:00Z",
    "updated_at": "2026-11-21T09:15:00Z"
  }
}

```

#### Remove Outlet Member

```http
DELETE /api/outlets/:outlet_id/members/:member_id

```

Headers:

```http
Authorization: Bearer <token>

```

Response `200 OK`:

```json
{
  "message": "Outlet member removed successfully",
  "data": null
}

```

---

### 4. Products & Product Variants

#### List Products

```http
GET /api/products

```

Headers:

```http
Authorization: Bearer <token>

```

Query Parameters:

| Param | Type | Required | Keterangan |
| --- | --- | --- | --- |
| `page` | number | no | Halaman (default `1`)

 |
| `limit` | number | no | Item per halaman (default `10`)

 |
| `search` | string | no | Pencarian `name`, `sku`, atau `category`

 |
| `outlet_id` | uint | yes | ID outlet |
| `pricing_type` | string | no | Filter `fixed`, `dimension`, atau `tiered` |

Response `200 OK`:

```json
{
  "message": "Products retrieved successfully",
  "data": [
    {
      "id": 2,
      "outlet_id": 2,
      "name": "Cetak Banner Flexi 280gr",
      "sku": "BNR-280",
      "category": "Percetakan",
      "pricing_type": "dimension",
      "base_price": 25000,
      "track_inventory": true,
      "stock_qty": 120,
      "min_stock_qty": 20,
      "pricing_rules": {
        "unit": "m",
        "min_area": 1
      },
      "modifiers_config": [
        { "name": "Mata Ayam", "price": 2000 },
        { "name": "Laminasi Glossy", "price": 5000 }
      ],
      "created_at": "2026-11-21T08:00:00Z",
      "updated_at": "2026-11-21T08:00:00Z"
    }
  ]
}

```

#### Create Product

```http
POST /api/products

```

Headers:

```http
Authorization: Bearer <token>

```

Request Body:

```json
{
  "outlet_id": 2,
  "name": "Cetak Banner Flexi 280gr",
  "sku": "BNR-280",
  "category": "Percetakan",
  "pricing_type": "dimension",
  "base_price": 25000,
  "track_inventory": true,
  "stock_qty": 120,
  "min_stock_qty": 20,
  "pricing_rules": {
    "unit": "m",
    "min_area": 1
  },
  "modifiers_config": [
    { "name": "Mata Ayam", "price": 2000 },
    { "name": "Laminasi Glossy", "price": 5000 }
  ],
  "commission_type": "percent",
  "commission_value": 2
}

```

Validation Rules:

| Field | Rules |
| --- | --- |
| `outlet_id` | `required,gt=0` |
| `name` | `required,min=2,max=200` |
| `sku` | `required,min=2,max=80` |
| `category` | `required,min=2,max=100` |
| `pricing_type` | `required,oneof=fixed dimension tiered` |
| `base_price` | `required,gte=0` |
| `track_inventory` | `required` |
| `stock_qty` | `gte=0` |
| `min_stock_qty` | `gte=0` |
| `commission_type` | `omitempty,oneof=none percent fixed` |
| `commission_value` | `gte=0` |

Response `201 Created`:

```json
{
  "message": "Product created successfully",
  "data": {
    "id": 2,
    "outlet_id": 2,
    "name": "Cetak Banner Flexi 280gr",
    "sku": "BNR-280",
    "category": "Percetakan",
    "pricing_type": "dimension",
    "base_price": 25000,
    "track_inventory": true,
    "stock_qty": 120,
    "min_stock_qty": 20,
    "pricing_rules": {
      "unit": "m",
      "min_area": 1
    },
    "modifiers_config": [
      { "name": "Mata Ayam", "price": 2000 },
      { "name": "Laminasi Glossy", "price": 5000 }
    ],
    "commission_type": "percent",
    "commission_value": 2,
    "created_at": "2026-11-21T08:10:00Z",
    "updated_at": "2026-11-21T08:10:00Z"
  }
}

```

#### Get Product by ID

```http
GET /api/products/:id

```

Headers:

```http
Authorization: Bearer <token>

```

Response `200 OK`:

```json
{
  "message": "Product retrieved successfully",
  "data": {
    "id": 1,
    "outlet_id": 1,
    "name": "Kaos Polos Cotton 24s",
    "sku": "KPS-24S",
    "category": "Clothing",
    "pricing_type": "tiered",
    "base_price": 45000,
    "track_inventory": true,
    "stock_qty": 0,
    "min_stock_qty": 10,
    "pricing_rules": {
      "tiers": [
        { "min_qty": 1, "max_qty": 11, "price": 45000 },
        { "min_qty": 12, "max_qty": 999, "price": 40000 }
      ]
    },
    "modifiers_config": [],
    "created_at": "2026-11-21T08:00:00Z",
    "updated_at": "2026-11-21T08:00:00Z"
  }
}

```

#### Update Product

```http
PATCH /api/products/:id

```

Headers:

```http
Authorization: Bearer <token>

```

Request Body:

```json
{
  "name": "Kaos Polos Cotton Combed 24s",
  "base_price": 46000,
  "min_stock_qty": 15
}

```

Validation Rules:

| Field | Rules |
| --- | --- |
| `name` | `omitempty,min=2,max=200` |
| `sku` | `omitempty,min=2,max=80` |
| `category` | `omitempty,min=2,max=100` |
| `pricing_type` | `omitempty,oneof=fixed dimension tiered` |
| `base_price` | `omitempty,gte=0` |
| `min_stock_qty` | `omitempty,gte=0` |

Response `200 OK`:

```json
{
  "message": "Product updated successfully",
  "data": {
    "id": 1,
    "outlet_id": 1,
    "name": "Kaos Polos Cotton Combed 24s",
    "sku": "KPS-24S",
    "category": "Clothing",
    "pricing_type": "tiered",
    "base_price": 46000,
    "track_inventory": true,
    "stock_qty": 0,
    "min_stock_qty": 15,
    "created_at": "2026-11-21T08:00:00Z",
    "updated_at": "2026-11-21T09:20:00Z"
  }
}

```

#### Delete Product

```http
DELETE /api/products/:id

```

Headers:

```http
Authorization: Bearer <token>

```

Response `200 OK`:

```json
{
  "message": "Product deleted successfully",
  "data": null
}

```

#### List Product Variants

```http
GET /api/products/:product_id/variants

```

Headers:

```http
Authorization: Bearer <token>

```

Response `200 OK`:

```json
{
  "message": "Product variants retrieved successfully",
  "data": [
    {
      "id": 1,
      "product_id": 1,
      "name": "Hitam - L",
      "sku": "KPS-24S-BLK-L",
      "barcode": "899100200101",
      "price_override": null,
      "stock_qty": 25,
      "created_at": "2026-11-21T08:00:00Z",
      "updated_at": "2026-11-21T08:00:00Z"
    }
  ]
}

```

#### Create Product Variant

```http
POST /api/products/:product_id/variants

```

Headers:

```http
Authorization: Bearer <token>

```

Request Body:

```json
{
  "name": "Putih - XL",
  "sku": "KPS-24S-WHT-XL",
  "barcode": "899100200102",
  "price_override": 50000,
  "stock_qty": 8
}

```

Validation Rules:

| Field | Rules |
| --- | --- |
| `name` | `required,min=1,max=150` |
| `sku` | `required,min=2,max=100` |
| `barcode` | `omitempty,max=100` |
| `price_override` | `omitempty,gte=0` |
| `stock_qty` | `gte=0` |

Response `201 Created`:

```json
{
  "message": "Product variant created successfully",
  "data": {
    "id": 2,
    "product_id": 1,
    "name": "Putih - XL",
    "sku": "KPS-24S-WHT-XL",
    "barcode": "899100200102",
    "price_override": 50000,
    "stock_qty": 8,
    "created_at": "2026-11-21T08:15:00Z",
    "updated_at": "2026-11-21T08:15:00Z"
  }
}

```

#### Update Product Variant

```http
PATCH /api/products/:product_id/variants/:variant_id

```

Headers:

```http
Authorization: Bearer <token>

```

Request Body:

```json
{
  "name": "Putih - XXL",
  "price_override": 52000,
  "barcode": "899100200103"
}

```

Validation Rules:

| Field | Rules |
| --- | --- |
| `name` | `omitempty,min=1,max=150` |
| `sku` | `omitempty,min=2,max=100` |
| `barcode` | `omitempty,max=100` |
| `price_override` | `omitempty,gte=0` |

Response `200 OK`:

```json
{
  "message": "Product variant updated successfully",
  "data": {
    "id": 2,
    "product_id": 1,
    "name": "Putih - XXL",
    "sku": "KPS-24S-WHT-XL",
    "barcode": "899100200103",
    "price_override": 52000,
    "stock_qty": 8,
    "created_at": "2026-11-21T08:15:00Z",
    "updated_at": "2026-11-21T09:25:00Z"
  }
}

```

#### Delete Product Variant

```http
DELETE /api/products/:product_id/variants/:variant_id

```

Headers:

```http
Authorization: Bearer <token>

```

Response `200 OK`:

```json
{
  "message": "Product variant deleted successfully",
  "data": null
}

```

---

### 5. Stock Movements

#### List Stock Movements

```http
GET /api/stock-movements

```

Headers:

```http
Authorization: Bearer <token>

```

Query Parameters:

| Param | Type | Required | Keterangan |
| --- | --- | --- | --- |
| `page` | number | no | Halaman (default `1`)

 |
| `limit` | number | no | Item per halaman (default `10`)

 |
| `outlet_id` | uint | yes | ID outlet |
| `product_id` | uint | no | Filter ID produk |
| `movement_type` | string | no | Filter `stock_in`, `stock_out`, `sale`, `adjustment`, `sync_reconcile` |

Response `200 OK`:

```json
{
  "message": "Stock movements retrieved successfully",
  "data": [
    {
      "id": 1,
      "outlet_id": 2,
      "product_id": 2,
      "variant_id": null,
      "user_id": 2,
      "movement_type": "sale",
      "qty_change": -8,
      "reference_type": "order",
      "reference_id": "ORD-20261121-0001",
      "note": "Pemakaian bahan banner 2 pcs x 4m2 (disinkronkan dari mode offline)",
      "created_at": "2026-11-21T09:18:10Z",
      "updated_at": "2026-11-21T09:18:10Z"
    }
  ]
}

```

#### Create Stock Movement

```http
POST /api/stock-movements

```

Headers:

```http
Authorization: Bearer <token>

```

Request Body:

```json
{
  "outlet_id": 2,
  "product_id": 2,
  "variant_id": null,
  "movement_type": "stock_in",
  "qty_change": 50,
  "reference_type": "manual",
  "reference_id": "IN-20261121-01",
  "note": "Restok gulungan flexi baru"
}

```

Validation Rules:

| Field | Rules |
| --- | --- |
| `outlet_id` | `required,gt=0` |
| `product_id` | `required,gt=0` |
| `variant_id` | `omitempty,gt=0` |
| `movement_type` | `required,oneof=stock_in stock_out sale adjustment sync_reconcile` |
| `qty_change` | `required,ne=0` |
| `reference_type` | `omitempty,max=30` |
| `reference_id` | `omitempty,max=100` |
| `note` | `omitempty` |

Response `201 Created`:

```json
{
  "message": "Stock movement recorded successfully",
  "data": {
    "id": 2,
    "outlet_id": 2,
    "product_id": 2,
    "variant_id": null,
    "user_id": 1,
    "movement_type": "stock_in",
    "qty_change": 50,
    "reference_type": "manual",
    "reference_id": "IN-20261121-01",
    "note": "Restok gulungan flexi baru",
    "created_at": "2026-11-21T09:30:00Z",
    "updated_at": "2026-11-21T09:30:00Z"
  }
}

```

---

### 6. Cash Shifts

#### List Cash Shifts

```http
GET /api/cash-shifts

```

Headers:

```http
Authorization: Bearer <token>

```

Query Parameters:

| Param | Type | Required | Keterangan |
| --- | --- | --- | --- |
| `page` | number | no | Halaman (default `1`)

 |
| `limit` | number | no | Item per halaman (default `10`)

 |
| `outlet_id` | uint | yes | ID outlet |
| `status` | string | no | Filter `open` atau `closed` |

Response `200 OK`:

```json
{
  "message": "Cash shifts retrieved successfully",
  "data": [
    {
      "id": 1,
      "outlet_id": 2,
      "user_id": 2,
      "status": "open",
      "opening_cash": 300000,
      "expected_cash": 550000,
      "closing_cash": null,
      "cash_difference": null,
      "opened_at": "2026-11-21T08:00:00+07:00",
      "closed_at": null,
      "created_at": "2026-11-21T08:00:00+07:00",
      "updated_at": "2026-11-21T09:18:10+07:00"
    }
  ]
}

```

#### Open Cash Shift

```http
POST /api/cash-shifts/open

```

Headers:

```http
Authorization: Bearer <token>

```

Request Body:

```json
{
  "outlet_id": 2,
  "opening_cash": 300000
}

```

Validation Rules:

| Field | Rules |
| --- | --- |
| `outlet_id` | `required,gt=0` |
| `opening_cash` | `required,gte=0` |

Response `201 Created`:

```json
{
  "message": "Cash shift opened successfully",
  "data": {
    "id": 1,
    "outlet_id": 2,
    "user_id": 2,
    "status": "open",
    "opening_cash": 300000,
    "expected_cash": 300000,
    "closing_cash": null,
    "cash_difference": null,
    "opened_at": "2026-11-21T08:00:00+07:00",
    "closed_at": null,
    "created_at": "2026-11-21T08:00:00+07:00",
    "updated_at": "2026-11-21T08:00:00+07:00"
  }
}

```

#### Get Cash Shift by ID

```http
GET /api/cash-shifts/:id

```

Headers:

```http
Authorization: Bearer <token>

```

Response `200 OK`:

```json
{
  "message": "Cash shift retrieved successfully",
  "data": {
    "id": 1,
    "outlet_id": 2,
    "user_id": 2,
    "status": "open",
    "opening_cash": 300000,
    "expected_cash": 550000,
    "closing_cash": null,
    "cash_difference": null,
    "opened_at": "2026-11-21T08:00:00+07:00",
    "closed_at": null,
    "created_at": "2026-11-21T08:00:00+07:00",
    "updated_at": "2026-11-21T09:18:10+07:00"
  }
}

```

#### Close Cash Shift

```http
POST /api/cash-shifts/:id/close

```

Headers:

```http
Authorization: Bearer <token>

```

Request Body:

```json
{
  "closing_cash": 550000
}

```

Validation Rules:

| Field | Rules |
| --- | --- |
| `closing_cash` | `required,gte=0` |

Response `200 OK`:

```json
{
  "message": "Cash shift closed successfully",
  "data": {
    "id": 1,
    "outlet_id": 2,
    "user_id": 2,
    "status": "closed",
    "opening_cash": 300000,
    "expected_cash": 550000,
    "closing_cash": 550000,
    "cash_difference": 0,
    "opened_at": "2026-11-21T08:00:00+07:00",
    "closed_at": "2026-11-21T10:30:00+07:00",
    "created_at": "2026-11-21T08:00:00+07:00",
    "updated_at": "2026-11-21T10:30:00+07:00"
  }
}

```

---

### 7. Orders, Order Items & Payments

#### List Orders

```http
GET /api/orders

```

Headers:

```http
Authorization: Bearer <token>

```

Query Parameters:

| Param | Type | Required | Keterangan |
| --- | --- | --- | --- |
| `page` | number | no | Halaman (default `1`)

 |
| `limit` | number | no | Item per halaman (default `10`)

 |
| `search` | string | no | Pencarian `order_number` atau `customer_name`

 |
| `outlet_id` | uint | yes | ID outlet |
| `order_status` | string | no | Filter `queued`, `in_progress`, `ready`, `completed`, `cancelled` |
| `payment_status` | string | no | Filter `unpaid`, `partial`, `paid` |

Response `200 OK`:

```json
{
  "message": "Orders retrieved successfully",
  "data": [
    {
      "id": 1,
      "outlet_id": 2,
      "shift_id": 1,
      "cashier_user_id": 2,
      "client_sync_id": "sync-ord-9001-abc",
      "order_number": "ORD-20261121-0001",
      "customer_name": "Budi Santoso",
      "order_status": "in_progress",
      "payment_status": "partial",
      "subtotal_amount": 250000,
      "total_amount": 250000,
      "paid_amount": 150000,
      "is_offline_created": true,
      "client_created_at": "2026-11-21T09:15:00+07:00",
      "synced_at": "2026-11-21T09:18:10+07:00",
      "meta_data": {
        "channel": "walk_in",
        "design_file": "spanduk_grand_opening.pdf"
      },
      "items": [
        {
          "id": 1,
          "order_id": 1,
          "product_id": 2,
          "variant_id": null,
          "item_name_snapshot": "Cetak Banner Flexi 280gr",
          "qty": 2,
          "unit_price": 125000,
          "subtotal": 250000,
          "meta_data": {
            "width": 4,
            "height": 1,
            "area": 4,
            "unit": "m",
            "modifiers": ["Mata Ayam", "Laminasi Glossy"]
          }
        }
      ],
      "payments": [
        {
          "id": 1,
          "order_id": 1,
          "shift_id": 1,
          "received_by_user_id": 2,
          "client_payment_id": "sync-pay-9001-1",
          "payment_type": "down_payment",
          "payment_method": "cash",
          "amount": 150000,
          "paid_at": "2026-11-21T09:15:05+07:00",
          "note": "DP awal saat order masuk"
        }
      ],
      "created_at": "2026-11-21T09:18:10+07:00",
      "updated_at": "2026-11-21T09:18:10+07:00"
    }
  ]
}

```

#### Create Order

```http
POST /api/orders

```

Headers:

```http
Authorization: Bearer <token>

```

Request Body:

```json
{
  "outlet_id": 2,
  "shift_id": 1,
  "client_sync_id": "sync-ord-9002-def",
  "customer_name": "Rina Kusuma",
  "order_status": "queued",
  "discount_percent": 5,
  "discount_amount": 10000,
  "tax_percent": 11,
  "meta_data": {
    "channel": "walk_in",
    "design_file": "kaos_komunitas_v2.png"
  },
  "items": [
    {
      "product_id": 3,
      "variant_id": null,
      "qty": 10,
      "unit_price": 43000,
      "meta_data": {
        "modifiers": ["Sablon DTF A3", "Lengan Panjang"]
      }
    }
  ],
  "initial_payment": {
    "client_payment_id": "sync-pay-9002-1",
    "payment_type": "down_payment",
    "payment_method": "qris",
    "amount": 200000,
    "note": "DP 46%"
  }
}

```

Validation Rules:

| Field | Rules |
| --- | --- |
| `outlet_id` | `required,gt=0` |
| `shift_id` | `omitempty,gt=0` |
| `client_sync_id` | `required,min=3,max=100` |
| `customer_name` | `omitempty,max=150` |
| `order_status` | `omitempty,oneof=queued in_progress ready completed cancelled` |
| `discount_percent` | `gte=0,lte=100` |
| `discount_amount` | `gte=0` |
| `tax_percent` | `gte=0,lte=100` |
| `items` | `required,min=1,dive` |
| `items.*.product_id` | `required,gt=0` |
| `items.*.variant_id` | `omitempty,gt=0` |
| `items.*.qty` | `required,gt=0` |
| `items.*.unit_price` | `required,gte=0` |
| `initial_payment.client_payment_id` | `required_with=initial_payment,min=3,max=100` |
| `initial_payment.payment_type` | `required_with=initial_payment,oneof=full down_payment settlement` |
| `initial_payment.payment_method` | `required_with=initial_payment,min=2,max=30` |
| `initial_payment.amount` | `required_with=initial_payment,gt=0` |

Response `201 Created`:

```json
{
  "message": "Order created successfully",
  "data": {
    "id": 2,
    "outlet_id": 2,
    "shift_id": 1,
    "cashier_user_id": 2,
    "client_sync_id": "sync-ord-9002-def",
    "order_number": "ORD-20261121-0002",
    "customer_name": "Rina Kusuma",
    "order_status": "queued",
    "payment_status": "partial",
    "subtotal_amount": 430000,
    "discount_percent": 5,
    "discount_amount": 31500,
    "tax_percent": 11,
    "tax_amount": 43835,
    "total_amount": 442335,
    "paid_amount": 200000,
    "is_offline_created": false,
    "created_at": "2026-11-21T09:40:00+07:00",
    "updated_at": "2026-11-21T09:40:00+07:00"
  }
}

```

#### Get Order by ID

```http
GET /api/orders/:id

```

Headers:

```http
Authorization: Bearer <token>

```

Response `200 OK`:

```json
{
  "message": "Order retrieved successfully",
  "data": {
    "id": 1,
    "outlet_id": 2,
    "shift_id": 1,
    "cashier_user_id": 2,
    "client_sync_id": "sync-ord-9001-abc",
    "order_number": "ORD-20261121-0001",
    "customer_name": "Budi Santoso",
    "order_status": "in_progress",
    "payment_status": "partial",
    "subtotal_amount": 250000,
    "total_amount": 250000,
    "paid_amount": 150000,
    "is_offline_created": true,
    "created_at": "2026-11-21T09:18:10+07:00",
    "updated_at": "2026-11-21T09:18:10+07:00"
  }
}

```

#### Update Order Status

```http
PATCH /api/orders/:id/status

```

Headers:

```http
Authorization: Bearer <token>

```

Request Body:

```json
{
  "order_status": "ready"
}

```

Validation Rules:

| Field | Rules |
| --- | --- |
| `order_status` | `required,oneof=queued in_progress ready completed cancelled` |

Response `200 OK`:

```json
{
  "message": "Order status updated successfully",
  "data": {
    "id": 1,
    "order_status": "ready",
    "payment_status": "partial",
    "updated_at": "2026-11-21T09:50:00+07:00"
  }
}

```

#### Add Order Payment (DP / Pelunasan)

```http
POST /api/orders/:id/payments

```

Headers:

```http
Authorization: Bearer <token>

```

Request Body:

```json
{
  "shift_id": 1,
  "client_payment_id": "sync-pay-9001-2",
  "payment_type": "settlement",
  "payment_method": "cash",
  "amount": 100000,
  "note": "Pelunasan sisa tagihan saat pengambilan"
}

```

Validation Rules:

| Field | Rules |
| --- | --- |
| `shift_id` | `omitempty,gt=0` |
| `client_payment_id` | `required,min=3,max=100` |
| `payment_type` | `required,oneof=full down_payment settlement` |
| `payment_method` | `required,min=2,max=30` |
| `amount` | `required,gt=0` |
| `note` | `omitempty` |

Response `201 Created`:

```json
{
  "message": "Order payment recorded successfully",
  "data": {
    "payment": {
      "id": 2,
      "order_id": 1,
      "shift_id": 1,
      "received_by_user_id": 2,
      "client_payment_id": "sync-pay-9001-2",
      "payment_type": "settlement",
      "payment_method": "cash",
      "amount": 100000,
      "paid_at": "2026-11-21T10:00:00+07:00",
      "note": "Pelunasan sisa tagihan saat pengambilan"
    },
    "order": {
      "id": 1,
      "total_amount": 250000,
      "paid_amount": 250000,
      "payment_status": "paid"
    }
  }
}

```

#### Delete Order

```http
DELETE /api/orders/:id

```

Headers:

```http
Authorization: Bearer <token>

```

Response `200 OK`:

```json
{
  "message": "Order deleted successfully",
  "data": null
}

```

---

### 8. Offline Sync Batch

#### Sync Offline Orders & Payments

```http
POST /api/sync/orders

```

Headers:

```http
Authorization: Bearer <token>

```

Request Body:

```json
{
  "outlet_id": 2,
  "orders": [
    {
      "shift_id": 1,
      "client_sync_id": "sync-ord-9001-abc",
      "customer_name": "Budi Santoso",
      "order_status": "in_progress",
      "client_created_at": "2026-11-21T09:15:00+07:00",
      "meta_data": {
        "channel": "walk_in",
        "design_file": "spanduk_grand_opening.pdf"
      },
      "items": [
        {
          "product_id": 2,
          "variant_id": null,
          "qty": 2,
          "unit_price": 125000,
          "meta_data": {
            "width": 4,
            "height": 1,
            "area": 4,
            "unit": "m",
            "modifiers": ["Mata Ayam", "Laminasi Glossy"]
          }
        }
      ],
      "payments": [
        {
          "shift_id": 1,
          "client_payment_id": "sync-pay-9001-1",
          "payment_type": "down_payment",
          "payment_method": "cash",
          "amount": 150000,
          "paid_at": "2026-11-21T09:15:05+07:00",
          "note": "DP awal saat order masuk"
        }
      ]
    }
  ]
}

```

Validation Rules:

| Field | Rules |
| --- | --- |
| `outlet_id` | `required,gt=0` |
| `orders` | `required,min=1,dive` |
| `orders.*.client_sync_id` | `required,min=3,max=100` |
| `orders.*.client_created_at` | `required` |
| `orders.*.items` | `required,min=1,dive` |
| `orders.*.items.*.product_id` | `required,gt=0` |
| `orders.*.items.*.qty` | `required,gt=0` |
| `orders.*.items.*.unit_price` | `required,gte=0` |

Response `200 OK`:

```json
{
  "message": "Offline orders synced successfully",
  "data": {
    "synced_count": 1,
    "duplicate_count": 0,
    "orders": [
      {
        "id": 1,
        "client_sync_id": "sync-ord-9001-abc",
        "order_number": "ORD-20261121-0001",
        "payment_status": "partial",
        "paid_amount": 150000,
        "synced_at": "2026-11-21T09:18:10+07:00"
      }
    ]
  }
}

```

---

### 9. Customers

Data pelanggan per outlet (NTH: catatan pelanggan & riwayat pesanan).

#### List Customers

```http
GET /api/customers?outlet_id=2&search=budi&page=1&limit=10

```

Query Parameters: `outlet_id` (optional), `search` (nama/telepon/email), `page`, `limit`.

Response `200 OK`:

```json
{
  "message": "Customers retrieved successfully",
  "data": [
    {
      "id": 1,
      "outlet_id": 2,
      "name": "Budi Santoso",
      "phone": "081200000001",
      "email": "budi@example.com",
      "address": "Jl. Sudirman",
      "note": "VIP",
      "created_at": "2026-11-21T08:00:00Z",
      "updated_at": "2026-11-21T08:00:00Z"
    }
  ]
}

```

#### Create Customer

```http
POST /api/customers

```

Request Body:

```json
{
  "outlet_id": 2,
  "name": "Budi Santoso",
  "phone": "081200000001",
  "email": "budi@example.com",
  "address": "Jl. Sudirman",
  "note": "VIP"
}

```

Validation Rules:

| Field | Rules |
| --- | --- |
| `outlet_id` | `required` |
| `name` | `required,min=2,max=150` |
| `phone` | `omitempty,max=30` |
| `email` | `omitempty,email,max=150` |

Response `201 Created`:

```json
{
  "message": "Customer created successfully",
  "data": { "id": 1, "outlet_id": 2, "name": "Budi Santoso" }
}

```

#### Get Customer by ID

```http
GET /api/customers/:id

```

#### Update Customer

```http
PATCH /api/customers/:id

```

```json
{
  "name": "Budi S.",
  "phone": "081200000001",
  "email": "budi@example.com",
  "address": "Jl. Sudirman",
  "note": "Updated note"
}

```

#### Delete Customer

```http
DELETE /api/customers/:id

```

#### Customer pada Order

`POST /api/orders` dan `POST /api/sync/orders` menerima `customer_id` opsional.
Server memvalidasi pelanggan berada pada outlet yang sama dan mengisi
`customer_name` dari data pelanggan bila nama tidak dikirim. Riwayat pesanan
pelanggan dapat difilter dengan `GET /api/orders?customer_id=<id>`.

---

### 10. Receipt Settings

#### Get Receipt Settings

```http
GET /api/outlets/:outlet_id/receipt-settings

```

Mengembalikan pengaturan yang tersimpan, atau default (`paper_size=58mm`,
semua flag tampilan `true`) bila belum ada.

Response `200 OK`:

```json
{
  "message": "Receipt settings retrieved successfully",
  "data": {
    "outlet_id": 2,
    "header": "Kreasi Nusantara - Cetak & Sablon",
    "footer": "Terima kasih",
    "show_customer": true,
    "show_cashier": true,
    "show_payment_details": true,
    "paper_size": "80mm",
    "tax_label": "NPWP",
    "tax_number": "01.234.567.8-901.000"
  }
}

```

#### Update Receipt Settings

```http
PUT /api/outlets/:outlet_id/receipt-settings

```

Akses: `owner` / `manager` outlet (global admin juga diizinkan).

Request Body:

```json
{
  "header": "Kreasi Nusantara - Cetak & Sablon",
  "footer": "Terima kasih",
  "show_customer": true,
  "show_cashier": true,
  "show_payment_details": true,
  "paper_size": "80mm",
  "tax_label": "NPWP",
  "tax_number": "01.234.567.8-901.000"
}

```

Validation: `paper_size` (`omitempty,oneof=58mm 80mm A4`).

---

### 11. Reports

Laporan lintas outlet. Akses: `owner` / `manager` outlet (global admin melihat semua).
Parameter `from`/`to` memakai format `YYYY-MM-DD`; `outlet_id` opsional.

#### Sales Summary

```http
GET /api/reports/summary?from=2026-11-01&to=2026-11-21&outlet_id=2

```

Response `200 OK`:

```json
{
  "message": "Report summary retrieved successfully",
  "data": {
    "from": "2026-11-01",
    "to": "2026-11-21",
    "totals": {
      "orders_count": 3,
      "revenue": 95000,
      "paid_amount": 95000,
      "outstanding": 0,
      "offline_orders": 1,
      "average_order_value": 31666.67
    },
    "by_outlet": [
      {
        "outlet_id": 2,
        "outlet_name": "Cetak & Sablon",
        "orders_count": 2,
        "revenue": 50000,
        "paid_amount": 50000,
        "outstanding": 0,
        "offline_orders": 1
      }
    ],
    "by_payment_method": [
      { "payment_method": "cash", "amount": 95000, "count": 3 }
    ],
    "daily": [
      { "date": "2026-11-21", "orders_count": 3, "revenue": 95000 }
    ]
  }
}

```

#### Staff Commissions

```http
GET /api/reports/commissions?from=2026-11-01&to=2026-11-21&outlet_id=2

```

Response `200 OK`:

```json
{
  "message": "Commission report retrieved successfully",
  "data": {
    "from": "2026-11-01",
    "to": "2026-11-21",
    "total": 9000,
    "by_staff": [
      {
        "user_id": 1,
        "user_name": "Administrator",
        "orders_count": 1,
        "commission_amount": 9000
      }
    ]
  }
}

```

Komisi dihitung server-side saat order dibuat, hanya jika capability `enable_staff_commission`
aktif pada outlet. Produk dengan `commission_type = percent` memakai persentase dari subtotal item;
`fixed` memakai nominal per unit. Komisi diatribusikan ke `cashier_user_id` order.

#### Sync Reconciliation

```http
GET /api/reports/reconciliation?from=2026-11-01&to=2026-11-21

```

Response `200 OK`:

```json
{
  "message": "Reconciliation report retrieved successfully",
  "data": {
    "from": "2026-11-01",
    "to": "2026-11-21",
    "offline_orders": 1,
    "online_orders": 2,
    "synced_offline_orders": 1,
    "offline_revenue": 25000,
    "recent_offline": [
      {
        "id": 10,
        "order_number": "ORD-20261121-AB12CD",
        "outlet_id": 2,
        "outlet_name": "Cetak & Sablon",
        "client_created_at": "2026-11-21T09:15:00Z",
        "synced_at": "2026-11-21T09:18:10Z",
        "total_amount": 25000,
        "payment_status": "paid"
      }
    ]
  }
}

```

---

### 12. Health

#### Health Check

```http
GET /api/health

```

Endpoint publik (tanpa JWT) yang dipakai frontend untuk mendeteksi ketersediaan server
pada mode offline. Jika endpoint ini gagal/404, frontend menganggap koneksi terputus.

Response `200 OK`:

```json
{
  "message": "OK",
  "data": { "status": "ok" }
}

```

---

### 13. Users

Endpoint pendukung untuk memilih pengguna saat menetapkan anggota outlet (dipakai form anggota outlet,
alih-alih meminta `user_id` mentah).

#### Search Users

```http
GET /api/users/search?search=budi&limit=20

```

Query Parameters: `search` (nama, username, atau email; opsional), `limit` (default 20, maksimum 50).

Akses: global admin **atau** pengguna yang memiliki minimal satu outlet yang dapat dikelola.
Selain itu respons `403`.

Response `200 OK`:

```json
{
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": 3,
      "full_name": "Budi Santoso",
      "username": "budi",
      "email": "budi@example.com"
    }
  ]
}

```

---

## HTTP Status Codes

| Code | Keterangan |
| --- | --- |
| `200` | OK — Request berhasil

 |
| `201` | Created — Resource berhasil dibuat

 |
| `400` | Bad Request — Validasi gagal atau format payload tidak sesuai

 |
| `401` | Unauthorized — JWT token tidak ada, tidak valid, atau kedaluwarsa

 |
| `403` | Forbidden — User tidak memiliki akses ke outlet/role atau capability tidak aktif

 |
| `404` | Not Found — Resource tidak ditemukan

 |
| `500` | Internal Server Error

 |

---

## Response Format

```json
// Success (single / list)
{
  "message": "Pesan deskriptif",
  "data": { ... }
}

// Error
{
  "message": "Pesan error yang jelas"
}

```
