import browser from 'webextension-polyfill';

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
      createButton('😷', 'Quarantine this test case', (event) => quarantine(textContent, event)),
    ));
  }
}

function decorateFailedTestWithQuarantineStatus(test, error) {
  const button = test.querySelector('header')?.querySelector('div:nth-child(1)')?.querySelector('button');
  if (button) {
    if (error) {
      button.disabled = false;
      button.title = error.toString();
      button.textContent = '⚠️';
    } else {
      button.title = 'This test has been quarantined.'
    }
  }
}

function locateFailedTest({ context, testcase }) {
  const description = !context ? `${testcase} - ${testcase}` : `${context} ${testcase} - ${testcase}`
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
  const id = pathname.match(/jobs\/\d+$/) ? pathname.slice(pathname.lastIndexOf('/') + 1) : undefined;
  const name = document.querySelector('[data-cy="job-name"]')?.textContent;
  return { id, name };
}

function qualifyVCS() {
  const { pathname } = window.location;
  if (pathname.startsWith('/pipelines/github')) {
    const [org, repo] = pathname.slice(18).split('/');
    const branch = qualifyBranch();
    return { type: 'git', vendor: 'github', org, repo, branch };
  } else {
    return {};
  }
}

function qualifyTestCase(description) {
  const vcs = qualifyVCS();
  const job = qualifyJob();
  const hyphenAt = description.lastIndexOf('-')
  const fullName = description.slice(0, hyphenAt - 1);
  const testcase = description.slice(hyphenAt + 2)
  const context = fullName === testcase ? '' : fullName.slice(0, fullName.length - testcase.length - 1);
  const test = { context, testcase };
  return { vcs, job, test };
}

function quarantine(description, { target }) {
  try {
    const parameters = qualifyTestCase(description);
    target.disabled = true;
    port.postMessage({ command: 'testing.quarantine', parameters });
    // TODO: re-enable target? etc?
  } catch (exception) {
    console.error('quarantine', exception);
  }
}

function onMessage({ command, parameters, error }) {
  console.debug('onMessage', { command, parameters, error });
  try {
    switch (command) {
      case 'testing.quarantine':
        {
          const node = locateFailedTest(parameters.test);
          if (node)
            decorateFailedTestWithQuarantineStatus(node, error);
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
