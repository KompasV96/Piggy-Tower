// ---------- CANVAS ----------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
function resizeGame(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeGame();
window.addEventListener("resize", resizeGame);

// ---------- GAME STATE ----------
let gameState = "start";
let loadingTimer = 0;

// ---------- PLAYER ----------
let player = {
  x: canvas.width/2 - 15,
  y: canvas.height - 120,
  w: 30, h: 30,
  vx: 0, vy: 0,
  lastY: canvas.height - 120
};
const UI_MARGIN = 20;
const SAFE = Math.max(20, canvas.width * 0.04);
const HUD = 70;
let boostButton = {
  x: 0,
  y: 0,
  r: 28
};
// ---------- PHYSICS ----------
let gravity = 2400;
let jumpPower = -1000;
let maxFall = 1400;
let speedKeyboard = 550;
let speedTouch = 300;
// FLOW
let airControl = 0.55;     // sterowanie w powietrzu
let coyoteTime = 0.08;     // można skoczyć chwilę po zejściu
let coyoteTimer = 0;
let jumpBuffer = 0.12;     // wciśniesz przed lądowaniem = zadziała
let jumpBufferTimer = 0;
let onGround = false;


// ---------- SCORE ----------
let worldOffset = 0;
let score = 0;
let bestScore = Number(localStorage.getItem("piggyBest")) || 0;


// ---------- DANGER ----------
let dangerY = canvas.height + 200;
let dangerSpeed = 190;



// ---------- PLATFORMS ----------
const PLATFORM_COUNT = 20;
const PLATFORM_GAP = 140;
let platforms = [];

// ---------- COINS ----------
let coins = [];
let coinScore = 0;

// ---------- boskie szczescie ----------

let miracleMargin = 25; // ile px od lawy to „o włos”
let miraclePower = 5 * PLATFORM_GAP; // 5 platform w górę
let miracleUsed = false;

// BOOST (jednorazowy tryb)
let boostReady = true;
let boosting = false;

let boostDuration = 1.1;
let boostTimer = 0;

let boostForce = 3400;       // siła ciągu co sekundę
let boostGravityFactor =0.18; // lżejsza grawitacja
let boostControlLock = 0.18;
let boostLockTimer = 0;


function createPlatform(y){
  let w = 120 + Math.random()*120;
  let x = Math.random()*(canvas.width-w);
  return { x, y, w, h:20 };
}

function initPlatforms(){
  platforms = [];

  platforms.push({ x:0, y:canvas.height-80, w:canvas.width, h:20 });

  let y = canvas.height-80-PLATFORM_GAP;
  for(let i=1;i<PLATFORM_COUNT;i++){
    platforms.push(createPlatform(y));
    y -= PLATFORM_GAP;
  }

  spawnInitialCoins();
}
function recyclePlatforms(){
  let highest = Infinity;

  for(let p of platforms){
    if(p.y < highest) highest = p.y;
  }

  for(let p of platforms){
    if(p.y > canvas.height + 50){

      highest -= PLATFORM_GAP;
      let np = createPlatform(highest);

      p.x = np.x;
      p.y = np.y;
      p.w = np.w;

      // 💰 spawn monety NA NOWEJ platformie
   
      if(Math.random() < 0.4){
        coins.push({
          x: p.x + Math.random() * (p.w - 20),
          y: p.y - (25 + Math.random()*30),
          r: 8
        });
      }
    }
  }
}

initPlatforms();

// ---------- INPUT ----------
let left=false, right=false, touchSide=0;

document.addEventListener("keydown", e=>{
  if(e.key==="ArrowLeft") left=true;
  if(e.key==="ArrowRight") right=true;
  if(e.key==="ArrowUp") tryBoost();

  if(e.code==="Space" && gameState==="start"){
    e.preventDefault();
    gameState="play";
  }

  if((e.key==="r"||e.key==="R") && gameState==="dead") resetGame();
});

document.addEventListener("keyup", e=>{
  if(e.key==="ArrowLeft") left=false;
  if(e.key==="ArrowRight") right=false;
});

canvas.addEventListener("pointerdown", e=>{

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  if(gameState==="start"){ gameState="play"; return; }
  if(gameState==="dead"){ resetGame(); return; }

  // klik w boost
  const dx = mx - boostButton.x;
  const dy = my - boostButton.y;

  if(Math.sqrt(dx*dx + dy*dy) <= boostButton.r){
      tryBoost();
      return;
  }

  // sterowanie lewo/prawo
  touchSide = (mx < canvas.width/2 ? -1 : 1);
});

canvas.addEventListener("pointerup", ()=>touchSide=0);
canvas.addEventListener("pointercancel", ()=>touchSide=0);

// ---------- RESET ----------
function spawnInitialCoins(){

  coins = [];

  for(let i=1;i<platforms.length;i++){ // pomijamy podłogę

    let p = platforms[i];

    if(Math.random() < 0.5){
      coins.push({
        x: p.x + Math.random()*(p.w-20),
        y: p.y - (20 + Math.random()*40),
        r: 8
      });
    }
  }
}
function resetGame(){
  
  player.x = canvas.width/2 - 15;
  player.y = canvas.height - 120;
  player.vx = 0;
  player.vy = 0;
  player.lastY = player.y;

  worldOffset = 0;
  score = 0;

  dangerY = canvas.height + 200;
  dangerSpeed = 0;

  miracleUsed = false;

  left = false;
  right = false;
  touchSide = 0;

  initPlatforms();   // ← jedyne miejsce generacji monet
  coinScore = 0;

  gameState = "loading";
  loadingTimer = 400;

boostReady = true;
boostLockTimer = 0;
}
// ================= UPDATE =================
function tryBoost(){

  if(!boostReady || gameState!=="play") return;

  boostReady = false;
  boosting = true;
  boostTimer = boostDuration;

  // lekki startowy kop
  if(player.vy > 0) player.vy *= 0.3;
  player.vy = -900;

  boostLockTimer = boostControlLock;
}

function updateState(dt){
  if(gameState!=="loading") return false;
  loadingTimer -= dt;
  if(loadingTimer<=0) gameState="start";
  return true;
}

function updateScore(){
  score = Math.floor(worldOffset/12) + coinScore;
}

function updateDanger(dtSec){

  // prędkość lawy
  dangerSpeed = 190 + worldOffset / 2000;
  dangerY -= dangerSpeed * dtSec;

  // odległość lawy od nóg gracza
  let distance = dangerY - (player.y + player.h);

  // ===== BOSKIE SZCZĘŚCIE =====
  if(!miracleUsed && distance < miracleMargin && distance > -20){

      miracleUsed = true;

      // cofnięcie lawy
      dangerY += 120;

      // WYSTRZAŁ W GÓRĘ
      player.vy = -Math.sqrt(2 * gravity * miraclePower);
  }

  // ===== ŚMIERĆ =====
  if(player.y + player.h > dangerY){
      gameState = "dead";

      if(score > bestScore){
          bestScore = score;
          localStorage.setItem("piggyBest", bestScore);
      }
  }
}

function updatePlayer(dt,dtSec){
  player.lastY = player.y;
  // sprawdzanie ziemi
onGround = false;

  // ruch
 let targetSpeed = 0;

if(left) targetSpeed = -speedKeyboard;
else if(right) targetSpeed = speedKeyboard;
else if(touchSide===-1) targetSpeed = -speedTouch;
else if(touchSide===1) targetSpeed = speedTouch;

let control = onGround ? 1 : airControl;

if(boostLockTimer > 0){
  control = 0.05;
  boostLockTimer -= dtSec;
}

player.vx += (targetSpeed - player.vx) * 8 * control * dtSec;

  player.x += player.vx*dtSec;
  if(player.x<0) player.x=0;
  if(player.x+player.w>canvas.width) player.x=canvas.width-player.w;

  // grawitacja
  let gravityFactor = 1;

if(boosting){
    gravityFactor = boostGravityFactor;

    // ciąg
    player.vy -= boostForce * dtSec;

    boostTimer -= dtSec;
    if(boostTimer <= 0){
        boosting = false;
    }
}

player.vy += gravity * gravityFactor * dtSec;

if(player.vy > maxFall) player.vy = maxFall;
player.y += player.vy * dtSec;
}
function updatePlatforms(dt){

  // --- KOLIZJE ---
  for(let p of platforms){

    let prevBottom = player.lastY + player.h;
    let currBottom = player.y + player.h;

    if(player.vy>0 &&
       prevBottom<=p.y &&
       currBottom>=p.y &&
       player.x<p.x+p.w &&
       player.x+player.w>p.x){

        player.y = p.y - player.h;
player.vy = jumpPower;

onGround = true;
coyoteTimer = coyoteTime;

break;
    }
  }

  // ===== KAMERA =====
  if(player.y < canvas.height/2){

    let diff = canvas.height/2 - player.y;

    player.y = canvas.height/2;
    worldOffset += diff;

    for(let p of platforms) p.y += diff;
for(let c of coins) c.y += diff;   // ← TO BRAKOWAŁO
dangerY += diff;
  }
}
function updateCoins(){

  for(let i = coins.length-1; i >= 0; i--){

    let c = coins[i];

   

    // kolizja
    if(player.x < c.x + c.r &&
       player.x + player.w > c.x &&
       player.y < c.y + c.r &&
       player.y + player.h > c.y){

        coinScore += 50;
        coins.splice(i,1);
    }

    // usuwamy gdy spadną poza ekran
    if(c.y > canvas.height + 20){
        coins.splice(i,1);
    }
  }
}
function update(dt){
  if(updateState(dt)) return;
  if(gameState!=="play") return;

  const dtSec=dt/1000;

  updatePlayer(dt,dtSec);
  updatePlatforms(dt);
  updateCoins();
  recyclePlatforms();
  updateScore();
  updateDanger(dtSec);
}

// ================= DRAW =================

function draw(){

  // ===== CZYŚĆ EKRAN (TYLKO RAZ) =====
  ctx.clearRect(0,0,canvas.width,canvas.height);


  // ====== WORLD ======
  ctx.save();
  ctx.translate(0, HUD);
  

  let gradient=ctx.createLinearGradient(0,dangerY,0,canvas.height);
  gradient.addColorStop(0,"#ff0040");
  gradient.addColorStop(1,"#300");
  ctx.fillStyle=gradient;
  ctx.fillRect(0,dangerY,canvas.width,canvas.height);

  ctx.fillStyle="#0f0";
  for(let p of platforms) ctx.fillRect(p.x,p.y,p.w,p.h);

  ctx.fillStyle="gold";
  for(let c of coins){
    ctx.beginPath();
    ctx.arc(c.x,c.y,c.r,0,Math.PI*2);
    ctx.fill();
  }

  ctx.fillStyle="#f00";
  ctx.fillRect(player.x,player.y,player.w,player.h);

  ctx.restore();


  // ===== HUD PANEL =====
  ctx.fillStyle="#2a2a2a";
  ctx.fillRect(0,0,canvas.width,HUD);

  ctx.strokeStyle="#111";
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(0,HUD);
  ctx.lineTo(canvas.width,HUD);
  ctx.stroke();


  // ===== HUD TEXT =====
  // ===== BOOST BUTTON =====
boostButton.x = canvas.width - SAFE - boostButton.r;
boostButton.y = HUD/2;

ctx.beginPath();
ctx.arc(boostButton.x, boostButton.y, boostButton.r, 0, Math.PI*2);

if(boostReady){
  ctx.fillStyle = "#ff8800";
}else{
  ctx.fillStyle = "#555";
}

ctx.fill();

ctx.fillStyle = "white";
ctx.font = "14px Arial";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillText("BOOST", boostButton.x, boostButton.y);
  
  ctx.textAlign="left";
  ctx.textBaseline="top";
  ctx.fillStyle="white";
  ctx.font="20px Arial";
  ctx.fillText("Score: "+score, SAFE, SAFE);
  ctx.fillText("Best: "+bestScore, SAFE, SAFE+25);

  if(gameState==="start") drawOverlay("PIGGY TOWER","tap to start");
  if(gameState==="dead") drawOverlay("GAME OVER","tap to restart");
  if(gameState==="loading") drawOverlay("loading...","");
}
function drawOverlay(title,sub){
  ctx.fillStyle="rgba(0,0,0,0.6)";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle="white";
  ctx.textAlign="center";

  ctx.font="50px Arial";
  ctx.fillText(title,canvas.width/2,canvas.height/2-40);

  ctx.font="25px Arial";
  ctx.fillText(sub,canvas.width/2,canvas.height/2+20);
}
// ================= LOOP =================

let lastTime=performance.now();

function loop(now){
  let dt=now-lastTime;
  if(dt>50) dt=50;
  lastTime=now;

  update(dt);
  draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
