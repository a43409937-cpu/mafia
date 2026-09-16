const express = require('express');
const app = express();

app.use(express.json());

// روت اصلی برای جلوگیری از ارور Cannot GET /
app.get('/', (req, res) => {
  res.status(200).send('Server is running successfully!');
});

// اگر فایل‌های فرانت‌اند (مثل React یا HTML) دارید این دو خط را از کامنت خارج کنید:
// const path = require('path');
// app.use(express.static(path.join(__dirname, 'public'))); 

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
