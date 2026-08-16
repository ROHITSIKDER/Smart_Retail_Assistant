export class ExtractionError extends Error {
  constructor(message, { category = 'EXTRACTION_FAILED', statusCode = 422, platform = 'generic', diagnostics = {} } = {}) {
    super(message);
    this.name = 'ExtractionError';
    this.code = category;
    this.category = category;
    this.statusCode = statusCode;
    this.platform = platform;
    this.diagnostics = diagnostics;
  }
}
