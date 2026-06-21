import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Check,
  Building2,
  MapPin,
  User,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

import { facilitiesApi } from '@/api/facilities.api';
import { ApiError } from '@/api/client';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const schema = z.object({
  facilityName: z
    .string()
    .min(2, 'Facility name must be at least 2 characters'),
  facilityType: z.enum(['HOSPITAL', 'PHARMACY', 'BLOOD_BANK', 'PPE_SUPPLIER']),
  facilityPhone: z
    .string()
    .min(10, 'Facility phone must be at least 10 characters')
    .max(20, 'Facility phone cannot exceed 20 characters'),
  facilityEmail: z.string().email('Enter a valid email address'),
  address: z.object({
    region: z.string().min(2, 'Region must be at least 2 characters'),
    district: z.string().min(2, 'District must be at least 2 characters'),
    addressLine: z.string().optional(),
  }),
  location: z.object({
    latitude: z.coerce
      .number()
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90),
    longitude: z.coerce
      .number()
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180),
  }),
  adminFirstName: z.string().min(2, 'First name must be at least 2 characters'),
  adminLastName: z.string().min(2, 'Last name must be at least 2 characters'),
  adminEmail: z.string().email('Enter a valid administrator email address'),
  adminPhone: z
    .string()
    .optional()
    .refine((val) => !val || (val.length >= 10 && val.length <= 20), {
      message: 'Admin phone must be between 10 and 20 characters',
    }),
});

type RegisterForm = z.infer<typeof schema>;

