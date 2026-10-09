export async function reviewDelivery(server: string, hash: string, token: string, attempts = 3, pauseMs = 1000): Promise<'delivered' | 'queued'> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await fetch(`${server}/api/mods/review-delivery/${hash}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('Не удалось проверить доставку заявки. Повторите проверку.');
    const receipt = await response.json();
    if (receipt.delivered === true) return 'delivered';
    if (receipt.queued !== true) throw new Error('Файл отсутствует в очереди отправки. Отправьте заявку с файлом повторно.');
    if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, pauseMs));
  }
  return 'queued';
}
