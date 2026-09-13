export const errorHandler = (err, req, res, next) => {
  if (err.diagnostics) {
    console.warn(`[Extraction Diagnostics] [${err.platform || 'unknown'}] [${err.category || err.code || 'ERROR'}]:`, JSON.stringify(err.diagnostics));
  } else {
    console.error('[Unhandled Error]', err.stack || err.message);
  }

  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    code: err.code || err.category || undefined,
    category: err.category || undefined,
    dataQualityState: err.dataQualityState || undefined,
    platform: err.platform || undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
