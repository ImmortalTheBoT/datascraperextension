importScripts('ExtPay.js'); // Ensure ExtPay.js is in the same folder

// REPLACE THIS WITH YOUR ACTUAL ID FROM EXTENSIONPAY.COM
const extpay = ExtPay('data-scraper-immortal');

extpay.startBackground();

// Listen for clicks on the extension icon to trigger the GUI in the active tab
chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            // Check if the openGui function exists in the content script scope
            if (window.scrapperOpenGui) {
                window.scrapperOpenGui();
            } else {
                alert("Please refresh the page to load the scraper.");
            }
        }
    });
});