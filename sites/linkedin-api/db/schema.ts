import {sqliteTable, text, integer, primaryKey} from 'drizzle-orm/sqlite-core';
export const linkedinConnections=sqliteTable('linkedin_connections',{
  userId:text('user_id').primaryKey(), encryptedTokens:text('encrypted_tokens').notNull(),
  expiresAt:integer('expires_at').notNull(),scopes:text('scopes').notNull(),
  memberId:text('member_id').notNull(),displayName:text('display_name').notNull()
});
export const linkedinOAuthStates=sqliteTable('linkedin_oauth_states',{
  stateHash:text('state_hash').primaryKey(),userId:text('user_id').notNull(),
  nonceHash:text('nonce_hash').notNull(),expiresAt:integer('expires_at').notNull()
});
export const linkedinPostRequests=sqliteTable('linkedin_post_requests',{
  userId:text('user_id').notNull(),requestId:text('request_id').notNull(),
  contentHash:text('content_hash').notNull(),status:text('status').notNull(),postUrn:text('post_urn')
},table=>[primaryKey({columns:[table.userId,table.requestId]})]);
