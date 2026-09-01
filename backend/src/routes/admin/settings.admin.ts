import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../../middleware/validate.js';
import { requireRole } from '../../middleware/auth.js';
import * as settings from '../../services/settings.service.js';

export const adminSettingsRouter = Router();

/** Le compte destinataire est visible par le staff, modifiable par l'admin seul. */
adminSettingsRouter.get(
  '/bank',
  asyncHandler(async (_req, res) => {
    res.json({ account: await settings.getBankAccount() });
  }),
);

const bankSchema = z.object({
  holder: z.string().min(2, 'Indiquez le titulaire du compte').max(70),
  // La longueur et la clé de contrôle sont revalidées dans le service.
  iban: z.string().min(15).max(42),
  bic: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, 'BIC invalide (8 ou 11 caractères)'),
  bankName: z.string().min(2).max(120),
  dueDays: z.number().int().min(1).max(30),
});

/**
 * Changer le compte destinataire est l'opération la plus sensible du
 * back-office : elle est réservée aux administrateurs, jamais au staff.
 */
adminSettingsRouter.put(
  '/bank',
  requireRole('ADMIN'),
  validate(bankSchema),
  asyncHandler(async (req, res) => {
    const account = await settings.setBankAccount(
      req.body as z.infer<typeof bankSchema>,
      req.auth!.sub,
    );
    res.json({ account });
  }),
);

/** Revient aux valeurs du fichier d'environnement. */
adminSettingsRouter.delete(
  '/bank',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    res.json({ account: await settings.resetBankAccount(req.auth!.sub) });
  }),
);
