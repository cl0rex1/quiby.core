import fs from 'fs';
import path from 'path';

const MAX_REPORT_BYTES = 4 * 1024 * 1024;

function readLimited(file: string, size: number, fromEnd = false): string {
  const count = Math.min(size, MAX_REPORT_BYTES);
  const buffer = Buffer.alloc(count);
  const descriptor = fs.openSync(file, 'r');
  try {
    let read = 0;
    const start = fromEnd ? size - count : 0;
    while (read < count) {
      const received = fs.readSync(descriptor, buffer, read, count - read, start + read);
      if (!received) break;
      read += received;
    }
    return buffer.toString('utf8', 0, read);
  } finally {
    fs.closeSync(descriptor);
  }
}

/** Prefer Minecraft's own crash report; include recent output when it could not write one. */
export function readCrashDetails(gameDir: string, startedAt: number, exitCode: number | null, recentOutput: string[]): string {
  const heading = `Minecraft завершился с кодом ${exitCode ?? 'неизвестно'}.`;
  const directory = path.join(gameDir, 'crash-reports');
  try {
    const reports = fs.readdirSync(directory)
      .filter(name => name.endsWith('.txt'))
      .map(name => ({ name, modified: fs.statSync(path.join(directory, name)).mtimeMs }))
      .filter(report => report.modified >= startedAt - 10_000)
      .sort((a, b) => b.modified - a.modified);
    if (reports.length) {
      const reportPath = path.join(directory, reports[0].name);
      const size = fs.statSync(reportPath).size;
      const report = readLimited(reportPath, size);
      return `${heading}\nОтчёт: ${reportPath}\n\n${size > MAX_REPORT_BYTES ? report + '\n\n[Отчёт больше 4 МБ. Полный файл сохранён по указанному пути.]' : report}`;
    }
  } catch { /* Minecraft may exit before creating a report. */ }

  const latestLog = path.join(gameDir, 'logs', 'latest.log');
  try {
    const stats = fs.statSync(latestLog);
    if (stats.mtimeMs >= startedAt - 10_000) {
      const log = readLimited(latestLog, stats.size, true);
      return `${heading}\nЛог: ${latestLog}\n\n${stats.size > MAX_REPORT_BYTES ? '[Показаны последние 4 МБ лога.]\n' : ''}${log}`;
    }
  } catch { /* Fall back to captured process output. */ }

  const output = recentOutput.join('\n');
  return `${heading}\nОтчёт о сбое не создан. Последний вывод игры:\n\n${output || 'Игра не вывела дополнительных сведений.'}`;
}
