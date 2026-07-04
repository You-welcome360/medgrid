import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { Loader2, Sun, Moon, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useFacility } from '@/features/facilities/hooks/use-facilities';
import { facilitiesApi } from '@/api/facilities.api';
import { useNotificationPreferences, useUpdatePreferences } from '@/hooks/use-notifications';

import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { ApiError } from '@/api/client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';

// ============================================================
// Change password section
// ============================================================

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Needs an uppercase letter')
      .regex(/[a-z]/, 'Needs a lowercase letter')
      .regex(/\d/, 'Needs a number')
      .regex(/[@$!%*?&]/, 'Needs a special character (@$!%*?&)'),
    confirmPassword: z.string().min(1, 'Required'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'New password must differ from current',
    path: ['newPassword'],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

function ChangePasswordSection() {
  const updateUser = useAuthStore((s) => s.updateUser);
  const user = useAuthStore((s) => s.user);

  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: PasswordForm) => {
    try {
      await authApi.changePassword(
        data.currentPassword as string,
        data.newPassword as string
      );

      if (user) {
        updateUser({ ...user, mustChangePassword: false });
      }

      toast.success('Password changed successfully');
      form.reset();
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to change password');
      }
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 max-w-sm"
          >
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Theme section
// ============================================================

type Theme = 'light' | 'dark' | 'system';

const THEME_OPTIONS: {
  value: Theme;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

function AppearanceSection() {
  const { theme, setTheme } = useThemeStore();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Appearance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                theme === value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/40'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Account info section
// ============================================================

function AccountSection() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    FACILITY_ADMIN: 'Facility Admin',
    COORDINATION_MANAGER: 'Coordination Manager',
    INVENTORY_MANAGER: 'Inventory Manager',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Account</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">
              {user.firstName} {user.lastName}
            </dd>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Role</dt>
            <dd>{ROLE_LABELS[user.role] ?? user.role}</dd>
          </div>
          {user.facilityId && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Facility ID</dt>
                <dd className="font-mono text-xs">
                  {user.facilityId.slice(0, 16)}…
                </dd>
              </div>
            </>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Facility profile section
// ============================================================

const facilitySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(5, 'Phone must be at least 5 characters'),
  region: z.string().min(2, 'Region must be at least 2 characters'),
  district: z.string().min(2, 'District must be at least 2 characters'),
  addressLine: z.string().optional().or(z.literal('')),
  latitude: z.coerce.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  longitude: z.coerce.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
});

type FacilityForm = z.infer<typeof facilitySchema>;

function FacilityProfileSection() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  if (!user || !user.facilityId) return null;

  const { data: facility, isLoading, error } = useFacility(user.facilityId);

  const form = useForm<FacilityForm>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      region: '',
      district: '',
      addressLine: '',
      latitude: 0,
      longitude: 0,
    },
  });

  useEffect(() => {
    if (facility) {
      form.reset({
        name: facility.name,
        email: facility.email,
        phone: facility.phone,
        region: facility.region,
        district: facility.district,
        addressLine: facility.addressLine ?? '',
        latitude: facility.latitude,
        longitude: facility.longitude,
      });
    }
  }, [facility, form]);

  const onSubmit = async (data: FacilityForm) => {
    try {
      await facilitiesApi.update(user.facilityId!, {
        facilityName: data.name,
        phone: data.phone,
        email: data.email,
        address: {
          region: data.region,
          district: data.district,
          addressLine: data.addressLine || null,
        },
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
        },
      });

      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      toast.success('Facility details updated successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to update facility details');
      }
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Facility Profile & Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-10 bg-slate-800/50 animate-pulse rounded" />
          <div className="h-10 bg-slate-800/50 animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (error || !facility) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Facility Profile & Location</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-400">Failed to load facility profile details.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Facility Profile & Location</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facility Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addressLine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>District</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Notification preferences section
// ============================================================

function NotificationPreferencesSection() {
  const { data: prefs, isLoading, error } = useNotificationPreferences();
  const updateMutation = useUpdatePreferences();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-10 bg-slate-800/50 animate-pulse rounded" />
          <div className="h-10 bg-slate-800/50 animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (error || !prefs) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-400">Failed to load notification settings.</p>
        </CardContent>
      </Card>
    );
  }

  const handleToggle = (channel: 'push' | 'email', field: 'enabled' | 'emergencyOnly') => {
    const pushVal = { ...prefs.push };
    const emailVal = { ...prefs.email };

    if (channel === 'push') {
      pushVal[field] = !pushVal[field];
    } else {
      emailVal[field] = !emailVal[field];
    }

    updateMutation.mutate({ push: pushVal, email: emailVal });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Notification Channels</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          
          {/* Websocket */}
          <div className="flex items-start justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-900">
            <div className="space-y-0.5">
              <label className="text-sm font-semibold text-white">In-App Live Stream</label>
              <p className="text-xs text-gray-400">Real-time alerts displayed instantly on screen</p>
            </div>
            <span className="text-[10px] uppercase font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
              Always On
            </span>
          </div>

          {/* Email */}
          <div className="space-y-3 p-3 rounded-lg border border-slate-800 bg-slate-900/10">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-semibold text-white">Email Messages</label>
                <p className="text-xs text-gray-400">Receive summaries and requests via mail</p>
              </div>
              <input
                type="checkbox"
                checked={prefs.email.enabled}
                onChange={() => handleToggle('email', 'enabled')}
                className="h-4 w-4 rounded border-slate-800 text-indigo-600 bg-slate-950 accent-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
              />
            </div>
            {prefs.email.enabled && (
              <div className="flex items-center justify-between pl-4 border-l border-slate-800 pt-2">
                <div className="space-y-0.5">
                  <label className="text-xs font-medium text-gray-300">Only Emergency Announcements</label>
                  <p className="text-[10px] text-gray-500">Mute normal notifications, alert only on emergency alerts</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.email.emergencyOnly}
                  onChange={() => handleToggle('email', 'emergencyOnly')}
                  className="h-3.5 w-3.5 rounded border-slate-800 text-indigo-600 bg-slate-950 accent-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                />
              </div>
            )}
          </div>

          {/* Push Notifications */}
          <div className="space-y-3 p-3 rounded-lg border border-slate-800 bg-slate-900/10">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-semibold text-white">Push Notifications</label>
                <p className="text-xs text-gray-400">Receive native browser alerts for critical events</p>
              </div>
              <input
                type="checkbox"
                checked={prefs.push.enabled}
                onChange={() => handleToggle('push', 'enabled')}
                className="h-4 w-4 rounded border-slate-800 text-indigo-600 bg-slate-950 accent-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
              />
            </div>
            {prefs.push.enabled && (
              <div className="flex items-center justify-between pl-4 border-l border-slate-800 pt-2">
                <div className="space-y-0.5">
                  <label className="text-xs font-medium text-gray-300">Only Emergency Announcements</label>
                  <p className="text-[10px] text-gray-500">Mute normal notifications, alert only on emergency alerts</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.push.emergencyOnly}
                  onChange={() => handleToggle('push', 'emergencyOnly')}
                  className="h-3.5 w-3.5 rounded border-slate-800 text-indigo-600 bg-slate-950 accent-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                />
              </div>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Page
// ============================================================

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Settings" />
      <AccountSection />
      <FacilityProfileSection />
      <AppearanceSection />
      <NotificationPreferencesSection />
      <ChangePasswordSection />
    </div>
  );
}
