// The offer code: the attestation token of SPEC-rung3 § 5. Unique (a UNIQUE column), random and
// unguessable: 8 symbols from a 32-symbol alphabet with no 0/O or 1/I, so 40 bits of entropy.
// 32 divides 256, so `byte % 32` is unbiased.
export const OFFER_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const OFFER_CODE_LENGTH = 8;

export function newOfferCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(OFFER_CODE_LENGTH));
  let code = "";
  for (const b of bytes) code += OFFER_CODE_ALPHABET[b % OFFER_CODE_ALPHABET.length];
  return code;
}
