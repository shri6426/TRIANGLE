
// Cursor
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursor-ring');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove',e=>{
  mx=e.clientX;my=e.clientY;
  cursor.style.left=mx+'px';cursor.style.top=my+'px';
});
(function animRing(){
  rx+=(mx-rx)*0.12;ry+=(my-ry)*0.12;
  ring.style.left=rx+'px';ring.style.top=ry+'px';
  requestAnimationFrame(animRing);
})();
document.querySelectorAll('a,button,.prompt-tab,.demo-upload-zone,.prompt-copy').forEach(el=>{
  el.addEventListener('mouseenter',()=>{ring.style.width='56px';ring.style.height='56px';ring.style.opacity='0.6'});
  el.addEventListener('mouseleave',()=>{ring.style.width='36px';ring.style.height='36px';ring.style.opacity='1'});
});

// Canvas background
const canvas=document.getElementById('bg-canvas');
const ctx=canvas.getContext('2d');
let W,H,particles=[];
function resize(){W=canvas.width=canvas.offsetWidth;H=canvas.height=canvas.offsetHeight;}
resize();window.addEventListener('resize',()=>{resize();init();});
function Particle(){
  this.x=Math.random()*W;this.y=Math.random()*H;
  this.vx=(Math.random()-0.5)*0.3;this.vy=(Math.random()-0.5)*0.3;
  this.r=Math.random()*1.5+0.5;this.a=Math.random()*0.4+0.1;
}
function init(){particles=[];for(let i=0;i<80;i++)particles.push(new Particle());}
init();
// Triangle glow structure
const tris=[
  {x:W/2,y:H*0.5,size:300,opacity:0.04},
  {x:W/2,y:H*0.5,size:180,opacity:0.06},
  {x:W/2,y:H*0.5,size:90,opacity:0.08},
];
let t=0;
function drawTri(cx,cy,sz,op,rot){
  ctx.save();ctx.translate(cx,cy);ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0,-sz);ctx.lineTo(sz*0.866,sz*0.5);ctx.lineTo(-sz*0.866,sz*0.5);ctx.closePath();
  ctx.strokeStyle=`rgba(160,180,255,${op})`;ctx.lineWidth=1;ctx.stroke();
  ctx.restore();
}
function animate(){
  ctx.clearRect(0,0,W,H);
  // Radial glow
  const grd=ctx.createRadialGradient(W/2,H*0.5,0,W/2,H*0.5,400);
  grd.addColorStop(0,'rgba(80,100,200,0.06)');
  grd.addColorStop(1,'transparent');
  ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
  // Triangles
  t+=0.003;
  drawTri(W/2,H*0.5,300+Math.sin(t)*10,0.03+Math.sin(t)*0.01,t*0.1);
  drawTri(W/2,H*0.5,180+Math.sin(t+1)*8,0.05,t*-0.15);
  drawTri(W/2,H*0.5,90+Math.sin(t+2)*5,0.07,-t*0.2);
  // Particles
  ctx.fillStyle='rgba(160,180,255,0.6)';
  particles.forEach(p=>{
    p.x+=p.vx;p.y+=p.vy;
    if(p.x<0)p.x=W;if(p.x>W)p.x=0;
    if(p.y<0)p.y=H;if(p.y>H)p.y=0;
    ctx.globalAlpha=p.a;
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
  });
  ctx.globalAlpha=1;
  requestAnimationFrame(animate);
}
animate();

// Intersection Observer for reveals
const obs=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')});
},{threshold:0.15});
document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));

// Prompt output state
let generatedPrompts = {
  Master: "Awaiting analysis...",
  Claude: "Awaiting analysis...",
  Gemini: "Awaiting analysis...",
  Cursor: "Awaiting analysis..."
};
let activePromptKey = "Master";

// Setup Tabs
document.querySelectorAll('.prompt-tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    document.querySelectorAll('.prompt-tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    activePromptKey = tab.textContent.trim();
    
    // Update the label
    const labelEl = document.getElementById('current-prompt-label');
    if (labelEl) labelEl.textContent = activePromptKey + " Prompt";
    
    // Update text
    const el = document.getElementById('typed-text');
    el.textContent = generatedPrompts[activePromptKey] || "Awaiting analysis...";
  });
});

// Copy to clipboard
document.querySelector('.prompt-copy').addEventListener('click', function() {
  const textToCopy = document.getElementById('typed-text').textContent;
  if (!textToCopy || textToCopy.includes("Awaiting analysis") || textToCopy.includes("Failed")) return;
  
  navigator.clipboard.writeText(textToCopy).then(() => {
    const originalText = this.textContent;
    this.textContent = "Copied!";
    setTimeout(() => {
      this.textContent = originalText;
    }, 2000);
  }).catch(err => console.error("Copy failed", err));
});

