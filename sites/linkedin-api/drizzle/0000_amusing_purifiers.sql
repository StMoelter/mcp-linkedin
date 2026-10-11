CREATE TABLE `linkedin_connections` (
	`user_id` text PRIMARY KEY NOT NULL,
	`encrypted_tokens` text NOT NULL,
	`expires_at` integer NOT NULL,
	`scopes` text NOT NULL,
	`member_id` text NOT NULL,
	`display_name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `linkedin_oauth_states` (
	`state_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`nonce_hash` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `linkedin_post_requests` (
	`user_id` text NOT NULL,
	`request_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`status` text NOT NULL,
	`post_urn` text,
	PRIMARY KEY(`user_id`, `request_id`)
);
