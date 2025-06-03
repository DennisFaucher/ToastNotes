document.addEventListener("DOMContentLoaded", function() {
      const editor = new toastui.Editor({
        el: document.querySelector('#editor'),
        height: '100%',
        initialEditType: 'markdown',
        previewStyle: 'tab',
        hideModeSwitch:	true,
        toolbarItems: [
          ['bold'],
          ['italic'],
          ['strike'],
          ['ul'],
          ['ol'],
          ['indent'],
          ['outdent'],
          ['table'],
          ['link'],
          ['code'],
          ['codeblock'],
        ],
        placeholder: 'Start writing your note...'
      });

      function getCurrentNoteName() {
        return document.getElementById('noteName').value.trim();
      }

      let lastSavedName = '';
      let lastSavedContent = '';

      // Helper to check if save is needed
      function checkSaveNeeded() {
        const name = getCurrentNoteName();
        const content = editor.getMarkdown();
        const saveBtn = document.getElementById('saveBtn');
        if (name && (name !== lastSavedName || content !== lastSavedContent)) {
          saveBtn.disabled = false;
          saveBtn.style.opacity = '';
          saveBtn.title = "Save";
        } else {
          saveBtn.disabled = true;
          saveBtn.style.opacity = '0.5';
          saveBtn.title = "No changes to save";
        }
      }

      // Call checkSaveNeeded on editor changes and note name changes
      editor.on('change', checkSaveNeeded);
      document.getElementById('noteName').addEventListener('input', checkSaveNeeded);

      // Update lastSavedName/content after saving
      document.getElementById('saveBtn').onclick = async function() {
        const name = getCurrentNoteName();
        if (!name) return alert('Enter a note name!');
        const content = editor.getMarkdown();
        const res = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, content })
        });
        const data = await res.json();
        if (data.success) {
          alert(`Note "${name}" saved!`);
          lastSavedName = name;
          lastSavedContent = content;
          checkSaveNeeded();
        } else {
          alert('Save failed: ' + (data.error || 'Unknown error'));
        }
      };

      // Add this function to open the folder picker for new notes
      async function pickNoteDirectory() {
        const modal = document.getElementById('openModal');
        const noteList = document.getElementById('noteList');
        const noteSearch = document.getElementById('noteSearch');
        noteList.innerHTML = '<li>Loading...</li>';
        modal.style.display = 'block';

        // Fetch the list of notes (for folder structure)
        const res = await fetch('/api/list-with-content');
        const data = await res.json();
        if (data.success) {
          // Build a tree of folders only (ignore files)
          const allNotePaths = data.notes.map(n => n.name);
          const folderTree = {};
          allNotePaths.forEach(notePath => {
            const parts = notePath.split('/');
            let node = folderTree;
            for (let i = 0; i < parts.length - 1; i++) {
              if (!node[parts[i]]) node[parts[i]] = {};
              node = node[parts[i]];
            }
          });

          // Render the folder tree
          function renderFolderTree(node, parentPath = '') {
            const ul = document.createElement('ul');
            for (const key in node) {
              const li = document.createElement('li');
              li.innerHTML = `<i class="fa-regular fa-folder" style="margin-right:6px;"></i>${key}`;
              li.style.fontWeight = 'bold';
              li.style.cursor = 'pointer';
              li.onclick = (e) => {
                e.stopPropagation();
                // Set noteName to selected folder path + '/'
                document.getElementById('noteName').value = (parentPath ? parentPath + '/' : '') + key + '/';
                modal.style.display = 'none';
              };
              // Recursively render subfolders
              const childUl = renderFolderTree(node[key], (parentPath ? parentPath + '/' : '') + key);
              if (Object.keys(node[key]).length > 0) {
                li.appendChild(childUl);
              }
              ul.appendChild(li);
            }
            return ul;
          }

          noteList.innerHTML = '';
          const treeEl = renderFolderTree(folderTree);
          noteList.appendChild(treeEl);
        } else {
          noteList.innerHTML = '<li>Error loading folders</li>';
        }

        // Hide search for this modal usage
        noteSearch.style.display = 'none';
      }

      document.getElementById('newBtn').onclick = function() {
        // Open folder picker modal
        pickNoteDirectory().then(() => {
          // After modal closes, user can type the note name after the selected path
          // Optionally, focus the noteName field
          setTimeout(() => document.getElementById('noteName').focus(), 100);
        });
        // Clear editor content
        editor.setMarkdown('');
      };

      document.getElementById('deleteBtn').onclick = async function() {
        const name = getCurrentNoteName();
        if (!name) return alert('Enter a note name!');
        if (!confirm(`Delete note "${name}"?`)) return;
        const res = await fetch('/api/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        const data = await res.json();
        if (data.success) {
          document.getElementById('noteName').value = '';
          editor.setMarkdown('');
          alert(`Note "${name}" deleted!`);
        } else {
          alert('Delete failed: ' + (data.error || 'Unknown error'));
        }
      };

      document.getElementById('imageBtn').onclick = function() {
        document.getElementById('imageInput').click();
      };

      document.getElementById('imageInput').onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success && data.url) {
          const markdown = `![${file.name}](${data.url})`;
          if (editor.getCurrentModeEditor && editor.getCurrentModeEditor().replaceSelection) {
            editor.getCurrentModeEditor().replaceSelection(markdown);
          } else if (editor.insertText) {
            editor.insertText(markdown);
          }
        } else {
          alert('Image upload failed: ' + (data.error || 'Unknown error'));
        }
        e.target.value = '';
      };

      // Helper: Convert flat note paths to a tree structure
      function buildNoteTree(notes) {
        const root = {};
        notes.forEach(notePath => {
          const parts = notePath.split('/');
          let node = root;
          parts.forEach((part, idx) => {
            if (!node[part]) {
              node[part] = (idx === parts.length - 1) ? null : {};
            }
            node = node[part];
          });
        });
        return root;
      }

      // Helper: Render the tree as a nested <ul>, with all folders expanded by default
      function renderNoteTree(node, parentPath = '') {
        const ul = document.createElement('ul');
        for (const key in node) {
          const li = document.createElement('li');
          if (node[key] === null) {
            // It's a file (note)
            li.innerHTML = `<i class="fa-regular fa-file-lines" style="margin-right:6px;"></i>${key}`;
            li.style.cursor = 'pointer';
            li.onclick = () => {
              const noteFullPath = (parentPath ? parentPath + '/' : '') + key;
              openNote(noteFullPath);
            };
          } else {
            // It's a folder
            li.innerHTML = `<i class="fa-regular fa-folder" style="margin-right:6px;"></i>${key}`;
            li.style.fontWeight = 'bold';
            li.style.cursor = 'pointer';
            // Always expanded by default
            const childUl = renderNoteTree(node[key], (parentPath ? parentPath + '/' : '') + key);
            childUl.style.display = 'block';
            li.onclick = function(e) {
              e.stopPropagation();
              // Optionally, allow manual collapse/expand
              childUl.style.display = (childUl.style.display === 'none') ? 'block' : 'none';
            };
            li.appendChild(childUl);
          }
          ul.appendChild(li);
        }
        return ul;
      }

      let allNotes = []; // Store all notes with content for filtering

      document.getElementById('openBtn').onclick = async function() {
        const modal = document.getElementById('openModal');
        const noteList = document.getElementById('noteList');
        const noteSearch = document.getElementById('noteSearch');
        noteList.innerHTML = '<li>Loading...</li>';
        modal.style.display = 'block';

        const res = await fetch('/api/list-with-content');
        const data = await res.json();
        if (data.success) {
          allNotes = data.notes; // [{name, content}]
          renderFilteredNotes('');
        } else {
          noteList.innerHTML = '<li>Error loading notes</li>';
        }

        // Focus search field when modal opens
        setTimeout(() => noteSearch && noteSearch.focus(), 100);
      };

      // Filter and render notes by content or name
      function renderFilteredNotes(searchTerm) {
        const noteList = document.getElementById('noteList');
        let filtered = allNotes;
        if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          filtered = allNotes.filter(n =>
            n.name.toLowerCase().includes(lower) ||
            n.content.toLowerCase().includes(lower)
          );
        }
        noteList.innerHTML = '';
        if (filtered.length === 0) {
          noteList.innerHTML = '<li>No notes found</li>';
        } else {
          // Build and render the tree as before
          const tree = buildNoteTree(filtered.map(n => n.name));
          const treeEl = renderNoteTree(tree);
          noteList.appendChild(treeEl);
        }
      }

      // Listen for search input
      document.getElementById('noteSearch').addEventListener('input', function(e) {
        renderFilteredNotes(e.target.value);
      });

      document.getElementById('closeModal').onclick = function() {
        document.getElementById('openModal').style.display = 'none';
      };
      window.onclick = function(event) {
        const modal = document.getElementById('openModal');
        if (event.target === modal) modal.style.display = 'none';
      };

      document.getElementById('printBtn').onclick = function() {
        const markdown = editor.getMarkdown();
        const html = marked.parse(markdown);

        // Open a new window for printing
        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Note</title>
              <link rel="stylesheet" href="styles.css">
              <style>
                body { font-family: 'Atkinson Hyperlegible', Arial, sans-serif; margin: 40px; }
              </style>
            </head>
            <body>
              ${html}
              <script>
                window.onload = function() { window.print(); }
              <\/script>
            </body>
          </html>
        `);
        printWindow.document.close();
      };

      async function openNote(name) {
        // Check for unsaved changes before opening a new note
        const currentName = getCurrentNoteName();
        const currentContent = editor.getMarkdown();
        if (
          currentName &&
          (currentName !== lastSavedName || currentContent !== lastSavedContent)
        ) {
          const shouldSave = confirm('You have unsaved changes. Save before opening another note?');
          if (shouldSave) {
            const res = await fetch('/api/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: currentName, content: currentContent })
            });
            const data = await res.json();
            if (data.success) {
              lastSavedName = currentName;
              lastSavedContent = currentContent;
              checkSaveNeeded();
            } else {
              alert('Save failed: ' + (data.error || 'Unknown error'));
              return; // Abort opening the new note if save fails
            }
          } else {
            return; // <--- Add this line: abort if user cancels
          }
        }

        // Now open the selected note
        const openRes = await fetch('/api/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        const openData = await openRes.json();
        if (openData.success) {
          document.getElementById('noteName').value = name;
          editor.setMarkdown(openData.content);
          lastSavedName = name;
          lastSavedContent = openData.content;
          checkSaveNeeded();
          document.getElementById('openModal').style.display = 'none';
        } else {
          alert('Failed to open note: ' + (openData.error || 'Unknown error'));
        }
      }

      setInterval(async function autoSaveNote() {
        const name = getCurrentNoteName();
        const content = editor.getMarkdown();
        // Only auto-save if there are unsaved changes and a note name is present
        if (
          name &&
          (name !== lastSavedName || content !== lastSavedContent)
        ) {
          const res = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, content })
          });
          const data = await res.json();
          if (data.success) {
            lastSavedName = name;
            lastSavedContent = content;
            checkSaveNeeded();
            // Optionally, show a subtle autosave indicator here
          }
        }
      }, 5 * 60 * 1000); // 5 minutes in milliseconds

      document.getElementById('dateBtn').onclick = function() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        if (editor.getCurrentModeEditor && editor.getCurrentModeEditor().replaceSelection) {
          editor.getCurrentModeEditor().replaceSelection(dateStr);
        } else if (editor.insertText) {
          editor.insertText(dateStr);
        }
      };

      document.getElementById('renameBtn').onclick = async function() {
        const oldName = getCurrentNoteName();
        if (!oldName) {
          alert('No note selected to rename.');
          return;
        }
        const newName = prompt('Enter new name for the note:', oldName);
        if (!newName || newName.trim() === '' || newName === oldName) return;

        // Call backend to rename the note
        const res = await fetch('/api/rename', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldName, newName })
        });
        const data = await res.json();
        if (!data.success) {
          alert('Rename failed: ' + (data.error || 'Unknown error'));
          return;
        }

        // Update UI and internal state
        document.getElementById('noteName').value = newName;
        lastSavedName = newName;
        checkSaveNeeded && checkSaveNeeded();
        alert(`Note renamed to "${newName}"`);
      };
  });