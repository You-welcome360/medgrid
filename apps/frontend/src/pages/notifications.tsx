import { useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  useNotifications, 
  useMarkAsRead, 
  useMarkAllAsRead 
} from '@/hooks/use-notifications';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Inbox
} from 'lucide-react';

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [filterRead, setFilterRead] = useState<boolean | undefined>(undefined);

  const { data, isLoading } = useNotifications({
    page,
    limit: 10,
    read: filterRead,
  });

  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  const notifications = data?.notifications || [];
  const totalCount = data?.pagination?.total || 0;
  const totalPages = Math.ceil(totalCount / 10) || 1;

  const handleMarkAllRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleMarkRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const hasUnread = notifications.some(n => !n.readAt);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-row items-center justify-between">
        <PageHeader title="Notification Inbox" />
        {hasUnread && (
          <Button
            onClick={handleMarkAllRead}
            disabled={markAllAsReadMutation.isPending}
            variant="outline"
            size="sm"
            className="border-slate-800 text-gray-400 hover:text-white flex items-center gap-1.5"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Tabs / Filters */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => { setFilterRead(undefined); setPage(1); }}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            filterRead === undefined
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:bg-slate-900/60 hover:text-white'
          }`}
        >
          All Inbox
        </button>
        <button
          onClick={() => { setFilterRead(false); setPage(1); }}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            filterRead === false
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:bg-slate-900/60 hover:text-white'
          }`}
        >
          Unread
        </button>
        <button
          onClick={() => { setFilterRead(true); setPage(1); }}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            filterRead === true
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:bg-slate-900/60 hover:text-white'
          }`}
        >
          Read
        </button>
      </div>

      {/* Content */}
      <Card className="border-slate-800 bg-slate-900/10">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              <div className="h-16 bg-slate-800/40 animate-pulse rounded-lg" />
              <div className="h-16 bg-slate-800/40 animate-pulse rounded-lg" />
              <div className="h-16 bg-slate-800/40 animate-pulse rounded-lg" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">
              <Inbox className="h-12 w-12 text-slate-700 mx-auto mb-3" />
              Your inbox is empty.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-5 flex items-start justify-between gap-4 transition-colors ${
                    !n.readAt ? 'bg-indigo-950/10 border-l-2 border-indigo-500' : 'hover:bg-slate-900/20'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      !n.readAt ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-900 text-gray-500'
                    }`}>
                      <Bell className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className={`text-sm font-semibold ${!n.readAt ? 'text-white' : 'text-gray-300'}`}>
                        {n.title}
                      </h4>
                      <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">{n.body}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 pt-1">
                        <Clock className="h-3 w-3" />
                        {new Date(n.createdAt).toLocaleDateString(undefined, { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>

                  {!n.readAt && (
                    <Button
                      onClick={() => handleMarkRead(n.id)}
                      disabled={markAsReadMutation.isPending}
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-white shrink-0 hover:bg-slate-800"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <div className="text-xs text-gray-500">
            Page {page} of {totalPages} ({totalCount} notifications)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-slate-800 text-gray-400 hover:text-white"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-slate-800 text-gray-400 hover:text-white"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
