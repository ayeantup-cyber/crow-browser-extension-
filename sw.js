// World Words Hub — Extension Background Script
const api = typeof browser !== 'undefined' ? browser : chrome;

api.runtime.onInstalled.addListener(() => {
  console.log("World Words Hub Extension Installed.");

  // Register context menu item
  api.contextMenus.create({
    id: "analyze-word",
    title: "Analyze '%s' in Words Hub",
    contexts: ["selection"]
  });
});

// Handle Context Menu click
api.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "analyze-word" && info.selectionText) {
    const selectedText = info.selectionText.trim();
    // Save selection to local storage so index.html can load it automatically on open
    api.storage.local.set({ targetWord: selectedText });
  }
});
