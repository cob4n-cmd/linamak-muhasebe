const { initDB } = require('./db');

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/incomes', require('./routes/incomes'));
app.use('/api/credit-cards', require('./routes/credit-cards'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/kdv', require('./routes/kdv'));
app.use('/api/charts', require('./routes/charts'));
app.use('/api/settings', require('./routes/app-settings'));

// Serve frontend (client/dist)
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// DB baslat sonra sunucuyu ac
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LinaMAK Muhasebe API http://0.0.0.0:${PORT} adresinde calisiyor`);
  });
}).catch(err => {
  console.error('Veritabani baslatilamadi:', err);
  process.exit(1);
});
