# ToastNotes

A simple, browser-based Markdown note-taking app with a modern UI, built using [Toast UI Editor](https://ui.toast.com/tui-editor), Node.js, and Docker. Notes are saved as Markdown files on the server and can be created, edited, renamed, deleted, printed, or exported.

## Features

- 📝 **Markdown Editing** with live preview (Toast UI Editor)
- 📁 **Create, Open, Rename, Delete** notes
- 💾 **Auto-save** and manual save
- 🖨️ **Print or Export** notes (browser print dialog with full formatting)
- 🗓️ **Insert Date** button
- 🖼️ **Insert Images** (upload and embed)
- 🏷️ **Rename notes** with a dedicated button and icon
- 🐳 **Dockerized** for easy deployment

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) installed on your system

### Quick Start

1. **Clone the repository:**
   ```sh
   git clone https://github.com/yourusername/toastnotes.git
   cd toastnotes
   ```

2. **Build and run with Docker Compose:**
   ```sh
   docker-compose up --build
   ```

3. **Open your browser and go to:**
   ```
   http://localhost:40036
   ```

### File Structure

```
src/                # Frontend (HTML, JS, CSS)
files/              # Markdown notes (created at runtime)
server.js           # Node.js backend
docker-compose.yml  # Docker Compose config
Dockerfile          # Docker build config
```

## Usage

- **Create a new note:** Click the wand icon, enter a name, and start typing.
- **Open a note:** Click the folder icon and select from the list.
- **Rename a note:** Click the rename icon (pencil), enter a new name.
- **Save a note:** Click the floppy disk icon.
- **Delete a note:** Click the bomb icon.
- **Insert date:** Click the calendar icon.
- **Insert image:** Click the image icon and select a file.
- **Print/export:** Click the print icon and use your browser's print dialog to save as PDF.

## API Endpoints

- `POST /api/save` — Save a note
- `POST /api/open` — Open a note
- `POST /api/delete` — Delete a note
- `POST /api/rename` — Rename a note
- `POST /api/list` — List all notes

## Customization

- **Styling:** Edit `src/styles.css` for custom themes.
- **Editor options:** See `src/app.js` for Toast UI Editor configuration.

## Development

- Edit frontend files in `src/`
- Edit backend in `server.js`
- Restart Docker after backend changes:  
  ```sh
  docker-compose restart
  ```

## License

MIT

---

**Made with ❤️ using [Toast UI Editor](https://ui.toast.com/tui-editor) and Node.js**