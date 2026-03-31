// ===== STATE =====
let state={title:'',restaurant:'',people:[],items:[],vat:false,sc:false,rounding:0,promptpay:''};
let summaryUnlocked=false;
const COLORS=['#2a5000','#3a6a00','#1a4a6e','#7b3a00','#5a007a','#8a1a1a','#006a5a','#4a4a00'];
const SLOTS=['setup','items','summary','payment','export'];
function pc(i){return COLORS[i%COLORS.length];}
function ini(n){return n.slice(0,2).toUpperCase();}
function uid(){return Math.random().toString(36).slice(2,8);}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ===== PERSISTENCE =====
function saveState(){
  state.title=document.getElementById('bill-title')?.value||state.title;
  state.restaurant=document.getElementById('bill-restaurant')?.value||state.restaurant;
  state.vat=document.getElementById('vat-toggle')?.checked??state.vat;
  state.sc=document.getElementById('sc-toggle')?.checked??state.sc;
  localStorage.setItem('thbill_v1',JSON.stringify(state));
}
function loadState(){try{const s=localStorage.getItem('thbill_v1');if(s)state={...state,...JSON.parse(s)};}catch(e){}}

// ===== NAV =====
function goTo(name){
  if(!summaryUnlocked&&['summary','payment','export'].includes(name)){showToast('กรอกรายการก่อนนะ 😊');return;}
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+name).classList.add('active');
  if(name==='items') renderItems();
  if(name==='summary'){summaryUnlocked=true;renderSummary();}
  if(name==='payment') renderPayment();
  if(name==='export') renderExport();
  renderAboutPanels();
  window.scrollTo(0,0);
}
function goToItems(){
  if(state.people.length===0){showToast('กรุณาเพิ่มคนก่อนนะ 😊');return;}
  saveState();
  if(state.items.length===0){addItemToState();gtag('event','bill_started',{people_count:state.people.length});}
  goTo('items');
}
function goToSummary(){saveState();summaryUnlocked=true;gtag('event','bill_summarised',{people_count:state.people.length,items_count:state.items.length});goTo('summary');}

// ===== PEOPLE =====
function addPerson(){
  const inp=document.getElementById('person-name-input');
  const name=inp.value.trim();
  if(!name) return;
  if(state.people.find(p=>p.name.toLowerCase()===name.toLowerCase())){showToast('มีชื่อนี้แล้ว');return;}
  state.people.push({id:uid(),name});inp.value='';renderPeopleChips();saveState();
}
function removePerson(id){
  state.people=state.people.filter(p=>p.id!==id);
  state.items.forEach(it=>{it.assignedTo=it.assignedTo.filter(pid=>pid!==id);});
  renderPeopleChips();saveState();
}
function renderPeopleChips(){
  document.getElementById('people-count').textContent=state.people.length+' คน';
  document.getElementById('people-row').innerHTML=state.people.map((p,i)=>`
    <div class="person-chip">
      <div class="person-avatar" style="background:${pc(i)};color:#fff" onclick="removePerson('${p.id}')" title="กดเพื่อลบ">
        ${ini(p.name)}
        <span style="position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:#ba1a1a;color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center;border:2px solid var(--bg)">×</span>
      </div>
      <span class="person-name">${p.name}</span>
    </div>`).join('');
}

