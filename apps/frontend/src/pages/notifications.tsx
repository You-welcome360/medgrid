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
            className="border-border text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1.5"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Tabs / Filters */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => { setFilterRead(undefined); setPage(1); }}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            filterRead === undefined
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          All Inbox
        </button>
        <button
          onClick={() => { setFilterRead(false); setPage(1); }}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            filterRead === false
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Unread
        </button>
        <button
          onClick={() => { setFilterRead(true); setPage(1); }}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            filterRead === true
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Read
        </button>
      </div>

      {/* Content */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              <div className="h-16 bg-muted animate-pulse rounded-lg" />
              <div className="h-16 bg-muted animate-pulse rounded-lg" />
              <div className="h-16 bg-muted animate-pulse rounded-lg" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              Your inbox is empty.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-5 flex items-start justify-between gap-4 transition-colors ${
                    !n.readAt ? 'bg-primary/5 border-l-2 border-primary' : 'hover:bg-muted/30'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      !n.readAt ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Bell className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className={`text-sm font-semibold ${!n.readAt ? 'text-foreground' : 'text-foreground/80'}`}>
                        {n.title}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">{n.body}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
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
                      className="text-muted-foreground hover:text-foreground shrink-0 hover:bg-muted"
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
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="text-xs text-muted-foreground">
            Page {page} of {totalPages} ({totalCount} notifications)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-border text-muted-foreground hover:text-foreground"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-border text-muted-foreground hover:text-foreground"
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
