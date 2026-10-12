import { test, expect, boot } from './fixtures';

for (const [width, height] of [[64, 32], [128, 128]]) {
  test(`skin ${width}×${height} is normalized without losing limbs or cropping`, async ({ page }) => {
    await boot(page);
    const source = await page.evaluate(({ width, height }) => {
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d')!; const scale = width / 64;
      ctx.fillStyle = '#ff0000'; ctx.fillRect(8 * scale, 8 * scale, 8 * scale, 8 * scale);
      ctx.fillStyle = '#00ff00'; ctx.fillRect(0, 16 * scale, 16 * scale, 16 * scale);
      ctx.fillStyle = '#0000ff'; ctx.fillRect(40 * scale, 16 * scale, 16 * scale, 16 * scale);
      return canvas.toDataURL('image/png').split(',')[1];
    }, { width, height });
    await page.getByLabel('Гардероб', { exact: true }).click();
    await page.locator('input[type=file]').setInputFiles({ name: 'skin.PNG', mimeType: 'image/png', buffer: Buffer.from(source, 'base64') });
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('quiby_skin_library') || '[]').length)).toBe(1);
    const pixels = await page.evaluate(async () => {
      const img = new Image(); img.src = JSON.parse(localStorage.getItem('quiby_skin_library')!)[0].dataUri; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0);
      return { width: img.width, height: img.height, face: Array.from(ctx.getImageData(10, 10, 1, 1).data), leg: Array.from(ctx.getImageData(22, 54, 1, 1).data) };
    });
    expect(pixels).toMatchObject({ width: 64, height: 64, face: [255, 0, 0, 255] });
    if (height === 32) expect(pixels.leg).toEqual([0, 255, 0, 255]);
    await page.getByRole('button', { name: 'Alex', exact: true }).click();
    const savedSkin = page.getByRole('button', { name: 'Выбрать скин skin', exact: true });
    await savedSkin.focus(); await savedSkin.press('Enter');
    await expect(savedSkin).toHaveAttribute('aria-pressed', 'true');
  });
}

test('malformed persisted collection does not crash the wardrobe', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => localStorage.setItem('quiby_skin_library', '{"unexpected":true}'));
  await page.getByLabel('Гардероб', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Гардероб.' })).toBeVisible();
  await expect(page.getByTitle('Базовый скин')).toBeDisabled();
  await expect(page.getByTitle('Базовый скин')).toHaveText('Steve');
});
