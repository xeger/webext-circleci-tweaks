import browser from 'webextension-polyfill';

const JOB_PATHNAME = /\/jobs\/(\d+)/;

let lastRefreshedPathname = '';
let pendingTestsToDecorate = {};

// Logs useful dev-mode info without polluting end-user console.
const logDebug = (...rest) => (process.env.NODE_ENV === 'development') && console.debug(...rest);

function createButton(label, title, onClick) {
  const el = document.createElement('button');
  el.onclick = onClick;
  el.title = title;
  el.textContent = label;
  return el;
}

function createPalette(...controls) {
  const el = document.createElement('div');
  el.className = 'ccitweaks__palette';
  controls.forEach(c => el.appendChild(c))
  return el;
}

function decorateFailedTest(test) {
  const description = test.querySelector('header')?.querySelector('div:nth-child(1)');
  if (description) {
    // important: must call this before we decorate the DOM, else textContent is polluted
    const { textContent } = description;
    description.prepend(createPalette(
      createButton('😷', 'Quarantine this test case', event => quarantine(textContent, event)),
    ));
    if (pendingTestsToDecorate[textContent]) {
      logDebug('decorateFailedTest HIT', { id: test.id })
      decorateFailedTestWithQuarantineStatus(test);
      delete pendingTestsToDecorate[textContent];
    } else {
      logDebug('decorateFailedTest MISS', { id: test.id })
    }
  }
}

function decorateFailedTestWithQuarantineStatus(test, error) {
  const button = test.querySelector('header')?.querySelector('div:nth-child(1)')?.querySelector('button');
  if (button) {
    decorateButtonWithQuarantineStatus(button, error);
  }
}

function decorateButtonWithQuarantineStatus(button, error) {
  if (error) {
    button.disabled = false;
    button.title = 'Error while quarantining: ' + error.toString();
    button.textContent = '⚠️';
  } else {
    button.disabled = true;
    button.title = 'This test case is quarantined'
  }
}

function describe({ context, testcase }) {
  return !context ? `${testcase} - ${testcase}` : `${context} ${testcase} - ${testcase}`
}

function locateFailedTest({ context, testcase }) {
  const description = describe({ context, testcase });
  const nodes = document.body.querySelectorAll('[id^="failed-test-"]');
  for (let node of nodes) {
    if (node.textContent.indexOf(description) >= 0)
      return node;
  }
}

function qualifyBranch() {
  const href = document.querySelector('main > div:nth-child(1) > ol > li:nth-child(3) a')?.href;
  if (href) {
    const url = new URL(href);
    return url.searchParams.get('branch')
  }
}

function qualifyJob() {
  const { pathname } = window.location;
  const match = pathname.match(JOB_PATHNAME);
  const id = match ? match[1] : undefined;
  const name = document.querySelector('[data-cy="job-name"]')?.textContent;
  if (id && name)
    return { id, name };
}

function qualifyVCS() {
  const { pathname } = window.location;
  if (pathname.startsWith('/pipelines/github')) {
    const [org, repo] = pathname.slice(18).split('/');
    const branch = qualifyBranch();
    return { type: 'git', vendor: 'github', org, repo, branch };
  }
}

function qualifyTest(description) {
  const hyphenAt = description.lastIndexOf('-')
  if (hyphenAt < 0)
    return;
  const fullName = description.slice(0, hyphenAt - 1);
  const testcase = description.slice(hyphenAt + 2)
  const context = fullName === testcase ? '' : fullName.slice(0, fullName.length - testcase.length - 1);
  return { context, testcase };
}

function qualify(description) {
  const vcs = qualifyVCS();
  const job = qualifyJob();
  const test = qualifyTest(description);
  return { vcs, job, test };
}

function quarantine(description, { target }) {
  // TODO: stop using window.prompt to avoid Chromium policy violations
  // @see https://developers.google.com/web/updates/2017/03/dialogs-policy
  try {
    const ttl = prompt("For How Long? (In Days)", "2.0");
    const parameters = qualify(description);
    parameters.ttl_hours = Number(ttl) * 24;
    target.disabled = true;
    port.postMessage({ command: 'testing.quarantine', parameters });
  } catch (error) {
    decorateButtonWithQuarantineStatus(target, error)
    console.error('quarantine', error);
  }
}

function onMessage({ command, parameters, result, error }) {
  logDebug('onMessage', { command, parameters, result, error });
  try {
    switch (command) {
      case 'testing.listQuarantined':
        pendingTestsToDecorate = {};
        result?.forEach(test => {
          const node = locateFailedTest(test);
          // This test may already be present in the DOM; if so, update it
          if (node) {
            logDebug('onMessage HIT', { id: test.id })
            decorateFailedTestWithQuarantineStatus(node);
          }
          // Otherwise, cache it for future DOM updates
          else {
            logDebug('onMessage MISS')
            pendingTestsToDecorate[describe(test)] = true;
          }
        })
        break;
      case 'testing.quarantine':
        {
          const node = locateFailedTest(parameters.test);
          if (node) decorateFailedTestWithQuarantineStatus(node, error);
        }
        break;
      default:
        throw new Error(`Unrecognized command`);
    }
  } catch (exception) {
    console.error('onMessage', exception);
  }
}

function onMutateDOM(events) {
  const { location: { pathname } } = window;

  // If we've navigated to a page with failed tests, ask server for quarantine list
  const vcs = qualifyVCS();
  const job = qualifyJob();
  const hasContext = vcs && job;
  const navigated = pathname != lastRefreshedPathname;
  if (hasContext && navigated) {
    const parameters = { vcs, job };
    logDebug('onMutateDOM', 'freshen quarantine list', parameters);
    port.postMessage({ command: 'testing.listQuarantined', parameters });
    lastRefreshedPathname = pathname;
  }

  // Augment tests with UI
  events.forEach(event => {
    event.addedNodes.forEach(node => {
      if (node.querySelectorAll)
        node.querySelectorAll('[id^="failed-test-"]').forEach(decorateFailedTest);
    })
  });
}

const port = browser.runtime.connect();

// TODO: why is this broken under Firefox?
port.onMessage.addListener(onMessage);
// HACK: use connectionless messaging for background -> content communication
browser.runtime.onMessage.addListener(onMessage);

const observer = new MutationObserver(onMutateDOM);
observer.observe(document, { childList: true, subtree: true });
