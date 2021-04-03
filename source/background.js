import browser from 'webextension-polyfill';

// eslint-disable-next-line import/no-unassigned-import
import optionsStorage from './options-storage.js';

const jsonBody = { 'Content-Type': 'application/json' };
const initPost = body => ({ method: 'post', headers: jsonBody, body: JSON.stringify(body) })

const quarantine = object =>
  optionsStorage.getAll().then(({ quarantineURL }) =>
    fetch(quarantineURL, initPost(object))
  )

browser.runtime.onMessage.addListener(data => {
  const { feature, action, object } = data;

  switch ([feature, action].join('.')) {
    case 'testing.quarantine':
      return quarantine(object);
    default:
      console.error('Unknown message', data);
  }
});
