/**
 * Standardized API response formatters.
 */

export const sendSuccess = (res, { message = 'Success', data = null, statusCode = 200 } = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...(data !== null && { data }),
  });
};

export const sendCreated = (res, { message = 'Resource created successfully', data = null } = {}) => {
  return sendSuccess(res, { message, data, statusCode: 201 });
};

export const sendError = (res, { message = 'An error occurred', statusCode = 500, errors = null } = {}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
  });
};

export default { sendSuccess, sendCreated, sendError };
