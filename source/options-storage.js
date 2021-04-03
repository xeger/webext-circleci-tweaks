import OptionsSync from 'webext-options-sync';

export default new OptionsSync({
	defaults: {
		bugReportURL: '',
		flakeReportURL: '',
	},
	migrations: [
		OptionsSync.migrations.removeUnused
	],
	logging: true
});
