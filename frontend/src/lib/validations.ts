export type ValidationResult = { valid: true } | { valid: false; error: string };

export function validateRequired(val: unknown, minLen = 1, maxLen = 200): ValidationResult {
  if (typeof val !== "string") return { valid: false, error: "必须是字符串" };
  if (val.trim().length < minLen) return { valid: false, error: `至少${minLen}个字符` };
  if (val.trim().length > maxLen) return { valid: false, error: `不能超过${maxLen}个字符` };
  return { valid: true };
}

export function validateEmail(val: unknown): ValidationResult {
  if (typeof val !== "string") return { valid: false, error: "必须是字符串" };
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(val.trim())) return { valid: false, error: "邮箱格式不正确" };
  return { valid: true };
}

export function validateRole(val: unknown): ValidationResult {
  if (typeof val !== "string" || !["admin", "editor", "guest"].includes(val)) {
    return { valid: false, error: "角色必须是 admin、editor 或 guest" };
  }
  return { valid: true };
}

export function validateStatus(val: unknown, allowed: string[]): ValidationResult {
  if (typeof val !== "string" || !allowed.includes(val)) {
    return { valid: false, error: `状态必须是 ${allowed.join("、")}` };
  }
  return { valid: true };
}
