function createButton(label, onClick) {
  const el = document.createElement('button');
  el.onclick = onClick;
  el.style.display = 'inline';
  el.textContent = label;
  return el;
}

function createPalette(...controls) {
  const el = document.createElement('div');
  el.style.display = 'inline';
  el.style.marginLeft = '0.25em';
  el.style.marginRight = '0.25em';
  controls.forEach(c => el.appendChild(c))
  return el;
}

function qualifyBranch() {
  const href = document.querySelector('main > div:nth-child(1) > ol > li:nth-child(3) a')?.href;
  if (href) {
    const url = new URL(href);
    return url.searchParams.get('branch')
  }
}

function qualifyJob() {
  return document.querySelector('[data-cy="job-name"]')?.textContent;
}

function qualifyTestCase(description) {
  const job = qualifyJob();
  const branch = qualifyBranch();
  const hyphen = description.lastIndexOf('-')
  const fullName = description.slice(0, hyphen - 1);
  const testCase = description.slice(hyphen + 2)
  const context = fullName.slice(0, fullName.length - testCase.length - 1);
  return { branch, job, context, testCase };
}

function decorate(test) {
  const description = test.querySelector('header')?.querySelector('div:nth-child(1)');
  const { textContent } = description;
  if (description) {
    description.prepend(createPalette(
      createButton('🥐', () => qualifyTestCase(textContent)),
      createButton('🐛', () => qualifyTestCase(textContent)),
    ));
  }
}

function onMutate(events) {
  events.forEach(event => {
    event.addedNodes.forEach(node => {
      if (node.querySelectorAll)
        node.querySelectorAll('[id^="failed-test-"]').forEach(decorate);
    })
  });
}

const observer = new MutationObserver(onMutate);
observer.observe(document, { childList: true, subtree: true });
