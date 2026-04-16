import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify, importPKCS8, importSPKI } from 'jose';
import type { KeyLike } from 'jose';

import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';

// ── Constantes ──────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const JWT_ALGORITHM = 'RS256';
const ACCESS_TOKEN_EXPIRATION = '24h';
const REFRESH_TOKEN_EXPIRATION_DAYS = 30;
const JWT_ISSUER = 'endura-api';
const JWT_AUDIENCE = 'endura-app';

// ── Cache de chaves RSA ─────────────────────────────────────────

let privateKeyCache: KeyLike | null = null;
let publicKeyCache: KeyLike | null = null;

async function getPrivateKey(): Promise<KeyLike> {
  if (!privateKeyCache) {
    const pem = process.env.JWT_PRIVATE_KEY;
    if (!pem) {
      throw new Error('JWT_PRIVATE_KEY nao configurada no ambiente');
    }
    privateKeyCache = await importPKCS8(pem.replace(/\\n/g, '\n'), JWT_ALGORITHM);
  }
  return privateKeyCache;
}

async function getPublicKey(): Promise<KeyLike> {
  if (!publicKeyCache) {
    const pem = process.env.JWT_PUBLIC_KEY;
    if (!pem) {
      throw new Error('JWT_PUBLIC_KEY nao configurada no ambiente');
    }
    publicKeyCache = await importSPKI(pem.replace(/\\n/g, '\n'), JWT_ALGORITHM);
  }
  return publicKeyCache;
}

// ── Tipos internos ──────────────────────────────────────────────

interface AuthTokens {
  token: string;
  refreshToken: string;
}

interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  token: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

// ── Helpers ─────────────────────────────────────────────────────

async function generateAccessToken(userId: string, email: string, role: string): Promise<string> {
  const privateKey = await getPrivateKey();

  return new SignJWT({ email, role })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setSubject(userId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRATION)
    .sign(privateKey);
}

function generateRefreshToken(): string {
  return randomUUID();
}

export async function generateTokens(userId: string, email: string, role: string): Promise<AuthTokens> {
  const token = await generateAccessToken(userId, email, role);
  const refreshToken = generateRefreshToken();
  return { token, refreshToken };
}

async function saveRefreshToken(userId: string, rawToken: string): Promise<void> {
  const hash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRATION_DAYS);

  await db
    .update(schema.users)
    .set({
      refreshToken: hash,
      refreshTokenExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));
}

// ── Serviço Público ─────────────────────────────────────────────

/**
 * Registra um novo usuario.
 * Cria o user com hash bcrypt, gera JWT RS256 (24h) + refresh token (30d).
 */
export async function register(
  email: string,
  password: string,
  name?: string,
): Promise<AuthResult> {
  // Verificar se email ja existe
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });

  if (existing) {
    throw {
      code: 'ERR_EMAIL_EXISTS',
      message: 'Email ja cadastrado',
      status: 409,
    };
  }

  // Hash da senha
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Criar usuario
  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      name: name ?? null,
      passwordHash,
      role: 'athlete',
    })
    .returning({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.users.role,
    });

  if (!user) {
    throw {
      code: 'ERR_CREATE_USER',
      message: 'Falha ao criar usuario',
      status: 500,
    };
  }

  // Gerar tokens
  const tokens = await generateTokens(user.id, user.email, user.role);
  await saveRefreshToken(user.id, tokens.refreshToken);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    token: tokens.token,
    refreshToken: tokens.refreshToken,
  };
}

/**
 * Autentica um usuario com email e senha.
 */
export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
    columns: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
    },
  });

  if (!user || !user.passwordHash) {
    throw {
      code: 'ERR_INVALID_CREDENTIALS',
      message: 'Email ou senha invalidos',
      status: 401,
    };
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    throw {
      code: 'ERR_INVALID_CREDENTIALS',
      message: 'Email ou senha invalidos',
      status: 401,
    };
  }

  const tokens = await generateTokens(user.id, user.email, user.role);
  await saveRefreshToken(user.id, tokens.refreshToken);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    token: tokens.token,
    refreshToken: tokens.refreshToken,
  };
}

/**
 * Rotaciona o refresh token.
 * Invalida o token anterior e gera um novo par de tokens.
 */
