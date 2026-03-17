// Changelog: frame en canvas + historial de versiones

const CHANGELOG_FRAME_NAME = 'Changelog';
const CHANGELOG_PAGE_NAME = 'Changelog';
const PLUGIN_DATA_KEY = 'changelog';

var COMMENT_ICONS = {
  added: '\uD83D\uDE80 ',      // 🚀 Añadido
  deleted: '\uD83D\uDC80 ',    // 💀 Borrado
  changed: '\uD83D\uDEE0\uFE0F ', // 🛠️ Cambio
  fixed: '\uD83D\uDC8A ',     // 💊 Fixed
  custom: ''
};
var COMMENT_LABELS = {
  added: 'Added',
  deleted: 'Deleted',
  changed: 'Changed',
  fixed: 'Fixed',
  custom: 'Custom'
};

function parseTextIntoBlocks(text) {
  var raw = (String(text || '').trim() || '');
  if (!raw) return [{ type: null, text: '(No description)' }];
  var lines = raw.split(/\n/);
  var blocks = [];
  var current = null;
  function detectType(line) {
    var t = line.trim().replace(/^[^\x00-\x7F]+\s*/, '').trim();
    if (t === 'Added') return 'added';
    if (t === 'Deleted') return 'deleted';
    if (t === 'Changed') return 'changed';
    if (t === 'Fixed') return 'fixed';
    if (t === 'Custom') return 'custom';
    return null;
  }
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var type = detectType(line);
    if (type !== null) {
      if (current) blocks.push(current);
      current = { type: type, text: '' };
    } else {
      if (current) current.text += (current.text ? '\n' : '') + line;
      else current = { type: null, text: line };
    }
  }
  if (current) blocks.push(current);
  var hasTyped = false;
  for (var j = 0; j < blocks.length; j++) {
    if (blocks[j].type !== null) { hasTyped = true; break; }
  }
  if (hasTyped) {
    blocks = blocks.filter(function (b) { return b.type !== null; });
  }
  return blocks.length ? blocks : [{ type: null, text: raw }];
}

function getTargetPage(pageId) {
  var pages = figma.root.children;
  for (var i = 0; i < pages.length; i++) {
    if (pages[i].id === pageId) return pages[i];
  }
  return figma.currentPage;
}

function getOrCreateChangelogPage() {
  var pages = figma.root.children;
  for (var i = 0; i < pages.length; i++) {
    if (pages[i].name === CHANGELOG_PAGE_NAME) return pages[i];
  }
  var page = figma.createPage();
  page.name = CHANGELOG_PAGE_NAME;
  figma.root.appendChild(page);
  return page;
}

function getChangelogFrame(page) {
  var ch = page.children;
  if (!ch) return null;
  for (var i = 0; i < ch.length; i++) {
    if (ch[i].name === CHANGELOG_FRAME_NAME && ch[i].type === 'FRAME') {
      return ch[i];
    }
  }
  return null;
}

