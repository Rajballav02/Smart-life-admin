// eslint-disable-next-line no-unused-vars
module.exports = function errorMiddleware(err, req, res, next) {
  console.error(err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: 'Please check the information you entered.', details: err.message });
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: 'That email is already registered.' });
  }

  const status = err.statusCode || 500;
  const message = status === 500 ? 'Something went wrong. Please try again.' : err.message;
  res.status(status).json({ message });
};
