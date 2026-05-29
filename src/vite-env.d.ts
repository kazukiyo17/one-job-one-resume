/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_MOCK_OPTIMIZE?: string;
  readonly VITE_MOCK_DELAY_MS?: string;
  readonly VITE_MAX_FILE_BYTES?: string;
  readonly VITE_MAX_RESUME_TEXT_CHARS?: string;
  readonly VITE_MAX_JD_TEXT_CHARS?: string;
  readonly VITE_MAX_REQUEST_BYTES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface WindowEnv {
  API_BASE?: string;
  MOCK_OPTIMIZE?: boolean | string | number;
  MOCK_DELAY_MS?: number | string;
  MAX_FILE_BYTES?: number | string;
  MAX_RESUME_TEXT_CHARS?: number | string;
  MAX_JD_TEXT_CHARS?: number | string;
  MAX_REQUEST_BYTES?: number | string;
}

interface Window {
  __ENV__?: WindowEnv;
}
