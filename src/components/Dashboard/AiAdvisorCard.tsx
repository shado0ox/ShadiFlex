import React from 'react';
import { Sparkles, ChevronLeft } from 'lucide-react';

interface AiAdvisorCardProps {
  onNavigateToAiAdvisor: () => void;
}

export const AiAdvisorCard: React.FC<AiAdvisorCardProps> = ({ onNavigateToAiAdvisor }) => {
  return (
    <div
      onClick={onNavigateToAiAdvisor}
      className="bg-purple-50/70 border border-purple-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-purple-300 transition cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-600 text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-purple-900">المستشار المالي الذكي</h4>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200/80 text-purple-800">
          مدعوم بالذكاء الاصطناعي
        </span>
      </div>

      <p className="text-xs text-purple-800 leading-relaxed">
        احصل على تحليل فوري للتدفقات النقدية، نصائح لتحسين هوامش الربح، وفحص مدى التوافق مع ضريبة القيمة المضافة.
      </p>

      <div className="pt-2 text-xs font-bold text-purple-900 flex items-center gap-1">
        <span>بدء محادثة استشارية</span>
        <ChevronLeft className="w-3.5 h-3.5" />
      </div>
    </div>
  );
};

export default AiAdvisorCard;
