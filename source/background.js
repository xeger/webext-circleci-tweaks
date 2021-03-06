import browser from 'webextension-polyfill';
import formatString from 'string-format';

import optionsStorage from './options-storage.js';

const JSON_CONTENT = {'Content-Type': 'application/json'};

const listQuarantined = parameters =>
	optionsStorage.getAll().then(({quarantineListURL}) => {
		const url = formatString(quarantineListURL, parameters);
		return fetch(url, {method: 'get'}).then(response => {
			if (response.ok) {
				return response.json();
			}

			throw new Error('Failed to list quarantined tests');
		});
	});

const quarantine = parameters =>
	optionsStorage.getAll().then(({quarantineBody, quarantineMethod, quarantineURL}) => {
		const url = formatString(quarantineURL, parameters);
		const body = formatString(quarantineBody, parameters);
		return fetch(url, {method: quarantineMethod, headers: JSON_CONTENT, body});
	});

async function performCommand({command, parameters}) {
	try {
		switch (command) {
			case 'testing.listQuarantined':
			{
				const result = await listQuarantined(parameters);
				return {command, parameters, result};
			}

			case 'testing.quarantine':
				await quarantine(parameters);
				return {command, parameters};

			default:
				throw new Error('Unrecognized command');
		}
	} catch (error) {
		console.error('performCommand', error.toString());
		return {command, parameters, error: error.toString()};
	}
}

const ports = {};

browser.runtime.onConnect.addListener(p => {
	const {sender: {tab: {id}}} = p;
	ports[id] = p;
	console.debug('onConnect', {id, count: Object.keys(ports).length});
	p.onDisconnect.addListener(() => {
		console.debug('onDisconnect', {id});
		delete ports[id];
	});
	p.onMessage.addListener(m => {
		console.debug('onMessage', m);
		performCommand(m)
			.then(result => {
				console.debug('postMessage', result);
				try {
					// TODO: why is this broken under Firefox?
					// p.postMessage(result);
					// HACK: use connectionless messaging for background -> content communication
					browser.tabs.sendMessage(id, result);
				} catch (error) {
					console.error('postMessage', error);
				}
			});
	});
});
