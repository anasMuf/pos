import { useEffect, useState } from 'react';
import { useCreateCustomer } from '../../api/queries';
import { Button } from '../../components/atoms/Button';
import { FieldError } from '../../components/atoms/FieldError';
import { Input } from '../../components/atoms/Input';
import { Label } from '../../components/atoms/Label';
import { useToast } from '../../components/molecules/Toast';
import type { Customer } from '../../api/types';

interface QuickCustomerForm {
  name: string;
  phone: string;
  email: string;
}

type QuickCustomerErrors = Partial<Record<keyof QuickCustomerForm, string>>;

/**
 * Minimal "add customer" dialog for the cashier flow. Creating a customer from
 * POS must not discard the in-progress cart, so it stays a modal instead of a
 * dedicated route.
 */
export function QuickCustomerModal({
  outletId,
  onClose,
  onCreated,
}: {
  outletId: number;
  onClose: () => void;
  onCreated: (customer: Customer) => void;
}) {
  const { addToast } = useToast();
  const createCustomer = useCreateCustomer();
  const [form, setForm] = useState<QuickCustomerForm>({ name: '', phone: '', email: '' });
  const [errors, setErrors] = useState<QuickCustomerErrors>({});

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const setField = (key: keyof QuickCustomerForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in errors) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next: QuickCustomerErrors = {};
    if (form.name.trim().length < 2) next.name = 'Nama pelanggan minimal 2 karakter.';
    if (form.phone.trim() && !/^\d{8,15}$/.test(form.phone.trim())) {
      next.phone = 'Telepon hanya angka, 8–15 digit.';
    }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      next.email = 'Masukkan email yang valid.';
    }
    setErrors(next);
    const firstInvalid = Object.keys(next)[0];
    if (firstInvalid) document.getElementById(`quick-customer-${firstInvalid}`)?.focus();
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    try {
      const customer = await createCustomer.mutateAsync({
        outlet_id: outletId,
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      addToast({ variant: 'success', title: 'Pelanggan ditambahkan', message: customer.name });
      onCreated(customer);
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Gagal menambah pelanggan',
        message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-customer-title"
        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <h3 id="quick-customer-title" className="text-base font-semibold text-gray-900">
            Pelanggan Baru
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3" noValidate>
          <div>
            <Label htmlFor="quick-customer-name">Nama</Label>
            <Input
              id="quick-customer-name"
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
              className="mt-1"
              maxLength={100}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'quick-customer-name-error' : undefined}
            />
            <FieldError id="quick-customer-name-error" message={errors.name} />
          </div>
          <div>
            <Label htmlFor="quick-customer-phone">Telepon (opsional)</Label>
            <Input
              id="quick-customer-phone"
              type="tel"
              value={form.phone}
              onChange={(event) => setField('phone', event.target.value)}
              className="mt-1"
              maxLength={15}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'quick-customer-phone-error' : undefined}
            />
            <FieldError id="quick-customer-phone-error" message={errors.phone} />
          </div>
          <div>
            <Label htmlFor="quick-customer-email">Email (opsional)</Label>
            <Input
              id="quick-customer-email"
              type="email"
              value={form.email}
              onChange={(event) => setField('email', event.target.value)}
              className="mt-1"
              maxLength={100}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'quick-customer-email-error' : undefined}
            />
            <FieldError id="quick-customer-email-error" message={errors.email} />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="flex-1" disabled={createCustomer.isPending}>
              {createCustomer.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