export async function refreshToken(token: string): Promise<AuthResult> {
  // Buscar todos os usuarios que possuem refresh token (nao expirado)
  // Na pratica, o token identifica o usuario, pois so um refresh token e valido por vez.
  // Precisamos iterar para encontrar qual user possui esse token.
  // Alternativa: o cliente pode enviar userId junto, mas por seguranca fazemos lookup.

  const allUsers = await db.query.users.findMany({
    columns: {
      id: true,
      email: true,
      name: true,
      role: true,
      refreshToken: true,
      refreshTokenExpiresAt: true,
    },
    where: (users, { isNotNull }) => isNotNull(users.refreshToken),
  });

  let matchedUser: typeof allUsers[number] | null = null;

  for (const user of allUsers) {
    if (!user.refreshToken) continue;

    const isValid = await bcrypt.compare(token, user.refreshToken);
    if (isValid) {
      matchedUser = user;
      break;
    }
  }

  if (!matchedUser) {
    throw {
      code: 'ERR_INVALID_REFRESH_TOKEN',
      message: 'Refresh token invalido',
      status: 401,
    };
  }

  // Verificar expiracao
  if (
    matchedUser.refreshTokenExpiresAt &&
    new Date() > matchedUser.refreshTokenExpiresAt
  ) {
    // Invalidar token expirado
    await db
      .update(schema.users)
      .set({
        refreshToken: null,
        refreshTokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, matchedUser.id));

    throw {
      code: 'ERR_REFRESH_TOKEN_EXPIRED',
      message: 'Refresh token expirado',
      status: 401,
    };
  }

  // Rotacionar: gerar novos tokens
  const tokens = await generateTokens(matchedUser.id, matchedUser.email, matchedUser.role);
  await saveRefreshToken(matchedUser.id, tokens.refreshToken);

  return {
    user: {
      id: matchedUser.id,
      email: matchedUser.email,
      name: matchedUser.name,
      role: matchedUser.role,
    },
    token: tokens.token,
    refreshToken: tokens.refreshToken,
  };
}

/**
 * Invalida o refresh token do usuario (logout).
 */
export async function logout(userId: string): Promise<void> {
  await db
    .update(schema.users)
    .set({
      refreshToken: null,
      refreshTokenExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));
}

/**
 * Verifica e decodifica um access token JWT.
 * Usado pelo middleware de autenticacao.
 */
export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const publicKey = await getPublicKey();

  try {
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: [JWT_ALGORITHM],
    });

    if (!payload.sub || typeof payload.email !== 'string' || typeof payload.role !== 'string') {
      throw {
        code: 'ERR_INVALID_TOKEN',
        message: 'Token com payload invalido',
        status: 401,
      };
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch (err: unknown) {
    // Se ja e um erro nosso, re-throw
    if (err && typeof err === 'object' && 'code' in err && 'status' in err) {
      throw err;
    }

    throw {
      code: 'ERR_INVALID_TOKEN',
      message: 'Token invalido ou expirado',
      status: 401,
    };
  }
}

// ── Set/Change Password ──────────────────────────────────────────

export async function hasPassword(userId: string): Promise<boolean> {
  const user = await db.select({ passwordHash: schema.users.passwordHash })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  return !!user[0]?.passwordHash;
}

export async function setPassword(userId: string, newPassword: string, currentPassword: string | null): Promise<void> {
  const user = await db.select({ passwordHash: schema.users.passwordHash })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!user[0]) {
    throw { code: 'ERR_USER_NOT_FOUND', message: 'Usuario nao encontrado', status: 404 };
  }

  // Se ja tem senha, verifica a senha atual
  if (user[0].passwordHash) {
    if (!currentPassword) {
      throw { code: 'ERR_CURRENT_PASSWORD_REQUIRED', message: 'Senha atual obrigatoria para alterar', status: 400 };
    }
    const valid = await bcrypt.compare(currentPassword, user[0].passwordHash);
    if (!valid) {
      throw { code: 'ERR_WRONG_PASSWORD', message: 'Senha atual incorreta', status: 401 };
    }
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db.update(schema.users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(schema.users.id, userId));
}
