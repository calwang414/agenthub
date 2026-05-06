"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import NavLayout from "@/components/ui/nav-layout";

interface FieldErrors {
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function validatePhone(phone: string): boolean {
  return /^[\d\-()（）+\s]{7,20}$/.test(phone);
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function RegisterPage() {
  const { register, isLoggedIn } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isLoggedIn) {
      router.replace("/marketplace");
    }
  }, [isLoggedIn, router]);

  const validate = (): boolean => {
    const errors: FieldErrors = {};

    if (!name.trim() || name.trim().length < 2) {
      errors.name = "用户名至少需要 2 个字符";
    }
    if (!phone.trim() || !validatePhone(phone.trim())) {
      errors.phone = "请输入有效的手机号";
    }
    if (!email.trim() || !validateEmail(email.trim())) {
      errors.email = "请输入有效的邮箱地址";
    }
    if (!password || password.length < 6) {
      errors.password = "密码至少需要 6 个字符";
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "两次输入的密码不一致";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => new Set(prev).add(field));
    validate();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setTouched(new Set(["name", "phone", "email", "password", "confirmPassword"]));

    if (!validate()) return;

    setLoading(true);
    try {
      const result = await register({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
      });
      if (result.success) {
        router.replace("/marketplace");
      } else {
        setError(result.error || "注册失败");
      }
    } catch {
      setError("注册失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const getInputStyle = (field: string) => {
    const hasError = touched.has(field) && fieldErrors[field as keyof FieldErrors];
    return {
      width: "100%",
      height: "40px",
      background: "var(--background)",
      border: `1px solid ${focusedField === field ? "var(--primary)" : hasError ? "#c64545" : "var(--border)"}`,
      borderRadius: "var(--radius)",
      padding: "10px 14px",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      fontSize: "14px",
      color: "var(--foreground)",
      outline: "none",
      transition: "border-color 0.15s",
      boxSizing: "border-box" as const,
    };
  };

  const labelStyle = {
    display: "block",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--foreground)",
    marginBottom: "4px",
  };

  const errorStyle = {
    fontFamily: "'Inter', sans-serif",
    fontSize: "12px",
    color: "#c64545",
    marginTop: "4px",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
      `}</style>

      <NavLayout>
        <div
          className="flex items-center justify-center"
          style={{ minHeight: "calc(100vh - 64px - 200px)", padding: "48px 24px" }}
        >
          <div
            style={{
              background: "var(--background)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              padding: "40px",
              width: "100%",
              maxWidth: "420px",
            }}
          >
            <h1
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "28px",
                fontWeight: 400,
                color: "var(--foreground)",
                letterSpacing: "-0.3px",
                margin: "0 0 4px",
                lineHeight: 1.2,
              }}
            >
              创建账号
            </h1>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                color: "var(--muted)",
                margin: "0 0 28px",
              }}
            >
              注册后即可浏览和收藏插件
            </p>

            <form onSubmit={handleSubmit}>
              {error && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "var(--radius)",
                    padding: "10px 14px",
                    marginBottom: "20px",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    color: "#c64545",
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>用户名 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => { setFocusedField(null); handleBlur("name"); }}
                  placeholder="至少 2 个字符"
                  style={getInputStyle("name")}
                />
                {touched.has("name") && fieldErrors.name && (
                  <div style={errorStyle}>{fieldErrors.name}</div>
                )}
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>手机号 *</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onFocus={() => setFocusedField("phone")}
                  onBlur={() => { setFocusedField(null); handleBlur("phone"); }}
                  placeholder="请输入手机号"
                  style={getInputStyle("phone")}
                />
                {touched.has("phone") && fieldErrors.phone && (
                  <div style={errorStyle}>{fieldErrors.phone}</div>
                )}
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>邮箱 *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => { setFocusedField(null); handleBlur("email"); }}
                  placeholder="请输入邮箱地址"
                  style={getInputStyle("email")}
                />
                {touched.has("email") && fieldErrors.email && (
                  <div style={errorStyle}>{fieldErrors.email}</div>
                )}
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>密码 *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => { setFocusedField(null); handleBlur("password"); }}
                  placeholder="至少 6 个字符"
                  style={getInputStyle("password")}
                />
                {touched.has("password") && fieldErrors.password && (
                  <div style={errorStyle}>{fieldErrors.password}</div>
                )}
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={labelStyle}>确认密码 *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setFocusedField("confirmPassword")}
                  onBlur={() => { setFocusedField(null); handleBlur("confirmPassword"); }}
                  placeholder="请再次输入密码"
                  style={getInputStyle("confirmPassword")}
                />
                {touched.has("confirmPassword") && fieldErrors.confirmPassword && (
                  <div style={errorStyle}>{fieldErrors.confirmPassword}</div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  height: "40px",
                  background: loading ? "var(--primary-disabled)" : "var(--primary)",
                  color: "var(--primary-foreground)",
                  border: "none",
                  borderRadius: "var(--radius)",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.background = "var(--primary-active)";
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.background = "var(--primary)";
                }}
              >
                {loading ? "注册中..." : "注册"}
              </button>

              <p
                style={{
                  textAlign: "center",
                  marginTop: "20px",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  color: "var(--muted)",
                }}
              >
                已有账号？{" "}
                <Link
                  href="/login"
                  style={{
                    color: "var(--primary)",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  去登录
                </Link>
              </p>
            </form>
          </div>
        </div>
      </NavLayout>
    </>
  );
}
