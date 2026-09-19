import React from 'react';
import { AlertTriangle, RotateCcw, Home, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  copied: boolean;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleCopy = () => {
    const details = `خطأ: ${this.state.error?.message || 'غير معروف'}\nأثر الخطأ:\n${
      this.state.error?.stack || ''
    }\nأثر المكوّن:\n${this.state.errorInfo?.componentStack || ''}`;
    navigator.clipboard.writeText(details);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2500);
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] w-full flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="max-w-md w-full rounded-2xl border border-rose-200 bg-white p-6 shadow-xl sm:p-8">
            {/* Warning Icon */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
              <AlertTriangle className="h-7 w-7" />
            </div>

            {/* Heading */}
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
              {this.props.fallbackTitle || 'خطأ غير متوقع في التطبيق'}
            </h2>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              واجهنا خطأً أثناء عرض هذه الوحدة. مخزونك وسلة المشتريات وحالة الكاشير لا تزال محفوظة في الذاكرة.
            </p>

            {/* Error Message Snippet */}
            {this.state.error && (
              <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/70 p-3 text-left font-mono text-[11px] text-rose-800 break-words rtl:text-right">
                <span className="font-bold">خطأ:</span> {this.state.error.message}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-98 transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>إعادة المحاولة والاسترداد</span>
              </button>

              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Home className="h-3.5 w-3.5 text-slate-400" />
                <span>إعادة تحميل الصفحة</span>
              </button>
            </div>

            {/* Diagnostics collapsible */}
            <div className="mt-6 border-t border-slate-100 pt-4">
              <button
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="flex w-full items-center justify-between text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                <span>سجلات التشخيص</span>
                {this.state.showDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {this.state.showDetails && (
                <div className="mt-3 space-y-2 text-left rtl:text-right">
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-slate-900 p-2.5 font-mono text-[10px] text-slate-300">
                    {this.state.error?.stack || 'لا يتوفر أثر للخطأ.'}
                  </div>
                  <button
                    onClick={this.handleCopy}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {this.state.copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-600">تم النسخ إلى الحافظة!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>نسخ سجل الأخطاء</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
