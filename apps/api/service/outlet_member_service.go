package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"errors"
)

type OutletMemberService struct {
	repo *repository.Repository[model.OutletMember]
}

func NewOutletMemberService(repo *repository.Repository[model.OutletMember]) *OutletMemberService {
	return &OutletMemberService{repo: repo}
}

func (s *OutletMemberService) List(outletID uint) ([]model.OutletMember, error) {
	var members []model.OutletMember
	err := s.repo.Query().Where("outlet_id = ?", outletID).Order("id ASC").Find(&members).Error
	return members, err
}

func (s *OutletMemberService) find(outletID, memberID uint) (*model.OutletMember, error) {
	member, err := s.repo.FindByID(memberID)
	if err != nil || member.OutletID != outletID {
		return nil, errors.New("outlet member not found")
	}
	return member, nil
}

func (s *OutletMemberService) Assign(outletID uint, req dto.AssignOutletMemberRequest) (*model.OutletMember, error) {
	var existing model.OutletMember
	err := s.repo.Query().Where("outlet_id = ? AND user_id = ?", outletID, req.UserID).First(&existing).Error
	if err == nil {
		return nil, errors.New("user is already a member of this outlet")
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	member := &model.OutletMember{
		OutletID:   outletID,
		UserID:     req.UserID,
		OutletRole: req.OutletRole,
		IsActive:   isActive,
	}
	if err := s.repo.Create(member); err != nil {
		return nil, err
	}
	return member, nil
}

func (s *OutletMemberService) Update(outletID, memberID uint, req dto.UpdateOutletMemberRequest) (*model.OutletMember, error) {
	member, err := s.find(outletID, memberID)
	if err != nil {
		return nil, err
	}
	if req.OutletRole != "" {
		member.OutletRole = req.OutletRole
	}
	if req.IsActive != nil {
		member.IsActive = *req.IsActive
	}
	if err := s.repo.Save(member); err != nil {
		return nil, err
	}
	return member, nil
}

func (s *OutletMemberService) Remove(outletID, memberID uint) error {
	if _, err := s.find(outletID, memberID); err != nil {
		return err
	}
	return s.repo.Delete(memberID)
}