// File Upload Logic
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const sendButton = document.getElementById('send-button');
let selectedFile = null;

uploadZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    selectedFile = e.target.files[0];
    
    // Update UI state to show file selected
    document.getElementById('upload-title').textContent = "Image Ready";
    document.getElementById('upload-desc').textContent = selectedFile.name;
    
    // Enable the send button
    sendButton.style.opacity = '1';
    sendButton.style.pointerEvents = 'auto';
    sendButton.textContent = 'Synthesize Prompts';
  }
});

sendButton.addEventListener('click', async () => {
  if (!selectedFile) return;

  // Disable button during analysis
  sendButton.style.opacity = '0.5';
  sendButton.style.pointerEvents = 'none';
  sendButton.textContent = 'Synthesizing...';
  document.getElementById('upload-title').textContent = "Uploading...";

  const steps = ['scene', 'lighting', 'color', 'camera', 'prompt'];
  steps.forEach(step => {
    document.getElementById('status-' + step).className = 'status-pending';
    document.getElementById('status-' + step).textContent = '';
    if(step !== 'prompt') document.getElementById('detail-' + step).textContent = 'waiting...';
  });
  
  try {
    // Step 1: Uploading / Reconstructing
    setStepState('scene', 'loading', 'Uploading image...');
    
    const formData = new FormData();
    formData.append('image', selectedFile);
    const userIntent = document.getElementById('user-intent-input').value;
    if (userIntent) {
      formData.append('userIntent', userIntent);
    }
    
    const response = await fetch('/analyze', {
      method: 'POST',
      body: formData
    });
    
    setStepState('scene', 'done', selectedFile.name);
    
    if (!response.ok) throw new Error('Analysis failed');
    
    const data = await response.json();
    
    // Update steps sequentially for effect
    await animateStep('lighting', data.COMPONENT_ANALYSIS || 'detected');
    await animateStep('color', data.DESIGN_SYSTEM || 'extracted');
    await animateStep('camera', data.COLOR_PALETTE || 'detected');
    await animateStep('prompt', 'engineering...');
    
    // Populate Outputs
    document.getElementById('output-lighting').textContent = data.LAYOUT_ANALYSIS || 'N/A';
    document.getElementById('output-color').textContent = data.COMPONENT_ANALYSIS || 'N/A';
    document.getElementById('output-camera').textContent = data.DESIGN_SYSTEM || 'N/A';
    document.getElementById('output-style').textContent = data.COLOR_PALETTE || 'N/A';
    
    generatedPrompts.Master = data.MASTER_PROMPT || 'Failed to generate Master Prompt';
    generatedPrompts.Claude = data.CLAUDE_PROMPT || data.MASTER_PROMPT;
    generatedPrompts.Gemini = data.GEMINI_PROMPT || data.MASTER_PROMPT;
    generatedPrompts.Cursor = data.CURSOR_PROMPT || data.MASTER_PROMPT;
    
    // Update currently visible prompt
    document.getElementById('typed-text').textContent = generatedPrompts[activePromptKey];
    setStepState('prompt', 'done', 'Ready');
    
    document.getElementById('upload-title').textContent = "Analysis Complete";
    sendButton.textContent = 'Done';
    
  } catch (err) {
    console.error(err);
    document.getElementById('upload-title').textContent = "Upload Failed";
    document.getElementById('upload-desc').textContent = "Please try again.";
    steps.forEach(step => setStepState(step, 'pending', 'error'));
    sendButton.style.opacity = '1';
    sendButton.style.pointerEvents = 'auto';
    sendButton.textContent = 'Retry Synthesis';
  }
});

function setStepState(step, state, detail) {
  const statusEl = document.getElementById('status-' + step);
  const detailEl = document.getElementById('detail-' + step);
  if (state === 'loading') {
    statusEl.className = 'status-loading';
    statusEl.textContent = '';
  } else if (state === 'done') {
    statusEl.className = 'status-done';
    statusEl.textContent = '✓';
  } else {
    statusEl.className = 'status-pending';
    statusEl.textContent = '';
  }
  if (detail) detailEl.textContent = detail;
}

function animateStep(step, detail) {
  return new Promise(resolve => {
    setStepState(step, 'loading', 'extracting...');
    setTimeout(() => {
      setStepState(step, 'done', detail);
      resolve();
    }, 800); // Cinematic delay for effect
  });
}
