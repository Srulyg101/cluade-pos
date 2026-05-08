const express = require('express');
const cors = require('cors');
const path = require('path');

const categoriesRouter = require('./src/routes/categories');
const productsRouter = require('./src/routes/products');
const customersRouter = require('./src/routes/customers');
const ordersRouter = require('./src/routes/orders');
const reportsRouter = require('./src/routes/reports');
const settingsRouter = require('./src/routes/settings');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3008;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`POS Server running at http://localhost:${PORT}`);
  console.log(`API docs: http://localhost:${PORT}/api/health`);
});

module.exports = app;
