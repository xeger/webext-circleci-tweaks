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

function interact(target, promise) {
  target.disabled = true;
  promise
    .then(() => {
      target.title = 'This test case is quarantined'
    })
    .catch(err => {
      target.textContent = '⚠️';
      target.title = err.message;
    });
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
  const job = qualifyJob();
  const vcs = qualifyVCS();
  const hyphen = description.lastIndexOf('-')
  const fullName = description.slice(0, hyphen - 1);
  const testCase = description.slice(hyphen + 2)
  const context = fullName.slice(0, fullName.length - testCase.length - 1);
  return { context, testCase, job, vcs };
}

function quarantine(description, { target }) {
  const object = qualifyTestCase(description);
  interact(
    target,
    browser.runtime.sendMessage({ feature: 'testing', action: 'quarantine', object })
  );
}

function decorateFailedTest(test) {
  const description = test.querySelector('header')?.querySelector('div:nth-child(1)');
  if (description) {
    // important: must call this before we decorate the DOM, else textContent is polluted
    const { textContent } = description;
    description.prepend(createPalette(
      createButton('🥐', 'Quarantine this test case', (event) => quarantine(textContent, event)),
    ));
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

const observer = new MutationObserver(onMutateDOM);
observer.observe(document, { childList: true, subtree: true });