// ===== ITEMS =====
function addItemToState(){state.items.push({id:uid(),name:'',price:'',assignedTo:[]});}
function addItem(){
  addItemToState();renderItems();saveState();
  setTimeout(()=>{const rows=document.querySelectorAll('#items-list .item-row');if(rows.length)rows[rows.length-1].scrollIntoView({behavior:'smooth',block:'center'});},80);
}
function removeItem(id){state.items=state.items.filter(i=>i.id!==id);renderItems();saveState();}
function updateItemName(id,val){const it=state.items.find(i=>i.id===id);if(it){it.name=val;saveState();}}
function updateItemPrice(id,val){const it=state.items.find(i=>i.id===id);if(it){it.price=val;saveState();}}
function togglePerson(itemId,personId){
  const it=state.items.find(i=>i.id===itemId);if(!it)return;
  const idx=it.assignedTo.indexOf(personId);
  if(idx===-1)it.assignedTo.push(personId);else it.assignedTo.splice(idx,1);
  renderItems();saveState();
}
function splitAll(itemId){
  const it=state.items.find(i=>i.id===itemId);if(!it)return;
  it.assignedTo=state.people.map(p=>p.id);renderItems();saveState();
}
function renderItems(){
  const list=document.getElementById('items-list');
  if(!state.items.length){list.innerHTML=`<div class="empty-state"><div class="empty-state-icon">🍽️</div><p>ยังไม่มีรายการ<br>กด + เพื่อเพิ่มอาหาร</p></div>`;return;}
  list.innerHTML=state.items.map(it=>`
    <div class="item-row">
      <div class="item-top">
        <div class="item-inputs">
          <input class="item-name-input" placeholder="ชื่อรายการ เช่น ส้มตำ" value="${esc(it.name)}" oninput="updateItemName('${it.id}',this.value)"/>
          <div class="item-price-wrap"><span>฿</span><input class="item-price-input" placeholder="0" type="number" inputmode="decimal" min="0" value="${it.price}" oninput="updateItemPrice('${it.id}',this.value)"/></div>
        </div>
        <button class="item-delete" onclick="removeItem('${it.id}')">🗑</button>
      </div>
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:12px;color:var(--text-muted);font-weight:600">ใครสั่ง?</span>
          <button class="split-all-btn" onclick="splitAll('${it.id}')">เลือกทั้งหมด</button>
        </div>
        <div class="item-people-wrap">
          ${state.people.map(p=>`<button class="item-person-chip ${it.assignedTo.includes(p.id)?'selected':''}" onclick="togglePerson('${it.id}','${p.id}')">${p.name}</button>`).join('')}
          ${!state.people.length?'<span style="font-size:12px;color:var(--text-muted)">เพิ่มคนก่อนนะ</span>':''}
        </div>
        ${it.assignedTo.length&&it.price?`<div style="margin-top:8px;background:var(--primary-fixed);border-radius:8px;padding:7px 10px;font-size:12px;color:var(--primary);font-weight:600">แชร์กัน ${it.assignedTo.length} คน · ฿${(parseFloat(it.price)/it.assignedTo.length).toFixed(2)} / คน</div>`:''}
      </div>
    </div>`).join('');
}

// ===== CALC =====
function calcTotals(){
  const sub=state.items.reduce((s,i)=>s+(parseFloat(i.price)||0),0);
  const vat=state.vat?sub*0.07:0,sc=state.sc?sub*0.10:0,total=sub+vat+sc;
  const fr=sub>0?(vat+sc)/sub:0;
  const pt={};
  state.people.forEach(p=>{pt[p.id]={raw:0,fees:0,total:0,items:[]};});
  state.items.forEach(it=>{
    const price=parseFloat(it.price)||0;
    if(!it.assignedTo.length||!price)return;
    const share=price/it.assignedTo.length;
    it.assignedTo.forEach(pid=>{
      if(!pt[pid])pt[pid]={raw:0,fees:0,total:0,items:[]};
      pt[pid].raw+=share;pt[pid].items.push({name:it.name,share,count:it.assignedTo.length});
    });
  });
  Object.keys(pt).forEach(pid=>{const p=pt[pid];const wf=p.raw*(1+fr);p.fees=wf-p.raw;p.total=Math.round(wf*100)/100;});
  return{sub,vat,sc,total,pt};
}
function fmt(n){return'฿'+n.toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});}

