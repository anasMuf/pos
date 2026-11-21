import { useState } from 'react';
import { FormField } from '../../../components/molecules/FormField';
import { Button } from '../../../components/atoms/Button';
import { useToast } from '../../../components/molecules/Toast';
import { usePostUsersRegister, type postUsersRegisterResponse } from '../../../api/endpoints/users/users';
import { ApiError } from '../../../api/mutator/custom-instance';
import { PASSWORD_STRENGTH_LABEL, passwordStrength } from '../../../lib/password';

interface RegisterFormState {
  full_name: string;
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  phone: string;
  address: string;
}

type RegisterErrors = Partial<Record<keyof RegisterFormState, string>>;

const EMPTY_FORM: RegisterFormState = {
  full_name: '',
  username: '',
  email: '',
  password: '',
  confirm_password: '',
  phone: '',
  address: '',
};

const STRENGTH_TONE = {
  weak: 'bg-red-500',
  medium: 'bg-amber-500',
  strong: 'bg-emerald-500',
} as const;

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const { addToast } = useToast();
  const [formData, setFormData] = useState<RegisterFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<RegisterErrors>({});

  const registerMutation = usePostUsersRegister({
    mutation: {
      onSuccess: (response: postUsersRegisterResponse) => {
        if (response.status === 201) {
          addToast({ variant: 'success', title: 'Akun dibuat', message: 'Silakan masuk dengan akun baru Anda.' });
          onSuccess();
        } else if (response.status === 400 && 'message' in response.data) {
          addToast({ variant: 'error', title: 'Pendaftaran gagal', message: response.data.message || 'Periksa kembali data Anda.' });
        }
      },
      onError: (error: Error) => {
        const message = error instanceof ApiError
          ? error.message
          : 'Terjadi kesalahan. Silakan coba lagi.';
        addToast({ variant: 'error', title: 'Pendaftaran gagal', message });
      }
    }
  });

  const validate = () => {
    const next: RegisterErrors = {};
    if (formData.full_name.trim().length < 3) next.full_name = 'Nama lengkap minimal 3 karakter.';
    if (formData.username.trim().length < 3) next.username = 'Nama pengguna minimal 3 karakter.';
    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) next.email = 'Masukkan email yang valid.';
    if (!formData.phone.trim()) next.phone = 'Telepon wajib diisi.';
    if (!formData.address.trim()) next.address = 'Alamat wajib diisi.';
    if (formData.password.length < 6) next.password = 'Kata sandi minimal 6 karakter.';
    if (formData.confirm_password !== formData.password) {
      next.confirm_password = 'Konfirmasi kata sandi tidak sama.';
    }
    setErrors(next);
    const firstInvalid = Object.keys(next)[0];
    if (firstInvalid) document.getElementById(firstInvalid)?.focus();
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    registerMutation.mutate({
      data: {
        full_name: formData.full_name.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim(),
        address: formData.address.trim(),
      },
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name in errors) setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  };

  const strength = passwordStrength(formData.password);

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
        <FormField
          id="full_name" name="full_name" type="text" label="Nama lengkap"
          autoComplete="name"
          onChange={handleChange} error={errors.full_name} required maxLength={100}
        />
        <FormField
          id="username" name="username" type="text" label="Nama pengguna"
          autoComplete="username"
          onChange={handleChange} error={errors.username} required maxLength={50}
        />
      </div>

      <FormField
        id="email" name="email" type="email" label="Email"
        autoComplete="email"
        onChange={handleChange} error={errors.email} required maxLength={100}
      />

      <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
        <FormField
          id="phone" name="phone" type="tel" label="Telepon"
          autoComplete="tel"
          onChange={handleChange} error={errors.phone} required maxLength={15}
        />
        <FormField
          id="address" name="address" type="text" label="Alamat"
          autoComplete="street-address"
          onChange={handleChange} error={errors.address} required
        />
      </div>

      <div>
        <FormField
          id="password" name="password" type="password" label="Kata sandi"
          autoComplete="new-password"
          onChange={handleChange} error={errors.password} required minLength={6} maxLength={100}
        />
        {formData.password && (
          <div className="mt-2" aria-live="polite">
            <div className="flex gap-1" aria-hidden="true">
              {(['weak', 'medium', 'strong'] as const).map((level, index) => (
                <span
                  key={level}
                  className={`h-1 flex-1 rounded ${
                    index <= (['weak', 'medium', 'strong'] as const).indexOf(strength)
                      ? STRENGTH_TONE[strength]
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-600">
              Kekuatan kata sandi: <span className="font-semibold">{PASSWORD_STRENGTH_LABEL[strength]}</span>
            </p>
          </div>
        )}
      </div>

      <FormField
        id="confirm_password" name="confirm_password" type="password" label="Konfirmasi kata sandi"
        autoComplete="new-password"
        onChange={handleChange} error={errors.confirm_password} required maxLength={100}
      />

      <Button
        type="submit"
        className="w-full"
        disabled={registerMutation.isPending}
      >
        {registerMutation.isPending ? 'Membuat akun...' : 'Buat akun'}
      </Button>
    </form>
  );
}
