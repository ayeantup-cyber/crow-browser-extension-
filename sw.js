```javascript
// World Words Hub — Firefox MV3 Background Script

const api = typeof browser !== "undefined" ? browser : chrome;

const MENU_ID = "analyze-word";

/*
 * Create the context-menu item when the extension is installed
 * or updated.
 */
api.runtime.onInstalled.addListener(() => {
  console.log("World Words Hub Extension Installed.");

  // Avoid duplicate menu entries after reload/update.
  api.contextMenus.remove(MENU_ID).catch(() => {});

  api.contextMenus.create({
    id: MENU_ID,
    title: "Analyze '%s' in Words Hub",
    contexts: ["selection"]
  });
});


/*
 * Handle:
 *
 * Webpage
 *   ↓
 * Select text
 *   ↓
 * Right click
 *   ↓
 * Analyze "word" in Words Hub
 */
api.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_ID) {
    return;
  }

  if (!info.selectionText) {
    return;
  }

  const selectedText = info.selectionText.trim();

  if (!selectedText) {
    return;
  }

  try {
    /*
     * Store the selected word temporarily so app.js
     * can retrieve it when index.html opens.
     */
    await api.storage.local.set({
      targetWord: selectedText
    });

    /*
     * Open the extension application in a new tab.
     *
     * This is more reliable than trying to programmatically
     * open the browser-action popup.
     */
    await api.tabs.create({
      url: api.runtime.getURL("index.html")
    });

  } catch (error) {
    console.error(
      "World Words Hub context-menu error:",
      error
    );
  }
});
```
