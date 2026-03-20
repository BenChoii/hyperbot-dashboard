import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  trades: defineTable({
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
    profile: v.string(), // "safe" or "degen"
    trend: v.string(), // "UP", "DOWN", "RANGE"
    timestamp: v.float64(),
    is_dry_run: v.boolean(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_strategy", ["strategy"])
    .index("by_profile", ["profile"]),

  snapshots: defineTable({
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
  }).index("by_timestamp", ["timestamp"]),
});
