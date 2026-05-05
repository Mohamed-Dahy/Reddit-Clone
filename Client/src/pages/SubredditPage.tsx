import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Search, Loader2, UserPlus } from 'lucide-react'
import {
  useSubredditPostsQuery,
  useSubredditQuery,
  useJoinCommunityMutation,
  useLeaveCommunityMutation,
  useSendInviteMutation,
  useCommunityInvitesQuery,
} from '@/hooks/use-reddit-query'
import { PostCard } from '@/components/feed/PostCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useAuth } from '@/context/auth-context'
import { useToast } from '@/hooks/use-toast'
import { redditService } from '@/api/reddit-service'

// ─── Invite dialog (moderators of private communities only) ──────────────────

function InviteDialog({ communityName }: { communityName: string }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: string; username: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)
  const sendInvite = useSendInviteMutation(communityName)
  const { data: invitesData } = useCommunityInvitesQuery(communityName, open)

  const pendingUsernames = new Set(
    invitesData?.invites.map((i) => i.invitedUser.username) ?? []
  )

  useEffect(() => {
    if (!open || !query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await redditService.searchPostsAndSubs(query.trim())
        setResults(data.users)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [query, open])

  const handleInvite = async (username: string) => {
    setInviting(username)
    try {
      await sendInvite.mutateAsync(username)
      toast({ title: `Invitation sent to u/${username}` })
      setResults((prev) => prev.filter((u) => u.username !== username))
    } catch (err: any) {
      toast({ variant: 'destructive', title: err.message || 'Failed to send invitation' })
    } finally {
      setInviting(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setQuery(''); setResults([]) } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <UserPlus className="h-4 w-4" /> Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to r/{communityName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search by username…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="min-h-[8rem] max-h-[16rem] overflow-y-auto space-y-2">
            {searching ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {query.trim() ? 'No users found.' : 'Start typing to search users.'}
              </p>
            ) : (
              results.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://picsum.photos/seed/${u.username}/100/100`} />
                      <AvatarFallback>{u.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">u/{u.username}</span>
                  </div>
                  {pendingUsernames.has(u.username) ? (
                    <span className="text-xs text-muted-foreground">Invited</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleInvite(u.username)}
                      disabled={inviting === u.username}
                    >
                      {inviting === u.username ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Invite'}
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>

          {(invitesData?.invites.length ?? 0) > 0 && (
            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Pending invites</p>
              <div className="space-y-1">
                {invitesData!.invites.map((inv) => (
                  <div key={inv._id} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={`https://picsum.photos/seed/${inv.invitedUser.username}/100/100`} />
                      <AvatarFallback>{inv.invitedUser.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    u/{inv.invitedUser.username}
                    <span className="ml-auto text-xs">pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function SubredditPage() {
  const { subreddit = '' } = useParams()
  const { data: info } = useSubredditQuery(subreddit)
  const { data: posts = [] } = useSubredditPostsQuery(subreddit)
  const { user } = useAuth()
  const { toast } = useToast()

  const [localOverride, setLocalOverride] = useState<boolean | null>(null)
  const isMember = localOverride !== null ? localOverride : (info?.isMember ?? null)

  const joinMutation = useJoinCommunityMutation()
  const leaveMutation = useLeaveCommunityMutation()

  const handleJoin = async () => {
    if (!user) { toast({ variant: 'destructive', title: 'Sign in to join communities' }); return }
    setLocalOverride(true)
    try {
      await joinMutation.mutateAsync(subreddit)
      toast({ title: `Joined r/${subreddit}` })
    } catch (err: any) {
      if (err.message?.toLowerCase().includes('already a member')) return
      setLocalOverride(false)
      toast({ variant: 'destructive', title: err.message || 'Failed to join' })
    }
  }

  const handleLeave = async () => {
    setLocalOverride(false)
    try {
      await leaveMutation.mutateAsync(subreddit)
      toast({ title: `Left r/${subreddit}` })
    } catch (err: any) {
      setLocalOverride(true)
      toast({ variant: 'destructive', title: err.message || 'Failed to leave' })
    }
  }

  if (!info) return <p className="text-muted-foreground">Community not found.</p>

  const isPending = joinMutation.isPending || leaveMutation.isPending
  const isPrivate = info.type === 'private'
  const canInvite = !!user && isPrivate && info.isModerator

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">r/{info.name}</h1>
            {isPrivate && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                Private
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{info.description}</p>
          <p className="text-xs text-muted-foreground mt-1">{info.subscribers} members</p>
        </div>
        <div className="flex gap-2">
          {canInvite && <InviteDialog communityName={subreddit} />}
          {isMember === true ? (
            <Button variant="outline" size="sm" onClick={handleLeave} disabled={isPending}>
              {leaveMutation.isPending ? 'Leaving…' : 'Joined'}
            </Button>
          ) : (
            !isPrivate && (
              <Button size="sm" onClick={handleJoin} disabled={isPending}>
                {joinMutation.isPending ? 'Joining…' : 'Join'}
              </Button>
            )
          )}
        </div>
      </div>
      <div className="space-y-4">
        {posts.length
          ? posts.map((post) => <PostCard key={post.id} post={post} />)
          : <p className="text-muted-foreground">No posts yet.</p>}
      </div>
    </div>
  )
}
