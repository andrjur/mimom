import React, { useState, useMemo } from 'react';

interface SociotypeNode {
  abbr: string;
  name: string;
  quadra: 'Альфа' | 'Бэта' | 'Гамма' | 'Дельта';
  x: number;
  y: number;
  dual: string;
  extrovert: boolean;
  rational: boolean;
  logic: boolean;
  intuition: boolean;
  staticType: boolean;
}

const SOCIOTYPES: SociotypeNode[] = [
  // Alpha (Top Left)
  { abbr: 'ИЛЭ', name: 'Дон Кихот', quadra: 'Альфа', x: 180, y: 80, dual: 'СЭИ', extrovert: true, rational: false, logic: true, intuition: true, staticType: true },
  { abbr: 'СЭИ', name: 'Дюма', quadra: 'Альфа', x: 320, y: 80, dual: 'ИЛЭ', extrovert: false, rational: false, logic: false, intuition: false, staticType: false },
  { abbr: 'ЭСЭ', name: 'Гюго', quadra: 'Альфа', x: 180, y: 170, dual: 'ЛИИ', extrovert: true, rational: true, logic: false, intuition: false, staticType: false },
  { abbr: 'ЛИИ', name: 'Робеспьер', quadra: 'Альфа', x: 320, y: 170, dual: 'ЭСЭ', extrovert: false, rational: true, logic: true, intuition: true, staticType: true },

  // Beta (Top Right)
  { abbr: 'ЭИЭ', name: 'Гамлет', quadra: 'Бэта', x: 680, y: 80, dual: 'ЛСИ', extrovert: true, rational: true, logic: false, intuition: true, staticType: false },
  { abbr: 'ЛСИ', name: 'Максим Горький', quadra: 'Бэта', x: 820, y: 80, dual: 'ЭИЭ', extrovert: false, rational: true, logic: true, intuition: false, staticType: true },
  { abbr: 'СЛЭ', name: 'Жуков', quadra: 'Бэта', x: 680, y: 170, dual: 'ИЭИ', extrovert: true, rational: false, logic: true, intuition: false, staticType: true },
  { abbr: 'ИЭИ', name: 'Есенин', quadra: 'Бэта', x: 820, y: 170, dual: 'СЛЭ', extrovert: false, rational: false, logic: false, intuition: true, staticType: false },

  // Gamma (Bottom Left)
  { abbr: 'СЭЭ', name: 'Наполеон', quadra: 'Гамма', x: 180, y: 280, dual: 'ИЛИ', extrovert: true, rational: false, logic: false, intuition: false, staticType: true },
  { abbr: 'ИЛИ', name: 'Бальзак', quadra: 'Гамма', x: 320, y: 280, dual: 'СЭЭ', extrovert: false, rational: false, logic: false, intuition: true, staticType: false },
  { abbr: 'ЛИЭ', name: 'Джек Лондон', quadra: 'Гамма', x: 180, y: 370, dual: 'ЭСИ', extrovert: true, rational: true, logic: true, intuition: true, staticType: false },
  { abbr: 'ЭСИ', name: 'Драйзер', quadra: 'Гамма', x: 320, y: 370, dual: 'ЛИЭ', extrovert: false, rational: true, logic: false, intuition: false, staticType: true },

  // Delta (Bottom Right)
  { abbr: 'ЛСЭ', name: 'Штирлиц', quadra: 'Дельта', x: 680, y: 280, dual: 'ЭИИ', extrovert: true, rational: true, logic: true, intuition: false, staticType: false },
  { abbr: 'ЭИИ', name: 'Достоевский', quadra: 'Дельта', x: 820, y: 280, dual: 'ЛСЭ', extrovert: false, rational: true, logic: false, intuition: true, staticType: true },
  { abbr: 'ИЭЭ', name: 'Гексли', quadra: 'Дельта', x: 680, y: 370, dual: 'СЛИ', extrovert: true, rational: false, logic: false, intuition: true, staticType: true },
  { abbr: 'СЛИ', name: 'Габен', quadra: 'Дельта', x: 820, y: 370, dual: 'ИЭЭ', extrovert: false, rational: false, logic: true, intuition: false, staticType: false },
];

interface AspectItem {
  id: string;
  symbol: string;
  name: string;
  desc: string;
  primaryTypes: string[]; // types that use this as dominant (base)
  secondaryTypes: string[]; // types that use this as creative
}

