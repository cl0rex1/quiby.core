import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {repairVoiceChatDefaults} from '../voiceChatDefaults';

test('repairs disabled legacy voice preset once, preserves devices and later opt-out',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'quiby-voice-')),folder=path.join(dir,'config/voicechat');
  try {
    await fs.mkdir(folder,{recursive:true});const file=path.join(folder,'voicechat-client.properties');
    const original='disabled=true\r\nhide_icons=true\r\nonboarding_finished=true\r\nmicrophone=My mic\r\n';
    await fs.writeFile(file,original);await repairVoiceChatDefaults(dir);
    const fixed=await fs.readFile(file,'utf8');assert.ok(fixed.includes('disabled=false'));assert.ok(fixed.includes('microphone=My mic'));
    assert.equal(await fs.readFile(file+'.before-quiby-fix','utf8'),original);
    await fs.writeFile(file,fixed.replace('disabled=false','disabled=true'));await repairVoiceChatDefaults(dir);
    assert.ok((await fs.readFile(file,'utf8')).includes('disabled=true'));
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
