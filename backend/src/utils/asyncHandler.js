/**
 * Wrapper for async route handlers to catch unhandled rejections
 * and automatically forward them to Express error middleware.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
