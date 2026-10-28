/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PARTNER_NAME?: string;
  readonly VITE_BIRTH_DATE?: string;
  readonly VITE_BIRTH_TIME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
