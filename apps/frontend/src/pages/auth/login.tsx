import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/api/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from
    ?.pathname;

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await authApi.login(
        data.email as string,
        data.password as string
      );

      if (!res.data) {
        toast.error('Login failed. Please try again.');
        return;
      }

      setAuth(res.data.user, res.data.accessToken);

      // Redirect based on role
      const { role, mustChangePassword } = res.data.user;

      if (mustChangePassword) {
        navigate('/change-password', { replace: true });
        return;
      }

      if (role === 'SUPER_ADMIN') {
        navigate(from ?? '/admin/dashboard', { replace: true });
      } else {
        navigate(from ?? '/dashboard', { replace: true });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.statusCode === 401) {
          form.setError('password', { message: error.message });
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Welcome Back</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to your MedGrid account
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@facility.org"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                </div>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      </Form>

      <p className="text-center text-xs text-muted-foreground">
        Need to register your facility?{' '}
        <a
          href="/register"
          className="text-foreground underline underline-offset-4"
        >
          Submit a request
        </a>
      </p>
    </div>
  );
}
