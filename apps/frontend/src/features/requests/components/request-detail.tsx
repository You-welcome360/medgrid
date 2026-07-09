import { useState } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle,
  XCircle,
  Truck,
  PackageCheck,
  Ban,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  useAcceptRequest,
  useRejectRequest,
  useDispatchRequest,
  useConfirmReceipt,
  useCancelRequest,
  useFailRequest,
} from '@/features/requests/hooks/use-requests';
import { useRole } from '@/hooks/use-role';
import { useAuthStore } from '@/stores/auth.store';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  RequestStatusBadge,
  PriorityBadge,
} from '@/components/shared/status-badge';
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
import type { ResourceRequest } from '@/types';

interface RequestDetailProps {
  request: ResourceRequest;
}

const TIMELINE_STEPS = [
  { status: 'PENDING', label: 'Request Submitted', field: 'requestedAt' },
  { status: 'ACCEPTED', label: 'Accepted by Supplier', field: 'acceptedAt' },
  { status: 'IN_TRANSIT', label: 'Dispatched', field: 'dispatchedAt' },
  { status: 'COMPLETED', label: 'Received', field: 'completedAt' },
] as const;

const STATUS_ORDER = ['PENDING', 'ACCEPTED', 'IN_TRANSIT', 'COMPLETED'];

