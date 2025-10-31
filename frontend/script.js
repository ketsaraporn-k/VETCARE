// ---------------- Load Pet History ----------------
function loadPetHistoryTabs(pets){
  const petSelect = document.getElementById('pet-select-tab');
  petSelect.innerHTML = '';
  pets.forEach(p=>{
    const opt = document.createElement('option');
    opt.value = p._id;
    opt.textContent = p.name;
    petSelect.appendChild(opt);
  });
  document.getElementById('pet-history-tabs').classList.remove('hidden');
  loadPetHistory();
}

function loadPetHistory(){
  const petId = document.getElementById('pet-select-tab').value;
  if(!petId) return;

  // ข้อมูลทั่วไป
  fetch(`${API_BASE}/pets/${petId}`,{headers:{Authorization:`Bearer ${token}`}})
  .then(res=>res.json())
  .then(pet=>{
    document.getElementById('general-info').innerHTML=
      `<h4>ข้อมูลทั่วไป</h4>
       ชื่อ: ${pet.name}<br>
       ประเภท: ${pet.type}<br>
       เพศ: ${pet.gender || '-'}<br>
       อายุ: ${pet.age || '-'} ปี`;
  });

  // ประวัติการฉีดวัคซีน
  fetch(`${API_BASE}/vaccinations?petId=${petId}`,{headers:{Authorization:`Bearer ${token}`}})
  .then(res=>res.json())
  .then(vaccinations=>{
    let html = '<h4>ประวัติการฉีดวัคซีน</h4>';
    if(vaccinations.length===0) html+='ไม่มีข้อมูล';
    else vaccinations.forEach(v=> html+=`${v.name} - ${v.date}<br>`);
    document.getElementById('vaccinations').innerHTML = html;
  });

  // ประวัติการรักษา
  fetch(`${API_BASE}/treatments?petId=${petId}`,{headers:{Authorization:`Bearer ${token}`}})
  .then(res=>res.json())
  .then(treatments=>{
    let html='<h4>ประวัติการรักษา</h4>';
    if(treatments.length===0) html+='ไม่มีข้อมูล';
    else treatments.forEach(t=> html+=`${t.type} - ${t.date}<br>`);
    document.getElementById('treatments').innerHTML=html;
  });

  // นัดหมาย / Booking
  fetch(`${API_BASE}/appointments/mine?petId=${petId}`,{headers:{Authorization:`Bearer ${token}`}})
  .then(res=>res.json())
  .then(apps=>{
    let html='<h4>การนัดหมาย</h4>';
    if(apps.length===0) html+='ไม่มีข้อมูล';
    else apps.forEach(a=> html+=`${a.date} - ${a.type || '-'}<br>`);
    document.getElementById('appointments').innerHTML = html;
  });
}

// เรียกเมื่อโหลด pets
function loadPets(){
  fetch(`${API_BASE}/pets/mine`,{headers:{Authorization:`Bearer ${token}`}})
  .then(res=>res.json()).then(pets=>{
    const list=document.getElementById('pet-list'); list.innerHTML='';
    const bookingSelect=document.getElementById('booking-pet'); bookingSelect.innerHTML='';
    pets.forEach(p=>{
      const li=document.createElement('li'); li.textContent=`${p.name} (${p.type})`; list.appendChild(li);
      const opt=document.createElement('option'); opt.value=p._id; opt.textContent=p.name; bookingSelect.appendChild(opt);
    });
    // เรียกฟังก์ชันแท็บประวัติสัตว์
    loadPetHistoryTabs(pets);
  });
}
