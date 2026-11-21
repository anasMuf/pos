package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"errors"

	"gorm.io/gorm"
)

type ReceiptSettingService struct {
	repo *repository.Repository[model.ReceiptSetting]
}

func NewReceiptSettingService(repo *repository.Repository[model.ReceiptSetting]) *ReceiptSettingService {
	return &ReceiptSettingService{repo: repo}
}

func defaultReceiptSetting(outletID uint) *model.ReceiptSetting {
	return &model.ReceiptSetting{
		OutletID:           outletID,
		ShowCustomer:       true,
		ShowCashier:        true,
		ShowPaymentDetails: true,
		PaperSize:          "58mm",
	}
}

// GetByOutlet returns persisted settings or sensible defaults when none exist.
func (s *ReceiptSettingService) GetByOutlet(outletID uint) (*model.ReceiptSetting, error) {
	var setting model.ReceiptSetting
	err := s.repo.Query().Where("outlet_id = ?", outletID).First(&setting).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return defaultReceiptSetting(outletID), nil
	}
	if err != nil {
		return nil, err
	}
	return &setting, nil
}

func (s *ReceiptSettingService) Upsert(outletID uint, req dto.UpdateReceiptSettingRequest) (*model.ReceiptSetting, error) {
	var setting model.ReceiptSetting
	err := s.repo.Query().Where("outlet_id = ?", outletID).First(&setting).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		setting = *defaultReceiptSetting(outletID)
	} else if err != nil {
		return nil, err
	}

	if req.Header != "" {
		setting.Header = req.Header
	}
	if req.Footer != "" {
		setting.Footer = req.Footer
	}
	if req.ShowCustomer != nil {
		setting.ShowCustomer = *req.ShowCustomer
	}
	if req.ShowCashier != nil {
		setting.ShowCashier = *req.ShowCashier
	}
	if req.ShowPaymentDetails != nil {
		setting.ShowPaymentDetails = *req.ShowPaymentDetails
	}
	if req.PaperSize != "" {
		setting.PaperSize = req.PaperSize
	}
	if req.TaxLabel != "" {
		setting.TaxLabel = req.TaxLabel
	}
	if req.TaxNumber != "" {
		setting.TaxNumber = req.TaxNumber
	}

	if setting.ID == 0 {
		err = s.repo.Create(&setting)
	} else {
		err = s.repo.Save(&setting)
	}
	if err != nil {
		return nil, err
	}
	return &setting, nil
}
