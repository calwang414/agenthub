"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary 捕获到错误:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen bg-[#faf9f5]">
          <div className="text-center">
            <h2
              className="text-[#141413] mb-3"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px" }}
            >
              页面出现错误
            </h2>
            <p className="text-[#6c6a64] text-sm mb-6">请刷新页面重试</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-[#cc785c] text-white rounded-lg hover:bg-[#a9583e] transition-colors text-sm"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
