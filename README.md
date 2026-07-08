[README-v3.md](https://github.com/user-attachments/files/29785289/README-v3.md)
# Triple Scraper Ultimate 🚀

A powerful, customizable Chrome extension for web scraping. Features include manual and batch data extraction, auto-scrolling, preset management, and built-in monetization via [ExtensionPay](https://extensionpay.com/).

## 🌟 Features
- **Visual Element Selector**: Easily point and click to select which data fields to scrape.
- **Manual & Batch Modes**: Scrape a single page, or provide a list of URLs for automated background scraping.
- **Auto-Scroll**: Automatically scroll to the bottom of pages to load dynamic content before scraping.
- **Shadow DOM UI**: The scraper interface is injected safely into pages without clashing with the website's native CSS.
- **Preset Management**: Save and load your configuration for different websites.
- **CSV Export**: Instantly download your scraped data as a CSV file.
- **Built-in Monetization**: Integrated with `ExtPay.js` to handle Pro/Free user states.

---

## 🛠️ Installation (Developer Mode)

To run this extension locally on your browser:

1. Clone or download this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Toggle on **Developer mode** in the top right corner.
4. Click **Load unpacked** in the top left corner.
5. Select the folder containing these files (`manifest.json`, `background.js`, `content.js`, etc.).
6. Pin the extension to your toolbar for easy access!

---

## 📖 How to Use

1. **Launch the GUI**: Click the extension icon in your Chrome toolbar.
2. **Add Fields**: Click **+ Add Field**, then click on any text element on the webpage you want to extract. Give it a name.
3. **Optional Settings**: 
   * Check **Auto-Scroll** if the page requires scrolling to load data.
   * Click **👆 Set Click** if a button needs to be clicked before data is revealed.
4. **Scraping**:
   * **Manual**: Navigate to the "Manual Mode" tab and click **Scrape This Page**.
   * **Batch**: Navigate to the "Batch / Auto" tab, paste a list of URLs (one per line), configure your delay settings, and click **Start Batch**.
5. **Download**: Click **📥 Download Excel** at the bottom to export your collected data.

---

## 🧑‍💻 Customization Guide

This code is built to be easily customizable. Here is how you can tweak it to your needs:

### 1. Update ExtensionPay (Monetization)
If you want to use your own ExtensionPay account to charge users:
- Open `background.js` and `content.js`.
- Search for `data-scraper-immortal`.
- Replace it with your actual ExtensionPay extension ID.
```javascript
// In background.js & content.js
const EXTPAY_ID = 'your-real-extpay-id'; 
```

### 2. Customize the UI / Styling
The UI is injected using a **Shadow DOM** to prevent CSS bleeding. 
- Open `content.js` and locate the `const html = \`...\`` block.
- You can modify the HTML structure there.
- To change colors and styles, edit the `<style>` section at the bottom of that HTML string. The UI uses CSS variables (`--bg`, `--primary`, etc.) for easy theming.

### 3. Modifying Data Extraction Logic
If you need to extract specific attributes (like `href` from a link or `src` from an image) instead of just plain text:
- Open `content.js` and find the `extractData()` function.
- Modify this block:
```javascript
config.dataFields.forEach(field => {
    const el = document.querySelector(field.selector);
    // Change this logic to check for specific tags or attributes
    let text = el ? (el.innerText || el.textContent || '').trim() : '';
    row.push(text);
});
```

### 4. Changing Default Configurations
To adjust default timings or logic without relying on the UI, locate the `config` object in `content.js`:
```javascript
let config = {
    clickSelector: null,
    dataFields: [],
    autoScroll: false,
    scrollDuration: 2000,   // Default scroll wait in ms
    delayMin: 3000,         // Minimum delay between batch pages
    delayMax: 6000,         // Maximum delay between batch pages
    maxEmptyRuns: 3         // Pause batch after this many empty results
};
```

### 5. File Structure
* **`manifest.json`**: Chrome extension configuration (V3).
* **`background.js`**: Service worker handling ExtPay setup and extension icon clicks.
* **`content.js`**: The main scraping engine, UI injection, and logic state manager.
* **`ExtPay.js`**: The ExtensionPay library file.

---

## 📫 Let's Connect

Have a question, a feature request, or want to discuss a collaboration? Feel free to reach out to Vrushabh Rajesh Rathod:

* **Email:** [vrush32@gmail.com](mailto:vrush32@gmail.com)

---

## ☕ Support This Project

Triple Scraper Ultimate is open-source and completely free to use. If this tool has saved you hours of manual data entry or helped you close more leads, consider supporting its development! Your support fuels late-night coding sessions and helps keep this project actively maintained.

* **PayPal:** [paypal.me/vrush32](https://paypal.me/vrush32)
* **UPI:** `vrush32@pingpay`

For more ways to support, check out the [SUPPORT.md](SUPPORT.md) file!
