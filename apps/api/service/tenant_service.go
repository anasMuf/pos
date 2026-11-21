package service

import (
	"api/dto"
	"api/model"
	"api/repository"
)

type TenantService struct {
	repo *repository.Repository[model.Tenant]
}

func NewTenantService(repo *repository.Repository[model.Tenant]) *TenantService {
	return &TenantService{repo: repo}
}

func (s *TenantService) List(page, limit int, search string, tenantIDs []uint) ([]model.Tenant, int64, error) {
	page, limit = normalizePagination(page, limit)
	if len(tenantIDs) == 0 {
		return []model.Tenant{}, 0, nil
	}
	q := s.repo.Query().Where("id IN ?", tenantIDs)
	if search != "" {
		like := "%" + search + "%"
		q = q.Where("name ILIKE ? OR code ILIKE ?", like, like)
	}
	q = q.Order("id DESC")
	return s.repo.Paginate(q, page, limit)
}

func (s *TenantService) Get(id uint) (*model.Tenant, error) {
	return s.repo.FindByID(id)
}

func (s *TenantService) Create(req dto.CreateTenantRequest) (*model.Tenant, error) {
	tenant := &model.Tenant{
		Name:   req.Name,
		Code:   req.Code,
		Status: req.Status,
	}
	if tenant.Status == "" {
		tenant.Status = "active"
	}
	if err := s.repo.Create(tenant); err != nil {
		return nil, err
	}
	return tenant, nil
}

func (s *TenantService) Update(id uint, req dto.UpdateTenantRequest) (*model.Tenant, error) {
	tenant, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if req.Name != "" {
		tenant.Name = req.Name
	}
	if req.Status != "" {
		tenant.Status = req.Status
	}
	if err := s.repo.Save(tenant); err != nil {
		return nil, err
	}
	return tenant, nil
}

func (s *TenantService) Delete(id uint) error {
	_, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}
	return s.repo.Delete(id)
}
