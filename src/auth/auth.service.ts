import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { SignupDto } from './dto/signup.dto';

type JwtUser = { id: number; email: string | null };

const REFRESH_TOKEN_EXPIRES_DAYS =
  Number(process.env.JWT_REFRESH_EXPIRES_DAYS) > 0
    ? Number(process.env.JWT_REFRESH_EXPIRES_DAYS)
    : 14;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async findOrCreateGoogleUser(params: {
    provider: string;
    providerId: string;
    email?: string | null;
    name?: string | null;
    picture?: string | null;
  }) {
    const { provider, providerId, email, name, picture } = params;

    const existingByProvider = await this.prisma.user.findUnique({
      where: { provider_providerId: { provider, providerId } },
    });
    if (existingByProvider) {
      return existingByProvider;
    }

    if (email) {
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email },
      });
      if (existingByEmail) {
        if (!existingByEmail.provider || !existingByEmail.providerId) {
          return this.prisma.user.update({
            where: { id: existingByEmail.id },
            data: { provider, providerId },
          });
        }
        return existingByEmail;
      }
    }

    return this.prisma.user.create({
      data: {
        email: email || `google_${providerId}@no-email.google`,
        provider,
        providerId,
        name: name || undefined,
        picture: picture || undefined,
      },
    });
  }

  issueTokens(user: JwtUser) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken };
  }

  async issueTokensWithRefresh(user: JwtUser) {
    const { accessToken } = this.issueTokens(user);

    // Generate opaque refresh token
    const rawToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    return { accessToken, refreshToken: rawToken };
  }

  async refreshTokens(rawToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Rotate: revoke old token
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const { user } = stored;
    return this.issueTokensWithRefresh({ id: user.id, email: user.email });
  }

  async logout(rawToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.revokedAt) {
      // Idempotent — already revoked or doesn't exist
      return;
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
  }

  async signup(signupDto: SignupDto) {
    const { email, password } = signupDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    // Issue tokens
    const tokens = await this.issueTokensWithRefresh({
      id: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
      tokens,
    };
  }

  async requestMagicLink(email: string): Promise<void> {
    // Find or create user — magic link works even for new users
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({ data: { email } });
    }

    // Generate a cryptographically random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.magicLink.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    await this.mailService.sendMagicLink(email, rawToken);
  }

  async verifyMagicLink(rawToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const magicLink = await this.prisma.magicLink.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!magicLink) {
      throw new NotFoundException('Invalid or expired magic link');
    }

    if (magicLink.usedAt) {
      throw new UnauthorizedException('Magic link has already been used');
    }

    if (magicLink.expiresAt < new Date()) {
      throw new UnauthorizedException('Magic link has expired');
    }

    // Mark as used
    await this.prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { usedAt: new Date() },
    });

    const { user } = magicLink;
    const tokens = await this.issueTokensWithRefresh({ id: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
      tokens,
    };
  }
}
