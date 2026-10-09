import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export class LauncherErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Launcher UI failed:', error, info.componentStack); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="launcher-recovery" role="alert">
      <AlertCircle size={32} />
      <h1>Не удалось открыть экран</h1>
      <p>Перезагрузите интерфейс. Ваши файлы и настройки сохранятся.</p>
      <button type="button" className="launcher-primary-button" onClick={() => location.reload()}><RefreshCw size={16} /> Перезагрузить</button>
    </main>;
  }
}