const ASPECTS: AspectItem[] = [
  { id: 'ЧЛ', symbol: '■', name: 'Деловая Логика', desc: 'Эффективность, выгода, технология, факты', primaryTypes: ['ЛИЭ', 'ЛСЭ'], secondaryTypes: ['ИЛЭ', 'СЛИ'] },
  { id: 'БЛ', symbol: '□', name: 'Структурная Логика', desc: 'Система, правила, логические связи, анализ', primaryTypes: ['ЛИИ', 'ЛСИ'], secondaryTypes: ['СЛЭ', 'ИЛИ'] },
  { id: 'ЧЭ', symbol: '▲', name: 'Этика Эмоций', desc: 'Эмоциональное состояние, атмосфера, страсть', primaryTypes: ['ЭСЭ', 'ЭИЭ'], secondaryTypes: ['СЭИ', 'ИЭИ'] },
  { id: 'БЭ', symbol: '△', name: 'Этика Отношений', desc: 'Мораль, симпатии, притяжение, дистанция', primaryTypes: ['ЭСИ', 'ЭИИ'], secondaryTypes: ['СЭЭ', 'ИЭЭ'] },
  { id: 'ЧИ', symbol: '●', name: 'Интуиция Возможностей', desc: 'Суть, идеи, потенциал, альтернативы', primaryTypes: ['ИЛЭ', 'ИЭЭ'], secondaryTypes: ['ЛИИ', 'ЭИИ'] },
  { id: 'БИ', symbol: '○', name: 'Интуиция Времени', desc: 'Прогнозы, предчувствие, история, ритм', primaryTypes: ['ИЭИ', 'ИЛИ'], secondaryTypes: ['ЭИЭ', 'ЛИЭ'] },
  { id: 'ЧС', symbol: '⬢', name: 'Волевая Сенсорика', desc: 'Пространство, воля, сила, влияние, статус', primaryTypes: ['СЛЭ', 'СЭЭ'], secondaryTypes: ['ЛСИ', 'ЭСИ'] },
  { id: 'БС', symbol: '⬡', name: 'Сенсорика Ощущений', desc: 'Комфорт, эстетика, уют, здоровье, гармония', primaryTypes: ['СЭИ', 'СЛИ'], secondaryTypes: ['ЭСЭ', 'ЛСЭ'] },
];

interface DichotomyItem {
  id: string;
  name: string;
  pole1: string;
  pole2: string;
  test: (node: SociotypeNode) => boolean; // returns true for pole1, false for pole2
}

const DICHOTOMIES: DichotomyItem[] = [
  { id: 'extrovert', name: 'Экстраверсия / Интроверсия', pole1: 'Экстраверты', pole2: 'Интроверты', test: n => n.extrovert },
  { id: 'rational', name: 'Рациональность / Иррациональность', pole1: 'Рационалы', pole2: 'Иррационалы', test: n => n.rational },
  { id: 'logic', name: 'Логика / Этика', pole1: 'Логики', pole2: 'Этики', test: n => n.logic },
  { id: 'intuition', name: 'Интуиция / Сенсорика', pole1: 'Интуиты', pole2: 'Сенсорики', test: n => n.intuition },
  { id: 'staticType', name: 'Статика / Динамика', pole1: 'Статики', pole2: 'Динамики', test: n => n.staticType },
];

