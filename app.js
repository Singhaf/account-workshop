const express = require('express');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const MONGO_URL = 'mongodb://127.0.0.1:27017';
const DATABASE_NAME = 'account-db';
const PORT = 3000;

const app = express();
app.use(express.json());
app.use(express.static('public'));

let users = null;
const HIDE_PASSWORD = { projection: { passwordHash: 0 } };

// สมัครสมาชิก
app.post('/api/register', async (req, res) => {
  const { username, name, email, password } = req.body;
  if (!username || !name || !email || !password) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบทุกช่อง' });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await users.insertOne({ username, name, email, passwordHash, role: 'member', createdAt: new Date() });
    res.status(201).json({ _id: result.insertedId, username, name, email });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'username หรือ email นี้ถูกใช้แล้ว' });
    }
    throw err;
  }
});

// เข้าสู่ระบบ
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await users.findOne({ username });
  const ok = user && await bcrypt.compare(password ?? '', user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'username หรือรหัสผ่านไม่ถูกต้อง' });
  }
  res.json({ message: 'เข้าสู่ระบบสำเร็จ', user: { username: user.username, name: user.name, role: user.role } });
});

// ดึงรายชื่อสมาชิก
app.get('/api/users', async (req, res) => {
  const list = await users.find({}, HIDE_PASSWORD).toArray();
  res.json(list);
});

async function main() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  users = client.db(DATABASE_NAME).collection('users');
  
  await users.createIndex({ username: 1 }, { unique: true });
  await users.createIndex({ email: 1 }, { unique: true });
  console.log('เชื่อมต่อ MongoDB สำเร็จ');

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}
main().catch(console.error);