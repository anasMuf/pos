package service

import (
	"api/dto"
	"api/model"
	"api/repository"
)

type CustomerService struct {
	repo *repository.Repository[model.Customer]
}

func NewCustomerService(repo *repository.Repository[model.Customer]) *CustomerService {
	return &CustomerService{repo: repo}
}

func (s *CustomerService) List(page, limit int, outletID uint, search string, allowedOutletIDs []uint) ([]model.Customer, int64, error) {
	page, limit = normalizePagination(page, limit)
	if len(allowedOutletIDs) == 0 {
		return []model.Customer{}, 0, nil
	}

	q := s.repo.Query().Where("outlet_id IN ?", allowedOutletIDs)
	if outletID > 0 {
		q = q.Where("outlet_id = ?", outletID)
	}
	if search != "" {
		like := "%" + search + "%"
		q = q.Where("name ILIKE ? OR phone ILIKE ? OR email ILIKE ?", like, like, like)
	}
	q = q.Order("name ASC")
	return s.repo.Paginate(q, page, limit)
}

func (s *CustomerService) Get(id uint) (*model.Customer, error) {
	return s.repo.FindByID(id)
}

func (s *CustomerService) Create(req dto.CreateCustomerRequest) (*model.Customer, error) {
	customer := &model.Customer{
		OutletID: req.OutletID,
		Name:     req.Name,
		Phone:    req.Phone,
		Email:    req.Email,
		Address:  req.Address,
		Note:     req.Note,
	}
	if err := s.repo.Create(customer); err != nil {
		return nil, err
	}
	return customer, nil
}

func (s *CustomerService) Update(id uint, req dto.UpdateCustomerRequest) (*model.Customer, error) {
	customer, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if req.Name != "" {
		customer.Name = req.Name
	}
	if req.Phone != "" {
		customer.Phone = req.Phone
	}
	if req.Email != "" {
		customer.Email = req.Email
	}
	if req.Address != "" {
		customer.Address = req.Address
	}
	if req.Note != "" {
		customer.Note = req.Note
	}
	if err := s.repo.Save(customer); err != nil {
		return nil, err
	}
	return customer, nil
}

func (s *CustomerService) Delete(id uint) error {
	if _, err := s.repo.FindByID(id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}