// ===== SUMMARY =====
function renderSummary(){
  const{sub,vat,sc,total,pt}=calcTotals();
  const title=state.restaurant||state.title||'สรุปบิล';
  let h=`<div style="margin-bottom:14px"><div style="font-size:22px;font-weight:800;color:var(--text)">${esc(title)}</div>${state.title&&state.restaurant?`<div style="font-size:13px;color:var(--text-muted)">${esc(state.title)}</div>`:''}</div>`;
  if(!state.items.length){h+=`<div class="empty-state"><div class="empty-state-icon">🍽️</div><p>ยังไม่มีรายการ ไปเพิ่มก่อนนะ</p></div>`;}
  else{
    h+=`<div class="section-label">รายการอาหาร</div>`;
    h+=state.items.map(it=>{
      const price=parseFloat(it.price)||0;
      const people=it.assignedTo.map(pid=>state.people.find(p=>p.id===pid)).filter(Boolean);
      return`<div class="summary-item">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div style="font-size:15px;font-weight:600">${esc(it.name||'ไม่ระบุชื่อ')}</div>
          <div style="font-size:15px;font-weight:700;color:var(--primary)">${fmt(price)}</div>
        </div>
        <div style="display:flex;gap:4px;margin-top:6px">
          ${people.map(p=>{const pi=state.people.indexOf(p);return`<div class="summary-avatar" style="background:${pc(pi)}">${ini(p.name)}</div>`;}).join('')}
          ${!people.length?'<span style="font-size:11px;color:var(--text-muted)">ยังไม่ได้กำหนด</span>':''}
        </div>
      </div>`;
    }).join('');
  }
  h+=`<div class="totals-card">
    <div class="total-row"><span>ยอดรวม (Subtotal)</span><span>${fmt(sub)}</span></div>
    ${state.vat?`<div class="total-row"><span>VAT 7%</span><span>${fmt(vat)}</span></div>`:''}
    ${state.sc?`<div class="total-row"><span>Service Charge 10%</span><span>${fmt(sc)}</span></div>`:''}
    <div class="total-row divider"><span class="grand-total-label">Grand Total</span><span class="grand-total-amount">${fmt(total)}</span></div>
  </div>`;
  h+=`<div class="section-label">สรุปรายบุคคล <span style="font-size:11px;font-weight:400">← เลื่อนดู</span></div><div class="person-cards-scroll">`;
  state.people.forEach((p,pi)=>{
    const d=pt[p.id]||{raw:0,fees:0,total:0,items:[]};
    h+=`<div class="person-summary-card">
      <div class="pname"><div style="width:24px;height:24px;border-radius:50%;background:${pc(pi)};color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${ini(p.name)}</div>${esc(p.name)}</div>
      ${d.items.map(it=>`<div class="pline"><span>${esc(it.name||'ไม่ระบุ')}${it.count>1?' (1/'+it.count+')':''}</span><span>${fmt(it.share)}</span></div>`).join('')}
      ${(state.vat||state.sc)?`<div class="pline fees"><span>ภาษี+บริการ</span><span>${fmt(d.fees)}</span></div>`:''}
      <div class="ptotal"><span class="ptotal-label">รวม</span><span class="ptotal-amount">${fmt(d.total)}</span></div>
    </div>`;
  });
  h+=`</div>`;
  if(state.people.length)h+=`<div style="height:14px"></div><button class="btn-primary" onclick="goTo('payment')">💳 คิดเงิน →</button>`;
  document.getElementById('summary-content').innerHTML=h;
}

