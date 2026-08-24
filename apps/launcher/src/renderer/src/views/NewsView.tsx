import React, { useState } from 'react';
import { Newspaper, Calendar, User, Pin, ArrowRight, X } from 'lucide-react';
import { NewsArticle } from '@quiby/shared';

interface NewsViewProps {
  articles: NewsArticle[];
}

export const NewsView: React.FC<NewsViewProps> = ({ articles }) => {
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  const getTagColor = (tag: NewsArticle['tag']) => {
    switch (tag) {
      case 'season':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'update':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'event':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (_) {
      return dateStr;
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
          <Newspaper className="text-emerald-400" />
          <span>Новости и объявления</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Последние события, обновления сборки и важные объявления сервера quiby.
        </p>
      </div>

      {/* Grid of articles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {articles.map((article) => (
          <div
            key={article.id}
            onClick={() => setSelectedArticle(article)}
            className="group bg-quiby-card border border-quiby-border hover:border-emerald-500/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-emerald-500/5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            {article.bannerUrl && (
              <div className="h-44 w-full overflow-hidden relative">
                <img
                  src={article.bannerUrl}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-quiby-card via-transparent to-transparent"></div>
                {article.pin && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 text-quiby-dark text-[11px] font-extrabold uppercase shadow">
                    <Pin size={12} />
                    <span>Закреплено</span>
                  </div>
                )}
              </div>
            )}

            <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getTagColor(article.tag)} uppercase`}>
                    {article.tag}
                  </span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(article.date)}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors leading-snug">
                  {article.title}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {article.excerpt}
                </p>
              </div>

              <div className="pt-3 border-t border-quiby-border flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <User size={13} className="text-emerald-400" />
                  {article.author}
                </span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Читать</span>
                  <ArrowRight size={13} />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-quiby-card border border-quiby-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {selectedArticle.bannerUrl && (
              <div className="h-56 w-full relative">
                <img
                  src={selectedArticle.bannerUrl}
                  alt={selectedArticle.title}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="absolute top-4 right-4 p-1.5 bg-black/60 hover:bg-black text-white rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            <div className="p-6 space-y-4">
              {!selectedArticle.bannerUrl && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${getTagColor(selectedArticle.tag)} uppercase`}>
                  {selectedArticle.tag}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar size={13} />
                  {formatDate(selectedArticle.date)}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <User size={13} className="text-emerald-400" />
                  {selectedArticle.author}
                </span>
              </div>

              <h2 className="text-2xl font-black text-white">{selectedArticle.title}</h2>

              <div className="text-sm text-slate-300 leading-relaxed space-y-3 whitespace-pre-wrap">
                {selectedArticle.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
