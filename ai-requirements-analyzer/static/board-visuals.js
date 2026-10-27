import {position,screenToWorld} from './board-model.mjs';

const SVG='http://www.w3.org/2000/svg';
function svgElement(tag,attributes={}){
  const el=document.createElementNS(SVG,tag);
  for(const [key,value] of Object.entries(attributes))el.setAttribute(key,String(value));
  return el;
}
export function renderVisual(card){
  if(card.type==='image'){
    const image=document.createElement('img');image.src=card.src;image.alt=card.title;image.draggable=false;
    return image;
  }
  const svg=svgElement('svg',{viewBox:`0 0 ${card.width} ${card.height}`,'aria-label':card.title,role:'img'});
  const style={stroke:card.color,'stroke-width':card.strokeWidth,'stroke-linecap':'round','stroke-linejoin':'round',fill:'none'};
  if(card.type==='drawing')svg.append(svgElement('polyline',{...style,points:card.points.map(p=>p.join(',')).join(' ')}));
  else if(card.shape==='rectangle')svg.append(svgElement('rect',{...style,x:8,y:8,width:Math.max(1,card.width-16),height:Math.max(1,card.height-16),rx:6,fill:card.fill}));
  else if(card.shape==='ellipse')svg.append(svgElement('ellipse',{...style,cx:card.width/2,cy:card.height/2,rx:Math.max(1,card.width/2-8),ry:Math.max(1,card.height/2-8),fill:card.fill}));
  else{
    const x1=card.reverseX?card.width-10:10,x2=card.reverseX?10:card.width-10;
    const y1=card.reverseY?card.height-10:10,y2=card.reverseY?10:card.height-10;
    const angle=Math.atan2(y2-y1,x2-x1),size=Math.min(18,Math.hypot(x2-x1,y2-y1)/3);
    svg.append(svgElement('path',{...style,d:`M ${x1} ${y1} L ${x2} ${y2} M ${x2-size*Math.cos(angle-.5)} ${y2-size*Math.sin(angle-.5)} L ${x2} ${y2} L ${x2-size*Math.cos(angle+.5)} ${y2-size*Math.sin(angle+.5)}`}));
  }
  return svg;
}

