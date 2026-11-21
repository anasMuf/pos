package service

import (
	"api/dto"
	"api/model"
	"api/repository"
)

type OutletService struct {
	repo *repository.Repository[model.Outlet]
}

func NewOutletService(repo *repository.Repository[model.Outlet]) *OutletService {
	return &OutletService{repo: repo}
}

func (s *OutletService) List(page, limit int, search string, tenantID uint, allowedOutletIDs []uint) ([]model.Outlet, int64, error) {
	page, limit = normalizePagination(page, limit)
	if len(allowedOutletIDs) == 0 {
		return []model.Outlet{}, 0, nil
	}
	q := s.repo.Query().Where("id IN ?", allowedOutletIDs)
	if tenantID > 0 {
		q = q.Where("tenant_id = ?", tenantID)
	}
	if search != "" {
		like := "%" + search + "%"
		q = q.Where("name ILIKE ? OR address ILIKE ?", like, like)
	}
	q = q.Order("id DESC")
	return s.repo.Paginate(q, page, limit)
}

func (s *OutletService) Get(id uint) (*model.Outlet, error) {
	return s.repo.FindByID(id)
}

func (s *OutletService) Create(req dto.CreateOutletRequest) (*model.Outlet, error) {
	caps := defaultCapabilities()
	if req.Capabilities != nil {
		caps = *req.Capabilities
	}
	mode := req.DefaultConnectionMode
	if mode == "" {
		mode = "online"
	}
	outlet := &model.Outlet{
		TenantID:              req.TenantID,
		Name:                  req.Name,
		Address:               req.Address,
		Capabilities:          caps,
		DefaultConnectionMode: mode,
	}
	if err := s.repo.Create(outlet); err != nil {
		return nil, err
	}
	return outlet, nil
}

func (s *OutletService) Update(id uint, req dto.UpdateOutletRequest) (*model.Outlet, error) {
	outlet, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if req.Name != "" {
		outlet.Name = req.Name
	}
	if req.Address != "" {
		outlet.Address = req.Address
	}
	if req.DefaultConnectionMode != "" {
		outlet.DefaultConnectionMode = req.DefaultConnectionMode
	}
	if err := s.repo.Save(outlet); err != nil {
		return nil, err
	}
	return outlet, nil
}

func (s *OutletService) UpdateCapabilities(id uint, caps model.Capabilities) (*model.Outlet, error) {
	outlet, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	outlet.Capabilities = caps
	if err := s.repo.Save(outlet); err != nil {
		return nil, err
	}
	return outlet, nil
}

func (s *OutletService) Delete(id uint) error {
	if _, err := s.repo.FindByID(id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}
