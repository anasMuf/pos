import { useState } from 'react';
import { FormField } from '../../../components/molecules/FormField';
import { Button } from '../../../components/atoms/Button';
import { useToast } from '../../../components/molecules/Toast';
import { usePostUsersLogin, type postUsersLoginResponse } from '../../../api/endpoints/users/users';
import { ApiError } from '../../../api/mutator/custom-instance';
import { useAuth } from '../AuthContext';

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { login } = useAuth();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const loginMutation = usePostUsersLogin({
    mutation: {
      onSuccess: (response: postUsersLoginResponse) => {
        if (response.status === 200 && response.data.token) {
          login(response.data.token);
          addToast({ variant: 'success', title: 'Berhasil masuk', message: 'Selamat datang kembali.' });
          onSuccess();
        }
      },
      onError: (error: Error) => {
        const message = error instanceof ApiError
          ? error.message
          : 'Terjadi kesalahan. Silakan coba lagi.';
        addToast({ variant: 'error', title: 'Gagal masuk', message });
      }
    }
  });

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    if (!formData.email.trim()) next.email = 'Email wajib diisi.';
    if (!formData.password) next.password = 'Kata sandi wajib diisi.';
    setErrors(next);
    const firstInvalid = Object.keys(next)[0];
    if (firstInvalid) document.getElementById(firstInvalid)?.focus();
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    loginMutation.mutate({ data: { email: formData.email.trim(), password: formData.password } });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name in errors) setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <FormField
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        onChange={handleChange}
        error={errors.email}
        required
      />

      <FormField
        id="password"
        name="password"
        type="password"
        label="Kata sandi"
        autoComplete="current-password"
        onChange={handleChange}
        error={errors.password}
        required
      />

      <Button
        type="submit"
        className="w-full"
        disabled={loginMutation.isPending}
      >
        {loginMutation.isPending ? 'Memproses...' : 'Masuk'}
      </Button>
    </form>
  );
}
