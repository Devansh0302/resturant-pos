import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        impersonateTenantId: { label: 'Impersonate Tenant ID', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const staff = await prisma.staff.findUnique({
          where: { email: credentials.email },
        });

        if (!staff || !staff.is_active) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, staff.password);
        if (!isPasswordValid) {
          return null;
        }

        if (credentials.impersonateTenantId) {
          if (staff.role !== 'SUPER_ADMIN') {
            return null; // Only Super Admins can impersonate
          }
          const targetTenantAdmin = await prisma.staff.findFirst({
            where: { restaurant_id: credentials.impersonateTenantId, role: 'ADMIN', is_active: true }
          });
          if (!targetTenantAdmin) return null;
          
          return {
            id: targetTenantAdmin.id,
            name: targetTenantAdmin.name,
            email: targetTenantAdmin.email,
            role: targetTenantAdmin.role as "ADMIN" | "CASHIER" | "WAITER" | "CHEF" | "MANAGER",
            restaurantId: targetTenantAdmin.restaurant_id,
            impersonatedBy: staff.id, // Store super admin ID
            impersonatedByName: staff.name,
            has_seen_tour: targetTenantAdmin.has_seen_tour,
          };
        }

        return {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role as "ADMIN" | "CASHIER" | "WAITER" | "CHEF" | "SUPER_ADMIN" | "MANAGER",
          restaurantId: staff.restaurant_id,
          has_seen_tour: staff.has_seen_tour,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.restaurantId = (user as any).restaurantId;
        if ((user as any).impersonatedBy) {
          token.impersonatedBy = (user as any).impersonatedBy;
          token.impersonatedByName = (user as any).impersonatedByName;
        }
        token.has_seen_tour = (user as any).has_seen_tour;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).restaurantId = token.restaurantId;
        if (token.impersonatedBy) {
          (session.user as any).impersonatedBy = token.impersonatedBy;
          (session.user as any).impersonatedByName = token.impersonatedByName;
        }
        (session.user as any).has_seen_tour = token.has_seen_tour;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
