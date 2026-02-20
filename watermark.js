/**
 * UniDoc Watermark — Web App Controller
 * Adds text or image watermarks to PDF files entirely client-side using pdf-lib
 */

document.addEventListener('DOMContentLoaded', () => {

  // NOTE: PDFLib is loaded lazily — only accessed when we actually process a PDF.
  // This prevents the entire script from crashing if the CDN is slow or fails.
  function getPDFLib() {
    if (typeof PDFLib === 'undefined') {
      throw new Error('PDF library not loaded yet. Please check your internet connection and reload.');
    }
    return PDFLib;
  }

  // ── Particles ──────────────────────────────────────────────
  const particlesContainer = document.getElementById('particles');
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (8 + Math.random() * 15) + 's';
    p.style.animationDelay = -(Math.random() * 15) + 's';
    p.style.width = p.style.height = (1 + Math.random() * 3) + 'px';
    p.style.background = ['rgba(124,77,255,0.3)', 'rgba(0,229,255,0.2)', 'rgba(255,64,129,0.2)'][Math.floor(Math.random() * 3)];
    particlesContainer.appendChild(p);
  }

  // ── Mobile Menu ────────────────────────────────────────────
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  navToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    navToggle.querySelector('.material-icons-round').textContent =
      mobileMenu.classList.contains('open') ? 'close' : 'menu';
  });
  document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      navToggle.querySelector('.material-icons-round').textContent = 'menu';
    });
  });

  // ── Smooth scroll active state ─────────────────────────────
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = ['watermark', 'features', 'how', 'app'];
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY + 200;
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el && scrollY >= el.offsetTop && scrollY < el.offsetTop + el.offsetHeight) {
        navLinks.forEach(l => l.classList.remove('active'));
        const active = document.querySelector(`.nav-link[href="#${id}"]`);
        if (active) active.classList.add('active');
      }
    }
  });

  // ── Toast ──────────────────────────────────────────────────
  function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toastMessage');
    msg.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
  }

  function show(el) { el.style.display = ''; }
  function hide(el) { el.style.display = 'none'; }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  // =====================================================================
  //  DOM References
  // =====================================================================

  const pdfDropZone = document.getElementById('pdfDropZone');
  const pdfFileInput = document.getElementById('pdfFileInput');
  const pdfFileInfo = document.getElementById('pdfFileInfo');
  const pdfFileName = document.getElementById('pdfFileName');
  const pdfFileSize = document.getElementById('pdfFileSize');
  const pdfFileRemove = document.getElementById('pdfFileRemove');

  const watermarkOptions = document.getElementById('watermarkOptions');
  const tabText = document.getElementById('tabText');
  const tabImage = document.getElementById('tabImage');
  const textPanel = document.getElementById('textPanel');
  const imagePanel = document.getElementById('imagePanel');

  // Text options
  const watermarkText = document.getElementById('watermarkText');
  const fontSize = document.getElementById('fontSize');
  const textColor = document.getElementById('textColor');
  const colorLabel = document.getElementById('colorLabel');
  const textOpacity = document.getElementById('textOpacity');
  const opacityValue = document.getElementById('opacityValue');
  const textRotation = document.getElementById('textRotation');
  const rotationValue = document.getElementById('rotationValue');
  const repeatWatermark = document.getElementById('repeatWatermark');

  // Image options
  const imageDropZone = document.getElementById('imageDropZone');
  const imageFileInput = document.getElementById('imageFileInput');
  const imagePreview = document.getElementById('imagePreview');
  const imagePreviewImg = document.getElementById('imagePreviewImg');
  const imageRemove = document.getElementById('imageRemove');
  const imageScale = document.getElementById('imageScale');
  const scaleValue = document.getElementById('scaleValue');
  const imageOpacity = document.getElementById('imageOpacity');
  const imageOpacityValue = document.getElementById('imageOpacityValue');
  const imageRotation = document.getElementById('imageRotation');
  const imageRotationValue = document.getElementById('imageRotationValue');

  // Page selection
  const pageSelection = document.getElementById('pageSelection');
  const customPages = document.getElementById('customPages');

  // Actions
  const applyBtn = document.getElementById('applyBtn');
  const progressSection = document.getElementById('progressSection');
  const progressStatus = document.getElementById('progressStatus');
  const progressPercent = document.getElementById('progressPercent');
  const progressFill = document.getElementById('progressFill');
  const successSection = document.getElementById('successSection');
  const downloadBtn = document.getElementById('downloadBtn');
  const startOverBtn = document.getElementById('startOverBtn');
  const errorSection = document.getElementById('errorSection');
  const errorMessage = document.getElementById('errorMessage');
  const retryBtn = document.getElementById('retryBtn');

  // State
  let selectedPdfFile = null;
  let selectedImageFile = null;
  let selectedImageBytes = null;
  let watermarkType = 'text'; // 'text' or 'image'
  let textPosition = 'center';
  let imagePosition = 'center';
  let resultBlob = null;

  // =====================================================================
  //  PDF File Selection
  // =====================================================================

  // Click on drop zone opens file picker
  pdfDropZone.addEventListener('click', (e) => {
    if (e.target === pdfFileInput) return; // avoid double trigger
    pdfFileInput.click();
  });

  ['dragenter', 'dragover'].forEach(evt => {
    pdfDropZone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); pdfDropZone.classList.add('drag-over'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    pdfDropZone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); pdfDropZone.classList.remove('drag-over'); });
  });

  pdfDropZone.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (file) handlePdfSelect(file);
  });

  pdfFileInput.addEventListener('change', () => {
    if (pdfFileInput.files[0]) handlePdfSelect(pdfFileInput.files[0]);
  });

  function handlePdfSelect(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Please select a PDF file');
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      showToast('File too large. Max 500MB.');
      return;
    }
    selectedPdfFile = file;
    pdfFileName.textContent = file.name;
    pdfFileSize.textContent = formatBytes(file.size);
    hide(pdfDropZone);
    show(pdfFileInfo);
    show(watermarkOptions);
    hide(successSection);
    hide(errorSection);
    hide(progressSection);
  }

  pdfFileRemove.addEventListener('click', resetPdf);

  function resetPdf() {
    selectedPdfFile = null;
    pdfFileInput.value = '';
    hide(pdfFileInfo);
    hide(watermarkOptions);
    hide(successSection);
    hide(errorSection);
    hide(progressSection);
    show(pdfDropZone);
  }

  // =====================================================================
  //  Tab Switching
  // =====================================================================

  tabText.addEventListener('click', () => {
    watermarkType = 'text';
    tabText.classList.add('active');
    tabImage.classList.remove('active');
    show(textPanel);
    hide(imagePanel);
  });

  tabImage.addEventListener('click', () => {
    watermarkType = 'image';
    tabImage.classList.add('active');
    tabText.classList.remove('active');
    hide(textPanel);
    show(imagePanel);
  });

  // =====================================================================
  //  Text Watermark Controls
  // =====================================================================

  textColor.addEventListener('input', () => {
    colorLabel.textContent = textColor.value;
  });

  textOpacity.addEventListener('input', () => {
    opacityValue.textContent = Math.round(textOpacity.value * 100) + '%';
  });

  textRotation.addEventListener('input', () => {
    rotationValue.textContent = textRotation.value + '°';
  });

  // Position buttons (text)
  document.querySelectorAll('.pos-btn:not(.img-pos)').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pos-btn:not(.img-pos)').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      textPosition = btn.dataset.pos;
    });
  });

  // =====================================================================
  //  Image Watermark Controls
  // =====================================================================

  // Click on image drop zone opens file picker
  imageDropZone.addEventListener('click', (e) => {
    if (e.target === imageFileInput) return;
    imageFileInput.click();
  });

  ['dragenter', 'dragover'].forEach(evt => {
    imageDropZone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); imageDropZone.classList.add('drag-over'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    imageDropZone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); imageDropZone.classList.remove('drag-over'); });
  });

  imageDropZone.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (file) handleImageSelect(file);
  });

  imageFileInput.addEventListener('change', () => {
    if (imageFileInput.files[0]) handleImageSelect(imageFileInput.files[0]);
  });

  function handleImageSelect(file) {
    if (!file.type.match(/^image\/(png|jpeg|svg\+xml)$/)) {
      showToast('Please select a PNG, JPG, or SVG image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image too large. Max 5MB.');
      return;
    }
    selectedImageFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreviewImg.src = e.target.result;
      hide(imageDropZone);
      show(imagePreview);
    };
    reader.readAsDataURL(file);

    const byteReader = new FileReader();
    byteReader.onload = (e) => {
      selectedImageBytes = new Uint8Array(e.target.result);
    };
    byteReader.readAsArrayBuffer(file);
  }

  imageRemove.addEventListener('click', () => {
    selectedImageFile = null;
    selectedImageBytes = null;
    imageFileInput.value = '';
    hide(imagePreview);
    show(imageDropZone);
  });

  imageScale.addEventListener('input', () => {
    scaleValue.textContent = imageScale.value + '%';
  });

  imageOpacity.addEventListener('input', () => {
    imageOpacityValue.textContent = Math.round(imageOpacity.value * 100) + '%';
  });

  imageRotation.addEventListener('input', () => {
    imageRotationValue.textContent = imageRotation.value + '°';
  });

  // Position buttons (image)
  document.querySelectorAll('.pos-btn.img-pos').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pos-btn.img-pos').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      imagePosition = btn.dataset.pos;
    });
  });

  // =====================================================================
  //  Page Selection
  // =====================================================================

  pageSelection.addEventListener('change', () => {
    if (pageSelection.value === 'custom') {
      show(customPages);
    } else {
      hide(customPages);
    }
  });

  function getPageIndices(totalPages) {
    const sel = pageSelection.value;
    const indices = [];

    switch (sel) {
      case 'all':
        for (let i = 0; i < totalPages; i++) indices.push(i);
        break;
      case 'first':
        indices.push(0);
        break;
      case 'last':
        indices.push(totalPages - 1);
        break;
      case 'odd':
        for (let i = 0; i < totalPages; i += 2) indices.push(i);
        break;
      case 'even':
        for (let i = 1; i < totalPages; i += 2) indices.push(i);
        break;
      case 'custom':
        const raw = customPages.value.trim();
        if (!raw) {
          for (let i = 0; i < totalPages; i++) indices.push(i);
          break;
        }
        const parts = raw.split(',');
        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed.includes('-')) {
            const [start, end] = trimmed.split('-').map(Number);
            if (!isNaN(start) && !isNaN(end)) {
              for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
                indices.push(i - 1);
              }
            }
          } else {
            const num = parseInt(trimmed);
            if (!isNaN(num) && num >= 1 && num <= totalPages) {
              indices.push(num - 1);
            }
          }
        }
        break;
    }

    return [...new Set(indices)].sort((a, b) => a - b);
  }

  // =====================================================================
  //  Hex to RGB helper
  // =====================================================================

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
  }

  // =====================================================================
  //  Position Calculator
  // =====================================================================

  function calcPosition(pos, pageWidth, pageHeight, itemWidth, itemHeight) {
    const margin = 40;
    let x, y;

    switch (pos) {
      case 'top-left':
        x = margin; y = pageHeight - margin - itemHeight; break;
      case 'top-center':
        x = (pageWidth - itemWidth) / 2; y = pageHeight - margin - itemHeight; break;
      case 'top-right':
        x = pageWidth - margin - itemWidth; y = pageHeight - margin - itemHeight; break;
      case 'center':
        x = (pageWidth - itemWidth) / 2; y = (pageHeight - itemHeight) / 2; break;
      case 'bottom-left':
        x = margin; y = margin; break;
      case 'bottom-center':
        x = (pageWidth - itemWidth) / 2; y = margin; break;
      case 'bottom-right':
        x = pageWidth - margin - itemWidth; y = margin; break;
      default:
        x = (pageWidth - itemWidth) / 2; y = (pageHeight - itemHeight) / 2;
    }

    return { x, y };
  }

  // =====================================================================
  //  Apply Watermark
  // =====================================================================

  applyBtn.addEventListener('click', async () => {
    if (!selectedPdfFile) return;

    if (watermarkType === 'text' && !watermarkText.value.trim()) {
      showToast('Please enter watermark text');
      return;
    }

    if (watermarkType === 'image' && !selectedImageBytes) {
      showToast('Please select a watermark image');
      return;
    }

    hide(watermarkOptions);
    hide(pdfFileInfo);
    hide(successSection);
    hide(errorSection);
    show(progressSection);
    updateProgress(0, 'Reading PDF...');

    try {
      const lib = getPDFLib();
      const { PDFDocument, rgb, degrees, StandardFonts } = lib;

      const pdfBytes = await selectedPdfFile.arrayBuffer();
      updateProgress(15, 'Loading PDF document...');

      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const totalPages = pages.length;
      const pageIndices = getPageIndices(totalPages);

      updateProgress(25, 'Preparing watermark...');

      if (watermarkType === 'text') {
        await applyTextWatermark(pdfDoc, pages, pageIndices, totalPages);
      } else {
        await applyImageWatermark(pdfDoc, pages, pageIndices, totalPages);
      }

      updateProgress(90, 'Saving PDF...');

      const modifiedPdfBytes = await pdfDoc.save();
      resultBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });

      updateProgress(100, 'Complete!');

      setTimeout(() => {
        hide(progressSection);
        show(successSection);
      }, 500);

    } catch (error) {
      console.error('Watermark error:', error);
      hide(progressSection);
      errorMessage.textContent = error.message || 'Could not process the PDF file.';
      show(errorSection);
    }
  });

  async function applyTextWatermark(pdfDoc, pages, pageIndices, totalPages) {
    const { rgb, degrees, StandardFonts } = getPDFLib();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const text = watermarkText.value.trim();
    const size = parseInt(fontSize.value) || 48;
    const color = hexToRgb(textColor.value);
    const opacity = parseFloat(textOpacity.value);
    const rotation = parseInt(textRotation.value) || 0;
    const isRepeated = repeatWatermark.checked;

    const textWidth = font.widthOfTextAtSize(text, size);
    const textHeight = font.heightAtSize(size);

    for (let idx = 0; idx < pageIndices.length; idx++) {
      const pageIndex = pageIndices[idx];
      const page = pages[pageIndex];
      const { width, height } = page.getSize();

      if (isRepeated) {
        // Tiled watermark
        const spacingX = textWidth + 60;
        const spacingY = textHeight + 120;
        const cos = Math.abs(Math.cos((rotation * Math.PI) / 180));
        const sin = Math.abs(Math.sin((rotation * Math.PI) / 180));
        const effectiveW = textWidth * cos + textHeight * sin;
        const effectiveH = textWidth * sin + textHeight * cos;
        const stepX = effectiveW + 80;
        const stepY = effectiveH + 100;

        for (let x = -width * 0.5; x < width * 1.5; x += stepX) {
          for (let y = -height * 0.5; y < height * 1.5; y += stepY) {
            page.drawText(text, {
              x: x,
              y: y,
              size: size,
              font: font,
              color: rgb(color.r, color.g, color.b),
              opacity: opacity,
              rotate: degrees(rotation),
            });
          }
        }
      } else {
        // Single watermark
        const pos = calcPosition(textPosition, width, height, textWidth, textHeight);
        page.drawText(text, {
          x: pos.x,
          y: pos.y,
          size: size,
          font: font,
          color: rgb(color.r, color.g, color.b),
          opacity: opacity,
          rotate: degrees(rotation),
        });
      }

      const progress = 25 + ((idx + 1) / pageIndices.length) * 60;
      updateProgress(Math.round(progress), `Processing page ${pageIndex + 1} of ${totalPages}...`);
    }
  }

  async function applyImageWatermark(pdfDoc, pages, pageIndices, totalPages) {
    const { degrees } = getPDFLib();
    let embeddedImage;
    const imageType = selectedImageFile.type;

    if (imageType === 'image/png') {
      embeddedImage = await pdfDoc.embedPng(selectedImageBytes);
    } else if (imageType === 'image/jpeg') {
      embeddedImage = await pdfDoc.embedJpg(selectedImageBytes);
    } else {
      // SVG — convert to PNG via canvas first
      const pngBytes = await svgToPng(selectedImageBytes);
      embeddedImage = await pdfDoc.embedPng(pngBytes);
    }

    const scale = parseInt(imageScale.value) / 100;
    const opacity = parseFloat(imageOpacity.value);
    const rotation = parseInt(imageRotation.value) || 0;

    const imgDims = embeddedImage.scale(1);

    for (let idx = 0; idx < pageIndices.length; idx++) {
      const pageIndex = pageIndices[idx];
      const page = pages[pageIndex];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      // Scale image relative to page width
      const targetWidth = pageWidth * scale;
      const aspectRatio = imgDims.height / imgDims.width;
      const targetHeight = targetWidth * aspectRatio;

      const pos = calcPosition(imagePosition, pageWidth, pageHeight, targetWidth, targetHeight);

      page.drawImage(embeddedImage, {
        x: pos.x,
        y: pos.y,
        width: targetWidth,
        height: targetHeight,
        opacity: opacity,
        rotate: degrees(rotation),
      });

      const progress = 25 + ((idx + 1) / pageIndices.length) * 60;
      updateProgress(Math.round(progress), `Processing page ${pageIndex + 1} of ${totalPages}...`);
    }
  }

  // SVG to PNG conversion
  function svgToPng(svgBytes) {
    return new Promise((resolve, reject) => {
      const svgStr = new TextDecoder().decode(svgBytes);
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 300;
        canvas.height = img.naturalHeight || 300;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(b => {
          URL.revokeObjectURL(url);
          const reader = new FileReader();
          reader.onload = () => resolve(new Uint8Array(reader.result));
          reader.readAsArrayBuffer(b);
        }, 'image/png');
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load SVG')); };
      img.src = url;
    });
  }

  function updateProgress(percent, status) {
    progressFill.style.width = percent + '%';
    progressPercent.textContent = percent + '%';
    if (status) progressStatus.textContent = status;
  }

  // =====================================================================
  //  Download
  // =====================================================================

  downloadBtn.addEventListener('click', () => {
    if (!resultBlob) return;
    const name = selectedPdfFile ? selectedPdfFile.name.replace(/\.pdf$/i, '') : 'document';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(resultBlob);
    a.download = `${name}_watermarked.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    showToast('Download started!');
  });

  // =====================================================================
  //  Start Over / Retry
  // =====================================================================

  startOverBtn.addEventListener('click', () => {
    resultBlob = null;
    resetPdf();
  });

  retryBtn.addEventListener('click', () => {
    hide(errorSection);
    if (selectedPdfFile) {
      show(pdfFileInfo);
      show(watermarkOptions);
    } else {
      show(pdfDropZone);
    }
  });

});