const NeuroAnimation: React.FC = () => {
  const [hoveredNode, setHoveredNode] = useState<SociotypeNode | null>(null);
  const [selectedQuadra, setSelectedQuadra] = useState<'Альфа' | 'Бэта' | 'Гамма' | 'Дельта' | null>(null);
  const [activeAspect, setActiveAspect] = useState<string | null>(null);
  const [activeDichotomy, setActiveDichotomy] = useState<string | null>(null);

  const selectedAspectData = useMemo(() => {
    return ASPECTS.find(a => a.id === activeAspect) || null;
  }, [activeAspect]);

  const selectedDichotomyData = useMemo(() => {
    return DICHOTOMIES.find(d => d.id === activeDichotomy) || null;
  }, [activeDichotomy]);

  const isNodeHighlighted = (node: SociotypeNode) => {
    if (selectedQuadra && node.quadra !== selectedQuadra) return false;
    
    if (activeAspect && selectedAspectData) {
      return selectedAspectData.primaryTypes.includes(node.abbr) || selectedAspectData.secondaryTypes.includes(node.abbr);
    }

    if (activeDichotomy && selectedDichotomyData) {
      // both poles are highlighted but differently
      return true;
    }

    if (hoveredNode) {
      return node.abbr === hoveredNode.abbr || node.abbr === hoveredNode.dual;
    }

    return true;
  };

  const getNodeColorClass = (node: SociotypeNode) => {
    if (!isNodeHighlighted(node)) {
      return 'fill-[#E8DDD0] opacity-60 scale-90 transition-all duration-300';
    }

    if (activeDichotomy && selectedDichotomyData) {
      const isPole1 = selectedDichotomyData.test(node);
      return isPole1 
        ? 'fill-[#C4663A] drop-shadow-[0_0_8px_rgba(196,102,58,0.5)] scale-115' 
        : 'fill-[#1F4E79] drop-shadow-[0_0_8px_rgba(31,78,121,0.5)] scale-115';
    }

    if (activeAspect && selectedAspectData) {
      if (selectedAspectData.primaryTypes.includes(node.abbr)) {
        return 'fill-[#C4663A] drop-shadow-[0_0_10px_rgba(196,102,58,0.7)] scale-125';
      }
      return 'fill-[#D4845A] drop-shadow-[0_0_6px_rgba(212,132,90,0.4)] scale-110';
    }

    if (hoveredNode) {
      if (node.abbr === hoveredNode.abbr) return 'fill-[#C4663A] scale-125 drop-shadow-[0_0_12px_rgba(196,102,58,0.8)]';
      if (node.abbr === hoveredNode.dual) return 'fill-[#D4A843] scale-115 drop-shadow-[0_0_8px_rgba(212,168,67,0.7)]';
    }

    // Default high-contrast premium colors by Quadra
    switch (node.quadra) {
      case 'Альфа': return 'fill-[#347A5C] hover:fill-[#2A6149] drop-shadow-[0_0_6px_rgba(52,122,92,0.15)]';
      case 'Бэта': return 'fill-[#3F51B5] hover:fill-[#303F9F] drop-shadow-[0_0_6px_rgba(63,81,181,0.15)]';
      case 'Гамма': return 'fill-[#C4663A] hover:fill-[#A3522E] drop-shadow-[0_0_6px_rgba(196,102,58,0.15)]';
      case 'Дельта': return 'fill-[#1F6E72] hover:fill-[#165053] drop-shadow-[0_0_6px_rgba(31,110,114,0.15)]';
    }
  };

  const renderDualityBridges = () => {
    const bridges = [
      { from: 'ИЛЭ', to: 'СЭИ', q: 'Альфа' },
      { from: 'ЭСЭ', to: 'ЛИИ', q: 'Альфа' },
      { from: 'ЭИЭ', to: 'ЛСИ', q: 'Бэта' },
      { from: 'СЛЭ', to: 'ИЭИ', q: 'Бэта' },
      { from: 'СЭЭ', to: 'ИЛИ', q: 'Гамма' },
      { from: 'ЛИЭ', to: 'ЭСИ', q: 'Гамма' },
      { from: 'ЛСЭ', to: 'ЭИИ', q: 'Дельта' },
      { from: 'ИЭЭ', to: 'СЛИ', q: 'Дельта' },
    ];

    return bridges.map((b, idx) => {
      const nodeFrom = SOCIOTYPES.find(n => n.abbr === b.from)!;
      const nodeTo = SOCIOTYPES.find(n => n.abbr === b.to)!;

      const isHighlighted = 
        (!selectedQuadra || b.q === selectedQuadra) &&
        (!activeAspect || (isNodeHighlighted(nodeFrom) && isNodeHighlighted(nodeTo))) &&
        (!activeDichotomy) &&
        (!hoveredNode || hoveredNode.abbr === b.from || hoveredNode.abbr === b.to);

      return (
        <line
          key={idx}
          x1={nodeFrom.x}
          y1={nodeFrom.y}
          x2={nodeTo.x}
          y2={nodeTo.y}
          stroke={isHighlighted ? '#C4663A' : '#ECE8E1'}
          strokeWidth={isHighlighted ? 1.6 : 0.6}
          strokeDasharray={isHighlighted ? '4 3' : '2 4'}
          className="transition-all duration-500 opacity-60"
        />
      );
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto my-8 border border-brand-primary/10 bg-brand-surface rounded-2xl overflow-hidden shadow-sm flex flex-col transition-all duration-300">
      
      {/* Top Controller Bar */}
      <div className="p-4 border-b border-brand-primary/10 bg-brand-bg flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Quadras */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-brand-text-secondary font-medium font-mono">Квадры:</span>
          <button 
            onClick={() => { setSelectedQuadra(null); setActiveAspect(null); }}
            className={`px-2.5 py-1 rounded-full border transition-all ${!selectedQuadra ? 'bg-brand-primary text-white border-brand-primary font-bold' : 'bg-brand-surface hover:bg-brand-cream-dark border-brand-primary/10 text-brand-text'}`}
          >
            Все
          </button>
          {(['Альфа', 'Бэта', 'Гамма', 'Дельта'] as const).map(q => (
            <button
              key={q}
              onClick={() => { setSelectedQuadra(q); setActiveAspect(null); }}
              className={`px-2.5 py-1 rounded-full border transition-all ${selectedQuadra === q ? 'bg-brand-primary text-white border-brand-primary font-bold' : 'bg-brand-surface hover:bg-brand-cream-dark border-brand-primary/10 text-brand-text'}`}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Reinin Dichotomies */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-brand-text-secondary font-medium font-mono">Признаки Рейнина:</span>
          <button
            onClick={() => { setActiveDichotomy(null); }}
            className={`px-2.5 py-1 rounded-full border transition-all ${!activeDichotomy ? 'bg-brand-primary text-white border-brand-primary font-bold' : 'bg-brand-surface hover:bg-brand-cream-dark border-brand-primary/10 text-brand-text'}`}
          >
            Выкл
          </button>
          {DICHOTOMIES.map(d => (
            <button
              key={d.id}
              onClick={() => { setActiveDichotomy(d.id); setActiveAspect(null); setSelectedQuadra(null); }}
              className={`px-2.5 py-1 rounded-full border transition-all ${activeDichotomy === d.id ? 'bg-brand-primary text-white border-brand-primary font-bold' : 'bg-brand-surface hover:bg-brand-cream-dark border-brand-primary/10 text-brand-text'}`}
            >
              {d.name.split(' / ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Interactive Legend Banner */}
      {selectedDichotomyData && (
        <div className="bg-[#FAF7F2] border-b border-[#C4663A]/10 px-4 py-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-serif text-[#2A1810] animate-fade-in">
          <span className="font-bold text-[#C4663A] text-xs uppercase tracking-wide font-mono">Признак: {selectedDichotomyData.name}</span>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-[#C4663A]/20 shadow-sm">
            <span className="w-3 h-3 rounded-full bg-[#C4663A] inline-block shadow-sm"></span>
            <span className="font-sans font-bold text-xs text-[#2A1810]">{selectedDichotomyData.pole1}</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-[#1F4E79]/30 shadow-sm">
            <span className="w-3 h-3 rounded-full bg-[#1F4E79] inline-block shadow-sm"></span>
            <span className="font-sans font-bold text-xs text-[#2A1810]">{selectedDichotomyData.pole2}</span>
          </div>
        </div>
      )}

      {selectedAspectData && (
        <div className="bg-[#FAF7F2] border-b border-[#C4663A]/10 px-4 py-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-serif text-[#2A1810] animate-fade-in">
          <span className="font-bold text-[#C4663A] text-xs uppercase tracking-wide font-mono">Выбранный Аспект:</span>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-[#C4663A]/15 shadow-sm">
            <span className="font-sans font-extrabold text-sm text-[#C4663A]">{selectedAspectData.symbol}</span>
            <span className="font-sans font-bold text-xs text-[#2A1810]">{selectedAspectData.name}</span>
            <span className="text-[11px] text-[#7A6B5D] italic font-sans border-l border-[#C4663A]/15 pl-2 ml-1">{selectedAspectData.desc}</span>
          </div>
        </div>
      )}

      {/* Main SVG Interactive Stage */}
      <div className="relative w-full aspect-[2.2/1] bg-brand-surface min-h-[220px]">
        <svg 
          viewBox="0 0 1000 450" 
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Sector Borders */}
          <line x1="500" y1="20" x2="500" y2="430" stroke="#ECE8E1" strokeWidth="1" strokeDasharray="5 5" />
          <line x1="100" y1="225" x2="900" y2="225" stroke="#ECE8E1" strokeWidth="1" strokeDasharray="5 5" />

          {/* Sector Labels */}
          <text x="120" y="45" fill="#2A1810" opacity="0.15" fontSize="24" fontFamily="Georgia" fontWeight="bold">I. АЛЬФА</text>
          <text x="880" y="45" fill="#2A1810" opacity="0.15" fontSize="24" fontFamily="Georgia" fontWeight="bold" textAnchor="end">II. БЭТА</text>
          <text x="120" y="420" fill="#2A1810" opacity="0.15" fontSize="24" fontFamily="Georgia" fontWeight="bold">III. ГАММА</text>
          <text x="880" y="420" fill="#2A1810" opacity="0.15" fontSize="24" fontFamily="Georgia" fontWeight="bold" textAnchor="end">IV. ДЕЛЬТА</text>

          {/* Duality connections / bridges */}
          {renderDualityBridges()}

          {/* Central decorative socionic aspect ring */}
          <circle cx="500" cy="225" r="50" fill="none" stroke="#C4663A" strokeWidth="0.8" opacity="0.3" />
          <circle cx="500" cy="225" r="70" fill="none" stroke="#C4663A" strokeWidth="0.4" opacity="0.15" strokeDasharray="4 8" />

          {/* Render Type Nodes */}
          {SOCIOTYPES.map((node) => {
            const isLit = isNodeHighlighted(node);
            const colorClass = getNodeColorClass(node);

            return (
              <g 
                key={node.abbr}
                className="cursor-pointer group transition-all duration-300"
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Outer halo - only for custom focus hover to avoid visual noise */}
                {isLit && !activeDichotomy && !activeAspect && hoveredNode?.abbr === node.abbr && (
                  <circle 
                    cx={node.x} 
                    cy={node.y} 
                    r="18" 
                    fill="none" 
                    stroke="#C4663A" 
                    strokeWidth="0.5" 
                    opacity="0.15" 
                    className="animate-pulse"
                  />
                )}

                {/* Core Node Circle */}
                <circle 
                  cx={node.x} 
                  cy={node.y} 
                  r={hoveredNode?.abbr === node.abbr ? '10' : '7'} 
                  className={`transition-all duration-300 ${colorClass}`}
                />

                {/* Labels */}
                <text 
                  x={node.x} 
                  y={node.y - 14} 
                  textAnchor="middle" 
                  className={`text-[11px] select-none transition-colors duration-200 ${isLit ? 'fill-[#2A1810] font-bold' : 'fill-[#7A6B5D]/70 font-medium'}`}
                >
                  {node.abbr}
                </text>
                <text 
                  x={node.x} 
                  y={node.y + 22} 
                  textAnchor="middle" 
                  className={`text-[9px] select-none transition-all duration-200 ${isLit ? 'fill-[#7A6B5D] font-medium' : 'fill-transparent'}`}
                >
                  {node.name}
                </text>
              </g>
            );
          })}

          {/* Display active dichotomy text or instructions */}
          <text x="500" y="228" textAnchor="middle" className="fill-[#C4663A] text-[10px] tracking-widest font-bold uppercase select-none opacity-40 font-mono">ТИПЫ</text>
        </svg>

        {/* Hover / Highlight Tooltip Overlay */}
        {hoveredNode && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white border border-[#C4663A]/15 shadow-lg px-4 py-2.5 rounded-xl text-xs max-w-sm text-center leading-relaxed backdrop-blur-sm pointer-events-none animate-fade-in text-[#2A1810] font-serif border border-[#C4663A]/10">
            ТИМ: <strong className="text-[#C4663A] font-serif">{hoveredNode.name} ({hoveredNode.abbr})</strong><br/>
            <span className="text-[10px] font-sans text-[#7A6B5D]">
              Дуал: <strong className="text-[#2A1810] font-semibold">{hoveredNode.dual}</strong> &nbsp;•&nbsp; Квадра: <strong className="text-[#2A1810] font-semibold">{hoveredNode.quadra}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Aspects Selector Controls (Bottom row) */}
      <div className="p-4 bg-brand-surface border-t border-brand-primary/5">
        <div className="text-center text-[10px] font-bold text-brand-text-secondary uppercase tracking-widest font-mono mb-2.5">
          8 Аспектов Соционики (нажмите для фильтрации типов)
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {ASPECTS.map((aspect) => (
            <button
              key={aspect.id}
              onClick={() => {
                setActiveAspect(activeAspect === aspect.id ? null : aspect.id);
                setActiveDichotomy(null);
                setSelectedQuadra(null);
              }}
              className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${activeAspect === aspect.id ? 'bg-brand-primary border-brand-primary text-white shadow-sm' : 'bg-brand-bg border-brand-primary/10 hover:bg-brand-cream-dark text-brand-text'}`}
            >
              <span className="text-sm leading-none font-bold mb-0.5">{aspect.symbol}</span>
              <span className="text-[9px] font-bold font-mono tracking-wider">{aspect.id}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NeuroAnimation;
