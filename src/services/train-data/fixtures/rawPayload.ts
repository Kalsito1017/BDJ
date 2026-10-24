/**
 * Shape of a fixture "wire payload": exactly what an external source would
 * send over the boundary — a plain JSON-ish record, schema-UNvalidated until
 * `parseExternalPayload` runs (DEC-007, Appendix B). Keeping fixtures in this
 * raw shape is what lets the mock exercise the real validation path.
 */

export type RawPayload = Record<string, unknown>;
