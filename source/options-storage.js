import OptionsSync from 'webext-options-sync';

const EXAMPLE_BODY =
	`
{
	"context": "{context}",
	"testcase": "{testCase}"
}
`;

const EXAMPLE_URL = `https://webhook.example.com/{vcs.org}/{vcs.repo}/{job.name}/quarantined_tests/actions/quarantine`

export default new OptionsSync({
	defaults: {
		quarantineBody: EXAMPLE_BODY,
		quarantineMethod: 'post',
		quarantineURL: EXAMPLE_URL,
	},
	migrations: [
		OptionsSync.migrations.removeUnused
	],
	logging: true
});
