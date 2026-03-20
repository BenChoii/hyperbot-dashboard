import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Record a completed trade
export const recordTrade = mutation({
  args: {
    coin: v.string(),
    direction: v.string(),
    entry_price: v.float64(),
    exit_price: v.float64(),
    size: v.float64(),
    leverage: v.float64(),
    pnl_usd: v.float64(),
    pnl_pct: v.float64(),
    strategy: v.string(),
    reason: v.string(),
    held_seconds: v.float64(),
    profile: v.string(),
    trend: v.string(),
    timestamp: v.float64(),
    is_dry_run: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("trades", args);
  },
});

// Record a periodic snapshot
export const recordSnapshot = mutation({
  args: {
    balance: v.float64(),
    total_pnl: v.float64(),
    safe_wins: v.float64(),
    safe_losses: v.float64(),
    degen_budget: v.float64(),
    degen_pnl: v.float64(),
    degen_wins: v.float64(),
    degen_losses: v.float64(),
    degen_blown: v.boolean(),
    cycle_count: v.float64(),
    timestamp: v.float64(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("snapshots", args);
  },
});

// Get all trades (newest first)
export const getTrades = query({
  args: { limit: v.optional(v.float64()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    return await ctx.db
      .query("trades")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});

// Get strategy performance stats
export const getStrategyStats = query({
  args: {},
  handler: async (ctx) => {
    const trades = await ctx.db.query("trades").collect();
    const stats = {};
    for (const t of trades) {
      if (!stats[t.strategy]) {
        stats[t.strategy] = { wins: 0, losses: 0, pnl: 0, trades: 0 };
      }
      stats[t.strategy].trades++;
      stats[t.strategy].pnl += t.pnl_usd;
      if (t.pnl_usd > 0) stats[t.strategy].wins++;
      else stats[t.strategy].losses++;
    }
    return stats;
  },
});

// Get latest snapshots
export const getSnapshots = query({
  args: { limit: v.optional(v.float64()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("snapshots")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});
