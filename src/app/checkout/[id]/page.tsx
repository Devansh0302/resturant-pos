import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import CheckoutClient from './CheckoutClient';

const prisma = new PrismaClient();

export default async function CheckoutPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await prisma.checkoutSession.findUnique({
    where: { id: params.id },
  });

  if (!session) {
    notFound();
  }

  if (session.status !== 'PENDING') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">!</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h1>
          <p className="text-gray-500 mb-6">This checkout session has already been paid or expired.</p>
          <a href="/settings" className="inline-block bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <CheckoutClient session={session} />;
}
