import React, { useState } from 'react';
import { Newspaper, Calendar, User, Pin, ArrowRight, X, ShieldCheck, Sparkles, Heart, MessageCircle, Repeat, Share, Bookmark } from 'lucide-react';
import { NewsArticle } from '@quiby/shared';

interface NewsViewProps {
  articles: NewsArticle[];
}

export const NewsView: React.FC<NewsViewProps> = ({ articles }) => {
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

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
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-black p-5 space-y-5 select-none">
      <div>
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          <Newspaper className="text-x-purpleLight" />
          <span>Новости и объявления</span>
        </h2>
        <p className="text-xs text-x-textMuted mt-0.5">
          Официальные анонсы, патчноуты и расписание ивентов 6 Сезона quiby.
        </p>
      </div>

      {/* Grid of articles in X style */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {articles.map((article) => (
          <div
            key={article.id}
            onClick={() => setSelectedArticle(article)}
            className="group bg-x-surface border border-x-border hover:border-x-purple/50 rounded-2xl overflow-hidden shadow-x-card transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            {article.bannerUrl && (
              <div className="h-40 w-full overflow-hidden relative">
                <img
                  src={article.bannerUrl}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-x-surface via-transparent to-transparent"></div>
                {article.pin && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-black text-[10px] font-extrabold uppercase shadow">
                    <Pin size={11} />
                    <span>Закреплено</span>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-x-purple/20 text-x-purpleLight border border-x-purple/30 uppercase tracking-wide">
                    {article.tag}
                  </span>
                  <span className="text-[11px] text-x-textDim flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(article.date)}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-x-purpleLight transition-colors leading-snug">
                  {article.title}
                </h3>

                <p className="text-xs text-x-textMuted line-clamp-2 leading-relaxed">
                  {article.excerpt}
                </p>
              </div>

              <div className="pt-3 border-t border-x-border/60 flex items-center justify-between text-xs">
                <span className="text-x-textMuted font-medium flex items-center gap-1.5">
                  <User size={13} className="text-x-purpleLight" />
                  {article.author}
                </span>
                <span className="text-white font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-x-surface border border-x-border rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {selectedArticle.bannerUrl && (
              <div className="h-52 w-full relative">
                <img
                  src={selectedArticle.bannerUrl}
                  alt={selectedArticle.title}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="absolute top-4 right-4 p-2 bg-black/70 hover:bg-black text-white rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="p-6 space-y-4">
              {!selectedArticle.bannerUrl && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="p-1 text-x-textMuted hover:text-white rounded-full"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-x-purple/20 text-x-purpleLight border border-x-purple/30 uppercase">
                  {selectedArticle.tag}
                </span>
                <span className="text-xs text-x-textDim flex items-center gap-1">
                  <Calendar size={13} />
                  {formatDate(selectedArticle.date)}
                </span>
                <span className="text-xs text-x-textMuted flex items-center gap-1">
                  <User size={13} className="text-x-purpleLight" />
                  {selectedArticle.author}
                </span>
              </div>

              <h2 className="text-2xl font-black text-white">{selectedArticle.title}</h2>

              <div className="text-sm text-x-text leading-relaxed space-y-3 whitespace-pre-wrap">
                {selectedArticle.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