export function installVisualTools({canvas,viewport,getZoom,getCamera,setCamera,newObjectPosition,addCard}){
  let tool='select';
  const toolButtons=document.querySelectorAll('[data-board-tool]');
  function setTool(value){
    tool=value;canvas.dataset.tool=value;viewport.dataset.tool=value;
    document.querySelectorAll('#board-view details[open]').forEach(menu=>{menu.open=false;});
    toolButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.boardTool===value)));
    document.querySelector('#board-tool-hint').textContent={select:'Wheel to zoom at cursor · Pan to explore',pan:'Drag in any direction · middle-drag also pans',rectangle:'Drag to draw a rectangle',ellipse:'Drag to draw an ellipse',arrow:'Drag from the arrow tail to its tip',drawing:'Drag to sketch · release to save the stroke'}[value];
  }
  toolButtons.forEach(button=>button.addEventListener('click',()=>setTool(button.dataset.boardTool)));
  viewport.addEventListener('pointerdown',event=>{
    const panning=event.button===1||tool==='pan';
    if((event.button!==0&&event.button!==1)||(!panning&&(tool==='select'||event.target.closest('.board-card'))))return;
    event.preventDefault();viewport.setPointerCapture(event.pointerId);
    const rect=viewport.getBoundingClientRect(),initialCamera=getCamera();
    const point=e=>{const world=screenToWorld(e.clientX-rect.left,e.clientY-rect.top,initialCamera);return [world.x,world.y];};
    const start=point(event),client=[event.clientX,event.clientY];
    let points=[start],end=start;
    const preview=svgElement('svg',{width:1,height:1});preview.classList.add('drawing-preview');canvas.append(preview);
    const color=document.querySelector('#paint-color').value,strokeWidth=Number(document.querySelector('#paint-width').value);
    const fill=document.querySelector('#shape-fill').checked?color:'none';
    function move(e){
      if(panning){setCamera(initialCamera.left-(e.clientX-client[0]),initialCamera.top-(e.clientY-client[1]));return;}
      end=point(e);
      if(tool==='drawing'&&points.length<2000)points.push(end);
      preview.replaceChildren();
      if(tool==='drawing')preview.append(svgElement('polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:color,'stroke-width':strokeWidth,'stroke-linecap':'round','stroke-linejoin':'round'}));
      else{
        const card=geometry();const art=renderVisual(card);art.setAttribute('x',card.x);art.setAttribute('y',card.y);art.setAttribute('width',card.width);art.setAttribute('height',card.height);preview.append(art);
      }
    }
    function geometry(){
      const all=tool==='drawing'?points:[start,end];
      const minX=Math.min(...all.map(p=>p[0])),minY=Math.min(...all.map(p=>p[1]));
      const rawWidth=Math.max(...all.map(p=>p[0]))-minX,rawHeight=Math.max(...all.map(p=>p[1]))-minY;
      const width=Math.max(24,Math.min(1600,rawWidth+8)),height=Math.max(24,Math.min(1600,rawHeight+8));
      const card={id:crypto.randomUUID(),type:tool==='drawing'?'drawing':'shape',title:tool==='drawing'?'Sketch':tool[0].toUpperCase()+tool.slice(1),body:'',width,height,...position(minX-4,minY-4,width,height),pinned:false,color,strokeWidth};
      if(tool==='drawing')card.points=points.map(p=>[4+(p[0]-minX)*Math.min(1,(width-8)/Math.max(1,rawWidth)),4+(p[1]-minY)*Math.min(1,(height-8)/Math.max(1,rawHeight))]);
      else Object.assign(card,{shape:tool,fill,reverseX:end[0]<start[0],reverseY:end[1]<start[1]});
      return card;
    }
    function finish(e){
      viewport.removeEventListener('pointermove',move);viewport.removeEventListener('pointerup',finish);viewport.removeEventListener('pointercancel',cancel);preview.remove();
      const hasStroke=tool==='drawing'?points.some(p=>Math.hypot(p[0]-start[0],p[1]-start[1])>3):Math.hypot(end[0]-start[0],end[1]-start[1])>3;
      if(!panning&&e.type!=='pointercancel'&&hasStroke){addCard(geometry(),{reveal:false});}
    }
    function cancel(e){finish(e);}
    viewport.addEventListener('pointermove',move);viewport.addEventListener('pointerup',finish);viewport.addEventListener('pointercancel',cancel);
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!document.querySelector('dialog[open]'))setTool('select');
  });
  document.querySelector('#add-image').addEventListener('click',()=>document.querySelector('#board-image-file').click());
  document.querySelector('#board-image-file').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    const button=document.querySelector('#add-image');button.disabled=true;
    let bitmap;
    try{
      if(file.size>12*1024*1024||!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))throw new Error('Choose a PNG, JPEG, WebP or GIF image up to 12 MB.');
      bitmap=await createImageBitmap(file);
      const ratio=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));
      const output=document.createElement('canvas');output.width=Math.max(1,Math.round(bitmap.width*ratio));output.height=Math.max(1,Math.round(bitmap.height*ratio));
      output.getContext('2d').drawImage(bitmap,0,0,output.width,output.height);
      const src=output.toDataURL('image/webp',.82);
      if(src.length>1500000)throw new Error('This image is too detailed to save on the board. Try a smaller image.');
      const displayRatio=Math.min(1,460/Math.max(output.width,output.height)),width=Math.max(24,Math.round(output.width*displayRatio)),height=Math.max(24,Math.round(output.height*displayRatio));
      if(addCard({id:crypto.randomUUID(),type:'image',title:file.name.slice(0,120),body:'',src,width,height,...newObjectPosition(width,height),pinned:false})){
        setTool('select');window.toast('Image added. Drag to move it; Edit / resize changes its size.');
      }
    }catch(error){window.toast(error.message||'This image could not be opened.');}
    finally{bitmap?.close();event.target.value='';button.disabled=false;}
  });
  setTool('select');
  return {setTool};
}
