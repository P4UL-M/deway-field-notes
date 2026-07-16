/// <reference types="astro/client" />

declare const process: {
  env: Record<string, string | undefined>;
  cwd(): string;
};

interface ImportMetaEnv {
  readonly PAYLOAD_URL?: string;
  readonly PREVIEW_SECRET?: string;
  readonly PUBLIC_PAYLOAD_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
