import app from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  CABMITRA Backend Service running on port ${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/health`);
  console.log(`==================================================`);
});
