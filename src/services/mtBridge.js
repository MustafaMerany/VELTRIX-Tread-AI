import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

export async function createBridgeToken() {
  const rawToken = `vx_${nanoid(40)}`;
  const hash = await bcrypt.hash(rawToken, 12);
  return { rawToken, hash };
}

export async function verifyBridgeToken(rawToken, tokenHash) {
  if (!rawToken || !tokenHash) return false;
  return bcrypt.compare(rawToken, tokenHash);
}
