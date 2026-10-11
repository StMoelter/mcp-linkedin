export type Connection = {userId:string; encryptedTokens:string; expiresAt:number; scopes:string; memberId:string; displayName:string};
export type OAuthState = {stateHash:string; userId:string; nonceHash:string; expiresAt:number};
export type PostRecord = {contentHash:string; status:string; postUrn:string|null};
export interface Store {
  connection(userId:string):Promise<Connection|null>;
  saveConnection(connection:Connection):Promise<void>;
  saveState(state:OAuthState):Promise<void>;
  consumeState(stateHash:string,userId:string,nonceHash:string,now:number):Promise<boolean>;
  disconnect(userId:string):Promise<void>;
  claimPost(userId:string,requestId:string,contentHash:string):Promise<boolean>;
  post(userId:string,requestId:string):Promise<PostRecord|null>;
  completePost(userId:string,requestId:string,status:string,postUrn?:string):Promise<void>;
}
export class D1Store implements Store {
  db:D1Database;
  constructor(db:D1Database) { this.db=db; }
  async connection(userId:string) {
    return this.db.prepare('SELECT user_id AS userId, encrypted_tokens AS encryptedTokens, expires_at AS expiresAt, scopes, member_id AS memberId, display_name AS displayName FROM linkedin_connections WHERE user_id = ?').bind(userId).first<Connection>();
  }
  async saveConnection(c:Connection) {
    await this.db.prepare('INSERT INTO linkedin_connections (user_id, encrypted_tokens, expires_at, scopes, member_id, display_name) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET encrypted_tokens=excluded.encrypted_tokens, expires_at=excluded.expires_at, scopes=excluded.scopes, member_id=excluded.member_id, display_name=excluded.display_name').bind(c.userId,c.encryptedTokens,c.expiresAt,c.scopes,c.memberId,c.displayName).run();
  }
  async saveState(s:OAuthState) {
    await this.db.batch([
      this.db.prepare('DELETE FROM linkedin_oauth_states WHERE expires_at < ? OR user_id = ?').bind(Date.now(),s.userId),
      this.db.prepare('INSERT INTO linkedin_oauth_states (state_hash,user_id,nonce_hash,expires_at) VALUES (?,?,?,?)').bind(s.stateHash,s.userId,s.nonceHash,s.expiresAt)
    ]);
  }
  async consumeState(stateHash:string,userId:string,nonceHash:string,now:number) {
    const row = await this.db.prepare('DELETE FROM linkedin_oauth_states WHERE state_hash = ? AND user_id = ? AND nonce_hash = ? AND expires_at > ? RETURNING state_hash').bind(stateHash,userId,nonceHash,now).first();
    return !!row;
  }
  async disconnect(userId:string) {
    await this.db.batch([
      this.db.prepare('DELETE FROM linkedin_connections WHERE user_id = ?').bind(userId),
      this.db.prepare('DELETE FROM linkedin_oauth_states WHERE user_id = ?').bind(userId)
    ]);
  }
  async claimPost(userId:string,requestId:string,contentHash:string) {
    const r=await this.db.prepare("INSERT INTO linkedin_post_requests (user_id,request_id,content_hash,status) VALUES (?,?,?,'pending') ON CONFLICT(user_id,request_id) DO NOTHING").bind(userId,requestId,contentHash).run();
    return r.meta.changes === 1;
  }
  async post(userId:string,requestId:string) {
    return this.db.prepare('SELECT content_hash AS contentHash,status,post_urn AS postUrn FROM linkedin_post_requests WHERE user_id = ? AND request_id = ?').bind(userId,requestId).first<PostRecord>();
  }
  async completePost(userId:string,requestId:string,status:string,postUrn?:string) {
    await this.db.prepare('UPDATE linkedin_post_requests SET status = ?,post_urn = ? WHERE user_id = ? AND request_id = ?').bind(status,postUrn??null,userId,requestId).run();
  }
}
