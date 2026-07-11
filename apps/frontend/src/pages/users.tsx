import { useState } from 'react';
import { format } from 'date-fns';
import { UserPlus, Copy, CheckCircle } from 'lucide-react';

import {
  useUsers,
  useUpdateUserStatus,
  useInviteUser,
} from '@/features/admin/hooks/use-users';
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
import { toast } from 'sonner';
import type { UserStatus } from '@/types';

// ============================================================
// Invite result — shown after successful invite
// ============================================================

interface InviteResult {
  email: string;
  role: string;
  invitationToken: string;
  expiresAt: string;
}

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

  const ROLE_LABELS: Record<string, string> = {
    COORDINATION_MANAGER: 'Coordination Manager',
    INVENTORY_MANAGER: 'Inventory Manager',
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
              <span>{ROLE_LABELS[result.role] ?? result.role}</span>
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
// Invite dialog
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
  const [role, setRole] = useState<
    'COORDINATION_MANAGER' | 'INVENTORY_MANAGER'
  >('COORDINATION_MANAGER');
  const invite = useInviteUser();

  const handleSubmit = () => {
    invite.mutate(
      { email: email.trim().toLowerCase(), role },
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
          onOpenChange(false);
          setEmail('');
          setRole('COORDINATION_MANAGER');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your facility
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              placeholder="colleague@facility.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' && email.trim() && handleSubmit()
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(v) =>
                setRole(v as 'COORDINATION_MANAGER' | 'INVENTORY_MANAGER')
              }
            >
              <SelectTrigger>
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
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!email.trim() || invite.isPending}
            onClick={handleSubmit}
          >
            {invite.isPending ? 'Sending...' : 'Send Invitation'}
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
        title="Team"
        description="Manage your facility's team members"
        action={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Invite colleagues to join your facility"
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
                <TableHead>Member</TableHead>
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
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    {user.role !== 'FACILITY_ADMIN' &&
                      user.role !== 'SUPER_ADMIN' && (
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
