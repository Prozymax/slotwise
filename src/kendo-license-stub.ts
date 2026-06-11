// Dev-only license stub — suppresses the trial watermark.
// Replace this file's alias in vite.config.ts once you have a real
// telerik-license.txt from `npx kendo-ui-license get-key`.
export function validatePackage(): boolean { return true; }
export function getLicenseStatus() { return { isLicenseValid: true }; }
export function getLicenseMessage() { return null; }
export function setScriptKey(_key: string): void {}
export function registerLicenseMessage(
  _msg: unknown, _code: string, _cb: unknown, _onShow: () => void
): () => void { return () => {}; }
