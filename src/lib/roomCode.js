// Generate and validate clean 4-letter uppercase room codes
// Excludes confusing characters like I, O, 0, 1

const CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * CHARACTERS.length);
    code += CHARACTERS[randomIndex];
  }
  return code;
}

export function isValidRoomCode(code) {
  if (!code || typeof code !== 'string') return false;
  const clean = code.trim().toUpperCase();
  return clean.length === 4 && /^[A-Z]{4}$/.test(clean);
}
