const ALLOWED_HTML_TAGS = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'li',
  'ol',
  'p',
  'pre',
  'strong',
  'ul',
]);

function isSafeHref(value) {
  return (
    value.startsWith('http://')
    || value.startsWith('https://')
    || value.startsWith('mailto:')
    || value.startsWith('#')
    || value.startsWith('/')
    || value.startsWith('./')
    || value.startsWith('../')
  );
}

function sanitizeNode(node, documentRef) {
  if (node.nodeType === Node.TEXT_NODE) {
    return documentRef.createTextNode(node.textContent || '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return documentRef.createDocumentFragment();
  }

  const tagName = node.tagName.toLowerCase();
  if (!ALLOWED_HTML_TAGS.has(tagName)) {
    const fragment = documentRef.createDocumentFragment();
    Array.from(node.childNodes).forEach((child) => {
      fragment.appendChild(sanitizeNode(child, documentRef));
    });
    return fragment;
  }

  const safeElement = documentRef.createElement(tagName);

  if (tagName === 'a') {
    const href = node.getAttribute('href') || '';
    if (href && isSafeHref(href)) {
      safeElement.setAttribute('href', href);
      safeElement.setAttribute('rel', 'noopener noreferrer');
      safeElement.setAttribute('target', '_blank');
    }
  }

  Array.from(node.childNodes).forEach((child) => {
    safeElement.appendChild(sanitizeNode(child, documentRef));
  });

  return safeElement;
}

export function sanitizeMarkedHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html;

  const safeRoot = document.createElement('div');
  Array.from(template.content.childNodes).forEach((child) => {
    safeRoot.appendChild(sanitizeNode(child, document));
  });

  return safeRoot.innerHTML;
}
