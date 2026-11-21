package repository

import "gorm.io/gorm"

// Repository is a thin generic GORM data-access layer shared by all entities.
type Repository[T any] struct {
	DB *gorm.DB
}

func NewRepository[T any](db *gorm.DB) *Repository[T] {
	return &Repository[T]{DB: db}
}

// Query returns a new scoped query for building entity-specific filters.
func (r *Repository[T]) Query() *gorm.DB {
	return r.DB.Model(new(T))
}

func (r *Repository[T]) FindByID(id uint) (*T, error) {
	var entity T
	if err := r.DB.First(&entity, id).Error; err != nil {
		return nil, err
	}
	return &entity, nil
}

func (r *Repository[T]) Create(entity *T) error {
	return r.DB.Create(entity).Error
}

func (r *Repository[T]) Save(entity *T) error {
	return r.DB.Save(entity).Error
}

func (r *Repository[T]) Delete(id uint) error {
	return r.DB.Delete(new(T), id).Error
}

// Paginate counts and fetches a page from the supplied scoped query.
func (r *Repository[T]) Paginate(query *gorm.DB, page, limit int) ([]T, int64, error) {
	var total int64
	if err := query.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var entities []T
	offset := (page - 1) * limit
	if err := query.Session(&gorm.Session{}).Offset(offset).Limit(limit).Find(&entities).Error; err != nil {
		return nil, 0, err
	}
	return entities, total, nil
}
