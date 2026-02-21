/* =============================================
   UniDoc PDF Watermark – watermark.js
   Matches app flow: pdf-lib based, interactive
   rotation/scale handle, presets, tile mode
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Lazy pdf-lib ── */
  function getPDFLib() {
    if (typeof PDFLib === 'undefined') throw new Error('PDF library still loading. Please wait a moment.');
    return PDFLib;
  }

  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  /* ── DOM ── */
  const pdfSelector  = $('#pdfSelector');
  const pdfFileInput = $('#pdfFileInput');
  const pdfTitle     = $('#pdfTitle');
  const pdfSub       = $('#pdfSub');
  const pdfIconWrap  = $('#pdfIconWrap');
  const pdfTrailing  = $('#pdfTrailing');

  const modeSelector = $('#modeSelector');
  const segBtns      = $$('.seg');

  const textPanel  = $('#textPanel');
  const imagePanel = $('#imagePanel');
  const imgSelector  = $('#imgSelector');
  const imgFileInput = $('#imgFileInput');
  const imgTitle     = $('#imgTitle');
  const imgIconWrap  = $('#imgIconWrap');
  const imgIcon      = $('#imgIcon');
  const imgThumb     = $('#imgThumb');

  const chips       = $$('.chip');
  const wmTextInput = $('#wmText');
  const clearText   = $('#clearText');
  const colorBtn    = $('#colorBtn');
  const colorSwatch = $('#colorSwatch');
  const fontSizeSelect = $('#fontSizeSelect');

  const canvasArea   = $('#canvasArea');
  const wmBox        = $('#wmBox');
  const wmPreviewText = $('#wmPreviewText');
  const wmPreviewImg  = $('#wmPreviewImg');
  const wmHandle     = $('#wmHandle');
  const hintText     = $('#hintText');
  const resetBtn     = $('#resetTransform');

  const opacityRange  = $('#opacityRange');
  const opacityLabel  = $('#opacityLabel');
  const tileToggle    = $('#tileToggle');
  const spacingBlock  = $('#spacingBlock');
  const spacingRange  = $('#spacingRange');
  const spacingLabel  = $('#spacingLabel');

  const saveBtn      = $('#saveBtn');
  const saveBtnIcon  = $('#saveBtnIcon');
  const saveBtnLabel = $('#saveBtnLabel');
  const successPanel = $('#successPanel');
  const downloadBtn  = $('#downloadBtn');
  const startOverBtn = $('#startOverBtn');

  const colorModal     = $('#colorModal');
  const colorGrid      = $('#colorGrid');
  const colorCancelBtn = $('#colorCancelBtn');
  const colorSelectBtn = $('#colorSelectBtn');

  const toast    = $('#toast');
  const toastIcon = $('#toastIcon');
  const toastMsg = $('#toastMsg');

  /* ── State ── */
  let mode = 'text';
  let pdfFile = null;
  let pdfBytes = null;
  let resultBytes = null;
  let wmImageBytes = null;
  let wmImageEl = null;

  // Watermark props (matching app defaults)
  let wmColor = '#757575';
  let wmOpacity = 24;       // percentage (5-50)
  let wmRotation = -30;     // degrees
  let wmScale = 1.0;
  let wmOffset = { x: 0, y: 0 }; // relative to center
  let wmFontSize = 64;
  let wmRepeat = false;
  let wmSpacing = 140;

  // Editor drag state
  let editorSize = { w: 0, h: 0 };
  let handleStartVector = null;
  let handleStartScale = 1.0;
  let handleStartRotation = 0;

  let isProcessing = false;

  /* ━━━━━━━━━━ Particles ━━━━━━━━━━ */
  (function particles() {
    const c = $('#particles'); if (!c) return;
    const n = window.innerWidth < 768 ? 20 : 35;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = (Math.random() * 20 + 10) + 's';
      p.style.animationDelay = (Math.random() * 20) + 's';
      p.style.width = p.style.height = (Math.random() * 3 + 1) + 'px';
      c.appendChild(p);
    }
  })();

  /* ━━━━━━━━━━ Nav ━━━━━━━━━━ */
  const navToggle  = $('#navToggle');
  const mobileMenu = $('#mobileMenu');
  if (navToggle) navToggle.addEventListener('click', () => mobileMenu.classList.toggle('open'));
  $$('.mobile-link').forEach(l => l.addEventListener('click', () => mobileMenu.classList.remove('open')));

  // Scroll spy
  const navLinks = $$('.nav-link');
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    const y = window.scrollY + 120;
    sections.forEach(sec => {
      if (y >= sec.offsetTop && y < sec.offsetTop + sec.offsetHeight) {
        const id = sec.getAttribute('id');
        navLinks.forEach(l => {
          l.classList.toggle('active', l.getAttribute('href') === '#' + id);
        });
      }
    });
  });

  /* ━━━━━━━━━━ Toast ━━━━━━━━━━ */
  function showToast(msg, type = 'success') {
    toastMsg.textContent = msg;
    toastIcon.textContent = type === 'success' ? 'check_circle' : 'error';
    toastIcon.className = 'material-icons-round toast-icon ' + type;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  /* ━━━━━━━━━━ PDF Selection ━━━━━━━━━━ */
  pdfSelector.addEventListener('click', () => pdfFileInput.click());
  pdfFileInput.addEventListener('click', (e) => e.stopPropagation());

  pdfFileInput.addEventListener('change', () => {
    const f = pdfFileInput.files[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) { showToast('Please select a PDF file.', 'error'); return; }
    if (f.size > 500 * 1024 * 1024) { showToast('File exceeds 500 MB.', 'error'); return; }

    pdfFile = f;
    pdfTitle.textContent = f.name;
    pdfSub.textContent = 'Tap to change';
    pdfIconWrap.classList.add('active');
    pdfTrailing.textContent = 'check_circle';
    pdfTrailing.style.color = '#4CAF50';

    const reader = new FileReader();
    reader.onload = e => { pdfBytes = new Uint8Array(e.target.result); updateSaveBtn(); };
    reader.readAsArrayBuffer(f);
  });

  function updateSaveBtn() {
    const canSave = pdfBytes && !isProcessing &&
      (mode === 'text' ? wmTextInput.value.trim() : wmImageEl);
    saveBtn.disabled = !canSave;
  }

  /* ━━━━━━━━━━ Mode Switch ━━━━━━━━━━ */
  segBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (isProcessing) return;
      mode = btn.dataset.mode;
      segBtns.forEach(b => b.classList.toggle('active', b === btn));
      textPanel.classList.toggle('hidden', mode !== 'text');
      imagePanel.classList.toggle('hidden', mode !== 'image');
      hintText.textContent = (wmRepeat && mode === 'text')
        ? 'Drag corner handle to resize/rotate'
        : 'Drag to move \u2022 Drag corner handle to resize/rotate';
      refreshWmPreview();
      updateSaveBtn();
    });
  });

  /* ━━━━━━━━━━ Presets ━━━━━━━━━━ */
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      if (isProcessing) return;
      chips.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      wmTextInput.value = chip.dataset.text;
      wmColor = chip.dataset.color;
      wmRotation = parseInt(chip.dataset.rotation);
      wmOpacity = parseInt(chip.dataset.opacity);
      wmRepeat = chip.dataset.repeat === '1';
      tileToggle.checked = wmRepeat;
      opacityRange.value = wmOpacity;
      opacityLabel.textContent = `Opacity: ${wmOpacity}%`;
      spacingBlock.classList.toggle('hidden', !wmRepeat);
      colorSwatch.style.background = wmColor;
      hintText.textContent = wmRepeat
        ? 'Drag corner handle to resize/rotate'
        : 'Drag to move \u2022 Drag corner handle to resize/rotate';
      if (wmRepeat) wmOffset = { x: 0, y: 0 };
      refreshWmPreview();
      updateSaveBtn();
    });
  });

  /* ━━━━━━━━━━ Text Input ━━━━━━━━━━ */
  wmTextInput.addEventListener('input', () => { refreshWmPreview(); updateSaveBtn(); });
  clearText.addEventListener('click', () => {
    wmTextInput.value = '';
    chips.forEach(c => c.classList.remove('selected'));
    refreshWmPreview(); updateSaveBtn();
  });

  fontSizeSelect.addEventListener('change', () => {
    wmFontSize = parseInt(fontSizeSelect.value);
    refreshWmPreview();
  });

  /* ━━━━━━━━━━ Image Selection ━━━━━━━━━━ */
  imgSelector.addEventListener('click', () => imgFileInput.click());
  imgFileInput.addEventListener('click', (e) => e.stopPropagation());
  imgFileInput.addEventListener('change', () => {
    const f = imgFileInput.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { showToast('Please select an image file.', 'error'); return; }
    if (f.size > 10 * 1024 * 1024) { showToast('Image exceeds 10 MB.', 'error'); return; }

    const reader = new FileReader();
    reader.onload = e => {
      wmImageBytes = new Uint8Array(e.target.result);
      const img = new Image();
      img.onload = () => {
        wmImageEl = img;
        imgTitle.textContent = f.name;
        imgIcon.classList.add('hidden');
        imgThumb.src = img.src;
        imgThumb.classList.remove('hidden');
        refreshWmPreview();
        updateSaveBtn();
      };
      img.src = URL.createObjectURL(f);
    };
    reader.readAsArrayBuffer(f);
  });

  /* ━━━━━━━━━━ Color Picker ━━━━━━━━━━ */
  const COLORS = [
    '#757575','#D32F2F','#C62828','#1976D2','#0D47A1',
    '#388E3C','#2E7D32','#FF8F00','#E65100','#7B1FA2',
    '#4A148C','#00838F','#5D4037','#AD1457','#FF5252'
  ];
  let pendingColor = wmColor;

  // Build grid
  COLORS.forEach(hex => {
    const el = document.createElement('div');
    el.className = 'color-circle' + (hex === wmColor ? ' selected' : '');
    el.style.background = hex;
    el.dataset.hex = hex;
    el.addEventListener('click', () => {
      $$('.color-circle').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
      pendingColor = hex;
    });
    colorGrid.appendChild(el);
  });

  colorBtn.addEventListener('click', () => {
    pendingColor = wmColor;
    $$('.color-circle').forEach(c => c.classList.toggle('selected', c.dataset.hex === wmColor));
    colorModal.classList.remove('hidden');
  });
  colorCancelBtn.addEventListener('click', () => colorModal.classList.add('hidden'));
  colorSelectBtn.addEventListener('click', () => {
    wmColor = pendingColor;
    colorSwatch.style.background = wmColor;
    colorModal.classList.add('hidden');
    refreshWmPreview();
  });

  /* ━━━━━━━━━━ Controls ━━━━━━━━━━ */
  opacityRange.addEventListener('input', () => {
    wmOpacity = parseInt(opacityRange.value);
    opacityLabel.textContent = `Opacity: ${wmOpacity}%`;
    refreshWmPreview();
  });

  tileToggle.addEventListener('change', () => {
    wmRepeat = tileToggle.checked;
    spacingBlock.classList.toggle('hidden', !wmRepeat);
    if (wmRepeat) wmOffset = { x: 0, y: 0 };
    hintText.textContent = wmRepeat
      ? 'Drag corner handle to resize/rotate'
      : 'Drag to move \u2022 Drag corner handle to resize/rotate';
    refreshWmPreview();
  });

  spacingRange.addEventListener('input', () => {
    wmSpacing = parseInt(spacingRange.value);
    spacingLabel.textContent = `Spacing: ${wmSpacing}px`;
  });

  resetBtn.addEventListener('click', () => {
    wmRotation = -30; wmScale = 1.0; wmOffset = { x: 0, y: 0 };
    refreshWmPreview();
  });

  /* ━━━━━━━━━━ Interactive Editor ━━━━━━━━━━ */

  function refreshWmPreview() {
    const area = canvasArea.getBoundingClientRect();
    editorSize = { w: canvasArea.offsetWidth, h: canvasArea.offsetHeight };

    if (mode === 'text') {
      wmPreviewText.classList.remove('hidden');
      wmPreviewImg.classList.add('hidden');
      const text = wmTextInput.value.trim() || 'WATERMARK';
      wmPreviewText.textContent = text;
      wmPreviewText.style.color = wmColor;
      wmPreviewText.style.fontSize = (wmFontSize * 0.7) + 'px';
    } else {
      wmPreviewText.classList.add('hidden');
      if (wmImageEl) {
        wmPreviewImg.src = wmImageEl.src;
        wmPreviewImg.classList.remove('hidden');
        wmPreviewImg.style.width = (120 * wmScale) + 'px';
        wmPreviewImg.style.height = 'auto';
      } else {
        wmPreviewImg.classList.add('hidden');
      }
    }

    // Opacity (clamped for preview visibility)
    const previewOpacity = Math.max(wmOpacity / 100, 0.3);
    wmBox.style.opacity = previewOpacity;

    // Position
    const cx = editorSize.w / 2 + wmOffset.x;
    const cy = editorSize.h / 2 + wmOffset.y;
    const bw = wmBox.offsetWidth;
    const bh = wmBox.offsetHeight;

    wmBox.style.left = (cx - bw / 2) + 'px';
    wmBox.style.top = (cy - bh / 2) + 'px';
    wmBox.style.transform = `rotate(${wmRotation}deg) scale(${wmScale})`;

    // Handle position
    positionHandle(cx, cy, bw * wmScale, bh * wmScale);
  }

  function positionHandle(cx, cy, boxW, boxH) {
    const angleRad = wmRotation * Math.PI / 180;
    const hx = boxW / 2 + 12;
    const hy = -(boxH / 2 + 12);
    const rx = hx * Math.cos(angleRad) - hy * Math.sin(angleRad);
    const ry = hx * Math.sin(angleRad) + hy * Math.cos(angleRad);
    wmHandle.style.left = (cx + rx - 16) + 'px';
    wmHandle.style.top = (cy + ry - 16) + 'px';
  }

  /* ── Drag watermark (only when not tiled / image mode) ── */
  let isDragging = false;
  wmBox.addEventListener('mousedown', startDrag);
  wmBox.addEventListener('touchstart', startDrag, { passive: false });

  function startDrag(e) {
    if (isProcessing || (wmRepeat && mode === 'text')) return;
    isDragging = true;
    e.preventDefault();
  }

  document.addEventListener('mousemove', onDrag);
  document.addEventListener('touchmove', onDrag, { passive: false });

  function onDrag(e) {
    if (!isDragging) return;
    e.preventDefault();
    const delta = getMoveDelta(e);
    const maxX = editorSize.w / 2;
    const maxY = editorSize.h / 2;
    wmOffset.x = clamp(wmOffset.x + delta.dx, -maxX, maxX);
    wmOffset.y = clamp(wmOffset.y + delta.dy, -maxY, maxY);
    refreshWmPreview();
  }

  document.addEventListener('mouseup', () => isDragging = false);
  document.addEventListener('touchend', () => isDragging = false);

  let lastPos = null;
  function getMoveDelta(e) {
    const pos = getPointerPos(e);
    if (!lastPos) { lastPos = pos; return { dx: 0, dy: 0 }; }
    const d = { dx: pos.x - lastPos.x, dy: pos.y - lastPos.y };
    lastPos = pos;
    return d;
  }
  document.addEventListener('mouseup', () => lastPos = null);
  document.addEventListener('touchend', () => lastPos = null);

  /* ── Handle: Rotation + Scale ── */
  let isHandling = false;

  wmHandle.addEventListener('mousedown', startHandle);
  wmHandle.addEventListener('touchstart', startHandle, { passive: false });

  function startHandle(e) {
    if (isProcessing) return;
    isHandling = true;
    e.stopPropagation();
    e.preventDefault();
    const center = { x: editorSize.w / 2 + wmOffset.x, y: editorSize.h / 2 + wmOffset.y };
    const pos = getPointerPosRelative(e);
    handleStartVector = { x: pos.x - center.x, y: pos.y - center.y };
    handleStartScale = wmScale;
    handleStartRotation = wmRotation;
  }

  document.addEventListener('mousemove', onHandle);
  document.addEventListener('touchmove', onHandle, { passive: false });

  function onHandle(e) {
    if (!isHandling || !handleStartVector) return;
    e.preventDefault();
    const center = { x: editorSize.w / 2 + wmOffset.x, y: editorSize.h / 2 + wmOffset.y };
    const pos = getPointerPosRelative(e);
    const vec = { x: pos.x - center.x, y: pos.y - center.y };
    const startDist = Math.sqrt(handleStartVector.x ** 2 + handleStartVector.y ** 2);
    if (startDist === 0) return;
    const curDist = Math.sqrt(vec.x ** 2 + vec.y ** 2);
    const scaleDelta = curDist / startDist;
    const startAngle = Math.atan2(handleStartVector.y, handleStartVector.x);
    const curAngle = Math.atan2(vec.y, vec.x);
    const angleDelta = (curAngle - startAngle) * (180 / Math.PI);

    wmScale = clamp(handleStartScale * scaleDelta, 0.3, 3.0);
    wmRotation = handleStartRotation + angleDelta;
    refreshWmPreview();
  }

  document.addEventListener('mouseup', () => { isHandling = false; handleStartVector = null; });
  document.addEventListener('touchend', () => { isHandling = false; handleStartVector = null; });

  function getPointerPos(e) {
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  function getPointerPosRelative(e) {
    const rect = canvasArea.getBoundingClientRect();
    const raw = getPointerPos(e);
    return { x: raw.x - rect.left, y: raw.y - rect.top };
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // Initial render
  colorSwatch.style.background = wmColor;
  setTimeout(refreshWmPreview, 100);
  window.addEventListener('resize', refreshWmPreview);

  /* ━━━━━━━━━━ Apply Watermark ━━━━━━━━━━ */
  saveBtn.addEventListener('click', async () => {
    if (!pdfBytes || isProcessing) return;
    isProcessing = true;
    saveBtn.disabled = true;
    saveBtnIcon.textContent = 'hourglass_empty';
    saveBtn.classList.add('loading');
    saveBtnLabel.textContent = 'Processing...';

    try {
      const lib = getPDFLib();
      const pdfDoc = await lib.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();

      if (mode === 'text') {
        await applyTextWatermark(pdfDoc, pages, lib);
      } else {
        await applyImageWatermark(pdfDoc, pages, lib);
      }

      resultBytes = await pdfDoc.save();
      showSuccess();

    } catch (err) {
      console.error(err);
      showToast('Failed: ' + err.message, 'error');
    } finally {
      isProcessing = false;
      saveBtn.classList.remove('loading');
      saveBtnIcon.textContent = 'save';
      saveBtnLabel.textContent = 'Save Watermarked PDF';
      updateSaveBtn();
    }
  });

  async function applyTextWatermark(pdfDoc, pages, lib) {
    const font = await pdfDoc.embedFont(lib.StandardFonts.Helvetica);
    const text = wmTextInput.value.trim();
    const color = hexToRgb(wmColor);
    const opacity = wmOpacity / 100;
    const rotDeg = wmRotation;
    const fontSize = wmFontSize;

    for (const page of pages) {
      const { width: pw, height: ph } = page.getSize();

      if (wmRepeat) {
        // Tiled watermark
        const textW = font.widthOfTextAtSize(text, fontSize);
        const gapX = textW + wmSpacing;
        const gapY = fontSize * 2 + wmSpacing;
        for (let ty = -ph; ty < ph * 2; ty += gapY) {
          for (let tx = -pw; tx < pw * 2; tx += gapX) {
            page.drawText(text, {
              x: tx, y: ty, size: fontSize, font,
              color: lib.rgb(color.r, color.g, color.b),
              opacity, rotate: lib.degrees(rotDeg),
            });
          }
        }
      } else {
        // Single watermark at user position — center the text
        const scaledSize = fontSize * wmScale;
        const textW = font.widthOfTextAtSize(text, scaledSize);
        const normX = wmOffset.x / editorSize.w;
        const normY = wmOffset.y / editorSize.h;
        const pdfX = pw / 2 + normX * pw - textW / 2;
        const pdfY = ph / 2 - normY * ph - scaledSize / 2;
        page.drawText(text, {
          x: pdfX, y: pdfY, size: scaledSize, font,
          color: lib.rgb(color.r, color.g, color.b),
          opacity, rotate: lib.degrees(rotDeg),
        });
      }
    }
  }

  async function applyImageWatermark(pdfDoc, pages, lib) {
    if (!wmImageBytes) throw new Error('No image selected.');
    const isPng = wmImageBytes[0] === 0x89 && wmImageBytes[1] === 0x50;
    const embedded = isPng ? await pdfDoc.embedPng(wmImageBytes) : await pdfDoc.embedJpg(wmImageBytes);
    const opacity = wmOpacity / 100;
    const rotDeg = wmRotation;

    for (const page of pages) {
      const { width: pw, height: ph } = page.getSize();
      const imgScale = wmScale * 0.3;
      const imgW = embedded.width * imgScale;
      const imgH = embedded.height * imgScale;

      if (wmRepeat) {
        const gapX = imgW + wmSpacing;
        const gapY = imgH + wmSpacing;
        for (let ty = 0; ty < ph; ty += gapY) {
          for (let tx = 0; tx < pw; tx += gapX) {
            page.drawImage(embedded, {
              x: tx, y: ty, width: imgW, height: imgH,
              opacity, rotate: lib.degrees(rotDeg),
            });
          }
        }
      } else {
        const normX = wmOffset.x / editorSize.w;
        const normY = wmOffset.y / editorSize.h;
        const pdfX = pw / 2 + normX * pw - imgW / 2;
        const pdfY = ph / 2 - normY * ph - imgH / 2;
        page.drawImage(embedded, {
          x: pdfX, y: pdfY, width: imgW, height: imgH,
          opacity, rotate: lib.degrees(rotDeg),
        });
      }
    }
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    return {
      r: parseInt(hex.substring(0, 2), 16) / 255,
      g: parseInt(hex.substring(2, 4), 16) / 255,
      b: parseInt(hex.substring(4, 6), 16) / 255,
    };
  }

  /* ━━━━━━━━━━ Success / Download ━━━━━━━━━━ */
  function showSuccess() {
    // Hide editor content, show success
    $$('.editor-card > *:not(#successPanel)').forEach(el => el.style.display = 'none');
    successPanel.classList.remove('hidden');
    showToast('Watermark saved!');
  }

  downloadBtn.addEventListener('click', () => {
    if (!resultBytes) return;
    const blob = new Blob([resultBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const name = pdfFile ? pdfFile.name.replace(/\.pdf$/i, '_watermarked.pdf') : 'watermarked.pdf';
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Download started!');
  });

  startOverBtn.addEventListener('click', () => {
    // Reset everything
    pdfFile = null; pdfBytes = null; resultBytes = null;
    wmImageBytes = null; wmImageEl = null;
    wmColor = '#757575'; wmOpacity = 24; wmRotation = -30;
    wmScale = 1.0; wmOffset = { x: 0, y: 0 };
    wmFontSize = 64; wmRepeat = false; wmSpacing = 140;

    pdfTitle.textContent = 'Select PDF file';
    pdfSub.textContent = 'Tap to choose a PDF';
    pdfIconWrap.classList.remove('active');
    pdfTrailing.textContent = 'arrow_forward_ios';
    pdfTrailing.style.color = '';
    pdfFileInput.value = '';

    imgTitle.textContent = 'Select watermark image';
    imgIcon.classList.remove('hidden');
    imgThumb.classList.add('hidden');
    imgFileInput.value = '';

    wmTextInput.value = 'CONFIDENTIAL';
    colorSwatch.style.background = '#757575';
    fontSizeSelect.value = '64';
    opacityRange.value = 24;
    opacityLabel.textContent = 'Opacity: 24%';
    tileToggle.checked = false;
    spacingBlock.classList.add('hidden');
    spacingRange.value = 140;
    spacingLabel.textContent = 'Spacing: 140px';

    chips.forEach(c => c.classList.remove('selected'));
    $$('.chip')[0].classList.add('selected');

    // Restore editor content
    $$('.editor-card > *').forEach(el => el.style.display = '');
    successPanel.classList.add('hidden');

    mode = 'text';
    segBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === 'text'));
    textPanel.classList.remove('hidden');
    imagePanel.classList.add('hidden');

    updateSaveBtn();
    refreshWmPreview();
  });

});
