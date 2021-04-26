import OptionsSync from 'webext-options-sync';

const EXAMPLE_BODY =
	`{
	"context": "{test.context}",
	"testcase": "{test.testcase}", 
	"ttl_hours": {ttl_hours}
}`;

const EXAMPLE_QUARANTINE_LIST_URL = `https://webhook.example.com/{vcs.org}/{vcs.repo}/{job.name}/quarantined_tests`;

const EXAMPLE_QUARANTINE_URL = `https://webhook.example.com/{vcs.org}/{vcs.repo}/{job.name}/quarantined_tests/actions/quarantine`

export default new OptionsSync({
	defaults: {
		quarantineListURL: EXAMPLE_QUARANTINE_LIST_URL,
		quarantineBody: EXAMPLE_BODY,
		quarantineMethod: 'post',
		quarantineURL: EXAMPLE_QUARANTINE_URL,
	},
	migrations: [
		OptionsSync.migrations.removeUnused
	],
	logging: true
});
