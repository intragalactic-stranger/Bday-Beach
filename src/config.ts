import { CREATOR_NAME, resolveBirthdayDetails } from './data/wishes';

/**
 * Personal details come from .env (see .env.example) so anyone can clone the
 * repo, drop in their own partner's details and get a fully personalised surprise.
 */
export const BIRTHDAY = resolveBirthdayDetails(
  {
    name: import.meta.env.VITE_PARTNER_NAME,
    birthDate: import.meta.env.VITE_BIRTH_DATE,
    birthTime: import.meta.env.VITE_BIRTH_TIME,
  },
  new Date()
);

export const CREATOR_SIGNATURE = `created with love from ${CREATOR_NAME} ♥`;
