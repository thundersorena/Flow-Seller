import {  pgTable,  pgEnum,  uuid,  text,  boolean,  integer,  jsonb,  timestamp,} from 'drizzle-orm/pg-core';


export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);

export const executionStatusEnum = pgEnum('execution_status', [
  'pending',
  'running',
  'success',
  'failed',
]);


export const users = pgTable('users', {
  id:            uuid('id').defaultRandom().primaryKey(),
  name:          text('name').notNull(),
  email:         text('email').notNull().unique(),
  passwordHash:  text('password_hash').notNull(),
  role:          userRoleEnum('role').default('user').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
  updatedAt:     timestamp('updated_at').defaultNow().notNull(),
});


export const executions = pgTable('executions', {
  id:            uuid('id').defaultRandom().primaryKey(),
  userId:        uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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


export type User         = typeof users.$inferSelect;
export type NewUser      = typeof users.$inferInsert;
export type Execution    = typeof executions.$inferSelect;
export type NewExecution = typeof executions.$inferInsert;

/** Safe to expose to the client — no passwordHash. */
export type SafeUser = Omit<User, 'passwordHash'>;

// ─── Verification Tokens ──────────────────────────────────────────────────────

export const verificationTokens = pgTable('verification_tokens', {
  id:        uuid('id').defaultRandom().primaryKey(),
  email:     text('email').notNull(),
  token:     text('token').notNull(),
  attempts:  integer('attempts').default(0).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
