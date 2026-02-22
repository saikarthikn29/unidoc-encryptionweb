/**
 * UniDoc Password Protect — password-protect.js
 * Handles UI interactions for the password-protect workflow.
 * Uses UniDocCrypto from crypto.js (loaded in the HTML).
 */

document.addEventListener('DOMContentLoaded', () => {

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

  // ── Smooth scroll nav active state ─────────────────────────
  const navLinks = document.querySelectorAll('.nav-link');
  const sectionIds = ['tool', 'features', 'how', 'faq'];
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY + 200;
    for (const id of sectionIds) {
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
    const msg = document.getElementById('toastMsg');
    const icon = document.getElementById('toastIcon');
    msg.textContent = message;
    icon.className = 'material-icons-round toast-icon success';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
  }

  function showErrorToast(message, duration = 4000) {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toastMsg');
    const icon = document.getElementById('toastIcon');
    msg.textContent = message;
    icon.className = 'material-icons-round toast-icon error';
    icon.textContent = 'error';
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      icon.textContent = 'check_circle';
    }, duration);
  }

  // ── Helpers ────────────────────────────────────────────────
  function show(el) { el.style.display = ''; }
  function hide(el) { el.style.display = 'none'; }

  function copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  function downloadBlob(data, filename, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 100);
  }

  // =====================================================================
  //  PASSWORD PROTECT UI
  // =====================================================================

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const fileInfo = document.getElementById('fileInfo');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');
  const fileIcon = document.getElementById('fileIcon');
  const fileRemove = document.getElementById('fileRemove');
  const passwordSection = document.getElementById('passwordSection');
  const autoPasswordToggle = document.getElementById('autoPasswordToggle');
  const passwordInput = document.getElementById('passwordInput');
  const togglePasswordVis = document.getElementById('togglePasswordVis');
  const copyPasswordBtn = document.getElementById('copyPasswordBtn');
  const strengthFill = document.getElementById('strengthFill');
  const strengthText = document.getElementById('strengthText');
  const protectBtn = document.getElementById('protectBtn');
  const progressSection = document.getElementById('progressSection');
  const progressStatus = document.getElementById('progressStatus');
  const progressPercent = document.getElementById('progressPercent');
  const progressFill = document.getElementById('progressFill');
  const successSection = document.getElementById('successSection');
  const passwordDisplay = document.getElementById('passwordDisplay');
  const passwordDisplayText = document.getElementById('passwordDisplayText');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyPassword2 = document.getElementById('copyPassword2');
  const startOverBtn = document.getElementById('startOverBtn');

  let selectedFile = null;
  let protectResult = null;

  // ── Drag & Drop ────────────────────────────────────────────
  ['dragenter', 'dragover'].forEach(evt => {
    dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.remove('drag-over'); });
  });
  dropZone.addEventListener('drop', e => {
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', e => {
    if (e.target.files.length) handleFile(e.target.files[0]);
  });

  function handleFile(file) {
    const MAX_1GB = 1024 * 1024 * 1024; // 1 GB
    if (file.size > MAX_1GB) {
      showErrorToast('File too large! Max 1 GB');
      return;
    }
    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = UniDocCrypto.formatBytes(file.size);
    const ext = UniDocCrypto.getExtension(file.name);
    fileIcon.textContent = UniDocCrypto.getFileIcon(ext);
    hide(dropZone);
    show(fileInfo);
    show(passwordSection);
    updateAutoPassword();
    validateProtect();
  }

  // ── Remove file ────────────────────────────────────────────
  fileRemove.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    hide(fileInfo);
    hide(passwordSection);
    show(dropZone);
    protectBtn.disabled = true;
  });

  // ── Auto-password toggle ───────────────────────────────────
  autoPasswordToggle.addEventListener('change', () => {
    updateAutoPassword();
    validateProtect();
  });

  function updateAutoPassword() {
    if (autoPasswordToggle.checked) {
      const pw = UniDocCrypto.generateStrongPassword(32);
      passwordInput.value = pw;
      passwordInput.readOnly = true;
      passwordInput.type = 'text';
      show(copyPasswordBtn);
      togglePasswordVis.querySelector('.material-icons-round').textContent = 'visibility';
    } else {
      passwordInput.value = '';
      passwordInput.readOnly = false;
      passwordInput.type = 'password';
      hide(copyPasswordBtn);
      togglePasswordVis.querySelector('.material-icons-round').textContent = 'visibility_off';
    }
    updatePasswordStrength();
  }

  // ── Toggle password visibility ─────────────────────────────
  togglePasswordVis.addEventListener('click', () => {
    if (autoPasswordToggle.checked) return; // auto-generated always visible
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePasswordVis.querySelector('.material-icons-round').textContent = isPassword ? 'visibility' : 'visibility_off';
  });

  // ── Copy password ──────────────────────────────────────────
  copyPasswordBtn.addEventListener('click', () => {
    copyToClipboard(passwordInput.value);
    showToast('Password copied to clipboard!');
  });

  // ── Password strength ──────────────────────────────────────
  passwordInput.addEventListener('input', () => {
    updatePasswordStrength();
    validateProtect();
  });

  function updatePasswordStrength() {
    const pw = passwordInput.value;
    const strength = UniDocCrypto.evaluatePasswordStrength(pw);
    strengthFill.style.width = (strength.percent || 0) + '%';
    strengthFill.style.background = strength.color || 'transparent';
    strengthText.textContent = strength.label || '';
    strengthText.style.color = strength.color || '';
  }

  function validateProtect() {
    const valid = selectedFile && passwordInput.value.length >= UniDocCrypto.MIN_PASSWORD_LENGTH;
    protectBtn.disabled = !valid;
  }

  // ── Protect (Encrypt) Action ───────────────────────────────
  protectBtn.addEventListener('click', async () => {
    if (!selectedFile || protectBtn.disabled) return;

    hide(passwordSection);
    hide(fileInfo);
    show(progressSection);

    try {
      protectResult = await UniDocCrypto.encryptFile(
        selectedFile,
        passwordInput.value,
        { expiryHours: 0 },
        (percent, status) => {
          progressFill.style.width = percent + '%';
          progressPercent.textContent = percent + '%';
          progressStatus.textContent = status;
        }
      );

      hide(progressSection);
      show(successSection);

      // Show generated password
      passwordDisplayText.textContent = protectResult.password;
      show(passwordDisplay);
    } catch (err) {
      hide(progressSection);
      show(fileInfo);
      show(passwordSection);
      showErrorToast('Protection failed: ' + err.message);
    }
  });

  // ── Download protected file ────────────────────────────────
  downloadBtn.addEventListener('click', () => {
    if (!protectResult) return;
    downloadBlob(protectResult.ufencData, protectResult.fileName, 'application/octet-stream');
    showToast('Protected file downloaded!');
  });

  // ── Copy password from success ─────────────────────────────
  copyPassword2.addEventListener('click', () => {
    if (!protectResult) return;
    copyToClipboard(protectResult.password);
    showToast('Password copied to clipboard!');
  });

  // ── Start Over ─────────────────────────────────────────────
  startOverBtn.addEventListener('click', () => {
    resetAll();
  });

  function resetAll() {
    selectedFile = null;
    protectResult = null;
    fileInput.value = '';
    passwordInput.value = '';
    autoPasswordToggle.checked = true;
    hide(fileInfo);
    hide(passwordSection);
    hide(progressSection);
    hide(successSection);
    hide(passwordDisplay);
    show(dropZone);
    progressFill.style.width = '0%';
    protectBtn.disabled = true;
  }

});