const FACILITY_TYPES = [
  { value: 'HOSPITAL', label: 'Hospital' },
  { value: 'PHARMACY', label: 'Pharmacy' },
  { value: 'BLOOD_BANK', label: 'Blood Bank' },
  { value: 'PPE_SUPPLIER', label: 'PPE Supplier' },
] as const;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      facilityName: '',
      facilityType: 'HOSPITAL',
      facilityPhone: '',
      facilityEmail: '',
      address: {
        region: '',
        district: '',
        addressLine: '',
      },
      location: {
        latitude: 0,
        longitude: 0,
      },
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      adminPhone: '',
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await facilitiesApi.submitOnboardingRequest({
        ...data,
        adminPhone: data.adminPhone || undefined,
        location: {
          latitude: Number(data.location.latitude),
          longitude: Number(data.location.longitude),
        },
      });
      setIsSuccess(true);
      toast.success('Onboarding request submitted successfully');
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to submit onboarding request. Please try again.');
      }
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: (
      | keyof RegisterForm
      | `address.${keyof RegisterForm['address']}`
      | `location.${keyof RegisterForm['location']}`
    )[] = [];
    if (step === 1) {
      fieldsToValidate = [
        'facilityName',
        'facilityType',
        'facilityPhone',
        'facilityEmail',
      ];
    } else if (step === 2) {
      fieldsToValidate = [
        'address.region',
        'address.district',
        'address.addressLine',
        'location.latitude',
        'location.longitude',
      ];
    } else if (step === 3) {
      fieldsToValidate = [
        'adminFirstName',
        'adminLastName',
        'adminEmail',
        'adminPhone',
      ];
    }

    const isValid = await form.trigger(
      fieldsToValidate as Parameters<typeof form.trigger>[0]
    );
    if (isValid) {
      setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
    }
  };

  const prevStep = () => {
    setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center text-center space-y-6 py-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-500 animate-bounce">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Request Submitted
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Thank you for registering your facility. Your request is now under
            review by MedGrid administrators.
          </p>
        </div>
        <Button
          onClick={() => navigate('/login')}
          className="w-full bg-primary hover:bg-primary/95"
        >
          Back to Login
        </Button>
      </div>
    );
  }

  const stepsList = [
    { number: 1, label: 'Facility Info', icon: Building2 },
    { number: 2, label: 'Location', icon: MapPin },
    { number: 3, label: 'Administrator', icon: User },
    { number: 4, label: 'Review & Submit', icon: FileText },
  ];

  // Watch values for Step 4 review
  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedValues = form.watch();

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8">
      {/* Left Column — Stepper & Building Illustration */}
      <div className="flex flex-col justify-between pr-4 md:border-r border-border min-h-[450px]">
        <div className="space-y-4">
          <div className="md:hidden flex items-center justify-between bg-primary/5 border border-primary/10 rounded-lg p-3 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Step {step} of 4
            </span>
            <span className="text-sm font-medium">
              {stepsList[step - 1].label}
            </span>
          </div>

          <div className="hidden md:flex flex-col space-y-6">
            {stepsList.map((s) => {
              const isCompleted = step > s.number;
              const isActive = step === s.number;

              return (
                <div key={s.number} className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                          ? 'bg-primary text-white ring-2 ring-primary/20'
                          : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : s.number}
                  </div>
                  <div className="flex flex-col text-left">
                    <span
                      className={`text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-primary font-semibold'
                          : isCompleted
                            ? 'text-muted-foreground'
                            : 'text-muted-foreground/60'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Minimal Building SVG Illustration matching proposed UI */}
        <div className="hidden md:block self-center pt-8 opacity-75">
          <svg
            width="120"
            height="100"
            viewBox="0 0 120 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-muted-foreground/40 hover:text-primary/30 transition-colors duration-500"
          >
            <rect
              x="20"
              y="30"
              width="80"
              height="70"
              rx="4"
              fill="currentColor"
              fillOpacity="0.1"
              stroke="currentColor"
              strokeWidth="2"
            />
            <rect
              x="45"
              y="10"
              width="30"
              height="20"
              rx="2"
              fill="currentColor"
              fillOpacity="0.1"
              stroke="currentColor"
              strokeWidth="2"
            />
            <line
              x1="20"
              y1="99"
              x2="100"
              y2="99"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              d="M60 15V25M55 20H65"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <rect
              x="35"
              y="45"
              width="12"
              height="12"
              rx="1"
              fill="currentColor"
              fillOpacity="0.2"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <rect
              x="73"
              y="45"
              width="12"
              height="12"
              rx="1"
              fill="currentColor"
              fillOpacity="0.2"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <rect
              x="52"
              y="70"
              width="16"
              height="30"
              rx="1"
              fill="currentColor"
              fillOpacity="0.3"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </div>

      {/* Right Column — Active Step Forms */}
      <div className="flex flex-col justify-between">
        <div>
          <div className="mb-4">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Step {step} of 4
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
              Register Your Facility
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {step === 1 && 'Facility Information'}
              {step === 2 && 'Location & Address Details'}
              {step === 3 && 'Facility Administrator Profile'}
              {step === 4 && 'Review Your Registration Details'}
            </p>
          </div>

          <Separator className="my-4" />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {step === 1 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="facilityName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facility Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Korle Bu Teaching Hospital"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="facilityType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facility Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FACILITY_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="facilityEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facility Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="contact@facility.org"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="facilityPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facility Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="address.region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Greater Accra" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address.district"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>District</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Accra Metropolitan"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address.addressLine"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. 12 Ring Road East"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="location.latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="5.6037"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location.longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="-0.1870"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="adminFirstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="adminLastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="adminEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="johndoe@facility.org"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adminPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 987-6543" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        1. Facility Information
                      </h4>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <dt className="text-muted-foreground text-xs">
                            Name
                          </dt>
                          <dd className="font-medium text-foreground">
                            {watchedValues.facilityName}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground text-xs">
                            Type
                          </dt>
                          <dd className="font-medium text-foreground">
                            {FACILITY_TYPES.find(
                              (t) => t.value === watchedValues.facilityType
                            )?.label || watchedValues.facilityType}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground text-xs">
                            Email
                          </dt>
                          <dd className="font-medium text-foreground break-all">
                            {watchedValues.facilityEmail}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground text-xs">
                            Phone
                          </dt>
                          <dd className="font-medium text-foreground">
                            {watchedValues.facilityPhone}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        2. Location
                      </h4>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <dt className="text-muted-foreground text-xs">
                            Region / District
                          </dt>
                          <dd className="font-medium text-foreground">
                            {watchedValues.address?.region},{' '}
                            {watchedValues.address?.district}
                          </dd>
                        </div>
                        {watchedValues.address?.addressLine && (
                          <div>
                            <dt className="text-muted-foreground text-xs">
                              Address Line
                            </dt>
                            <dd className="font-medium text-foreground">
                              {watchedValues.address.addressLine}
                            </dd>
                          </div>
                        )}
                        <div>
                          <dt className="text-muted-foreground text-xs">
                            Coordinates
                          </dt>
                          <dd className="font-medium text-foreground">
                            {watchedValues.location?.latitude}°N,{' '}
                            {watchedValues.location?.longitude}°E
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        3. Administrator Profile
                      </h4>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <dt className="text-muted-foreground text-xs">
                            Full Name
                          </dt>
                          <dd className="font-medium text-foreground">
                            {watchedValues.adminFirstName}{' '}
                            {watchedValues.adminLastName}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground text-xs">
                            Email
                          </dt>
                          <dd className="font-medium text-foreground break-all">
                            {watchedValues.adminEmail}
                          </dd>
                        </div>
                        {watchedValues.adminPhone && (
                          <div>
                            <dt className="text-muted-foreground text-xs">
                              Phone
                            </dt>
                            <dd className="font-medium text-foreground">
                              {watchedValues.adminPhone}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-6 border-t border-border mt-6">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                )}
                {step < 4 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 bg-primary hover:bg-primary/95 text-white"
                  >
                    Next Step <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="flex-1 bg-primary hover:bg-primary/95 text-white"
                  >
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>

        <div className="text-center pt-4 mt-4 border-t border-border/40">
          <a
            href="/login"
            onClick={(e) => {
              e.preventDefault();
              navigate('/login');
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Already have an account? Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
