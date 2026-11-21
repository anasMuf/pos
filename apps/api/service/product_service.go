package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"errors"
)

type ProductService struct {
	repo        *repository.Repository[model.Product]
	variantRepo *repository.Repository[model.ProductVariant]
}

func NewProductService(repo *repository.Repository[model.Product], variantRepo *repository.Repository[model.ProductVariant]) *ProductService {
	return &ProductService{repo: repo, variantRepo: variantRepo}
}

func (s *ProductService) List(page, limit int, search string, outletID uint, category string, allowedOutletIDs []uint) ([]model.Product, int64, error) {
	page, limit = normalizePagination(page, limit)
	if len(allowedOutletIDs) == 0 {
		return []model.Product{}, 0, nil
	}
	q := s.repo.Query().Where("outlet_id IN ?", allowedOutletIDs)
	if outletID > 0 {
		q = q.Where("outlet_id = ?", outletID)
	}
	if category != "" {
		q = q.Where("category = ?", category)
	}
	if search != "" {
		like := "%" + search + "%"
		q = q.Where("name ILIKE ? OR sku ILIKE ?", like, like)
	}
	q = q.Order("id DESC")
	return s.repo.Paginate(q, page, limit)
}

func (s *ProductService) Get(id uint) (*model.Product, error) {
	return s.repo.FindByID(id)
}

func (s *ProductService) Create(req dto.CreateProductRequest) (*model.Product, error) {
	trackInventory := true
	if req.TrackInventory != nil {
		trackInventory = *req.TrackInventory
	}
	product := &model.Product{
		OutletID:        req.OutletID,
		Name:            req.Name,
		SKU:             req.SKU,
		Category:        req.Category,
		PricingType:     req.PricingType,
		BasePrice:       req.BasePrice,
		TrackInventory:  trackInventory,
		StockQty:        req.StockQty,
		MinStockQty:     req.MinStockQty,
		PricingRules:    jsonOr(req.PricingRules, "{}"),
		ModifiersConfig: jsonOr(req.ModifiersConfig, "[]"),
		CommissionType:  normalizeCommissionType(req.CommissionType),
		CommissionValue: req.CommissionValue,
	}
	if err := s.repo.Create(product); err != nil {
		return nil, err
	}
	return product, nil
}

func (s *ProductService) Update(id uint, req dto.UpdateProductRequest) (*model.Product, error) {
	product, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if req.Name != "" {
		product.Name = req.Name
	}
	if req.SKU != "" {
		product.SKU = req.SKU
	}
	if req.Category != "" {
		product.Category = req.Category
	}
	if req.PricingType != "" {
		product.PricingType = req.PricingType
	}
	if req.BasePrice != nil {
		product.BasePrice = *req.BasePrice
	}
	if req.TrackInventory != nil {
		product.TrackInventory = *req.TrackInventory
	}
	if req.MinStockQty != nil {
		product.MinStockQty = *req.MinStockQty
	}
	if len(req.PricingRules) > 0 && string(req.PricingRules) != "null" {
		product.PricingRules = req.PricingRules
	}
	if len(req.ModifiersConfig) > 0 && string(req.ModifiersConfig) != "null" {
		product.ModifiersConfig = req.ModifiersConfig
	}
	if req.CommissionType != "" {
		product.CommissionType = normalizeCommissionType(req.CommissionType)
	}
	if req.CommissionValue != nil {
		product.CommissionValue = *req.CommissionValue
	}
	if err := s.repo.Save(product); err != nil {
		return nil, err
	}
	return product, nil
}

func normalizeCommissionType(value string) string {
	switch value {
	case "percent", "fixed":
		return value
	default:
		return "none"
	}
}

func (s *ProductService) Delete(id uint) error {
	if _, err := s.repo.FindByID(id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}

func (s *ProductService) ListVariants(productID uint) ([]model.ProductVariant, error) {
	var variants []model.ProductVariant
	err := s.variantRepo.Query().Where("product_id = ?", productID).Order("id ASC").Find(&variants).Error
	return variants, err
}

func (s *ProductService) CreateVariant(productID uint, req dto.CreateProductVariantRequest) (*model.ProductVariant, error) {
	if _, err := s.repo.FindByID(productID); err != nil {
		return nil, err
	}
	price := 0.0
	if req.PriceOverride != nil {
		price = *req.PriceOverride
	}
	variant := &model.ProductVariant{
		ProductID:     productID,
		Name:          req.Name,
		SKU:           req.SKU,
		Barcode:       req.Barcode,
		PriceOverride: price,
		StockQty:      req.StockQty,
	}
	if err := s.variantRepo.Create(variant); err != nil {
		return nil, err
	}
	return variant, nil
}

func (s *ProductService) findVariant(productID, variantID uint) (*model.ProductVariant, error) {
	variant, err := s.variantRepo.FindByID(variantID)
	if err != nil || variant.ProductID != productID {
		return nil, errors.New("product variant not found")
	}
	return variant, nil
}

func (s *ProductService) UpdateVariant(productID, variantID uint, req dto.UpdateProductVariantRequest) (*model.ProductVariant, error) {
	variant, err := s.findVariant(productID, variantID)
	if err != nil {
		return nil, err
	}
	if req.Name != "" {
		variant.Name = req.Name
	}
	if req.SKU != "" {
		variant.SKU = req.SKU
	}
	if req.Barcode != "" {
		variant.Barcode = req.Barcode
	}
	if req.PriceOverride != nil {
		variant.PriceOverride = *req.PriceOverride
	}
	if req.StockQty != nil {
		variant.StockQty = *req.StockQty
	}
	if err := s.variantRepo.Save(variant); err != nil {
		return nil, err
	}
	return variant, nil
}

func (s *ProductService) DeleteVariant(productID, variantID uint) error {
	if _, err := s.findVariant(productID, variantID); err != nil {
		return err
	}
	return s.variantRepo.Delete(variantID)
}
