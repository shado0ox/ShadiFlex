import React from 'react';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleCopyError = () => {
    const errorDetails = `Error: ${this.state.error?.message}\nStack: ${this.state.error?.stack}\nComponent Stack: ${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(errorDetails);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2500);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[350px] w-full p-6 flex items-center justify-center bg-slate-50/70 border border-slate-200 rounded-2xl">
          <div className="max-w-xl w-full bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-rose-100 text-right space-y-5">
            <div className="flex items-center gap-3 text-rose-600 border-b border-rose-100 pb-4">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {this.props.fallbackTitle || 'حدث خطأ غير متوقع في هذا الجزء من النظام'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تم حماية النظام ومنع انهيار باقي الصفحات بفضل حاجز الأمان (Error Boundary)
                </p>
              </div>
            </div>

            <div className="p-4 bg-rose-50/70 rounded-xl border border-rose-200 text-xs text-rose-900 font-mono overflow-x-auto select-all">
              <span className="font-bold block mb-1">تفاصيل الخطأ التقني:</span>
              {this.state.error?.message || 'Unknown Application Error'}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {this.props.fallbackMessage ||
                'يمكنك محاولة إعادة تحميل هذا القسم أو التوجه للرئيسية دون فقدان باقي بياناتك المحاسبية المفتوحة.'}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleCopyError}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">تم نسخ التقرير</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>نسخ تفاصيل الخطأ</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-md cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>إعادة محاولة تحميل الصفحة</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
