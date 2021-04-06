import browser from 'webextension-polyfill';
import formatString from 'string-format';

import optionsStorage from './options-storage.js';

const JSON_CONTENT = { 'Content-Type': 'application/json' };

function formatBody(template, object) {
  const formatted = {};
  Object.entries(template).forEach(([key, value]) => {
    switch (typeof value) {
      case 'object':
        formatted[key] = formatBody(value, object);
        break;
      case 'string':
        formatted[key] = formatString(value, object);
        break;
      default:
        formatted[key] = value;
        break;
    }
  });
  return formatted;
}

const quarantine = object =>
  optionsStorage.getAll().then(({ quarantineBody, quarantineMethod, quarantineURL }) => {
    const url = formatString(quarantineURL, object)
    const bodyTemplate = JSON.parse(quarantineBody);
    const body = JSON.stringify(formatBody(bodyTemplate, object));
    return fetch(url, { method: quarantineMethod, headers: JSON_CONTENT, body })
  })

browser.runtime.onMessage.addListener(data => {
  const { feature, action, object } = data;

  switch ([feature, action].join('.')) {
    case 'testing.quarantine':
      return quarantine(object);
    default:
      console.error('Unknown message', data);
  }
});
