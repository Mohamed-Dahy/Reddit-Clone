import { useNotificationsQuery, useMarkNotificationReadMutation, useMarkAllReadMutation, useDeleteNotificationMutation, useRespondToInviteMutation } from '@/hooks/use-reddit-query'
import { Button } from '@/components/ui/button'
import { Loader2, Trash2, CheckCircle2, MessageSquare, AtSign, ArrowUpCircle, Users } from 'lucide-react'
import { type Notification } from '@/lib/mock-data'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

// ─── Invite action buttons ───────────────────────────────────────────────────

function InviteActions({ notification }: { notification: Notification }) {
  const { toast } = useToast()
  const respond = useRespondToInviteMutation()
  const communityName = notification.community?.name

  if (!communityName) return null

  const handle = async (action: 'accept' | 'reject') => {
    try {
      const result: any = await respond.mutateAsync({ communityName, action })
      toast({ title: result?.message ?? (action === 'accept' ? `Joined r/${communityName}` : `Declined invitation`) })
    } catch (err: any) {
      toast({ variant: 'destructive', title: err.message || 'Something went wrong' })
    }
  }

  return (
    <div className="flex gap-2 mt-2">
      <Button
        size="sm"
        onClick={() => handle('accept')}
        disabled={respond.isPending}
        className="h-7 text-xs"
      >
        {respond.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
        Accept
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handle('reject')}
        disabled={respond.isPending}
        className="h-7 text-xs"
      >
        Decline
      </Button>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getIcon(type: Notification['type']) {
  switch (type) {
    case 'post_comment':    return <MessageSquare className="h-4 w-4 text-blue-500" />
    case 'comment_reply':   return <MessageSquare className="h-4 w-4 text-green-500" />
    case 'mention':         return <AtSign className="h-4 w-4 text-purple-500" />
    case 'community_invite': return <Users className="h-4 w-4 text-orange-500" />
    default:                return <ArrowUpCircle className="h-4 w-4 text-primary" />
  }
}

function getText(n: Notification) {
  const actor = n.actor.username
  switch (n.type) {
    case 'post_comment':
      return `u/${actor} commented on your post: "${n.post?.title}"`
    case 'comment_reply':
      return `u/${actor} replied to your comment: "${n.comment?.body.slice(0, 30)}…"`
    case 'mention':
      return `u/${actor} mentioned you in a comment`
    case 'community_invite':
      return `u/${actor} invited you to join r/${n.community?.name}`
    default:
      return `Action by u/${actor}`
  }
}

function getLink(n: Notification) {
  if (n.type === 'community_invite') return `/r/${n.community?.name}`
  if (n.post) return `/post/${n.post._id}`
  return '#'
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotificationsQuery()
  const markRead      = useMarkNotificationReadMutation()
  const markAllRead   = useMarkAllReadMutation()
  const deleteNotif   = useDeleteNotificationMutation()

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={!notifications.some(n => !n.isRead) || markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          {markAllRead.isPending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <CheckCircle2 className="h-4 w-4" />}
          Mark all as read
        </Button>
      </div>

      <div className="space-y-3">
        {notifications.map((item) => (
          <div
            key={item._id}
            className={cn(
              'group relative flex items-start gap-4 border rounded-xl p-4 transition-all hover:border-primary/20',
              item.isRead ? 'bg-card opacity-80' : 'bg-primary/5 border-primary/10 shadow-sm',
            )}
          >
            <div className="mt-1">{getIcon(item.type)}</div>

            <div className="flex-1 min-w-0">
              {item.type === 'community_invite' ? (
                // Invite notifications are not clickable links — actions are inline
                <div>
                  <p className="text-sm font-medium leading-relaxed mb-1">{getText(item)}</p>
                  <p className="text-xs text-muted-foreground mb-1">{item.createdAt}</p>
                  <InviteActions notification={item} />
                </div>
              ) : (
                <Link
                  to={getLink(item)}
                  className="block hover:text-primary transition-colors"
                  onClick={() => !item.isRead && markRead.mutate(item._id)}
                >
                  <p className="text-sm font-medium leading-relaxed mb-1">{getText(item)}</p>
                  <p className="text-xs text-muted-foreground">{item.createdAt}</p>
                </Link>
              )}
            </div>

            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity self-start">
              {!item.isRead && item.type !== 'community_invite' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => markRead.mutate(item._id)}
                  title="Mark as read"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => deleteNotif.mutate(item._id)}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed">
          <p className="text-muted-foreground italic">You're all caught up! No notifications yet.</p>
        </div>
      )}
    </div>
  )
}
