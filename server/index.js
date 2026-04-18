const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'HealthSimplify API is running' });
});

// Registration endpoint
app.post('/api/register', (req, res) => {
  const { username, email, password, firstName, lastName, age, gender } = req.body;
  if (!username || !email || !password || !firstName || !lastName || !age || !gender) {
    return res.status(400).json({ error: 'Required fields missing' });
  }
  console.log('New registration:', { username, email, firstName, lastName });
  res.status(201).json({ success: true, message: 'Account created successfully' });
});

// Vitals endpoints
app.get('/api/vitals', (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  res.json({ vitals: [] });
});

app.post('/api/vitals', (req, res) => {
  const { username, type, value, unit, date } = req.body;
  if (!username || !type || !value) {
    return res.status(400).json({ error: 'Required fields missing' });
  }
  console.log('New vitals entry:', { username, type, value, unit, date });
  res.status(201).json({ success: true, message: 'Vitals recorded successfully' });
});

app.put('/api/vitals/:id', (req, res) => {
  const { id } = req.params;
  const { type, value, unit, date } = req.body;
  if (!type || !value) {
    return res.status(400).json({ error: 'Required fields missing' });
  }
  console.log('Updated vitals entry:', { id, type, value, unit, date });
  res.json({ success: true, message: 'Vitals updated successfully' });
});

app.delete('/api/vitals/:id', (req, res) => {
  const { id } = req.params;
  console.log('Deleted vitals entry:', { id });
  res.json({ success: true, message: 'Vitals entry deleted successfully' });
});

// Contact form endpoint
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  console.log('Contact form submission:', { name, email, message });
  res.json({ success: true, message: 'Thank you! We will be in touch soon.' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
