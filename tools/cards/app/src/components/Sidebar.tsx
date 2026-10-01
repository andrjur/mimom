import React from 'react';
import { 
  BookOpen, 
  BarChart2, 
  UserSquare2, 
  Heart, 
  Library,
  MoreHorizontal,
  Sparkles,
  Settings
} from 'lucide-react';
import { User } from '../types';

export type ViewType = 'learn' | 'tracker' | 'teacher';

interface SidebarProps {
  user: User;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onOpenPersonalization?: () => void;
  aiConfigured?: boolean;
}

export function Sidebar({ user, currentView, onViewChange, onOpenPersonalization, aiConfigured }: SidebarProps) {
  return (
    <aside className="app-sidebar w-full md:w-[220px] md:h-screen bg-white border-r border-zinc-100 flex flex-col flex-shrink-0 md:sticky md:top-0">
      {/* Logo */}
      <div className="sidebar-logo p-6 flex items-center gap-2">
        <div className="w-8 h-8 bg-green-900 rounded-lg flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-5 h-5">
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path d="M12 8v4l3 3" />
          </svg>
        </div>
        <span className="font-bold text-xl tracking-tight text-zinc-900">Репетитор.AI</span>
      </div>

      {/* Profile Card */}
      <div className="sidebar-profile px-4 mb-4">
        <div className="p-3 border border-zinc-100 rounded-2xl flex items-center gap-3 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
          <div className="w-10 h-10 rounded-xl bg-[#CBB5E0] text-[#4A2B66] font-bold flex items-center justify-center text-sm">
            {user.initials}
          </div>
          <div className="flex-1 overflow-hidden">
            <h3 className="font-semibold text-zinc-900 text-sm truncate">{user.name}</h3>
            <p className="text-xs text-zinc-500 truncate">{user.role} · {user.daysActive} дней</p>
          </div>
          <button 
            onClick={onOpenPersonalization}
            className="p-1 hover:bg-zinc-100 rounded-md text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
            title="Персонализация"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 max-md:flex max-md:flex-wrap max-md:gap-1 max-md:pb-3">
        <NavItem 
          icon={<BookOpen className="w-5 h-5" />} 
          label="Учиться" 
          active={currentView === 'learn'} 
          onClick={() => onViewChange('learn')}
           
        />
        <NavItem 
          icon={<BarChart2 className="w-5 h-5" />} 
          label="Мой трекер" 
          active={currentView === 'tracker'}
          onClick={() => onViewChange('tracker')}
        />
        <NavItem 
          icon={<UserSquare2 className="w-5 h-5" />} 
          label="Для учителя" 
          active={currentView === 'teacher'}
          onClick={() => onViewChange('teacher')}
        />



      </nav>

      {/* Footer */}
      <div className="p-6 border-t border-zinc-100 hidden md:block">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Текущий курс</p>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active, badge, onClick }: { icon: React.ReactNode; label: string; active?: boolean; badge?: string; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full max-md:w-auto max-md:flex-1 max-md:gap-1 max-md:px-2 flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium
        ${active 
          ? 'bg-[#EAF4ED] text-[#2F5241]' 
          : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
        }
      `}
    >
      <span className={active ? 'text-[#3E6B56]' : 'text-zinc-400'}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
          active ? 'bg-[#D7EBE1] text-[#2F5241]' : 'bg-zinc-100 text-zinc-500'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}
