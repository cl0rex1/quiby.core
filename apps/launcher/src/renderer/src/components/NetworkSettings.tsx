import React, { useEffect, useState } from 'react';
import { Copy, RefreshCw, Network } from 'lucide-react';
import type { DirectRouteReport } from '../../../shared/directDiagnostics';

const routes = [['normal', 'Обычный'], ['relay', 'Relay · через VPS'], ['direct', 'Direct · QUIC'], ['kcp', 'Direct · KCP']] as const;
const reasons: Record<string,string> = { normal: 'Обычный', quality: 'Обычный', 'tunnel-unavailable': 'Обычный · туннели недоступны',
  'nat-timeout': 'Обычный · старый отчёт', relay: 'Relay · через VPS', direct: 'Direct · QUIC', 'direct-kcp': 'Direct · KCP',
  disabled: 'Direct отключён сервером', api: 'API отклонил проверку', error: 'Ошибка проверки' };

export function NetworkSettings({ token, gameActive }: { token?: string; gameActive: boolean }) {
  const [report,setReport] = useState<DirectRouteReport | null>(null);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  useEffect(() => { let active = true; void window.quibyApi?.getNetworkReport().then(value => { if(active)setReport(value); })
    .catch(() => { if(active)setMessage('Не удалось прочитать прошлый отчёт.'); }); return () => { active=false; }; }, []);
  const check = async () => {
    if (!token || busy) return;
    setBusy(true); setMessage('Сравниваем маршруты. Проверка может занять до 40 секунд…');
    try { setReport(await window.quibyApi.checkNetwork(token)); setMessage('Проверка завершена. При запуске игры маршрут проверится заново.'); }
    catch(error) { setMessage(error instanceof Error ? error.message : 'Не удалось проверить сеть.'); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(report,null,2)); setMessage('Отчёт скопирован — его можно отправить для проверки пинга.'); }
    catch { setMessage('Не удалось скопировать отчёт.'); }
  };
  return <section className="settings-group network-settings">
    <div className="settings-group-heading"><Network size={17}/><h2>Подключение к серверу</h2></div>
    <p className="section-copy">Проверь сеть без запуска Minecraft. Лаунчер сравнит задержку и стабильность четырёх маршрутов. Direct соединяет с домашним сервером, Relay проходит через VPS.</p>
    {report ? <>
      <p><strong>{report.source === 'diagnostic' ? 'Результат проверки' : 'Последний выбор'}: {reasons[report.reason] || report.reason}</strong></p>
      <p className="section-copy">{new Date(report.at).toLocaleString('ru-RU')} · Лаунчер {report.launcherVersion || 'старой версии'}</p>
      {report.measurement !== 'minecraft-pong-rtt' && <p className="section-copy">Старый замер включает время подключения. Повтори проверку для точного RTT.</p>}
      <dl className="network-results">{routes.map(([key,label]) => {
        const values=report[key] || [], sorted=[...values].sort((a,b)=>a-b);
        return <div key={key}><dt>{label}</dt><dd>{values.length===5 ? `${Math.round(sorted[2])} мс` : 'Нет ответа'}
          {values.length===5 && <small>{Math.round(sorted[0])}–{Math.round(sorted[4])} мс · 5 замеров</small>}
          {report.probeErrors?.[key] && <small>{report.probeErrors[key].message}</small>}</dd></div>;
      })}</dl>
      {report.error && <p className="section-copy">{report.stage && `${report.stage}: `}{report.error.message}</p>}
    </> : <p className="section-copy">Замеров пока нет. Запусти проверку или игру.</p>}
    <div className="network-actions">
      <button type="button" className="ui-button" disabled={busy || gameActive || !token || !window.quibyApi} onClick={check}><RefreshCw size={14} className={busy?'animate-spin':''}/>{busy?'Проверяем…':'Проверить маршруты'}</button>
      <button type="button" className="ui-button" disabled={busy || !report} onClick={copy}><Copy size={14}/>Копировать отчёт</button>
    </div>
    {gameActive && <p className="section-copy">Проверка доступна после закрытия Minecraft.</p>}
    <p className="section-copy" role="status">{message}</p>
  </section>;
}
