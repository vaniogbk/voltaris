import { Router, text as textBody } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../../middleware/validate.js';
import { ApiError } from '../../lib/errors.js';
import * as bankImport from '../../services/bank-import.service.js';

export const adminBankRouter = Router();

/**
 * Dépôt d'un relevé CAMT.053.
 *
 * Le corps est le XML brut : le back-office lit le fichier côté navigateur et
 * l'envoie tel quel. Pas de multipart, donc pas de dépendance supplémentaire
 * ni de fichier temporaire sur le disque du serveur.
 */
adminBankRouter.post(
  '/statements',
  textBody({ type: ['application/xml', 'text/xml', 'text/plain'], limit: '15mb' }),
  asyncHandler(async (req, res) => {
    const xml = typeof req.body === 'string' ? req.body : '';
    if (!xml.trim()) {
      throw ApiError.badRequest('Aucun contenu reçu.', 'EMPTY_FILE');
    }

    const fileName = String(req.query.fileName ?? 'releve.xml').slice(0, 200);
    const dryRun = req.query.dryRun === 'true';

    const report = await bankImport.importCamt053(xml, {
      fileName,
      userId: req.auth!.sub,
      dryRun,
    });

    res.status(dryRun ? 200 : 201).json({ report });
  }),
);

adminBankRouter.get(
  '/statements',
  validate(
    z.object({
      page: z.coerce.number().int().min(1).default(1),
      perPage: z.coerce.number().int().min(1).max(50).default(20),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const { page, perPage } = req.query as unknown as { page: number; perPage: number };
    res.json(await bankImport.listStatements(page, perPage));
  }),
);

adminBankRouter.get(
  '/statements/:id',
  asyncHandler(async (req, res) => {
    res.json({ statement: await bankImport.getStatement(req.params.id) });
  }),
);

/** Écritures encore à traiter, tous relevés confondus. */
adminBankRouter.get(
  '/entries/pending',
  asyncHandler(async (_req, res) => {
    res.json({ entries: await bankImport.listPendingEntries() });
  }),
);

adminBankRouter.post(
  '/entries/:id/match',
  validate(z.object({ orderNumber: z.string().min(1).max(40) })),
  asyncHandler(async (req, res) => {
    const entry = await bankImport.matchEntryToOrder(
      req.params.id,
      req.body.orderNumber.trim().toUpperCase(),
      req.auth!.sub,
    );
    res.json({ entry });
  }),
);

adminBankRouter.post(
  '/entries/:id/ignore',
  validate(z.object({ reason: z.string().max(300).default('Écartée manuellement') })),
  asyncHandler(async (req, res) => {
    res.json({ entry: await bankImport.ignoreEntry(req.params.id, req.body.reason) });
  }),
);
