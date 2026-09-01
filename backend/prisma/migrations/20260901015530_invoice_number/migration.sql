-- Numéro de facture, attribué à l'encaissement.
-- Nullable : une commande non payée n'a pas de facture, et la série doit
-- rester continue.
ALTER TABLE "Order" ADD COLUMN "invoiceNumber" TEXT;

CREATE UNIQUE INDEX "Order_invoiceNumber_key" ON "Order"("invoiceNumber");
