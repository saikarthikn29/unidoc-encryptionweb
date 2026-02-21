/* ===================================================================
   UniDoc PDF Watermark Tool – watermark.js
   Interactive drag-and-resize preview, text & image watermarks
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // ── Lazy pdf-lib access ──
  function getPDFLib() {
    if (typeof PDFLib === 'undefined') throw new Error('PDF library not loaded yet. Please wait and try again.');
    return PDFLib;
  }

  // ── DOM Refs ──
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Steps
  const stepPanels = {
    1: $('#step1'), 2: $('#step2'), 3: $('#step3'),
    4: $('#step4'), 5: $('#step5')
  };
  const wizSteps = $$('.wiz-step');
  const errorPanel = $('#errorPanel');

  // Step 1
  const pdfDropZone  = $('#pdfDropZone');
  const pdfFileInput = $('#pdfFileInput');
  const pdfFileInfo  = $('#pdfFileInfo');
  const pdfFileName  = $('#pdfFileName');
  const pdfFileSize  = $('#pdfFileSize');
  const pdfRemoveBtn = $('#pdfFileRemove');
  const step1Next    = $('#step1Next');

  // Step 2
  const chooseText  = $('#chooseText');
  const chooseImage = $('#chooseImage');

  // Step 3 – text
  const textConfig    = $('#textConfig');
  const imageConfig   = $('#imageConfig');
  const watermarkText = $('#watermarkText');
  const fontSize      = $('#fontSize');
  const textColor     = $('#textColor');
  const colorLabel    = $('#colorLabel');
  const textOpacity   = $('#textOpacity');
  const opacityValue  = $('#opacityValue');
  const textRotation  = $('#textRotation');
  const rotationValue = $('#rotationValue');
  const repeatWm      = $('#repeatWatermark');

  // Step 3 – image
  const imgDropZone    = $('#imgDropZone');
  const imgFileInput   = $('#imgFileInput');
  const imgPreviewStrip = $('#imgPreviewStrip');
  const imgPreviewThumb = $('#imgPreviewThumb');
  const imgPreviewName  = $('#imgPreviewName');
  const imgRemoveBtn    = $('#imgRemoveBtn');
  const imgOpacity      = $('#imgOpacity');
  const imgOpacityValue = $('#imgOpacityValue');
  const imgRotation     = $('#imgRotation');
  const imgRotationValue = $('#imgRotationValue');

  // Page selection
  const pageSelection = $('#pageSelection');
  const customPages   = $('#customPages');

  // Step 4 – Preview
  const previewCanvas    = $('#previewCanvas');
  const previewContainer = $('#previewContainer');
  const wmOverlay        = $('#wmOverlay');
  const wmContent        = $('#wmContent');
  const wmResizeHandle   = $('#wmResizeHandle');
  const progressSection  = $('#progressSection');
  const progressFill     = $('#progressFill');
  const progressPercent  = $('#progressPercent');
  const progressStatus   = $('#progressStatus');

  // Nav buttons
  const step2Back = $('#step2Back');
  const step3Back = $('#step3Back');
  const step3Next = $('#step3Next');
  const step4Back = $('#step4Back');
  const applyBtn  = $('#applyWatermarkBtn');

  // Step 5
  const downloadBtn  = $('#downloadBtn');
  const startOverBtn = $('#startOverBtn');
  const retryBtn     = $('#retryBtn');

  // Contact
  const contactForm    = $('#contactForm');
  const contactSuccess = $('#contactSuccess');
  const sendAnotherBtn = $('#sendAnotherBtn');

  // Toast
  const toast        = $('#toast');
  const toastMessage = $('#toastMessage');

  // ── State ──
  let currentStep    = 1;
  let pdfFile        = null;
  let pdfBytes       = null;
  let watermarkType  = 'text'; // 'text' | 'image'
  let watermarkImage = null;   // Image element for image watermarks
  let watermarkImgBytes = null;
  let resultPdfBytes = null;
  let pageCount      = 0;

  // Preview state
  let canvasPageWidth  = 0;
  let canvasPageHeight = 0;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  PARTICLES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function createParticles() {
    const container = $('#particles');
    if (!container) return;
    const count = window.innerWidth < 768 ? 20 : 40;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = (Math.random() * 20 + 10) + 's';
      p.style.animationDelay = (Math.random() * 20) + 's';
      p.style.width = p.style.height = (Math.random() * 3 + 1) + 'px';
      container.appendChild(p);
    }
  }
  createParticles();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  NAV / MOBILE MENU
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const navToggle  = $('#navToggle');
  const mobileMenu = $('#mobileMenu');
  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', () => mobileMenu.classList.toggle('open'));
    $$('.mobile-link').forEach(l => l.addEventListener('click', () => mobileMenu.classList.remove('open')));
  }

  // Scroll spy
  const navLinks = $$('.nav-link');
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY + 120;
    sections.forEach(sec => {
      const top = sec.offsetTop;
      const h   = sec.offsetHeight;
      const id  = sec.getAttribute('id');
      if (scrollY >= top && scrollY < top + h) {
        navLinks.forEach(l => {
          l.classList.remove('active');
          if (l.getAttribute('href') === '#' + id) l.classList.add('active');
        });
      }
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  TOAST
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function showToast(msg, duration = 3000) {
    toastMessage.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  WIZARD NAVIGATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function goToStep(n) {
    // Hide all panels
    Object.values(stepPanels).forEach(p => p.classList.remove('active'));
    errorPanel.style.display = 'none';

    // Show target panel
    if (stepPanels[n]) {
      stepPanels[n].classList.add('active');
    }
    currentStep = n;

    // Update wizard step indicators
    wizSteps.forEach(ws => {
      const s = parseInt(ws.dataset.step);
      ws.classList.remove('active', 'done');
      if (s < n) ws.classList.add('done');
      if (s === n) ws.classList.add('active');
    });

    // If going to step 4, render preview
    if (n === 4) renderPreview();
  }

  function showError(msg) {
    Object.values(stepPanels).forEach(p => p.classList.remove('active'));
    errorPanel.style.display = '';
    errorPanel.querySelector('.active')?.classList.remove('active');
    errorPanel.classList.add('active');
    $('#errorMessage').textContent = msg;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  STEP 1: PDF FILE SELECTION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function handlePDFFile(file) {
    if (!file) return;
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Please select a PDF file.'); return;
    }
    if (file.size > 500 * 1024 * 1024) {
      showToast('File exceeds 500 MB limit.'); return;
    }
    pdfFile = file;
    pdfFileName.textContent = file.name;
    pdfFileSize.textContent = formatSize(file.size);
    pdfDropZone.style.display = 'none';
    pdfFileInfo.style.display = 'flex';
    step1Next.style.display = '';

    // Read bytes
    const reader = new FileReader();
    reader.onload = (e) => { pdfBytes = new Uint8Array(e.target.result); };
    reader.readAsArrayBuffer(file);
  }

  // Drop zone click
  pdfDropZone.addEventListener('click', (e) => {
    if (e.target === pdfFileInput) return;
    pdfFileInput.click();
  });
  pdfFileInput.addEventListener('change', () => {
    if (pdfFileInput.files[0]) handlePDFFile(pdfFileInput.files[0]);
  });

  // Drag events
  ['dragenter', 'dragover'].forEach(evt => {
    pdfDropZone.addEventListener(evt, (e) => { e.preventDefault(); pdfDropZone.classList.add('drag-over'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    pdfDropZone.addEventListener(evt, (e) => { e.preventDefault(); pdfDropZone.classList.remove('drag-over'); });
  });
  pdfDropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) handlePDFFile(file);
  });

  // Remove file
  pdfRemoveBtn.addEventListener('click', () => {
    pdfFile = null; pdfBytes = null;
    pdfDropZone.style.display = '';
    pdfFileInfo.style.display = 'none';
    step1Next.style.display = 'none';
    pdfFileInput.value = '';
  });

  // Continue
  step1Next.addEventListener('click', () => {
    if (!pdfFile) return;
    goToStep(2);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  STEP 2: TYPE SELECTION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  chooseText.addEventListener('click', () => {
    watermarkType = 'text';
    textConfig.style.display = '';
    imageConfig.style.display = 'none';
    $('#step3Title').textContent = 'Customize Text Watermark';
    goToStep(3);
  });

  chooseImage.addEventListener('click', () => {
    watermarkType = 'image';
    textConfig.style.display = 'none';
    imageConfig.style.display = '';
    $('#step3Title').textContent = 'Customize Image Watermark';
    goToStep(3);
  });

  step2Back.addEventListener('click', () => goToStep(1));

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  STEP 3: CUSTOMIZE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // Text controls
  textColor.addEventListener('input', () => { colorLabel.textContent = textColor.value; });
  textOpacity.addEventListener('input', () => { opacityValue.textContent = Math.round(textOpacity.value * 100) + '%'; });
  textRotation.addEventListener('input', () => { rotationValue.innerHTML = textRotation.value + '&deg;'; });

  // Image controls
  imgOpacity.addEventListener('input', () => { imgOpacityValue.textContent = Math.round(imgOpacity.value * 100) + '%'; });
  imgRotation.addEventListener('input', () => { imgRotationValue.innerHTML = imgRotation.value + '&deg;'; });

  // Image drop zone
  imgDropZone.addEventListener('click', (e) => {
    if (e.target === imgFileInput) return;
    imgFileInput.click();
  });
  imgFileInput.addEventListener('change', () => {
    if (imgFileInput.files[0]) handleImageFile(imgFileInput.files[0]);
  });
  ['dragenter', 'dragover'].forEach(evt => {
    imgDropZone.addEventListener(evt, (e) => { e.preventDefault(); imgDropZone.classList.add('drag-over'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    imgDropZone.addEventListener(evt, (e) => { e.preventDefault(); imgDropZone.classList.remove('drag-over'); });
  });
  imgDropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  });

  function handleImageFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file (PNG or JPG).'); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image exceeds 10 MB limit.'); return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      watermarkImgBytes = new Uint8Array(e.target.result);
      const img = new Image();
      img.onload = () => {
        watermarkImage = img;
        imgPreviewThumb.src = img.src;
        imgPreviewName.textContent = file.name;
        imgDropZone.style.display = 'none';
        imgPreviewStrip.style.display = 'flex';
      };
      img.src = URL.createObjectURL(file);
    };
    reader.readAsArrayBuffer(file);
  }

  imgRemoveBtn.addEventListener('click', () => {
    watermarkImage = null;
    watermarkImgBytes = null;
    imgDropZone.style.display = '';
    imgPreviewStrip.style.display = 'none';
    imgFileInput.value = '';
  });

  // Page selection
  pageSelection.addEventListener('change', () => {
    customPages.style.display = pageSelection.value === 'custom' ? '' : 'none';
  });

  // Field-group selects (generic style)
  $$('.field-group select').forEach(s => {
    s.style.width = '100%';
    s.style.padding = '12px 16px';
    s.style.background = 'var(--surface-light)';
    s.style.border = '1px solid var(--border)';
    s.style.borderRadius = 'var(--radius-sm)';
    s.style.color = 'var(--text)';
    s.style.fontSize = '0.9rem';
    s.style.outline = 'none';
    s.style.cursor = 'pointer';
    s.style.appearance = 'none';
    s.style.backgroundImage = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff60' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")";
    s.style.backgroundRepeat = 'no-repeat';
    s.style.backgroundPosition = 'right 16px center';
  });

  // Nav
  step3Back.addEventListener('click', () => goToStep(2));
  step3Next.addEventListener('click', () => {
    if (watermarkType === 'text' && !watermarkText.value.trim()) {
      showToast('Please enter watermark text.'); return;
    }
    if (watermarkType === 'image' && !watermarkImage) {
      showToast('Please select a watermark image.'); return;
    }
    goToStep(4);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  STEP 4: INTERACTIVE PREVIEW
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async function renderPreview() {
    if (!pdfBytes) return;
    try {
      // Use pdf.js to render first page
      if (typeof pdfjsLib === 'undefined') {
        showToast('PDF preview library loading, please wait...');
        return;
      }
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });
      const pdfDoc = await loadingTask.promise;
      pageCount = pdfDoc.numPages;
      const page = await pdfDoc.getPage(1);

      // Scale to fit container
      const containerWidth = previewContainer.clientWidth - 20; // padding
      const viewport0 = page.getViewport({ scale: 1 });
      const scale = Math.min(containerWidth / viewport0.width, 600 / viewport0.height);
      const viewport = page.getViewport({ scale });

      previewCanvas.width = viewport.width;
      previewCanvas.height = viewport.height;
      canvasPageWidth = viewport.width;
      canvasPageHeight = viewport.height;

      const ctx = previewCanvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;

      // Set container size
      previewContainer.style.width = viewport.width + 'px';
      previewContainer.style.height = viewport.height + 'px';

      // Setup watermark overlay
      setupWatermarkOverlay();

    } catch (err) {
      console.error('Preview error:', err);
      showToast('Could not preview PDF: ' + err.message);
    }
  }

  function setupWatermarkOverlay() {
    wmOverlay.style.display = 'flex';

    if (watermarkType === 'text') {
      const text = watermarkText.value || 'WATERMARK';
      const size = parseInt(fontSize.value) || 60;
      const color = textColor.value;
      const opacity = parseFloat(textOpacity.value);
      const rotation = parseInt(textRotation.value);

      // Scale font size to canvas (approx: assume 612pt page width)
      const scaleFactor = canvasPageWidth / 612;
      const displaySize = Math.max(12, Math.round(size * scaleFactor));

      wmContent.textContent = text;
      wmContent.style.fontSize = displaySize + 'px';
      wmContent.style.color = color;
      wmContent.style.opacity = opacity;
      wmContent.style.transform = `rotate(${rotation}deg)`;
      wmContent.style.fontWeight = '700';
      wmContent.style.fontFamily = "'Inter', sans-serif";
      wmContent.style.letterSpacing = '2px';
      wmContent.style.whiteSpace = 'nowrap';
      wmContent.style.backgroundImage = '';
      wmContent.style.width = '';
      wmContent.style.height = '';
    } else {
      // Image watermark
      if (watermarkImage) {
        const opacity = parseFloat(imgOpacity.value);
        const rotation = parseInt(imgRotation.value);
        const scaleFactor = canvasPageWidth / 612;
        const imgW = Math.min(watermarkImage.naturalWidth * scaleFactor, canvasPageWidth * 0.5);
        const imgH = imgW * (watermarkImage.naturalHeight / watermarkImage.naturalWidth);

        wmContent.textContent = '';
        wmContent.style.backgroundImage = `url(${watermarkImage.src})`;
        wmContent.style.backgroundSize = 'contain';
        wmContent.style.backgroundRepeat = 'no-repeat';
        wmContent.style.backgroundPosition = 'center';
        wmContent.style.width = imgW + 'px';
        wmContent.style.height = imgH + 'px';
        wmContent.style.opacity = opacity;
        wmContent.style.transform = `rotate(${rotation}deg)`;
        wmContent.style.fontSize = '0';
        wmContent.style.color = 'transparent';
      }
    }

    // Center the overlay initially
    const oRect = wmOverlay.getBoundingClientRect();
    const wOv = wmOverlay.offsetWidth || 200;
    const hOv = wmOverlay.offsetHeight || 60;
    wmOverlay.style.left = Math.max(0, (canvasPageWidth - wOv) / 2) + 'px';
    wmOverlay.style.top = Math.max(0, (canvasPageHeight - hOv) / 2) + 'px';
  }

  // ── DRAG LOGIC ──
  let isDragging = false;
  let dragOffsetX = 0, dragOffsetY = 0;

  wmOverlay.addEventListener('mousedown', startDrag);
  wmOverlay.addEventListener('touchstart', startDrag, { passive: false });

  function startDrag(e) {
    if (e.target === wmResizeHandle) return; // let resize handle its own events
    isDragging = true;
    const pos = getEventPos(e);
    const rect = wmOverlay.getBoundingClientRect();
    const containerRect = previewContainer.getBoundingClientRect();
    dragOffsetX = pos.x - (rect.left - containerRect.left);
    dragOffsetY = pos.y - (rect.top - containerRect.top);
    wmOverlay.style.cursor = 'grabbing';
    e.preventDefault();
  }

  document.addEventListener('mousemove', onDrag);
  document.addEventListener('touchmove', onDrag, { passive: false });

  function onDrag(e) {
    if (!isDragging) return;
    e.preventDefault();
    const pos = getEventPos(e);
    const containerRect = previewContainer.getBoundingClientRect();
    let x = pos.x - dragOffsetX;
    let y = pos.y - dragOffsetY;
    // Clamp
    const owW = wmOverlay.offsetWidth;
    const owH = wmOverlay.offsetHeight;
    x = Math.max(-owW * 0.5, Math.min(x, canvasPageWidth - owW * 0.5));
    y = Math.max(-owH * 0.5, Math.min(y, canvasPageHeight - owH * 0.5));
    wmOverlay.style.left = x + 'px';
    wmOverlay.style.top = y + 'px';
  }

  document.addEventListener('mouseup', stopDrag);
  document.addEventListener('touchend', stopDrag);

  function stopDrag() {
    isDragging = false;
    wmOverlay.style.cursor = 'grab';
  }

  // ── RESIZE LOGIC ──
  let isResizing = false;
  let resizeStartX = 0, resizeStartY = 0;
  let resizeStartW = 0, resizeStartH = 0;

  wmResizeHandle.addEventListener('mousedown', startResize);
  wmResizeHandle.addEventListener('touchstart', startResize, { passive: false });

  function startResize(e) {
    isResizing = true;
    e.stopPropagation();
    e.preventDefault();
    const pos = getEventPos(e);
    resizeStartX = pos.x;
    resizeStartY = pos.y;
    resizeStartW = wmOverlay.offsetWidth;
    resizeStartH = wmOverlay.offsetHeight;
  }

  document.addEventListener('mousemove', onResize);
  document.addEventListener('touchmove', onResize, { passive: false });

  function onResize(e) {
    if (!isResizing) return;
    e.preventDefault();
    const pos = getEventPos(e);
    const dw = pos.x - resizeStartX;
    const dh = pos.y - resizeStartY;
    const newW = Math.max(40, resizeStartW + dw);
    const newH = Math.max(20, resizeStartH + dh);

    if (watermarkType === 'text') {
      // For text, scale font size proportionally
      const ratio = newW / resizeStartW;
      const baseSize = parseFloat(wmContent.style.fontSize) || 60;
      wmContent.style.fontSize = Math.max(8, baseSize * ratio / (resizeStartW / (resizeStartW))) + 'px';
      // Simply adjust by width change — recalculate from original start
      const origFontSize = parseInt(fontSize.value) || 60;
      const scaleFactor = canvasPageWidth / 612;
      const displaySize = Math.max(8, Math.round(origFontSize * scaleFactor * (newW / resizeStartW)));
      wmContent.style.fontSize = displaySize + 'px';
    } else {
      wmContent.style.width = newW + 'px';
      wmContent.style.height = newH + 'px';
    }
    // Update resize start for incremental
    // Actually keep start, delta is relative to start
  }

  document.addEventListener('mouseup', stopResize);
  document.addEventListener('touchend', stopResize);

  function stopResize() {
    isResizing = false;
  }

  function getEventPos(e) {
    if (e.touches && e.touches.length > 0) {
      const containerRect = previewContainer.getBoundingClientRect();
      return { x: e.touches[0].clientX - containerRect.left, y: e.touches[0].clientY - containerRect.top };
    }
    const containerRect = previewContainer.getBoundingClientRect();
    return { x: e.clientX - containerRect.left, y: e.clientY - containerRect.top };
  }

  // Step 4 nav
  step4Back.addEventListener('click', () => {
    wmOverlay.style.display = 'none';
    goToStep(3);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  APPLY WATERMARK
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  applyBtn.addEventListener('click', async () => {
    try {
      applyBtn.disabled = true;
      progressSection.style.display = '';
      updateProgress(0, 'Loading PDF...');

      const lib = getPDFLib();
      const pdfDoc = await lib.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();
      pageCount = pages.length;
      const selectedPages = getSelectedPages(pageCount);

      updateProgress(10, 'Preparing watermark...');

      // Get watermark position from overlay
      const overlayLeft = parseFloat(wmOverlay.style.left) || 0;
      const overlayTop  = parseFloat(wmOverlay.style.top) || 0;
      const overlayW    = wmOverlay.offsetWidth;
      const overlayH    = wmOverlay.offsetHeight;

      if (watermarkType === 'text') {
        await applyTextWatermark(pdfDoc, pages, selectedPages, overlayLeft, overlayTop, overlayW, overlayH);
      } else {
        await applyImageWatermark(pdfDoc, pages, selectedPages, overlayLeft, overlayTop, overlayW, overlayH);
      }

      updateProgress(90, 'Saving PDF...');
      resultPdfBytes = await pdfDoc.save();
      updateProgress(100, 'Done!');

      setTimeout(() => {
        progressSection.style.display = 'none';
        goToStep(5);
      }, 500);

    } catch (err) {
      console.error('Watermark error:', err);
      progressSection.style.display = 'none';
      showError('Failed to apply watermark: ' + err.message);
    } finally {
      applyBtn.disabled = false;
    }
  });

  async function applyTextWatermark(pdfDoc, pages, selectedPages, oLeft, oTop, oW, oH) {
    const lib = getPDFLib();
    const font = await pdfDoc.embedFont(lib.StandardFonts.Helvetica);
    const text = watermarkText.value.trim() || 'WATERMARK';
    const fSize = parseInt(fontSize.value) || 60;
    const color = hexToRgb(textColor.value);
    const opacity = parseFloat(textOpacity.value);
    const rotation = parseInt(textRotation.value);
    const isTiled = repeatWm.checked;

    for (let i = 0; i < pages.length; i++) {
      if (!selectedPages.includes(i)) continue;
      const page = pages[i];
      const { width: pw, height: ph } = page.getSize();

      updateProgress(10 + (i / pages.length) * 75, `Watermarking page ${i + 1} of ${pages.length}...`);

      if (isTiled) {
        // Tiled watermark
        const textW = font.widthOfTextAtSize(text, fSize);
        const gapX = textW * 1.5;
        const gapY = fSize * 3;
        for (let ty = -ph; ty < ph * 2; ty += gapY) {
          for (let tx = -pw; tx < pw * 2; tx += gapX) {
            page.drawText(text, {
              x: tx, y: ty,
              size: fSize,
              font: font,
              color: lib.rgb(color.r, color.g, color.b),
              opacity: opacity,
              rotate: lib.degrees(rotation),
            });
          }
        }
      } else {
        // Single watermark at user-positioned location
        const scaleX = pw / canvasPageWidth;
        const scaleY = ph / canvasPageHeight;
        // PDF origin is bottom-left; canvas origin is top-left
        const pdfX = oLeft * scaleX;
        const pdfY = ph - (oTop + oH) * scaleY;

        page.drawText(text, {
          x: pdfX,
          y: pdfY,
          size: fSize,
          font: font,
          color: lib.rgb(color.r, color.g, color.b),
          opacity: opacity,
          rotate: lib.degrees(rotation),
        });
      }
    }
  }

  async function applyImageWatermark(pdfDoc, pages, selectedPages, oLeft, oTop, oW, oH) {
    const lib = getPDFLib();
    if (!watermarkImgBytes) throw new Error('No watermark image selected.');

    let embeddedImg;
    // Detect PNG vs JPEG
    if (isPNG(watermarkImgBytes)) {
      embeddedImg = await pdfDoc.embedPng(watermarkImgBytes);
    } else {
      embeddedImg = await pdfDoc.embedJpg(watermarkImgBytes);
    }

    const opacity = parseFloat(imgOpacity.value);
    const rotation = parseInt(imgRotation.value);

    for (let i = 0; i < pages.length; i++) {
      if (!selectedPages.includes(i)) continue;
      const page = pages[i];
      const { width: pw, height: ph } = page.getSize();

      updateProgress(10 + (i / pages.length) * 75, `Watermarking page ${i + 1} of ${pages.length}...`);

      const scaleX = pw / canvasPageWidth;
      const scaleY = ph / canvasPageHeight;
      const imgW = oW * scaleX;
      const imgH = oH * scaleY;
      const pdfX = oLeft * scaleX;
      const pdfY = ph - (oTop + oH) * scaleY;

      page.drawImage(embeddedImg, {
        x: pdfX,
        y: pdfY,
        width: imgW,
        height: imgH,
        opacity: opacity,
        rotate: lib.degrees(rotation),
      });
    }
  }

  function isPNG(bytes) {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    return {
      r: parseInt(hex.substring(0, 2), 16) / 255,
      g: parseInt(hex.substring(2, 4), 16) / 255,
      b: parseInt(hex.substring(4, 6), 16) / 255
    };
  }

  function getSelectedPages(total) {
    const mode = pageSelection.value;
    const indices = [];
    switch (mode) {
      case 'all':   for (let i = 0; i < total; i++) indices.push(i); break;
      case 'first': indices.push(0); break;
      case 'last':  indices.push(total - 1); break;
      case 'odd':   for (let i = 0; i < total; i += 2) indices.push(i); break;
      case 'even':  for (let i = 1; i < total; i += 2) indices.push(i); break;
      case 'custom':
        const raw = customPages.value.trim();
        if (!raw) { for (let i = 0; i < total; i++) indices.push(i); break; }
        raw.split(',').forEach(part => {
          part = part.trim();
          if (part.includes('-')) {
            const [a, b] = part.split('-').map(Number);
            for (let i = a; i <= b && i <= total; i++) {
              if (i >= 1) indices.push(i - 1);
            }
          } else {
            const n = parseInt(part);
            if (n >= 1 && n <= total) indices.push(n - 1);
          }
        });
        break;
    }
    return [...new Set(indices)].sort((a, b) => a - b);
  }

  function updateProgress(pct, msg) {
    progressFill.style.width = pct + '%';
    progressPercent.textContent = Math.round(pct) + '%';
    if (msg) progressStatus.textContent = msg;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  STEP 5: DOWNLOAD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  downloadBtn.addEventListener('click', () => {
    if (!resultPdfBytes) return;
    const blob = new Blob([resultPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const name = pdfFile ? pdfFile.name.replace(/\.pdf$/i, '') + '_watermarked.pdf' : 'watermarked.pdf';
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Download started!');
  });

  startOverBtn.addEventListener('click', resetAll);
  retryBtn.addEventListener('click', () => {
    errorPanel.style.display = 'none';
    goToStep(1);
  });

  function resetAll() {
    pdfFile = null; pdfBytes = null; resultPdfBytes = null;
    watermarkImage = null; watermarkImgBytes = null;
    pageCount = 0;
    pdfDropZone.style.display = '';
    pdfFileInfo.style.display = 'none';
    step1Next.style.display = 'none';
    pdfFileInput.value = '';
    imgDropZone.style.display = '';
    imgPreviewStrip.style.display = 'none';
    imgFileInput.value = '';
    wmOverlay.style.display = 'none';
    progressSection.style.display = 'none';
    progressFill.style.width = '0%';
    goToStep(1);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  CONTACT FORM
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name    = $('#contactName').value.trim();
    const email   = $('#contactEmail').value.trim();
    const type    = $('#contactType').value;
    const message = $('#contactMessage').value.trim();
    if (!name || !email || !message) {
      showToast('Please fill all required fields.');
      return;
    }

    // Store in localStorage as a simple queue (can be sent to backend later)
    const complaints = JSON.parse(localStorage.getItem('unidoc_complaints') || '[]');
    complaints.push({
      name, email, type, message,
      timestamp: new Date().toISOString(),
      page: 'watermark'
    });
    localStorage.setItem('unidoc_complaints', JSON.stringify(complaints));

    // Also try mailto as fallback
    const subject = encodeURIComponent(`[UniDoc Watermark] ${type}: from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nType: ${type}\n\n${message}`);

    contactForm.style.display = 'none';
    contactSuccess.style.display = '';
    showToast('Message saved! Thank you for your feedback.');
  });

  sendAnotherBtn.addEventListener('click', () => {
    contactForm.reset();
    contactForm.style.display = '';
    contactSuccess.style.display = 'none';
  });

});
