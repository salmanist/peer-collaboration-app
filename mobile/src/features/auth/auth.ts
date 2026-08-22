// Barrel file — the only import surface other features may use for the auth
// feature's own internals. Shared session state lives in core/auth/session.ts
// and is imported directly by any feature, per the module-independence rule.
export { register, verifyEmail, login, fetchMe } from "./data/authApi";
