/**
 * UniDoc Encrypt — Web App Controller
 * Handles UI interactions for encrypt/decrypt workflow
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

  // ── Smooth scroll for nav active state ─────────────────────
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = ['encrypt', 'decrypt', 'features', 'app'];
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

  // ── Helper: show/hide elements ─────────────────────────────
  function show(el) { el.style.display = ''; }
  function hide(el) { el.style.display = 'none'; }

  // =====================================================================
  //  ENCRYPT UI
  // =====================================================================

  const encryptDropZone = document.getElementById('encryptDropZone');
  const encryptFileInput = document.getElementById('encryptFileInput');
  const encryptFileInfo = document.getElementById('encryptFileInfo');
  const encryptFileName = document.getElementById('encryptFileName');
  const encryptFileSize = document.getElementById('encryptFileSize');
  const encryptFileIcon = document.getElementById('encryptFileIcon');
  const encryptFileRemove = document.getElementById('encryptFileRemove');
  const encryptPasswordSection = document.getElementById('encryptPasswordSection');
  const autoPasswordToggle = document.getElementById('autoPasswordToggle');
  const encryptPasswordInput = document.getElementById('encryptPassword');
  const toggleEncryptPassword = document.getElementById('toggleEncryptPassword');
  const copyPasswordBtn = document.getElementById('copyPassword');
  const strengthFill = document.getElementById('strengthFill');
  const strengthText = document.getElementById('strengthText');
  const keyExpirySelect = document.getElementById('keyExpiry');
  const encryptBtn = document.getElementById('encryptBtn');
  const encryptProgress = document.getElementById('encryptProgress');
  const encryptStatus = document.getElementById('encryptStatus');
  const encryptPercent = document.getElementById('encryptPercent');
  const encryptProgressFill = document.getElementById('encryptProgressFill');
  const encryptSuccess = document.getElementById('encryptSuccess');
  const downloadEncrypted = document.getElementById('downloadEncrypted');
  const copyPassword2 = document.getElementById('copyPassword2');
  const passwordDisplay = document.getElementById('passwordDisplay');
  const passwordDisplayText = document.getElementById('passwordDisplayText');
  const changePasswordBtn = document.getElementById('changePasswordBtn');
  const encryptAnother = document.getElementById('encryptAnother');

  let selectedEncryptFile = null;
  let encryptResult = null;

  // Drag & drop
  ['dragenter', 'dragover'].forEach(evt => {
    encryptDropZone.addEventListener(evt, e => { e.preventDefault(); encryptDropZone.classList.add('drag-over'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    encryptDropZone.addEventListener(evt, e => { e.preventDefault(); encryptDropZone.classList.remove('drag-over'); });
  });
  encryptDropZone.addEventListener('drop', e => {
    if (e.dataTransfer.files.length) handleEncryptFile(e.dataTransfer.files[0]);
  });
  encryptFileInput.addEventListener('change', e => {
    if (e.target.files.length) handleEncryptFile(e.target.files[0]);
  });

  function handleEncryptFile(file) {
    if (file.size > UniDocCrypto.MAX_FILE_SIZE) {
      showToast(`File too large! Max ${UniDocCrypto.formatBytes(UniDocCrypto.MAX_FILE_SIZE)}`);
      return;
    }
    selectedEncryptFile = file;
    encryptFileName.textContent = file.name;
    encryptFileSize.textContent = UniDocCrypto.formatBytes(file.size);
    const ext = UniDocCrypto.getExtension(file.name);
    encryptFileIcon.textContent = UniDocCrypto.getFileIcon(ext);
    hide(encryptDropZone);
    show(encryptFileInfo);
    show(encryptPasswordSection);
    updateAutoPassword();
    validateEncrypt();
  }

  encryptFileRemove.addEventListener('click', () => {
    selectedEncryptFile = null;
    encryptFileInput.value = '';
    hide(encryptFileInfo);
    hide(encryptPasswordSection);
    show(encryptDropZone);
    encryptBtn.disabled = true;
  });

  // Auto-password toggle
  autoPasswordToggle.addEventListener('change', () => {
    updateAutoPassword();
    validateEncrypt();
  });

  function updateAutoPassword() {
    if (autoPasswordToggle.checked) {
      const pw = UniDocCrypto.generateStrongPassword(32);
      encryptPasswordInput.value = pw;
      encryptPasswordInput.readOnly = true;
      encryptPasswordInput.type = 'text';
      show(copyPasswordBtn);
      toggleEncryptPassword.querySelector('.material-icons-round').textContent = 'visibility';
    } else {
      encryptPasswordInput.value = '';
      encryptPasswordInput.readOnly = false;
      encryptPasswordInput.type = 'password';
      hide(copyPasswordBtn);
      toggleEncryptPassword.querySelector('.material-icons-round').textContent = 'visibility_off';
    }
    updatePasswordStrength();
  }

  // Toggle password visibility
  toggleEncryptPassword.addEventListener('click', () => {
    const isPassword = encryptPasswordInput.type === 'password';
    encryptPasswordInput.type = isPassword ? 'text' : 'password';
    toggleEncryptPassword.querySelector('.material-icons-round').textContent = isPassword ? 'visibility' : 'visibility_off';
  });

  copyPasswordBtn.addEventListener('click', () => {
    copyToClipboard(encryptPasswordInput.value);
    showToast('Password copied to clipboard!');
  });

  // Password strength
  encryptPasswordInput.addEventListener('input', () => {
    updatePasswordStrength();
    validateEncrypt();
  });

  function updatePasswordStrength() {
    const pw = encryptPasswordInput.value;
    const strength = UniDocCrypto.evaluatePasswordStrength(pw);
    strengthFill.style.width = (strength.percent || 0) + '%';
    strengthFill.style.background = strength.color || 'transparent';
    strengthText.textContent = strength.label || '';
    strengthText.style.color = strength.color || '';
  }

  function validateEncrypt() {
    const valid = selectedEncryptFile && encryptPasswordInput.value.length >= UniDocCrypto.MIN_PASSWORD_LENGTH;
    encryptBtn.disabled = !valid;
  }

  // Encrypt action
  encryptBtn.addEventListener('click', async () => {
    if (!selectedEncryptFile || encryptBtn.disabled) return;

    hide(encryptPasswordSection);
    show(encryptProgress);

    try {
      encryptResult = await UniDocCrypto.encryptFile(
        selectedEncryptFile,
        encryptPasswordInput.value,
        { expiryHours: parseInt(keyExpirySelect.value) || 0 },
        (percent, status) => {
          encryptProgressFill.style.width = percent + '%';
          encryptPercent.textContent = percent + '%';
          encryptStatus.textContent = status;
        }
      );

      hide(encryptProgress);
      show(encryptSuccess);

      // Show the password in the success view
      passwordDisplayText.textContent = encryptResult.password;
      show(passwordDisplay);
    } catch (err) {
      hide(encryptProgress);
      show(encryptPasswordSection);
      showToast('Encryption failed: ' + err.message, 5000);
    }
  });

  downloadEncrypted.addEventListener('click', () => {
    if (!encryptResult) return;
    downloadBlob(encryptResult.ufencData, encryptResult.fileName, 'application/octet-stream');
    showToast('Encrypted file downloaded!');
  });

  copyPassword2.addEventListener('click', () => {
    if (!encryptResult) return;
    copyToClipboard(encryptResult.password);
    showToast('Password copied to clipboard!');
  });

  changePasswordBtn.addEventListener('click', () => {
    if (!selectedEncryptFile && !encryptResult) return;
    // Go back to the password step so user can change it
    hide(encryptSuccess);
    hide(passwordDisplay);
    show(encryptFileInfo);
    show(encryptPasswordSection);
    // Allow editing the password
    autoPasswordToggle.checked = false;
    encryptPasswordInput.readOnly = false;
    encryptPasswordInput.type = 'text';
    hide(copyPasswordBtn);
    // Keep the current password in the field so user can modify it
    if (encryptResult) {
      encryptPasswordInput.value = encryptResult.password;
    }
    updatePasswordStrength();
    validateEncrypt();
  });

  encryptAnother.addEventListener('click', () => {
    resetEncrypt();
  });

  function resetEncrypt() {
    selectedEncryptFile = null;
    encryptResult = null;
    encryptFileInput.value = '';
    encryptPasswordInput.value = '';
    autoPasswordToggle.checked = true;
    hide(encryptFileInfo);
    hide(encryptPasswordSection);
    hide(encryptProgress);
    hide(encryptSuccess);
    hide(passwordDisplay);
    show(encryptDropZone);
    encryptProgressFill.style.width = '0%';
    encryptBtn.disabled = true;
  }

  // =====================================================================
  //  DECRYPT UI
  // =====================================================================

  const decryptDropZone = document.getElementById('decryptDropZone');
  const decryptFileInput = document.getElementById('decryptFileInput');
  const decryptFileInfo = document.getElementById('decryptFileInfo');
  const decryptFileName = document.getElementById('decryptFileName');
  const decryptFileSize = document.getElementById('decryptFileSize');
  const decryptFileRemove = document.getElementById('decryptFileRemove');
  const encryptedFileInfo = document.getElementById('encryptedFileInfo');
  const origFileName = document.getElementById('origFileName');
  const origFileSize = document.getElementById('origFileSize');
  const encryptedOn = document.getElementById('encryptedOn');
  const encAlgorithm = document.getElementById('encAlgorithm');
  const decryptPasswordSection = document.getElementById('decryptPasswordSection');
  const decryptPasswordInput = document.getElementById('decryptPassword');
  const toggleDecryptPassword = document.getElementById('toggleDecryptPassword');
  const decryptBtn = document.getElementById('decryptBtn');
  const decryptProgress = document.getElementById('decryptProgress');
  const decryptStatus = document.getElementById('decryptStatus');
  const decryptPercent = document.getElementById('decryptPercent');
  const decryptProgressFill = document.getElementById('decryptProgressFill');
  const decryptSuccess = document.getElementById('decryptSuccess');
  const downloadDecrypted = document.getElementById('downloadDecrypted');
  const decryptAnother = document.getElementById('decryptAnother');
  const decryptErrorSection = document.getElementById('decryptError');
  const errorTitle = document.getElementById('errorTitle');
  const errorMessage = document.getElementById('errorMessage');
  const retryDecrypt = document.getElementById('retryDecrypt');

  let selectedDecryptFile = null;
  let decryptedResult = null;
  let ufencBytes = null;

  // Drag & drop
  ['dragenter', 'dragover'].forEach(evt => {
    decryptDropZone.addEventListener(evt, e => { e.preventDefault(); decryptDropZone.classList.add('drag-over'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    decryptDropZone.addEventListener(evt, e => { e.preventDefault(); decryptDropZone.classList.remove('drag-over'); });
  });
  decryptDropZone.addEventListener('drop', e => {
    if (e.dataTransfer.files.length) handleDecryptFile(e.dataTransfer.files[0]);
  });
  decryptFileInput.addEventListener('change', e => {
    if (e.target.files.length) handleDecryptFile(e.target.files[0]);
  });

  async function handleDecryptFile(file) {
    selectedDecryptFile = file;
    decryptFileName.textContent = file.name;
    decryptFileSize.textContent = UniDocCrypto.formatBytes(file.size);

    hide(decryptDropZone);
    show(decryptFileInfo);

    // Read and parse header
    ufencBytes = new Uint8Array(await file.arrayBuffer());
    const header = UniDocCrypto.parseHeader(ufencBytes);

    if (!header) {
      showToast('Invalid .ufenc file format', 4000);
      resetDecrypt();
      return;
    }

    // Show file info
    origFileName.textContent = header.originalFileName || '—';
    origFileSize.textContent = UniDocCrypto.formatBytes(header.originalSize || 0);
    encryptedOn.textContent = header.encryptedAt
      ? new Date(header.encryptedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '—';
    encAlgorithm.textContent = header.algorithm || 'AES-256-GCM';

    show(encryptedFileInfo);
    show(decryptPasswordSection);
    validateDecrypt();
  }

  decryptFileRemove.addEventListener('click', () => {
    resetDecrypt();
  });

  toggleDecryptPassword.addEventListener('click', () => {
    const isPassword = decryptPasswordInput.type === 'password';
    decryptPasswordInput.type = isPassword ? 'text' : 'password';
    toggleDecryptPassword.querySelector('.material-icons-round').textContent = isPassword ? 'visibility' : 'visibility_off';
  });

  decryptPasswordInput.addEventListener('input', validateDecrypt);

  function validateDecrypt() {
    decryptBtn.disabled = !decryptPasswordInput.value;
  }

  decryptBtn.addEventListener('click', async () => {
    if (!ufencBytes || !decryptPasswordInput.value) return;

    hide(decryptPasswordSection);
    hide(encryptedFileInfo);
    hide(decryptErrorSection);
    show(decryptProgress);

    try {
      decryptedResult = await UniDocCrypto.decryptFile(
        ufencBytes,
        decryptPasswordInput.value,
        (percent, status) => {
          decryptProgressFill.style.width = percent + '%';
          decryptPercent.textContent = percent + '%';
          decryptStatus.textContent = status;
        }
      );

      hide(decryptProgress);
      show(decryptSuccess);
    } catch (err) {
      hide(decryptProgress);
      errorMessage.textContent = err.message;
      show(decryptErrorSection);
    }
  });

  downloadDecrypted.addEventListener('click', () => {
    if (!decryptedResult) return;
    downloadBlob(decryptedResult.data, decryptedResult.fileName, decryptedResult.mimeType);
    showToast('Decrypted file downloaded!');
  });

  retryDecrypt.addEventListener('click', () => {
    hide(decryptErrorSection);
    decryptPasswordInput.value = '';
    show(encryptedFileInfo);
    show(decryptPasswordSection);
    validateDecrypt();
  });

  decryptAnother.addEventListener('click', () => {
    resetDecrypt();
  });

  function resetDecrypt() {
    selectedDecryptFile = null;
    decryptedResult = null;
    ufencBytes = null;
    decryptFileInput.value = '';
    decryptPasswordInput.value = '';
    hide(decryptFileInfo);
    hide(encryptedFileInfo);
    hide(decryptPasswordSection);
    hide(decryptProgress);
    hide(decryptSuccess);
    hide(decryptErrorSection);
    show(decryptDropZone);
    decryptProgressFill.style.width = '0%';
    decryptBtn.disabled = true;
  }

  // =====================================================================
  //  UTIL: Download blob
  // =====================================================================

  function downloadBlob(data, filename, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // =====================================================================
  //  UTIL: Clipboard with fallback
  // =====================================================================

  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(textarea);
  }

  // ── Initialize ─────────────────────────────────────────────
  updateAutoPassword();
  updatePasswordStrength();
});
