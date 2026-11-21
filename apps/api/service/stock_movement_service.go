package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"errors"

	"gorm.io/gorm"
)

type StockMovementService struct {
	db          *gorm.DB
	repo        *repository.Repository[model.StockMovement]
	productRepo *repository.Repository[model.Product]
	variantRepo *repository.Repository[model.ProductVariant]
}

func NewStockMovementService(
	db *gorm.DB,
	repo *repository.Repository[model.StockMovement],
	productRepo *repository.Repository[model.Product],
	variantRepo *repository.Repository[model.ProductVariant],
) *StockMovementService {
	return &StockMovementService{db: db, repo: repo, productRepo: productRepo, variantRepo: variantRepo}
}

func (s *StockMovementService) List(page, limit int, outletID, productID uint, movementType string, allowedOutletIDs []uint) ([]model.StockMovement, int64, error) {
	page, limit = normalizePagination(page, limit)
	if len(allowedOutletIDs) == 0 {
		return []model.StockMovement{}, 0, nil
	}
	q := s.repo.Query().Where("outlet_id IN ?", allowedOutletIDs)
	if outletID > 0 {
		q = q.Where("outlet_id = ?", outletID)
	}
	if productID > 0 {
		q = q.Where("product_id = ?", productID)
	}
	if movementType != "" {
		q = q.Where("movement_type = ?", movementType)
	}
	q = q.Order("id DESC")
	return s.repo.Paginate(q, page, limit)
}

func (s *StockMovementService) Create(req dto.CreateStockMovementRequest, userID uint) (*model.StockMovement, error) {
	if _, err := s.productRepo.FindByID(req.ProductID); err != nil {
		return nil, err
	}
	if req.VariantID > 0 {
		variant, err := s.variantRepo.FindByID(req.VariantID)
		if err != nil || variant.ProductID != req.ProductID {
			return nil, errors.New("product variant not found")
		}
	}

	movement := &model.StockMovement{
		OutletID:      req.OutletID,
		ProductID:     req.ProductID,
		VariantID:     req.VariantID,
		UserID:        userID,
		MovementType:  req.MovementType,
		QtyChange:     req.QtyChange,
		ReferenceType: req.ReferenceType,
		ReferenceID:   req.ReferenceID,
		Note:          req.Note,
	}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(movement).Error; err != nil {
			return err
		}
		return applyStockDelta(tx, req.ProductID, req.VariantID, req.QtyChange)
	})
	if err != nil {
		return nil, err
	}
	return movement, nil
}

// applyStockDelta adjusts product (and variant when present) stock atomically.
func applyStockDelta(tx *gorm.DB, productID, variantID uint, delta float64) error {
	if err := tx.Model(&model.Product{}).Where("id = ?", productID).
		UpdateColumn("stock_qty", gorm.Expr("stock_qty + ?", delta)).Error; err != nil {
		return err
	}
	if variantID > 0 {
		if err := tx.Model(&model.ProductVariant{}).Where("id = ?", variantID).
			UpdateColumn("stock_qty", gorm.Expr("stock_qty + ?", delta)).Error; err != nil {
			return err
		}
	}
	return nil
}
