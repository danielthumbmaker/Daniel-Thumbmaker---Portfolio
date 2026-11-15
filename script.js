import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, 
  doc, setDoc, getDoc, query, orderBy, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// 1. CREDENCIALES DE CLOUDINARY (RELLENA ESTO)
// ==========================================
const CLOUDINARY_CLOUD_NAME = "kb7isi6w"; // Reemplaza con tu nombre de nube de Cloudinary
const CLOUDINARY_UPLOAD_PRESET = "desingbyd3";

// ==========================================
// 2. CONFIGURACIÓN DE FIREBASE (TU PROYECTO)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyB-XJekXVceANgPV4ryB0dRD_GWL7uLXPs",
  authDomain: "thumbnail-portafolio-2026.firebaseapp.com",
  projectId: "thumbnail-portafolio-2026",
  storageBucket: "thumbnail-portafolio-2026.firebasestorage.app",
  messagingSenderId: "366672695616",
  appId: "1:366672695616:web:4a6e6ea5ad91dee053aaa5",
  measurementId: "G-6R4CTNHW8R"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// FUNCIÓN PARA SUBIR Y OPTIMIZAR EN CLOUDINARY
// ==========================================
async function uploadToCloudinary(file) {
  if (!file) return null;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error("Error al subir la imagen a Cloudinary. Revisa tus credenciales.");
  }

  const data = await response.json();
  // Devuelve la URL optimizada automáticamente (formato WebP y calidad auto)
  return data.secure_url.replace("/upload/", "/upload/f_auto,q_auto/");
}

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('portfolio-grid');
  const recentGrid = document.getElementById('recent-portfolio-grid');
  const uploadForm = document.getElementById('upload-form');
  const uploadModal = document.getElementById('upload-modal');
  const openUploadBtn = document.getElementById('open-upload-btn');
  const closeUploadBtn = document.getElementById('close-upload');
  
  const targetSelect = document.getElementById('target-destination');
  const categorySelect = document.getElementById('thumb-category');
  const titleGroup = document.getElementById('title-group');
  const categoryGroup = document.getElementById('category-group');
  const singleFileGroup = document.getElementById('single-file-group');
  const baFileGroup = document.getElementById('ba-file-group');

  const bgFileGroup = document.getElementById('bg-file-group');
  const bgMultiInput = document.getElementById('thumb-file-bg-multi');
  const bgTrack = document.getElementById('thumbnails-bg-track');

  let items = [];
  let editingItemId = null;
  let currentUser = null;

  // --- CONTROL DE SESIÓN ADMIN ---
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
      document.body.classList.add('is-admin');
    } else {
      document.body.classList.remove('is-admin');
    }
  });

  const adminAuthModal = document.getElementById('admin-auth-modal');
  const closeAdminAuthBtn = document.getElementById('close-admin-auth');
  const adminAuthForm = document.getElementById('admin-auth-form');

  window.addEventListener('keydown', async (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      if (!currentUser) {
        if (adminAuthModal) adminAuthModal.style.display = 'flex';
      } else {
        if (confirm("¿Deseas cerrar sesión de administrador?")) {
          await signOut(auth);
          location.reload();
        }
      }
    }
  });

  if (closeAdminAuthBtn) {
    closeAdminAuthBtn.addEventListener('click', () => adminAuthModal.style.display = 'none');
  }

  if (adminAuthForm) {
    adminAuthForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('admin-email-input').value;
      const password = document.getElementById('admin-password-input').value;

      try {
        await signInWithEmailAndPassword(auth, email, password);
        adminAuthModal.style.display = 'none';
        adminAuthForm.reset();
        alert("¡Sesión de administrador iniciada!");
      } catch (error) {
        alert("Acceso denegado: " + error.message);
      }
    });
  }

  // --- ESTADO DE COMISIONES (FIRESTORE) ---
  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');
  const toggleCommissionBtn = document.getElementById('toggle-commission-btn');
  let isCommissionOpen = true;

  async function loadCommissionStatus() {
    try {
      const docSnap = await getDoc(doc(db, "config", "commission_status"));
      if (docSnap.exists()) {
        isCommissionOpen = docSnap.data().isOpen;
        updateCommissionUI();
      }
    } catch (err) {
      console.error("Error al cargar comisiones:", err);
    }
  }

  function updateCommissionUI() {
    if (!statusBadge || !statusText) return;
    if (isCommissionOpen) {
      statusBadge.className = 'status-badge open';
      statusText.textContent = 'COMISIONES ABIERTAS';
    } else {
      statusBadge.className = 'status-badge closed';
      statusText.textContent = 'COMISIONES CERRADAS';
    }
  }

  if (toggleCommissionBtn) {
    toggleCommissionBtn.addEventListener('click', async () => {
      if (!currentUser) return;
      isCommissionOpen = !isCommissionOpen;
      updateCommissionUI();
      try {
        await setDoc(doc(db, "config", "commission_status"), { isOpen: isCommissionOpen });
      } catch (error) {
        alert("Error al actualizar comisiones: " + error.message);
        isCommissionOpen = !isCommissionOpen;
        updateCommissionUI();
      }
    });
  }
  loadCommissionStatus();

  // --- MODAL DE PRECIOS ---
  const pricingModal = document.getElementById('pricing-modal');
  const navPreciosBtn = document.getElementById('nav-precios-btn');
  const heroPreciosBtn = document.getElementById('hero-precios-btn');
  const closePricingBtn = document.getElementById('close-pricing');

  function openPricing() { if (pricingModal) pricingModal.style.display = 'flex'; }
  function closePricing() { if (pricingModal) pricingModal.style.display = 'none'; }

  if (navPreciosBtn) navPreciosBtn.addEventListener('click', (e) => { e.preventDefault(); openPricing(); });
  if (heroPreciosBtn) heroPreciosBtn.addEventListener('click', openPricing);
  if (closePricingBtn) closePricingBtn.addEventListener('click', closePricing);
  document.querySelectorAll('.close-pricing-action').forEach(btn => btn.addEventListener('click', closePricing));

  // --- FONDO DINÁMICO (FIRESTORE + CLOUDINARY) ---
  async function loadBackgroundThumbnails() {
    if (!bgTrack) return;
    let bgImages = [
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400",
      "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400",
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400"
    ];

    try {
      const docSnap = await getDoc(doc(db, "config", "bg_thumbnails"));
      if (docSnap.exists() && docSnap.data().urls?.length > 0) {
        bgImages = docSnap.data().urls;
      }
    } catch (err) {
      console.error("Error cargando fondo:", err);
    }

    bgTrack.innerHTML = '';
    const loopItems = [...bgImages, ...bgImages, ...bgImages];
    loopItems.forEach(url => {
      const img = document.createElement('img');
      img.src = url;
      img.className = 'bg-thumb-item';
      bgTrack.appendChild(img);
    });
  }
  loadBackgroundThumbnails();

  // --- SLIDERS DEL HERO (FIRESTORE) ---
  document.querySelectorAll('.hero-range-item').forEach(range => {
    range.addEventListener('input', (e) => {
      const sliderContainer = e.target.closest('.ba-slider');
      const val = e.target.value;
      const beforeLayer = sliderContainer.querySelector('.before-img');
      const sliderLine = sliderContainer.querySelector('.slider-line');
      
      if (beforeLayer) beforeLayer.style.width = `${val}%`;
      if (sliderLine) sliderLine.style.left = `${val}%`;
      
      const beforeImg = beforeLayer.querySelector('img');
      if (beforeImg) beforeImg.style.width = `${sliderContainer.clientWidth}px`;
    });
  });

  async function loadHeroData() {
    try {
      for (let i = 1; i <= 3; i++) {
        const docSnap = await getDoc(doc(db, "hero_sliders", `slot_${i}`));
        if (docSnap.exists()) {
          const item = docSnap.data();
          const beforeSrc = document.getElementById(`hero-before-img-src-${i}`);
          const afterSrc = document.getElementById(`hero-after-img-src-${i}`);
          const swText = document.getElementById(`hero-before-sw-${i}`);

          if (beforeSrc) beforeSrc.src = item.beforeImg || '';
          if (afterSrc) afterSrc.src = item.afterImg || '';
          if (swText && item.softwareBefore) {
            swText.innerHTML = `<i class="fa-solid fa-cube"></i> ${item.softwareBefore}`;
          }
        }
      }
    } catch (err) {
      console.error("Error al cargar Hero:", err);
    }
  }
  loadHeroData();

  // --- CARGAR Y BORRAR TRABAJOS (FIRESTORE) ---
  async function loadItems() {
    try {
      const q = query(collection(db, "thumbnails"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      items = [];
      querySnapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });

      renderItems();
    } catch (err) {
      console.error("Error al obtener trabajos:", err);
    }
  }

  async function deleteItem(id) {
    if (!id) return;
    try {
      await deleteDoc(doc(db, "thumbnails", id));
      await loadItems();
    } catch (err) {
      alert("No se pudo eliminar: " + err.message);
    }
  }

  // --- RENDERIZADO DE TARJETAS ---
  function createCardElement(item, uniqueIndex) {
    const card = document.createElement('div');
    card.className = 'portfolio-item';
    card.setAttribute('data-category', item.category);

    let mediaContent = '';
    if (item.category === 'before-after' && item.imageBefore && item.imageAfter) {
      mediaContent = `
        <div class="ba-slider">
          <div class="ba-image after-img">
            <img src="${item.imageAfter}" loading="lazy">
            <span class="badge badge-after">AFTER</span>
            <div class="software-tag right-tag"><i class="fa-solid fa-paintbrush"></i> Photoshop</div>
          </div>
          <div class="ba-image before-img" id="card-before-${uniqueIndex}">
            <img src="${item.imageBefore}" loading="lazy">
            <span class="badge badge-before">BEFORE</span>
            <div class="software-tag left-tag"><i class="fa-solid fa-cube"></i> ${item.softwareBefore || '3D Render'}</div>
          </div>
          <input type="range" min="0" max="100" value="50" class="slider-range card-range" data-index="${uniqueIndex}">
          <div class="slider-line" id="card-line-${uniqueIndex}"></div>
        </div>
      `;
    } else {
      mediaContent = `
        <div class="img-wrapper">
          <img src="${item.image}" alt="${item.title}" loading="lazy">
        </div>
      `;
    }

    card.innerHTML = `
      <button class="card-options-btn" data-id="${item.id}">
        <i class="fa-solid fa-ellipsis-vertical"></i>
      </button>
      <div class="options-dropdown" id="dropdown-${uniqueIndex}">
        <button class="dropdown-item edit-btn" data-id="${item.id}">
          <i class="fa-solid fa-pen"></i> Editar
        </button>
        <button class="dropdown-item delete-btn" data-id="${item.id}">
          <i class="fa-solid fa-trash"></i> Eliminar
        </button>
      </div>
      ${mediaContent}
      <div class="item-overlay">
        <h3>${item.title}</h3>
        <span class="tag">${item.category}</span>
      </div>
    `;
    return card;
  }

  function renderItems() {
    if (grid) {
      grid.innerHTML = '';
      items.forEach((item, index) => grid.appendChild(createCardElement(item, `all-${index}`)));
    }
    if (recentGrid) {
      recentGrid.innerHTML = '';
      items.slice(0, 4).forEach((item, index) => recentGrid.appendChild(createCardElement(item, `rec-${index}`)));
    }
    initCardEvents();
  }

  function initCardEvents() {
    document.querySelectorAll('.card-range').forEach(range => {
      range.addEventListener('input', (e) => {
        const sliderContainer = e.target.closest('.ba-slider');
        const val = e.target.value;
        const beforeLayer = sliderContainer.querySelector('.before-img');
        const sliderLine = sliderContainer.querySelector('.slider-line');
        if (beforeLayer) beforeLayer.style.width = `${val}%`;
        if (sliderLine) sliderLine.style.left = `${val}%`;
        const beforeImg = beforeLayer.querySelector('img');
        if (beforeImg) beforeImg.style.width = `${sliderContainer.clientWidth}px`;
      });
    });

    document.querySelectorAll('.card-options-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = btn.closest('.portfolio-item').querySelector('.options-dropdown');
        document.querySelectorAll('.options-dropdown').forEach(d => { if (d !== dropdown) d.classList.remove('active'); });
        if (dropdown) dropdown.classList.toggle('active');
      });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (confirm("¿Seguro que quieres eliminar esta miniatura?")) await deleteItem(id);
      });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const item = items.find(i => i.id === id);
        if (!item) return;

        editingItemId = item.id;
        document.getElementById('thumb-title').value = item.title || '';
        if (categorySelect) categorySelect.value = item.category || 'cartoony';
        if (targetSelect) targetSelect.value = 'portfolio';

        updatePanelVisibility();
        uploadModal.style.display = 'flex';
      });
    });

    document.querySelectorAll('.img-wrapper').forEach(wrapper => {
      wrapper.addEventListener('click', () => {
        const img = wrapper.querySelector('img').src;
        const modalImg = document.getElementById('modal-img');
        const imgModal = document.getElementById('image-modal');
        if (modalImg && imgModal) {
          modalImg.src = img;
          imgModal.style.display = 'flex';
        }
      });
    });
  }

  // --- PANEL DE SUBIDA (CLOUDINARY + FIRESTORE) ---
  function updatePanelVisibility() {
    if (!targetSelect || !categorySelect) return;
    const target = targetSelect.value;
    const category = categorySelect.value;

    if (bgFileGroup) bgFileGroup.style.display = target === 'bg-thumbnails' ? 'block' : 'none';
    if (titleGroup) titleGroup.style.display = (target === 'hero' || target === 'bg-thumbnails') ? 'none' : 'flex';
    if (categoryGroup) categoryGroup.style.display = (target === 'hero' || target === 'bg-thumbnails') ? 'none' : 'flex';
    if (singleFileGroup) singleFileGroup.style.display = (target === 'hero' || target === 'bg-thumbnails' || category === 'before-after') ? 'none' : 'block';
    if (baFileGroup) baFileGroup.style.display = (target === 'hero' || (target === 'portfolio' && category === 'before-after')) ? 'block' : 'none';
  }

  if (targetSelect) targetSelect.addEventListener('change', updatePanelVisibility);
  if (categorySelect) categorySelect.addEventListener('change', updatePanelVisibility);

  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentUser) return alert("Debes iniciar sesión como administrador.");

      const submitBtn = document.getElementById('submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Subiendo a Cloudinary...';
      }

      const target = targetSelect.value;
      const title = document.getElementById('thumb-title').value.trim();
      const category = categorySelect.value;
      const softwareBefore = document.getElementById('thumb-software-before').value;

      try {
        if (target === 'bg-thumbnails') {
          const files = bgMultiInput ? bgMultiInput.files : [];
          if (files.length > 0) {
            const docSnap = await getDoc(doc(db, "config", "bg_thumbnails"));
            let uploadedUrls = docSnap.exists() ? (docSnap.data().urls || []) : [];

            for (let i = 0; i < files.length; i++) {
              const url = await uploadToCloudinary(files[i]);
              if (url) uploadedUrls.push(url);
            }
            await setDoc(doc(db, "config", "bg_thumbnails"), { urls: uploadedUrls });
            await loadBackgroundThumbnails();
            alert('¡Imágenes de fondo subidas y sincronizadas!');
          }
        } else if (target === 'hero' || category === 'before-after') {
          const fileBefore = document.getElementById('thumb-file-before').files[0];
          const fileAfter = document.getElementById('thumb-file-after').files[0];

          const urlBefore = fileBefore ? await uploadToCloudinary(fileBefore) : null;
          const urlAfter = fileAfter ? await uploadToCloudinary(fileAfter) : null;

          if (target === 'hero') {
            const slotRef = doc(db, "hero_sliders", "slot_1");
            const existing = await getDoc(slotRef);
            const prevData = existing.exists() ? existing.data() : {};

            await setDoc(slotRef, {
              beforeImg: urlBefore || prevData.beforeImg || '',
              afterImg: urlAfter || prevData.afterImg || '',
              softwareBefore: softwareBefore || prevData.softwareBefore || 'Blender'
            });
            await loadHeroData();
          } else {
            const payload = { title, category, softwareBefore };
            if (urlBefore) payload.imageBefore = urlBefore;
            if (urlAfter) payload.imageAfter = urlAfter;

            if (editingItemId) {
              await updateDoc(doc(db, "thumbnails", editingItemId), payload);
            } else {
              if (!urlBefore || !urlAfter) {
                alert("Selecciona las dos imágenes: Before y After.");
                return;
              }
              payload.createdAt = serverTimestamp();
              await addDoc(collection(db, "thumbnails"), payload);
            }
          }
        } else {
          const fileInput = document.getElementById('thumb-file').files[0];
          const imageUrl = fileInput ? await uploadToCloudinary(fileInput) : null;

          const payload = { title, category };
          if (imageUrl) payload.image = imageUrl;

          if (editingItemId) {
            await updateDoc(doc(db, "thumbnails", editingItemId), payload);
          } else {
            if (!imageUrl || !title) {
              alert("Completa el título y selecciona la imagen.");
              return;
            }
            payload.createdAt = serverTimestamp();
            await addDoc(collection(db, "thumbnails"), payload);
          }
        }

        editingItemId = null;
        await loadItems();
        uploadModal.style.display = 'none';
        uploadForm.reset();
        updatePanelVisibility();

      } catch (err) {
        console.error("Error al guardar:", err);
        alert("Error: " + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Guardar Cambios';
        }
      }
    });
  }

  // --- FILTROS Y MODALES ---
  document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      const filterValue = button.getAttribute('data-filter');
      if (grid) {
        grid.querySelectorAll('.portfolio-item').forEach(item => {
          item.style.display = (filterValue === 'all' || item.getAttribute('data-category') === filterValue) ? 'block' : 'none';
        });
      }
    });
  });

  if (openUploadBtn) {
    openUploadBtn.addEventListener('click', () => {
      editingItemId = null;
      uploadForm.reset();
      updatePanelVisibility();
      uploadModal.style.display = 'flex';
    });
  }

  if (closeUploadBtn) closeUploadBtn.addEventListener('click', () => uploadModal.style.display = 'none');
  const closeImageBtn = document.getElementById('close-image');
  if (closeImageBtn) closeImageBtn.addEventListener('click', () => document.getElementById('image-modal').style.display = 'none');

  window.addEventListener('click', (e) => {
    document.querySelectorAll('.options-dropdown').forEach(d => d.classList.remove('active'));
    if (e.target === pricingModal) closePricing();
    if (e.target === uploadModal) uploadModal.style.display = 'none';
  });
  
  loadItems();

  // --- MENÚ RESPONSIVE MÓVIL ---
  const menuToggleBtn = document.getElementById('menu-toggle-btn');
  const navLinksContainer = document.querySelector('.nav-links');

  if (menuToggleBtn && navLinksContainer) {
    menuToggleBtn.addEventListener('click', () => {
      navLinksContainer.classList.toggle('active');
      const icon = menuToggleBtn.querySelector('i');
      if (icon) icon.className = navLinksContainer.classList.contains('active') ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
    });
    navLinksContainer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinksContainer.classList.remove('active');
        const icon = menuToggleBtn.querySelector('i');
        if (icon) icon.className = 'fa-solid fa-bars';
      });
    });
  }

  // --- EDICIÓN DE LOS 3 SLIDERS DEL HERO (FIRESTORE) ---
  const baEditModal = document.getElementById('ba-edit-modal');
  const closeBaModal = document.getElementById('close-ba-modal');
  const saveBaModalBtn = document.getElementById('save-ba-modal-btn');

  const baSlotSelect = document.getElementById('ba-slot-select');
  const baFileBeforeInput = document.getElementById('ba-file-before');
  const baFileAfterInput = document.getElementById('ba-file-after');
  const baLeftTagInput = document.getElementById('ba-left-tag');
  const baRightTagInput = document.getElementById('ba-right-tag');

  let activeHeroSlot = '1';

  document.addEventListener('click', (e) => {
    const editBaBtn = e.target.closest('.edit-ba-btn');
    if (editBaBtn) {
      activeHeroSlot = editBaBtn.getAttribute('data-slot');
      if (baSlotSelect) baSlotSelect.value = activeHeroSlot;
      if (baFileBeforeInput) baFileBeforeInput.value = '';
      if (baFileAfterInput) baFileAfterInput.value = '';

      const targetSlider = document.querySelector(`.ba-slider[data-id="${activeHeroSlot}"]`);
      if (targetSlider) {
        const leftTagEl = targetSlider.querySelector('.left-tag');
        const rightTagEl = targetSlider.querySelector('.right-tag');
        if (baLeftTagInput) baLeftTagInput.value = leftTagEl ? leftTagEl.textContent.trim() : '';
        if (baRightTagInput) baRightTagInput.value = rightTagEl ? rightTagEl.textContent.trim() : '';
      }
      if (baEditModal) baEditModal.style.display = 'flex';
    }
  });

  if (closeBaModal) closeBaModal.addEventListener('click', () => baEditModal.style.display = 'none');

  if (saveBaModalBtn) {
    saveBaModalBtn.addEventListener('click', async () => {
      if (!currentUser) return alert("Inicia sesión como administrador.");
      const targetSlotId = baSlotSelect ? baSlotSelect.value : activeHeroSlot;
      
      saveBaModalBtn.disabled = true;
      saveBaModalBtn.textContent = 'Subiendo a Cloudinary...';

      try {
        const fileBefore = baFileBeforeInput ? baFileBeforeInput.files[0] : null;
        const fileAfter = baFileAfterInput ? baFileAfterInput.files[0] : null;

        const slotRef = doc(db, "hero_sliders", `slot_${targetSlotId}`);
        const existing = await getDoc(slotRef);
        const prevData = existing.exists() ? existing.data() : {};

        const urlBefore = fileBefore ? await uploadToCloudinary(fileBefore) : (prevData.beforeImg || '');
        const urlAfter = fileAfter ? await uploadToCloudinary(fileAfter) : (prevData.afterImg || '');

        await setDoc(slotRef, {
          beforeImg: urlBefore,
          afterImg: urlAfter,
          softwareBefore: baLeftTagInput ? baLeftTagInput.value : 'Cinema 4D',
          softwareAfter: baRightTagInput ? baRightTagInput.value : 'Photoshop'
        });

        await loadHeroData();
        if (baEditModal) baEditModal.style.display = 'none';
        alert('¡Transformación actualizada en la nube!');
      } catch (err) {
        alert("Error al actualizar el Hero: " + err.message);
      } finally {
        saveBaModalBtn.disabled = false;
        saveBaModalBtn.textContent = 'Guardar Cambios';
      }
    });
  }
  
  document.addEventListener('click', async (e) => {
    const deleteHeroBtn = e.target.closest('.delete-hero-btn');
    if (!deleteHeroBtn || !currentUser) return;

    const slotId = deleteHeroBtn.getAttribute('data-slot');
    if (!confirm(`¿Eliminar el contenido del Slot ${slotId}?`)) return;

    try {
      await setDoc(doc(db, "hero_sliders", `slot_${slotId}`), {
        beforeImg: '',
        afterImg: '',
        softwareBefore: 'Cinema 4D',
        softwareAfter: 'Photoshop'
      });
      await loadHeroData();
      alert(`¡Slot ${slotId} limpiado!`);
    } catch (err) {
      alert("Error al limpiar slot: " + err.message);
    }
  });
});