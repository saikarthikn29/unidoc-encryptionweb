/**
 * UniDoc Crypto Engine — AES-256-GCM encryption/decryption
 * 
 * Produces .ufenc files fully compatible with the UniDoc mobile app.
 * Uses the Web Crypto API (SubtleCrypto) for all cryptographic operations.
 * 
 * File format (UFENC001):
 *   [8 bytes magic "UFENC001"]
 *   [1 byte version]
 *   [4 bytes header length (big-endian)]
 *   [JSON header]
 *   [AES-256-GCM ciphertext + 16-byte auth tag]
 */

const UniDocCrypto = (() => {

  // ── Constants ──────────────────────────────────────────────
  const MAGIC = new Uint8Array([0x55, 0x46, 0x45, 0x4E, 0x43, 0x30, 0x30, 0x31]); // "UFENC001"
  const VERSION = 1;
  const SALT_LENGTH = 32;
  const IV_LENGTH = 12;
  const TAG_LENGTH_BITS = 128;   // 16 bytes
  const KEY_LENGTH_BITS = 256;   // 32 bytes
  const PBKDF2_ITERATIONS = 150000;
  const MIN_PASSWORD_LENGTH = 12;
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

  // ── Helpers ────────────────────────────────────────────────

  function randomBytes(n) {
    const buf = new Uint8Array(n);
    crypto.getRandomValues(buf);
    return buf;
  }

  function buf2base64(buf) {
    let binary = '';
    for (const b of buf) binary += String.fromCharCode(b);
    return btoa(binary);
  }

  function base642buf(b64) {
    const binary = atob(b64);
    const buf = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
    return buf;
  }

  function buf2base64url(buf) {
    return buf2base64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function utf8encode(str) {
    return new TextEncoder().encode(str);
  }

  function utf8decode(buf) {
    return new TextDecoder().decode(buf);
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function generateFileId() {
    const ts = Date.now().toString(36);
    const rnd = buf2base64url(randomBytes(8)).substring(0, 8);
    return `${ts}-${rnd}`;
  }

  function generateStrongPassword(length = 32) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:,.<>?';
    const values = randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset[values[i] % charset.length];
    }
    return result;
  }

  async function computeSHA256(data) {
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ── Password Strength ─────────────────────────────────────

  function evaluatePasswordStrength(password) {
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    if (password.length >= 24) score++;

    const levels = [
      { max: 1, label: 'Very Weak', color: '#FF5252' },
      { max: 2, label: 'Weak', color: '#FF9800' },
      { max: 3, label: 'Fair', color: '#FFC107' },
      { max: 5, label: 'Strong', color: '#8BC34A' },
      { max: 7, label: 'Very Strong', color: '#4CAF50' },
      { max: Infinity, label: 'Excellent', color: '#00E676' },
    ];

    for (const lvl of levels) {
      if (score <= lvl.max) return { score, label: lvl.label, color: lvl.color, percent: Math.min(100, (score / 7) * 100) };
    }
    return { score, label: 'Excellent', color: '#00E676', percent: 100 };
  }

  // ── Key Binding (HMAC-SHA256) ────────────────────────────
  // The app binds each key to a specific fileId by computing
  // boundSalt = HMAC-SHA256(salt, fileId) before PBKDF2.
  // This prevents a key derived for one file from decrypting another.

  async function bindKeyToFile(salt, fileId) {
    const hmacKey = await crypto.subtle.importKey(
      'raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', hmacKey, utf8encode(fileId));
    return new Uint8Array(sig);
  }

  // ── Key Derivation (PBKDF2-SHA256) ────────────────────────

  async function deriveKey(password, salt, iterations = PBKDF2_ITERATIONS) {
    const keyMaterial = await crypto.subtle.importKey(
      'raw', utf8encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: KEY_LENGTH_BITS },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // ── MIME type helper ───────────────────────────────────────

  function getMimeType(ext) {
    const map = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.gif': 'image/gif',
      '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
      '.zip': 'application/zip',
    };
    return map[ext.toLowerCase()] || 'application/octet-stream';
  }

  function getExtension(filename) {
    const i = filename.lastIndexOf('.');
    return i >= 0 ? filename.substring(i) : '';
  }

  function getFileIcon(ext) {
    const icons = {
      '.pdf': 'picture_as_pdf',
      '.doc': 'description', '.docx': 'description',
      '.xls': 'table_chart', '.xlsx': 'table_chart',
      '.ppt': 'slideshow', '.pptx': 'slideshow',
      '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image',
      '.mp4': 'movie', '.mp3': 'audiotrack',
      '.zip': 'folder_zip',
      '.txt': 'article',
    };
    return icons[ext.toLowerCase()] || 'description';
  }

  // ── Encrypt ────────────────────────────────────────────────

  async function encryptFile(file, password, options = {}, onProgress = null) {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${formatBytes(MAX_FILE_SIZE)}.`);
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }

    const iterations = options.iterations || PBKDF2_ITERATIONS;
    const expiryHours = options.expiryHours || 0;

    if (onProgress) onProgress(0, 'Reading file...');

    const fileData = new Uint8Array(await file.arrayBuffer());

    if (onProgress) onProgress(10, 'Computing file hash...');
    const fileHash = await computeSHA256(fileData);

    if (onProgress) onProgress(20, 'Generating cryptographic parameters...');
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    const fileId = generateFileId();

    if (onProgress) onProgress(25, 'Binding key to file...');
    const boundSalt = await bindKeyToFile(salt, fileId);

    if (onProgress) onProgress(30, 'Deriving encryption key (PBKDF2)...');
    const key = await deriveKey(password, boundSalt, iterations);

    if (onProgress) onProgress(50, 'Encrypting with AES-256-GCM...');
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: TAG_LENGTH_BITS },
      key,
      fileData
    );

    if (onProgress) onProgress(80, 'Building .ufenc file...');

    const ext = getExtension(file.name);
    const encryptedAt = new Date();
    const keyExpiry = expiryHours > 0
      ? new Date(encryptedAt.getTime() + expiryHours * 3600 * 1000)
      : null;

    // The Web Crypto API appends the auth tag to the ciphertext.
    // The app's format stores authTag separately in the header and the 
    // ciphertext (with tag appended) in the data section.
    // We need to split them to store authTag in the header.
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const ciphertext = encryptedArray.slice(0, encryptedArray.length - 16);
    const authTag = encryptedArray.slice(encryptedArray.length - 16);

    const header = {
      fileId,
      originalFileName: file.name,
      originalExtension: ext,
      originalSize: file.size,
      mimeType: getMimeType(ext),
      salt: buf2base64(salt),
      iv: buf2base64(iv),
      authTag: buf2base64(authTag),
      pbkdf2Iterations: iterations,
      encryptedAt: encryptedAt.toISOString(),
      keyExpiry: keyExpiry ? keyExpiry.toISOString() : null,
      originalFileHash: fileHash,
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2-SHA256',
    };

    const headerBytes = utf8encode(JSON.stringify(header));
    const headerLength = headerBytes.length;

    // Re-combine ciphertext + authTag for data section (as the app expects)
    const dataWithTag = encryptedArray;

    // Build .ufenc file
    const totalSize = MAGIC.length + 1 + 4 + headerLength + dataWithTag.length;
    const ufenc = new Uint8Array(totalSize);
    let offset = 0;

    // Magic bytes
    ufenc.set(MAGIC, offset); offset += MAGIC.length;
    // Version
    ufenc[offset] = VERSION; offset += 1;
    // Header length (big-endian)
    ufenc[offset] = (headerLength >> 24) & 0xFF;
    ufenc[offset + 1] = (headerLength >> 16) & 0xFF;
    ufenc[offset + 2] = (headerLength >> 8) & 0xFF;
    ufenc[offset + 3] = headerLength & 0xFF;
    offset += 4;
    // Header
    ufenc.set(headerBytes, offset); offset += headerLength;
    // Encrypted data (with auth tag)
    ufenc.set(dataWithTag, offset);

    if (onProgress) onProgress(95, 'Preparing download...');

    // Build key share data
    const keyShareData = {
      k: password,
      f: fileId,
      e: keyExpiry ? keyExpiry.getTime() : 0,
      u: 1,
    };
    const keyShareEncoded = btoa(JSON.stringify(keyShareData));

    if (onProgress) onProgress(100, 'Complete!');

    return {
      ufencData: ufenc,
      fileName: file.name.replace(/\.[^.]+$/, '') + '.ufenc',
      header,
      keyShareEncoded,
      password,
    };
  }

  // ── Decrypt ────────────────────────────────────────────────

  async function decryptFile(ufencData, password, onProgress = null) {
    if (onProgress) onProgress(0, 'Reading encrypted file...');

    const data = ufencData instanceof Uint8Array ? ufencData : new Uint8Array(ufencData);

    // Verify magic bytes
    for (let i = 0; i < MAGIC.length; i++) {
      if (data[i] !== MAGIC[i]) {
        throw new Error('Invalid file format. This is not a .ufenc file.');
      }
    }

    let offset = MAGIC.length;

    // Version
    const version = data[offset]; offset += 1;
    if (version > VERSION) {
      throw new Error(`Unsupported file version (v${version}). Please update your app.`);
    }

    // Header length
    const headerLength = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
    offset += 4;

    // Header
    if (onProgress) onProgress(10, 'Parsing file header...');
    const headerBytes = data.slice(offset, offset + headerLength);
    let header;
    try {
      header = JSON.parse(utf8decode(headerBytes));
    } catch (e) {
      throw new Error('Corrupted file header.');
    }
    offset += headerLength;

    // Check key expiry
    if (header.keyExpiry) {
      const expiry = new Date(header.keyExpiry);
      if (new Date() > expiry) {
        throw new Error('The encryption key for this file has expired.');
      }
    }

    // Encrypted data (ciphertext + auth tag from the app)
    const encryptedData = data.slice(offset);

    // Decode cryptographic parameters from header
    const salt = base642buf(header.salt);
    const iv = base642buf(header.iv);

    if (onProgress) onProgress(15, 'Binding key to file...');
    const boundSalt = await bindKeyToFile(salt, header.fileId);

    if (onProgress) onProgress(20, 'Deriving decryption key (PBKDF2)...');
    const iterations = header.pbkdf2Iterations || PBKDF2_ITERATIONS;

    const key = await deriveKey(password, boundSalt, iterations);

    if (onProgress) onProgress(50, 'Decrypting with AES-256-GCM...');

    let decrypted;
    try {
      decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv, tagLength: TAG_LENGTH_BITS },
        key,
        encryptedData
      );
    } catch (e) {
      throw new Error('Decryption failed. Wrong password or file is corrupted.');
    }

    if (onProgress) onProgress(80, 'Verifying file integrity...');

    const decryptedArray = new Uint8Array(decrypted);

    // Verify SHA-256 hash
    const hash = await computeSHA256(decryptedArray);
    if (hash !== header.originalFileHash) {
      throw new Error('Integrity check failed. File may have been tampered with.');
    }

    if (onProgress) onProgress(100, 'Complete!');

    return {
      data: decryptedArray,
      fileName: header.originalFileName,
      mimeType: header.mimeType,
      header,
    };
  }

  // ── Parse header only (for displaying info before decryption) ──

  function parseHeader(ufencData) {
    const data = ufencData instanceof Uint8Array ? ufencData : new Uint8Array(ufencData);

    for (let i = 0; i < MAGIC.length; i++) {
      if (data[i] !== MAGIC[i]) return null;
    }

    let offset = MAGIC.length + 1; // skip magic + version

    const headerLength = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
    offset += 4;

    try {
      const headerBytes = data.slice(offset, offset + headerLength);
      return JSON.parse(utf8decode(headerBytes));
    } catch {
      return null;
    }
  }

  // ── Public API ─────────────────────────────────────────────

  return {
    encryptFile,
    decryptFile,
    parseHeader,
    generateStrongPassword,
    evaluatePasswordStrength,
    formatBytes,
    getFileIcon,
    getExtension,
    MIN_PASSWORD_LENGTH,
    MAX_FILE_SIZE,
  };

})();
