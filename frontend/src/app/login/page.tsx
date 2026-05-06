"use client";

import { useState, useEffect, Suspense, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import NavLayout from "@/components/ui/nav-layout";

function LoginPageContent() {
  const { login, isLoggedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/marketplace";

  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      router.replace("/marketplace");
    }
  }, [isLoggedIn, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!account.trim()) {
      setError("请输入用户名或手机号");
      return;
    }
    if (!password) {
      setError("请输入密码");
      return;
    }

    setLoading(true);
    try {
      const result = await login(account.trim(), password);
      if (result.success) {
        router.replace(redirect);
      } else {
        setError(result.error || "登录失败");
      }
    } catch {
      setError("登录失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const getInputStyle = (field: string) => ({
    width: "100%",
    height: "40px",
    background: "var(--background)",
    border: `1px solid ${focusedField === field ? "var(--primary)" : "var(--border)"}`,
    borderRadius: "var(--radius)",
    padding: "10px 14px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "14px",
    color: "var(--foreground)",
    outline: "none",
    transition: "border-color 0.15s",
    boxSizing: "border-box" as const,
  });

  const labelStyle = {
    display: "block",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--foreground)",
    marginBottom: "4px",
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
              maxWidth: "400px",
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
              登录
            </h1>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                color: "var(--muted)",
                margin: "0 0 28px",
              }}
            >
              欢迎回到 AI 插件市场
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

              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>用户名 / 手机号</label>
                <input
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  onFocus={() => setFocusedField("account")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="请输入用户名、邮箱或手机号"
                  style={getInputStyle("account")}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={labelStyle}>密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="请输入密码"
                  style={getInputStyle("password")}
                />
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
                {loading ? "登录中..." : "登录"}
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
                没有账号？{" "}
                <Link
                  href="/register"
                  style={{
                    color: "var(--primary)",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  去注册
                </Link>
              </p>

            </form>
          </div>
        </div>
      </NavLayout>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}

