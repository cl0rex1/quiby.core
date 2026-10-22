import fs from 'node:fs/promises';
import path from 'node:path';

/** Repair the disabled preset shipped before 6.1.36 once; retain subsequent user choices. */
export async function repairVoiceChatDefaults(gameDir: string) {
  const folder=path.join(gameDir,'config/voicechat'), marker=path.join(folder,'.quiby-defaults-v2');
  try { await fs.access(marker); return; } catch {}
  const file=path.join(folder,'voicechat-client.properties');
  let text:string;
  try { text=await fs.readFile(file,'utf8'); } catch { return; }
  if(['disabled=true','hide_icons=true','onboarding_finished=true'].every(line=>text.split(/\r?\n/).includes(line))) {
    await fs.copyFile(file,file+'.before-quiby-fix');
    text=text.replace(/^disabled=true\r?$/m,'disabled=false').replace(/^hide_icons=true\r?$/m,'hide_icons=false')
      .replace(/^onboarding_finished=true\r?$/m,'onboarding_finished=false');
    await fs.writeFile(file,text,'utf8');
  }
  await fs.writeFile(marker,'Checked legacy disabled preset\n','utf8');
}
