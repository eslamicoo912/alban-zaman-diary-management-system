import React from 'react';
import { PackageSearch, AlertCircle, RefreshCw, ArrowLeft, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface EmptyStatePageProps {
  title?: string;
  description?: string;
  type?: 'empty' | 'error' | 'not-found';
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyStatePage: React.FC<EmptyStatePageProps> = ({
  title,
  description,
  type = 'empty',
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  const { t } = useApp();

  const defaultTitle =
    type === 'error'
      ? t.errorOccurred || 'حدث خطأ غير متوقع'
      : type === 'not-found'
      ? t.pageNotFound || 'الصفحة غير موجودة'
      : t.noDataAvailable || 'لا توجد بيانات متاحة';

  const defaultDescription =
    type === 'error'
      ? t.errorOccurredDesc || 'حدثت مشكلة في تحميل هذا القسم. حاول مرة أخرى أو عد إلى نقطة البيع.'
      : type === 'not-found'
      ? t.pageNotFoundDesc || 'العرض أو التبويب الذي تبحث عنه غير موجود أو تم نقله.'
      : t.noDataAvailableDesc || 'لا توجد حالياً سجلات أو أصناف لعرضها في هذا القسم.';

  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
        <div
          className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${
            type === 'error'
              ? 'bg-rose-50 text-rose-600 border border-rose-100'
              : 'bg-slate-100 text-slate-500 border border-slate-200'
          }`}
        >
          {type === 'error' ? (
            <AlertCircle className="h-8 w-8" />
          ) : (
            <PackageSearch className="h-8 w-8" />
          )}
        </div>

        <h3 className="text-lg font-bold text-slate-900">
          {title || defaultTitle}
        </h3>

        <p className="mt-2 text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
          {description || defaultDescription}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {onAction && (
            <button
              onClick={onAction}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-98 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{actionLabel || t.goBackHome || 'اتخاذ إجراء'}</span>
            </button>
          )}

          {onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
              <span>{secondaryActionLabel || t.reload || 'إعادة التحميل'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
