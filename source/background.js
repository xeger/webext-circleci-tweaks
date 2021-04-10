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

const quarantine = parameters =>
  optionsStorage.getAll().then(({ quarantineBody, quarantineMethod, quarantineURL }) => {
    const url = formatString(quarantineURL, parameters)
    const bodyTemplate = JSON.parse(quarantineBody);
    const body = JSON.stringify(formatBody(bodyTemplate, parameters));
    return fetch(url, { method: quarantineMethod, headers: JSON_CONTENT, body })
  })

async function performCommand({ command, parameters }) {
  try {
    switch (command) {
      case 'testing.quarantine':
        await quarantine(parameters);
        return { command, parameters };
      default:
        throw new Error(`Unrecognized command`);
    }
  } catch (error) {
    console.error('performCommand', error);
    return { command, parameters, error };
  }
}

const ports = {};

browser.runtime.onConnect.addListener(p => {
  const { sender: { tab: { id } } } = p;
  ports[id] = p;
  console.debug('onConnect', { id, count: Object.keys(ports).length });
  p.onDisconnect.addListener(() => {
    console.debug('onDisconnect', { id });
    delete ports[id];
  });
  p.onMessage.addListener(m => {
    console.debug('onMessage', m);
    performCommand(m)
      .then(result => {
        console.debug('postMessage', result);
        try {
          p.postMessage(result);
        } catch (error) {
          console.error('postMessage', error);
        }
      });
  })
});
