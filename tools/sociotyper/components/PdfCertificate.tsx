import React, { forwardRef } from 'react';
import { AnalysisResult } from '../types';
import { TIM_DEFINITIONS } from '../constants';

interface PdfCertificateProps {
  sessionName: string;
  result: AnalysisResult;
  psychosophyType: string;
}

export const PdfCertificate = forwardRef<HTMLDivElement, PdfCertificateProps>(({ sessionName, result, psychosophyType }, ref) => {
  const currentTim = TIM_DEFINITIONS[result.tim.abbreviation];
  const date = new Date().toLocaleDateString('ru-RU');

  return (
    <div 
      ref={ref} 
      className="absolute top-[-9999px] left-[-9999px] bg-[#FAF8F5] p-12 font-serif text-[#3A2D23] w-[800px] shadow-2xl"
      style={{ backgroundImage: 'radial-gradient(#8E5A35 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }}
    >
      <div className="border-4 border-[#8E5A35] p-10 bg-white/95 rounded-xl shadow-lg relative overflow-hidden">
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-8 border-l-8 border-[#8E5A35] m-4"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-8 border-r-8 border-[#8E5A35] m-4"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-8 border-l-8 border-[#8E5A35] m-4"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-8 border-r-8 border-[#8E5A35] m-4"></div>
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold uppercase tracking-widest text-[#8E5A35] mb-2">Сертификат Типирования</h1>
          <p className="text-lg italic text-[#8E5A35]/70">Socionics AI Typist</p>
        </div>

        <div className="mb-10 text-center">
          <p className="text-xl mb-2">Настоящим подтверждается, что</p>
          <h2 className="text-5xl font-bold text-[#8E5A35] my-4 py-2 border-y-2 border-[#8E5A35]/20 inline-block px-10">{sessionName}</h2>
          <p className="text-xl mt-2">прошел(ла) глубинную нейро-диагностику личности</p>
        </div>

        <div className="flex gap-8 mb-10">
          <div className="flex-1 bg-[#8E5A35]/5 p-6 rounded-lg border border-[#8E5A35]/10 text-center">
            <h3 className="text-sm font-bold tracking-widest text-[#8E5A35] uppercase mb-2">Основной Социотип</h3>
            <p className="text-4xl font-bold text-[#8E5A35]">{currentTim?.name || result.tim.name}</p>
            <p className="text-xl text-[#8E5A35]/80 mt-1">({result.tim.abbreviation})</p>
          </div>
          <div className="flex-1 bg-[#8E5A35]/5 p-6 rounded-lg border border-[#8E5A35]/10 text-center">
            <h3 className="text-sm font-bold tracking-widest text-[#8E5A35] uppercase mb-2">Психософский профиль</h3>
            <p className="text-4xl font-bold text-[#8E5A35]">{psychosophyType || 'Не определен'}</p>
            <p className="text-xl text-[#8E5A35]/80 mt-1">Тип личности</p>
          </div>
        </div>

        <div className="mb-10">
          <h3 className="text-lg font-bold border-b border-[#8E5A35]/20 pb-2 mb-4 text-[#8E5A35]">Ключевые черты:</h3>
          <p className="text-lg leading-relaxed text-justify">{result.summary}</p>
        </div>

        <div className="flex justify-between items-end mt-12 pt-8 border-t-2 border-[#8E5A35]/20">
          <div>
            <p className="text-sm font-bold text-[#8E5A35]">Дата типирования:</p>
            <p className="text-lg">{date}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-[#8E5A35]">Главный аналитик:</p>
            <p className="text-xl font-bold signature-font italic">НейроИндыков ИИ</p>
          </div>
        </div>
      </div>
    </div>
  );
});
