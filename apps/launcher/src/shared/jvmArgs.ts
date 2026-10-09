/** Parse quoted arguments without invoking a shell; protect launcher-owned launch options. */
export function parseCustomJvmArgs(value: string): string[] {
  if (value.length > 4096) throw new Error('Параметры Java: максимум 4096 символов.');
  const args: string[] = [];
  let token = '', quote = '';
  for (const char of value) {
    if (quote) { if (char === quote) quote = ''; else token += char; }
    else if (char === '"' || char === "'") quote = char;
    else if (/\s/.test(char)) { if (token) { args.push(token); token = ''; } }
    else token += char;
  }
  if (quote) throw new Error('Закройте кавычки в параметрах Java.');
  if (token) args.push(token);
  for (const arg of args) {
    if (/^-Xm[sx]/i.test(arg)) throw new Error('Память задаётся в блоке «Память для игры», без -Xms и -Xmx.');
    if (!/^(?:-D[^=\s]+=|-XX:|-Xlog:|-Xss|-ea$|-da$)/.test(arg) || /^-D(?:quiby\.|java\.class\.path|jdk\.module\.|java\.system\.class\.loader)/i.test(arg)) {
      throw new Error(`Параметр ${arg} не поддерживается. Используйте -D, -XX, -Xlog, -Xss, -ea или -da; запуском и защитой управляет лаунчер.`);
    }
  }
  return args;
}
