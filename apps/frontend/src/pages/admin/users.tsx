import { useState } from 'react';
import { format } from 'date-fns';
import {
  UserPlus,
  Copy,
  CheckCircle,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  useUsers,
  useUpdateUserStatus,
  useInviteUser,
} from '@/features/admin/hooks/use-users';
import { usersApi } from '@/api/users.api';
import { PageHeader } from '@/components/shared/page-header';
import { UserStatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import type { UserStatus } from '@/types';

// ============================================================
// Types
// ============================================================

type AssignableRole =
  | 'SUPER_ADMIN'
  | 'COORDINATION_MANAGER'
  | 'INVENTORY_MANAGER';

interface InviteResult {
  email: string;
  role: string;
  invitationToken: string;
  expiresAt: string;
}

// ============================================================
// Invite result dialog
// ============================================================

function InviteResultDialog({
  result,
  open,
  onOpenChange,
}: {
  result: InviteResult | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const inviteLink = `${window.location.origin}/invite/complete?token=${result.invitationToken}`;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Invite link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <DialogTitle>Invitation Created</DialogTitle>
              <DialogDescription>
                An email invitation has been sent to {result.email}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{result.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium">
                {ROLE_LABELS[result.role] ?? result.role}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expires</span>
              <span>{new Date(result.expiresAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Invitation Link</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={inviteLink}
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon-sm"
                onClick={copyLink}
                title="Copy link"
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Alert className="border-blue-200 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/10">
            <AlertDescription className="text-xs text-blue-700 dark:text-blue-400">
              An invitation email has been sent. You can also copy the link
              above to share it manually.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="justify-end">
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
// Invite dialog (with elevation gate for SUPER_ADMIN)
// ============================================================

function InviteUserDialog({
  open,
  onOpenChange,
  onInvited,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onInvited: (result: InviteResult) => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AssignableRole>('COORDINATION_MANAGER');

  // Elevation state
  const [elevationPassword, setElevationPassword] = useState('');
  const [showElevationPassword, setShowElevationPassword] = useState(false);
  const [elevatedToken, setElevatedToken] = useState<string | null>(null);
  const [isElevating, setIsElevating] = useState(false);
  const [elevationError, setElevationError] = useState('');

  const invite = useInviteUser();

  const needsElevation = role === 'SUPER_ADMIN';
  const isElevated = elevatedToken !== null;
  const canSubmit =
    email.trim().length > 0 &&
    (!needsElevation || isElevated) &&
    !invite.isPending;

  const handleRoleChange = (v: AssignableRole) => {
    setRole(v);
    // Reset elevation when switching away from SUPER_ADMIN
    if (v !== 'SUPER_ADMIN') {
      setElevatedToken(null);
      setElevationPassword('');
      setElevationError('');
    }
  };

  const handleElevate = async () => {
    if (!elevationPassword.trim()) return;
    setIsElevating(true);
    setElevationError('');
    try {
      // targetFacilityId is undefined for global super-admin elevation
      const res = await usersApi.elevate(elevationPassword, undefined);
      if (res.data?.elevatedToken) {
        setElevatedToken(res.data.elevatedToken);
        toast.success('Identity verified');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid password';
      setElevationError(msg);
    } finally {
      setIsElevating(false);
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setEmail('');
      setRole('COORDINATION_MANAGER');
      setElevatedToken(null);
      setElevationPassword('');
      setElevationError('');
    }
    onOpenChange(v);
  };

  const handleSubmit = () => {
    invite.mutate(
      {
        email: email.trim().toLowerCase(),
        role,
        elevatedToken: elevatedToken ?? undefined,
      },
      {
        onSuccess: (res) => {
          if (res.data) {
            onInvited({
              email: email.trim().toLowerCase(),
              role,
              invitationToken: res.data.invitationToken,
              expiresAt: res.data.expiresAt,
            });
          }
          handleClose(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Send an invitation to join MedGrid
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="user@organization.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' && canSubmit && handleSubmit()
              }
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(v) => handleRoleChange(v as AssignableRole)}
            >
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COORDINATION_MANAGER">
                  <div>
                    <p className="font-medium">Coordination Manager</p>
                    <p className="text-xs text-muted-foreground">
                      Can create and manage resource requests
                    </p>
                  </div>
                </SelectItem>
                <SelectItem value="INVENTORY_MANAGER">
                  <div>
                    <p className="font-medium">Inventory Manager</p>
                    <p className="text-xs text-muted-foreground">
                      Can manage inventory and stock movements
                    </p>
                  </div>
                </SelectItem>
                <SelectItem value="SUPER_ADMIN">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <div>
                      <p className="font-medium text-destructive">
                        Super Admin
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Full system access — requires password confirmation
                      </p>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Elevation gate — only shown when SUPER_ADMIN is selected */}
          {needsElevation && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-3">
              {isElevated ? (
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span className="font-medium">Identity verified</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-destructive font-medium">
                    <Lock className="h-4 w-4 shrink-0" />
                    <span>
                      Confirm your identity to grant Super Admin access
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        id="elevation-password"
                        type={showElevationPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={elevationPassword}
                        onChange={(e) => {
                          setElevationPassword(e.target.value);
                          setElevationError('');
                        }}
                        onKeyDown={(e) =>
                          e.key === 'Enter' &&
                          elevationPassword.trim() &&
                          handleElevate()
                        }
                        className="pr-9"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowElevationPassword((p) => !p)}
                        tabIndex={-1}
                      >
                        {showElevationPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {elevationError && (
                      <p className="text-xs text-destructive">
                        {elevationError}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={!elevationPassword.trim() || isElevating}
                      onClick={handleElevate}
                    >
                      {isElevating ? 'Verifying…' : 'Verify Identity'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            id="invite-submit"
            disabled={!canSubmit}
            onClick={handleSubmit}
            variant={needsElevation ? 'destructive' : 'default'}
          >
            {invite.isPending ? 'Sending…' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Role labels
// ============================================================

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  FACILITY_ADMIN: 'Facility Admin',
  COORDINATION_MANAGER: 'Coordination Manager',
  INVENTORY_MANAGER: 'Inventory Manager',
};

// ============================================================
// Page
// ============================================================

export default function UsersPage() {
  const { data: users = [], isLoading } = useUsers();
  const updateStatus = useUpdateUserStatus();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage all user accounts across MedGrid"
        action={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description="Invite team members to get started"
          action={
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Send first invitation
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </TableCell>
                  <TableCell>
                    <UserStatusBadge status={user.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.lastLoginAt
                      ? format(new Date(user.lastLoginAt), 'MMM d, yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    {user.role !== 'SUPER_ADMIN' && (
                      <Select
                        value={user.status}
                        onValueChange={(val) =>
                          updateStatus.mutate({
                            id: user.id,
                            status: val as UserStatus,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="SUSPENDED">Suspended</SelectItem>
                          <SelectItem value="DEACTIVATED">
                            Deactivated
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={(result) => {
          setInviteResult(result);
        }}
      />

      <InviteResultDialog
        result={inviteResult}
        open={!!inviteResult}
        onOpenChange={(v) => !v && setInviteResult(null)}
      />
    </div>
  );
}
