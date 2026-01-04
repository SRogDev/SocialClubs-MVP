# Gamification Events Architecture - Implementation Guide

**Status**: 🚧 In Progress  
**Last Updated**: January 4, 2026  
**Architecture**: Hybrid Event System (Database Triggers + Vercel Cron + Fire-and-Forget)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Current Implementation Status](#current-implementation-status)
3. [Architecture Decision: Why Hybrid?](#architecture-decision-why-hybrid)
4. [Event Handling Strategies](#event-handling-strategies)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Testing Strategy](#testing-strategy)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The gamification system awards points to users for actions within clubs (posting, commenting, liking, etc.) and allows them to claim rewards based on accumulated points. The event handling architecture determines **how** and **when** points are awarded.

### Key Requirements

- ✅ **Reliability**: Points must not be lost due to system failures
- ✅ **Performance**: Point awards should not slow down user interactions
- ✅ **Atomicity**: Point updates must be transactional (no race conditions)
- ✅ **Scalability**: Must work in Vercel's serverless multi-instance environment
- ✅ **Flexibility**: Easy to add new actions and rules

---

## Current Implementation Status

### ✅ **Completed**

- [x] Database schema for gamification
  - `club_gamification_actions` - Point rules per action type
  - `club_gamification_rewards` - Claimable rewards
  - `users_clubs.points` - User points per club
- [x] TypeScript types (`types/gamification.ts`)
- [x] Zod validation schemas (`schemas/gamificationSchema.ts`)
- [x] Gamification service (`services/gamificationService.ts`)
  - CRUD operations for actions and rewards
  - `awardPoints()` function (ready to be called)
  - Leaderboard queries
  - User gamification summary
- [x] Database RPC function `increment_user_points()` for atomic updates
- [x] Updated `database.sql` with complete schema + RPCs

### 🚧 **In Progress**

- [ ] Event emission system (this document provides the blueprint)
- [ ] Integration with post actions (emit events after successful operations)
- [ ] Database triggers for critical events
- [ ] Vercel Cron jobs for periodic tasks
- [ ] API routes for gamification data
- [ ] SWR hooks for client-side data fetching

### ⏳ **Pending**

- [ ] Achievements system
- [ ] Claimed rewards tracking (`user_rewards_claimed` table)
- [ ] Points transaction history (`points_history` table)
- [ ] Gamification UI components integration
- [ ] PostHog analytics events (client-side)

---

## Architecture Decision: Why Hybrid?

After extensive research (see `agents.md` for full analysis), we chose a **hybrid approach** combining three strategies:

### ❌ **Rejected: In-Memory Singleton EventEmitter**

**Why Not?**

- Vercel uses **serverless functions** with **multiple instances**
- No shared memory between API route invocations
- Events would be lost on cold starts
- Not suitable for multi-region deployments

**Original Plan** (from user's request):

```typescript
// ❌ NOT VIABLE in Vercel serverless environment
const eventEmitter = createEventEmitter(); // Singleton
eventEmitter.emit('post.created', data); // Lost if different instance handles it
```

### ✅ **Chosen: Hybrid Architecture**

| Strategy | Use Case | Latency | Atomicity | Reliability |
|----------|----------|---------|-----------|-------------|
| **Database Triggers** | Critical point awards | 0ms | ✅ Yes | ✅ High |
| **Fire-and-Forget** | Non-critical logic | <100ms | ❌ No | ⚠️ Medium |
| **Vercel Cron** | Periodic tasks | Minutes | ❌ No | ✅ High |

---

## Event Handling Strategies

### 1️⃣ **Database Triggers** (Recommended for Critical Events)

**What**: PL/pgSQL functions that execute automatically when database events occur.

**When to Use**:

- ✅ Post interactions (like, superlike, comment)
- ✅ Member joins/leaves club
- ✅ Content creation
- ✅ Any operation requiring atomicity

**Pros**:

- ⚡ **Zero latency** - executes as part of the transaction
- 🔒 **Atomic** - either all succeeds or all rolls back
- 🌍 **Serverless-safe** - runs in database, not application layer
- ✅ **Consistent** - always fires regardless of entry point (API, client, cron)

**Cons**:

- 🐛 Harder to debug (requires Supabase logs)
- 📝 Schema drift risk if not documented in `database.sql`
- 🔧 Requires SQL knowledge

**Example**:

```sql
CREATE OR REPLACE FUNCTION handle_post_like_gamification()
RETURNS TRIGGER AS $$
DECLARE
  post_creator_id uuid;
  post_club_id uuid;
  points_value integer;
BEGIN
  SELECT club_id INTO post_club_id FROM posts WHERE id = NEW.post_id;
  SELECT value INTO points_value
  FROM club_gamification_actions
  WHERE club_id = post_club_id AND type = 'like_given';

  IF points_value > 0 THEN
    UPDATE users_clubs
    SET points = COALESCE(points, 0) + points_value
    WHERE user_id = post_creator_id AND club_id = post_club_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### 2️⃣ **Fire-and-Forget** (Recommended for Non-Critical Operations)

**What**: Call `awardPoints()` service function asynchronously without waiting for result.

**Example**:

```typescript
export async function likePostAction(postId: string) {
  await addLikeInteraction(postId, user.id);

  // Fire-and-forget gamification
  awardPoints({
    userId: user.id,
    clubId: post.club_id,
    actionType: 'like_given',
    metadata: { postId }
  }).catch(error => {
    console.error('Gamification failed (non-critical):', error);
  });

  return { success: true };
}
```

---

### 3️⃣ **Vercel Cron Jobs** (Recommended for Periodic Tasks)

**What**: Scheduled HTTP endpoints that run at fixed intervals.

**Use Cases**:

- Daily leaderboard calculations
- Weekly challenge resets
- Monthly point decay

---

## Implementation Roadmap

### Phase 1: Database Triggers (Week 1)

Create triggers for:

- Post creation
- Comment addition
- Likes/Superlikes

### Phase 2: Fire-and-Forget in Actions (Week 2)

Add fallback `awardPoints()` calls in Server Actions.

### Phase 3: API Routes + SWR Hooks (Week 3)

Expose gamification data to client components.

### Phase 4: Vercel Cron Jobs (Week 4)

Implement periodic leaderboard calculations.

---

## Testing Strategy

- **Unit Tests**: Test service functions in isolation
- **Integration Tests**: Test full flow from action → service → database
- **E2E Tests**: Test user interactions and verify points awarded

---

## Performance Considerations

### Database Triggers

- Executes in ~1-5ms (negligible impact)
- Keep trigger logic simple
- Use indexes on frequently queried columns

### Fire-and-Forget

- Doesn't block user response
- Use `.catch()` to prevent unhandled rejections
- Log failures for monitoring

---

## Troubleshooting

### Points Not Being Awarded

- Check if action rule is configured
- Verify trigger exists in database
- Ensure `increment_user_points()` RPC exists
- Confirm user is member of club

### Duplicate Point Awards

- Remove fire-and-forget calls once triggers are working

---

## Next Steps

1. **Immediate** (This Week):
   - Implement database triggers
   - Test in development
   - Deploy to production

2. **Short Term** (Next 2 Weeks):
   - Add fire-and-forget to actions
   - Create API routes + SWR hooks
   - Integrate UI components

3. **Long Term** (Next Month):
   - Implement achievements system
   - Create points transaction history
   - Add gamification analytics dashboard

---

## References

- [Vercel Cron Jobs Docs](https://vercel.com/docs/cron-jobs)
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)

---
