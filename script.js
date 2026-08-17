// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = 'https://aatqvdqmqhnrozyyhevv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YBD9QMWb5aIkU-cVl3AElA_UUuZOmEj';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

  // Elementos específicos de fondo dinámico
  const bgFileGroup = document.getElementById('bg-file-group');
  const bgMultiInput = document.getElementById('thumb-file-bg-multi');
  const bgTrack = document.getElementById('thumbnails-bg-track');

  let items = [];
  let editingItemId = null;

  // --- 1. CONTROL DE SESIÓN Y VISIBILIDAD ADMIN ---
  async function checkAdminAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      document.body.classList.add('is-admin');
    } else {
      document.body.classList.remove('is-admin');
    }
  }

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) {
      document.body.classList.add('is-admin');
    } else {
      document.body.classList.remove('is-admin');
    }
  });

  checkAdminAuth();

  const adminAuthModal = document.getElementById('admin-auth-modal');
  const closeAdminAuthBtn = document.getElementById('close-admin-auth');
  const adminAuthForm = document.getElementById('admin-auth-form');

  window.addEventListener('keydown', async (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      if (!session) {
        if (adminAuthModal) adminAuthModal.style.display = 'flex';
      } else {
        if (confirm("¿Deseas cerrar sesión de administrador?")) {
          await supabaseClient.auth.signOut();
          location.reload();
        }
      }
    }
  });

  if (closeAdminAuthBtn) {
    closeAdminAuthBtn.addEventListener('click', () => {
      adminAuthModal.style.display = 'none';
    });
  }

  if (adminAuthForm) {
    adminAuthForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('admin-email-input').value;
      const password = document.getElementById('admin-password-input').value;

      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

      if (error) {
        alert("Acceso denegado: " + error.message);
      } else {
        adminAuthModal.style.display = 'none';
        adminAuthForm.reset();
        alert("¡Sesión iniciada con éxito!");
      }
    });
  }

  // --- 2. ESTADO DE COMISIONES ---
  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');
  const toggleCommissionBtn = document.getElementById('toggle-commission-btn');

  let isCommissionOpen = localStorage.getItem('commission_status') !== 'closed';

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
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        return;
      }
      isCommissionOpen = !isCommissionOpen;
      localStorage.setItem('commission_status', isCommissionOpen ? 'open' : 'closed');
      updateCommissionUI();
    });
  }
  updateCommissionUI();

  // --- 3. MODAL DE PRECIOS ---
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

  // --- 4. GESTIÓN DE FONDO DINÁMICO (DIAGONAL DESENFOCADO) ---
  function loadBackgroundThumbnails() {
    if (!bgTrack) return;
    
    let bgImages = JSON.parse(localStorage.getItem('dynamic_bg_thumbnails')) || [
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400",
      "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400",
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400"
    ];

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

  // --- 5. SLIDER HERO TRIPLE INTERACTIVO ---
  document.querySelectorAll('.hero-range-item').forEach(range => {
    range.addEventListener('input', (e) => {
      const sliderContainer = e.target.closest('.ba-slider');
      const val = e.target.value;
      
      const beforeLayer = sliderContainer.querySelector('.before-img');
      const sliderLine = sliderContainer.querySelector('.slider-line');
      
      if (beforeLayer) beforeLayer.style.width = `${val}%`;
      if (sliderLine) sliderLine.style.left = `${val}%`;
      
      const beforeImg = beforeLayer.querySelector('img');
      if (beforeImg) {
        beforeImg.style.width = `${sliderContainer.clientWidth}px`;
      }
    });
  });

  function loadHeroData() {
    const savedHeroList = JSON.parse(localStorage.getItem('hero_ba_data_triple')) || [];
    for (let i = 1; i <= 3; i++) {
      const itemData = savedHeroList[i - 1];
      if (itemData) {
        const beforeSrc = document.getElementById(`hero-before-img-src-${i}`);
        const afterSrc = document.getElementById(`hero-after-img-src-${i}`);
        const swText = document.getElementById(`hero-before-sw-${i}`);

        if (beforeSrc && itemData.beforeImg) beforeSrc.src = itemData.beforeImg;
        if (afterSrc && itemData.afterImg) afterSrc.src = itemData.afterImg;
        if (swText && itemData.softwareBefore) swText.textContent = itemData.softwareBefore;
      }
    }
  }
  loadHeroData();

  // --- 6. FUNCIONES DE SUPABASE ---
  async function uploadFile(file) {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { error } = await supabaseClient.storage.from('thumbnails').upload(fileName, file);
    if (error) throw error;

    const { data } = supabaseClient.storage.from('thumbnails').getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function loadItems() {
    const { data, error } = await supabaseClient
      .from('thumbnails')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener datos:', error);
      return;
    }

    items = data.map(item => ({
      id: item.id,
      title: item.title,
      category: item.category,
      softwareBefore: item.software_before,
      image: item.image_url,
      imageBefore: item.image_before,
      imageAfter: item.image_after
    }));

    renderItems();
  }

  async function deleteItem(id) {
    if (!id) return;
    const { error } = await supabaseClient.from('thumbnails').delete().eq('id', id);
    if (error) {
      alert("No se pudo eliminar la miniatura.");
    } else {
      loadItems();
    }
  }

  // --- 7. RENDERIZADO DE GALERÍA ---
  function createCardElement(item, uniqueIndex) {
    const card = document.createElement('div');
    card.className = 'portfolio-item';
    card.setAttribute('data-category', item.category);

    let mediaContent = '';
    if (item.category === 'before-after' && item.imageBefore && item.imageAfter) {
      mediaContent = `
        <div class="ba-slider">
          <div class="ba-image after-img">
            <img src="${item.imageAfter}">
            <span class="badge badge-after">AFTER</span>
            <div class="software-tag right-tag"><i class="fa-solid fa-paintbrush"></i> Photoshop</div>
          </div>
          <div class="ba-image before-img" id="card-before-${uniqueIndex}">
            <img src="${item.imageBefore}">
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
          <img src="${item.image}" alt="${item.title}">
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
      items.forEach((item, index) => {
        grid.appendChild(createCardElement(item, `all-${index}`));
      });
    }

    if (recentGrid) {
      recentGrid.innerHTML = '';
      const recentItems = items.slice(0, 4);
      recentItems.forEach((item, index) => {
        recentGrid.appendChild(createCardElement(item, `rec-${index}`));
      });
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
        if (beforeImg) {
          beforeImg.style.width = `${sliderContainer.clientWidth}px`;
        }
      });
    });

    document.querySelectorAll('.card-options-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const parentCard = btn.closest('.portfolio-item');
        const dropdown = parentCard.querySelector('.options-dropdown');
        document.querySelectorAll('.options-dropdown').forEach(d => {
          if (d !== dropdown) d.classList.remove('active');
        });
        if (dropdown) dropdown.classList.toggle('active');
      });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (confirm("¿Seguro que quieres eliminar esta miniatura?")) {
          await deleteItem(id);
        }
      });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const item = items.find(i => String(i.id) === String(id));
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

  // --- 8. PANEL DE SUBIDA ---
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
      const submitBtn = document.getElementById('submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando datos...';
      }

      const target = targetSelect.value;
      const title = document.getElementById('thumb-title').value.trim();
      const category = categorySelect.value;
      const softwareBefore = document.getElementById('thumb-software-before').value;

      try {
        if (target === 'bg-thumbnails') {
          const files = bgMultiInput ? bgMultiInput.files : [];
          if (files.length > 0) {
            let uploadedUrls = JSON.parse(localStorage.getItem('dynamic_bg_thumbnails')) || [];
            for (let i = 0; i < files.length; i++) {
              const publicUrl = await uploadFile(files[i]);
              if (publicUrl) uploadedUrls.push(publicUrl);
            }
            localStorage.setItem('dynamic_bg_thumbnails', JSON.stringify(uploadedUrls));
            loadBackgroundThumbnails();
            alert('¡Imágenes de fondo agregadas con éxito!');
          }
        } else if (target === 'hero' || category === 'before-after') {
          const fileBefore = document.getElementById('thumb-file-before').files[0];
          const fileAfter = document.getElementById('thumb-file-after').files[0];

          let urlBefore = null;
          let urlAfter = null;

          if (fileBefore) urlBefore = await uploadFile(fileBefore);
          if (fileAfter) urlAfter = await uploadFile(fileAfter);

          if (target === 'hero') {
            let currentHeroList = JSON.parse(localStorage.getItem('hero_ba_data_triple')) || [{}, {}, {}];
            currentHeroList[0] = {
              beforeImg: urlBefore || currentHeroList[0]?.beforeImg,
              afterImg: urlAfter || currentHeroList[0]?.afterImg,
              softwareBefore: softwareBefore || currentHeroList[0]?.softwareBefore
            };
            localStorage.setItem('hero_ba_data_triple', JSON.stringify(currentHeroList));
            loadHeroData();
          } else {
            const payload = { title, category, software_before: softwareBefore };
            if (urlBefore) payload.image_before = urlBefore;
            if (urlAfter) payload.image_after = urlAfter;

            if (editingItemId) {
              const { error } = await supabaseClient.from('thumbnails').update(payload).eq('id', editingItemId);
              if (error) throw error;
            } else {
              if (!urlBefore || !urlAfter) {
                alert("Selecciona las dos imágenes: Before y After.");
                if (submitBtn) {
                  submitBtn.disabled = false;
                  submitBtn.textContent = 'Guardar Cambios';
                }
                return;
              }
              const { error } = await supabaseClient.from('thumbnails').insert([payload]);
              if (error) throw error;
            }
          }

        } else {
          const fileInput = document.getElementById('thumb-file').files[0];
          let imageUrl = null;
          if (fileInput) imageUrl = await uploadFile(fileInput);

          const payload = { title, category };
          if (imageUrl) payload.image_url = imageUrl;

          if (editingItemId) {
            const { error } = await supabaseClient.from('thumbnails').update(payload).eq('id', editingItemId);
            if (error) throw error;
          } else {
            if (!imageUrl || !title) {
              alert("Completa el título y selecciona la imagen.");
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Guardar Cambios';
              }
              return;
            }
            const { error } = await supabaseClient.from('thumbnails').insert([payload]);
            if (error) throw error;
          }
        }

        editingItemId = null;
        await loadItems();
        uploadModal.style.display = 'none';
        uploadForm.reset();
        updatePanelVisibility();

      } catch (err) {
        console.error("Error al guardar:", err);
        alert("Error: " + (err.message || JSON.stringify(err)));
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Guardar Cambios';
        }
      }
    });
  }

  // --- 9. FILTROS Y EVENTOS MODALES ---
  document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const filterValue = button.getAttribute('data-filter');
      if (grid) {
        grid.querySelectorAll('.portfolio-item').forEach(item => {
          if (filterValue === 'all' || item.getAttribute('data-category') === filterValue) {
            item.style.display = 'block';
          } else {
            item.style.display = 'none';
          }
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
      if (icon) {
        if (navLinksContainer.classList.contains('active')) {
          icon.className = 'fa-solid fa-xmark';
        } else {
          icon.className = 'fa-solid fa-bars';
        }
      }
    });

    navLinksContainer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinksContainer.classList.remove('active');
        const icon = menuToggleBtn.querySelector('i');
        if (icon) icon.className = 'fa-solid fa-bars';
      });
    });
  }

  // --- GESTIÓN DE EDICIÓN DE LOS 3 SLIDERS DEL HERO ---
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

  if (closeBaModal) {
    closeBaModal.addEventListener('click', () => {
      if (baEditModal) baEditModal.style.display = 'none';
    });
  }
if (saveBaModalBtn) {
    saveBaModalBtn.addEventListener('click', async () => {
      const targetSlotId = baSlotSelect ? baSlotSelect.value : activeHeroSlot;
      const slotIndex = parseInt(targetSlotId) - 1;
      
      saveBaModalBtn.disabled = true;
      saveBaModalBtn.textContent = 'Subiendo archivos a la nube...';

      try {
        const fileBefore = baFileBeforeInput ? baFileBeforeInput.files[0] : null;
        const fileAfter = baFileAfterInput ? baFileAfterInput.files[0] : null;

        let currentHeroList = JSON.parse(localStorage.getItem('hero_ba_data_triple')) || [{}, {}, {}];
        
        let urlBefore = currentHeroList[slotIndex]?.beforeImg || '';
        let urlAfter = currentHeroList[slotIndex]?.afterImg || '';

        // Sube a Supabase Storage si seleccionaste nuevos archivos
        if (fileBefore) {
          urlBefore = await uploadFile(fileBefore);
        }
        if (fileAfter) {
          urlAfter = await uploadFile(fileAfter);
        }

        const softwareBeforeText = baLeftTagInput ? baLeftTagInput.value : 'Blender';
        const softwareAfterText = baRightTagInput ? baRightTagInput.value : 'Photoshop';

        currentHeroList[slotIndex] = {
          beforeImg: urlBefore,
          afterImg: urlAfter,
          softwareBefore: softwareBeforeText,
          softwareAfter: softwareAfterText
        };

        // Guardamos las URLs públicas en localStorage para que cualquier dispositivo las lea
        localStorage.setItem('hero_ba_data_triple', JSON.stringify(currentHeroList));

        // Actualizamos la vista previa en tiempo real
        const targetSlider = document.querySelector(`.ba-slider[data-id="${targetSlotId}"]`);
        if (targetSlider) {
          const beforeImgEl = targetSlider.querySelector('.before-img img');
          const images = targetSlider.querySelectorAll('.ba-image img');
          const afterImgEl = images.length > 1 ? images[1] : null;
          
          const leftTagEl = targetSlider.querySelector('.left-tag');
          const rightTagEl = targetSlider.querySelector('.right-tag');

          if (beforeImgEl && urlBefore) beforeImgEl.src = urlBefore;
          if (afterImgEl && urlAfter) afterImgEl.src = urlAfter;
          if (leftTagEl) leftTagEl.innerHTML = `<i class="fa-solid fa-cube"></i> ${softwareBeforeText}`;
          if (rightTagEl) rightTagEl.innerHTML = `<i class="fa-solid fa-paintbrush"></i> ${softwareAfterText}`;
        }

        if (baEditModal) baEditModal.style.display = 'none';
        alert('¡Transformación actualizada y sincronizada en la nube!');

      } catch (err) {
        console.error("Error:", err);
        alert("Hubo un error al subir los archivos: " + (err.message || err));
      } finally {
        saveBaModalBtn.disabled = false;
        saveBaModalBtn.textContent = 'Guardar Cambios';
      }
    });
  }
  
  document.addEventListener('click', (e) => {
    const deleteHeroBtn = e.target.closest('.delete-hero-btn');
    if (!deleteHeroBtn) return;

    const slotId = deleteHeroBtn.getAttribute('data-slot');
    if (!confirm(`¿Estás seguro de que deseas eliminar el contenido del Slot ${slotId}?`)) return;

    const slotIndex = parseInt(slotId) - 1;
    let currentHeroList = JSON.parse(localStorage.getItem('hero_ba_data_triple')) || [{}, {}, {}];
    
    currentHeroList[slotIndex] = { beforeImg: '', afterImg: '', softwareBefore: 'Blender', softwareAfter: 'Photoshop' };
    localStorage.setItem('hero_ba_data_triple', JSON.stringify(currentHeroList));

    const beforeImgEl = document.getElementById(`hero-before-img-src-${slotId}`);
    const afterImgEl = document.getElementById(`hero-after-img-src-${slotId}`);
    
    if (beforeImgEl) beforeImgEl.src = '';
    if (afterImgEl) afterImgEl.src = '';

    alert(`¡Contenido del Slot ${slotId} eliminado con éxito!`);
  });

});