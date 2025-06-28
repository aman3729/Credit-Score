/**
 * Wraps an async function to handle errors and pass them to Express's next function
 * @param {Function} fn - The async function to wrap
 * @returns {Function} - A middleware function that handles errors
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    // Execute the async function and catch any errors
    Promise.resolve(fn(req, res, next)).catch((err) => {
      // Log the error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('Async Error:', err);
      }
      
      // Pass the error to Express's error handling middleware
      next(err);
    });
  };
};

export default catchAsync;
