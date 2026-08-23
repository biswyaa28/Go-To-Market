import * as THREE from 'three';
import anime from 'animejs';

(function(){
  "use strict";
  const track = document.getElementById('track');
  const slides = Array.from(document.querySelectorAll('.slide'));
  const total = slides.length;
  const rail = document.getElementById('rail');
  const progressBar = document.getElementById('progress-bar');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  let current = 0;
  let animating = false;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // build vertical positions
  slides.forEach((s,i)=>{ s.style.position='absolute'; s.style.top=(i*100)+'vh'; s.style.left='0'; });
  track.style.height = (total*100)+'vh';

  // build swatch cards (one injected per slide, top-right of chrome)
  slides.forEach((s)=>{
    const chrome = s.querySelector('.chrome');
    const sw = document.createElement('div');
    sw.className='swatch';
    const code = s.getAttribute('data-code');
    const name = s.getAttribute('data-name');
    sw.innerHTML = '<div class="chip" style="background:'+shadeFor(name)+'"></div><div><div class="code">PANTONE '+code+'</div><div class="name">'+name.toUpperCase()+'</div></div>';
    chrome.appendChild(sw);
  });

  function shadeFor(name){
    const map = {
      'Bright White':'#F5F5F3','Pavement':'#B9B8B3','Steel Gray':'#8C8B87','Castlerock':'#6E6D69',
      'Blanc de Blanc':'#EDEDEA','Ash':'#A9A8A3','Charcoal Gray':'#4A4946','High-Rise':'#8f8e8a',
      'Jet Black':'#161615','Glacier Gray':'#C7C6C1','Gargoyle':'#767570','Silver Lining':'#D6D5D0',
      'Anthracite':'#302f2d','Bone White':'#E6E4DE','Black Beauty':'#0d0d0c'
    };
    return map[name] || '#999';
  }

  // build progress rail dots
  slides.forEach((s,i)=>{
    const dot = document.createElement('div');
    dot.className = 'dot'+(i===0?' active':'');
    dot.addEventListener('click', ()=> goTo(i));
    rail.appendChild(dot);
  });
  const dots = Array.from(rail.children);

  function updateChrome(){
    progressBar.style.width = (((current+1)/total)*100)+'%';
    dots.forEach((d,i)=> d.classList.toggle('active', i===current));
  }

  function revealSlide(idx){
    const s = slides[idx];
    const items = s.querySelectorAll('.reveal');
    if(reduceMotion){
      items.forEach(el=> el.style.opacity=1);
      return;
    }
    anime.set(items, {opacity:0, translateY:18});
    anime({
      targets: items,
      opacity:[0,1],
      translateY:[18,0],
      easing:'easeOutCubic',
      duration:700,
      delay: anime.stagger(80, {start:120})
    });
  }

  function goTo(idx){
    if(animating || idx===current || idx<0 || idx>=total) return;
    animating = true;
    current = idx;
    const y = -(current*100);
    if(reduceMotion){
      track.style.transform = 'translateY('+y+'vh)';
      revealSlide(current);
      updateChrome();
      animating=false;
      return;
    }
    anime({
      targets: track,
      translateY: y+'vh',
      duration: 900,
      easing: 'easeInOutCubic',
      complete: ()=>{ animating=false; }
    });
    updateChrome();
    setTimeout(()=> revealSlide(current), 260);
  }

  function next(){ if(current<total-1) goTo(current+1); }
  function prev(){ if(current>0) goTo(current-1); }

  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);

  window.addEventListener('keydown', (e)=>{
    if(['ArrowDown','ArrowRight','PageDown',' '].includes(e.key)){ e.preventDefault(); next(); }
    else if(['ArrowUp','ArrowLeft','PageUp'].includes(e.key)){ e.preventDefault(); prev(); }
    else if(e.key==='Home'){ goTo(0); }
    else if(e.key==='End'){ goTo(total-1); }
  });

  // wheel navigation (debounced)
  let wheelLock = false;
  window.addEventListener('wheel', (e)=>{
    if(wheelLock) return;
    if(Math.abs(e.deltaY) < 12) return;
    wheelLock = true;
    if(e.deltaY>0) next(); else prev();
    setTimeout(()=> wheelLock=false, 700);
  }, {passive:true});

  // touch swipe
  let touchStartY = null;
  window.addEventListener('touchstart', (e)=>{ touchStartY = e.touches[0].clientY; }, {passive:true});
  window.addEventListener('touchend', (e)=>{
    if(touchStartY===null) return;
    const dy = touchStartY - e.changedTouches[0].clientY;
    if(Math.abs(dy) > 50){ dy>0 ? next() : prev(); }
    touchStartY = null;
  }, {passive:true});

  // click on right edge to advance, left edge to go back (ignore rail/buttons/dots)
  document.getElementById('deck-wrap').addEventListener('click', (e)=>{
    if(e.target.closest('.nav-btn') || e.target.closest('#rail') || e.target.closest('a') || e.target.closest('.dot')) return;
    const w = window.innerWidth;
    if(e.clientX > w*0.85) next();
  });

  updateChrome();
  revealSlide(0);

  /* ================= THREE.JS HERO (title slide) ================= */
  const canvas = document.getElementById('hero-canvas');
  let renderer, scene, camera, group, raf;
  let mouseX=0, mouseY=0, mousePx={x:0,y:0};
  let raycaster, pointer, hovered=null;

  // info tooltip overlay for hovered cards
  const tip = document.createElement('div');
  tip.id = 'card-tip';
  tip.style.cssText = 'position:fixed; z-index:50; pointer-events:none; opacity:0; transform:translateY(6px);'
    + 'transition:opacity .25s ease, transform .25s ease; background:#171716; color:#FAFAF8;'
    + 'border:1px solid rgba(255,255,255,.14); border-radius:10px; padding:12px 14px; min-width:180px;'
    + 'font-family:var(--body-f); font-size:12.5px; line-height:1.5; box-shadow:0 12px 32px rgba(0,0,0,.45);';
  tip.innerHTML = '<div id="tip-code" style="font-family:var(--mono); font-size:10.5px; letter-spacing:.08em; color:#9C9B96; text-transform:uppercase;"></div>'
    + '<div id="tip-name" style="font-family:var(--display); font-weight:600; font-size:15px; margin:3px 0 5px;"></div>'
    + '<div id="tip-desc" style="color:#C9C8C3;"></div>';
  document.body.appendChild(tip);
  const tipCode = tip.querySelector('#tip-code');
  const tipName = tip.querySelector('#tip-name');
  const tipDesc = tip.querySelector('#tip-desc');

  // 5 swatch cards, each carrying a chapter of the teardown
  const cardData = [
    { code:'11-4001 TC', name:'Bright White',  hex:0xFAFAF8, desc:'The universal language — one standard color space adopted across 100+ industries.' },
    { code:'17-1500 TC', name:'Steel Gray',    hex:0xC7C6C1, desc:'The target customer: designers, brands, printers and manufacturers who must match color exactly.' },
    { code:'16-3801 TC', name:'Ash',           hex:0x9C9B96, desc:'The product strategy: licensed standards, physical products and digital integrations.' },
    { code:'18-0201 TC', name:'Charcoal Gray', hex:0x767570, desc:'The pricing model: licensing, subscriptions and per-standard sales.' },
    { code:'19-4005 TC', name:'Black Beauty',  hex:0x4B4A47, desc:'The growth engine: the Color of the Year — free PR that money can\u2019t buy.' }
  ];

  function initHero(){
    renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 100);
    camera.position.set(0,0,13);

    group = new THREE.Group();
    scene.add(group);

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2(-2,-2);

    const w = 1.4, h = 1.9;
    const geo = new THREE.BoxGeometry(w,h,0.04);
    const edges = new THREE.EdgesGeometry(geo);

    // draw a real Pantone swatch card face: color chip on top, white strip with
    // the PANTONE wordmark and code at the bottom
    function swatchTexture(d){
      const W = 512, H = Math.round(512*(h/w));       // match card aspect
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      const hexStr = '#' + d.hex.toString(16).padStart(6,'0');
      const stripH = Math.round(H*0.24);
      ctx.fillStyle = hexStr;
      ctx.fillRect(0,0,W,H-stripH);
      ctx.fillStyle = '#FCFCFA';
      ctx.fillRect(0,H-stripH,W,stripH);
      ctx.fillStyle = '#1A1A19';
      ctx.font = '600 ' + Math.round(W*0.11) + 'px Space Grotesk, Inter, sans-serif';
      ctx.fillText('PANTONE', W*0.07, H - stripH*0.42);
      ctx.font = '500 ' + Math.round(W*0.085) + 'px JetBrains Mono, monospace';
      ctx.fillStyle = '#8A8985';
      ctx.fillText(d.code.replace(' TC',' TCX'), W*0.07, H - stripH*0.14);
      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = 4;
      return tex;
    }

    // hand-placed, non-overlapping layout on the right side of the slide
    const layout = [
      { x: 3.1, y:  1.7, rz: -0.10, ry:  0.28 },
      { x: 4.9, y:  0.4, rz:  0.08, ry: -0.22 },
      { x: 3.4, y: -0.9, rz: -0.06, ry:  0.18 },
      { x: 5.3, y: -2.0, rz:  0.12, ry: -0.30 },
      { x: 6.0, y:  1.8, rz: -0.14, ry:  0.35 }
    ];

    cardData.forEach((d,i)=>{
      const face = new THREE.MeshStandardMaterial({ map:swatchTexture(d), roughness:0.85, metalness:0.05 });
      const side = new THREE.MeshStandardMaterial({ color:0xEFEFEA, roughness:0.85, metalness:0.05 });
      // box face order: +x, -x, +y, -y, front(z+), back(z-)
      const mesh = new THREE.Mesh(geo, [side, side, side, side, face, side]);
      const L = layout[i];
      mesh.position.set(L.x, L.y, -i*0.3);
      mesh.rotation.set(0, L.ry, L.rz);
      mesh.userData = {
        baseX:L.x, baseY:L.y, baseZ:mesh.position.z,
        baseRz:L.rz, baseRy:L.ry,
        speed: 0.45 + i*0.06,          // slow, near-uniform drift
        offset: i*1.25,
        lift: 0,                        // eased hover lift 0→1
        data: d
      };
      group.add(mesh);

      // thin white edge for a "swatch card" look
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color:0xffffff, transparent:true, opacity:0.25}));
      mesh.add(line);
    });

    const light1 = new THREE.DirectionalLight(0xffffff, 1.0);
    light1.position.set(4,6,8);
    scene.add(light1);
    const light2 = new THREE.AmbientLight(0x999999, 0.9);
    scene.add(light2);

    window.addEventListener('mousemove', (e)=>{
      mouseX = (e.clientX/window.innerWidth - 0.5);
      mouseY = (e.clientY/window.innerHeight - 0.5);
      mousePx.x = e.clientX; mousePx.y = e.clientY;
      pointer.x = (e.clientX/window.innerWidth)*2 - 1;
      pointer.y = -(e.clientY/window.innerHeight)*2 + 1;
    });

    window.addEventListener('resize', onResize);
    onResize();
    animateHero();
  }

  function onResize(){
    if(!renderer) return;
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    // keep the card cluster clear of the PANTONE heading on narrow screens
    const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov/2)) * camera.position.z * camera.aspect;
    if(camera.aspect < 1.1){
      group.visible = false;            // too narrow — don't clutter mobile
    }else{
      group.visible = true;
      const maxX = Math.max(3.2, halfW - 2.2);
      group.scale.setScalar(Math.min(1, maxX/6.6));
      group.position.x = Math.min(1.6, Math.max(0, (halfW - 6.6) * 0.5));
    }
  }

  let heroActive = true;
  const clock = new THREE.Clock();
  function animateHero(){
    raf = requestAnimationFrame(animateHero);
    if(!heroActive) return;
    const t = clock.getElapsedTime();

    // hover detection
    if(raycaster){
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(group.children, false)[0];
      const mesh = hit ? hit.object : null;
      if(mesh !== hovered){
        hovered = mesh;
        if(hovered){
          tipCode.textContent = hovered.userData.data.code;
          tipName.textContent = hovered.userData.data.name;
          tipDesc.textContent = hovered.userData.data.desc;
        }
      }
      if(hovered){
        tip.style.opacity = '1';
        tip.style.transform = 'translateY(0)';
        const tx = Math.min(mousePx.x + 18, window.innerWidth - 230);
        const ty = Math.max(12, mousePx.y - 20);
        tip.style.left = tx + 'px';
        tip.style.top = ty + 'px';
        document.body.style.cursor = 'pointer';
      }else{
        tip.style.opacity = '0';
        tip.style.transform = 'translateY(6px)';
        document.body.style.cursor = '';
      }
    }

    // slow parallax tilt, heavily damped for a smooth feel
    group.rotation.y += (mouseX*0.25 - group.rotation.y)*0.04;
    group.rotation.x += (mouseY*0.12 - group.rotation.x)*0.04;

    group.children.forEach((m)=>{
      const u = m.userData;
      if(u.speed){
        // eased hover lift (0 → 1)
        u.lift += ((m === hovered ? 1 : 0) - u.lift) * 0.1;
        m.position.y = u.baseY + Math.sin(t*u.speed + u.offset)*0.18 + u.lift*0.25;
        m.position.z = u.baseZ + u.lift*0.9;              // card comes toward you
        m.rotation.z = u.baseRz + Math.sin(t*u.speed*0.7 + u.offset)*0.02; // gentle sway, no spin drift
        m.rotation.y += (u.baseRy*(1-u.lift) - m.rotation.y) * 0.08;      // straightens slightly on hover
      }
    });
    renderer.render(scene, camera);
  }

  if(!reduceMotion){
    initHero();
  }

  // pause hero rendering when scrolled away from title slide to save perf
  const heroObserverTarget = slides[0];
  function checkHeroActive(){
    heroActive = (current === 0);
  }
  const origGoTo = goTo;
  // wrap goTo to also toggle hero (simplest: poll)
  setInterval(checkHeroActive, 300);

})();
