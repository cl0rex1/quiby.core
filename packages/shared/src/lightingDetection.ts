/** Known lighting override identifiers; ordinary shader/gamma settings are not sufficient. */
export function lightingOverrideSignature(value: string): string | undefined {
  const text = value.replace(/\\u([0-9a-f]{4})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .normalize('NFKC').replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, '').toLowerCase();
  const compact = text.replace(/[\s_./\\:$-]+/g, '');
  return compact.match(/fullbright(?:ness)?|gammabright|(?:boosted|better|unlimited|maximum)brightness|gamma(?:utils?|override|bypass|hack|toggle|control|boost|switch|changer|unlimited)|(?:change|increase|boost|unlimited|max|high|toggle)gamma/)?.[0];
}

/** A gamma-targeting mixin warrants review even when the mod's own identifiers were renamed. */
export function hasGammaMixinEvidence(text: string): boolean {
  return /gamma/i.test(text) && /(?:GameOptions|Options|LightTexture|LightmapTextureManager)/.test(text) &&
    /org\/spongepowered\/asm\/mixin\/(?:Mixin|injection\/)/.test(text);
}
