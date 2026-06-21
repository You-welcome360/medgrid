import { useState } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle,
  XCircle,
  Eye,
  Copy,
  Mail,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  useApproveOnboarding,
  useRejectOnboarding,
} from '@/features/admin/hooks/use-onboarding';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { OnboardingStatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ClipboardCheck } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { OnboardingRequest } from '@/types';

// ============================================================
// Approval result — shown after successful approval
// ============================================================

interface ApprovalResult {
  facilityName: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  temporaryPassword: string;
}

function ApprovalResultDialog({
  result,
  open,
  onOpenChange,
}: {
  result: ApprovalResult | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!result) return null;

  const copyPassword = () => {
    navigator.clipboard.writeText(result.temporaryPassword);
    toast.success('Password copied to clipboard');
  };

  const sendEmail = () => {
    const subject = encodeURIComponent(
      `Your MedGrid Facility Account — ${result.facilityName}`
    );
    const body = encodeURIComponent(
      `Dear ${result.adminFirstName} ${result.adminLastName},\n\n` +
        `Your facility "${result.facilityName}" has been approved on MedGrid.\n\n` +
        `Your administrator account has been created:\n` +
        `Email: ${result.adminEmail}\n` +
        `Temporary Password: ${result.temporaryPassword}\n\n` +
        `Please log in at http://localhost:5173 and change your password immediately.\n\n` +
        `Best regards,\nMedGrid Administration`
    );

    window.open(`mailto:${result.adminEmail}?subject=${subject}&body=${body}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <DialogTitle>Facility Approved</DialogTitle>
              <DialogDescription className="text-sm">
                {result.facilityName} is now active
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Facility & admin info */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Facility</span>
              <span className="font-medium">{result.facilityName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Admin Name</span>
              <span>
                {result.adminFirstName} {result.adminLastName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Admin Email</span>
              <span className="font-mono text-xs">{result.adminEmail}</span>
            </div>
          </div>

          {/* Temporary password — shown once */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" />
              Temporary Password
            </Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-sm tracking-widest select-all">
                {result.temporaryPassword}
              </code>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={copyPassword}
                title="Copy password"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Alert className="border-orange-200 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-950/20">
            <AlertDescription className="text-xs text-orange-700 dark:text-orange-400">
              This password is shown <strong>once</strong> and cannot be
              retrieved again. Send it to the facility admin before closing this
              dialog.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={sendEmail}
          >
            <Mail className="mr-2 h-4 w-4" />
            Send via Email
          </Button>
          <Button
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Approve confirmation dialog
// ============================================================

function ApproveDialog({
  request,
  open,
  onOpenChange,
  onApproved,
}: {
  request: OnboardingRequest;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApproved: (result: ApprovalResult) => void;
}) {
  const approve = useApproveOnboarding();

  const handleApprove = () => {
    approve.mutate(request.id, {
      onSuccess: (res) => {
        onOpenChange(false);
        if (res.data) {
          onApproved({
            facilityName: request.facilityName,
            adminFirstName: request.adminFirstName,
            adminLastName: request.adminLastName,
            adminEmail: request.adminEmail,
            temporaryPassword: res.data.temporaryPassword,
          });
        }
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Facility</DialogTitle>
          <DialogDescription>
            This action will create the facility and admin account immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Approving{' '}
            <strong className="text-foreground">{request.facilityName}</strong>{' '}
            will:
          </p>
          <ul className="space-y-1.5">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
              Create the facility record
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
              Create an admin account for{' '}
              <strong className="text-foreground">{request.adminEmail}</strong>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
              Generate a temporary password (shown once after approval)
            </li>
          </ul>
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={approve.isPending} onClick={handleApprove}>
            <CheckCircle className="mr-1.5 h-4 w-4" />
            {approve.isPending ? 'Approving...' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Reject dialog
// ============================================================

function RejectDialog({
  request,
  open,
  onOpenChange,
}: {
  request: OnboardingRequest;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [reason, setReason] = useState('');
  const reject = useRejectOnboarding();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Onboarding Request</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Rejecting <strong>{request.facilityName}</strong>
        </p>
        <div className="space-y-2">
          <Label>Reason for rejection</Label>
          <Input
            placeholder="Explain why this request is being rejected..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || reject.isPending}
            onClick={() =>
              reject.mutate(
                { id: request.id, reason },
                { onSuccess: () => onOpenChange(false) }
              )
            }
          >
            <XCircle className="mr-1.5 h-4 w-4" />
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Detail sheet
// ============================================================

function RequestDetailSheet({
  request,
  open,
  onOpenChange,
}: {
  request: OnboardingRequest | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!request) return null;

  const FACILITY_TYPE_LABELS: Record<string, string> = {
    HOSPITAL: 'Hospital',
    PHARMACY: 'Pharmacy',
    BLOOD_BANK: 'Blood Bank',
    PPE_SUPPLIER: 'PPE Supplier',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>{request.facilityName}</SheetTitle>
        </SheetHeader>
        <div className="px-6 py-6 space-y-6 overflow-y-auto">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Facility Details
            </p>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground mb-0.5">Type</dt>
                <dd className="font-medium">
                  {FACILITY_TYPE_LABELS[request.facilityType] ??
                    request.facilityType}
                </dd>
              </div>
              <Separator />
              <div>
                <dt className="text-xs text-muted-foreground mb-0.5">Email</dt>
                <dd className="break-all">{request.facilityEmail}</dd>
              </div>
              <Separator />
              <div>
                <dt className="text-xs text-muted-foreground mb-0.5">Phone</dt>
                <dd>{request.facilityPhone}</dd>
              </div>
              <Separator />
              <div>
                <dt className="text-xs text-muted-foreground mb-0.5">Region</dt>
                <dd>{request.region}</dd>
              </div>
              <Separator />
              <div>
                <dt className="text-xs text-muted-foreground mb-0.5">
                  District
                </dt>
                <dd>{request.district}</dd>
              </div>
              {request.addressLine && (
                <>
                  <Separator />
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5">
                      Address
                    </dt>
                    <dd>{request.addressLine}</dd>
                  </div>
                </>
              )}
              <Separator />
              <div>
                <dt className="text-xs text-muted-foreground mb-0.5">
                  Coordinates
                </dt>
                <dd className="font-mono text-xs">
                  {request.latitude.toFixed(4)}, {request.longitude.toFixed(4)}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Administrator
            </p>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground mb-0.5">Name</dt>
                <dd className="font-medium">
                  {request.adminFirstName} {request.adminLastName}
                </dd>
              </div>
              <Separator />
              <div>
                <dt className="text-xs text-muted-foreground mb-0.5">Email</dt>
                <dd className="break-all">{request.adminEmail}</dd>
              </div>
              {request.adminPhone && (
                <>
                  <Separator />
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5">
                      Phone
                    </dt>
                    <dd>{request.adminPhone}</dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Status
            </p>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground mb-0.5">Status</dt>
                <dd>
                  <OnboardingStatusBadge status={request.status} />
                </dd>
              </div>
              <Separator />
              <div>
                <dt className="text-xs text-muted-foreground mb-0.5">
                  Submitted
                </dt>
                <dd>{format(new Date(request.submittedAt), 'MMM d, yyyy')}</dd>
              </div>
              {request.reviewedAt && (
                <>
                  <Separator />
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5">
                      Reviewed
                    </dt>
                    <dd>
                      {format(new Date(request.reviewedAt), 'MMM d, yyyy')}
                    </dd>
                  </div>
                </>
              )}
              {request.rejectionReason && (
                <>
                  <Separator />
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5">
                      Rejection reason
                    </dt>
                    <dd className="mt-1 rounded bg-muted p-2 text-xs leading-relaxed">
                      {request.rejectionReason}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// Main table
// ============================================================

interface ApprovalsTableProps {
  requests: OnboardingRequest[];
  isLoading: boolean;
}

export function ApprovalsTable({ requests, isLoading }: ApprovalsTableProps) {
  const [approveTarget, setApproveTarget] = useState<OnboardingRequest | null>(
    null
  );
  const [rejectTarget, setRejectTarget] = useState<OnboardingRequest | null>(
    null
  );
  const [detailTarget, setDetailTarget] = useState<OnboardingRequest | null>(
    null
  );
  const [approvalResult, setApprovalResult] = useState<ApprovalResult | null>(
    null
  );

  const FACILITY_TYPE_LABELS: Record<string, string> = {
    HOSPITAL: 'Hospital',
    PHARMACY: 'Pharmacy',
    BLOOD_BANK: 'Blood Bank',
    PPE_SUPPLIER: 'PPE Supplier',
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="No requests found"
        description="Facility onboarding requests will appear here"
      />
    );
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Facility</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req) => (
              <TableRow key={req.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{req.facilityName}</p>
                    <p className="text-xs text-muted-foreground">
                      {req.adminEmail}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {FACILITY_TYPE_LABELS[req.facilityType] ?? req.facilityType}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {req.district}, {req.region}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(req.submittedAt), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <OnboardingStatusBadge status={req.status} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDetailTarget(req)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {req.status === 'PENDING' && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => setApproveTarget(req)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRejectTarget(req)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {approveTarget && (
        <ApproveDialog
          request={approveTarget}
          open={!!approveTarget}
          onOpenChange={(v) => !v && setApproveTarget(null)}
          onApproved={(result) => {
            setApproveTarget(null);
            setApprovalResult(result);
          }}
        />
      )}
      {rejectTarget && (
        <RejectDialog
          request={rejectTarget}
          open={!!rejectTarget}
          onOpenChange={(v) => !v && setRejectTarget(null)}
        />
      )}
      <RequestDetailSheet
        request={detailTarget}
        open={!!detailTarget}
        onOpenChange={(v) => !v && setDetailTarget(null)}
      />
      <ApprovalResultDialog
        result={approvalResult}
        open={!!approvalResult}
        onOpenChange={(v) => !v && setApprovalResult(null)}
      />
    </>
  );
}
