/**
 * Wraps an async route handler to properly catch errors
 * @param fn The async route handler to wrap
 * @returns A new route handler that catches errors and passes them to Express
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
