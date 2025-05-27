const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const app = express();
const FILES_DIR = '/files';

// Increase payload limit to 10mb
app.use(express.json({ limit: '10mb' }));
app.use(express.static('src'));
app.use('/files', express.static('/files'));

// Ensure images directory exists
const imagesDir = path.join(FILES_DIR, 'images');
fs.mkdirSync(imagesDir, { recursive: true });

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, imagesDir),
  filename: (req, file, cb) => {
    // Use timestamp + original name for uniqueness
    const uniqueName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

app.post('/api/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  // Return the relative path for markdown
  res.json({ 
    success: true, 
    url: `/files/images/${req.file.filename}` 
  });
});

app.post('/api/save', (req, res) => {
  const { name, content } = req.body;
  if (!name) return res.status(400).json({ error: 'No note name' });
  const safeName = sanitizePath(name) + '.md';
  const filePath = path.join(FILES_DIR, safeName);
  if (!filePath.startsWith(FILES_DIR)) return res.status(400).json({ error: 'Invalid path' });

  // Ensure subfolders exist
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFile(filePath, content, err => {
    if (err) return res.status(500).json({ error: 'Failed to save' });
    res.json({ success: true });
  });
});

app.post('/api/delete', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'No note name' });
  const safeName = sanitizePath(name) + '.md';
  const filePath = path.join(FILES_DIR, safeName);
  if (!filePath.startsWith(FILES_DIR)) return res.status(400).json({ error: 'Invalid path' });
  fs.unlink(filePath, err => {
    if (err) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true });
  });
});

// Helper to recursively list .md files with relative paths
function listMarkdownFiles(dir, baseDir = '') {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  list.forEach(file => {
    const relPath = path.join(baseDir, file.name);
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      results = results.concat(listMarkdownFiles(fullPath, relPath));
    } else if (file.isFile() && file.name.endsWith('.md')) {
      results.push(relPath);
    }
  });
  return results;
}

app.get('/api/list', (req, res) => {
  try {
    const notes = listMarkdownFiles(FILES_DIR).map(f => f.replace(/\.md$/, ''));
    res.json({ success: true, notes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list notes' });
  }
});

// Add this endpoint to your server.js
app.get('/api/list-with-content', (req, res) => {
  try {
    const notes = listMarkdownFiles(FILES_DIR).map(f => f.replace(/\.md$/, ''));
    const notesWithContent = notes.map(name => {
      const safeName = sanitizePath(name) + '.md';
      const filePath = path.join(FILES_DIR, safeName);
      let content = '';
      try {
        content = fs.readFileSync(filePath, 'utf8');
      } catch {}
      return { name, content };
    });
    res.json({ success: true, notes: notesWithContent });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list notes' });
  }
});

function sanitizePath(name) {
  return name
    .split('/')
    .filter(Boolean)
    .map(part => part.replace(/[^a-zA-Z0-9_\-]/g, '_'))
    .join('/');
}

app.post('/api/open', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'No note name' });
  const safeName = sanitizePath(name) + '.md';
  const filePath = path.join(FILES_DIR, safeName);
  if (!filePath.startsWith(FILES_DIR)) return res.status(400).json({ error: 'Invalid path' });
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true, content: data });
  });
});

// Rename endpoint
app.post('/api/rename', (req, res) => {
  const { oldName, newName } = req.body;
  if (!oldName || !newName) {
    return res.json({ success: false, error: 'Missing oldName or newName' });
  }
  const safeOldName = sanitizePath(oldName) + '.md';
  const safeNewName = sanitizePath(newName) + '.md';
  const oldPath = path.join(FILES_DIR, safeOldName);
  const newPath = path.join(FILES_DIR, safeNewName);
  if (!oldPath.startsWith(FILES_DIR) || !newPath.startsWith(FILES_DIR)) {
    return res.status(400).json({ success: false, error: 'Invalid path' });
  }
  if (!fs.existsSync(oldPath)) {
    return res.json({ success: false, error: 'Original note does not exist' });
  }
  if (fs.existsSync(newPath)) {
    return res.json({ success: false, error: 'A note with the new name already exists' });
  }
  fs.rename(oldPath, newPath, (err) => {
    if (err) return res.json({ success: false, error: err.message });
    res.json({ success: true });
  });
});

app.listen(80, () => console.log('ToastNotes server running'));