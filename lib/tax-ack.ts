/** Per-account cookie recording that the user accepted the tax disclaimer. */
export function taxAckCookieName(entityId: string) {
  return `tax-ack-${entityId}`;
}
