import {  pgTable,  pgEnum,  uuid,  text,  boolean,  integer,  jsonb,  timestamp,  uniqueIndex,} from 'drizzle-orm/pg-core';


export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);

export const userStatusEnum = pgEnum('user_status', ['active', 'suspended']);

export const executionStatusEnum = pgEnum('execution_status', [
  'pending',
  'running',
  'success',
  'failed',
]);

// ─── Plans (token subscription tiers) ─────────────────────────────────────────

export const plans = pgTable('plans', {
  id:              uuid('id').defaultRandom().primaryKey(),
  slug:            text('slug').notNull().unique(),
  name:            text('name').notNull(),
  description:     text('description').default('').notNull(),
  priceCents:      integer('price_cents').default(0).notNull(),
  dailyTokenLimit: integer('daily_token_limit').default(10_000).notNull(),
  isDefault:       boolean('is_default').default(false).notNull(),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
});

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id:            uuid('id').defaultRandom().primaryKey(),
  name:          text('name').notNull(),
  email:         text('email').notNull().unique(),
  passwordHash:  text('password_hash').notNull(),
  role:          userRoleEnum('role').default('user').notNull(),
  status:        userStatusEnum('status').default('active').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  planId:        uuid('plan_id').references(() => plans.id, { onDelete: 'set null' }),
  /** Extra purchased tokens, spent after the daily plan limit is exhausted. */
  bonusTokens:   integer('bonus_tokens').default(0).notNull(),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
  updatedAt:     timestamp('updated_at').defaultNow().notNull(),
});

// ─── Flows (n8n workflows for sale) ───────────────────────────────────────────

export const flows = pgTable('flows', {
  id:          uuid('id').defaultRandom().primaryKey(),
  slug:        text('slug').notNull().unique(),
  name:        text('name').notNull(),
  description: text('description').default('').notNull(),
  category:    text('category').default('automation').notNull(),
  priceCents:  integer('price_cents').default(0).notNull(),
  /** File name of the workflow JSON inside the N8N_Services directory. */
  fileName:    text('file_name').notNull(),
  isActive:    boolean('is_active').default(true).notNull(),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
});

// ─── Purchases (flow ownership) ───────────────────────────────────────────────

export const purchases = pgTable(
  'purchases',
  {
    id:         uuid('id').defaultRandom().primaryKey(),
    userId:     uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    flowId:     uuid('flow_id').notNull().references(() => flows.id, { onDelete: 'cascade' }),
    priceCents: integer('price_cents').default(0).notNull(),
    createdAt:  timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [uniqueIndex('purchases_user_flow_idx').on(t.userId, t.flowId)],
);

// ─── Daily token usage ────────────────────────────────────────────────────────

export const dailyUsage = pgTable(
  'daily_usage',
  {
    id:         uuid('id').defaultRandom().primaryKey(),
    userId:     uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    /** Calendar day in YYYY-MM-DD (UTC). */
    day:        text('day').notNull(),
    tokensUsed: integer('tokens_used').default(0).notNull(),
    updatedAt:  timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [uniqueIndex('daily_usage_user_day_idx').on(t.userId, t.day)],
);

// ─── Executions ───────────────────────────────────────────────────────────────

export const executions = pgTable('executions', {
  id:            uuid('id').defaultRandom().primaryKey(),
  userId:        uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  flowId:        uuid('flow_id').references(() => flows.id, { onDelete: 'set null' }),
  workflowName:  text('workflow_name').notNull(),
  status:        executionStatusEnum('status').default('pending').notNull(),
  input:         jsonb('input').notNull().$type<Record<string, unknown>>(),
  output:        text('output').default('').notNull(),
  prompt:        text('prompt').default('').notNull(),
  modelName:     text('model_name').notNull(),
  tokensUsed:    integer('tokens_used').default(0).notNull(),
  executionTime: integer('execution_time').default(0).notNull(),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
  updatedAt:     timestamp('updated_at').defaultNow().notNull(),
});

// ─── Verification Tokens (email OTP / password reset) ────────────────────────

export const verificationTokens = pgTable('verification_tokens', {
  id:        uuid('id').defaultRandom().primaryKey(),
  email:     text('email').notNull(),
  token:     text('token').notNull(),
  /** 'verify' for email verification, 'reset' for password reset. */
  purpose:   text('purpose').default('verify').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type User         = typeof users.$inferSelect;
export type NewUser      = typeof users.$inferInsert;
export type Plan         = typeof plans.$inferSelect;
export type Flow         = typeof flows.$inferSelect;
export type Purchase     = typeof purchases.$inferSelect;
export type DailyUsage   = typeof dailyUsage.$inferSelect;
export type Execution    = typeof executions.$inferSelect;
export type NewExecution = typeof executions.$inferInsert;

/** Safe to expose to the client — no passwordHash. */
export type SafeUser = Omit<User, 'passwordHash'>;
