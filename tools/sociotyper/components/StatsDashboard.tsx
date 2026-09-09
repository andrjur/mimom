import React, { useState, useEffect } from 'react';
import { BarChart2, RefreshCw, BarChart as LucideBarChart, Activity, Zap, MessageSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getGlobalStats, UsageStats } from '../services/statsService';

export const StatsDashboard: React.FC = () => {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadStats = () => {
    setIsRefreshing(true);
    // Simulate network delay for nice UX
    setTimeout(() => {
      setStats(getGlobalStats());
      setIsRefreshing(false);
    }, 400);
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (!stats) return null;

  // Prepare data for the chart
  const providerData = Object.entries(stats.providerStats)
    .filter(([ , data]) => data.launches > 0 || data.typings > 0)
    .map(([provider, data]) => ({
      name: provider.toUpperCase(),
      "Анализов (Типирований)": data.typings,
      "Запусков приложения": data.launches,
    }))
    .sort((a, b) => b["Анализов (Типирований)"] - a["Анализов (Типирований)"]);

  const colors = {
    primary: '#D97706', // amber-600
    secondary: '#F59E0B', // amber-500
  };

  return (
    <div className="bg-brand-surface p-4 sm:p-6 rounded-2xl border border-brand-primary/10 shadow-sm animate-fade-in text-left max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-brand-primary/10">
        <div>
          <h2 className="text-xl font-bold text-brand-primary font-serif flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-brand-secondary" />
            <span>Статистика использования</span>
          </h2>
          <p className="text-xs text-brand-text-secondary mt-1 font-sans">
            Анализ активности, популярности нейросетей и расхода токенов на устройстве.
          </p>
        </div>
        <button
          onClick={loadStats}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary/5 hover:bg-brand-primary/10 text-brand-primary hover:text-brand-secondary transition-all duration-300 rounded-lg text-xs font-bold border border-brand-primary/10 cursor-pointer disabled:opacity-50"
          title="Обновить данные статистики"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Обновить</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-primary/10 flex flex-col items-center justify-center text-center">
          <Activity className="w-6 h-6 text-brand-primary mb-2" />
          <div className="text-2xl font-bold text-brand-text">{stats.launches}</div>
          <div className="text-xs text-brand-text-secondary uppercase tracking-wider mt-1">Запусков приложения</div>
        </div>
        <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-primary/10 flex flex-col items-center justify-center text-center">
          <LucideBarChart className="w-6 h-6 text-brand-primary mb-2" />
          <div className="text-2xl font-bold text-brand-text">{stats.typings}</div>
          <div className="text-xs text-brand-text-secondary uppercase tracking-wider mt-1">Типирований проведено</div>
        </div>
        <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-primary/10 flex flex-col items-center justify-center text-center">
          <MessageSquare className="w-6 h-6 text-brand-primary mb-2" />
          <div className="text-2xl font-bold text-brand-text">
            {(stats.totalTokens / 1000).toFixed(1)}k
          </div>
          <div className="text-xs text-brand-text-secondary uppercase tracking-wider mt-1">Токенов обработано</div>
        </div>
        <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-primary/10 flex flex-col items-center justify-center text-center">
          <Zap className="w-6 h-6 text-brand-primary mb-2" />
          <div className="text-2xl font-bold text-brand-text">
            {stats.ratings.likes} / {stats.ratings.dislikes}
          </div>
          <div className="text-xs text-brand-text-secondary uppercase tracking-wider mt-1">Оценки (👍 / 👎)</div>
        </div>
      </div>

      <div className="bg-brand-bg/30 p-4 rounded-xl border border-brand-primary/5">
        <h3 className="text-sm font-bold text-brand-text mb-4 text-center">Популярность нейросетей</h3>
        {providerData.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={providerData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.1} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#d97706', color: '#f3f4f6', borderRadius: '8px' }}
                  itemStyle={{ color: '#f3f4f6' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Анализов (Типирований)" fill={colors.primary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Запусков приложения" fill={colors.secondary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-sm text-brand-text-secondary">
            Недостаточно данных для построения графика.
          </div>
        )}
      </div>
    </div>
  );
};
