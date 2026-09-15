(function(){
  'use strict';
  var stage=document.getElementById('dmf-signal-stage');
  var canvas=document.getElementById('dmf-signal-canvas');
  if(!stage||!canvas)return;

  var stateNode=stage.querySelector('.dmf-relic-state');
  var readout=stage.querySelector('.dmf-relic-readout');
  var readoutComponent=readout&&readout.querySelector('.dmf-relic-readout-component');
  var readoutStatus=readout&&readout.querySelector('.dmf-relic-readout-status');
  var readoutLore=readout&&readout.querySelector('.dmf-relic-readout-lore');
  var started=false,visible=false,raf=0,renderer=null,scene=null,camera=null,artifact=null;
  var artifactMeshes=[],shaderRefs=[],wireShells=[],edgeShells=[],signalParticles=null;
  var raycaster=null,pointer={x:0,y:0},pointerInside=false,pointerX=0,pointerY=0;
  var targetX=0,targetY=0,currentX=0,currentY=0,spin=-.42,dragging=false,lastX=0,lastY=0;
  var lastRender=0,frameInterval=1000/30,quality='high',modelScale=1,currentScale=1;
  var activeZone=-1,relicState='dormant',lastPercent=-1;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  var constrained=connection&&(connection.saveData||/(^|-)2g$/.test(connection.effectiveType||''));

  var zones=[
    {en:['RELIC COMPONENT // PLATFORM BASE','SIGNAL PATH ACTIVE','Earthside anchor — terrestrial grounding node'],es:['COMPONENTE RELIC // BASE DE PLATAFORMA','RUTA DE SEÑAL ACTIVA','Anclaje terrestre — nodo de conexión'],zh:['遗物组件 // 平台底座','信号路径已激活','地面锚点 — 接地节点']},
    {en:['RELIC COMPONENT // CORE FRAME','ARCHIVE NODE 03','Formula preservation unit — primary containment'],es:['COMPONENTE RELIC // ESTRUCTURA CENTRAL','NODO DE ARCHIVO 03','Unidad de preservación — contención primaria'],zh:['遗物组件 // 核心框架','档案节点 03','配方保存单元 — 主容器']},
    {en:['RELIC COMPONENT // SIGNAL CONSOLE','RECEIVING FREQUENCY','Terrestrial decoding interface — signal processing'],es:['COMPONENTE RELIC // CONSOLA DE SEÑAL','FRECUENCIA DE RECEPCIÓN','Interfaz de decodificación — procesamiento de señal'],zh:['遗物组件 // 信号控制台','正在接收频率','地面解码界面 — 信号处理']},
    {en:['RELIC COMPONENT // RECEIVER ARRAY','TRANSMISSION ACTIVE','Transmission channel — formula acquisition array'],es:['COMPONENTE RELIC // MATRIZ RECEPTORA','TRANSMISIÓN ACTIVA','Canal de transmisión — adquisición de la fórmula'],zh:['遗物组件 // 接收阵列','传输已激活','传输通道 — 配方采集阵列']}
  ];

  function language(){var value=(document.documentElement.lang||'es').toLowerCase();return value.indexOf('zh')===0?'zh':value.indexOf('en')===0?'en':'es';}
  function stateCopy(state,percent){
    var copy={
      dormant:{es:'INACTIVO',en:'DORMANT',zh:'休眠'},
      awakened:{es:'SEÑAL DETECTADA',en:'SIGNAL DETECTED',zh:'检测到信号'},
      transmitting:{es:'TRANSMISIÓN',en:'TRANSMITTING',zh:'传输中'}
    };
    var lang=language(),label=copy[state][lang];
    if(state==='transmitting')label+=' · '+String(percent).padStart(2,'0')+'%';
    return label;
  }

  function renderRelicState(next,percent){
    relicState=next;lastPercent=percent;
    if(!stateNode)return;
    stateNode.classList.toggle('is-awakened',next==='awakened');
    stateNode.classList.toggle('is-transmitting',next==='transmitting');
    stateNode.textContent=stateCopy(next,percent);
  }

  function hideReadout(){activeZone=-1;if(readout)readout.classList.remove('is-visible');stage.classList.remove('is-inspecting');}
  function showReadout(zoneIndex){
    if(!readout)return;
    var data=zones[zoneIndex][language()];
    readoutComponent.textContent=data[0];readoutStatus.textContent=data[1];readoutLore.textContent=data[2];
    readout.style.left=Math.max(16,Math.min(stage.clientWidth-210,pointerX+14))+'px';
    readout.style.top=Math.max(70,Math.min(stage.clientHeight-118,pointerY+14))+'px';
    readout.classList.add('is-visible');stage.classList.add('is-inspecting');
  }

  function setState(state){
    stage.classList.remove('is-ready','is-fallback','is-dragging','is-inspecting');
    stage.classList.add(state==='ready'?'is-ready':'is-fallback');
    if(state==='ready')stage.dataset.renderMode='demian-receiver';else delete stage.dataset.renderMode;
    document.documentElement.dataset.dmfSignal3d=state;
    window.dispatchEvent(new CustomEvent('dmf_signal_3d_state',{detail:{state:state,renderer:'demian-receiver',quality:quality}}));
  }

  function fail(){if(raf){cancelAnimationFrame(raf);raf=0;}setState('fallback');}
  function loadLoader(done){
    if(window.THREE&&window.THREE.GLTFLoader){done();return;}
    var existing=document.querySelector('script[data-dmf-gltf-loader]');
    if(existing){existing.addEventListener('load',done,{once:true});existing.addEventListener('error',fail,{once:true});return;}
    var script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
    script.crossOrigin='anonymous';script.dataset.dmfGltfLoader='1';script.onload=done;script.onerror=fail;document.head.appendChild(script);
  }

  function applyQuality(width){
    quality=width<480?'static':width<768?'balanced':'high';
    frameInterval=1000/(quality==='high'?30:24);stage.dataset.quality=quality;
    if(!renderer)return;
    var ratio=quality==='high'?1.5:quality==='balanced'?1.25:1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,ratio));renderer.shadowMap.enabled=quality==='high';
  }

  function resize(){
    if(!renderer||!camera)return;
    var width=Math.max(1,stage.clientWidth),height=Math.max(1,stage.clientHeight);applyQuality(width);
    camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);
    if(reduce||quality==='static'){currentScale=modelScale;if(artifact)artifact.scale.setScalar(modelScale);renderer.render(scene,camera);}else requestLoop();
  }

  function requestLoop(){if(reduce||quality==='static'||raf||!visible||document.hidden||!renderer||!artifact)return;raf=requestAnimationFrame(frame);}

  function zoneFromPointer(){
    if(!pointerInside||dragging||!raycaster||!artifactMeshes.length){hideReadout();return -1;}
    raycaster.setFromCamera(pointer,camera);
    var hits=raycaster.intersectObjects(artifactMeshes,false);
    if(!hits.length||!hits[0].face){hideReadout();return -1;}
    var hit=hits[0],attr=hit.object.geometry.getAttribute('aZoneId');
    if(!attr){hideReadout();return -1;}
    var face=hit.face,index=Math.round((attr.getX(face.a)+attr.getX(face.b)+attr.getX(face.c))/3);
    activeZone=Math.max(0,Math.min(3,index));showReadout(activeZone);return activeZone;
  }

  function frame(now){
    raf=0;if(!visible||document.hidden||!renderer||!artifact)return;
    var elapsed=lastRender?now-lastRender:frameInterval;
    if(lastRender&&elapsed<frameInterval){raf=requestAnimationFrame(frame);return;}
    var delta=Math.min(elapsed,50),phase=now*.001;lastRender=now;
    if(currentScale<modelScale){currentScale+=(modelScale-currentScale)*.055;if(modelScale-currentScale<.001)currentScale=modelScale;artifact.scale.setScalar(currentScale);}
    currentX+=(targetX-currentX)*.055;currentY+=(targetY-currentY)*.055;spin+=delta*.000072;
    artifact.rotation.x=-.055+currentX;artifact.rotation.y=spin+currentY;
    scene.updateMatrixWorld(true);var zone=zoneFromPointer();
    shaderRefs.forEach(function(shader){shader.uniforms.uActiveZone.value=zone;shader.uniforms.uTime.value=phase;});
    wireShells.forEach(function(shell){shell.material.color.setHex(zone>=0?[0x886633,0xcc8844,0x44ddff,0xff6633][zone]:0x39dfff);shell.material.opacity=zone>=0?.065:.022+Math.sin(phase*1.2)*.009;});
    edgeShells.forEach(function(shell){shell.material.opacity=zone>=0?.07:.03+Math.sin(phase*1.8)*.012;});
    if(signalParticles){signalParticles.rotation.y-=delta*.000025;signalParticles.material.opacity=.28+Math.sin(phase*1.6)*.08;}
    if(zone===3){var percent=Math.floor((phase*.34%1)*100);if(relicState!=='transmitting'||percent!==lastPercent)renderRelicState('transmitting',percent);}
    else if(zone>=0){if(relicState!=='awakened')renderRelicState('awakened',0);}
    else if(relicState!=='dormant')renderRelicState('dormant',0);
    renderer.toneMappingExposure=.98+Math.sin(phase*.7)*.045;renderer.render(scene,camera);raf=requestAnimationFrame(frame);
  }

  function paintModel(THREE,model){
    model.traverse(function(child){if(child.isMesh&&child.geometry)artifactMeshes.push(child);});
    artifactMeshes.forEach(function(child){
      var geometry=child.geometry;if(!geometry.attributes.normal)geometry.computeVertexNormals();
      var positions=geometry.attributes.position.array,count=positions.length/3;
      var xMin=Infinity,xMax=-Infinity,yMin=Infinity,yMax=-Infinity,zMin=Infinity,zMax=-Infinity;
      for(var i=0;i<count;i++){var x=positions[i*3],y=positions[i*3+1],z=positions[i*3+2];xMin=Math.min(xMin,x);xMax=Math.max(xMax,x);yMin=Math.min(yMin,y);yMax=Math.max(yMax,y);zMin=Math.min(zMin,z);zMax=Math.max(zMax,z);}
      var xRange=xMax-xMin||1,yRange=yMax-yMin||1,zRange=zMax-zMin||1;
      var palette=[[.55,.48,.44],[.68,.62,.56],[.72,.70,.78],[.82,.78,.80]];
      var colors=new Float32Array(positions.length),zoneIds=new Float32Array(count),normY=new Float32Array(count);
      for(var vertex=0;vertex<count;vertex++){
        var nx=(positions[vertex*3]-xMin)/xRange,ny=(positions[vertex*3+1]-yMin)/yRange,nz=(positions[vertex*3+2]-zMin)/zRange;
        var zone=ny<.2?0:ny<.45?1:ny<.7&&!(Math.abs(nx-.5)>.38||Math.abs(nz-.5)>.38)?2:ny<.7?1:3;
        var color=palette[zone],boundary=Math.max(1-Math.min(1,Math.abs(ny-.2)/.025),1-Math.min(1,Math.abs(ny-.45)/.025),1-Math.min(1,Math.abs(ny-.7)/.025));
        colors[vertex*3]=Math.min(1,color[0]+boundary*.12);colors[vertex*3+1]=Math.min(1,color[1]+boundary*.04);colors[vertex*3+2]=Math.min(1,color[2]+boundary*.02);
        zoneIds[vertex]=zone;normY[vertex]=ny;
      }
      geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setAttribute('aZoneId',new THREE.BufferAttribute(zoneIds,1));geometry.setAttribute('aNormY',new THREE.BufferAttribute(normY,1));
      var material=child.material&&child.material.isMeshStandardMaterial?child.material.clone():new THREE.MeshStandardMaterial({color:0xffffff,roughness:.35,metalness:.58});
      material.vertexColors=true;material.emissive=new THREE.Color(0xff5b1e);material.emissiveIntensity=.008;material.envMapIntensity=.55;
      material.onBeforeCompile=function(shader){
        shader.uniforms.uActiveZone={value:-1};shader.uniforms.uTime={value:0};
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float aZoneId;\nattribute float aNormY;\nvarying float vZoneId;\nvarying float vNormY;');
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvZoneId=aZoneId;\nvNormY=aNormY;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float uActiveZone;\nuniform float uTime;\nvarying float vZoneId;\nvarying float vNormY;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <tonemapping_fragment>',
          'if(uActiveZone>=0.0){float zId=floor(vZoneId+0.5);float aZ=floor(uActiveZone+0.5);vec3 zCol=aZ<0.5?vec3(1.0,.35,.06):aZ<1.5?vec3(.85,.45,.12):aZ<2.5?vec3(.12,.55,.95):vec3(1.0,.38,0.0);if(zId==aZ){float pulse=.5+.5*sin(uTime*3.5+vNormY*18.0);gl_FragColor.rgb+=zCol*pulse*.14;}if(aZ>2.5){float wave=smoothstep(.12,0.0,abs(vNormY-(1.0-fract(uTime*1.5))));gl_FragColor.rgb+=vec3(1.0,.35,.06)*wave*.22;}}\n#include <tonemapping_fragment>');
        shaderRefs.push(shader);
      };
      material.needsUpdate=true;child.material=material;child.castShadow=quality==='high';child.receiveShadow=quality==='high';
      var wire=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0x39dfff,wireframe:true,transparent:true,opacity:.025,blending:THREE.AdditiveBlending,depthWrite:false}));wire.scale.setScalar(1.008);child.add(wire);wireShells.push(wire);
      var edge=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0xff5b1e,side:THREE.BackSide,transparent:true,opacity:.035,blending:THREE.AdditiveBlending,depthWrite:false}));edge.scale.setScalar(1.022);child.add(edge);edgeShells.push(edge);
    });
  }

  function initScene(){
    if(!window.THREE||!window.THREE.GLTFLoader){fail();return;}var THREE=window.THREE;
    applyQuality(Math.max(1,stage.clientWidth));
    try{renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:quality!=='static',alpha:true,powerPreference:'low-power'});}catch(error){fail();return;}
    renderer.setClearColor(0x000000,0);renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
    renderer.shadowMap.enabled=quality==='high';renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x040303,.026);camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(0,.2,5.25);
    scene.add(new THREE.HemisphereLight(0xffd7bf,0x08030a,.72));
    var key=new THREE.DirectionalLight(0xffa06a,2.8);key.position.set(4,6,5);key.castShadow=quality==='high';scene.add(key);
    var rim=new THREE.PointLight(0xff542a,2.1,12);rim.position.set(-3,2,-2);scene.add(rim);
    var cool=new THREE.PointLight(0x4488ff,.9,10);cool.position.set(3,-1,2);scene.add(cool);
    var grid=new THREE.GridHelper(8,28,0x612611,0x25130e);grid.position.y=-1.35;grid.material.transparent=true;grid.material.opacity=.13;scene.add(grid);
    var ringMaterial=new THREE.MeshBasicMaterial({color:0xff6738,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false});
    var ring=new THREE.Mesh(new THREE.TorusGeometry(1.82,.009,8,128),ringMaterial);ring.rotation.x=Math.PI*.52;ring.position.y=-1.32;scene.add(ring);
    var particleCount=quality==='high'?54:30,particles=[];for(var i=0;i<particleCount;i++){var angle=i/particleCount*Math.PI*2,radius=1.6+(i%7)*.13;particles.push(Math.cos(angle)*radius,-1.15+((i*7)%23)/23*3.4,Math.sin(angle)*radius*.62);}
    var particleGeometry=new THREE.BufferGeometry();particleGeometry.setAttribute('position',new THREE.Float32BufferAttribute(particles,3));
    signalParticles=new THREE.Points(particleGeometry,new THREE.PointsMaterial({color:0xff7545,size:.022,transparent:true,opacity:.32,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(signalParticles);
    raycaster=new THREE.Raycaster();

    new THREE.GLTFLoader().load('/assets/dmf-studio-optimized-59ce574c.glb',function(gltf){
      var model=gltf.scene,box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
      model.position.sub(center);artifact=new THREE.Group();artifact.add(model);modelScale=2.85/Math.max(size.x,size.y,size.z);currentScale=reduce||quality==='static'?modelScale:modelScale*.04;artifact.scale.setScalar(currentScale);artifact.rotation.set(-.055,-.42,0);
      paintModel(THREE,model);scene.add(artifact);setState('ready');renderRelicState('dormant',0);resize();renderer.render(scene,camera);requestLoop();
    },undefined,fail);
    canvas.addEventListener('webglcontextlost',function(event){event.preventDefault();fail();},{once:true});
    resize();if('ResizeObserver'in window)new ResizeObserver(resize).observe(stage);else window.addEventListener('resize',resize);
  }

  function boot(){if(started)return;started=true;if(constrained||!window.WebGLRenderingContext||!window.THREE){fail();return;}loadLoader(initScene);}

  stage.addEventListener('pointerdown',function(event){dragging=true;lastX=event.clientX;lastY=event.clientY;hideReadout();stage.classList.add('is-dragging');stage.setPointerCapture&&stage.setPointerCapture(event.pointerId);});
  stage.addEventListener('pointermove',function(event){
    var rect=stage.getBoundingClientRect();pointerX=event.clientX-rect.left;pointerY=event.clientY-rect.top;pointer.x=pointerX/rect.width*2-1;pointer.y=-(pointerY/rect.height*2-1);pointerInside=true;
    if(dragging){targetY+=(event.clientX-lastX)*.008;targetX=Math.max(-.28,Math.min(.28,targetX+(event.clientY-lastY)*.005));lastX=event.clientX;lastY=event.clientY;}
    if((reduce||quality==='static')&&renderer&&artifact){currentX=targetX;currentY=targetY;artifact.rotation.set(-.055+currentX,spin+currentY,0);scene.updateMatrixWorld(true);zoneFromPointer();renderer.render(scene,camera);}
  });
  function release(){dragging=false;stage.classList.remove('is-dragging');}
  stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);stage.addEventListener('pointerleave',function(){pointerInside=false;release();hideReadout();});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)lastRender=0;requestLoop();});
  if('MutationObserver'in window)new MutationObserver(function(){renderRelicState(relicState,lastPercent<0?0:lastPercent);if(activeZone>=0)showReadout(activeZone);}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});

  function mount(){
    if('IntersectionObserver'in window)new IntersectionObserver(function(entries){visible=entries[0].isIntersecting;if(visible){lastRender=0;boot();requestLoop();}else{if(raf)cancelAnimationFrame(raf);raf=0;lastRender=0;}},{rootMargin:'220px 0px',threshold:.04}).observe(stage);
    else{visible=true;boot();}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
