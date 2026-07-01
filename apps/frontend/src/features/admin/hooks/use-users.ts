import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { usersApi } from '@/api/users.api';
import type { UserStatus } from '@/types';

const KEYS = {
  all: ['users'] as const,
  list: () => ['users', 'list'] as const,
  detail: (id: string) => ['users', id] as const,
};

export function useUsers() {
  return useQuery({
    queryKey: KEYS.list(),
    queryFn: () => usersApi.list(),
    select: (res) => res.data ?? [],
  });
}

export function useUpdateUserStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      usersApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('User status updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useInviteUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      email,
      role,
      elevatedToken,
    }: {
      email: string;
      role: 'SUPER_ADMIN' | 'COORDINATION_MANAGER' | 'INVENTORY_MANAGER';
      elevatedToken?: string;
    }) => usersApi.invite(email, role, elevatedToken),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Invitation sent successfully');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
