import { redirect } from 'next/navigation';
import { path, type Locale } from '@/lib/routes';

/**
 * La boutique n'a plus de compte client : le suivi de commande se fait par
 * numéro et e-mail. Cette route est conservée parce que d'anciens liens ou
 * e-mails peuvent encore y pointer.
 *
 * `/compte/login` reste actif, mais uniquement pour l'équipe (back-office).
 */
export default function AccountPage({ params }: { params: { locale: Locale } }) {
  redirect(path(params.locale, 'tracking'));
}