// ===== PAYMENT =====
function applyPromptPay(){
  const val=document.getElementById('promptpay-number').value.trim().replace(/-/g,'');
  if(!val){showToast('กรุณาใส่เบอร์ PromptPay');return;}
  state.promptpay=val;saveState();gtag('event','qr_generated',{people_count:state.people.length});renderPayment();
}
function changePromptPay(){state.promptpay='';saveState();renderPayment();}
function renderPayment(){
  const{pt,total}=calcTotals();
  const ppNum=state.promptpay;
  document.getElementById('payment-total-amount').textContent=fmt(total);
  document.getElementById('payment-people-count').textContent=state.people.length+' คน';
  const card=document.getElementById('promptpay-setup-card');
  card.innerHTML=ppNum?`
    <div class="card-title"><div class="card-icon">📲</div>PromptPay ของคุณ</div>
    <div class="promptpay-display"><span style="font-size:15px;font-weight:600;letter-spacing:.02em">${fmtPhone(ppNum)}</span><button class="copy-btn" onclick="changePromptPay()">เปลี่ยน</button></div>`
  :`<div class="card-title"><div class="card-icon">📲</div>ข้อมูล PromptPay ของคุณ</div>
    <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">ใส่เบอร์หรือเลขบัตรฯ เพื่อสร้าง QR Code ให้เพื่อนสแกนจ่าย</p>
    <div class="promptpay-input-row">
      <input class="promptpay-input" id="promptpay-number" placeholder="08X-XXX-XXXX" maxlength="13" inputmode="numeric" onkeydown="if(event.key==='Enter')applyPromptPay()"/>
      <button class="generate-qr-btn" onclick="applyPromptPay()">สร้าง QR</button>
    </div>`;
  const list=document.getElementById('payment-cards-list');
  if(!state.people.length){list.innerHTML=`<div class="empty-state"><p>ยังไม่มีคน</p></div>`;return;}
  list.innerHTML=state.people.map((p,pi)=>{
    const d=pt[p.id]||{total:0};
    return`<div class="payment-card">
      <div class="payment-card-badge">READY TO PAY</div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:2px">
        <div style="width:38px;height:38px;border-radius:50%;background:${pc(pi)};color:#fff;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${ini(p.name)}</div>
        <div style="font-size:26px;font-weight:800">${esc(p.name)}</div>
      </div>
      <div class="payment-card-amount">${fmt(d.total)}</div>
      ${ppNum?`<div class="qr-wrap"><div class="qr-box" id="qr-${p.id}"></div><div class="qr-label">SCAN TO PAY · ${fmtPhone(ppNum)}</div></div>
        <button class="btn-secondary" style="margin-bottom:8px" onclick="copyPayText('${p.id}','${p.name}',${d.total})">📋 คัดลอกข้อความแจ้งยอด</button>`
      :`<div style="background:var(--surface-low);border-radius:var(--radius);padding:14px;text-align:center;color:var(--text-muted);font-size:13px;margin-bottom:8px">ใส่เลข PromptPay ด้านบนเพื่อสร้าง QR</div>`}
    </div>`;
  }).join('');
  if(ppNum){
    state.people.forEach(p=>{
      const d=pt[p.id]||{total:0};
      const el=document.getElementById('qr-'+p.id);if(!el)return;
      el.innerHTML='';
      try{new QRCode(el,{text:ppPayload(ppNum,d.total),width:180,height:180,correctLevel:QRCode.CorrectLevel.M});}
      catch(e){el.innerHTML='<span style="font-size:11px;color:var(--text-muted);padding:8px">ไม่สามารถสร้าง QR ได้</span>';}
    });
  }
}
function fmtPhone(n){const c=n.replace(/\D/g,'');return c.length===10?c.slice(0,3)+'-'+c.slice(3,6)+'-'+c.slice(6):c;}
function copyPayText(pid,name,amount){
  const pp=fmtPhone(state.promptpay),rest=state.restaurant||state.title||'บิลอาหาร';
  navigator.clipboard.writeText(`[${rest}]\n${name} ยอด ${fmt(amount)}\nโอนมาที่ PromptPay: ${pp}`).then(()=>showToast('คัดลอกแล้ว ✓')).catch(()=>showToast('คัดลอกไม่ได้'));
}

// ===== PROMPTPAY EMV =====
function ppPayload(id,amount){
  const clean=id.replace(/\D/g,'');
  const target=clean.length===10&&clean.startsWith('0')?'0066'+clean.slice(1):clean;
  const tlv=(t,v)=>t+v.length.toString().padStart(2,'0')+v;
  const crc=(s)=>{let c=0xFFFF;for(let i=0;i<s.length;i++){c^=s.charCodeAt(i)<<8;for(let j=0;j<8;j++)c=(c&0x8000)?(c<<1)^0x1021:c<<1;}return((c&0xFFFF)>>>0).toString(16).toUpperCase().padStart(4,'0');};
  const ma=tlv('29',tlv('00','A000000677010111')+tlv('01',target));
  const amt=amount>0?amount.toFixed(2):'';
  const p=tlv('00','01')+ma+tlv('53','764')+(amt?tlv('54',amt):'')+tlv('58','TH')+'6304';
  return p+crc(p);
}