function getAllEntries(frame) {
  if (!frame) return [];
  try {
    var raw = frame.getPluginData(PLUGIN_DATA_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveAllEntries(frame, entries) {
  frame.setPluginData(PLUGIN_DATA_KEY, JSON.stringify(entries));
}

function formatDate(iso) {
  var d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
}

var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatDateOnly(iso) {
  var d = new Date(iso);
  var month = MONTH_NAMES[d.getMonth()];
  var day = d.getDate();
  var year = d.getFullYear();
  return month + ' ' + day + ', ' + year;
}

function formatTime(iso) {
  var d = new Date(iso);
  var h = d.getHours();
  var m = d.getMinutes();
  var ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return h + ':' + (m < 10 ? '0' + m : m) + ampm;
}

function timeAgo(iso) {
  var d = new Date(iso);
  var now = new Date();
  var sec = Math.floor((now - d) / 1000);
  if (sec < 60) return 'just now';
  var min = Math.floor(sec / 60);
  if (min < 60) return min === 1 ? '1 minute' : min + ' minutes';
  var hr = Math.floor(min / 60);
  if (hr < 24) return hr === 1 ? '1 hour' : hr + ' hours';
  var day = Math.floor(hr / 24);
  if (day < 30) return day === 1 ? '1 day' : day + ' days';
  var month = Math.floor(day / 30);
  if (month < 12) return month === 1 ? '1 month' : month + ' months';
  var year = Math.floor(month / 12);
  return year === 1 ? '1 year' : year + ' years';
}

function nextVersion(entries, type) {
  if (type === 'beta') {
    var betaNum = 1;
    for (var i = 0; i < entries.length; i++) {
      var m = String(entries[i].version || '').match(/beta\s*0?(\d+)/i);
      if (m) betaNum = Math.max(betaNum, parseInt(m[1], 10) + 1);
    }
    return 'beta ' + (betaNum < 10 ? '0' + betaNum : betaNum);
  }
  var major = 0, minor = 0, patch = 0;
  var v = entries.length > 0 ? String(entries[0].version || 'v0.0.0') : 'v0.0.0';
  var match = v.match(/v?(\d+)\.(\d+)\.(\d+)/);
  if (match) { major = +match[1]; minor = +match[2]; patch = +match[3]; }
  if (type === 'major') { major++; minor = 0; patch = 0; return 'v' + major + '.' + minor + '.' + patch; }
  else if (type === 'minor') { minor++; patch = 0; return 'v' + major + '.' + minor + '.' + patch; }
  else { patch++; return 'v' + major + '.' + minor + '.' + patch; }
}

function nextVersionUxUi(entries, type, uxUiType) {
  var prefix = (uxUiType || 'UI').toUpperCase() + ' - ';
  if (type === 'beta') {
    var betaNum = 1;
    var re = new RegExp(uxUiType + '\\s*-\\s*beta\\s*0?(\\d+)', 'i');
    for (var i = 0; i < entries.length; i++) {
      var m = String(entries[i].version || '').match(re);
      if (m) betaNum = Math.max(betaNum, parseInt(m[1], 10) + 1);
    }
    return prefix + 'beta ' + (betaNum < 10 ? '0' + betaNum : betaNum);
  }
  return prefix + type;
}

function rgb(r, g, b) { return { r: r / 255, g: g / 255, b: b / 255 }; }

function getAuthorInfo() {
  try {
    if (figma.currentUser) {
      return { name: figma.currentUser.name || 'User', photoUrl: figma.currentUser.photoUrl || null };
    }
  } catch (e) {}
  return { name: 'User', photoUrl: null };
}

var fontR = { family: 'Inter', style: 'Regular' };
var fontB = { family: 'Inter', style: 'Bold' };
var fontSB = { family: 'Inter', style: 'Semi Bold' };

var avS = 18;
var avG = 6;

function clearFrame(frame) {
  var ch = frame.children;
  if (!ch) return;
  for (var k = ch.length - 1; k >= 0; k--) {
    if (ch[k] && typeof ch[k].remove === 'function') ch[k].remove();
  }
}

async function loadPage(page) {
  if (typeof page.loadAsync === 'function') await page.loadAsync();
}

async function createAvatarNode(photoUrl, x, y) {
  if (!photoUrl || typeof figma.createImageAsync !== 'function') return null;
  try {
    var image = await figma.createImageAsync(photoUrl);
    var rect = figma.createEllipse();
    rect.resize(avS, avS);
    rect.x = x;
    rect.y = y;
    rect.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
    return rect;
  } catch (e) { return null; }
}

async function ensureFrame(page) {
  var frame = getChangelogFrame(page);
  if (!frame) {
    frame = figma.createFrame();
    frame.name = CHANGELOG_FRAME_NAME;
    frame.x = 0;
    frame.y = 0;
    frame.fills = [{ type: 'SOLID', color: rgb(255, 255, 255) }];
    page.appendChild(frame);
  }
  return frame;
}

var TITLE_HEIGHT = 56;
var ENTRY_BOTTOM_GAP = 20;
var LABEL_TO_DESC_GAP = 10;
var FRAME_WIDTH = 400;
var PAD = 20;
var descW = FRAME_WIDTH - PAD * 2;
var lineHeight = 18;

var SEPARATOR_COLOR = rgb(224, 229, 235);

var CALENDAR_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.75 6.19444H14.75M3.86111 0.75V2.30556M11.6389 0.75V2.30556M3.23889 14.75H12.2611C13.1323 14.75 13.5679 14.75 13.9007 14.5804C14.1933 14.4313 14.4313 14.1933 14.5804 13.9007C14.75 13.5679 14.75 13.1323 14.75 12.2611V4.79444C14.75 3.92325 14.75 3.48765 14.5804 3.1549C14.4313 2.8622 14.1933 2.62423 13.9007 2.4751C13.5679 2.30556 13.1323 2.30556 12.2611 2.30556H3.23889C2.3677 2.30556 1.9321 2.30556 1.59935 2.4751C1.30665 2.62423 1.06868 2.8622 0.919548 3.1549C0.75 3.48765 0.75 3.92325 0.75 4.79444V12.2611C0.75 13.1323 0.75 13.5679 0.919548 13.9007C1.06868 14.1933 1.30665 14.4313 1.59935 14.5804C1.9321 14.75 2.36769 14.75 3.23889 14.75Z" stroke="#6B7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function createDateHeaderFrame(dateStr) {
  var wrap = figma.createFrame();
  wrap.name = 'DateHeader';
  wrap.fills = [{ type: 'SOLID', color: rgb(243, 244, 246) }];
  wrap.cornerRadius = 6;
  wrap.layoutAlign = 'STRETCH';
  setAutoLayout(wrap, { vertical: false, itemSpacing: 6, padding: 8, paddingLeft: 12, paddingRight: 12 });
  wrap.counterAxisAlignItems = 'CENTER';
  try {
    var icon = figma.createNodeFromSvg(CALENDAR_SVG);
    icon.resize(16, 16);
    wrap.appendChild(icon);
  } catch (e) {}
  var dateText = figma.createText();
  dateText.fontName = fontR;
  dateText.fontSize = 12;
  dateText.fills = [{ type: 'SOLID', color: rgb(105, 117, 134) }];
  dateText.characters = dateStr;
  wrap.appendChild(dateText);
  wrap.resize(FRAME_WIDTH, 36);
  return wrap;
}

function getDateHeaderDate(node) {
  if (!node || node.name !== 'DateHeader') return null;
  if (node.type === 'TEXT') return node.characters;
  if (node.type === 'FRAME' || node.type === 'GROUP') {
    for (var i = 0; i < node.children.length; i++) {
      if (node.children[i].type === 'TEXT') return node.children[i].characters;
    }
  }
  return null;
}

function setAutoLayout(frame, opts) {
  frame.layoutMode = opts.vertical ? 'VERTICAL' : 'HORIZONTAL';
  frame.primaryAxisSizingMode = opts.primarySizing || 'AUTO';
  frame.counterAxisSizingMode = opts.counterSizing || 'AUTO';
  frame.primaryAxisAlignItems = opts.primaryAlign || 'MIN';
  frame.counterAxisAlignItems = opts.counterAlign || 'MIN';
  if (opts.padding !== undefined) {
    frame.paddingLeft = frame.paddingRight = frame.paddingTop = frame.paddingBottom = opts.padding;
  }
  if (opts.itemSpacing !== undefined) frame.itemSpacing = opts.itemSpacing;
}

async function createEntryFrame(e, opts) {
  var groupedByDate = opts && opts.groupedByDate;
  var entryFrame = figma.createFrame();
  entryFrame.name = 'Entry';
  entryFrame.fills = [];
  entryFrame.layoutAlign = 'STRETCH';
  setAutoLayout(entryFrame, { vertical: true, itemSpacing: 6, primarySizing: 'AUTO', counterSizing: 'FIXED', padding: 0 });

  var typeKey = (e.versionType || e.type || 'patch').toLowerCase();
  var rawVersion = String(e.version || (typeKey === 'beta' ? 'beta 01' : 'v0.1.1'));
  var versionStr;
  if (e.uxUiType) {
    versionStr = rawVersion;
    if (!groupedByDate) versionStr += ' on ' + formatDateOnly(e.date);
  } else if (typeKey === 'beta') {
    var betaM = rawVersion.match(/beta\s*0?(\d+)/i);
    var betaNum = betaM ? parseInt(betaM[1], 10) : 1;
    versionStr = 'beta ' + (betaNum < 10 ? '0' + betaNum : String(betaNum));
    if (!groupedByDate) versionStr += ' on ' + formatDateOnly(e.date);
  } else {
    versionStr = groupedByDate ? rawVersion : (rawVersion + ' on ' + formatDateOnly(e.date));
  }
  var versionStyles = {
    major: { color: rgb(69, 104, 246), size: 24, font: fontSB },
    minor: { color: rgb(75, 85, 101), size: 16, font: fontSB },
    patch: { color: rgb(105, 117, 134), size: 12, font: fontR },
    beta: { color: rgb(105, 117, 134), size: 12, font: fontR }
  };
  var style = versionStyles[typeKey] || versionStyles.patch;

  var versionRow = figma.createFrame();
  versionRow.name = 'VersionRow';
  versionRow.fills = [];
  setAutoLayout(versionRow, { vertical: false, itemSpacing: 8, primarySizing: 'AUTO', counterSizing: 'AUTO', padding: 0 });
  versionRow.counterAxisAlignItems = 'CENTER';

  var ver = figma.createText();
  ver.fontName = style.font;
  ver.fontSize = style.size;
  ver.fills = [{ type: 'SOLID', color: style.color }];
  ver.characters = versionStr;
  versionRow.appendChild(ver);

  entryFrame.appendChild(versionRow);

  var meta = figma.createText();
  meta.fontName = fontR;
  meta.fontSize = 12;
  meta.fills = [{ type: 'SOLID', color: rgb(156, 163, 175) }];
  meta.characters = (e.author || 'Violeta') + ' committed at ' + formatTime(e.date);
  meta.textAutoResize = 'HEIGHT';
  meta.resize(Math.max(120, descW - 80), 14);

  var userRow = figma.createFrame();
  userRow.name = 'UserRow';
  userRow.fills = [];
  setAutoLayout(userRow, { vertical: false, itemSpacing: 6, primarySizing: 'AUTO', counterSizing: 'AUTO', padding: 0 });
  var avatar = await createAvatarNode(e.photoUrl, 0, 0);
  if (avatar) userRow.appendChild(avatar);
  userRow.appendChild(meta);

  entryFrame.appendChild(userRow);

  var blocks = parseTextIntoBlocks(e.text);
  var commitBoxPadding = 10;
  var commitBoxDescW = descW - commitBoxPadding * 2;
  var commitBoxFullW = FRAME_WIDTH - commitBoxPadding * 2;
  var isMajor = typeKey === 'major';
  var LABEL_COLOR = isMajor ? rgb(69, 104, 246) : rgb(55, 65, 81);
  var DESC_COLOR = isMajor ? rgb(69, 104, 246) : rgb(75, 84, 99);

  for (var b = 0; b < blocks.length; b++) {
    var block = blocks[b];
    var hasTypeLine = block.type !== null;
    var commitBox = figma.createFrame();
    commitBox.name = 'Commit';
    if (isMajor) {
      commitBox.layoutAlign = 'STRETCH';
      commitBox.fills = [{ type: 'SOLID', color: rgb(239, 246, 255) }];
      commitBox.strokes = [{ type: 'SOLID', color: rgb(199, 215, 254) }];
      commitBox.strokeWeight = 1;
      commitBox.cornerRadius = 8;
      setAutoLayout(commitBox, { vertical: true, itemSpacing: 4, padding: commitBoxPadding, primarySizing: 'AUTO', counterSizing: 'FIXED' });
    } else {
      commitBox.fills = [];
      setAutoLayout(commitBox, { vertical: true, itemSpacing: 4, padding: 0, primarySizing: 'AUTO', counterSizing: 'AUTO' });
    }
    if (hasTypeLine) {
      var labelLine = figma.createText();
      var icon = COMMENT_ICONS[block.type] || '';
      var label = COMMENT_LABELS[block.type] || 'Custom';
      labelLine.fontName = fontSB;
      labelLine.fontSize = 12;
      labelLine.fills = [{ type: 'SOLID', color: LABEL_COLOR }];
      labelLine.characters = icon + label;
      commitBox.appendChild(labelLine);
    }
    var textStr = (block.text || '').trim();
    if (textStr) {
      var desc = figma.createText();
      desc.fontName = fontR;
      desc.fontSize = 12;
      desc.fills = [{ type: 'SOLID', color: DESC_COLOR }];
      desc.characters = textStr;
      desc.textAutoResize = 'HEIGHT';
      var numLines = Math.max(1, textStr.split('\n').length, Math.ceil(textStr.length / Math.max(20, Math.floor(commitBoxDescW / 7))));
      desc.resize(isMajor ? commitBoxFullW : descW, Math.ceil(numLines * lineHeight));
      commitBox.appendChild(desc);
    }
    if (commitBox.children.length > 0) {
      entryFrame.appendChild(commitBox);
    }
  }

  var links = [];
  if (e.sourceLinks && e.sourceLinks.length) {
    for (var i = 0; i < e.sourceLinks.length; i++) {
      var item = e.sourceLinks[i];
      var u = (item && item.url) ? String(item.url).trim() : '';
      if (u) links.push({ label: (item.label && String(item.label).trim()) || '', url: u });
    }
  } else {
    var urls = e.sourceUrls && e.sourceUrls.length ? e.sourceUrls : (e.sourceUrl ? [e.sourceUrl] : []);
    for (var j = 0; j < urls.length; j++) {
      var u2 = String(urls[j]).trim();
      if (u2) links.push({ label: '', url: u2 });
    }
  }
  for (var u = 0; u < links.length; u++) {
    var lnk = links[u];
    var url = lnk.url;
    var displayLabel = lnk.label ? (lnk.label + ' \u2192') : (/figma\.com/i.test(url) ? 'View in Figma \u2192' : 'View link \u2192');
    var linkText = figma.createText();
    linkText.fontName = fontR;
    linkText.fontSize = 11;
    linkText.lineHeight = { value: 14, unit: 'PIXELS' };
    linkText.fills = [{ type: 'SOLID', color: rgb(69, 104, 246) }];
    linkText.characters = (links.length > 1 ? (u + 1) + '. ' : '') + displayLabel;
    linkText.textAutoResize = 'WIDTH_AND_HEIGHT';
    try {
      linkText.setRangeHyperlink(0, linkText.characters.length, { type: 'URL', value: url });
    } catch (err) {}
    entryFrame.appendChild(linkText);
  }

  entryFrame.resize(FRAME_WIDTH, entryFrame.height);
  return entryFrame;
}

function getEntryNode(node) {
  if (!node) return null;
  if (node.name === 'Entry') return node;
  return null;
}

function getMetaTextNode(entryFrame) {
  if (!entryFrame || entryFrame.type !== 'FRAME' || entryFrame.children.length < 2) return null;
  var userRow = entryFrame.children[1];
  if (!userRow || userRow.type !== 'FRAME' || userRow.children.length === 0) return null;
  var last = userRow.children[userRow.children.length - 1];
  return last && last.type === 'TEXT' ? last : null;
}

async function updateTimeAgoInEntryFrames(frame, entries) {
  try { await figma.loadFontAsync(fontR); } catch (e) {}
  var entryIndex = 0;
  var ch = frame.children;
  for (var i = 0; i < ch.length && entryIndex < entries.length; i++) {
    var entryNode = getEntryNode(ch[i]);
    if (!entryNode) continue;
    var entry = entries[entryIndex];
    var meta = getMetaTextNode(entryNode);
    if (meta && entry) {
      try { await figma.loadFontAsync(meta.fontName); } catch (e) {}
      meta.characters = (entry.author || 'Violeta') + ' committed at ' + formatTime(entry.date);
    }
    entryIndex++;
  }
}

async function insertNewEntry(frame, newEntry, allEntries, frameTitle) {
  try { await figma.loadFontAsync(fontR); } catch (e) {}
  try { await figma.loadFontAsync(fontB); } catch (e) { fontB = fontR; }
  try { await figma.loadFontAsync(fontSB); } catch (e) { fontSB = fontB; }

  var ch = frame.children;
  if (ch.length < 2) {
    return drawFrame(frame, allEntries, frameTitle);
  }

  var newDate = formatDateOnly(newEntry.date);
  var typeKey = (newEntry.versionType || 'patch').toLowerCase();
  var entryNode = await createEntryFrame(newEntry, { groupedByDate: true });

  var todayIdx = -1;
  for (var i = 1; i < ch.length; i++) {
    if (getDateHeaderDate(ch[i]) === newDate) { todayIdx = i; break; }
  }

  if (todayIdx === -1) {
    var dateHeader = createDateHeaderFrame(newDate);
    frame.insertChild(1, dateHeader);
    todayIdx = 1;
  }

  var insertIdx = todayIdx + 1;

  if (typeKey === 'major') {
    frame.insertChild(insertIdx, entryNode);
  } else {
    var nextChild = frame.children[insertIdx];
    if (nextChild && nextChild.name === 'IndentedGroup') {
      var subCol = null;
      for (var s = 0; s < nextChild.children.length; s++) {
        if (nextChild.children[s].name === 'SubEntries') { subCol = nextChild.children[s]; break; }
      }
      if (subCol) {
        subCol.insertChild(0, entryNode);
      } else {
        frame.insertChild(insertIdx, entryNode);
      }
    } else {
      var subCol = figma.createFrame();
      subCol.name = 'SubEntries';
      subCol.fills = [];
      subCol.layoutMode = 'VERTICAL';
      subCol.primaryAxisSizingMode = 'AUTO';
      subCol.counterAxisSizingMode = 'AUTO';
      subCol.itemSpacing = 16;
      subCol.appendChild(entryNode);

      var row = figma.createFrame();
      row.name = 'IndentedGroup';
      row.fills = [];
      row.layoutMode = 'HORIZONTAL';
      row.primaryAxisSizingMode = 'AUTO';
      row.counterAxisSizingMode = 'AUTO';
      row.itemSpacing = 10;
      row.counterAxisAlignItems = 'MIN';

      var line = figma.createRectangle();
      line.name = 'VerticalLine';
      line.fills = [{ type: 'SOLID', color: rgb(224, 229, 235) }];
      line.resize(1, 10);
      line.layoutAlign = 'STRETCH';
      line.layoutGrow = 0;

      row.appendChild(line);
      row.appendChild(subCol);
      frame.insertChild(insertIdx, row);
    }
  }

  await updateTimeAgoInEntryFrames(frame, allEntries);

  var frameWidth = FRAME_WIDTH + PAD * 2 + 11;
  var totalHeight = frame.paddingTop + frame.paddingBottom;
  var children = frame.children;
  for (var c = 0; c < children.length; c++) {
    totalHeight += Math.max(children[c].height, 0);
    if (c > 0) totalHeight += frame.itemSpacing;
  }
  frame.resize(frameWidth, Math.max(totalHeight, 120));

  saveAllEntries(frame, allEntries);
}

var UXUI_FRAME_PREFIX = 'Changelog UX/UI';
var UXUI_PAGE_NAME = 'Changelog UX/UI';

function getOrCreateUxUiPage(pageId) {
  if (pageId && pageId !== 'new') {
    return figma.getNodeByIdAsync(pageId).then(function (node) {
      if (node && node.type === 'PAGE') return node;
      return createNewUxUiPage();
    });
  }
  return Promise.resolve(createNewUxUiPage());
}

function createNewUxUiPage() {
  var page = figma.createPage();
  var pages = figma.root.children;
  var count = 0;
  for (var i = 0; i < pages.length; i++) {
    if (pages[i].name && pages[i].name.indexOf(UXUI_PAGE_NAME) === 0) count++;
  }
  page.name = count === 0 ? UXUI_PAGE_NAME : UXUI_PAGE_NAME + ' ' + (count + 1);
  figma.root.appendChild(page);
  return page;
}

function getOrCreateUxUiFrame(page) {
  var ch = page.children;
  for (var i = 0; i < ch.length; i++) {
    if (ch[i].type === 'FRAME' && ch[i].name === UXUI_FRAME_PREFIX) return ch[i];
  }
  var frame = figma.createFrame();
  frame.name = UXUI_FRAME_PREFIX;
  frame.x = 0;
  frame.y = 0;
  frame.fills = [{ type: 'SOLID', color: rgb(255, 255, 255) }];
  page.appendChild(frame);
  return frame;
}

async function drawFrame(frame, entries, frameTitle) {
  try { await figma.loadFontAsync(fontR); } catch (e) {}
  try { await figma.loadFontAsync(fontB); } catch (e) { fontB = fontR; }
  try { await figma.loadFontAsync(fontSB); } catch (e) { fontSB = fontB; }

  clearFrame(frame);

  var isUxUi = (frameTitle || '').indexOf('UX/UI') !== -1;
  frame.layoutMode = 'VERTICAL';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'FIXED';
  frame.primaryAxisAlignItems = 'MIN';
  frame.counterAxisAlignItems = 'MIN';
  frame.paddingLeft = frame.paddingTop = frame.paddingBottom = frame.paddingRight = PAD;
  frame.resize(FRAME_WIDTH + PAD * 2 + 11, 1);
  frame.itemSpacing = 20;
  frame.fills = [{ type: 'SOLID', color: rgb(255, 255, 255) }];
  frame.cornerRadius = 12;
  frame.strokes = [{ type: 'SOLID', color: rgb(224, 229, 235) }];
  frame.strokeWeight = 1;

  var title = figma.createText();
  title.fontName = fontB;
  title.fontSize = 24;
  title.fills = [{ type: 'SOLID', color: rgb(31, 41, 55) }];
  title.characters = frameTitle || 'Changelog';
  frame.appendChild(title);

  var dateGroups = {};
  var dateOrder = [];
  for (var i = 0; i < entries.length; i++) {
    var d = formatDateOnly(entries[i].date);
    if (!dateGroups[d]) {
      dateGroups[d] = [];
      dateOrder.push(d);
    }
    dateGroups[d].push(entries[i]);
  }

  for (var g = 0; g < dateOrder.length; g++) {
    var dateStr = dateOrder[g];
    var dateHeader = createDateHeaderFrame(dateStr);
    frame.appendChild(dateHeader);

    var dayEntries = dateGroups[dateStr];
    var pendingNonMajor = [];

    for (var i = 0; i < dayEntries.length; i++) {
      var e = dayEntries[i];
      var typeKey = (e.versionType || e.type || 'patch').toLowerCase();

      if (typeKey === 'major') {
        if (pendingNonMajor.length > 0) {
          var subCol = figma.createFrame();
          subCol.name = 'SubEntries';
          subCol.fills = [];
          subCol.layoutMode = 'VERTICAL';
          subCol.primaryAxisSizingMode = 'AUTO';
          subCol.counterAxisSizingMode = 'AUTO';
          subCol.itemSpacing = 16;
          for (var p = 0; p < pendingNonMajor.length; p++) {
            var subEntry = await createEntryFrame(pendingNonMajor[p], { groupedByDate: true });
            subCol.appendChild(subEntry);
          }
          var row = figma.createFrame();
          row.name = 'IndentedGroup';
          row.fills = [];
          row.layoutMode = 'HORIZONTAL';
          row.primaryAxisSizingMode = 'AUTO';
          row.counterAxisSizingMode = 'AUTO';
          row.itemSpacing = 10;
          row.counterAxisAlignItems = 'MIN';
          var line = figma.createRectangle();
          line.name = 'VerticalLine';
          line.fills = [{ type: 'SOLID', color: rgb(224, 229, 235) }];
          line.resize(1, 10);
          line.layoutAlign = 'STRETCH';
          line.layoutGrow = 0;
          row.appendChild(line);
          row.appendChild(subCol);
          frame.appendChild(row);
          pendingNonMajor = [];
        }
        var entryFrame = await createEntryFrame(e, { groupedByDate: true });
        frame.appendChild(entryFrame);
      } else {
        pendingNonMajor.push(e);
      }
    }

    if (pendingNonMajor.length > 0) {
      var subCol = figma.createFrame();
      subCol.name = 'SubEntries';
      subCol.fills = [];
      subCol.layoutMode = 'VERTICAL';
      subCol.primaryAxisSizingMode = 'AUTO';
      subCol.counterAxisSizingMode = 'AUTO';
      subCol.itemSpacing = 16;
      for (var p = 0; p < pendingNonMajor.length; p++) {
        var subEntry = await createEntryFrame(pendingNonMajor[p], { groupedByDate: true });
        subCol.appendChild(subEntry);
      }
      var row = figma.createFrame();
      row.name = 'IndentedGroup';
      row.fills = [];
      row.layoutMode = 'HORIZONTAL';
      row.primaryAxisSizingMode = 'AUTO';
      row.counterAxisSizingMode = 'AUTO';
      row.itemSpacing = 10;
      row.counterAxisAlignItems = 'MIN';
      var line = figma.createRectangle();
      line.name = 'VerticalLine';
      line.fills = [{ type: 'SOLID', color: rgb(224, 229, 235) }];
      line.resize(1, 10);
      line.layoutAlign = 'STRETCH';
      line.layoutGrow = 0;
      row.appendChild(line);
      row.appendChild(subCol);
      frame.appendChild(row);
    }
  }

  var footerRow = figma.createFrame();
  footerRow.name = 'Footer';
  footerRow.fills = [];
  setAutoLayout(footerRow, { vertical: false, itemSpacing: 0, padding: 0, primarySizing: 'AUTO', counterSizing: 'AUTO' });
  var footerGray = rgb(156, 163, 175);
  var footerPurple = rgb(139, 92, 246);
  var t1 = figma.createText();
  t1.fontName = fontR;
  t1.fontSize = 10;
  t1.fills = [{ type: 'SOLID', color: footerGray }];
  t1.characters = 'Made with ';
  footerRow.appendChild(t1);
  var t2 = figma.createText();
  t2.fontName = fontR;
  t2.fontSize = 10;
  t2.fills = [{ type: 'SOLID', color: footerPurple }];
  t2.characters = '\u2764';
  footerRow.appendChild(t2);
  var t3 = figma.createText();
  t3.fontName = fontR;
  t3.fontSize = 10;
  t3.fills = [{ type: 'SOLID', color: footerGray }];
  t3.characters = ' by Violeta';
  footerRow.appendChild(t3);
  frame.appendChild(footerRow);

  var frameWidth = FRAME_WIDTH + PAD * 2 + 11;
  var totalHeight = frame.paddingTop + frame.paddingBottom;
  var ch = frame.children;
  for (var c = 0; c < ch.length; c++) {
    totalHeight += Math.max(ch[c].height, 0);
    if (c > 0) totalHeight += frame.itemSpacing;
  }
  if (totalHeight < 150) {
    totalHeight = 140 + dateOrder.length * 56 + entries.length * 110;
  }
  frame.resize(frameWidth, Math.max(totalHeight, 120));

  saveAllEntries(frame, entries);
  return frame;
}

async function drawPage(page, entries) {
  await loadPage(page);
  var frame = await ensureFrame(page);
  return drawFrame(frame, entries, 'Changelog');
}

// ── UI ──

figma.showUI(__html__, { width: 560, height: 560 });

function buildVersionHistoryBody(text) {
  var blocks = parseTextIntoBlocks(text);
  var parts = [];
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    var icon = COMMENT_ICONS[b.type] || '';
    var label = b.type ? (COMMENT_LABELS[b.type] || 'Custom') : '';
    var line = (icon + label).trim();
    var comment = (b.text || '').trim();
    if (line) parts.push(line + (comment ? '\n' + comment : ''));
    else if (comment) parts.push(comment);
  }
  return parts.join('\n\n');
}

function maybeSaveVersionHistory(msg, version, text) {
  if (!msg.saveToVersionHistory || typeof figma.saveVersionHistoryAsync !== 'function') return Promise.resolve();
  var body = buildVersionHistoryBody(text);
  return new Promise(function (r) { setTimeout(r, 1200); }).then(function () {
    return figma.saveVersionHistoryAsync('Change log - ' + version, body);
  }).then(function (res) {
    if (res && res.id) figma.notify('Version saved to history');
  }).catch(function () {
    figma.notify('Save the file (Ctrl+S) for version history');
  });
}

function sendInit() {
  var pages = figma.root.children;
  var list = [];
  var curId = figma.currentPage.id;
  var changelogPageId = null;
  for (var i = 0; i < pages.length; i++) {
    if (pages[i].name === CHANGELOG_PAGE_NAME) changelogPageId = pages[i].id;
    list.push({ id: pages[i].id, name: pages[i].name, isCurrent: pages[i].id === curId });
  }
  figma.ui.postMessage({ type: 'init', pages: list, changelogPageId: changelogPageId });
}

figma.ui.onmessage = function (msg) {
  if (msg.type === 'init') { sendInit(); return; }

  if (msg.type === 'resize-ui') {
    var screen = msg.screen || 'screenMode';
    if (screen === 'screenUxUiCommit' || screen === 'screenFileCommit') {
      figma.ui.resize(560, 920);
    } else {
      figma.ui.resize(560, 560);
    }
    return;
  }

  if (msg.type === 'add-entry') {
    var isUxUi = msg.flow === 'uxui';
    var tpPromise = isUxUi ? getOrCreateUxUiPage(msg.uxuiPageId || 'new') : Promise.resolve(getOrCreateChangelogPage());

    tpPromise.then(function (tp) {
      return loadPage(tp).then(function () {
      var frame;
      var frameTitle = 'Changelog';
      if (isUxUi) {
        frame = getOrCreateUxUiFrame(tp);
        frameTitle = 'Changelog UX/UI';
      } else {
        frame = getChangelogFrame(tp);
        if (!frame) {
          frame = figma.createFrame();
          frame.name = CHANGELOG_FRAME_NAME;
          frame.x = 0;
          frame.y = 0;
          frame.fills = [{ type: 'SOLID', color: rgb(255, 255, 255) }];
          tp.appendChild(frame);
        }
      }
      var entries = getAllEntries(frame);

      var versionType = (msg.versionType || 'patch').toLowerCase();
      var uxUiType = isUxUi ? (String(msg.uxUiVersionType || 'ui').toUpperCase()) : null;
      var version = isUxUi ? nextVersionUxUi(entries, versionType, msg.uxUiVersionType || 'ui') : nextVersion(entries, versionType);
      var author = getAuthorInfo();
      var newEntry = {
        version: version,
        versionType: versionType,
        uxUiType: uxUiType,
        date: new Date().toISOString(),
        author: author.name,
        photoUrl: author.photoUrl,
        commentType: msg.commentType || 'added',
        text: String(msg.text || '').trim(),
        sourceLinks: (function () {
          if (Array.isArray(msg.sourceLinks) && msg.sourceLinks.length) {
            return msg.sourceLinks.filter(function (x) { return x && x.url && String(x.url).trim(); }).map(function (x) {
              var u = String(x.url).trim();
              if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
              return { label: (x.label && String(x.label).trim()) || '', url: u };
            });
          }
          var urls = Array.isArray(msg.sourceUrls) ? msg.sourceUrls.filter(function (u) { return u && String(u).trim(); }) : (msg.sourceUrl ? [String(msg.sourceUrl).trim()] : []);
          return urls.map(function (u) { var v = String(u).trim(); if (!/^https?:\/\//i.test(v)) v = 'https://' + v; return { label: '', url: v }; });
        }())
      };
      entries.unshift(newEntry);

      var doNotify = function () {
        figma.currentPage.selection = [frame];
        figma.viewport.scrollAndZoomIntoView([frame]);
        figma.notify('Changelog updated');
        if (!isUxUi && msg.saveToVersionHistory) return maybeSaveVersionHistory(msg, version, newEntry.text);
        return Promise.resolve();
      };

      var isFirstEntry = entries.length === 1;
      var renderPromise = isFirstEntry
        ? drawFrame(frame, entries, frameTitle)
        : insertNewEntry(frame, newEntry, entries, frameTitle);

      return renderPromise.then(function () {
        return figma.setCurrentPageAsync(tp).then(doNotify);
      });
      });
    }).catch(function (err) {
      figma.notify('Error: ' + (err.message || String(err)), { error: true });
    });
    return;
  }

  if (msg.type === 'cancel') { figma.closePlugin(); }
};

sendInit();
