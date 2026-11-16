/* Separate left-purple and right-orange wave fields; no dependency on the reference site's components. */
(() => {
  const section = document.querySelector('#overview');
  if (!section) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'overview-wave-light';
  canvas.setAttribute('aria-hidden','true');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  section.prepend(canvas);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width=1,height=1,frame=0,last=0,time=0,visible=false;
  let pointerX=.38,pointerY=.5,targetX=.38,targetY=.5;
  function resize(){
    const rect=section.getBoundingClientRect();
    const ratio=Math.min(1,900/Math.max(1,rect.width));
    width=canvas.width=Math.max(1,Math.round(rect.width*ratio));
    height=canvas.height=Math.max(1,Math.round(rect.height*ratio));
    draw();
  }
  function draw(){
    ctx.clearRect(0,0,width,height);
    const step=5;
    for(let y=0;y<height;y+=step){
      const v=y/height;
      for(let x=0;x<width;x+=step){
        const u=x/width;
        const edge=Math.max(0,Math.min(1,u*12,(1-u)*12,v*10,(1-v)*10));
        const pull=Math.exp(-((u-pointerX)**2+(v-pointerY)**2)*18)*.1;
        // Match the orange core and halo, shifted into the upper-left reference area.
        const purpleDistance=(((u-.31)/.4896)**2+((v-.22)/.432)**2)*2.2;
        const purpleEnvelope=.88*Math.exp(-purpleDistance)+.12*Math.exp(-purpleDistance/2.0736);
        const orangeDistance=(((u-.62)/.4896)**2+((v-.38)/.432)**2)*2.2;
        const orangeEnvelope=.88*Math.exp(-orangeDistance)+.12*Math.exp(-orangeDistance/2.0736);
        const purpleWave=Math.sin(u*8-v*5-time*.55+Math.sin(v*5+time*.29)*1.4-1.7+pull);
        const orangeWave=Math.sin(u*8-v*5+time*.55+Math.sin(v*5-time*.29)*1.4+pull);
        // Each color fades to black before the center, so moving waves never mix.
        const fade=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
        const isPurple=u<.5;
        const side=fade(isPurple?(.47-u)/.12:(u-.53)/.12);
        // Purple starts near its crest: compensate its amplitude to match the initial orange luminance.
        // Orange keeps its existing core, halo and brightness.
        const alpha=isPurple
          ?(.021427+.196402*Math.pow((purpleWave+1)/2,3))*purpleEnvelope*edge*side
          :(.036+.329976*Math.pow((orangeWave+1)/2,3))*orangeEnvelope*edge*side;
        if(alpha<.003)continue;
        const color=isPurple?'104,59,160':'174,80,35';
        ctx.fillStyle=`rgba(${color},${alpha.toFixed(3)})`;
        ctx.fillRect(x,y,step,step);
      }
    }
  }
  function tick(now){
    frame=0;
    if(!visible||document.hidden||reduced.matches)return;
    if(!last||now-last>=33){
      time+=last?Math.min(now-last,80)/1000:0;
      last=now;
      pointerX+=(targetX-pointerX)*.07;pointerY+=(targetY-pointerY)*.07;
      draw();
    }
    frame=requestAnimationFrame(tick);
  }
  function sync(){
    cancelAnimationFrame(frame);frame=0;last=0;
    if(reduced.matches){time=0;draw();}
    else if(visible&&!document.hidden)frame=requestAnimationFrame(tick);
  }
  section.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse'||reduced.matches)return;
    const rect=section.getBoundingClientRect();
    targetX=(event.clientX-rect.left)/rect.width;
    targetY=(event.clientY-rect.top)/rect.height;
  },{passive:true});
  section.addEventListener('pointerleave',()=>{targetX=.38;targetY=.5;});
  new ResizeObserver(resize).observe(section);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(section);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);
  resize();
})();
