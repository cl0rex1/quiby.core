import { PNG } from 'pngjs';

/** Nearest-neighbour face thumbnail, including the skin's transparent hat layer. */
export function renderSkinHead(bytes?: Buffer): Buffer {
  const skin = bytes && PNG.sync.read(bytes);
  if (skin && (skin.width < 64 || skin.width > 1024 || skin.width !== skin.height)) throw new Error('Invalid skin');
  const result = new PNG({ width:64, height:64 });
  for (let y=0;y<64;y++) for (let x=0;x<64;x++) {
    const pixel = (y*64+x)*4;
    let rgb = [245,153,179];
    if (skin) {
      const scale = skin.width/64, sx=Math.floor(x/8), sy=Math.floor(y/8);
      const base=(Math.floor((sy+8)*scale)*skin.width+Math.floor((sx+8)*scale))*4;
      const hat=(Math.floor((sy+8)*scale)*skin.width+Math.floor((sx+40)*scale))*4;
      const alpha=skin.data[hat+3]/255;
      rgb=rgb.map((_,c)=>Math.round(skin.data[base+c]*(1-alpha)+skin.data[hat+c]*alpha));
    }
    for(let c=0;c<3;c++)result.data[pixel+c]=rgb[c];
    result.data[pixel+3]=255;
  }
  return PNG.sync.write(result);
}