// ===== EXPORT =====
function renderExport(){
  const{total}=calcTotals();
  document.getElementById('export-restaurant-name').textContent=state.restaurant||'ไม่ระบุร้าน';
  document.getElementById('export-bill-title').textContent=state.title||'—';
  document.getElementById('export-total').textContent=fmt(total);
  const now=new Date();
  document.getElementById('export-date').textContent=now.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'})+' · '+now.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
}
function buildCSV(){
  const{sub,vat,sc,total,pt}=calcTotals();
  const rows=[['Thai Bill Splitter — '+(state.restaurant||state.title||'บิล')],[''],['รายการ','ราคา','คนที่แชร์','ราคาต่อคน']];
  state.items.forEach(it=>{const pr=parseFloat(it.price)||0;const nm=it.assignedTo.map(pid=>state.people.find(p=>p.id===pid)?.name||'').filter(Boolean).join(', ');rows.push([it.name||'ไม่ระบุ',pr.toFixed(2),nm,it.assignedTo.length>0?(pr/it.assignedTo.length).toFixed(2):'']);});
  rows.push([''],['ยอดรวม',sub.toFixed(2)]);
  if(state.vat)rows.push(['VAT 7%',vat.toFixed(2)]);if(state.sc)rows.push(['Service Charge 10%',sc.toFixed(2)]);
  rows.push(['Grand Total',total.toFixed(2)],[''],['ชื่อ','ยอดที่ต้องจ่าย']);
  state.people.forEach(p=>{const d=pt[p.id]||{total:0};rows.push([p.name,d.total.toFixed(2)]);});
  return rows.map(r=>r.map(c=>'"'+(String(c).replace(/"/g,'""'))+'"').join(',')).join('\n');
}
function exportCSV(){
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+buildCSV()],{type:'text/csv;charset=utf-8'}));a.download='bill-splitter.csv';a.click();
  gtag('event','export',{format:'csv'});showToast('ดาวน์โหลด CSV แล้ว ✓');
}
function exportExcel(){
  const{sub,vat,sc,total,pt}=calcTotals();
  let h=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"/></head><body><table><tr><th colspan="4" style="font-size:14pt;font-weight:bold">${esc(state.restaurant||state.title||'Thai Bill Splitter')}</th></tr><tr><td></td></tr><tr><th>รายการ</th><th>ราคา (฿)</th><th>คนที่แชร์</th><th>ต่อคน (฿)</th></tr>`;
  state.items.forEach(it=>{const pr=parseFloat(it.price)||0;const nm=it.assignedTo.map(pid=>state.people.find(p=>p.id===pid)?.name||'').filter(Boolean).join(', ');h+=`<tr><td>${esc(it.name||'ไม่ระบุ')}</td><td>${pr.toFixed(2)}</td><td>${esc(nm)}</td><td>${it.assignedTo.length>0?(pr/it.assignedTo.length).toFixed(2):'-'}</td></tr>`;});
  h+=`<tr><td></td></tr><tr><td>ยอดรวม</td><td>${sub.toFixed(2)}</td></tr>`;
  if(state.vat)h+=`<tr><td>VAT 7%</td><td>${vat.toFixed(2)}</td></tr>`;if(state.sc)h+=`<tr><td>Service Charge 10%</td><td>${sc.toFixed(2)}</td></tr>`;
  h+=`<tr><td style="font-weight:bold">Grand Total</td><td style="font-weight:bold">${total.toFixed(2)}</td></tr><tr><td></td></tr><tr><th>ชื่อ</th><th>ยอดที่ต้องจ่าย (฿)</th></tr>`;
  state.people.forEach(p=>{const d=pt[p.id]||{total:0};h+=`<tr><td>${esc(p.name)}</td><td>${d.total.toFixed(2)}</td></tr>`;});
  h+='</table></body></html>';
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([h],{type:'application/vnd.ms-excel;charset=utf-8'}));a.download='bill-splitter.xls';a.click();gtag('event','export',{format:'excel'});showToast('ดาวน์โหลด Excel แล้ว ✓');
}

