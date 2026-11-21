package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"errors"
	"time"

	"gorm.io/gorm"
)

type CashShiftService struct {
	db   *gorm.DB
	repo *repository.Repository[model.CashShift]
}

func NewCashShiftService(db *gorm.DB, repo *repository.Repository[model.CashShift]) *CashShiftService {
	return &CashShiftService{db: db, repo: repo}
}

func (s *CashShiftService) List(page, limit int, outletID uint, status string, allowedOutletIDs []uint) ([]model.CashShift, int64, error) {
	page, limit = normalizePagination(page, limit)
	if len(allowedOutletIDs) == 0 {
		return []model.CashShift{}, 0, nil
	}
	q := s.repo.Query().Where("outlet_id IN ?", allowedOutletIDs)
	if outletID > 0 {
		q = q.Where("outlet_id = ?", outletID)
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}
	q = q.Order("id DESC")
	return s.repo.Paginate(q, page, limit)
}

func (s *CashShiftService) Get(id uint) (*model.CashShift, error) {
	return s.repo.FindByID(id)
}

func (s *CashShiftService) Open(req dto.OpenCashShiftRequest, userID uint) (*model.CashShift, error) {
	var existing model.CashShift
	err := s.repo.Query().
		Where("outlet_id = ? AND user_id = ? AND status = ?", req.OutletID, userID, "open").
		First(&existing).Error
	if err == nil {
		return nil, errors.New("there is already an open shift for this outlet")
	}
	shift := &model.CashShift{
		OutletID:     req.OutletID,
		UserID:       userID,
		Status:       "open",
		OpeningCash:  req.OpeningCash,
		ExpectedCash: req.OpeningCash,
		OpenedAt:     time.Now(),
	}
	if err := s.repo.Create(shift); err != nil {
		return nil, err
	}
	return shift, nil
}

func (s *CashShiftService) Close(id uint, closingCash float64) (*model.CashShift, error) {
	shift, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if shift.Status == "closed" {
		return nil, errors.New("shift is already closed")
	}

	var cashReceived float64
	if err := s.db.Model(&model.OrderPayment{}).
		Where("shift_id = ? AND payment_method = ?", id, "cash").
		Select("COALESCE(SUM(amount), 0)").Scan(&cashReceived).Error; err != nil {
		return nil, err
	}

	now := time.Now()
	expected := shift.OpeningCash + cashReceived
	shift.ExpectedCash = expected
	shift.ClosingCash = closingCash
	shift.CashDifference = closingCash - expected
	shift.Status = "closed"
	shift.ClosedAt = &now

	if err := s.repo.Save(shift); err != nil {
		return nil, err
	}
	return shift, nil
}
