import { apiFetch, ApiError, type BankTransferInstructions } from '@/lib/api';
import { buildInvoicePdf, type InvoiceItem, type InvoiceOrder } from '@/lib/invoice-pdf';
import { isLocale, type Locale } from '@/lib/routes';

/**
 * Confirmation de commande ou facture, en PDF.
 *
 *   /fr/document/SM-2026-00001?email=client@example.com
 *
 * Aucun compte n'est requis : le couple numéro + e-mail sert d'authentification,
 * exactement comme sur la page de suivi. L'API applique le même contrôle et
 * renvoie 403 si l'adresse ne correspond pas.
 *
 * Le document n'est pas stocké : il est reconstruit à chaque demande depuis la
 * commande en base. Un changement de statut s'y reflète donc immédiatement,
 * et il n'y a aucun fichier à purger ou à resynchroniser.
 */

export const dynamic = 'force-dynamic';

interface OrderResponse {
  order: InvoiceOrder;
  items: InvoiceItem[];
  payment:
    | { method: 'BANK_TRANSFER'; instructions: BankTransferInstructions }
    | { method: 'CARD' };
}

export async function GET(
  request: Request,
  { params }: { params: { locale: string; orderNumber: string } },
) {
  if (!isLocale(params.locale)) {
    return new Response('Locale inconnue', { status: 404 });
  }
  const locale: Locale = params.locale;

  const email = new URL(request.url).searchParams.get('email');
  if (!email) {
    return new Response("L'adresse e-mail de la commande est requise.", { status: 400 });
  }

  let data: OrderResponse;
  try {
    data = await apiFetch<OrderResponse>(
      `/api/checkout/orders/${encodeURIComponent(params.orderNumber)}?email=${encodeURIComponent(email)}`,
      { cache: 'no-store' },
    );
  } catch (error) {
    // Même réponse que la commande n'existe pas ou que l'e-mail ne corresponde
    // pas : sinon l'URL permettrait de deviner quels numéros existent.
    const status = error instanceof ApiError && error.status < 500 ? 404 : 502;
    return new Response('Commande introuvable', { status });
  }

  const pdf = await buildInvoicePdf({
    order: data.order,
    items: data.items,
    transfer:
      data.payment.method === 'BANK_TRANSFER'
        ? {
            holder: data.payment.instructions.holder,
            iban: data.payment.instructions.iban,
            bic: data.payment.instructions.bic,
            reference: data.payment.instructions.reference,
          }
        : null,
    locale,
  });

  const prefix = data.order.invoiceNumber
    ? locale === 'de'
      ? 'Rechnung'
      : 'Facture'
    : locale === 'de'
      ? 'Bestellung'
      : 'Commande';
  const fileName = `${prefix}-${data.order.invoiceNumber ?? data.order.orderNumber}.pdf`;

  return new Response(pdf as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      // `inline` ouvre le document dans le navigateur, où le client peut le
      // lire puis l'enregistrer — plus engageant qu'un téléchargement aveugle.
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