// ===== ABOUT PANEL =====
function aboutHTML(slot){
  return`<button class="about-trigger" id="abt-${slot}" onclick="toggleAbout('${slot}')">
    เกี่ยวกับเว็บนี้ <span class="about-chev" id="achev-${slot}">▾</span>
  </button>
  <div class="about-panel" id="apanel-${slot}">
    <div class="about-inner">
      <div class="about-stitle">แชร์เว็บนี้</div>
      <div class="share-row">
        <button class="share-btn share-fb" onclick="shareToFB()">f &nbsp;Facebook</button>
        <button class="share-btn share-x" onclick="shareToX()">𝕏 &nbsp;X</button>
      </div>
      <button class="share-btn share-copy" onclick="copyLink()" style="width:100%;margin-top:4px">🔗 &nbsp;คัดลอกลิงก์</button>
      <div class="about-divider"></div>
      <div class="about-stitle">ข้อกำหนดการใช้งาน</div>
      <p class="about-text">Thai Bill Splitter เป็นเครื่องมือคำนวณแบ่งบิลเพื่อความสะดวกเท่านั้น ผลลัพธ์ที่แสดงเป็นการประมาณการ ผู้ใช้งานควรตรวจสอบยอดเงินก่อนโอนทุกครั้ง ผู้พัฒนาไม่มีส่วนเกี่ยวข้องกับธุรกรรมทางการเงินใดๆ ทั้งสิ้น</p>
      <div class="about-divider"></div>
      <div class="about-stitle">นโยบายความเป็นส่วนตัว</div>
      <p class="about-text">แอปนี้ไม่เก็บข้อมูลส่วนตัวบนเซิร์ฟเวอร์ใดๆ ข้อมูลทั้งหมดอยู่ในเครื่องของคุณเท่านั้น (localStorage) และถูกลบเมื่อกด "สร้างบิลใหม่" หรือล้างแคชเบราว์เซอร์ เลข PromptPay ที่กรอกใช้สร้าง QR บนหน้าจอเท่านั้น ไม่มีการส่งข้อมูลออกไปภายนอก</p>
      <div class="about-divider"></div>
      <div class="about-stitle">ติดต่อผู้พัฒนา</div>
      <p class="about-text">พัฒนาโดย <span style="color:var(--primary);font-weight:600">tanakitto.me</span><br/>contact@tanakitto.me</p>
    </div>
  </div>`;
}
function renderAboutPanels(){
  SLOTS.forEach(s=>{const el=document.getElementById('about-'+s);if(el&&el.innerHTML==='')el.innerHTML=aboutHTML(s);});
}
function toggleAbout(slot){
  const panel=document.getElementById('apanel-'+slot);
  const chev=document.getElementById('achev-'+slot);
  const open=panel.classList.contains('open');
  panel.classList.toggle('open',!open);
  chev.classList.toggle('open',!open);
}
function shareToFB(){gtag('event','share',{method:'facebook'});window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(location.href),'_blank');}
function shareToX(){gtag('event','share',{method:'x_twitter'});window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent('หารบิลง่ายๆ ด้วย Thai Bill Splitter 🧾')+'&url='+encodeURIComponent(location.href),'_blank');}
function copyLink(){navigator.clipboard.writeText(location.href).then(()=>{gtag('event','share',{method:'copy_link'});showToast('คัดลอกลิงก์แล้ว ✓')}).catch(()=>showToast('คัดลอกไม่ได้'));}

// ===== UI =====
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200);}
function confirmReset(){
  document.getElementById('dialog-title').textContent='สร้างบิลใหม่?';
  document.getElementById('dialog-msg').textContent='ข้อมูลทั้งหมดจะถูกลบ แน่ใจหรือไม่?';
  document.getElementById('dialog-confirm').onclick=resetAll;
  document.getElementById('dialog').classList.add('show');
}
function closeDialog(){document.getElementById('dialog').classList.remove('show');}
function resetAll(){
  closeDialog();
  state={title:'',restaurant:'',people:[],items:[],vat:false,sc:false,rounding:0,promptpay:''};
  summaryUnlocked=false;
  localStorage.removeItem('thbill_v1');
  document.getElementById('bill-title').value='';
  document.getElementById('bill-restaurant').value='';
  document.getElementById('vat-toggle').checked=false;
  document.getElementById('sc-toggle').checked=false;
  SLOTS.forEach(s=>{const el=document.getElementById('about-'+s);if(el)el.innerHTML='';});
  renderPeopleChips();
  goTo('setup');
  showToast('เริ่มบิลใหม่แล้ว');
}

// ===== INIT =====
function init(){
  loadState();
  document.getElementById('bill-title').value=state.title;
  document.getElementById('bill-restaurant').value=state.restaurant;
  document.getElementById('vat-toggle').checked=state.vat;
  document.getElementById('sc-toggle').checked=state.sc;
  if(state.items.length||state.people.length) summaryUnlocked=true;
  renderPeopleChips();
  renderAboutPanels();
  ['bill-title','bill-restaurant'].forEach(id=>document.getElementById(id).addEventListener('input',saveState));
  document.getElementById('dialog').addEventListener('click',function(e){if(e.target===this)closeDialog();});
}
init();
