import OptionsSync from 'webext-options-sync';

export default new OptionsSync({
	defaults: {
		quarantineURL: '',
	},
	migrations: [
		OptionsSync.migrations.removeUnused
	],
	logging: true
});