function ReasonDialog({
  open,
  onOpenChange,
  title,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Reason</Label>
          <Input
            placeholder="Enter reason..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!reason.trim() || isPending}
            onClick={() => onConfirm(reason)}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RequestDetail({ request }: RequestDetailProps) {
  const { isFacilityAdmin, isCoordinationManager, isInventoryManager } =
    useRole();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [thresholdWarning, setThresholdWarning] = useState<string | null>(null);

  const accept = useAcceptRequest();
  const reject = useRejectRequest();
  const dispatch = useDispatchRequest();
  const confirm = useConfirmReceipt();
  const cancel = useCancelRequest();
  const fail = useFailRequest();

  const isRequester = request.requestingFacilityId === user?.facilityId;
  const isSupplier = request.supplyingFacilityId === user?.facilityId;
  const currentStatusIndex = STATUS_ORDER.indexOf(request.status);

  const canAccept =
    isSupplier &&
    request.status === 'PENDING' &&
    (isFacilityAdmin || isCoordinationManager);
  const canReject =
    isSupplier &&
    (request.status === 'PENDING' || request.status === 'ACCEPTED') &&
    (isFacilityAdmin || isCoordinationManager);
  const canDispatch =
    isSupplier &&
    request.status === 'ACCEPTED' &&
    (isFacilityAdmin || isInventoryManager || isCoordinationManager);
  const canConfirm =
    isRequester &&
    request.status === 'IN_TRANSIT' &&
    (isFacilityAdmin || isInventoryManager);
  const canCancel =
    isRequester && request.status === 'PENDING' && isCoordinationManager;
  const canFail =
    isSupplier &&
    request.status === 'IN_TRANSIT' &&
    (isFacilityAdmin || isInventoryManager || isCoordinationManager);

  const handleAccept = () => {
    accept.mutate(request.id, {
      onSuccess: (res) => {
        const warning = res.data?.reservedThresholdWarning;
        qc.invalidateQueries({ queryKey: ['requests'] });
        if (warning) {
          // Show the threshold breach dialog instead of immediately succeeding
          setThresholdWarning(warning);
        } else {
          toast.success('Request accepted');
        }
      },
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left: main info */}
      <div className="space-y-6 lg:col-span-2">
        {/* Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-mono text-muted-foreground">
                  #{request.id.slice(0, 8)}
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  {request.itemName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {request.quantity} {request.unit.toLowerCase()} ·{' '}
                  {request.resourceType.replace('_', ' ').toLowerCase()}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <RequestStatusBadge status={request.status} />
                <PriorityBadge priority={request.priority} />
              </div>
            </div>

            {request.description && (
              <>
                <Separator className="my-4" />
                <p className="text-sm text-muted-foreground">
                  {request.description}
                </p>
              </>
            )}

            {/* Action buttons */}
            {(canAccept ||
              canReject ||
              canDispatch ||
              canConfirm ||
              canCancel ||
              canFail) && (
              <>
                <Separator className="my-4" />
                <div className="flex flex-wrap gap-2">
                  {canAccept && (
                    <Button
                      size="sm"
                      onClick={handleAccept}
                      disabled={accept.isPending}
                    >
                      <CheckCircle className="mr-1.5 h-4 w-4" />
                      {accept.isPending ? 'Accepting...' : 'Accept'}
                    </Button>
                  )}
                  {canReject && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRejectOpen(true)}
                    >
                      <XCircle className="mr-1.5 h-4 w-4" />
                      Reject
                    </Button>
                  )}
                  {canDispatch && (
                    <Button
                      size="sm"
                      onClick={() => dispatch.mutate(request.id)}
                      disabled={dispatch.isPending}
                    >
                      <Truck className="mr-1.5 h-4 w-4" />
                      Dispatch
                    </Button>
                  )}
                  {canConfirm && (
                    <Button
                      size="sm"
                      onClick={() => confirm.mutate(request.id)}
                      disabled={confirm.isPending}
                    >
                      <PackageCheck className="mr-1.5 h-4 w-4" />
                      Confirm Receipt
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCancelOpen(true)}
                    >
                      <Ban className="mr-1.5 h-4 w-4" />
                      Cancel
                    </Button>
                  )}
                  {canFail && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => fail.mutate(request.id)}
                      disabled={fail.isPending}
                    >
                      <AlertTriangle className="mr-1.5 h-4 w-4" />
                      Mark Failed
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Patient info */}
        {request.patient && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span>{request.patient.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Age</span>
                <span>{request.patient.age}</span>
              </div>
              {request.patient.emergencyNotes && (
                <div>
                  <span className="text-muted-foreground">Notes</span>
                  <p className="mt-1 rounded bg-muted p-2 text-xs">
                    {request.patient.emergencyNotes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Rejection/cancellation reason */}
        {(request.rejectionReason || request.cancellationReason) && (
          <Card className="border-red-200 dark:border-red-900/30">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-medium">
                    {request.rejectionReason
                      ? 'Rejection reason'
                      : 'Cancellation reason'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {request.rejectionReason ?? request.cancellationReason}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right: timeline */}
      <div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Request Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {TIMELINE_STEPS.map((step, index) => {
                const isCompleted =
                  index <= currentStatusIndex &&
                  !['REJECTED', 'CANCELLED', 'FAILED'].includes(request.status);
                const isCurrent = index === currentStatusIndex;
                const dateValue = request[
                  step.field as keyof ResourceRequest
                ] as string | null;

                return (
                  <div key={step.status} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isCurrent
                              ? 'border-2 border-primary bg-background'
                              : 'border-2 border-muted bg-background'
                        }`}
                      >
                        {isCompleted ? '✓' : index + 1}
                      </div>
                      {index < TIMELINE_STEPS.length - 1 && (
                        <div
                          className={`w-0.5 flex-1 ${
                            isCompleted ? 'bg-green-500' : 'bg-muted'
                          }`}
                          style={{ minHeight: '2rem' }}
                        />
                      )}
                    </div>
                    <div className="pb-6">
                      <p
                        className={`text-sm font-medium ${
                          isCompleted
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </p>
                      {dateValue && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(dateValue), 'MMM d, yyyy HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reason dialogs */}
      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject Request"
        isPending={reject.isPending}
        onConfirm={(reason) => {
          reject.mutate(
            { id: request.id, reason },
            { onSuccess: () => setRejectOpen(false) }
          );
        }}
      />
      <ReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Request"
        isPending={cancel.isPending}
        onConfirm={(reason) => {
          cancel.mutate(
            { id: request.id, reason },
            { onSuccess: () => setCancelOpen(false) }
          );
        }}
      />

      {/* Reserved threshold breach dialog */}
      <Dialog
        open={!!thresholdWarning}
        onOpenChange={(v) => !v && setThresholdWarning(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Reserved Threshold Warning
            </DialogTitle>
            <DialogDescription>
              This request has already been accepted. Review the warning below.
            </DialogDescription>
          </DialogHeader>

          <Alert className="border-orange-200 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-950/20">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <AlertDescription className="text-sm text-orange-700 dark:text-orange-400">
              {thresholdWarning}
            </AlertDescription>
          </Alert>

          <p className="text-sm text-muted-foreground">
            The request is now accepted. You can proceed with fulfilling it, or
            reject it to protect your reserved stock level.
          </p>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={reject.isPending}
              onClick={() => {
                reject.mutate(
                  {
                    id: request.id,
                    reason: 'Rejected to protect reserved stock threshold',
                  },
                  {
                    onSuccess: () => {
                      setThresholdWarning(null);
                      toast.success(
                        'Request rejected — reserved stock protected'
                      );
                    },
                  }
                );
              }}
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              Reject to Protect Stock
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                setThresholdWarning(null);
                qc.invalidateQueries({ queryKey: ['requests'] });
                toast.success('Request accepted — fulfil when ready');
              }}
            >
              <CheckCircle className="mr-1.5 h-4 w-4" />
              Proceed Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
